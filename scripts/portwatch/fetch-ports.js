#!/usr/bin/env node
/**
 * IMF PortWatch 항만 처리량 수집 — `npm run corridors:portwatch`
 *
 * corridor-rank-meta.json 의 endpointCountries 에 해당하는 국가별로
 * 최근 N일 항만콜/수입/수출 합계를 가져와 corridor 랭킹의
 * portThroughputNorm (0.25 가중치, 지금까지 계속 null) 를 채운다.
 *
 * 소스: IMF PortWatch Daily_Ports_Data (ArcGIS FeatureServer, AIS 위성신호
 *   기반 "추정치" — 실측 TEU/톤수 통계가 아님. 공개·키 불필요.)
 *   https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Ports_Data/FeatureServer/0
 *
 * ⚠️ 국가 단위 합계이지 corridor 단위가 아니다. build-corridor-ranks.js 에서
 *    corridor.endpointCountries 중 최댓값을 그 corridor 의 항만 노출도로 쓴다
 *    (BRI impactNorm 이 이미 같은 max-of-endpoints 방식이라 스타일을 맞췄다).
 *
 * Usage:
 *   node scripts/portwatch/fetch-ports.js
 *   PORTWATCH_WINDOW_DAYS=90 node scripts/portwatch/fetch-ports.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const META_PATH = path.join(ROOT, "src", "data", "corridor-rank-meta.json");
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "portwatch-throughput.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "portwatch-throughput.json");

const BASE =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Ports_Data/FeatureServer/0/query";
const UA = "BraveTheWorld/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";

const WINDOW_DAYS = Number(process.env.PORTWATCH_WINDOW_DAYS) || 90;
const SLEEP_SEC = 0.5;

function sleep(sec) {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

function uniqueCountries(meta) {
  const set = new Set();
  for (const c of meta.corridors || []) {
    for (const iso of c.endpointCountries || []) {
      set.add(String(iso).toUpperCase());
    }
  }
  return [...set].sort();
}

function cutoffDateStr(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * 국가 하나에 대해 최근 windowDays 동안의 portcalls/import/export 합계를
 * ArcGIS 서버측 통계(outStatistics)로 한 번에 받아온다 — 일별 원본 로우를
 * 다 내려받지 않는다 (28개국 × 90일치를 로우 단위로 받으면 수천 건).
 */
async function fetchCountryTotals(iso3, cutoff) {
  const outStatistics = JSON.stringify([
    { statisticType: "sum", onStatisticField: "portcalls", outStatisticFieldName: "sum_portcalls" },
    { statisticType: "sum", onStatisticField: "import", outStatisticFieldName: "sum_import" },
    { statisticType: "sum", onStatisticField: "export", outStatisticFieldName: "sum_export" },
  ]);
  const params = new URLSearchParams({
    where: `ISO3='${iso3}' AND date >= DATE '${cutoff}'`,
    outStatistics,
    f: "json",
  });
  const res = await fetch(`${BASE}?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`PortWatch ${iso3} → HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`PortWatch ${iso3} → ${json.error.message || JSON.stringify(json.error)}`);
  const attrs = json.features?.[0]?.attributes || {};
  return {
    portcalls: Number(attrs.sum_portcalls) || 0,
    import: Number(attrs.sum_import) || 0,
    export: Number(attrs.sum_export) || 0,
  };
}

async function main() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  const countries = uniqueCountries(meta);
  const cutoff = cutoffDateStr(WINDOW_DAYS);
  console.log(`[portwatch] countries=${countries.length} windowDays=${WINDOW_DAYS} cutoff=${cutoff}`);

  const byCountry = {};
  let ok = 0;
  for (let i = 0; i < countries.length; i += 1) {
    const iso3 = countries[i];
    process.stdout.write(`  [${i + 1}/${countries.length}] ${iso3} … `);
    try {
      const totals = await fetchCountryTotals(iso3, cutoff);
      // throughputScore: portcalls 는 건수, import/export 는 단위 불명 지수값(추정치) —
      // 세 값 모두 로그정규화 전이라 단순 합산해도 되지만, portcalls 쪽이 스케일이
      // 훨씬 작아 묻힐 수 있어 10배 가중해 대략 같은 자릿수로 맞춘다.
      const throughputScore = totals.portcalls * 10 + totals.import + totals.export;
      byCountry[iso3] = { ...totals, throughputScore };
      console.log(`portcalls=${totals.portcalls} import=${totals.import.toFixed(0)} export=${totals.export.toFixed(0)}`);
      if (throughputScore > 0) ok += 1;
    } catch (err) {
      byCountry[iso3] = { portcalls: 0, import: 0, export: 0, throughputScore: 0, error: err.message };
      console.log(`실패: ${err.message}`);
    }
    await sleep(SLEEP_SEC);
  }

  if (ok === 0) {
    throw new Error(
      "모든 국가에서 0건/실패 — API 응답이 이상하거나 네트워크가 막혀있다. 덮어쓰지 않고 중단한다.",
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "IMF PortWatch Daily_Ports_Data (ArcGIS FeatureServer)",
    caveat:
      "AIS 위성신호 기반 추정치 — 실측 TEU/톤수 통계 아님 (portcalls=입항횟수, import/export=추정 지수값)",
    windowDays: WINDOW_DAYS,
    cutoffDate: cutoff,
    countryCount: countries.length,
    withData: ok,
    countries: byCountry,
  };

  for (const out of [OUT_SCRIPTS, OUT_PUBLIC]) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`[portwatch] wrote ${path.relative(ROOT, out)}`);
  }

  console.log(`\n다음 단계: node scripts/build-corridor-ranks.js`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
