#!/usr/bin/env node
/**
 * IMF PortWatch Daily Ports + chokepoints + virtual waypoints → maritime graph.
 *
 * Inputs:
 *   - Daily_Ports_Data.geojson (stream-aggregated, no geometry — join coords from API)
 *   - ArcGIS PortWatch_ports_database (port lat/lng)
 *   - ArcGIS PortWatch_chokepoints_database (choke lat/lng)
 *   - public/data/crink/chokepoint-transit-daily.json (capacity for choke nodes)
 *
 * Outputs:
 *   scripts/data/maritime-graph.json
 *   public/data/crink/maritime-graph.json
 *   scripts/data/port-activity.json (top ports by recent trade volume)
 *
 * Usage:
 *   node scripts/maritime/build-maritime-network.js /path/to/Daily_Ports_Data.geojson
 *   npm run maritime:build -- /path/to/Daily_Ports_Data.geojson
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const {
  haversineKm,
  webMercatorToLatLng,
  parseNumber,
  writeJson,
  CHOKE_PORTWATCH_ID,
  PORTNAME_TO_CHOKE_ID,
  VIRTUAL_WAYPOINTS,
  BACKBONE_PAIRS,
  addUndirectedEdge,
  adjacencyToJson,
  findMaritimePath,
  pathToLatLngs,
} = require("./maritime-lib");

const ROOT = path.join(__dirname, "..", "..");
const OUT_GRAPH_SCRIPTS = path.join(ROOT, "scripts", "data", "maritime-graph.json");
const OUT_GRAPH_PUBLIC = path.join(ROOT, "public", "data", "crink", "maritime-graph.json");
const OUT_PORTS = path.join(ROOT, "scripts", "data", "port-activity.json");
const CHOKE_DAILY = path.join(ROOT, "public", "data", "crink", "chokepoint-transit-daily.json");

const PORTS_DB_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/PortWatch_ports_database/FeatureServer/0/query";
const CHOKES_DB_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/PortWatch_chokepoints_database/FeatureServer/0/query";

const TOP_PORT_COUNT = 80;
const MIN_YEAR = 2024;
const PORT_TO_CHOKE_MAX_KM = 2800;
const PORT_TO_PORT_MAX_KM = 4500;
const PAGE_SIZE = 1000;

async function fetchArcgisAll(baseUrl, outFields, withGeometry = true) {
  const rows = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: "1=1",
      outFields,
      returnGeometry: withGeometry ? "true" : "false",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: "json",
    });
    const res = await fetch(`${baseUrl}?${params}`);
    if (!res.ok) throw new Error(`ArcGIS ${res.status} ${baseUrl}`);
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    const features = data.features || [];
    if (!features.length) break;
    rows.push(...features);
    const hasMore = Boolean(data.exceededTransferLimit) || features.length >= PAGE_SIZE;
    if (!hasMore) break;
    offset += features.length;
    await new Promise((r) => setTimeout(r, 150));
  }
  return rows;
}

async function streamAggregatePorts(geojsonPath) {
  const byPort = new Map();
  let lines = 0;
  const rl = readline.createInterface({
    input: fs.createReadStream(geojsonPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{"type":"Feature"')) continue;
    lines += 1;
    let feature;
    try {
      const jsonLine = trimmed.replace(/,\s*$/, "");
      feature = JSON.parse(jsonLine);
    } catch {
      continue;
    }
    const p = feature.properties;
    if (!p?.portid || Number(p.year) < MIN_YEAR) continue;
    const portid = String(p.portid);
    const trade =
      (parseNumber(p.import) ?? 0) +
      (parseNumber(p.export) ?? 0) +
      (parseNumber(p.portcalls) ?? 0) * 1000;
    if (!Number.isFinite(trade) || trade < 0) continue;
    const cur = byPort.get(portid) || {
      portid,
      portname: p.portname,
      iso3: p.ISO3,
      country: p.country,
      tradeVolume: 0,
      portcalls: 0,
      days: 0,
    };
    cur.tradeVolume += trade;
    cur.portcalls += parseNumber(p.portcalls) || 0;
    cur.days += 1;
    byPort.set(portid, cur);
    if (lines % 500000 === 0) {
      process.stdout.write(`\r[ports-daily] scanned ${lines} feature lines…`);
    }
  }
  process.stdout.write(`\r[ports-daily] scanned ${lines} feature lines, ${byPort.size} ports\n`);
  const ranked = [...byPort.values()].sort((a, b) => b.tradeVolume - a.tradeVolume);
  return ranked.slice(0, TOP_PORT_COUNT);
}

function loadChokeCapacityNorm() {
  if (!fs.existsSync(CHOKE_DAILY)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(CHOKE_DAILY, "utf8"));
    const stress = JSON.parse(
      fs.readFileSync(path.join(ROOT, "public", "data", "crink", "choke-stress.json"), "utf8"),
    );
    const out = {};
    for (const [chokeId, rows] of Object.entries(raw.byChokeId || {})) {
      const recent = rows.slice(0, 30);
      const avgCap =
        recent.reduce((s, r) => s + (Number(r.capacity) || 0), 0) / Math.max(1, recent.length);
      out[chokeId] = avgCap;
    }
    const caps = Object.values(out).filter((v) => v > 0);
    const maxCap = caps.length ? Math.max(...caps) : 1;
    const norm = {};
    for (const [id, cap] of Object.entries(out)) {
      norm[id] = cap / maxCap;
    }
    for (const [id, row] of Object.entries(stress.chokepoints || {})) {
      if (norm[id] == null && row.latestDailyTransits) {
        norm[id] = Math.min(1, row.latestDailyTransits / 250);
      }
    }
    return norm;
  } catch {
    return {};
  }
}

function buildNodes(topPorts, portCoords, chokeFeatures, capacityNorm) {
  /** @type {Record<string, object>} */
  const nodes = {};

  for (const wp of VIRTUAL_WAYPOINTS) {
    nodes[wp.id] = { ...wp, capacityNorm: 0.5 };
  }

  for (const f of chokeFeatures) {
    const a = f.attributes || {};
    const portid = String(a.portid || "");
    const chokeId =
      Object.entries(CHOKE_PORTWATCH_ID).find(([, pid]) => pid === portid)?.[0] ||
      PORTNAME_TO_CHOKE_ID[String(a.portname || "").toLowerCase()];
    if (!chokeId || !f.geometry) continue;
    const { lat, lng } = webMercatorToLatLng(f.geometry.x, f.geometry.y);
    nodes[chokeId] = {
      id: chokeId,
      type: "chokepoint",
      portid,
      name: a.portname || a.fullname || chokeId,
      lat,
      lng,
      iso3: a.ISO3 || null,
      capacityNorm: capacityNorm[chokeId] ?? 0.7,
    };
  }

  for (const p of topPorts) {
    const coord = portCoords.get(p.portid);
    if (!coord) continue;
    nodes[p.portid] = {
      id: p.portid,
      type: "port",
      name: p.portname,
      lat: coord.lat,
      lng: coord.lng,
      iso3: p.iso3,
      country: p.country,
      tradeVolume: Math.round(p.tradeVolume),
      capacityNorm: Math.min(1, p.tradeVolume / (topPorts[0]?.tradeVolume || 1)),
    };
  }

  return nodes;
}

function buildAdjacency(nodes, capacityNorm) {
  const adj = new Map();
  const ids = Object.keys(nodes);

  for (const [a, b] of BACKBONE_PAIRS) {
    if (!nodes[a] || !nodes[b]) continue;
    const na = nodes[a];
    const nb = nodes[b];
    const dist = haversineKm(na.lat, na.lng, nb.lat, nb.lng);
    const cap = Math.min(na.capacityNorm ?? 0.5, nb.capacityNorm ?? 0.5);
    addUndirectedEdge(adj, a, b, dist, { capacityNorm: cap });
  }

  const chokeIds = ids.filter((id) => nodes[id].type === "chokepoint" || nodes[id].type === "waypoint");
  const portIds = ids.filter((id) => nodes[id].type === "port");

  for (const portId of portIds) {
    const p = nodes[portId];
    const chokeDists = chokeIds
      .map((cid) => ({
        cid,
        dist: haversineKm(p.lat, p.lng, nodes[cid].lat, nodes[cid].lng),
      }))
      .filter((x) => x.dist <= PORT_TO_CHOKE_MAX_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);
    for (const { cid, dist } of chokeDists) {
      const cap = Math.min(p.capacityNorm ?? 0.3, nodes[cid].capacityNorm ?? 0.5);
      addUndirectedEdge(adj, portId, cid, dist, { capacityNorm: cap });
    }
  }

  for (let i = 0; i < portIds.length; i += 1) {
    const a = nodes[portIds[i]];
    const neighbors = [];
    for (let j = 0; j < portIds.length; j += 1) {
      if (i === j) continue;
      const b = nodes[portIds[j]];
      const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);
      if (dist <= PORT_TO_PORT_MAX_KM) neighbors.push({ id: portIds[j], dist });
    }
    neighbors.sort((x, y) => x.dist - y.dist);
    for (const n of neighbors.slice(0, 2)) {
      if (adj.get(portIds[i])?.some((e) => e.to === n.id)) continue;
      const cap = Math.min(a.capacityNorm ?? 0.3, nodes[n.id].capacityNorm ?? 0.3);
      addUndirectedEdge(adj, portIds[i], n.id, n.dist, { capacityNorm: cap * 0.6 });
    }
  }

  return adjacencyToJson(adj);
}

async function main() {
  const geoPath = process.argv[2];
  if (!geoPath || !fs.existsSync(geoPath)) {
    console.error(
      "Usage: node scripts/maritime/build-maritime-network.js /path/to/Daily_Ports_Data.geojson",
    );
    process.exit(1);
  }

  console.log("[maritime] aggregating port activity from bulk geojson…");
  const topPorts = await streamAggregatePorts(geoPath);
  writeJson(OUT_PORTS, {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(geoPath),
    minYear: MIN_YEAR,
    topCount: topPorts.length,
    ports: topPorts,
  });

  console.log("[maritime] fetching port coordinates…");
  const portFeatures = await fetchArcgisAll(PORTS_DB_URL, "portid,portname,ISO3,country", true);
  const portCoords = new Map();
  for (const f of portFeatures) {
    const id = f.attributes?.portid;
    if (!id || !f.geometry) continue;
    portCoords.set(String(id), webMercatorToLatLng(f.geometry.x, f.geometry.y));
  }

  console.log("[maritime] fetching chokepoint coordinates…");
  const chokeFeatures = await fetchArcgisAll(
    CHOKES_DB_URL,
    "portid,portname,ISO3,country,fullname",
    true,
  );

  const capacityNorm = loadChokeCapacityNorm();
  const nodes = buildNodes(topPorts, portCoords, chokeFeatures, capacityNorm);
  const adjacency = buildAdjacency(nodes, capacityNorm);

  const payload = {
    generatedAt: new Date().toISOString(),
    source:
      "IMF PortWatch Daily Ports + Daily Chokepoints + virtual waypoints (curated sea backbone, A* ready adjacency list)",
    sourceFiles: [path.basename(geoPath), "PortWatch_ports_database", "PortWatch_chokepoints_database"],
    nodeCount: Object.keys(nodes).length,
    edgeCount: Object.values(adjacency).reduce((s, arr) => s + arr.length, 0) / 2,
    nodes,
    adjacency,
  };

  writeJson(OUT_GRAPH_SCRIPTS, payload);
  writeJson(OUT_GRAPH_PUBLIC, payload);

  const samplePairs = [];
  const topPortIds = topPorts
    .map((p) => p.portid)
    .filter((id) => nodes[id])
    .slice(0, 6);
  for (let i = 0; i < topPortIds.length; i += 1) {
    for (let j = i + 1; j < topPortIds.length; j += 1) {
      samplePairs.push([topPortIds[i], topPortIds[j]]);
      if (samplePairs.length >= 6) break;
    }
    if (samplePairs.length >= 6) break;
  }
  if (!samplePairs.length) {
    samplePairs.push(["port1114", "port339"]);
  }

  const sampleRoutes = [];
  for (const [fromId, toId] of samplePairs) {
    const nodePath = findMaritimePath(adjacency, nodes, fromId, toId);
    if (!nodePath) continue;
    const points = pathToLatLngs(nodes, nodePath, 10);
    let lengthKm = 0;
    for (let i = 0; i < nodePath.length - 1; i += 1) {
      const a = nodes[nodePath[i]];
      const b = nodes[nodePath[i + 1]];
      lengthKm += haversineKm(a.lat, a.lng, b.lat, b.lng);
    }
    const minCap = Math.min(
      ...nodePath.map((id) => nodes[id].capacityNorm ?? 0.5),
    );
    sampleRoutes.push({
      id: `maritime-${fromId}-${toId}`,
      fromId,
      toId,
      fromName: nodes[fromId].name,
      toName: nodes[toId].name,
      nodePath,
      lengthKm: Math.round(lengthKm),
      capacityNorm: Math.round(minCap * 1000) / 1000,
      points,
    });
  }
  const routesOut = path.join(ROOT, "public", "data", "crink", "maritime-routes-sample.json");
  writeJson(routesOut, {
    generatedAt: new Date().toISOString(),
    routes: sampleRoutes,
  });

  console.log(
    `[maritime] ${payload.nodeCount} nodes, ~${payload.edgeCount} edges, ${sampleRoutes.length} sample routes`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_GRAPH_PUBLIC)}`);
  console.log(`  wrote ${path.relative(ROOT, routesOut)}`);
}

main().catch((err) => {
  console.error("[maritime] failed:", err.message);
  process.exit(1);
});
