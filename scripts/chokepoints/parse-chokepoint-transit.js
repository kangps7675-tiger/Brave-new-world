#!/usr/bin/env node
/**
 * IMF PortWatch "Daily Chokepoint Transit Calls and Trade Volume Estimates" → dynamic
 * chokepoint stress index. SUPERSEDES build-choke-stress.js's littoral-country-port-call
 * proxy: this is the real thing — daily AIS-derived vessel transit counts measured AT
 * the chokepoint itself (Suez Canal, Strait of Hormuz, etc.), not inferred from a
 * littoral country's national port statistics.
 *
 * Why this exists: UNCTADstat's US.PortCalls/US.PortCallsArrivals (used by
 * build-choke-stress.js) has zero rows for Egypt, Iran, Oman, UAE, Yemen, Djibouti,
 * Eritrea, Panama, or South Africa — so 5 of 9 chokepoints (Suez, Hormuz, Bab el-Mandeb,
 * Panama, Cape of Good Hope) were stuck on the static CHOKE_CAPACITY fallback. IMF
 * PortWatch's chokepoint-specific dataset doesn't have that gap — and it's a *better*
 * signal even for the 4 chokepoints that already had coverage (direct transit count at
 * the strait/canal, not a same-country-total proxy), so this replaces all 9.
 *
 * Input file: NOT the raw daily export (millions of rows, paginated, and the portal's
 * "about" page needs an Esri login for the click-through Download button). Instead this
 * takes the small SERVER-SIDE AGGREGATED export — the ArcGIS FeatureServer computes
 * avg(n_total) grouped by (portname, year) itself, so the file is ~9 chokepoints x a
 * handful of years, no pagination needed, and no login: it's a plain public REST query,
 * reachable straight from your own browser (paste the URL below, it downloads/opens as
 * CSV — Save As if it opens inline instead of downloading):
 *
 *   https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?where=portname%20IN%20%28%27Suez%20Canal%27%2C%27Panama%20Canal%27%2C%27Bosporus%20Strait%27%2C%27Bab%20el-Mandeb%20Strait%27%2C%27Malacca%20Strait%27%2C%27Strait%20of%20Hormuz%27%2C%27Cape%20of%20Good%20Hope%27%2C%27Gibraltar%20Strait%27%2C%27Taiwan%20Strait%27%29&outStatistics=%5B%7B%22statisticType%22%3A%22avg%22%2C%22onStatisticField%22%3A%22n_total%22%2C%22outStatisticFieldName%22%3A%22avg_n_total%22%7D%2C%7B%22statisticType%22%3A%22count%22%2C%22onStatisticField%22%3A%22n_total%22%2C%22outStatisticFieldName%22%3A%22cnt%22%7D%5D&groupByFieldsForStatistics=portname%2Cyear&orderByFields=portname%2Cyear&f=csv
 *
 * Expects a CSV with columns: portname, year, avg_n_total, cnt (exactly what that URL
 * returns — groupBy fields first, then the two outStatistics fields, in that order).
 *
 * Output:
 *   scripts/data/choke-stress.json (same path/shape build-corridor-ranks.js already
 *   reads via loadChokeStress() — chokepoints[chokeId].stressNorm — so no pipeline
 *   changes needed, this just replaces the content with a better-sourced version)
 *   public/data/crink/choke-stress.json
 *
 * Usage:
 *   node scripts/chokepoints/parse-chokepoint-transit.js /path/to/chokepoint-yearly.csv
 *   npm run corridors:chokepointtransit -- /path/to/chokepoint-yearly.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "choke-stress.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "choke-stress.json");

// portname (as it appears in the PortWatch chokepoints database) -> our chokeId.
// Mirrors CHOKE_CAPACITY's keys in build-corridor-ranks.js exactly (verified against
// PortWatch_chokepoints_database/FeatureServer/0: chokepoint1=Suez Canal, chokepoint2=
// Panama Canal, chokepoint3=Bosporus Strait, chokepoint4=Bab el-Mandeb Strait,
// chokepoint5=Malacca Strait, chokepoint6=Strait of Hormuz, chokepoint7=Cape of Good
// Hope, chokepoint8=Gibraltar Strait, chokepoint11=Taiwan Strait).
const PORTNAME_TO_CHOKE_ID = {
  "suez canal": "choke-suez",
  "panama canal": "choke-panama",
  "bosporus strait": "choke-bosporus",
  "bab el-mandeb strait": "choke-bab-el-mandeb",
  "bab-el-mandeb strait": "choke-bab-el-mandeb",
  "bab al-mandab strait": "choke-bab-el-mandeb",
  "malacca strait": "choke-malacca",
  "strait of hormuz": "choke-hormuz",
  "hormuz strait": "choke-hormuz",
  "cape of good hope": "choke-good-hope",
  "gibraltar strait": "choke-gibraltar",
  "strait of gibraltar": "choke-gibraltar",
  "taiwan strait": "choke-taiwan",
};

// Kept only for the payload's informational "littoral" field (matches
// build-choke-stress.js) -- not used for matching, since this dataset is
// chokepoint-level, not country-level.
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

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function normalizeHeader(h) {
  return String(h || "").replace(/^﻿/, "").trim().toLowerCase().replace(/[\s./]+/g, "_");
}
function findCol(headers, exact) {
  return headers.indexOf(exact);
}
function parseNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}
function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** recent-2y avg vs prior-2y avg of the already-yearly-averaged values, pct change. */
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
  const cliPath = process.argv[2];
  if (!cliPath || !fs.existsSync(cliPath)) {
    console.error(
      "Usage: node scripts/chokepoints/parse-chokepoint-transit.js /path/to/chokepoint-yearly.csv\n" +
        "  (see the URL in this file's header comment — paste it in a browser, it's a public,\n" +
        "  no-login ArcGIS REST query that returns a small server-aggregated CSV)",
    );
    process.exit(1);
  }

  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error(`empty CSV: ${cliPath}`);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);

  const yearIdx = findCol(headers, "year");
  const portnameIdx = findCol(headers, "portname");
  const avgIdx = findCol(headers, "avg_n_total");
  if ([yearIdx, portnameIdx, avgIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized headers in ${path.basename(cliPath)}: ${headers.join(",")} (expected portname, year, avg_n_total, cnt)`);
  }

  // chokeId -> year -> avg_n_total (already averaged server-side, one row per chokepoint x year)
  const byChoke = new Map();
  let rowsScanned = 0;
  let rowsKept = 0;
  const unmatchedPortnames = new Set();

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    const portname = String(cols[portnameIdx] || "").trim();
    const chokeId = PORTNAME_TO_CHOKE_ID[portname.toLowerCase()];
    if (!chokeId) {
      if (portname) unmatchedPortnames.add(portname);
      continue;
    }
    const year = Number(cols[yearIdx]);
    const avgTotal = parseNumber(cols[avgIdx]);
    if (!Number.isFinite(year) || avgTotal == null || avgTotal < 0) continue;

    rowsKept += 1;
    if (!byChoke.has(chokeId)) byChoke.set(chokeId, new Map());
    byChoke.get(chokeId).set(year, avgTotal);
  }

  const chokepoints = {};
  const stressValues = [];
  for (const chokeId of Object.keys(CHOKE_LITTORAL)) {
    const yearMap = byChoke.get(chokeId);
    const trend = yearMap ? trendPct(yearMap) : null;
    // stress = falling transit volume only (rerouting/disruption). Rising traffic = 0 stress.
    const stressRaw = trend ? Math.max(0, -trend.pct) : null;
    if (stressRaw != null) stressValues.push(stressRaw);
    chokepoints[chokeId] = {
      littoral: CHOKE_LITTORAL[chokeId],
      transitTrendPct: trend ? Math.round(trend.pct * 10) / 10 : null,
      recentAvgDailyTransits: trend ? Math.round(trend.recentAvg * 10) / 10 : null,
      earlierAvgDailyTransits: trend ? Math.round(trend.earlierAvg * 10) / 10 : null,
      recentYears: trend ? trend.recentYears : null,
      earlierYears: trend ? trend.earlierYears : null,
      yearsOfData: yearMap ? yearMap.size : 0,
      stressRaw,
    };
  }
  const maxStress = stressValues.length ? Math.max(...stressValues, 1e-9) : 1;
  for (const row of Object.values(chokepoints)) {
    row.stressNorm = row.stressRaw != null ? Math.min(1, row.stressRaw / maxStress) : null;
  }

  const matchedCount = Object.values(chokepoints).filter((r) => r.stressNorm != null).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    source:
      "IMF PortWatch Daily Chokepoint Transit Calls and Trade Volume Estimates (AIS-derived daily vessel transit counts measured at each chokepoint itself), server-side aggregated to yearly avg(n_total) per chokepoint via ArcGIS FeatureServer outStatistics/groupBy",
    sourceFile: path.basename(cliPath),
    method:
      "Per chokepoint: pct change in (avg of yearly avg_n_total, most recent 2 years) vs (avg of yearly avg_n_total, the 2 years before that). Stress = max(0, -pctChange) — only a drop in transit volume counts as stress (rerouting/disruption); rising traffic scores 0. Max-normalized across the 9 chokepoints to 0-1. Supersedes the littoral-country UNCTAD PortCalls proxy (build-choke-stress.js) for all 9 chokepoints, not just the 5 that proxy couldn't reach.",
    rowsScanned,
    rowsKept,
    matchedCount,
    totalChokepoints: Object.keys(CHOKE_LITTORAL).length,
    unmatchedPortnames: [...unmatchedPortnames].sort(),
    chokepoints,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    "[chokepoint-transit] " +
      Object.entries(chokepoints)
        .map(([id, r]) => `${id}=${r.stressNorm != null ? r.stressNorm.toFixed(2) : "null"}`)
        .join(" "),
  );
  console.log(`  ${matchedCount}/${Object.keys(CHOKE_LITTORAL).length} chokepoints matched, ${rowsKept}/${rowsScanned} rows kept`);
  if (unmatchedPortnames.size) {
    console.log(`  unmatched portnames seen (not one of our 9): ${[...unmatchedPortnames].join(", ")}`);
  }
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

main();
