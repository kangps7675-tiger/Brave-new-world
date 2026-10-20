// Global Energy Monitor (GEM) GeoJSON → compact JSON for Conflict View
// GEM_DATA_DIR=... node scripts/build-gem-layers.js
// Or invoked from build-static-extras.js

const fs = require("fs");
const path = require("path");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const {
  writeJsonArrayFile,
  compactTransportPath,
  compactStaticPoint,
  roundCoord,
} = require("./compact-json");
const {
  lineGeometryToPoints,
  pointsBbox,
  capArrayGeographic,
} = require("./static-path-utils");

function resolveGemRoot() {
  const candidates = [
    process.env.GEM_DATA_DIR,
    path.resolve(__dirname, "..", "..", "..", "gem-data"),
    path.resolve(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "gem-data"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0] || path.resolve(__dirname, "..", "..", "..", "gem-data");
}

const GEM_ROOT = resolveGemRoot();

const STATUS_RANK = {
  operating: 1,
  construction: 2,
  proposed: 3,
  idle: 4,
  mothballed: 5,
  shelved: 6,
  cancelled: 7,
  retired: 8,
};

const LITE_STATUSES = new Set(["operating", "construction"]);
const FULL_STATUSES = new Set(["operating", "construction", "proposed"]);

/** GEM has no offshore boolean — name/location keyword heuristic for subsea layer. */
const OFFSHORE_STRONG =
  /\b(subsea|offshore|under\s*water|underwater|seabed|submarine\s+pipe|marine\s+pipe|louisiana\s+offshore\s+oil\s+port)\b/i;
const OFFSHORE_SEA_LOC =
  /\b(gulf of mexico|north sea|baltic sea|norwegian sea|barents|mediterranean|adriatic|caspian|persian gulf|arabian gulf|red sea|south china sea|east china sea|yellow sea|bohai|timor sea|java sea|andaman|bay of bengal|caribbean|gulf of guinea|gulf of thailand|makassar|black sea|celtic sea|irish sea|aegean|sulu sea|celebes|luzon|shoal block|green canyon|ship shoal)\b/i;

function statusRank(status) {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  return STATUS_RANK[key] ?? 9;
}

function statusAllowed(status) {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  return IS_LITE ? LITE_STATUSES.has(key) : FULL_STATUSES.has(key);
}

function isOffshorePipeline(props) {
  const nameBlob = [
    props.PipelineName,
    props.SegmentName,
    props.OtherEnglishNames,
    props.OtherLanguagePrimaryPipelineName,
  ]
    .filter(Boolean)
    .join(" ");
  if (OFFSHORE_STRONG.test(nameBlob)) return true;
  const locBlob = [props.StartLocation, props.EndLocation, props.FuelSource]
    .filter(Boolean)
    .join(" ");
  if (OFFSHORE_STRONG.test(locBlob) || OFFSHORE_SEA_LOC.test(locBlob)) return true;
  return false;
}

function loadGeoJson(relativePath) {
  const filePath = path.join(GEM_ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn(`   GEM missing: ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pipelineName(props) {
  const segment = props.SegmentName ? ` · ${props.SegmentName}` : "";
  return `${props.PipelineName || props.ProjectID || "Pipeline"}${segment}`;
}

function convertPipelineGeoJson(geo, kind, idPrefix, caps, options = {}) {
  if (!geo?.features) return [];

  const maxPts = IS_LITE ? 24 : 48;
  const precision = IS_LITE ? 2 : 3;
  const paths = [];
  const forceKind = options.forceKind || null;
  const onlyOffshore = Boolean(options.onlyOffshore);
  const idTag = options.idTag || idPrefix;

  for (const [index, feature] of geo.features.entries()) {
    const props = feature.properties || {};
    if (!statusAllowed(props.Status)) continue;
    if (onlyOffshore && !isOffshorePipeline(props)) continue;

    const rank = statusRank(props.Status);
    const name = pipelineName(props);
    const segments = lineGeometryToPoints(feature.geometry, maxPts, roundCoord, precision);

    for (const [pathIndex, points] of segments.entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `${idTag}-${props.ProjectID || index}-${pathIndex}`,
        kind: forceKind || kind,
        name,
        scalerank: rank,
        lengthKm: Number(props.LengthMergedKm) || null,
        bbox: pointsBbox(points, roundCoord),
        points,
        meta: {
          source: "gem",
          status: props.Status || null,
          fuel: props.Fuel || null,
          country: props.CountriesOrAreas || props.StartCountryOrArea || null,
          owner: props.Owner || null,
          capacity: props.Capacity || null,
          capacityUnits: props.CapacityUnits || null,
          offshore: onlyOffshore || isOffshorePipeline(props) ? "yes" : null,
        },
        _rank: rank,
        _length: points.length,
      });
    }
  }

  paths.sort((a, b) => a._rank - b._rank || b._length - a._length);
  const cleaned = paths.map(({ _rank, _length, ...rest }) => rest);
  if (!caps) return cleaned;
  return capArrayGeographic(cleaned, caps.lite, caps.full, (path) => {
    const pts = path.points;
    if (!pts?.length) return { lat: NaN, lng: NaN };
    const mid = pts[Math.floor(pts.length / 2)];
    return { lat: mid.lat, lng: mid.lng };
  });
}

function convertLngTerminals(geo) {
  if (!geo?.features) return [];

  const points = [];
  for (const [index, feature] of geo.features.entries()) {
    const props = feature.properties || {};
    if (!statusAllowed(props.Status)) continue;

    const lat = Number(props.Latitude ?? feature.geometry?.coordinates?.[1]);
    const lng = Number(props.Longitude ?? feature.geometry?.coordinates?.[0]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const rank = statusRank(props.Status);
    const id = `lng-${props.UnitID || props.ProjectID || index}`;
    points.push({
      id,
      kind: "lng-terminal",
      name: props.TerminalName || props.UnitName || `LNG ${index}`,
      lat: roundCoord(lat, 4),
      lng: roundCoord(lng, 4),
      tier: rank,
      meta: {
        source: "gem",
        status: props.Status || null,
        facilityType: props.FacilityType || null,
        country: props["Country/Area"] || null,
        owner: props.Owner || null,
        capacityMtpa: props.CapacityinMtpa || props.Capacity || null,
        wiki: props.Wiki || null,
      },
      _rank: rank,
    });
  }

  points.sort((a, b) => a._rank - b._rank || a.name.localeCompare(b.name));
  const cap = IS_LITE ? 200 : 500;
  return points
    .slice(0, cap)
    .map(({ _rank, ...rest }) => rest);
}

/** Worldwide offshore/subsea segments from GEM oil+gas trackers (for subsea layer merge). */
function extractGemOffshorePipelines() {
  if (!fs.existsSync(GEM_ROOT)) return [];
  const oil = convertPipelineGeoJson(
    loadGeoJson("GEM-GOIT-Oil-NGL-Pipelines-2026-06/GEM-GOIT-Oil-NGL-Pipelines-2026-06.geojson"),
    "oil-pipeline",
    "gem-oil",
    null,
    { onlyOffshore: true, forceKind: "subsea-pipeline", idTag: "gem-subsea-oil" },
  );
  const gas = convertPipelineGeoJson(
    loadGeoJson("GEM-GGIT-Gas-Pipelines-2025-11/GEM-GGIT-Gas-Pipelines-2025-11.geojson"),
    "gas-pipeline",
    "gem-gas",
    null,
    { onlyOffshore: true, forceKind: "subsea-pipeline", idTag: "gem-subsea-gas" },
  );
  // MultiLineString 세그먼트 폭발 방지: 프로젝트당 최장 1개
  const best = new Map();
  for (const path of [...oil, ...gas]) {
    const key = String(path.id).replace(/-\d+$/, "");
    const prev = best.get(key);
    if (!prev || (path.points?.length || 0) > (prev.points?.length || 0)) {
      best.set(key, path);
    }
  }
  return [...best.values()];
}

function buildGemLayers() {
  if (!fs.existsSync(GEM_ROOT)) {
    console.warn(`   GEM_DATA_DIR not found: ${GEM_ROOT}`);
    return { oil: [], gas: [], lng: [] };
  }

  console.log(`   GEM source: ${GEM_ROOT}`);

  const oil = convertPipelineGeoJson(
    loadGeoJson("GEM-GOIT-Oil-NGL-Pipelines-2026-06/GEM-GOIT-Oil-NGL-Pipelines-2026-06.geojson"),
    "oil-pipeline",
    "gem-oil",
    { lite: 400, full: 1200 },
  );

  const gas = convertPipelineGeoJson(
    loadGeoJson("GEM-GGIT-Gas-Pipelines-2025-11/GEM-GGIT-Gas-Pipelines-2025-11.geojson"),
    "gas-pipeline",
    "gem-gas",
    { lite: 700, full: 1800 },
  );

  const lng = convertLngTerminals(
    loadGeoJson("GEM-GGIT-LNG-Terminals-2025-09-gis-files/GEM-GGIT-LNG-Terminals-2025-09.geojson"),
  );

  return { oil, gas, lng };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { oil, gas, lng } = buildGemLayers();
  const precision = IS_LITE ? 2 : 3;

  writeJsonArrayFile(
    path.join(OUT_DIR, "oil-pipelines.json"),
    oil.map((p) => compactTransportPath(p, { precision })),
  );
  writeJsonArrayFile(
    path.join(OUT_DIR, "gas-pipelines.json"),
    gas.map((p) => compactTransportPath(p, { precision })),
  );
  writeJsonArrayFile(
    path.join(OUT_DIR, "lng-terminals.json"),
    lng.map(compactStaticPoint),
  );

  console.log(`   gem oil-pipelines: ${oil.length}`);
  console.log(`   gem gas-pipelines: ${gas.length}`);
  console.log(`   gem lng-terminals: ${lng.length}`);
}

if (require.main === module) {
  main();
} else {
  module.exports = { buildGemLayers, extractGemOffshorePipelines, main };
}
