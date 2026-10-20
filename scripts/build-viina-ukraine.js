/**
 * Build VIINA Ukraine control polygons for server-side render cache.
 * Output: private/viina-render/{lite|full}/ukraine-control.json (gitignored)
 *
 * Usage:
 *   node scripts/viina-lfs.js
 *   node scripts/build-viina-ukraine.js lite
 *   node scripts/build-viina-ukraine.js full
 */

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ROOT = path.join(__dirname, "..");
const VIINA_DIR = path.join(ROOT, "vendor", "VIINA");
const CONTROL_ZIP = path.join(VIINA_DIR, "Data", "control_latest_2026.zip");
const TESS_GEOJSON = path.join(VIINA_DIR, "Data", "gn_UA_tess.geojson");

const profileArg = (process.argv[2] || "lite").toLowerCase();
const IS_LITE = profileArg !== "full";
const OUT_DIR = path.join(ROOT, "private", "viina-render", IS_LITE ? "lite" : "full");
const OUT_FILE = path.join(OUT_DIR, "ukraine-control.json");

const UA_FRONTLINE_BUFFER_DEG = 0.38;
const OVERVIEW_RING_MAX = IS_LITE ? 6 : 10;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureInputs() {
  if (!fs.existsSync(CONTROL_ZIP)) {
    throw new Error(
      `Missing ${CONTROL_ZIP}. Run: node scripts/viina-lfs.js`,
    );
  }
  if (!fs.existsSync(TESS_GEOJSON)) {
    throw new Error(`Missing ${TESS_GEOJSON}`);
  }
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeStatus(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "RU" || raw === "RUSSIA") return "RU";
  if (raw === "UA" || raw === "UKRAINE") return "UA";
  if (raw === "CONTESTED" || raw === "DISPUTED") return "CONTESTED";
  return null;
}

function loadLatestStatusByGeonameId() {
  const zip = new AdmZip(CONTROL_ZIP);
  const entry =
    zip
      .getEntries()
      .find((item) => item.entryName.toLowerCase().endsWith(".csv")) || null;
  if (!entry) throw new Error("control zip has no CSV entry");

  const csv = zip.readAsText(entry, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("control CSV is empty");

  const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const geonameIdx = header.findIndex((cell) => cell === "geonameid" || cell === "geoname_id");
  const statusIdx = header.findIndex((cell) => cell === "status");
  const dateIdx = header.findIndex((cell) => cell === "date" || cell === "obs_date");
  const versionIdx = header.findIndex((cell) => cell === "vcontrol_version");

  if (geonameIdx < 0 || statusIdx < 0) {
    throw new Error("control CSV missing geonameid/status columns");
  }

  const latestById = new Map();
  let controlDate = "";
  let vcontrolVersion = null;

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const geonameid = String(cols[geonameIdx] || "").trim();
    if (!geonameid) continue;
    const status = normalizeStatus(cols[statusIdx]);
    if (!status) continue;

    const date = dateIdx >= 0 ? String(cols[dateIdx] || "").trim() : "";
    const version = versionIdx >= 0 ? String(cols[versionIdx] || "").trim() : "";
    if (version) vcontrolVersion = version;
    if (date && date > controlDate) controlDate = date;

    const prev = latestById.get(geonameid);
    if (!prev || (date && date >= prev.date)) {
      latestById.set(geonameid, { status, date });
    }
  }

  const statusById = new Map();
  for (const [id, row] of latestById.entries()) {
    statusById.set(id, row);
  }

  return { statusById, controlDate, vcontrolVersion };
}

function extractSettlementMeta(properties = {}) {
  const geonameid = String(properties.geonameid ?? properties.geonameId ?? "").trim();
  const name = String(properties.name || properties.asciiname || "Unknown").trim();
  const nameLong = String(properties.alternatenames || name).trim();
  const lat = Number(properties.latitude);
  const lng = Number(properties.longitude);
  const population = Number(properties.population);
  return {
    geonameid,
    name,
    nameLong,
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    adm1: properties.ADM1_NAME ? String(properties.ADM1_NAME) : null,
    adm2: properties.ADM2_NAME ? String(properties.ADM2_NAME) : null,
    population: Number.isFinite(population) ? population : null,
  };
}

function ringBBox(ring) {
  const lats = ring.map((pair) => pair[1]);
  const lngs = ring.map((pair) => pair[0]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function computeCenter(polygonCoordsList) {
  const points = [];
  for (const polygon of polygonCoordsList) {
    const ring = polygon?.[0];
    if (!Array.isArray(ring)) continue;
    for (const [lng, lat] of ring) {
      if (Number.isFinite(lat) && Number.isFinite(lng)) points.push({ lat, lng });
    }
  }
  if (points.length === 0) return { lat: 0, lng: 0 };
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat, lng };
}

function simplifyRing(ring, maxPoints = OVERVIEW_RING_MAX) {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const sampled = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function simplifyGeometry(geometry, maxPoints = OVERVIEW_RING_MAX) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, maxPoints)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, maxPoints)),
      ),
    };
  }
  return null;
}

function longitudeDistanceDeg(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function centerDistanceDeg(a, b) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDist = longitudeDistanceDeg(a.lng, b.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function buildCellsByStatus(tess, statusById, targetStatus) {
  const cells = [];
  for (const feature of tess.features || []) {
    const meta = extractSettlementMeta(feature.properties);
    const row = statusById.get(meta.geonameid);
    const status = row?.status === "RU" ? "RU" : row?.status === "CONTESTED" ? "CONTESTED" : "UA";
    if (status !== targetStatus) continue;

    const simplified = simplifyGeometry(feature.geometry, IS_LITE ? 8 : 24);
    if (!simplified) continue;

    if (simplified.type === "Polygon") {
      cells.push({ polygonCoords: simplified.coordinates, meta, controlStatus: status });
      continue;
    }
    if (simplified.type === "MultiPolygon") {
      for (const polygonCoords of simplified.coordinates) {
        cells.push({ polygonCoords, meta, controlStatus: status });
      }
    }
  }
  return cells;
}

function filterFrontlineUaCells(uaCells, hostileCenters, bufferDeg = UA_FRONTLINE_BUFFER_DEG) {
  if (hostileCenters.length === 0) return uaCells;
  return uaCells.filter((cell) => {
    const center = computeCenter([cell.polygonCoords]);
    return hostileCenters.some((hostile) => centerDistanceDeg(center, hostile) <= bufferDeg);
  });
}

function zoneFromCell(cell, index, mode, controlStatus = "RU") {
  const { polygonCoords, meta } = cell;
  const statusTag = controlStatus.toLowerCase();
  const prefix = mode === "overview" ? `viina-${statusTag}-overview` : `viina-${statusTag}`;
  const center = computeCenter([polygonCoords]);
  const bbox = ringBBox(polygonCoords[0] || []);

  return {
    id: `${prefix}-${meta.geonameid}-${index}`,
    kind: "ukraine-control",
    controlStatus,
    geonameId: meta.geonameid,
    name: meta.name,
    nameLong: meta.nameLong,
    adm1: meta.adm1,
    adm2: meta.adm2,
    population: meta.population,
    center: center.lat && center.lng ? center : { lat: meta.lat, lng: meta.lng },
    bbox,
    geometry: {
      type: "Polygon",
      coordinates: polygonCoords,
    },
  };
}

function buildOverviewFeatures(cells, controlStatus = "RU") {
  return cells.map((cell, index) =>
    zoneFromCell(cell, index, "overview", cell.controlStatus || controlStatus),
  );
}

function buildDetailFeatures(cells, controlStatus = "RU") {
  return cells.map((cell, index) =>
    zoneFromCell(cell, index, "detail", cell.controlStatus || controlStatus),
  );
}

function buildAllSettlements(tess, statusById) {
  if (IS_LITE) return [];
  const settlements = [];
  for (const feature of tess.features || []) {
    const meta = extractSettlementMeta(feature.properties);
    const row = statusById.get(meta.geonameid);
    if (!row) continue;
    settlements.push({
      geonameId: meta.geonameid,
      name: meta.name,
      nameLong: meta.nameLong,
      lat: meta.lat,
      lng: meta.lng,
      adm1: meta.adm1,
      adm2: meta.adm2,
      population: meta.population,
      controlStatus: row.status,
    });
  }
  return settlements;
}

function main() {
  ensureInputs();
  console.log(`VIINA build (${IS_LITE ? "lite" : "full"})`);

  const tess = readJson(TESS_GEOJSON);
  const { statusById, controlDate, vcontrolVersion } = loadLatestStatusByGeonameId();

  const ruCells = buildCellsByStatus(tess, statusById, "RU");
  const contestedCells = buildCellsByStatus(tess, statusById, "CONTESTED");
  const uaCellsAll = buildCellsByStatus(tess, statusById, "UA");
  const hostileCenters = [
    ...ruCells.map((cell) => computeCenter([cell.polygonCoords])),
    ...contestedCells.map((cell) => computeCenter([cell.polygonCoords])),
  ];
  const uaFrontlineCells = filterFrontlineUaCells(uaCellsAll, hostileCenters);
  const settlements = buildAllSettlements(tess, statusById);

  console.log(
    `   RU ${ruCells.length.toLocaleString()} · CONTESTED ${contestedCells.length.toLocaleString()} · UA전선 ${uaFrontlineCells.length.toLocaleString()} / UA전체 ${uaCellsAll.length.toLocaleString()} · 거주지 ${settlements.length.toLocaleString()}`,
  );

  const ruOverview = buildOverviewFeatures(ruCells);
  const contestedOverview = buildOverviewFeatures(contestedCells);
  const uaOverview = buildOverviewFeatures(uaFrontlineCells);
  const overviewFeatures = [...ruOverview, ...contestedOverview, ...uaOverview];

  const features = IS_LITE
    ? overviewFeatures
    : [
        ...buildDetailFeatures(ruCells),
        ...buildDetailFeatures(contestedCells),
        ...buildDetailFeatures(uaCellsAll),
      ];

  const payload = {
    generatedAt: new Date().toISOString(),
    profile: IS_LITE ? "lite" : "full",
    source: "VIINA",
    controlDate: controlDate || null,
    vcontrolVersion,
    ruCellCount: ruCells.length,
    contestedCellCount: contestedCells.length,
    uaFrontlineCellCount: uaFrontlineCells.length,
    uaCellCount: uaCellsAll.length,
    settlementCount: IS_LITE ? 0 : settlements.length,
    overviewFeatureCount: overviewFeatures.length,
    overviewFeatures,
    contestedOverviewFeatures: contestedOverview,
    uaOverviewFeatures: uaOverview,
    features,
    settlements: IS_LITE ? [] : settlements,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload));
  console.log(`✓ wrote ${OUT_FILE} (${features.length.toLocaleString()} features)`);
}

try {
  main();
} catch (error) {
  console.error("build-viina-ukraine failed:", error.message || error);
  process.exit(1);
}
