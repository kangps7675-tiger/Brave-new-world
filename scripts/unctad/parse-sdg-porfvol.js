#!/usr/bin/env node
/**
 * UNCTADstat US.SDG_PORFVOL (SDG 14 official "port freight volume", TEU) — a second,
 * independent TEU series alongside US.ContPortThroughput. Used two ways:
 *  1) fallback for portThroughputNorm when ContPortThroughput/PortWatch have no match
 *     for a corridor's endpoint countries.
 *  2) cross-check against ContPortThroughput for build-confidence-layer.js (E).
 *
 * Download: https://unctadstat.unctad.org/datacentre/dataviewer/US.SDG_PORFVOL
 * Output: scripts/data/sdg-porfvol.json / public/data/crink/sdg-porfvol.json
 * Usage: node scripts/unctad/parse-sdg-porfvol.js /path/to/US_SDG_PORFVOL.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "sdg-porfvol.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "sdg-porfvol.json");
const YEARS_TO_AVERAGE = 3;

const LABEL_TO_ISO3 = {
  china: "CHN", "china, people's republic of": "CHN", "hong kong": "HKG",
  russia: "RUS", "russian federation": "RUS", iran: "IRN",
  "iran (islamic republic of)": "IRN", "iran, islamic republic of": "IRN", india: "IND",
  kazakhstan: "KAZ", turkey: "TUR", türkiye: "TUR", turkiye: "TUR", azerbaijan: "AZE",
  georgia: "GEO", mongolia: "MNG", pakistan: "PAK", "saudi arabia": "SAU",
  "united arab emirates": "ARE", uae: "ARE", egypt: "EGY", netherlands: "NLD",
  "republic of korea": "KOR", "korea, republic of": "KOR", "south korea": "KOR",
  "korea, dem. people's rep. of": "PRK", "democratic people's republic of korea": "PRK",
  "north korea": "PRK", belarus: "BLR", uzbekistan: "UZB", turkmenistan: "TKM",
  kyrgyzstan: "KGZ", tajikistan: "TJK", syria: "SYR", "syrian arab republic": "SYR",
  iraq: "IRQ", lebanon: "LBN", yemen: "YEM", myanmar: "MMR", "myanmar (burma)": "MMR",
  cuba: "CUB", poland: "POL", armenia: "ARM",
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
  const out = []; let cur = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; } else { inQuotes = !inQuotes; } continue; }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function normalizeHeader(h) { return String(h || "").replace(/^﻿/, "").trim().toLowerCase().replace(/[\s./]+/g, "_"); }
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
    console.error("Usage: node scripts/unctad/parse-sdg-porfvol.js /path/to/US_SDG_PORFVOL.csv");
    process.exit(1);
  }
  const neededIso3 = neededIso3FromMeta();
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const teuIdx = headers.findIndex((h) => h.startsWith("teu"));
  if ([yearIdx, economyIdx, teuIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.SDG_PORFVOL headers: ${headers.join(",")}`);
  }
  const byIso = new Map();
  let rowsScanned = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    const iso = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!iso || !neededIso3.has(iso)) continue;
    const teu = parseNumber(cols[teuIdx]);
    if (teu == null || teu <= 0) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byIso.has(iso)) byIso.set(iso, new Map());
    byIso.get(iso).set(year, teu);
  }
  const countries = {};
  for (const [iso, yearMap] of byIso) {
    const years = [...yearMap.keys()].sort((a, b) => a - b);
    const recent = years.slice(-YEARS_TO_AVERAGE);
    const values = recent.map((y) => yearMap.get(y));
    const avgTeu = values.reduce((s, v) => s + v, 0) / values.length;
    countries[iso] = { teu: avgTeu, latestYear: recent[recent.length - 1], yearsUsed: recent };
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.SDG_PORFVOL (SDG 14 official port freight volume, TEU)",
    sourceFile: path.basename(cliPath),
    method: `Average of most recent ${YEARS_TO_AVERAGE} valid years. Independent TEU series from ContPortThroughput — used as fallback + cross-check.`,
    unit: "TEU",
    rowsScanned,
    countryCount: Object.keys(countries).length,
    withData: Object.keys(countries).length,
    countries,
  };
  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(`[sdg-porfvol] ${Object.keys(countries).length} countries with TEU data`);
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}
main();
