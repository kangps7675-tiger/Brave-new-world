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

const GEM_ROOT =
  process.env.GEM_DATA_DIR ||
  path.resolve(__dirname, "..", "..", "..", "gem-data");

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

function convertPipelineGeoJson(geo, kind, idPrefix, caps) {
  if (!geo?.features) return [];

  const maxPts = IS_LITE ? 24 : 48;
  const precision = IS_LITE ? 2 : 3;
  const paths = [];

  for (const [index, feature] of geo.features.entries()) {
    const props = feature.properties || {};
    if (!statusAllowed(props.Status)) continue;

    const rank = statusRank(props.Status);
    const name = pipelineName(props);
    const segments = lineGeometryToPoints(feature.geometry, maxPts, roundCoord, precision);

    for (const [pathIndex, points] of segments.entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `${idPrefix}-${props.ProjectID || index}-${pathIndex}`,
        kind,
        name,
        scalerank: rank,
        lengthKm: Number(props.LengthMergedKm) || null,
        bbox: pointsBbox(points, roundCoord),
        points,
        meta: {
          source: "gem",
          status: props.Status || null,
          fuel: props.Fuel || null,
          country: props.CountriesOrAreas || props["Start CountryOrArea"] || null,
          owner: props.Owner || null,
          capacity: props.Capacity || null,
          capacityUnits: props.CapacityUnits || null,
        },
        _rank: rank,
        _length: points.length,
      });
    }
  }

  paths.sort((a, b) => a._rank - b._rank || b._length - a._length);
  const cleaned = paths.map(({ _rank, _length, ...rest }) => rest);
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
  const cap = IS_LITE ? 100 : 350;
  return points
    .slice(0, cap)
    .map(({ _rank, ...rest }) => rest);
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
    { lite: 180, full: 900 },
  );

  const gas = convertPipelineGeoJson(
    loadGeoJson("GEM-GGIT-Gas-Pipelines-2025-11/GEM-GGIT-Gas-Pipelines-2025-11.geojson"),
    "gas-pipeline",
    "gem-gas",
    { lite: 280, full: 1400 },
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
  module.exports = { buildGemLayers, main };
}
