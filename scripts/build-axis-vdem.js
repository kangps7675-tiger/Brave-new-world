/**
 * V-Dem stream → historical-friction.json
 * Year 1950–2025 · e_miinteco + e_ovctd
 * Countries: closed/electoral autocracies (v2x_regime 0|1) + axis hubs/spokes always
 *
 * Usage: node scripts/build-axis-vdem.js [path-to-vdem-csv]
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "V-Dem-CY-FullOthers-v16_csv",
  "V-Dem-CY-Full+Others-v16.csv",
);

const YEAR_MIN = 1950;
const YEAR_MAX = 2025;
const VARS = ["e_miinteco", "e_ovctd"];

/** 축 허브·스포크 — 레짐과 무관하게 항상 포함 */
const ALWAYS = new Set([
  "CHN",
  "RUS",
  "SUN",
  "PRK",
  "IRN",
  "BLR",
  "SYR",
  "IRQ",
  "YEM",
  "LBN",
  "KAZ",
  "UZB",
  "TKM",
  "KGZ",
  "TJK",
  "CUB",
  "VEN",
  "MMR",
  "PAK",
  "LAO",
  "VNM",
  "NIC",
  "ERI",
  "SDN",
  "ZWE",
  "TKM",
]);

function unquote(s) {
  if (!s) return "";
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function isAutocracy(regime) {
  return regime === 0 || regime === 1;
}

function bucketId(textId) {
  if (textId === "SUN") return "RUS";
  return textId;
}

async function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error("V-Dem CSV not found:", csvPath);
    process.exit(1);
  }

  const stream = fs.createReadStream(csvPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  let iTextId = -1;
  let iYear = -1;
  let iName = -1;
  let iRegime = -1;
  const varIdx = {};

  /** @type {Map<string, {name:string, rows: Map<number, any>}>>} */
  const countries = new Map();
  let rows = 0;
  let kept = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = parseCsvLine(line).map(unquote);
      iTextId = headers.indexOf("country_text_id");
      iYear = headers.indexOf("year");
      iName = headers.indexOf("country_name");
      iRegime = headers.indexOf("v2x_regime");
      for (const v of VARS) {
        varIdx[v] = headers.indexOf(v);
        if (varIdx[v] < 0) console.warn("missing column", v);
      }
      if (iTextId < 0 || iYear < 0) {
        console.error("required columns missing");
        process.exit(1);
      }
      console.log("columns ok", { iTextId, iYear, iName, iRegime, varIdx });
      continue;
    }

    rows += 1;
    if (rows % 250000 === 0) console.log("scanned", rows);

    const cells = parseCsvLine(line);
    const textId = unquote(cells[iTextId] || "");
    if (!textId) continue;
    const year = Number(unquote(cells[iYear] || ""));
    if (!Number.isFinite(year) || year < YEAR_MIN || year > YEAR_MAX) continue;

    const regimeRaw = iRegime >= 0 ? unquote(cells[iRegime] || "") : "";
    const regime = regimeRaw === "" || regimeRaw === "." ? null : Number(regimeRaw);
    const always = ALWAYS.has(textId);
    const auto = Number.isFinite(regime) && isAutocracy(regime);
    if (!always && !auto) continue;

    const e = {};
    let hasSignal = false;
    for (const v of VARS) {
      const idx = varIdx[v];
      const raw = idx >= 0 ? unquote(cells[idx] || "") : "";
      const num = raw === "" || raw === "." ? null : Number(raw);
      e[v] = Number.isFinite(num) ? num : null;
      if (e[v] != null) hasSignal = true;
    }
    // Keep always-include even if vars empty; for others require at least one var present
    if (!always && !hasSignal) continue;

    const id = bucketId(textId);
    const name = unquote(cells[iName] || "") || id;
    if (!countries.has(id)) {
      countries.set(id, { name, rows: new Map() });
    }
    const bucket = countries.get(id);
    if (name && name !== id) bucket.name = name;

    const prev = bucket.rows.get(year);
    // Prefer RUS row over SUN for same year
    if (prev && textId === "SUN" && prev.sourceId === "RUS") continue;
    if (prev && textId === "RUS") {
      // overwrite SUN
    } else if (prev && textId === "SUN") {
      // keep if no RUS yet — fallthrough
    }

    bucket.rows.set(year, {
      year,
      e_miinteco: e.e_miinteco,
      e_ovctd: e.e_ovctd,
      regime: Number.isFinite(regime) ? regime : null,
      sourceId: textId === "SUN" ? "SUN" : id,
      autocracy: auto || always,
    });
    kept += 1;
  }

  /** @type {Record<string, any[]>} */
  const series = {};
  const meta = [];
  const events = [];

  for (const [id, { name, rows: yearMap }] of countries) {
    const list = [...yearMap.values()]
      .sort((a, b) => a.year - b.year)
      .map(({ year, e_miinteco, e_ovctd, regime }) => ({
        year,
        e_miinteco,
        e_ovctd,
        regime,
      }));
    if (list.length === 0) continue;
    series[id] = list;
    const autoYears = list.filter((r) => r.regime === 0 || r.regime === 1).length;
    meta.push({
      id,
      name,
      years: list.length,
      autocracyYears: autoYears,
    });

    for (const r of list) {
      const m = r.e_miinteco;
      const o = r.e_ovctd;
      const active =
        (m != null && m !== 0) || (o != null && o !== 0);
      if (!active) continue;
      events.push({
        country: id,
        name,
        year: r.year,
        e_miinteco: m,
        e_ovctd: o,
        regime: r.regime,
      });
    }
  }

  meta.sort((a, b) => a.name.localeCompare(b.name));
  events.sort((a, b) => b.year - a.year || a.country.localeCompare(b.country));

  const payload = {
    source: "V-Dem Country-Year: V-Full+Others v16",
    scope:
      "Authoritarian states (v2x_regime 0|1) and axis hubs/spokes · 1950–2025 · e_miinteco · e_ovctd",
    variables: VARS,
    variableNotes: {
      e_miinteco: "Military interstate engagement / related (V-Dem Other)",
      e_ovctd: "Interstate conflict deaths / related (V-Dem Other)",
      v2x_regime: "0 closed autocracy · 1 electoral autocracy · 2+ democracy",
    },
    yearRange: [YEAR_MIN, YEAR_MAX],
    countries: meta.map((m) => m.id),
    countryMeta: meta,
    generatedAt: new Date().toISOString(),
    citation:
      "Coppedge et al. V-Dem Dataset v16. Varieties of Democracy (V-Dem) Project. https://www.v-dem.net/",
    series,
    /** Non-zero conflict signals — browseable 「갈등 시점」 */
    events,
  };

  const json = JSON.stringify(payload);
  for (const profile of ["lite", "full"]) {
    const outDir = path.join(ROOT, "public", "data", profile);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "historical-friction.json");
    fs.writeFileSync(outPath, json);
    console.log(
      "wrote",
      outPath,
      "countries",
      meta.length,
      "events",
      events.length,
      "bytes",
      json.length,
      "kept",
      kept,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
