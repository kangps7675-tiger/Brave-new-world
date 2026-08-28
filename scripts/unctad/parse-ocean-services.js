#!/usr/bin/env node
/**
 * UNCTADstat US.OceanServices (International trade in ocean-based services) bulk CSV
 * → country-level maritime freight-services cache for corridor scoring.
 *
 * ⚠ This is a DIFFERENT UNCTAD dataset than the one behind ocean-trade-bilateral.json
 * (US.OceanTrade — trade in ocean-based *goods*, e.g. seafood/shipbuilding/marine
 * energy, which IS bilateral with a Partner column). US.OceanServices has NO Partner
 * column — it's country totals of services trade by category (maritime freight,
 * passenger transport, port services, marine tourism, R&D). So this cannot extend
 * ocean-trade-bilateral.json directly; instead it's matched into corridors the same
 * way ContPortThroughput is (geoMean of endpoint countries), as a separate
 * oceanServicesNorm signal blended into the same "trade" bucket in scoreTrade().
 *
 * We use Category=SC12 ("Maritime transport and related services: freight") — the
 * one category among the six (SOCE total, SC11 passenger, SC12 freight, SC13 port
 * services, SDB3 tourism, SRDL marine R&D) that's actually about freight logistics.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.OceanServices
 *   → Export CSV / Download Bulk (do NOT commit the raw file — several MB)
 *
 * Output:
 *   scripts/data/ocean-services-throughput.json
 *   public/data/crink/ocean-services-throughput.json
 *
 * Usage:
 *   node scripts/unctad/parse-ocean-services.js /path/to/US_OceanServices.csv
 *   npm run corridors:oceanservices -- /path/to/US_OceanServices.csv
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "ocean-services-throughput.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "ocean-services-throughput.json");

const CATEGORY = "SC12"; // Maritime transport and related services: freight
const YEARS_TO_AVERAGE = 3;

/** Same label→ISO3 table as parse-cont-port-throughput.js / parse-lsbci.js — keep in sync. */
const LABEL_TO_ISO3 = {
  china: "CHN",
  "china, people's republic of": "CHN",
  "hong kong": "HKG",
  "hong kong sar, china": "HKG",
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

function readJsonSync(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function main() {
  const cliPath = process.argv[2];
  if (!cliPath || !fs.existsSync(cliPath)) {
    console.error(
      "Usage: node scripts/unctad/parse-ocean-services.js /path/to/US_OceanServices.csv\n" +
        "  (raw bulk file — download from https://unctadstat.unctad.org/datacentre/dataviewer/US.OceanServices, do not commit it)",
    );
    process.exit(1);
  }

  const meta = readJsonSync(META_PATH);
  const neededIso3 = new Set();
  for (const c of meta.corridors || []) {
    for (const iso of c.endpointCountries || []) neededIso3.add(String(iso).toUpperCase());
    for (const iso of c.comtradePair || []) neededIso3.add(String(iso).toUpperCase());
  }

  const text = fs.readFileSync(cliPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error(`empty CSV: ${cliPath}`);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);

  const yearIdx = findCol(headers, "year");
  const economyIdx = findCol(headers, "economy");
  const economyLabelIdx = findCol(headers, "economy_label");
  const flowIdx = findCol(headers, "flow");
  const categoryIdx = findCol(headers, "category");
  const valueIdx = findCol(headers, "us$_at_current_prices_in_millions");

  if ([yearIdx, economyIdx, categoryIdx, valueIdx, flowIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.OceanServices headers in ${path.basename(cliPath)}: ${headers.join(",")}`);
  }

  // iso -> year -> usdMillions (Exports + Imports combined)
  const byCountryYear = new Map();
  let rowsScanned = 0;
  let rowsKept = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    rowsScanned += 1;
    const cols = splitCsvLine(line);
    if (cols[categoryIdx] !== CATEGORY) continue;
    const iso = resolveIso3(cols[economyIdx], economyLabelIdx >= 0 ? cols[economyLabelIdx] : "");
    if (!iso || !neededIso3.has(iso)) continue;
    const valueMillions = parseNumber(cols[valueIdx]);
    if (valueMillions == null || valueMillions < 0) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;

    rowsKept += 1;
    if (!byCountryYear.has(iso)) byCountryYear.set(iso, new Map());
    const yMap = byCountryYear.get(iso);
    yMap.set(year, (yMap.get(year) || 0) + valueMillions); // Exports(02) + Imports(01)
  }

  const RECENT_YEARS = YEARS_TO_AVERAGE;
  const countries = {};
  let withData = 0;
  for (const [iso, yMap] of byCountryYear) {
    const years = [...yMap.keys()].sort((a, b) => a - b);
    const recent = years.slice(-RECENT_YEARS);
    const recentValues = recent.map((y) => yMap.get(y));
    const avgMillions = recentValues.length ? recentValues.reduce((s, v) => s + v, 0) / recentValues.length : null;
    if (avgMillions == null || avgMillions <= 0) continue;
    const latestYear = years[years.length - 1];
    countries[iso] = {
      valueUsd: avgMillions * 1_000_000, // millions → USD
      latestYear,
      latestValueUsd: yMap.get(latestYear) * 1_000_000,
      yearsUsed: recent,
    };
    withData += 1;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.OceanServices (International trade in ocean-based services, bulk CSV)",
    sourceFile: path.basename(cliPath),
    category: `${CATEGORY} (Maritime transport and related services: freight)`,
    method: `Exports+Imports summed per year, average of most recent ${RECENT_YEARS} valid years. Country-level totals (no Partner dimension) — matched into corridors via geoMean(endpointCountries), same approach as ContPortThroughput.`,
    unit: "USD (current prices)",
    caveat:
      "Country totals of maritime freight SERVICES trade, not corridor-specific shipping volume or goods trade. Distinct dataset from ocean-trade-bilateral.json (US.OceanTrade goods, which is bilateral).",
    rowsScanned,
    rowsKept,
    countryCount: Object.keys(countries).length,
    withData,
    countries,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[ocean-services] scanned ${rowsScanned} rows, kept ${rowsKept} → ${withData} countries with ${CATEGORY} data`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

main();
