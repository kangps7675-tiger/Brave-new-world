#!/usr/bin/env node
/**
 * Eurostat rail_go_intgong (국제철도화물, 적재국→양하국) 수집 — `npm run corridors:railfreight`
 *
 * corridor-rank-meta.json 의 corridor 중 `railFreightPair: {geo, partner}` 가
 * 있는 것만 대상으로 한다. Eurostat 은 "EU/EFTA 회원국(geo, 보고국) →
 * 파트너국(c_unload, 양하국)" 방향의 흐름만 잡는다 — CRINK 내부 축
 * (러시아→중국 등, EU 가 안 낀 흐름)은 이 데이터셋에 원천적으로 없다.
 * 그래서 "EU 진입 레그" corridor(예: 브레스트-마와셰비체 궤간변경 터미널)에만
 * 붙는다. 자세한 배경은 대화 기록 참고 — Eurostat 공식 API 로 직접 검증했음
 * (DBnomics 는 이 세션에선 네트워크 allowlist 에 막혀 못 씀).
 *
 * 소스: Eurostat 공식 API (공개·키 불필요)
 *   https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/rail_go_intgong
 *   dims: freq, unit, c_unload(양하국), geo(보고국=EU/EFTA), time
 *
 * Usage:
 *   node scripts/eurostat-rail/fetch-rail-freight.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "rail-freight-bilateral.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "rail-freight-bilateral.json");

const BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/rail_go_intgong";
const UA = "geowatch/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";
const UNIT = "MIO_TKM"; // 백만 톤킬로미터 — "rail freight ton-km" 지표 그 자체
const YEARS_TO_AVERAGE = 3; // 최근 3개 유효연도 평균
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
    seen.set(pairKey(rp.geo, rp.partner), { geo: rp.geo.toUpperCase(), partner: rp.partner.toUpperCase() });
  }
  return [...seen.values()];
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
  if (json.error) throw new Error(`Eurostat ${geo}->${partner} → ${json.error.message || JSON.stringify(json.error)}`);

  const timeIndex = json?.dimension?.time?.category?.index || {};
  const values = json?.value || {};
  // JSON-stat: geo/c_unload/unit 를 전부 단일값으로 고정했으니 flat index == time index.
  const years = {};
  for (const [year, idx] of Object.entries(timeIndex)) {
    const v = values[String(idx)];
    if (typeof v === "number") years[year] = v;
  }
  const sortedYears = Object.keys(years).sort();
  const recentYears = sortedYears.slice(-YEARS_TO_AVERAGE);
  const recentValues = recentYears.map((y) => years[y]);
  const avgRecentTkm = recentValues.length
    ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    : null;

  return { years, recentYears, avgRecentTkm };
}

async function main() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  const pairs = uniqueRailPairs(meta);
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
      byPair[pairKey(geo, partner)] = { geo, partner, ...result, error: null };
      console.log(
        result.avgRecentTkm != null
          ? `최근 ${result.recentYears.join(",")} 평균 ${result.avgRecentTkm.toFixed(1)} 백만톤km`
          : "데이터 없음",
      );
      if (result.avgRecentTkm != null) ok += 1;
    } catch (err) {
      byPair[pairKey(geo, partner)] = { geo, partner, years: {}, recentYears: [], avgRecentTkm: null, error: err.message };
      console.log(`실패: ${err.message}`);
    }
    await sleep(SLEEP_SEC);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Eurostat rail_go_intgong (official API, ec.europa.eu)",
    caveat:
      "EU/EFTA 보고국 → 파트너국(양하국) 방향만 존재 — CRINK 내부 축(EU 미포함) 흐름은 이 데이터셋에 없음",
    unit: UNIT,
    yearsAveraged: YEARS_TO_AVERAGE,
    pairCount: pairs.length,
    withData: ok,
    pairs: byPair,
  };

  for (const out of [OUT_SCRIPTS, OUT_PUBLIC]) {
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
