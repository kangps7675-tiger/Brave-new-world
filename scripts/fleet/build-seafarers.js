#!/usr/bin/env node
/**
 * UNCTADstat US.Seafarers — global seafarer supply by nationality (Officers/Ratings).
 * Content data (top suppliers), plus a Russia+Ukraine combined-share callout — both
 * countries are historically top-10 seafarer suppliers, so the war is a labor-supply
 * risk story worth surfacing even though it has no direct corridor/route link.
 *
 * Download: https://unctadstat.unctad.org/datacentre/dataviewer/US.Seafarers
 * Output: scripts/data/seafarers.json / public/data/crink/seafarers.json
 * Usage: node scripts/fleet/build-seafarers.js /path/to/US_Seafarers.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "seafarers.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "seafarers.json");

const REAL_COUNTRY_ALLOWLIST = new Set([
  "philippines", "china", "india", "indonesia", "russian federation", "ukraine",
  "united states", "united states of america", "greece", "japan", "united kingdom",
  "poland", "croatia", "myanmar", "romania", "bulgaria", "turkey", "türkiye", "turkiye",
  "italy", "germany", "vietnam", "viet nam", "sri lanka", "norway", "denmark",
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

function main() {
  const cliPath = process.argv[2];
  if (!cliPath || !fs.existsSync(cliPath)) {
    console.error("Usage: node scripts/fleet/build-seafarers.js /path/to/US_Seafarers.csv");
    process.exit(1);
  }
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const labelIdx = findCol(headers, "economy_label");
  const typeIdx = findCol(headers, "seafarertype");
  const typeLabelIdx = findCol(headers, "seafarertype_label");
  const valueIdx = findCol(headers, "absolute_value");
  const pctIdx = findCol(headers, "percentage_of_total_world");
  if ([yearIdx, labelIdx, typeIdx, valueIdx, pctIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.Seafarers headers: ${headers.join(",")}`);
  }
  let latestYear = 0;
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const year = Number(cols[yearIdx]);
    if (Number.isFinite(year) && year > latestYear) latestYear = year;
    rows.push(cols);
  }
  // typeIdx "0" or similar = Total (officers+ratings combined) — check for it, else sum 1+2
  const byCountryTotal = new Map();
  for (const cols of rows) {
    if (Number(cols[yearIdx]) !== latestYear) continue;
    const label = String(cols[labelIdx]).trim().toLowerCase();
    if (!REAL_COUNTRY_ALLOWLIST.has(label)) continue;
    if (cols[typeIdx] !== "1" && cols[typeIdx] !== "2") continue; // 1=Officers, 2=Ratings
    const val = parseNumber(cols[valueIdx]);
    if (val == null) continue;
    byCountryTotal.set(cols[labelIdx], (byCountryTotal.get(cols[labelIdx]) || 0) + val);
  }
  const topSuppliers = [...byCountryTotal.entries()]
    .map(([country, total]) => ({ country, seafarers: total }))
    .sort((a, b) => b.seafarers - a.seafarers);
  const worldTotalRow = rows.find((cols) => Number(cols[yearIdx]) === latestYear && String(cols[labelIdx]).trim().toLowerCase() === "world" && (cols[typeIdx] === "1" || cols[typeIdx] === "2"));
  const worldTotal = topSuppliers.reduce((s, r) => s + r.seafarers, 0); // approx, allowlist-only sum won't equal true world total

  const rus = byCountryTotal.get("Russian Federation") || 0;
  const ukr = byCountryTotal.get("Ukraine") || 0;

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.Seafarers (Officers + Ratings, by nationality)",
    dataYear: latestYear,
    method: "Officers+Ratings summed, most recent year, allowlisted major supplier countries only.",
    caveat: "No corridor/route link — global labor-supply context only, not wired into corridor-ranks scoring.",
    topSuppliers: topSuppliers.slice(0, 15),
    russiaUkraineCombined: {
      russiaSeafarers: rus,
      ukraineSeafarers: ukr,
      combined: rus + ukr,
      note: "Russia and Ukraine were historically both top-10 global seafarer suppliers pre-2022 — the war is a labor-supply risk to global shipping crewing, independent of any single corridor.",
    },
  };
  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(`[seafarers] top=${topSuppliers[0]?.country} (${topSuppliers[0]?.seafarers}), RUS+UKR combined=${rus + ukr}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}
main();
