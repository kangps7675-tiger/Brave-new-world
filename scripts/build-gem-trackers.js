// GEM Excel trackers → compact StaticPoint JSON for Conflict View
// GEM_DATA_DIR=... DATA_PROFILE=lite|full node scripts/build-gem-trackers.js

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const { writeJsonArrayFile, compactStaticPoint, roundCoord } = require("./compact-json");
const { capArrayGeographic } = require("./static-path-utils");

const GEM_ROOT =
  process.env.GEM_DATA_DIR ||
  path.resolve(__dirname, "..", "..", "..", "gem-data");

const STATUS_RANK = {
  operating: 1,
  construction: 2,
  proposed: 3,
  announced: 3,
  "pre-construction": 3,
  permitted: 3,
  idle: 4,
  mothballed: 5,
  shelved: 6,
  cancelled: 7,
  canceled: 7,
  retired: 8,
  closed: 8,
  shutdown: 8,
};

const LITE_OK = new Set(["operating", "construction"]);
const FULL_OK = new Set([
  "operating",
  "construction",
  "proposed",
  "announced",
  "pre-construction",
  "permitted",
]);

/** @type {Array<{
 *  id: string;
 *  kind: string;
 *  file: string;
 *  xlsx: string;
 *  sheet?: string | RegExp;
 *  nameKeys: string[];
 *  statusKeys?: string[];
 *  capacityKeys?: string[];
 *  countryKeys?: string[];
 *  idKeys?: string[];
 *  caps: { lite: number; full: number };
 * }>} */
const TRACKERS = [
  {
    id: "gem-coal-plants",
    kind: "gem-coal-plant",
    file: "gem-coal-plants.json",
    xlsx: "Global-Coal-Plant-Tracker-January-2026.xlsx",
    sheet: "Units",
    nameKeys: ["Plant name", "Unit name", "Project Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)"],
    countryKeys: ["Country/Area"],
    idKeys: ["GEM unit ID", "GEM Unit ID", "Unit ID"],
    caps: { lite: 220, full: 900 },
  },
  {
    id: "gem-coal-mines",
    kind: "gem-coal-mine",
    file: "gem-coal-mines.json",
    xlsx: "Global Coal Mine Tracker, May 2026__.xlsx",
    sheet: "Non-closed mines",
    nameKeys: ["Mine Name", "Complex Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (Mtpa)"],
    countryKeys: ["Country / Area", "Country/Area"],
    idKeys: ["GEM Mine ID"],
    caps: { lite: 180, full: 700 },
  },
  {
    id: "gem-coal-terminals",
    kind: "gem-coal-terminal",
    file: "gem-coal-terminals.json",
    xlsx: "Global-Coal-Terminals-Tracker-December-2024.xlsx",
    sheet: "Terminals",
    nameKeys: ["Coal Terminal Name", "Parent Port Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (Mt)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 80, full: 250 },
  },
  {
    id: "gem-nuclear",
    kind: "gem-nuclear",
    file: "gem-nuclear.json",
    xlsx: "Global-Nuclear-Power-Tracker-September-2025.xlsx",
    sheet: "Data",
    nameKeys: ["Project Name", "Unit Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)", "Reference Net Capacity (MW)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 160, full: 500 },
  },
  {
    id: "gem-solar",
    kind: "gem-solar",
    file: "gem-solar.json",
    xlsx: "Global-Solar-Power-Tracker-February-2026.xlsx",
    sheet: /Utility-Scale/i,
    nameKeys: ["Project Name", "Phase Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 250, full: 1200 },
  },
  {
    id: "gem-wind",
    kind: "gem-wind",
    file: "gem-wind.json",
    xlsx: "Global-Wind-Power-Tracker-February-2026.xlsx",
    sheet: "Data",
    nameKeys: ["Project Name", "Phase Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 220, full: 1000 },
  },
  {
    id: "gem-hydro",
    kind: "gem-hydro",
    file: "gem-hydro.json",
    xlsx: "Global-Hydropower-Tracker-March-2026.xlsx",
    sheet: "Data",
    nameKeys: ["Project Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)"],
    countryKeys: ["Country/Area 1", "Country/Area"],
    caps: { lite: 180, full: 700 },
  },
  {
    id: "gem-geothermal",
    kind: "gem-geothermal",
    file: "gem-geothermal.json",
    xlsx: "Geothermal-Power-Tracker-March-2026-Final.xlsx",
    sheet: "Data",
    nameKeys: ["Project Name", "Unit Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Unit Capacity (MW)", "Capacity (MW)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 80, full: 250 },
  },
  {
    id: "gem-bioenergy",
    kind: "gem-bioenergy",
    file: "gem-bioenergy.json",
    xlsx: "Global-Bioenergy-Power-Tracker-GBPT-V3.xlsx",
    sheet: "Data",
    nameKeys: ["Project Name", "Unit Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 120, full: 450 },
  },
  {
    id: "gem-oil-gas-plants",
    kind: "gem-oil-gas-plant",
    file: "gem-oil-gas-plants.json",
    xlsx: "Global-Oil-and-Gas-Plant-Tracker-GOGPT-January-2026.xlsx",
    sheet: /Gas & Oil Units/i,
    nameKeys: ["Plant name", "Unit name", "Plant Name"],
    statusKeys: ["Status"],
    capacityKeys: ["Capacity (MW)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 220, full: 900 },
  },
  {
    id: "gem-oil-gas-extraction",
    kind: "gem-oil-gas-extraction",
    file: "gem-oil-gas-extraction.json",
    xlsx: "Global-Oil-and-Gas-Extraction-Tracker-March-2026.xlsx",
    sheet: /Field-level main data/i,
    nameKeys: ["Unit Name", "Name Other"],
    statusKeys: ["Status"],
    countryKeys: ["Country/Area"],
    caps: { lite: 200, full: 800 },
  },
  {
    id: "gem-iron-ore",
    kind: "gem-iron-ore",
    file: "gem-iron-ore.json",
    xlsx: "Global-Iron-Ore-Mines-Tracker-August-2025-V1.xlsx",
    sheet: "Main Data",
    nameKeys: ["Asset name (English)", "Asset name (other language)"],
    statusKeys: ["Operating status", "Status"],
    capacityKeys: ["Design capacity (ttpa)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 120, full: 400 },
  },
  {
    id: "gem-cement",
    kind: "gem-cement",
    file: "gem-cement.json",
    xlsx: "Global-Cement-and-Concrete-Tracker_July-2025.xlsx",
    sheet: "Plant Data",
    nameKeys: ["GEM Asset name (English)", "Asset name (other language)"],
    statusKeys: ["Operating status", "Status"],
    capacityKeys: ["Cement Capacity (millions metric tonnes per annum)"],
    countryKeys: ["Country/Area"],
    caps: { lite: 160, full: 550 },
  },
  {
    id: "gem-steel",
    kind: "gem-steel",
    file: "gem-steel.json",
    xlsx: "Plant-level_data_Global_Iron_and_Steel_Tracker_June_2026_V1.xlsx",
    sheet: "Plant data",
    nameKeys: ["Plant name (English)", "Plant name (other language)"],
    statusKeys: ["Operating status", "Status"],
    countryKeys: ["Country/area", "Country/Area"],
    caps: { lite: 160, full: 550 },
  },
  {
    id: "gem-chemicals",
    kind: "gem-chemical",
    file: "gem-chemicals.json",
    xlsx: "Plant-level-data-Global-Chemicals-Inventory-November-2025-V1.xlsx",
    sheet: "Plant data",
    nameKeys: ["Plant name (English)", "Plant name (other language)"],
    statusKeys: ["Operating status", "Status"],
    countryKeys: ["Country/area", "Country/Area"],
    caps: { lite: 140, full: 500 },
  },
];

function pickSheet(wb, want) {
  if (!want) return wb.SheetNames[0];
  if (typeof want === "string") {
    return wb.SheetNames.includes(want)
      ? want
      : wb.SheetNames.find((n) => n.toLowerCase() === want.toLowerCase()) ||
          wb.SheetNames.find((n) => !/about|readme|metadata|dictionary|changelog/i.test(n)) ||
          wb.SheetNames[0];
  }
  return wb.SheetNames.find((n) => want.test(n)) || wb.SheetNames[0];
}

function firstVal(row, keys) {
  for (const key of keys || []) {
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  // fuzzy
  const rowKeys = Object.keys(row);
  for (const want of keys || []) {
    const hit = rowKeys.find((k) => k.toLowerCase() === want.toLowerCase());
    if (hit && row[hit] != null && String(row[hit]).trim() !== "") return row[hit];
  }
  return null;
}

function parseCoords(row) {
  const latDirect = Number(firstVal(row, ["Latitude", "Lat", "latitude"]));
  const lngDirect = Number(firstVal(row, ["Longitude", "Long", "Lng", "longitude"]));
  if (Number.isFinite(latDirect) && Number.isFinite(lngDirect)) {
    return { lat: latDirect, lng: lngDirect };
  }
  const raw = firstVal(row, ["Coordinates", "Coordinate", "Lat/Long"]);
  if (raw == null) return null;
  const text = String(raw).trim();
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  // GEM usually lat,lng — if |a|>90 treat as lng,lat
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
  if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lng: a };
  return null;
}

function statusKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function statusAllowed(status) {
  const key = statusKey(status);
  // allow multi-status like "operating, construction"
  const parts = key.split(/[,;/|]+/).map((p) => p.trim());
  const set = IS_LITE ? LITE_OK : FULL_OK;
  return parts.some((p) => set.has(p) || [...set].some((ok) => p.includes(ok)));
}

function statusRank(status) {
  const key = statusKey(status);
  for (const [name, rank] of Object.entries(STATUS_RANK)) {
    if (key.includes(name)) return rank;
  }
  return 9;
}

function convertTracker(def) {
  const filePath = path.join(GEM_ROOT, def.xlsx);
  if (!fs.existsSync(filePath)) {
    console.warn(`   missing ${def.xlsx}`);
    return [];
  }
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = pickSheet(wb, def.sheet);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
  const points = [];
  const seen = new Set();

  for (const [index, row] of rows.entries()) {
    const status = firstVal(row, def.statusKeys) ?? "operating";
    // industrial sheets sometimes omit status — keep if coords ok
    if (def.statusKeys?.length && !statusAllowed(status) && statusKey(status)) {
      // if status present but not allowed, skip; if empty keep
      if (String(status).trim()) continue;
    }

    const coords = parseCoords(row);
    if (!coords) continue;
    const { lat, lng } = coords;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;

    const name =
      String(firstVal(row, def.nameKeys) || `${def.id}-${index}`).trim() ||
      `${def.id}-${index}`;
    const country = firstVal(row, def.countryKeys);
    const capacity = firstVal(row, def.capacityKeys);
    const rawId = firstVal(row, def.idKeys);
    const id = `${def.id}-${rawId || `${roundCoord(lat, 3)}_${roundCoord(lng, 3)}_${index}`}`
      .replace(/\s+/g, "-")
      .slice(0, 120);
    if (seen.has(id)) continue;
    seen.add(id);

    const rank = statusRank(status);
    const capacityNum = capacity != null ? Number(String(capacity).replace(/,/g, "")) : NaN;

    points.push({
      id,
      kind: def.kind,
      name,
      lat: roundCoord(lat, 4),
      lng: roundCoord(lng, 4),
      tier: rank,
      meta: {
        source: "gem",
        status: status != null ? String(status) : null,
        country: country != null ? String(country) : null,
        capacity: Number.isFinite(capacityNum) ? capacityNum : capacity != null ? String(capacity) : null,
      },
      _rank: rank,
      _cap: Number.isFinite(capacityNum) ? capacityNum : 0,
    });
  }

  points.sort((a, b) => a._rank - b._rank || b._cap - a._cap || a.name.localeCompare(b.name));
  const cleaned = points.map(({ _rank, _cap, ...rest }) => rest);
  return capArrayGeographic(cleaned, def.caps.lite, def.caps.full, (p) => ({
    lat: p.lat,
    lng: p.lng,
  }));
}

function main() {
  if (!fs.existsSync(GEM_ROOT)) {
    console.warn(`GEM_DATA_DIR not found: ${GEM_ROOT}`);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`GEM trackers source: ${GEM_ROOT} (${IS_LITE ? "lite" : "full"})`);

  for (const def of TRACKERS) {
    const points = convertTracker(def);
    writeJsonArrayFile(
      path.join(OUT_DIR, def.file),
      points.map(compactStaticPoint),
    );
    console.log(`   ${def.id}: ${points.length}`);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = { main, TRACKERS };
}
