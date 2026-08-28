/**
 * Shared haversine + graph helpers for maritime network build scripts.
 */
const fs = require("fs");
const path = require("path");

const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lng1, lat2, lng2) {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dPhi = (lat2 - lat1) * DEG2RAD;
  const dLambda = (lng2 - lng1) * DEG2RAD;
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ArcGIS Web Mercator (3857) → WGS84 */
function webMercatorToLatLng(x, y) {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

function parseNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** App choke id ↔ PortWatch chokepoint database portid */
const CHOKE_PORTWATCH_ID = {
  "choke-suez": "chokepoint1",
  "choke-panama": "chokepoint2",
  "choke-bosporus": "chokepoint3",
  "choke-bab-el-mandeb": "chokepoint4",
  "choke-malacca": "chokepoint5",
  "choke-hormuz": "chokepoint6",
  "choke-good-hope": "chokepoint7",
  "choke-gibraltar": "chokepoint8",
  "choke-taiwan": "chokepoint11",
};

const PORTNAME_TO_CHOKE_ID = {
  "suez canal": "choke-suez",
  "panama canal": "choke-panama",
  "bosporus strait": "choke-bosporus",
  "bab el-mandeb strait": "choke-bab-el-mandeb",
  "bab-el-mandeb strait": "choke-bab-el-mandeb",
  "malacca strait": "choke-malacca",
  "strait of hormuz": "choke-hormuz",
  "cape of good hope": "choke-good-hope",
  "gibraltar strait": "choke-gibraltar",
  "taiwan strait": "choke-taiwan",
};

/** Virtual mid-ocean waypoints — Cape route / deep-sea hops */
const VIRTUAL_WAYPOINTS = [
  { id: "vwp-agulhas", type: "waypoint", name: "Agulhas passage", lat: -38.5, lng: 22.0 },
  { id: "vwp-arabian-sea", type: "waypoint", name: "Arabian Sea lane", lat: 14.0, lng: 64.0 },
  { id: "vwp-bay-bengal", type: "waypoint", name: "Bay of Bengal lane", lat: 8.0, lng: 85.0 },
  { id: "vwp-central-atlantic", type: "waypoint", name: "Central Atlantic lane", lat: 25.0, lng: -40.0 },
  { id: "vwp-central-pacific", type: "waypoint", name: "Central Pacific lane", lat: 5.0, lng: -150.0 },
];

/**
 * Curated choke + waypoint backbone (undirected pairs).
 * Ships must pass these straits/canals — not straight-line shortcuts over land.
 */
const BACKBONE_PAIRS = [
  ["choke-hormuz", "vwp-arabian-sea"],
  ["vwp-arabian-sea", "choke-bab-el-mandeb"],
  ["choke-bab-el-mandeb", "choke-suez"],
  ["choke-suez", "choke-gibraltar"],
  ["choke-suez", "choke-good-hope"],
  ["choke-good-hope", "vwp-agulhas"],
  ["vwp-agulhas", "choke-gibraltar"],
  ["choke-gibraltar", "choke-bosporus"],
  ["choke-malacca", "vwp-bay-bengal"],
  ["vwp-bay-bengal", "vwp-arabian-sea"],
  ["choke-malacca", "choke-hormuz"],
  ["choke-malacca", "choke-taiwan"],
  ["choke-panama", "vwp-central-pacific"],
  ["vwp-central-pacific", "choke-malacca"],
  ["choke-panama", "vwp-central-atlantic"],
  ["vwp-central-atlantic", "choke-gibraltar"],
  ["choke-panama", "choke-good-hope"],
];

function addUndirectedEdge(adj, a, b, distanceKm, meta = {}) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push({ to: b, distanceKm, ...meta });
  adj.get(b).push({ to: a, distanceKm, ...meta });
}

function adjacencyToJson(adj) {
  const out = {};
  for (const [id, edges] of adj.entries()) {
    out[id] = edges.map((e) => ({
      to: e.to,
      distanceKm: Math.round(e.distanceKm * 10) / 10,
      ...(e.capacityNorm != null ? { capacityNorm: e.capacityNorm } : {}),
    }));
  }
  return out;
}

/** A* on adjacency list — returns node id path or null */
function findMaritimePath(adjacency, nodes, fromId, toId) {
  if (!nodes[fromId] || !nodes[toId]) return null;
  if (fromId === toId) return [fromId];

  const open = new Set([fromId]);
  const cameFrom = new Map();
  const gScore = new Map([[fromId, 0]]);
  const fScore = new Map([
    [
      fromId,
      haversineKm(nodes[fromId].lat, nodes[fromId].lng, nodes[toId].lat, nodes[toId].lng),
    ],
  ]);

  while (open.size) {
    let current = null;
    let bestF = Infinity;
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        current = id;
      }
    }
    if (!current) break;
    if (current === toId) {
      const path = [current];
      while (cameFrom.has(path[0])) {
        path.unshift(cameFrom.get(path[0]));
      }
      return path;
    }
    open.delete(current);
    const edges = adjacency[current] || [];
    for (const edge of edges) {
      const tentative = (gScore.get(current) ?? Infinity) + edge.distanceKm;
      if (tentative < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, current);
        gScore.set(edge.to, tentative);
        const n = nodes[edge.to];
        fScore.set(
          edge.to,
          tentative +
            haversineKm(n.lat, n.lng, nodes[toId].lat, nodes[toId].lng),
        );
        open.add(edge.to);
      }
    }
  }
  return null;
}

/** Great-circle polyline between consecutive nodes */
function pathToLatLngs(nodes, nodeIds, segmentsPerLeg = 8) {
  const out = [];
  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    const a = nodes[nodeIds[i]];
    const b = nodes[nodeIds[i + 1]];
    for (let s = 0; s < segmentsPerLeg; s += 1) {
      const t = s / segmentsPerLeg;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lng = a.lng + (b.lng - a.lng) * t;
      out.push({ lat, lng });
    }
  }
  const last = nodes[nodeIds[nodeIds.length - 1]];
  out.push({ lat: last.lat, lng: last.lng });
  return out;
}

module.exports = {
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
};
