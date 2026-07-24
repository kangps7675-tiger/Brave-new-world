// 정적 레이어(항로·케이블·공항·항구·기지·자원·분쟁개요) 빌드
// DATA_PROFILE=lite|full node scripts/build-static-extras.js

const fs = require("fs");
const path = require("path");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const {
  writeJsonArrayFile,
  writeJsonObjectFile,
  compactTransportPath,
  compactStaticPoint,
  roundCoord,
} = require("./compact-json");
const { lineGeometryToPoints, pointsBbox, capArray } = require("./static-path-utils");

const DATA_DIR = path.join(__dirname, "data");
const SHIPPING_URL =
  "https://raw.githubusercontent.com/newzealandpaul/Shipping-Lanes/main/data/Shipping_Lanes_v1.geojson";

// TeleGeography 해저케이블 미러 — https://github.com/lintaojlu/submarine_cable_information
// 로컬 우선: scripts/data/Submarine_Cables.geojson.json (카카오 ArcGIS 폴리곤 코리도)
const LOCAL_CABLE_GEOJSON = path.join(DATA_DIR, "Submarine_Cables.geojson.json");
const CABLE_GEO_URLS = [
  "https://raw.githubusercontent.com/lintaojlu/submarine_cable_information/master/web/public/api/v3/cable/cable-geo.json",
  "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json",
];
const LANDING_GEO_URLS = [
  "https://raw.githubusercontent.com/lintaojlu/submarine_cable_information/master/web/public/api/v3/landing-point/landing-point-geo.json",
  "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json",
];

function cableStatusRank(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("in service")) return 0;
  if (s.includes("under construction") || s.includes("planned")) return 1;
  if (!s || s === "?") return 2;
  if (s.includes("out of service") || s.includes("abandoned")) return 3;
  return 2;
}

function loadLocalCableGeojson() {
  if (!fs.existsSync(LOCAL_CABLE_GEOJSON)) return null;
  const json = JSON.parse(fs.readFileSync(LOCAL_CABLE_GEOJSON, "utf8"));
  if (!json?.features?.length) return null;
  console.log(`   해저케이블 source: local ${path.relative(process.cwd(), LOCAL_CABLE_GEOJSON)}`);
  return json;
}

function buildPathsFromCableGeo(cableGeo, maxPts, precision) {
  const paths = [];
  for (const [index, feature] of (cableGeo.features || []).entries()) {
    const props = feature.properties || {};
    const cableId =
      props.id ||
      props.feature_id ||
      props.objectid ||
      props.shortname ||
      `cable-${index}`;
    const name =
      (props.cablesystem && props.cablesystem !== "?" ? props.cablesystem : null) ||
      props.name ||
      props.shortname ||
      String(cableId);
    const status = props.status || null;
    const lengthHint = Number(props.SHAPE__Length) || 0;

    for (const [pathIndex, points] of lineGeometryToPoints(
      feature.geometry,
      maxPts,
      roundCoord,
      precision,
    ).entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `submarine-cable-${cableId}-${pathIndex}`,
        kind: "submarine-cable",
        name,
        scalerank: cableStatusRank(status),
        lengthKm: null,
        bbox: pointsBbox(points, roundCoord),
        points,
        meta: {
          color: props.color || null,
          status,
          owner: props.owner || null,
          region: props.region || null,
          lengthHint,
          source: props.cablesystem
            ? "local_submarine_cables_geojson"
            : "submarine_cable_information",
        },
      });
    }
  }

  paths.sort((a, b) => {
    const statusDiff = (a.scalerank ?? 9) - (b.scalerank ?? 9);
    if (statusDiff !== 0) return statusDiff;
    const lenDiff = (b.meta?.lengthHint || 0) - (a.meta?.lengthHint || 0);
    if (lenDiff !== 0) return lenDiff;
    return b.points.length - a.points.length;
  });

  return paths;
}

function landingsFromPaths(paths, precision) {
  const seen = new Set();
  const landings = [];
  for (const pathItem of paths) {
    const ends = [pathItem.points[0], pathItem.points[pathItem.points.length - 1]];
    for (const [endIndex, point] of ends.entries()) {
      if (!point) continue;
      const key = `${point.lat},${point.lng}`;
      if (seen.has(key)) continue;
      seen.add(key);
      landings.push({
        id: `cable-landing-${pathItem.id}-${endIndex}`,
        kind: "cable-landing",
        name: pathItem.name,
        lat: roundCoord(point.lat, precision),
        lng: roundCoord(point.lng, precision),
        tier: 1,
        meta: { source: "local_submarine_cables_geojson" },
      });
    }
  }
  return landings;
}

async function buildLandingsFromMirrors(precision) {
  const landings = [];
  try {
    const landingGeo = await fetchJsonFromMirrors(LANDING_GEO_URLS, "착륙점");
    for (const feature of landingGeo.features || []) {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const [lng, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (props.is_tbd) continue;

      const landingId = props.id || `${lat},${lng}`;
      landings.push({
        id: `cable-landing-${landingId}`,
        kind: "cable-landing",
        name: props.name || landingId,
        lat: roundCoord(lat, precision),
        lng: roundCoord(lng, precision),
        tier: 1,
        meta: { source: "submarine_cable_information" },
      });
    }
    } catch (error) {
    console.warn("   착륙점 미러 fetch 실패:", error.message);
  }
  return landings;
}

/**
 * 경도 밴드별로 고르게 뽑아 한 해역(예: 미주)만 남는 편향을 줄인다.
 */
function diversifyCablePaths(paths, limit) {
  if (paths.length <= limit) return paths;

  const bandKey = (pathItem) => {
    const midLng = (pathItem.bbox.minLng + pathItem.bbox.maxLng) / 2;
    return Math.floor(((midLng + 180) % 360) / 30); // 0..11
  };

  const byBand = new Map();
  for (const pathItem of paths) {
    const key = bandKey(pathItem);
    if (!byBand.has(key)) byBand.set(key, []);
    byBand.get(key).push(pathItem);
  }
  for (const group of byBand.values()) {
    group.sort(
      (a, b) =>
        (a.scalerank ?? 9) - (b.scalerank ?? 9) ||
        (b.meta?.lengthHint || 0) - (a.meta?.lengthHint || 0) ||
        b.points.length - a.points.length,
    );
  }

  const picked = [];
  const pickedIds = new Set();
  const bands = [...byBand.keys()].sort((a, b) => a - b);
  let guard = 0;
  while (picked.length < limit && guard < paths.length * 2) {
    let advanced = false;
    for (const band of bands) {
      const group = byBand.get(band);
      if (!group?.length) continue;
      const next = group.shift();
      if (!next || pickedIds.has(next.id)) continue;
      picked.push(next);
      pickedIds.add(next.id);
      advanced = true;
      if (picked.length >= limit) break;
    }
    if (!advanced) break;
    guard += 1;
  }

  if (picked.length < limit) {
    for (const pathItem of paths) {
      if (pickedIds.has(pathItem.id)) continue;
      picked.push(pathItem);
      pickedIds.add(pathItem.id);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}

/** 로컬 ArcGIS 코리도가 특정 해역만이면 글로벌 미러로 대체 */
function cableCoverageLooksGlobal(paths) {
  if (paths.length < 20) return false;
  let east = 0;
  let west = 0;
  for (const pathItem of paths) {
    const mid = (pathItem.bbox.minLng + pathItem.bbox.maxLng) / 2;
    if (mid >= -20) east += 1;
    else west += 1;
  }
  // 유라시아·인도양 쪽(대략 lng≥-20)이 일정 비율 있어야 전역 소스
  return east >= Math.max(8, Math.floor(paths.length * 0.15));
}

async function buildSubmarineCables() {
  const maxPts = IS_LITE ? 36 : 100;
  const precision = IS_LITE ? 2 : 3;

  try {
    const localGeo = loadLocalCableGeojson();
    if (localGeo) {
      const localPaths = buildPathsFromCableGeo(localGeo, maxPts, precision);
      if (cableCoverageLooksGlobal(localPaths)) {
        const cappedPaths = diversifyCablePaths(localPaths, IS_LITE ? 80 : 900);
        const landings = capArray(landingsFromPaths(cappedPaths, precision), 120, 1600);
        return { paths: cappedPaths, landings };
      }
      console.warn(
        `   로컬 해저케이블은 지역 편향(미주 등, ${localPaths.length}개) → TeleGeography 미러 사용`,
      );
    }

    const cableGeo = await fetchJsonFromMirrors(CABLE_GEO_URLS, "해저케이블");
    const paths = buildPathsFromCableGeo(cableGeo, maxPts, precision);
    const landings = await buildLandingsFromMirrors(precision);
    return {
      paths: diversifyCablePaths(paths, IS_LITE ? 80 : 900),
      landings: capArray(landings, 120, 1600),
    };
  } catch (error) {
    console.warn("   해저케이블 미러 fetch 실패, seed 사용:", error.message);
    return seedSubmarineCables();
  }
}

async function buildShippingLanes() {
  const paths = [];
  try {
    const geojson = await fetchJson(SHIPPING_URL);
    for (const [index, feature] of (geojson.features || []).entries()) {
      const name = feature.properties?.name || feature.properties?.ROUTE || null;
      const maxPts = IS_LITE ? 40 : 120;
      for (const [pathIndex, points] of lineGeometryToPoints(
        feature.geometry,
        maxPts,
        roundCoord,
        IS_LITE ? 2 : 3,
      ).entries()) {
        if (points.length < 2) continue;
        paths.push({
          id: `shipping-lane-${index}-${pathIndex}`,
          kind: "shipping-lane",
          name,
          scalerank: 0,
          lengthKm: null,
          bbox: pointsBbox(points, roundCoord),
          points,
        });
      }
    }
  } catch (error) {
    console.warn("   해상 항로 fetch 실패, 시드 경로 사용:", error.message);
    paths.push({
      id: "shipping-lane-seed-0",
      kind: "shipping-lane",
      name: "Asia-Europe (Suez)",
      scalerank: 0,
      lengthKm: null,
      bbox: pointsBbox(
        [
          { lat: 1.29, lng: 103.85 },
          { lat: 12.0, lng: 45.0 },
          { lat: 30.0, lng: 32.5 },
          { lat: 51.9, lng: 4.5 },
        ],
        roundCoord,
      ),
      points: [
        { lat: 1.29, lng: 103.85 },
        { lat: 12.0, lng: 45.0 },
        { lat: 30.0, lng: 32.5 },
        { lat: 51.9, lng: 4.5 },
      ],
    });
  }

  return capArray(paths, 30, 400);
}

function seedSubmarineCables() {
  const landings = [
    { id: "cable-landing-sgp", name: "Singapore", lat: 1.35, lng: 103.8 },
    { id: "cable-landing-tyo", name: "Tokyo", lat: 35.45, lng: 139.75 },
    { id: "cable-landing-lax", name: "Los Angeles", lat: 33.74, lng: -118.27 },
    { id: "cable-landing-ldn", name: "London", lat: 51.5, lng: -0.12 },
    { id: "cable-landing-syd", name: "Sydney", lat: -33.87, lng: 151.21 },
  ].map((item) => ({
    id: item.id,
    kind: "cable-landing",
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    tier: 1,
    meta: { source: "seed" },
  }));

  const points = [
    { lat: 35.45, lng: 139.75 },
    { lat: 21.3, lng: -157.8 },
    { lat: 33.74, lng: -118.27 },
  ];

  return {
    paths: [
      {
        id: "submarine-cable-seed-0",
        kind: "submarine-cable",
        name: "Trans-Pacific (seed)",
        scalerank: 0,
        lengthKm: null,
        bbox: pointsBbox(points, roundCoord),
        points,
      },
    ],
    landings,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchJsonFromMirrors(urls, label) {
  let lastError = null;
  for (const url of urls) {
    try {
      const json = await fetchJson(url);
      if (!json?.features?.length) throw new Error(`empty features: ${url}`);
      console.log(`   ${label} source: ${url}`);
      return json;
    } catch (error) {
      lastError = error;
      console.warn(`   ${label} 시도 실패 (${url}):`, error.message);
    }
  }
  throw lastError || new Error(`${label} GeoJSON을 불러오지 못함`);
}

// OurAirports open data (daily dump) — https://github.com/davidmegginson/ourairports-data
const OURAIRPORTS_CSV_URLS = [
  "https://davidmegginson.github.io/ourairports-data/airports.csv",
  "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv",
];

function parseCsvLine(line) {
  const cols = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cols.push(current);
  return cols;
}

function airportTier(type, scheduled) {
  if (type === "large_airport") return 1;
  if (type === "medium_airport" && scheduled === "yes") return 2;
  if (type === "medium_airport") return 3;
  return 4;
}

async function fetchOurAirportsCsv() {
  let lastError = null;
  for (const url of OURAIRPORTS_CSV_URLS) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      const text = await res.text();
      if (!text.includes("latitude_deg")) throw new Error(`unexpected CSV from ${url}`);
      return { text, sourceUrl: url };
    } catch (error) {
      lastError = error;
      console.warn(`   OurAirports 시도 실패 (${url}):`, error.message);
    }
  }
  throw lastError || new Error("OurAirports CSV를 불러오지 못함");
}

async function buildAirports() {
  const airports = [];

  try {
    const { text, sourceUrl } = await fetchOurAirportsCsv();
    console.log(`   OurAirports source: ${sourceUrl}`);

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const header = parseCsvLine(lines[0]).map((h) => h.trim());

    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      if (cols.length < header.length) continue;
      const row = Object.fromEntries(header.map((key, index) => [key, (cols[index] || "").trim()]));

      // 주요 민간 공항 위주 (글로브 과밀 방지)
      if (row.type !== "large_airport" && !(row.type === "medium_airport" && row.scheduled_service === "yes")) {
        continue;
      }
      const lat = Number(row.latitude_deg);
      const lng = Number(row.longitude_deg);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      airports.push({
        id: `airport-${row.ident || row.id}`,
        kind: "airport",
        name: row.name || row.ident || row.iata_code || "Airport",
        lat,
        lng,
        tier: airportTier(row.type, row.scheduled_service),
        meta: {
          iso: row.iso_country || null,
          iata: row.iata_code || null,
          icao: row.ident || null,
          type: row.type || null,
          source: "ourairports-data",
        },
      });
    }
  } catch (error) {
    console.warn("   OurAirports fetch 실패:", error.message);
    airports.push(
      {
        id: "airport-icn",
        kind: "airport",
        name: "Incheon Intl",
        lat: 37.46,
        lng: 126.44,
        tier: 1,
        meta: { iso: "KR", source: "fallback" },
      },
      {
        id: "airport-nrt",
        kind: "airport",
        name: "Narita Intl",
        lat: 35.76,
        lng: 140.39,
        tier: 1,
        meta: { iso: "JP", source: "fallback" },
      },
    );
  }

  airports.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  return capArray(airports, 120, 1200);
}

const WPI_PORTS_CSV = path.join(DATA_DIR, "wpi-ports.csv");

/** NGA World Port Index HARBORSIZE → tier (L 대형 우선) */
function portTierFromHarborSize(size) {
  if (size === "L") return 1;
  if (size === "M") return 2;
  if (size === "S") return 3;
  return 4; // V 등
}

function buildPorts() {
  const ports = [];

  if (!fs.existsSync(WPI_PORTS_CSV)) {
    console.warn("   WPI ports CSV 없음 → seed 폴백");
    return loadSeed("ports-seed.json");
  }

  try {
    const text = fs.readFileSync(WPI_PORTS_CSV, "utf8");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const header = parseCsvLine(lines[0]).map((h) => h.trim());

    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      if (cols.length < header.length) continue;
      const row = Object.fromEntries(header.map((key, index) => [key, (cols[index] || "").trim()]));

      const size = (row.HARBORSIZE || "").toUpperCase();
      // 대형·중형 위주 (글로브 과밀 방지). full에서 S까지 일부 포함
      if (size !== "L" && size !== "M" && !(size === "S" && !IS_LITE)) continue;

      const lat = Number(row.LATITUDE);
      const lng = Number(row.LONGITUDE);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;

      const indexNo = row.INDEX_NO || row.FID || `${lat},${lng}`;
      ports.push({
        id: `port-wpi-${indexNo}`,
        kind: "port",
        name: row.PORT_NAME || `Port ${indexNo}`,
        lat,
        lng,
        tier: portTierFromHarborSize(size),
        meta: {
          country: row.COUNTRY || null,
          harborSize: size || null,
          harborType: row.HARBORTYPE || null,
          source: "nga-wpi-2017",
        },
      });
    }
  } catch (error) {
    console.warn("   WPI ports 파싱 실패:", error.message);
    return loadSeed("ports-seed.json");
  }

  ports.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  console.log(`   WPI source: ${WPI_PORTS_CSV}`);
  return capArray(ports, 150, 1500);
}

function loadSeed(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`build-static-extras (profile=${IS_LITE ? "lite" : "full"})`);

  // Prefer fresh SIGINT conversion if vendor GeoJSON is present
  const sigintVendor = path.join(__dirname, "vendor", "sigint-news-layers");
  if (fs.existsSync(path.join(sigintVendor, "nuclear-sites.geojson"))) {
    try {
      require("./convert-sigint-layers.js");
    } catch (error) {
      console.warn("   sigint convert skipped:", error.message);
    }
  }

  const shipping = await buildShippingLanes();
  writeJsonArrayFile(
    path.join(OUT_DIR, "shipping-lanes.json"),
    shipping.map((p) => compactTransportPath(p, { precision: IS_LITE ? 2 : 3 })),
  );
  console.log(`   shipping-lanes: ${shipping.length}`);

  const cables = await buildSubmarineCables();
  writeJsonArrayFile(
    path.join(OUT_DIR, "submarine-cables.json"),
    cables.paths.map((p) => compactTransportPath(p, { precision: IS_LITE ? 2 : 3 })),
  );
  writeJsonArrayFile(
    path.join(OUT_DIR, "cable-landings.json"),
    cables.landings.map(compactStaticPoint),
  );
  console.log(`   submarine-cables: ${cables.paths.length}, landings: ${cables.landings.length}`);

  const airports = await buildAirports();
  writeJsonArrayFile(
    path.join(OUT_DIR, "airports.json"),
    airports.map(compactStaticPoint),
  );
  console.log(`   airports: ${airports.length}`);

  const ports = buildPorts();
  writeJsonArrayFile(path.join(OUT_DIR, "ports.json"), ports.map(compactStaticPoint));
  console.log(`   ports: ${ports.length}`);

  const militaryCsv =
    process.env.MILITARY_BASES_CSV || path.join(DATA_DIR, "military-bases.csv");
  if (fs.existsSync(militaryCsv)) {
    process.env.MILITARY_BASES_CSV = militaryCsv;
    require("./convert-military-bases-csv.js");
  } else {
    const bases = loadSeed("military-bases-seed.json");
    writeJsonArrayFile(path.join(OUT_DIR, "military-bases.json"), bases.map(compactStaticPoint));
    console.log(`   military-bases (seed): ${bases.length}`);
  }

  // Prefer SIGINT-converted snapshots when present
  const SIGINT_CONVERTED = path.join(DATA_DIR, "sigint-converted");
  function loadSigintOrSeed(convertedName, seedName) {
    const convertedPath = path.join(SIGINT_CONVERTED, convertedName);
    if (fs.existsSync(convertedPath)) {
      return { items: JSON.parse(fs.readFileSync(convertedPath, "utf8")), source: "sigint" };
    }
    if (seedName && fs.existsSync(path.join(DATA_DIR, seedName))) {
      return { items: loadSeed(seedName), source: "seed" };
    }
    return { items: [], source: "none" };
  }

  const resourcesPack = loadSigintOrSeed("resources.json", "resources-seed.json");
  writeJsonArrayFile(
    path.join(OUT_DIR, "resources.json"),
    resourcesPack.source === "sigint"
      ? resourcesPack.items
      : resourcesPack.items.map(compactStaticPoint),
  );
  console.log(`   resources (${resourcesPack.source}): ${resourcesPack.items.length}`);

  for (const [convertedName, seedName, outName] of [
    ["nuclear-sites.json", "nuclear-sites-seed.json", "nuclear-sites.json"],
    ["internet-exchanges.json", "internet-exchanges-seed.json", "internet-exchanges.json"],
    ["refugee-camps.json", "refugee-camps-seed.json", "refugee-camps.json"],
    ["ucdp-events.json", "ucdp-events-seed.json", "ucdp-events.json"],
    ["ai-data-centers.json", null, "ai-data-centers.json"],
    ["economic-centers.json", null, "economic-centers.json"],
    ["sanctions-entities.json", null, "sanctions-entities.json"],
    ["arms-embargo-zones.json", null, "arms-embargo-zones.json"],
    ["conflict-zones.json", null, "conflict-zones-fallback.json"],
  ]) {
    const pack = loadSigintOrSeed(convertedName, seedName);
    if (!pack.items.length) {
      console.log(`   ${outName}: 0 (missing)`);
      continue;
    }
    writeJsonArrayFile(
      path.join(OUT_DIR, outName),
      pack.source === "sigint" || !seedName ? pack.items : pack.items.map(compactStaticPoint),
    );
    console.log(`   ${outName} (${pack.source}): ${pack.items.length}`);
  }

  // SIGINT military-bases.geojson은 플레이스홀더(fake names)라 병합하지 않음.
  // 해외 미군기지는 convert-military-bases-csv.js → military-bases-seed.json 이 담당.

  // Merge SIGINT trade routes into shipping-lanes
  const sigintTradePath = path.join(SIGINT_CONVERTED, "sigint-trade-routes.json");
  if (fs.existsSync(sigintTradePath)) {
    const shippingPath = path.join(OUT_DIR, "shipping-lanes.json");
    let shipping = fs.existsSync(shippingPath)
      ? JSON.parse(fs.readFileSync(shippingPath, "utf8"))
      : [];
    const extra = JSON.parse(fs.readFileSync(sigintTradePath, "utf8"));
    shipping = [...shipping, ...extra];
    writeJsonArrayFile(path.join(OUT_DIR, "shipping-lanes.json"), shipping);
    console.log(`   shipping-lanes +sigint trade: +${extra.length} (total ${shipping.length})`);
  }

  const overviews = loadSeed("dispute-overviews-seed.json");
  writeJsonObjectFile(path.join(OUT_DIR, "dispute-overviews.json"), {
    generatedAt: new Date().toISOString(),
    items: overviews,
  });
  console.log(`   dispute-overviews: ${overviews.length}`);

  try {
    const { main: buildGemLayers } = require("./build-gem-layers.js");
    buildGemLayers();
  } catch (error) {
    console.warn("   gem layers skipped:", error.message);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
