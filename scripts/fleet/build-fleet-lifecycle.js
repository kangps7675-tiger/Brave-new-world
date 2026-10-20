#!/usr/bin/env node
/**
 * Fleet lifecycle content data — UNCTADstat US.ShipBuilding (GT delivered) +
 * US.ShipScrapping (GT demolished), by country/year. Unlike the other scripts here,
 * this is NOT restricted to CRINK corridor endpoint countries — the point is the full
 * global picture ("ships are born in China/Korea/Japan, they age, they die in
 * Bangladesh/India/Pakistan/Turkey"), a strategic-industry narrative for content
 * modules (hubBriefs.ts / BRI axis narrative), not a corridor-matched scoring signal.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.ShipBuilding
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.ShipScrapping
 *
 * Output: scripts/data/fleet-lifecycle.json / public/data/crink/fleet-lifecycle.json
 * Usage: node scripts/fleet/build-fleet-lifecycle.js /path/to/US_ShipBuilding.csv /path/to/US_ShipScrapping.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "fleet-lifecycle.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "fleet-lifecycle.json");
const YEARS_TO_AVERAGE = 3;
// UNCTADstat mixes real countries with region/income/political-bloc aggregate rows in the
// SAME Economy column (e.g. "Eastern and South-Eastern Asia", "G-77 (Group of 77)", "BRICS").
// A blocklist regex chases those forever, so this is an ALLOWLIST of real shipbuilding/
// scrapping/shipping nations instead — anything not on it is dropped.
const REAL_COUNTRY_ALLOWLIST = new Set([
  "china", "republic of korea", "japan", "philippines", "viet nam", "vietnam", "croatia",
  "romania", "italy", "germany", "poland", "turkey", "türkiye", "turkiye", "india",
  "bangladesh", "pakistan", "netherlands", "spain", "brazil", "russian federation",
  "united states", "united states of america", "taiwan province of china", "indonesia",
  "singapore", "malaysia", "thailand", "united kingdom", "france", "norway", "finland",
  "denmark", "sweden", "ukraine", "bulgaria", "greece", "cyprus", "malta", "panama",
  "liberia", "marshall islands", "bahamas", "hong kong", "china, hong kong sar",
  "iran (islamic republic of)", "egypt", "saudi arabia", "united arab emirates",
  "myanmar", "sri lanka", "belgium", "canada", "mexico", "argentina", "chile",
  "nigeria", "south africa", "australia", "new zealand",
]);

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

function parseGtSeries(cliPath) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const labelIdx = findCol(headers, "economy_label");
  const gtIdx = findCol(headers, "gross_tonnage");
  const pctIdx = findCol(headers, "percentage_of_total_all_economies");
  if ([yearIdx, labelIdx, gtIdx, pctIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized headers in ${path.basename(cliPath)}: ${headers.join(",")}`);
  }
  const byLabel = new Map(); // label -> year -> {gt, pct}
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const label = cols[labelIdx];
    if (!REAL_COUNTRY_ALLOWLIST.has(String(label).trim().toLowerCase())) continue;
    const gt = parseNumber(cols[gtIdx]);
    const pct = parseNumber(cols[pctIdx]);
    if (gt == null) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byLabel.has(label)) byLabel.set(label, new Map());
    byLabel.get(label).set(year, { gt, pct });
  }
  const result = [];
  for (const [label, yearMap] of byLabel) {
    const years = [...yearMap.keys()].sort((a, b) => a - b);
    const recent = years.slice(-YEARS_TO_AVERAGE);
    const gts = recent.map((y) => yearMap.get(y).gt);
    const pcts = recent.map((y) => yearMap.get(y).pct).filter((v) => v != null);
    const avgGt = gts.reduce((s, v) => s + v, 0) / gts.length;
    const avgPct = pcts.length ? pcts.reduce((s, v) => s + v, 0) / pcts.length : null;
    result.push({ country: label, avgGrossTonnage: avgGt, avgSharePct: avgPct, latestYear: recent[recent.length - 1] });
  }
  result.sort((a, b) => b.avgGrossTonnage - a.avgGrossTonnage);
  return result;
}

function main() {
  const buildPath = process.argv[2];
  const scrapPath = process.argv[3];
  if (!buildPath || !scrapPath || !fs.existsSync(buildPath) || !fs.existsSync(scrapPath)) {
    console.error("Usage: node scripts/fleet/build-fleet-lifecycle.js /path/to/US_ShipBuilding.csv /path/to/US_ShipScrapping.csv");
    process.exit(1);
  }
  const building = parseGtSeries(buildPath).slice(0, 15);
  const scrapping = parseGtSeries(scrapPath).slice(0, 15);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.ShipBuilding (GT delivered) + US.ShipScrapping (GT demolished)",
    method: `Top 15 countries by average GT over the most recent ${YEARS_TO_AVERAGE} valid years. Global content data — not restricted to CRINK corridor countries, not wired into corridor-ranks scoring.`,
    unit: "Gross Tonnage",
    topBuilders: building,
    topScrappers: scrapping,
  };
  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(`[fleet-lifecycle] top builder=${building[0]?.country} (${Math.round(building[0]?.avgSharePct)}%), top scrapper=${scrapping[0]?.country} (${Math.round(scrapping[0]?.avgSharePct)}%)`);
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}
main();
