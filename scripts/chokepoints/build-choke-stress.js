#!/usr/bin/env node
/**
 * Dynamic chokepoint stress index — replaces the static CHOKE_CAPACITY constant in
 * build-corridor-ranks.js with a live signal derived from UNCTADstat US.PortCalls
 * (median time in port — congestion proxy) and US.PortCallsArrivals (port call count
 * — traffic volume proxy), for each chokepoint's littoral countries.
 *
 * Idea: CHOKE_CAPACITY is a fixed guess ("Suez=1.0, Malacca=0.95..."). Real disruptions
 * (Houthi attacks on Red Sea shipping, Panama Canal drought restrictions) should show up
 * as falling port-call counts and/or rising dwell times in the littoral countries' own
 * port statistics — this turns that into a "stress score" per chokepoint: how much
 * worse (or better) traffic looks in the most recent year vs a couple of years prior.
 *
 * Littoral country mapping is hand-maintained here (see CHOKE_LITTORAL) — sourced from
 * src/data/chokepoints.ts's `littoral` field where that chokepoint exists there, plus
 * two (Gibraltar, Cape of Good Hope) that only exist in build-corridor-ranks.js's
 * CHOKE_CAPACITY, not yet in chokepoints.ts.
 *
 * Download (CommercialMarket=00 "All ships", Year, annual — no partner dimension):
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.PortCalls
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.PortCallsArrivals
 *
 * Output:
 *   scripts/data/choke-stress.json / public/data/crink/choke-stress.json
 *
 * Usage:
 *   node scripts/chokepoints/build-choke-stress.js /path/to/US_PortCalls.csv /path/to/US_PortCallsArrivals.csv
 *   npm run corridors:chokestress -- /path/to/US_PortCalls.csv /path/to/US_PortCallsArrivals.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "choke-stress.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "choke-stress.json");

// Mirrors build-corridor-ranks.js's CHOKE_CAPACITY keys exactly.
const CHOKE_LITTORAL = {
  "choke-suez": ["EGY"],
  "choke-malacca": ["MYS", "IDN", "SGP"],
  "choke-hormuz": ["IRN", "OMN", "ARE"],
  "choke-taiwan": ["TWN", "CHN"],
  "choke-bab-el-mandeb": ["YEM", "DJI", "ERI"],
  "choke-panama": ["PAN"],
  "choke-gibraltar": ["ESP", "MAR"],
  "choke-bosporus": ["TUR"],
  "choke-good-hope": ["ZAF"],
};

const LABEL_TO_ISO3 = {
  egypt: "EGY", malaysia: "MYS", indonesia: "IDN", singapore: "SGP",
  "iran (islamic republic of)": "IRN", "iran, islamic republic of": "IRN", iran: "IRN",
  oman: "OMN", "united arab emirates": "ARE",
  "taiwan province of china": "TWN", taiwan: "TWN", china: "CHN",
  yemen: "YEM", djibouti: "DJI", eritrea: "ERI", panama: "PAN",
  spain: "ESP", morocco: "MAR", "south africa": "ZAF", turkey: "TUR", türkiye: "TUR", turkiye: "TUR",
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

const ALL_LITTORAL_ISO3 = new Set(Object.values(CHOKE_LITTORAL).flat());

/** Parses either PortCalls (median time in port) or PortCallsArrivals (number of port calls),
 * CommercialMarket="00" (All ships) only, returns iso -> year -> value. */
function parseAnnualSeries(cliPath, valueHeaderExact) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const marketIdx = findCol(headers, "commercialmarket");
  const valueIdx = findCol(headers, valueHeaderExact);
  if ([yearIdx, economyIdx, marketIdx, valueIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized headers in ${path.basename(cliPath)}: ${headers.join(",")}`);
  }
  const byIso = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    if (cols[marketIdx] !== "00") continue;
    const iso = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!iso || !ALL_LITTORAL_ISO3.has(iso)) continue;
    const val = parseNumber(cols[valueIdx]);
    if (val == null || val < 0) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byIso.has(iso)) byIso.set(iso, new Map());
    byIso.get(iso).set(year, val);
  }
  return byIso;
}

/** trend: (recent avg of last 2y) vs (earlier avg of the 2y before that). Returns pct change or null. */
function trendPct(yearMap) {
  const years = [...yearMap.keys()].sort((a, b) => a - b);
  if (years.length < 3) return null;
  const recentYears = years.slice(-2);
  const earlierYears = years.slice(-4, -2).length ? years.slice(-4, -2) : years.slice(0, Math.max(1, years.length - 2));
  const avg = (ys) => ys.reduce((s, y) => s + yearMap.get(y), 0) / ys.length;
  const recentAvg = avg(recentYears);
  const earlierAvg = avg(earlierYears);
  if (!(earlierAvg > 0)) return null;
  return { pct: ((recentAvg - earlierAvg) / earlierAvg) * 100, recentYears, earlierYears, recentAvg, earlierAvg };
}

function main() {
  const callsPath = process.argv[2]; // US_PortCalls.csv (dwell time etc.)
  const arrivalsPath = process.argv[3]; // US_PortCallsArrivals.csv (call count)
  if (!callsPath || !arrivalsPath || !fs.existsSync(callsPath) || !fs.existsSync(arrivalsPath)) {
    console.error(
      "Usage: node scripts/chokepoints/build-choke-stress.js /path/to/US_PortCalls.csv /path/to/US_PortCallsArrivals.csv",
    );
    process.exit(1);
  }

  const dwellByIso = parseAnnualSeries(callsPath, "median_time_in_port_(days)");
  const callsByIso = parseAnnualSeries(arrivalsPath, "number_of_port_calls");

  const countryStress = {};
  for (const iso of ALL_LITTORAL_ISO3) {
    const dwellTrend = dwellByIso.has(iso) ? trendPct(dwellByIso.get(iso)) : null;
    const callsTrend = callsByIso.has(iso) ? trendPct(callsByIso.get(iso)) : null;
    // stress accumulates from "bad news" only: dwell time rising, call count falling
    const dwellStress = dwellTrend ? Math.max(0, dwellTrend.pct) : 0;
    const callsStress = callsTrend ? Math.max(0, -callsTrend.pct) : 0;
    countryStress[iso] = {
      dwellTrendPct: dwellTrend ? Math.round(dwellTrend.pct * 10) / 10 : null,
      callsTrendPct: callsTrend ? Math.round(callsTrend.pct * 10) / 10 : null,
      stressRaw: dwellStress + callsStress,
    };
  }

  const chokepoints = {};
  const stressValues = [];
  for (const [chokeId, littoral] of Object.entries(CHOKE_LITTORAL)) {
    const rows = littoral.map((iso) => countryStress[iso]).filter((r) => r && (r.dwellTrendPct != null || r.callsTrendPct != null));
    const stressRaw = rows.length ? rows.reduce((s, r) => s + r.stressRaw, 0) / rows.length : null;
    if (stressRaw != null) stressValues.push(stressRaw);
    chokepoints[chokeId] = {
      littoral,
      countries: Object.fromEntries(littoral.map((iso) => [iso, countryStress[iso] || null])),
      stressRaw,
    };
  }
  const maxStress = stressValues.length ? Math.max(...stressValues, 1e-9) : 1;
  for (const row of Object.values(chokepoints)) {
    row.stressNorm = row.stressRaw != null ? Math.min(1, row.stressRaw / maxStress) : null;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.PortCalls (median time in port) + US.PortCallsArrivals (port call count), CommercialMarket=00 All ships",
    sourceFiles: [path.basename(callsPath), path.basename(arrivalsPath)],
    method:
      "Per littoral country: pct change in (avg of most recent 2 years) vs (avg of the 2 years before that), for dwell time (rising = stress) and call count (falling = stress). Averaged across each chokepoint's littoral countries, then max-normalized across chokepoints to 0-1. Caveat: UNCTAD PortCalls/PortCallsArrivals annual series currently only extends to 2023 — this reflects the most recent multi-year trend available, not live/real-time conditions.",
    chokepoints,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log("[choke-stress] " + Object.entries(chokepoints).map(([id, r]) => `${id}=${r.stressNorm != null ? r.stressNorm.toFixed(2) : "null"}`).join(" "));
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}

main();
