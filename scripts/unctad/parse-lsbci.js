#!/usr/bin/env node
/**
 * UNCTADstat US.LSBCI (Liner Shipping Bilateral Connectivity Index) bulk CSV → corridor-pair cache.
 *
 * LSBCI is the one UNCTAD maritime dataset that is *already bilateral* — a real
 * country-pair connectivity score (transhipment count, direct/1-transhipment
 * services, carrier competition, vessel size on the weakest leg), not a country
 * total we have to fake into a pair via geoMean like ContPortThroughput. See
 * https://unctad.org/news/bilateral-maritime-connectivity-2006-primer-using-new-liner-shipping-bilateral-connectivity
 *
 * The raw bulk export is huge (~40MB, ~690k rows — every economy×partner×quarter
 * since 2006) and is NOT meant to live in this repo. Point this script at wherever
 * you downloaded it; only the ~35 corridor pairs we actually need get written out.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.LSBCI
 *   → Export CSV / Download Bulk (do NOT commit the raw file — it's tens of MB)
 *
 * Output:
 *   scripts/data/lsbci-bilateral.json
 *   public/data/crink/lsbci-bilateral.json
 *
 * Usage:
 *   node scripts/unctad/parse-lsbci.js /path/to/US_LSBCI.csv
 *   npm run corridors:lsbci -- /path/to/US_LSBCI.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "lsbci-bilateral.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "lsbci-bilateral.json");

/** Same label→ISO3 table as parse-cont-port-throughput.js — keep in sync if that one gains entries. */
const LABEL_TO_ISO3 = {
  china: "CHN",
  "china, people's republic of": "CHN",
  "hong kong": "HKG",
  "hong kong, china": "HKG",
  russia: "RUS",
  "russian federation": "RUS",
  iran: "IRN",
  "iran (islamic republic of)": "IRN",
  "iran, islamic republic of": "IRN",
  india: "IND",
  kazakhstan: "KAZ",
  turkey: "TUR",
  türkiye: "TUR",
  turkiye: "TUR",
  azerbaijan: "AZE",
  georgia: "GEO",
  mongolia: "MNG",
  pakistan: "PAK",
  "saudi arabia": "SAU",
  "united arab emirates": "ARE",
  uae: "ARE",
  egypt: "EGY",
  netherlands: "NLD",
  "republic of korea": "KOR",
  "korea, republic of": "KOR",
  "south korea": "KOR",
  "korea, dem. people's rep. of": "PRK",
  "democratic people's republic of korea": "PRK",
  "north korea": "PRK",
  belarus: "BLR",
  uzbekistan: "UZB",
  turkmenistan: "TKM",
  kyrgyzstan: "KGZ",
  tajikistan: "TJK",
  syria: "SYR",
  "syrian arab republic": "SYR",
  iraq: "IRQ",
  lebanon: "LBN",
  yemen: "YEM",
  myanmar: "MMR",
  "myanmar (burma)": "MMR",
  cuba: "CUB",
  poland: "POL",
  armenia: "ARM",
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

function pairKey(a, b) {
  const [x, y] = [String(a).toUpperCase(), String(b).toUpperCase()].sort();
  return `${x}|${y}`;
}

/** Minimal CSV split — handles quoted fields with commas (same as parse-cont-port-throughput.js). */
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

function findCol(headers, predicates) {
  for (let i = 0; i < headers.length; i += 1) {
    if (predicates.some((fn) => fn(headers[i]))) return i;
  }
  return -1;
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

function main() {
  const cliPath = process.argv[2];
  if (!cliPath || !fs.existsSync(cliPath)) {
    console.error(
      "Usage: node scripts/unctad/parse-lsbci.js /path/to/US_LSBCI.csv\n" +
        "  (raw bulk file — download from https://unctadstat.unctad.org/datacentre/dataviewer/US.LSBCI, do not commit it)",
    );
    process.exit(1);
  }

  const meta = readJsonSync(META_PATH);
  const neededPairs = new Set();
  const neededIso3 = new Set();
  for (const c of meta.corridors || []) {
    const pair = Array.isArray(c.comtradePair) ? c.comtradePair : [];
    if (pair.length >= 2) {
      neededPairs.add(pairKey(pair[0], pair[1]));
      neededIso3.add(String(pair[0]).toUpperCase());
      neededIso3.add(String(pair[1]).toUpperCase());
    }
  }

  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error(`empty CSV: ${cliPath}`);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);

  const quarterIdx = findCol(headers, [(h) => h === "quarter"]);
  const economyIdx = findCol(headers, [(h) => h === "economy"]);
  const economyLabelIdx = findCol(headers, [(h) => h === "economy_label"]);
  const partnerIdx = findCol(headers, [(h) => h === "partner"]);
  const partnerLabelIdx = findCol(headers, [(h) => h === "partner_label"]);
  const indexIdx = findCol(headers, [(h) => h === "index"]);

  if ([quarterIdx, economyIdx, partnerIdx, indexIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.LSBCI headers in ${path.basename(cliPath)}: ${headers.join(",")}`);
  }

  // pairKey -> quarter -> { sum, n } (average the two directions A->B / B->A per quarter)
  const byPairQuarter = new Map();
  let rowsScanned = 0;
  let rowsKept = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    const isoA = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!isoA || !neededIso3.has(isoA)) continue;
    const isoB = resolveIso3(cols[partnerIdx], partnerLabelIdx >= 0 ? cols[partnerLabelIdx] : "");
    if (!isoB || !neededIso3.has(isoB) || isoA === isoB) continue;
    const key = pairKey(isoA, isoB);
    if (!neededPairs.has(key)) continue;
    const idx = parseNumber(cols[indexIdx]);
    if (idx == null || idx < 0) continue;
    const quarter = cols[quarterIdx];
    if (!quarter) continue;

    rowsKept += 1;
    if (!byPairQuarter.has(key)) byPairQuarter.set(key, new Map());
    const qMap = byPairQuarter.get(key);
    const cur = qMap.get(quarter) || { sum: 0, n: 0 };
    cur.sum += idx;
    cur.n += 1;
    qMap.set(quarter, cur);
  }

  const RECENT_QUARTERS = 8; // ~2 years, mirrors the ±2y windows used elsewhere in this pipeline
  const pairs = {};
  let withData = 0;
  for (const key of neededPairs) {
    const qMap = byPairQuarter.get(key);
    if (!qMap || qMap.size === 0) continue;
    const quarters = [...qMap.keys()].sort(); // "2026Q02" etc. sorts chronologically as a string
    const recent = quarters.slice(-RECENT_QUARTERS);
    const perQuarter = recent.map((q) => {
      const { sum, n } = qMap.get(q);
      return { quarter: q, value: sum / n };
    });
    const avgIndex = perQuarter.reduce((s, r) => s + r.value, 0) / perQuarter.length;
    const latest = perQuarter[perQuarter.length - 1];
    const [isoA, isoB] = key.split("|");
    pairs[key] = {
      isoA,
      isoB,
      index: avgIndex,
      latestQuarter: latest.quarter,
      latestIndex: latest.value,
      quartersUsed: perQuarter.map((r) => r.quarter),
    };
    withData += 1;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.LSBCI (Liner Shipping Bilateral Connectivity Index, bulk CSV)",
    sourceFile: path.basename(cliPath),
    method: `Average of the most recent ${RECENT_QUARTERS} quarters (both A→B and B→A directions averaged per quarter). Genuinely bilateral — unlike ContPortThroughput's country-total geoMean proxy.`,
    unit: "index (0-1 scale, share of maximum bilateral liner connectivity, UNCTAD methodology)",
    rowsScanned,
    rowsKept,
    pairCount: neededPairs.size,
    withData,
    pairs,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[lsbci] scanned ${rowsScanned} rows, kept ${rowsKept} → ${withData}/${neededPairs.size} corridor pairs matched`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

function readJsonSync(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

main();
