#!/usr/bin/env node
/**
 * UNCTADstat US.LSCI (Liner Shipping Connectivity Index) — country-level, quarterly +
 * monthly. Unlike LSBCI (bilateral pair), this is each country's OVERALL connectivity
 * to the global liner shipping network — used two ways here:
 *
 *  1) Fallback for corridors that have no LSBCI bilateral match: geoMean(endpointCountries)
 *     of their LSCI, same convention as ContPortThroughput/oceanServices fallback chains.
 *  2) Monthly series → month-over-month drop detection, flagged as connectivity-anomaly
 *     candidates (e.g. a country's connectivity craters after sanctions/blockade) for a
 *     human to review before promoting into frictionEpisodes.ts/majorEventTimeline.ts.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.LSCI  (quarterly)
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.LSCI_M (monthly)
 *
 * Output:
 *   scripts/data/lsci-country.json / public/data/crink/lsci-country.json
 *   scripts/data/lsci-anomalies.json / public/data/crink/lsci-anomalies.json (if monthly file given)
 *
 * Usage:
 *   node scripts/unctad/parse-lsci.js /path/to/US_LSCI.csv [/path/to/US_LSCI_M.csv]
 *   npm run corridors:lsci -- /path/to/US_LSCI.csv /path/to/US_LSCI_M.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_COUNTRY_SCRIPTS = path.join(ROOT, "scripts", "data", "lsci-country.json");
const OUT_COUNTRY_PUBLIC = path.join(ROOT, "public", "data", "crink", "lsci-country.json");
const OUT_ANOM_SCRIPTS = path.join(ROOT, "scripts", "data", "lsci-anomalies.json");
const OUT_ANOM_PUBLIC = path.join(ROOT, "public", "data", "crink", "lsci-anomalies.json");

const LABEL_TO_ISO3 = {
  china: "CHN", "china, people's republic of": "CHN", "hong kong": "HKG",
  "hong kong sar, china": "HKG", "hong kong, china": "HKG", russia: "RUS",
  "russian federation": "RUS", iran: "IRN", "iran (islamic republic of)": "IRN",
  "iran, islamic republic of": "IRN", india: "IND", kazakhstan: "KAZ", turkey: "TUR",
  türkiye: "TUR", turkiye: "TUR", azerbaijan: "AZE", georgia: "GEO", mongolia: "MNG",
  pakistan: "PAK", "saudi arabia": "SAU", "united arab emirates": "ARE", uae: "ARE",
  egypt: "EGY", netherlands: "NLD", "republic of korea": "KOR", "korea, republic of": "KOR",
  "south korea": "KOR", "korea, dem. people's rep. of": "PRK",
  "democratic people's republic of korea": "PRK", "north korea": "PRK", belarus: "BLR",
  uzbekistan: "UZB", turkmenistan: "TKM", kyrgyzstan: "KGZ", tajikistan: "TJK", syria: "SYR",
  "syrian arab republic": "SYR", iraq: "IRQ", lebanon: "LBN", yemen: "YEM", myanmar: "MMR",
  "myanmar (burma)": "MMR", cuba: "CUB", poland: "POL", armenia: "ARM",
  malaysia: "MYS", indonesia: "IDN", singapore: "SGP", djibouti: "DJI", eritrea: "ERI",
  panama: "PAN", spain: "ESP", morocco: "MAR", "south africa": "ZAF", "taiwan province of china": "TWN",
  taiwan: "TWN", denmark: "DNK", sweden: "SWE",
};

function resolveIso3(economyCode, economyLabel) {
  const code = String(economyCode || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(code) && code !== "WLD" && code !== "ALL") return code;
  const label = String(economyLabel || "").trim().toLowerCase();
  if (!label) return null;
  if (LABEL_TO_ISO3[label]) return LABEL_TO_ISO3[label];
  for (const [k, iso] of Object.entries(LABEL_TO_ISO3)) {
    if (label === k || label.startsWith(`${k} `) || label.startsWith(`${k},`)) return iso;
  }
  return null;
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

function parseQuarterly(cliPath, neededIso3) {
  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const quarterIdx = findCol(headers, "quarter");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const indexIdx = headers.findIndex((h) => h.startsWith("index_"));
  if ([quarterIdx, economyIdx, indexIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.LSCI headers: ${headers.join(",")}`);
  }
  const byCountryQuarter = new Map();
  let rowsScanned = 0;
  let rowsKept = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    const iso = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!iso || !neededIso3.has(iso)) continue;
    const idx = parseNumber(cols[indexIdx]);
    if (idx == null || idx < 0) continue;
    const quarter = cols[quarterIdx];
    if (!quarter) continue;
    rowsKept += 1;
    if (!byCountryQuarter.has(iso)) byCountryQuarter.set(iso, new Map());
    byCountryQuarter.get(iso).set(quarter, idx);
  }
  const RECENT_QUARTERS = 8;
  const countries = {};
  for (const [iso, qMap] of byCountryQuarter) {
    const quarters = [...qMap.keys()].sort();
    const recent = quarters.slice(-RECENT_QUARTERS);
    const values = recent.map((q) => qMap.get(q));
    const avgIndex = values.reduce((s, v) => s + v, 0) / values.length;
    const latestQuarter = recent[recent.length - 1];
    countries[iso] = {
      index: avgIndex,
      latestQuarter,
      latestIndex: qMap.get(latestQuarter),
      quartersUsed: recent,
    };
  }
  return { countries, rowsScanned, rowsKept };
}

function parseMonthlyAnomalies(cliPath, neededIso3) {
  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const monthIdx = findCol(headers, "month");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const indexIdx = headers.findIndex((h) => h.startsWith("index_"));
  if ([monthIdx, economyIdx, indexIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.LSCI_M headers: ${headers.join(",")}`);
  }
  const byCountryMonth = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const iso = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!iso || !neededIso3.has(iso)) continue;
    const idx = parseNumber(cols[indexIdx]);
    if (idx == null || idx < 0) continue;
    const month = cols[monthIdx];
    if (!month) continue;
    if (!byCountryMonth.has(iso)) byCountryMonth.set(iso, new Map());
    byCountryMonth.get(iso).set(month, idx);
  }
  const DROP_THRESHOLD_PCT = -12; // flag month-over-month drops steeper than this
  const anomalies = [];
  for (const [iso, mMap] of byCountryMonth) {
    const months = [...mMap.keys()].sort();
    for (let i = 1; i < months.length; i += 1) {
      const prev = mMap.get(months[i - 1]);
      const cur = mMap.get(months[i]);
      if (!(prev > 0)) continue;
      const pctChange = ((cur - prev) / prev) * 100;
      if (pctChange <= DROP_THRESHOLD_PCT) {
        anomalies.push({ iso, month: months[i], prevMonth: months[i - 1], prevIndex: prev, index: cur, pctChange: Math.round(pctChange * 10) / 10 });
      }
    }
  }
  anomalies.sort((a, b) => a.pctChange - b.pctChange);
  return anomalies;
}

function main() {
  const quarterlyPath = process.argv[2];
  const monthlyPath = process.argv[3];
  if (!quarterlyPath || !fs.existsSync(quarterlyPath)) {
    console.error(
      "Usage: node scripts/unctad/parse-lsci.js /path/to/US_LSCI.csv [/path/to/US_LSCI_M.csv]\n" +
        "  (raw bulk files — download from https://unctadstat.unctad.org/datacentre/dataviewer/US.LSCI[_M], do not commit them)",
    );
    process.exit(1);
  }
  const neededIso3 = neededIso3FromMeta();
  const { countries, rowsScanned, rowsKept } = parseQuarterly(quarterlyPath, neededIso3);

  const countryPayload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.LSCI (Liner Shipping Connectivity Index, bulk CSV)",
    sourceFile: path.basename(quarterlyPath),
    method: "Average of most recent 8 quarters. Country-level (not bilateral) — used as geoMean(endpointCountries) fallback when LSBCI has no bilateral match for a corridor.",
    unit: "index (Average Q1 2023 = 100 base)",
    rowsScanned,
    rowsKept,
    countryCount: Object.keys(countries).length,
    withData: Object.keys(countries).length,
    countries,
  };
  writeJson(OUT_COUNTRY_SCRIPTS, countryPayload);
  writeJson(OUT_COUNTRY_PUBLIC, countryPayload);
  console.log(`[lsci] quarterly: scanned ${rowsScanned} rows → ${Object.keys(countries).length} countries`);
  console.log(`  wrote ${path.relative(ROOT, OUT_COUNTRY_SCRIPTS)}`);

  if (monthlyPath && fs.existsSync(monthlyPath)) {
    const anomalies = parseMonthlyAnomalies(monthlyPath, neededIso3);
    const anomPayload = {
      generatedAt: new Date().toISOString(),
      source: "UNCTADstat US.LSCI_M (Liner Shipping Connectivity Index, monthly)",
      sourceFile: path.basename(monthlyPath),
      method: "Month-over-month % change, flagged when drop <= -12%. Candidates for human review before promoting to frictionEpisodes.ts/majorEventTimeline.ts — not auto-published.",
      dropThresholdPct: -12,
      count: anomalies.length,
      anomalies,
    };
    writeJson(OUT_ANOM_SCRIPTS, anomPayload);
    writeJson(OUT_ANOM_PUBLIC, anomPayload);
    console.log(`[lsci] monthly: ${anomalies.length} anomaly candidates (drop <= -12% MoM)`);
    console.log(`  wrote ${path.relative(ROOT, OUT_ANOM_SCRIPTS)}`);
  } else {
    console.log("[lsci] no monthly file given — skipping anomaly detection");
  }
}

main();
