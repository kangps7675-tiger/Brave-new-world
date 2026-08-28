#!/usr/bin/env node
/**
 * UNCTADstat US.SeaborneTrade (by cargo type) + US.SDG_LULFRG (total loaded+unloaded
 * freight, the SDG 14 official aggregate) — country-level seaborne TONNAGE, complementary
 * to the TEU-based ContPortThroughput/SDG_PORFVOL signals.
 *
 * Why this matters for CRINK: containers (TEU) undercount bulk/tanker trade almost
 * entirely. Sanctioned oil exporters (Russia, Iran, Venezuela) move most of their
 * volume as crude oil tankers, invisible to every TEU-based signal in this pipeline.
 * CargoType=11 (Crude oil loaded) fixes that specifically for sanctions-evasion corridors.
 *
 * SeaborneTrade CargoType=30 (Freight loaded and discharged, i.e. the country total)
 * and SDG_LULFRG (the same concept as UNCTAD's official SDG indicator) SHOULD roughly
 * agree — both are written out here so build-confidence-layer.js can cross-check them.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.SeaborneTrade
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.SDG_LULFRG
 *
 * Output:
 *   scripts/data/bulk-tonnage.json / public/data/crink/bulk-tonnage.json
 *
 * Usage:
 *   node scripts/unctad/parse-bulk-tonnage.js /path/to/US_SeaborneTrade.csv /path/to/US_SDG_LULFRG.csv
 *   npm run corridors:bulktonnage -- /path/to/US_SeaborneTrade.csv /path/to/US_SDG_LULFRG.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "bulk-tonnage.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "bulk-tonnage.json");

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
  cuba: "CUB", poland: "POL", armenia: "ARM", venezuela: "VEN",
  "venezuela (bolivarian republic of)": "VEN",
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

/** avg of most recent N valid years from a Map<year, value> */
function recentAvg(yearMap, n) {
  const years = [...yearMap.keys()].sort((a, b) => a - b);
  const recent = years.slice(-n);
  if (recent.length === 0) return null;
  const values = recent.map((y) => yearMap.get(y));
  return { avg: values.reduce((s, v) => s + v, 0) / values.length, latestYear: recent[recent.length - 1], yearsUsed: recent };
}

function parseSeaborneTrade(cliPath, neededIso3) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const cargoTypeIdx = findCol(headers, "cargotype");
  const valueIdx = findCol(headers, "metric_tons_in_thousands");
  if ([yearIdx, economyIdx, cargoTypeIdx, valueIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.SeaborneTrade headers: ${headers.join(",")}`);
  }
  // iso -> cargoType -> year -> thousand tons
  const byIsoCargo = new Map();
  let rowsScanned = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    const iso = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!iso || !neededIso3.has(iso)) continue;
    const cargoType = cols[cargoTypeIdx];
    if (cargoType !== "30" && cargoType !== "11") continue; // total, and crude-oil-loaded
    const val = parseNumber(cols[valueIdx]);
    if (val == null || val < 0) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byIsoCargo.has(iso)) byIsoCargo.set(iso, new Map());
    const cargoMap = byIsoCargo.get(iso);
    if (!cargoMap.has(cargoType)) cargoMap.set(cargoType, new Map());
    cargoMap.get(cargoType).set(year, val);
  }
  const result = {};
  for (const [iso, cargoMap] of byIsoCargo) {
    const totalRecent = cargoMap.has("30") ? recentAvg(cargoMap.get("30"), YEARS_TO_AVERAGE) : null;
    const oilRecent = cargoMap.has("11") ? recentAvg(cargoMap.get("11"), YEARS_TO_AVERAGE) : null;
    result[iso] = {
      totalTonnage: totalRecent ? totalRecent.avg * 1000 : null,
      totalTonnageLatestYear: totalRecent?.latestYear ?? null,
      crudeOilLoadedTonnage: oilRecent ? oilRecent.avg * 1000 : null,
      crudeOilLoadedLatestYear: oilRecent?.latestYear ?? null,
    };
  }
  return { result, rowsScanned };
}

function parseLulfrg(cliPath, neededIso3) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const valueIdx = findCol(headers, "metric_tons_in_thousands");
  if ([yearIdx, economyIdx, valueIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.SDG_LULFRG headers: ${headers.join(",")}`);
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
    const val = parseNumber(cols[valueIdx]);
    if (val == null || val < 0) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byIso.has(iso)) byIso.set(iso, new Map());
    byIso.get(iso).set(year, val);
  }
  const result = {};
  for (const [iso, yearMap] of byIso) {
    const recent = recentAvg(yearMap, YEARS_TO_AVERAGE);
    if (!recent) continue;
    result[iso] = { totalTonnage: recent.avg * 1000, latestYear: recent.latestYear };
  }
  return { result, rowsScanned };
}

function main() {
  const seabornePath = process.argv[2];
  const lulfrgPath = process.argv[3];
  if (!seabornePath || !fs.existsSync(seabornePath)) {
    console.error(
      "Usage: node scripts/unctad/parse-bulk-tonnage.js /path/to/US_SeaborneTrade.csv [/path/to/US_SDG_LULFRG.csv]",
    );
    process.exit(1);
  }
  const neededIso3 = neededIso3FromMeta();
  const { result: seaborne, rowsScanned: sbRows } = parseSeaborneTrade(seabornePath, neededIso3);
  let lulfrg = {};
  let lulfrgRows = 0;
  if (lulfrgPath && fs.existsSync(lulfrgPath)) {
    const r = parseLulfrg(lulfrgPath, neededIso3);
    lulfrg = r.result;
    lulfrgRows = r.rowsScanned;
  }

  const allIso = new Set([...Object.keys(seaborne), ...Object.keys(lulfrg)]);
  const countries = {};
  let crossCheckAgreeSum = 0;
  let crossCheckCount = 0;
  for (const iso of allIso) {
    const sb = seaborne[iso] || {};
    const lu = lulfrg[iso] || null;
    // prefer SeaborneTrade's own "30" total; fall back to SDG_LULFRG if SeaborneTrade lacks it
    const totalTonnage = sb.totalTonnage ?? lu?.totalTonnage ?? null;
    const totalSource = sb.totalTonnage != null ? "seaborne-trade-30" : lu ? "sdg-lulfrg-fallback" : null;
    let crossCheckAgreementPct = null;
    if (sb.totalTonnage != null && lu?.totalTonnage != null) {
      const ratio = Math.min(sb.totalTonnage, lu.totalTonnage) / Math.max(sb.totalTonnage, lu.totalTonnage);
      crossCheckAgreementPct = Math.round(ratio * 1000) / 10;
      crossCheckAgreeSum += ratio;
      crossCheckCount += 1;
    }
    countries[iso] = {
      totalTonnage,
      totalSource,
      crudeOilLoadedTonnage: sb.crudeOilLoadedTonnage ?? null,
      seaborneTradeTotal: sb.totalTonnage ?? null,
      sdgLulfrgTotal: lu?.totalTonnage ?? null,
      crossCheckAgreementPct,
    };
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.SeaborneTrade (by cargo type) + US.SDG_LULFRG (SDG 14 total loaded+unloaded freight)",
    sourceFiles: [path.basename(seabornePath), lulfrgPath ? path.basename(lulfrgPath) : null].filter(Boolean),
    method: `Average of most recent ${YEARS_TO_AVERAGE} valid years. CargoType=30 (total) preferred, CargoType=11 (crude oil loaded) captured separately for sanctions-evasion corridors. SDG_LULFRG used as fallback + cross-check.`,
    unit: "metric tons",
    rowsScanned: { seaborneTrade: sbRows, sdgLulfrg: lulfrgRows },
    countryCount: Object.keys(countries).length,
    withData: Object.values(countries).filter((c) => c.totalTonnage != null).length,
    withOilData: Object.values(countries).filter((c) => c.crudeOilLoadedTonnage != null).length,
    crossCheck: {
      pairsCompared: crossCheckCount,
      avgAgreementPct: crossCheckCount ? Math.round((crossCheckAgreeSum / crossCheckCount) * 1000) / 10 : null,
    },
    countries,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[bulk-tonnage] ${Object.keys(countries).length} countries, withData=${payload.withData}, withOilData=${payload.withOilData}, crossCheck avgAgreement=${payload.crossCheck.avgAgreementPct}% (n=${crossCheckCount})`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}

main();
