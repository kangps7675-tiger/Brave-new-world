#!/usr/bin/env node
/**
 * UNCTADstat US.PLSCI (Port-Level Liner Shipping Connectivity Index) — the finest-grained
 * connectivity dataset UNCTAD publishes: one score per PORT per quarter, not per country.
 *
 * This codebase doesn't yet have a "named individual port" node registry (criticalNodes.ts's
 * maritime layer only has the 8 chokepoint straits/canals, not city ports like Rotterdam or
 * Busan) — so for now this is used two ways:
 *  1) A full per-port cache (scripts/data/plsci-ports.json), scoped to CRINK-relevant
 *     countries, ready for whenever a named-port UI node exists.
 *  2) A country-level "best port" aggregate (max of that country's ports, recent-quarter avg)
 *     folded into corridor scoring as plsciNorm — an independent, bottom-up connectivity
 *     signal alongside the top-down country-level LSCI.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.PLSCI
 *
 * Output:
 *   scripts/data/plsci-ports.json / public/data/crink/plsci-ports.json (per-port)
 *   scripts/data/plsci-country-max.json / public/data/crink/plsci-country-max.json (country aggregate)
 *
 * Usage:
 *   node scripts/unctad/parse-plsci.js /path/to/US_PLSCI.csv
 *   npm run corridors:plsci -- /path/to/US_PLSCI.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_PORTS_SCRIPTS = path.join(ROOT, "scripts", "data", "plsci-ports.json");
const OUT_PORTS_PUBLIC = path.join(ROOT, "public", "data", "crink", "plsci-ports.json");
const OUT_COUNTRY_SCRIPTS = path.join(ROOT, "scripts", "data", "plsci-country-max.json");
const OUT_COUNTRY_PUBLIC = path.join(ROOT, "public", "data", "crink", "plsci-country-max.json");

// Port Label format is "Country Name, City" — map the country-name portion to ISO3.
// Country names as UNCTAD spells them (subset relevant to CRINK corridor endpoints).
const COUNTRY_NAME_TO_ISO3 = {
  china: "CHN", "hong kong": "HKG", "hong kong, china": "HKG", "china, hong kong sar": "HKG",
  "russian federation": "RUS", "iran (islamic republic of)": "IRN", "iran, islamic republic of": "IRN",
  india: "IND", kazakhstan: "KAZ", turkey: "TUR", türkiye: "TUR", turkiye: "TUR",
  azerbaijan: "AZE", georgia: "GEO", pakistan: "PAK", "saudi arabia": "SAU",
  "united arab emirates": "ARE", egypt: "EGY", netherlands: "NLD",
  "republic of korea": "KOR", "korea, republic of": "KOR",
  "korea, dem. people's rep. of": "PRK", "democratic people's republic of korea": "PRK",
  belarus: "BLR", uzbekistan: "UZB", turkmenistan: "TKM", syria: "SYR",
  "syrian arab republic": "SYR", iraq: "IRQ", lebanon: "LBN", yemen: "YEM", myanmar: "MMR",
  cuba: "CUB", poland: "POL", malaysia: "MYS", indonesia: "IDN", singapore: "SGP",
  djibouti: "DJI", eritrea: "ERI", panama: "PAN", spain: "ESP", morocco: "MAR",
  "south africa": "ZAF", "taiwan province of china": "TWN", denmark: "DNK", sweden: "SWE",
};

function isoFromPortLabel(label) {
  const s = String(label || "");
  const comma = s.indexOf(",");
  const countryName = (comma >= 0 ? s.slice(0, comma) : s).trim().toLowerCase();
  return COUNTRY_NAME_TO_ISO3[countryName] || null;
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function normalizeHeader(h) {
  return String(h || "").replace(/^﻿/, "").trim().toLowerCase().replace(/[\s./]+/g, "_");
}
function findCol(headers, exact) { return headers.indexOf(exact); }
function parseNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}
function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
function readJsonSync(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function neededIso3FromMeta() {
  const meta = readJsonSync(META_PATH);
  const set = new Set();
  for (const c of meta.corridors || []) {
    for (const iso of c.endpointCountries || []) set.add(String(iso).toUpperCase());
    for (const iso of c.comtradePair || []) set.add(String(iso).toUpperCase());
  }
  return set;
}

function main() {
  const cliPath = process.argv[2];
  if (!cliPath || !fs.existsSync(cliPath)) {
    console.error(
      "Usage: node scripts/unctad/parse-plsci.js /path/to/US_PLSCI.csv\n" +
        "  (raw bulk file — download from https://unctadstat.unctad.org/datacentre/dataviewer/US.PLSCI, do not commit it)",
    );
    process.exit(1);
  }
  const neededIso3 = neededIso3FromMeta();
  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const quarterIdx = findCol(headers, "quarter");
  const portIdx = findCol(headers, "port");
  const portLabelIdx = findCol(headers, "port_label");
  const indexIdx = headers.findIndex((h) => h.startsWith("index_"));
  if ([quarterIdx, portIdx, portLabelIdx, indexIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.PLSCI headers: ${headers.join(",")}`);
  }

  // portCode -> { iso, label, quarters: {q: idx} }
  const ports = new Map();
  let rowsScanned = 0;
  let rowsKept = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    const label = cols[portLabelIdx];
    const iso = isoFromPortLabel(label);
    if (!iso || !neededIso3.has(iso)) continue;
    const idx = parseNumber(cols[indexIdx]);
    if (idx == null || idx < 0) continue;
    const quarter = cols[quarterIdx];
    const portCode = cols[portIdx];
    if (!quarter || !portCode) continue;
    rowsKept += 1;
    if (!ports.has(portCode)) ports.set(portCode, { iso, label, quarters: new Map() });
    ports.get(portCode).quarters.set(quarter, idx);
  }

  const RECENT_QUARTERS = 8;
  const portsOut = {};
  const byCountryBest = new Map(); // iso -> { value, portCode, label }
  for (const [portCode, row] of ports) {
    const quarters = [...row.quarters.keys()].sort();
    const recent = quarters.slice(-RECENT_QUARTERS);
    const values = recent.map((q) => row.quarters.get(q));
    const avgIndex = values.reduce((s, v) => s + v, 0) / values.length;
    const latestQuarter = recent[recent.length - 1];
    portsOut[portCode] = {
      iso: row.iso,
      label: row.label,
      index: avgIndex,
      latestQuarter,
      latestIndex: row.quarters.get(latestQuarter),
      quartersUsed: recent,
    };
    const best = byCountryBest.get(row.iso);
    if (!best || avgIndex > best.value) {
      byCountryBest.set(row.iso, { value: avgIndex, portCode, label: row.label });
    }
  }

  const countryMax = {};
  for (const [iso, best] of byCountryBest) {
    countryMax[iso] = { value: best.value, bestPort: best.label, bestPortCode: best.portCode };
  }

  const portsPayload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.PLSCI (Port-Level Liner Shipping Connectivity Index, bulk CSV)",
    sourceFile: path.basename(cliPath),
    method: `Average of most recent ${RECENT_QUARTERS} quarters per port. Scoped to CRINK corridor-relevant countries only.`,
    unit: "index (Average Q1 2023 = 100 base)",
    rowsScanned,
    rowsKept,
    portCount: Object.keys(portsOut).length,
    countryCount: byCountryBest.size,
    ports: portsOut,
  };
  const countryPayload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.PLSCI, aggregated to each country's single best-connected port",
    method: "max(port avgIndex) per country — a bottom-up connectivity signal distinct from the top-down country-level LSCI series.",
    unit: "index (Average Q1 2023 = 100 base)",
    countryCount: Object.keys(countryMax).length,
    withData: Object.keys(countryMax).length,
    countries: countryMax,
  };

  writeJson(OUT_PORTS_SCRIPTS, portsPayload);
  writeJson(OUT_PORTS_PUBLIC, portsPayload);
  writeJson(OUT_COUNTRY_SCRIPTS, countryPayload);
  writeJson(OUT_COUNTRY_PUBLIC, countryPayload);
  console.log(`[plsci] scanned ${rowsScanned} rows, kept ${rowsKept} → ${Object.keys(portsOut).length} ports in ${byCountryBest.size} countries`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PORTS_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_COUNTRY_SCRIPTS)}`);
}

main();
