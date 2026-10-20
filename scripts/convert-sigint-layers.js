// Convert SIGINT GeoJSON vendor files → compact JSON under scripts/data/sigint-converted/
// Also writes profile outputs when OUT_DIR is set via build-profile.
// node scripts/convert-sigint-layers.js
// DATA_PROFILE=lite|full node scripts/convert-sigint-layers.js

const fs = require("fs");
const path = require("path");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const {
  writeJsonArrayFile,
  roundCoord,
  compactStaticPoint,
  compactTransportPath,
} = require("./compact-json");
const { pointsBbox, lineGeometryToPoints } = require("./static-path-utils");

const VENDOR = path.join(__dirname, "vendor", "sigint-news-layers");
const CONVERTED = path.join(__dirname, "data", "sigint-converted");

const KIND_MAP = {
  "nuclear-sites": "nuclear-site",
  "military-bases": "military-base",
  "internet-exchanges": "internet-exchange",
  "refugee-camps": "refugee-camp",
  "ucdp-events": "ucdp-event",
  "critical-minerals": "resource",
  "ai-data-centers": "ai-data-center",
  "economic-centers": "economic-center",
  "sanctions-entities": "sanctions-entity",
};

const POINT_CAPS = {
  "nuclear-site": { lite: 80, full: 400 },
  "military-base": { lite: 120, full: 800 },
  "internet-exchange": { lite: 60, full: 300 },
  "refugee-camp": { lite: 80, full: 400 },
  "ucdp-event": { lite: 120, full: 600 },
  resource: { lite: 80, full: 400 },
  "ai-data-center": { lite: 80, full: 400 },
  "economic-center": { lite: 60, full: 300 },
  "sanctions-entity": { lite: 80, full: 500 },
};

function loadGeoJson(name) {
  const filePath = path.join(VENDOR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function featureProps(feature) {
  return feature.properties || {};
}

function pointFromFeature(feature, kind, index, idPrefix) {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const props = featureProps(feature);
  const rawId = feature.id || props.id || `${index}`;
  const id = `${idPrefix}${rawId}`.replace(/\s+/g, "-");
  const name =
    props.name || props.conflictName || props.title || props.label || String(rawId);
  const meta = { source: "sigint-snapshot" };
  for (const [key, value] of Object.entries(props)) {
    if (key === "name" || value == null || value === "") continue;
    if (typeof value === "string" || typeof value === "number") {
      meta[key] = value;
    }
  }
  return {
    id,
    kind,
    name,
    lat: roundCoord(lat, 4),
    lng: roundCoord(lng, 4),
    tier: Number(props.tier) || (kind === "military-base" ? 2 : 1),
    meta,
  };
}

function convertPoints(fileBase, kind, idPrefix) {
  const geo = loadGeoJson(`${fileBase}.geojson`) || loadGeoJson(`${fileBase}.json`);
  if (!geo?.features) return [];
  const points = [];
  for (const [index, feature] of geo.features.entries()) {
    if (feature.geometry?.type !== "Point") continue;
    const point = pointFromFeature(feature, kind, index, idPrefix);
    if (point) points.push(point);
  }
  const cap = POINT_CAPS[kind]?.[IS_LITE ? "lite" : "full"] ?? (IS_LITE ? 80 : 400);
  return points.slice(0, cap);
}

function convertTradeRoutes() {
  const geo = loadGeoJson("trade-routes.geojson");
  if (!geo?.features) return [];
  const paths = [];
  const maxPts = IS_LITE ? 40 : 100;
  const precision = IS_LITE ? 2 : 3;
  for (const [index, feature] of geo.features.entries()) {
    const props = featureProps(feature);
    const name = props.name || props.id || `SIGINT trade ${index}`;
    for (const [pathIndex, points] of lineGeometryToPoints(
      feature.geometry,
      maxPts,
      roundCoord,
      precision,
    ).entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `sigint-trade-${feature.id || index}-${pathIndex}`,
        kind: "shipping-lane",
        name,
        scalerank: 0,
        lengthKm: null,
        bbox: pointsBbox(points, roundCoord),
        points,
        meta: { source: "sigint-trade-routes" },
      });
    }
  }
  return paths.slice(0, IS_LITE ? 40 : 200);
}

function convertZones(fileBase, kind) {
  const geo = loadGeoJson(`${fileBase}.geojson`);
  if (!geo?.features) return [];
  const zones = [];
  for (const [index, feature] of geo.features.entries()) {
    const g = feature.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    const props = featureProps(feature);
    const name = props.name || props.country || `${kind}-${index}`;
    const center = props.center
      ? { lat: Number(props.center.lat), lng: Number(props.center.lng) }
      : centroidOfGeometry(g);
    if (!center) continue;
    zones.push({
      id: `sigint-${kind}-${feature.id || index}`,
      kind,
      name,
      center: {
        lat: roundCoord(center.lat, 4),
        lng: roundCoord(center.lng, 4),
      },
      geometry: g,
      isoA3: props.isoA3 || props.iso_a3 || props.ADM0_A3 || null,
      sources: Array.isArray(props.sources) ? props.sources : ["SIGINT"],
      eventCount: Number(props.eventCount) || Number(props.count) || 0,
      tension: props.tension || "medium",
      meta: { source: "sigint-snapshot" },
    });
  }
  return zones.slice(0, IS_LITE ? 40 : 200);
}

function centroidOfGeometry(geometry) {
  let ring = null;
  if (geometry.type === "Polygon") ring = geometry.coordinates?.[0];
  else if (geometry.type === "MultiPolygon") ring = geometry.coordinates?.[0]?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const coord of ring) {
    if (!Array.isArray(coord) || coord.length < 2) continue;
    x += Number(coord[0]);
    y += Number(coord[1]);
    n += 1;
  }
  if (!n) return null;
  return { lng: x / n, lat: y / n };
}

function writeBoth(fileName, items, mapper) {
  fs.mkdirSync(CONVERTED, { recursive: true });
  const mapped = mapper ? items.map(mapper) : items;
  writeJsonArrayFile(path.join(CONVERTED, fileName), mapped);
  if (OUT_DIR) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    writeJsonArrayFile(path.join(OUT_DIR, fileName), mapped);
  }
  return mapped.length;
}

function main() {
  if (!fs.existsSync(VENDOR)) {
    console.warn(`vendor 없음: ${VENDOR} — fetch-sigint-layers.js 먼저 실행`);
    process.exit(0);
  }

  console.log(`convert-sigint-layers (profile=${IS_LITE ? "lite" : "full"})`);

  const results = {};
  for (const [fileBase, kind] of Object.entries(KIND_MAP)) {
    const idPrefix =
      kind === "military-base"
        ? "sigint-base-"
        : kind === "resource"
          ? "sigint-res-"
          : `sigint-${kind}-`;
    const points = convertPoints(fileBase, kind, idPrefix);
    const outName =
      kind === "resource"
        ? "resources.json"
        : `${fileBase.replace(/_/g, "-")}.json`.replace(
            "critical-minerals.json",
            "resources.json",
          );
    // normalize out names
    const fileName =
      {
        "nuclear-site": "nuclear-sites.json",
        "military-base": "sigint-military-bases.json",
        "internet-exchange": "internet-exchanges.json",
        "refugee-camp": "refugee-camps.json",
        "ucdp-event": "ucdp-events.json",
        resource: "resources.json",
        "ai-data-center": "ai-data-centers.json",
        "economic-center": "economic-centers.json",
        "sanctions-entity": "sanctions-entities.json",
      }[kind] || outName;

    results[fileName] = writeBoth(fileName, points, compactStaticPoint);
    console.log(`   ${fileName}: ${results[fileName]}`);
  }

  const trades = convertTradeRoutes();
  results["sigint-trade-routes.json"] = writeBoth(
    "sigint-trade-routes.json",
    trades,
    (p) => compactTransportPath(p, { precision: IS_LITE ? 2 : 3 }),
  );
  console.log(`   sigint-trade-routes.json: ${results["sigint-trade-routes.json"]}`);

  const arms = convertZones("arms-embargo-zones", "arms-embargo");
  results["arms-embargo-zones.json"] = writeBoth("arms-embargo-zones.json", arms);
  console.log(`   arms-embargo-zones.json: ${results["arms-embargo-zones.json"]}`);

  const conflicts = convertZones("conflict-zones", "conflict-zone");
  // normalize conflict zones to ConflictZoneFeature shape
  const conflictMapped = conflicts.map((z) => ({
    id: z.id,
    kind: "conflict-zone",
    name: z.name,
    center: z.center,
    geometry: z.geometry,
    eventCount: z.eventCount || 1,
    tension: z.tension === "high" || z.tension === "low" ? z.tension : "medium",
  }));
  fs.mkdirSync(CONVERTED, { recursive: true });
  writeJsonArrayFile(path.join(CONVERTED, "conflict-zones.json"), conflictMapped);
  if (OUT_DIR) writeJsonArrayFile(path.join(OUT_DIR, "conflict-zones-fallback.json"), conflictMapped);
  console.log(`   conflict-zones.json: ${conflictMapped.length}`);

  console.log("convert-sigint-layers done");
}

main();
