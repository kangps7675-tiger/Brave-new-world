#!/usr/bin/env node
/**
 * Shadow fleet composite index — combines UNCTADstat US.FleetBeneficialOwners (flag ×
 * beneficial-owner DWT matrix, genuinely bilateral), US.MerchantFleet (avg vessel age
 * by flag), and US.VesselValueByOwnership/US.VesselValueByRegistration (% of global
 * fleet value) into one country-level "how much of this country's real shipping
 * capacity hides behind foreign flags" scorecard.
 *
 * Core metric: foreignFlagSharePct = (DWT beneficially owned by country X but flagged
 * elsewhere) / (total DWT owned by X, any flag). For most flag states this is near 0%
 * (they fly their own flag). For sanctioned owners it's often near 100% — e.g. Russia's
 * beneficially-owned tonnage in UNCTAD's 2024 data is flagged almost entirely under
 * Liberia/Panama/Malta/Iran, essentially none under Russia's own flag.
 *
 * NOT a corridor-bilateral signal — this is a per-country scorecard, matched into
 * corridors via max(endpointCountries), applied only to sanctions-evasion /
 * military-logistics category corridors (see build-corridor-ranks.js).
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.FleetBeneficialOwners
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.MerchantFleet
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.VesselValueByOwnership
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.VesselValueByRegistration
 *
 * Output:
 *   scripts/data/shadow-fleet-index.json / public/data/crink/shadow-fleet-index.json
 *
 * Usage:
 *   node scripts/fleet/build-shadow-fleet-index.js <FleetBeneficialOwners.csv> <MerchantFleet.csv> <VesselValueByOwnership.csv> <VesselValueByRegistration.csv>
 *   npm run corridors:shadowfleet -- <4 file paths>
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "shadow-fleet-index.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "shadow-fleet-index.json");

const LABEL_TO_ISO3 = {
  china: "CHN", "china, people's republic of": "CHN", "china, hong kong sar": "HKG", "hong kong": "HKG",
  "russian federation": "RUS", russia: "RUS",
  "iran (islamic republic of)": "IRN", "iran, islamic republic of": "IRN", iran: "IRN",
  india: "IND", kazakhstan: "KAZ", turkey: "TUR", türkiye: "TUR", turkiye: "TUR",
  azerbaijan: "AZE", georgia: "GEO", mongolia: "MNG", pakistan: "PAK", "saudi arabia": "SAU",
  "united arab emirates": "ARE", egypt: "EGY", netherlands: "NLD",
  "republic of korea": "KOR", "korea, dem. people's rep. of": "PRK",
  "democratic people's republic of korea": "PRK", belarus: "BLR", uzbekistan: "UZB",
  turkmenistan: "TKM", kyrgyzstan: "KGZ", tajikistan: "TJK", syria: "SYR",
  "syrian arab republic": "SYR", iraq: "IRQ", lebanon: "LBN", yemen: "YEM", myanmar: "MMR",
  cuba: "CUB", poland: "POL", armenia: "ARM", panama: "PAN", liberia: "LBR",
  "marshall islands": "MHL", malta: "MLT", "hong kong sar, china": "HKG",
};

// Aggregate/region rows to exclude — anything whose label looks like a grouping, not a country.
const AGGREGATE_LABEL_RE = /^(world|developing|developed|least developed|landlocked|small island|africa|asia|europe|america|oceania|structurally weak|open registr)/i;
// FleetBeneficialOwners mixes real flag-country rows with subtotal pseudo-flag rows
// (e.g. "Total all flags" / "National flag" / "Foreign flag") in the SAME column —
// summing those in would massively double-count. Exclude them from the flag side.
const PSEUDO_FLAG_LABELS = new Set(["total all flags", "national flag", "foreign flag"]);

function resolveIso3(label) {
  const l = String(label || "").trim().toLowerCase();
  if (!l) return null;
  if (LABEL_TO_ISO3[l]) return LABEL_TO_ISO3[l];
  for (const [k, iso] of Object.entries(LABEL_TO_ISO3)) {
    if (l === k || l.startsWith(`${k} `) || l.startsWith(`${k},`)) return iso;
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

function parseFleetBeneficialOwners(cliPath, neededIso3) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const flagCodeIdx = findCol(headers, "flagofregistration");
  const flagLabelIdx = findCol(headers, "flagofregistration_label");
  const ownerCodeIdx = findCol(headers, "beneficialownership");
  const ownerLabelIdx = findCol(headers, "beneficialownership_label");
  const dwtIdx = findCol(headers, "dead_weight_tons_in_thousands");
  if ([yearIdx, flagCodeIdx, flagLabelIdx, ownerCodeIdx, ownerLabelIdx, dwtIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.FleetBeneficialOwners headers: ${headers.join(",")}`);
  }
  // owner ISO3 -> { totalOwnedDwt, selfFlagDwt, byFlagLabel: {label: dwt} }, latest year only
  let latestYear = 0;
  const rowsByYear = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const year = Number(cols[yearIdx]);
    if (Number.isFinite(year) && year > latestYear) latestYear = year;
    rowsByYear.push(cols);
  }
  const owners = new Map();
  for (const cols of rowsByYear) {
    if (Number(cols[yearIdx]) !== latestYear) continue;
    const ownerLabel = cols[ownerLabelIdx];
    const flagLabel = cols[flagLabelIdx];
    if (AGGREGATE_LABEL_RE.test(ownerLabel) || AGGREGATE_LABEL_RE.test(flagLabel)) continue;
    if (PSEUDO_FLAG_LABELS.has(String(flagLabel).trim().toLowerCase())) continue;
    const ownerIso = resolveIso3(ownerLabel);
    if (!ownerIso || !neededIso3.has(ownerIso)) continue;
    const dwt = parseNumber(cols[dwtIdx]);
    if (dwt == null || dwt <= 0) continue;
    if (!owners.has(ownerIso)) owners.set(ownerIso, { totalOwnedDwt: 0, selfFlagDwt: 0, byFlag: {} });
    const row = owners.get(ownerIso);
    row.totalOwnedDwt += dwt;
    row.byFlag[flagLabel] = (row.byFlag[flagLabel] || 0) + dwt;
    if (cols[flagCodeIdx] === cols[ownerCodeIdx]) row.selfFlagDwt += dwt;
  }
  const result = {};
  for (const [iso, row] of owners) {
    const topFlags = Object.entries(row.byFlag).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, dwt]) => ({ flag: label, dwtThousands: Math.round(dwt * 10) / 10 }));
    const foreignFlagDwt = row.totalOwnedDwt - row.selfFlagDwt;
    result[iso] = {
      totalOwnedDwtThousands: Math.round(row.totalOwnedDwt * 10) / 10,
      selfFlagDwtThousands: Math.round(row.selfFlagDwt * 10) / 10,
      foreignFlagSharePct: row.totalOwnedDwt > 0 ? Math.round((foreignFlagDwt / row.totalOwnedDwt) * 1000) / 10 : null,
      topFlags,
    };
  }
  return { result, latestYear };
}

function parseMerchantFleetAge(cliPath, neededIso3) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const economyLabelIdx = findCol(headers, "economy_label");
  const shipTypeIdx = findCol(headers, "shiptype");
  const ageIdx = findCol(headers, "average_age_of_vessels_(years)");
  if ([yearIdx, economyLabelIdx, shipTypeIdx, ageIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized US.MerchantFleet headers: ${headers.join(",")}`);
  }
  const byIso = new Map(); // iso -> year -> age
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    if (cols[shipTypeIdx] !== "0") continue; // Total fleet
    const iso = resolveIso3(cols[economyLabelIdx]);
    if (!iso || !neededIso3.has(iso)) continue;
    const age = parseNumber(cols[ageIdx]);
    if (age == null || age <= 0) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byIso.has(iso)) byIso.set(iso, new Map());
    byIso.get(iso).set(year, age);
  }
  const result = {};
  for (const [iso, yearMap] of byIso) {
    const years = [...yearMap.keys()].sort((a, b) => a - b);
    const latest = years[years.length - 1];
    result[iso] = { avgAgeAsFlagYears: yearMap.get(latest), latestYear: latest };
  }
  return result;
}

function parseVesselValueShare(cliPath, entityCol, neededIso3) {
  const lines = fs.readFileSync(cliPath, "utf8").split(/\r?\n/);
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const yearIdx = findCol(headers, "year");
  const labelIdx = findCol(headers, `${entityCol}_label`);
  const pctIdx = findCol(headers, "percentage_of_global_fleet_value");
  if ([yearIdx, labelIdx, pctIdx].some((i) => i < 0)) {
    throw new Error(`Unrecognized headers in ${path.basename(cliPath)}: ${headers.join(",")}`);
  }
  const byIso = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const label = cols[labelIdx];
    if (AGGREGATE_LABEL_RE.test(label)) continue;
    const iso = resolveIso3(label);
    if (!iso || !neededIso3.has(iso)) continue;
    const pct = parseNumber(cols[pctIdx]);
    if (pct == null) continue;
    const year = Number(cols[yearIdx]);
    if (!Number.isFinite(year)) continue;
    if (!byIso.has(iso)) byIso.set(iso, new Map());
    byIso.get(iso).set(year, pct);
  }
  const result = {};
  for (const [iso, yearMap] of byIso) {
    const years = [...yearMap.keys()].sort((a, b) => a - b);
    const latest = years[years.length - 1];
    result[iso] = { pct: yearMap.get(latest), latestYear: latest };
  }
  return result;
}

function main() {
  const [fboPath, mfPath, vvOwnPath, vvRegPath] = process.argv.slice(2);
  if (!fboPath || !fs.existsSync(fboPath)) {
    console.error(
      "Usage: node scripts/fleet/build-shadow-fleet-index.js <FleetBeneficialOwners.csv> <MerchantFleet.csv> <VesselValueByOwnership.csv> <VesselValueByRegistration.csv>",
    );
    process.exit(1);
  }
  const neededIso3 = neededIso3FromMeta();
  const { result: ownership, latestYear: fboYear } = parseFleetBeneficialOwners(fboPath, neededIso3);
  const age = mfPath && fs.existsSync(mfPath) ? parseMerchantFleetAge(mfPath, neededIso3) : {};
  const valueOwnership = vvOwnPath && fs.existsSync(vvOwnPath) ? parseVesselValueShare(vvOwnPath, "beneficialownership", neededIso3) : {};
  const valueRegistration = vvRegPath && fs.existsSync(vvRegPath) ? parseVesselValueShare(vvRegPath, "flagofregistration", neededIso3) : {};

  const allIso = new Set([...Object.keys(ownership), ...Object.keys(age), ...Object.keys(valueOwnership), ...Object.keys(valueRegistration)]);
  const countries = {};
  for (const iso of allIso) {
    const own = ownership[iso] || null;
    const a = age[iso] || null;
    const vOwn = valueOwnership[iso] || null;
    const vReg = valueRegistration[iso] || null;
    const focGap = vOwn && vReg ? Math.round((vReg.pct - vOwn.pct) * 100) / 100 : null;
    countries[iso] = {
      foreignFlagSharePct: own?.foreignFlagSharePct ?? null, // core "shadow fleet exposure" metric
      totalOwnedDwtThousands: own?.totalOwnedDwtThousands ?? null,
      topFlags: own?.topFlags ?? [],
      avgAgeAsFlagYears: a?.avgAgeAsFlagYears ?? null,
      ownershipValueSharePct: vOwn?.pct ?? null,
      registrationValueSharePct: vReg?.pct ?? null,
      flagOfConvenienceGap: focGap, // positive = registers far more than it owns (classic FOC state)
    };
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.FleetBeneficialOwners + US.MerchantFleet + US.VesselValueByOwnership + US.VesselValueByRegistration",
    sourceDataYear: fboYear,
    method:
      "foreignFlagSharePct = (DWT beneficially owned by country X, flagged under any OTHER country) / (total DWT owned by X, any flag) — the core shadow-fleet-exposure metric. flagOfConvenienceGap = registration value share % − ownership value share % (positive = flag-of-convenience state). Country-level, not bilateral — matched into corridors via max(endpointCountries).",
    countryCount: Object.keys(countries).length,
    withOwnershipData: Object.values(countries).filter((c) => c.foreignFlagSharePct != null).length,
    countries,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(`[shadow-fleet] ${Object.keys(countries).length} countries, ${payload.withOwnershipData} with beneficial-ownership data (year=${fboYear})`);
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}

main();
