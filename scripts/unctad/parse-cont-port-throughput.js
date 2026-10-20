#!/usr/bin/env node
/**
 * UNCTADstat US.ContPortThroughput bulk CSV → country TEU cache.
 *
 * UNCTADstat 포털은 JS 렌더링 + 이메일 인증이라 API 대신
 * Data Centre → Bulk / Export CSV 를 연 1~2회 받아 이 스크립트로 파싱한다.
 *
 * Download:
 *   https://unctadstat.unctad.org/datacentre/dataviewer/US.ContPortThroughput
 *   → Export CSV / Download Bulk → drop file into scripts/data/unctad/incoming/
 *
 * Output:
 *   scripts/data/unctad-port-throughput.json
 *   public/data/crink/unctad-port-throughput.json
 *
 * Matching (corridor ranks) — phase 2 in match-corridor-teu.js:
 *   hard-bind → ContPort geoMean(comtradePair|endpoints) → PortWatch.
 *   Country TEU is not bilateral corridor volume.
 *
 * Usage:
 *   node scripts/unctad/parse-cont-port-throughput.js
 *   node scripts/unctad/parse-cont-port-throughput.js path/to/file.csv
 *   npm run corridors:unctad
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const INCOMING_DIR = path.join(ROOT, "scripts", "data", "unctad", "incoming");
const FIXTURE = path.join(ROOT, "scripts", "unctad", "fixtures", "US.ContPortThroughput.sample.csv");
const HARD_BIND = path.join(ROOT, "scripts", "data", "unctad-corridor-teu.csv");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "unctad-port-throughput.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "unctad-port-throughput.json");

/** Economy_Label (and common aliases) → ISO3 for corridor endpoints */
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
  indonesia: "IDN",
  singapore: "SGP",
  malaysia: "MYS",
  vietnam: "VNM",
  "viet nam": "VNM",
  japan: "JPN",
  "united states of america": "USA",
  "united states": "USA",
  germany: "DEU",
  "united kingdom": "GBR",
};

const ISO3_RE = /^[A-Z]{3}$/;

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** Minimal CSV split — handles quoted fields with commas */
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
  return String(h || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s./]+/g, "_");
}

function findCol(headers, predicates) {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (predicates.some((fn) => fn(h))) return i;
  }
  return -1;
}

function parseNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function resolveIso3(economyCode, economyLabel) {
  const code = String(economyCode || "")
    .trim()
    .toUpperCase();
  if (ISO3_RE.test(code) && code !== "WLD" && code !== "ALL") return code;
  const label = String(economyLabel || "")
    .trim()
    .toLowerCase();
  if (!label) return null;
  if (LABEL_TO_ISO3[label]) return LABEL_TO_ISO3[label];
  // partial: "China (...)" etc.
  for (const [k, iso] of Object.entries(LABEL_TO_ISO3)) {
    if (label === k || label.startsWith(`${k} `) || label.startsWith(`${k},`)) return iso;
  }
  return null;
}

function findCsvInput(cliPath) {
  if (cliPath && fs.existsSync(cliPath)) return path.resolve(cliPath);
  if (!fs.existsSync(INCOMING_DIR)) return FIXTURE;
  const files = fs
    .readdirSync(INCOMING_DIR)
    .filter((f) => /\.csv$/i.test(f) && /contport|throughput|unctad/i.test(f) || /\.csv$/i.test(f))
    .map((f) => path.join(INCOMING_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  // Prefer filenames that look like ContPortThroughput
  const preferred = files.find((f) => /contport|throughput/i.test(path.basename(f)));
  if (preferred) return preferred;
  if (files[0]) return files[0];
  return FIXTURE;
}

function parseContPortCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error(`empty CSV: ${filePath}`);

  // Skip UNCTAD preamble rows until a header with Year + Value-ish columns appears
  let headerIdx = 0;
  let headers = [];
  for (let i = 0; i < Math.min(lines.length, 30); i += 1) {
    const cols = splitCsvLine(lines[i]).map(normalizeHeader);
    const hasYear = cols.some((c) => c === "year" || c.endsWith("_year"));
    const hasValue = cols.some(
      (c) =>
        c.includes("value") ||
        c.includes("teu") ||
        c.includes("throughput") ||
        c === "us_contportthroughput",
    );
    const hasEconomy =
      cols.some((c) => c.includes("economy") || c === "iso3" || c === "economy_label");
    if (hasYear && hasValue && hasEconomy) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }
  if (headers.length === 0) {
    headers = splitCsvLine(lines[0]).map(normalizeHeader);
    headerIdx = 0;
  }

  const economyIdx = findCol(headers, [
    (h) => h === "economy",
    (h) => h === "economy_code",
    (h) => h === "iso3",
    (h) => h === "economy_label" && false,
  ]);
  const labelIdx = findCol(headers, [
    (h) => h === "economy_label",
    (h) => h === "economy_name",
    (h) => h === "country",
    (h) => h === "country_label",
  ]);
  // Prefer explicit economy code column; if missing, label-only
  const codeIdx =
    economyIdx >= 0
      ? economyIdx
      : findCol(headers, [(h) => h === "economy" || h.endsWith("_economy")]);
  const yearIdx = findCol(headers, [(h) => h === "year", (h) => h.endsWith("_year")]);
  const valueIdx = findCol(headers, [
    (h) => h.includes("contportthroughput") && h.includes("value"),
    (h) => h === "us_contportthroughput_value",
    (h) => h.endsWith("_value"),
    (h) => h.includes("teu"),
    (h) => h.includes("throughput") && h.includes("value"),
    (h) => h === "value",
  ]);

  if (yearIdx < 0 || valueIdx < 0 || (codeIdx < 0 && labelIdx < 0)) {
    throw new Error(
      `Unrecognized UNCTAD ContPortThroughput headers in ${path.basename(filePath)}: ${headers.join(",")}`,
    );
  }

  /** iso3 → { year → teu } */
  const byIso = new Map();
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const year = parseNumber(cols[yearIdx]);
    const teu = parseNumber(cols[valueIdx]);
    if (year == null || teu == null || teu < 0) continue;
    const iso = resolveIso3(
      codeIdx >= 0 ? cols[codeIdx] : "",
      labelIdx >= 0 ? cols[labelIdx] : "",
    );
    if (!iso) continue;
    if (!byIso.has(iso)) byIso.set(iso, new Map());
    byIso.get(iso).set(year, teu);
  }

  const countries = {};
  for (const [iso, yearMap] of byIso) {
    const years = [...yearMap.keys()].sort((a, b) => a - b);
    const latestYear = years[years.length - 1];
    const recent = years.filter((y) => y >= latestYear - 2);
    const avg =
      recent.reduce((s, y) => s + yearMap.get(y), 0) / Math.max(1, recent.length);
    countries[iso] = {
      iso3: iso,
      teu: avg,
      latestYear,
      latestTeu: yearMap.get(latestYear),
      yearsUsed: recent,
    };
  }

  return {
    sourceFile: path.relative(ROOT, filePath).replace(/\\/g, "/"),
    countries,
    countryCount: Object.keys(countries).length,
  };
}

/** Optional hard-bind: corridorId,teu,year,note */
function parseCorridorHardBind(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 2) return {};
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const idIdx = findCol(headers, [(h) => h === "corridorid" || h === "id" || h === "corridor_id"]);
  const teuIdx = findCol(headers, [(h) => h === "teu" || h.includes("teu")]);
  const yearIdx = findCol(headers, [(h) => h === "year"]);
  const noteIdx = findCol(headers, [(h) => h === "note" || h === "source"]);
  if (idIdx < 0 || teuIdx < 0) return {};
  const out = {};
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const id = String(cols[idIdx] || "").trim();
    const teu = parseNumber(cols[teuIdx]);
    if (!id || teu == null) continue;
    out[id] = {
      teu,
      year: yearIdx >= 0 ? parseNumber(cols[yearIdx]) : null,
      note: noteIdx >= 0 ? cols[noteIdx] || null : null,
    };
  }
  return out;
}

function main() {
  const cli = process.argv[2];
  const input = findCsvInput(cli);
  const usingFixture = path.resolve(input) === path.resolve(FIXTURE);
  console.log(
    `[unctad] parsing ${path.relative(ROOT, input)}${usingFixture ? " (fixture — drop real bulk CSV into scripts/data/unctad/incoming/)" : ""}`,
  );

  const parsed = parseContPortCsv(input);
  const hardBind = parseCorridorHardBind(HARD_BIND);
  const hardBindCount = Object.keys(hardBind).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "UNCTADstat US.ContPortThroughput (bulk CSV)",
    dataset: "US.ContPortThroughput",
    sourceFile: parsed.sourceFile,
    usingFixture,
    method:
      "Country-level container port throughput (TEU). Latest year ±2y average per ISO3. Corridor match = max(endpointCountries). Optional corridor hard-bind CSV for INSTC/TITR etc.",
    downloadHint:
      "https://unctadstat.unctad.org/datacentre/dataviewer/US.ContPortThroughput → Export/Bulk CSV → scripts/data/unctad/incoming/",
    countryCount: parsed.countryCount,
    hardBindCount,
    countries: parsed.countries,
    corridorHardBind: hardBind,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[unctad] countries=${parsed.countryCount} hardBind=${hardBindCount} fixture=${usingFixture}`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
  console.log(`  wrote ${path.relative(ROOT, OUT_PUBLIC)}`);
}

main();
