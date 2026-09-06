#!/usr/bin/env node
/**
 * 한국 거시·항만 데이터 수집 — `npm run korea:fetch`
 *
 * 세 소스를 한 번에 긁는다:
 *   · 해수부  항만 입출항 (data.go.kr)         → 초크포인트·항구 레이어
 *   · 한국은행 ECOS 환율·금리 (자체 포털)       → 시장 등불·티커
 *   · 통계청  KOSIS 에너지 수급 (자체 포털)     → 지경학 양피지
 *
 * ══════════════════════════════════════════════════════════════════════
 *  발급
 * ══════════════════════════════════════════════════════════════════════
 *
 *   해수부  data.go.kr 활용신청 → MOF_PORT_API_KEY
 *   ECOS    ecos.bok.or.kr 회원가입 시 **키 자동 발급** → ECOS_API_KEY
 *   KOSIS   kosis.kr/openapi 인증키 신청 → KOSIS_API_KEY
 *
 * 키가 없는 소스는 건너뛴다 — 하나만 있어도 그만큼은 수집된다.
 *
 * ⚠️ ECOS·KOSIS 는 **data.go.kr 이 아니라 자체 포털**이다.
 *    이용약관이 따로 있으니 유료화 전에 각각 확인할 것.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  폴링 정책 — 하루 1회
 * ══════════════════════════════════════════════════════════════════════
 *
 * 저작권법 제93조 2항 단서("반복적·체계적")와 개발계정 일일 한도
 * (보통 1만 건) 양쪽을 고려한 값이다. 10분 크론에 넣지 말 것.
 */
const fs = require("fs");
const path = require("path");
const { fetchAll, KoreaOpenDataError } = require("./lib/korea-open-data");
const {
  normalizeMovements,
  aggregateByPort,
  aggregateFlows,
} = require("./lib/mof-port-parse");
const {
  normalizeEcosRows,
  normalizeKosisRows,
  latestChange,
} = require("./lib/ecos-kosis-parse");

const OUT_DIR = path.join(__dirname, "..", "public", "data");
const UA = "BraveTheWorld/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";

/** ECOS 관심 지표 — 시장 등불에 붙는 것들 */
const ECOS_SERIES = [
  { id: "usdkrw", stat: "731Y001", item: "0000001", cycle: "D", label: "원/달러 환율" },
  { id: "base-rate", stat: "722Y001", item: "0101000", cycle: "M", label: "한국은행 기준금리" },
  { id: "ktb3y", stat: "721Y001", item: "5020000", cycle: "D", label: "국고채 3년" },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function ymd(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchJson(url, label) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: JSON 파싱 실패 — ${text.slice(0, 160)}`);
  }
}

// ── 해수부 ───────────────────────────────────────────────────────────

async function collectPort() {
  const key = process.env.MOF_PORT_API_KEY?.trim();
  if (!key) return null;

  const endpoint =
    process.env.MOF_PORT_ENDPOINT?.trim() ||
    "https://apis.data.go.kr/1192000/select4List/getselect4List";

  const { items, format } = await fetchAll(
    endpoint,
    key,
    {},
    { numOfRows: 500, maxPages: 10, delayMs: 1_200, userAgent: UA },
  );

  const rows = normalizeMovements(items);
  if (items.length > 0 && rows.length === 0) {
    console.warn(
      "   ⚠ 해수부: 응답은 있는데 정규화 결과가 0이다. " +
        "필드명이 바뀌었는지 scripts/lib/mof-port-parse.js FIELD 를 확인할 것.",
    );
  }

  return {
    format,
    rawCount: items.length,
    movements: rows,
    ports: aggregateByPort(rows),
    // 초크포인트 레이어와 잇는 지점 — "물량이 어디로 흐르나"
    flows: aggregateFlows(rows, { minCount: 1 }),
  };
}

// ── ECOS ─────────────────────────────────────────────────────────────

async function collectEcos() {
  const key = process.env.ECOS_API_KEY?.trim();
  if (!key) return null;

  const end = new Date();
  const start = new Date(end.getFullYear() - 2, end.getMonth(), end.getDate());
  const series = [];

  for (const s of ECOS_SERIES) {
    // 주기에 따라 날짜 형식이 다르다 (D=YYYYMMDD, M=YYYYMM)
    const from = s.cycle === "D" ? ymd(start) : ymd(start).slice(0, 6);
    const to = s.cycle === "D" ? ymd(end) : ymd(end).slice(0, 6);
    const url =
      `https://ecos.bok.or.kr/api/StatisticSearch/${encodeURIComponent(key)}/json/kr/1/1000/` +
      `${s.stat}/${s.cycle}/${from}/${to}/${s.item}`;

    try {
      const payload = await fetchJson(url, `ECOS ${s.id}`);
      const rows = normalizeEcosRows(payload); // 실패면 예외
      series.push({ ...s, points: rows.length, latest: latestChange(rows), rows });
      console.log(`   ECOS ${s.label}: ${rows.length}점`);
    } catch (error) {
      console.warn(`   ✗ ECOS ${s.label}: ${error.message}`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return series.length ? { series } : null;
}

// ── KOSIS ────────────────────────────────────────────────────────────

async function collectKosis() {
  const key = process.env.KOSIS_API_KEY?.trim();
  const tableId = process.env.KOSIS_TABLE_ID?.trim();
  if (!key || !tableId) return null;

  const url =
    "https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList" +
    `&apiKey=${encodeURIComponent(key)}&format=json&jsonVD=Y&itmId=ALL&objL1=ALL` +
    `&prdSe=M&newEstPrdCnt=24&orgId=${encodeURIComponent(process.env.KOSIS_ORG_ID ?? "101")}` +
    `&tblId=${encodeURIComponent(tableId)}`;

  try {
    const payload = await fetchJson(url, "KOSIS");
    const rows = normalizeKosisRows(payload); // 실패면 예외
    console.log(`   KOSIS ${tableId}: ${rows.length}행`);
    return { tableId, rows, latest: latestChange(rows) };
  } catch (error) {
    console.warn(`   ✗ KOSIS: ${error.message}`);
    return null;
  }
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  const only = arg("--only", null);
  console.log("한국 거시·항만 데이터 수집");

  const [port, ecos, kosis] = await Promise.all([
    !only || only === "port" ? collectPort().catch((e) => {
      console.warn(`   ✗ 해수부: ${e instanceof KoreaOpenDataError ? e.message : e.message}`);
      return null;
    }) : null,
    !only || only === "ecos" ? collectEcos() : null,
    !only || only === "kosis" ? collectKosis() : null,
  ]);

  if (!port && !ecos && !kosis) {
    console.error(
      "\n수집된 소스가 없다. 덮어쓰지 않고 중단한다.\n" +
        "  MOF_PORT_API_KEY  — data.go.kr 활용신청\n" +
        "  ECOS_API_KEY      — ecos.bok.or.kr 회원가입 시 자동 발급\n" +
        "  KOSIS_API_KEY     — kosis.kr/openapi 인증키 신청\n" +
        "                      (+ KOSIS_TABLE_ID · KOSIS_ORG_ID)\n",
    );
    process.exit(1);
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    attribution: [
      port ? "해양수산부 · 공공데이터포털(data.go.kr)" : null,
      ecos ? "한국은행 경제통계시스템(ECOS)" : null,
      kosis ? "통계청 KOSIS" : null,
    ].filter(Boolean),
    license:
      "공공누리 유형은 데이터셋별로 확인 — 미확인 시 유료 노출 금지. " +
      "ECOS·KOSIS 는 data.go.kr 이 아닌 자체 포털이라 이용약관이 별도다.",
    port: port
      ? {
          rawCount: port.rawCount,
          movementCount: port.movements.length,
          ports: port.ports,
          flows: port.flows,
        }
      : null,
    ecos: ecos ?? null,
    kosis: kosis ?? null,
  };

  for (const profile of ["lite", "full"]) {
    const dir = path.join(OUT_DIR, profile);
    if (!fs.existsSync(dir)) continue;
    // lite 는 집계만 — 원시 행은 무겁다
    const slice =
      profile === "lite"
        ? {
            ...payload,
            port: payload.port
              ? { ...payload.port, flows: payload.port.flows.slice(0, 100) }
              : null,
            ecos: ecos
              ? { series: ecos.series.map(({ rows, ...rest }) => rest) }
              : null,
            kosis: kosis ? { tableId: kosis.tableId, latest: kosis.latest } : null,
          }
        : payload;
    fs.writeFileSync(
      path.join(dir, "korea-macro.json"),
      `${JSON.stringify(slice)}\n`,
    );
    console.log(`   ✓ ${profile}`);
  }

  console.log("\n다음 단계:");
  console.log("  1) 각 데이터셋 페이지에서 공공누리 유형 확인 → sourceCatalog koglType");
  console.log("  2) node scripts/compress-data-gzip.js all");
  console.log("  3) npm run verify:data && npm run verify:commercial");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
