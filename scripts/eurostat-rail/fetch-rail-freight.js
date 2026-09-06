#!/usr/bin/env node
/**
 * Eurostat rail_go_intgong (국제철도화물, 적재국→양하국) 수집 — `npm run corridors:railfreight`
 *
 * corridor-rank-meta.json 의 corridor 중 `railFreightPair: {geo, partner}` 가
 * 있는 것만 대상으로 한다. Eurostat 은 "EU/EFTA 회원국(geo, 보고국) →
 * 파트너국(c_unload, 양하국)" 방향의 흐름만 잡는다 — CRINK 내부 축
 * (러시아→중국 등, EU 가 안 낀 흐름)은 이 데이터셋에 원천적으로 없다.
 *
 * Optional WORLD CSV (Data Browser export, c_unload=WORLD):
 *   scripts/data/eurostat/rail_go_intgong_world.csv
 * → geo별 국제철도 총량 분모 → shareOfWorld (양자 / 전세계 양하 합)
 *
 * 소스: Eurostat 공식 API (공개·키 불필요)
 *   https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/rail_go_intgong
 *
 * Usage:
 *   node scripts/eurostat-rail/fetch-rail-freight.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const WORLD_CSV = path.join(ROOT, "scripts", "data", "eurostat", "rail_go_intgong_world.csv");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "rail-freight-bilateral.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "rail-freight-bilateral.json");
const OUT_SRC = path.join(ROOT, "src", "data", "rail-freight-bilateral.json");

const BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/rail_go_intgong";
const UA = "geowatch/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";
const UNIT = "MIO_TKM";
const YEARS_TO_AVERAGE = 3;
const SHOCK_BASE_YEAR = "2021";
const SLEEP_SEC = 0.5;

function sleep(sec) {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

function pairKey(geo, partner) {
  return `${geo.toUpperCase()}|${partner.toUpperCase()}`;
}

function uniqueRailPairs(meta) {
  const seen = new Map();
  for (const c of meta.corridors || []) {
    const rp = c.railFreightPair;
    if (!rp || !rp.geo || !rp.partner) continue;
    seen.set(pairKey(rp.geo, rp.partner), {
      geo: rp.geo.toUpperCase(),
      partner: rp.partner.toUpperCase(),
    });
  }
  return [...seen.values()];
}

function avgRecent(yearsMap) {
  const sortedYears = Object.keys(yearsMap).sort();
  const recentYears = sortedYears.slice(-YEARS_TO_AVERAGE);
  const recentValues = recentYears.map((y) => yearsMap[y]).filter((v) => typeof v === "number");
  if (!recentValues.length) return { recentYears: [], avgRecentTkm: null };
  return {
    recentYears,
    avgRecentTkm: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
  };
}

function shockFromYears(yearsMap, avgRecentTkm) {
  const base = yearsMap[SHOCK_BASE_YEAR];
  if (typeof base !== "number" || !(base > 0) || avgRecentTkm == null) return null;
  // (recent/base) - 1 — negative = collapse since baseline year
  return (avgRecentTkm / base) - 1;
}

/**
 * Parse Data Browser wide CSV: period + columns like
 * `… (Eurostat/rail_go_intgong/A.MIO_TKM.WORLD.PL)`
 * → { PL: { "2021": 73, … }, … }
 */
function loadWorldMioTkmByGeo(csvPath) {
  if (!fs.existsSync(csvPath)) return null;
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return null;

  const header = splitCsvLine(lines[0]);
  const geoCols = [];
  for (let i = 1; i < header.length; i += 1) {
    const m = header[i].match(/rail_go_intgong\/A\.MIO_TKM\.WORLD\.([A-Z]{2})\)/i);
    if (m) geoCols.push({ index: i, geo: m[1].toUpperCase() });
  }
  if (!geoCols.length) {
    console.warn("[rail-freight] WORLD CSV: no MIO_TKM.WORLD.* columns found");
    return null;
  }

  const byGeo = {};
  for (const { geo } of geoCols) byGeo[geo] = {};

  for (let r = 1; r < lines.length; r += 1) {
    const cols = splitCsvLine(lines[r]);
    const year = String(cols[0] || "").trim();
    if (!/^\d{4}$/.test(year)) continue;
    for (const { index, geo } of geoCols) {
      const raw = (cols[index] || "").trim();
      if (!raw || raw === "NA" || raw === ":") continue;
      const n = Number(raw);
      if (Number.isFinite(n)) byGeo[geo][year] = n;
    }
  }

  console.log(
    `[rail-freight] WORLD CSV: ${path.relative(ROOT, csvPath)} — ${geoCols.length} geos (MIO_TKM)`,
  );
  return byGeo;
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
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
  return out;
}

async function fetchPair(geo, partner) {
  const params = new URLSearchParams({
    format: "JSON",
    lang: "en",
    geo,
    c_unload: partner,
    unit: UNIT,
  });
  const res = await fetch(`${BASE}?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Eurostat ${geo}->${partner} → HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) {
    throw new Error(`Eurostat ${geo}->${partner} → ${json.error.message || JSON.stringify(json.error)}`);
  }

  const timeIndex = json?.dimension?.time?.category?.index || {};
  const values = json?.value || {};
  const years = {};
  for (const [year, idx] of Object.entries(timeIndex)) {
    const v = values[String(idx)];
    if (typeof v === "number") years[year] = v;
  }
  const { recentYears, avgRecentTkm } = avgRecent(years);
  const shockPct = shockFromYears(years, avgRecentTkm);
  return { years, recentYears, avgRecentTkm, shockPct };
}

async function main() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  const pairs = uniqueRailPairs(meta);
  const worldByGeo = loadWorldMioTkmByGeo(WORLD_CSV);
  console.log(`[rail-freight] unique geo→partner pairs=${pairs.length} unit=${UNIT}`);

  if (pairs.length === 0) {
    console.log("[rail-freight] corridor-rank-meta.json 에 railFreightPair 가 있는 corridor 가 없다 — 종료.");
    return;
  }

  const byPair = {};
  let ok = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    const { geo, partner } = pairs[i];
    process.stdout.write(`  [${i + 1}/${pairs.length}] ${geo}->${partner} … `);
    try {
      const result = await fetchPair(geo, partner);
      let shareOfWorld = null;
      if (worldByGeo?.[geo] && result.avgRecentTkm != null) {
        const { avgRecentTkm: worldAvg } = avgRecent(worldByGeo[geo]);
        if (worldAvg != null && worldAvg > 0) {
          shareOfWorld = result.avgRecentTkm / worldAvg;
        }
      }
      byPair[pairKey(geo, partner)] = {
        geo,
        partner,
        ...result,
        shareOfWorld,
        error: null,
      };
      const shockStr =
        result.shockPct != null ? ` shock@${SHOCK_BASE_YEAR}=${(result.shockPct * 100).toFixed(0)}%` : "";
      const shareStr = shareOfWorld != null ? ` share=${(shareOfWorld * 100).toFixed(1)}%` : "";
      console.log(
        result.avgRecentTkm != null
          ? `최근 ${result.recentYears.join(",")} 평균 ${result.avgRecentTkm.toFixed(1)} 백만톤km${shockStr}${shareStr}`
          : "데이터 없음",
      );
      if (result.avgRecentTkm != null) ok += 1;
    } catch (err) {
      byPair[pairKey(geo, partner)] = {
        geo,
        partner,
        years: {},
        recentYears: [],
        avgRecentTkm: null,
        shockPct: null,
        shareOfWorld: null,
        error: err.message,
      };
      console.log(`실패: ${err.message}`);
    }
    await sleep(SLEEP_SEC);
  }

  const hubs = {};
  if (worldByGeo) {
    for (const [geo, years] of Object.entries(worldByGeo)) {
      const { recentYears, avgRecentTkm } = avgRecent(years);
      hubs[geo] = {
        years,
        recentYears,
        avgRecentTkm,
        shockPct: shockFromYears(years, avgRecentTkm),
      };
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Eurostat rail_go_intgong (official API, ec.europa.eu)",
    worldSource: worldByGeo
      ? "scripts/data/eurostat/rail_go_intgong_world.csv (Data Browser, c_unload=WORLD)"
      : null,
    caveat:
      "EU/EFTA 보고국 → 파트너국(양하국) 방향만 존재 — CRINK 내부 축(EU 미포함) 흐름은 이 데이터셋에 없음. shareOfWorld = 양자/WORLD 총량.",
    unit: UNIT,
    yearsAveraged: YEARS_TO_AVERAGE,
    shockBaseYear: SHOCK_BASE_YEAR,
    pairCount: pairs.length,
    withData: ok,
    pairs: byPair,
    hubs,
  };

  for (const out of [OUT_SCRIPTS, OUT_PUBLIC, OUT_SRC]) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`[rail-freight] wrote ${path.relative(ROOT, out)}`);
  }

  console.log(`\n다음 단계: node scripts/build-corridor-ranks.js`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
