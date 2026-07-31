#!/usr/bin/env node
/**
 * 관세청 무역통계 수집 — `npm run kcs:fetch`
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 이 데이터인가
 * ══════════════════════════════════════════════════════════════════════
 *
 * GTA 는 **"어떤 무역조치가 있었나"** 를 준다 (정책).
 * 관세청은 **"그래서 한국 물동량이 실제로 어떻게 움직였나"** 를 준다 (실적).
 *
 * 둘을 잇는 키가 **HS 챕터(앞 2자리)** 다:
 *
 *   중국이 철강(72장) 수출제한 발표 [GTA]
 *     → 한국 72장 수입이 실제로 줄었나 [관세청]
 *       → 그 철강소가 어디 있나 [gem-steel]
 *
 * 이 세 단계를 잇는 건 흔치 않다. 그게 이 파이프라인의 존재 이유다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  발급 절차
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1. https://www.data.go.kr 회원가입
 *   2. "관세청_품목별 수출입실적(GW)" 활용신청
 *      https://www.data.go.kr/data/15101609/openapi.do
 *   3. 일부 관세청 API 는 UNIPASS 별도 가입이 필요하다
 *      (unipass.customs.go.kr → My Menu > 서비스 관리 > Open API 이용관리)
 *   4. .env 에 KCS_TRADE_API_KEY=... (일반 인증키 = 디코딩 키 권장)
 *
 * ⚠️ **활용신청 전 페이지 하단의 공공누리 유형을 반드시 확인할 것.**
 *    제2·4유형이면 상업적 이용(유료 티어)이 금지된다.
 *    통계 수치는 저작물성이 약해 제1유형이거나 표시가 없는 경우가 많다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  폴링 정책
 * ══════════════════════════════════════════════════════════════════════
 *
 * 관세청 무역통계는 **월간·10일 단위**로 갱신된다. 하루 1회면 충분하다.
 * 그 이상은 저작권법 제93조 2항 단서("반복적·체계적")에 걸릴 뿐 아니라
 * 개발계정 일일 한도(보통 1만 건)를 태운다.
 */
const fs = require("fs");
const path = require("path");
const { fetchAll, KoreaOpenDataError } = require("./lib/korea-open-data");
const {
  normalizeRows,
  aggregateByChapter,
  changeRate,
} = require("./lib/kcs-trade-parse");

const OUT_DIR = path.join(__dirname, "..", "public", "data");

/** 관세청_품목별 수출입실적(GW) */
const ENDPOINT =
  process.env.KCS_TRADE_ENDPOINT?.trim() ||
  "https://apis.data.go.kr/1220000/Itemtrade/getItemtradeList";

const API_KEY =
  process.env.KCS_TRADE_API_KEY?.trim() || process.env.DATA_GO_KR_API_KEY?.trim();

/**
 * 관심 HS 챕터 — GTA 매핑(src/lib/gta.ts HS_CHAPTER_TO_LAYER)과 맞춘다.
 * 전 품목을 긁으면 호출 한도를 태우고, 지도에 붙일 레이어도 없다.
 */
const WATCHED_CHAPTERS = [
  { hs: "25", label: "시멘트·석재", layer: "gem-cement" },
  { hs: "26", label: "광석·슬래그", layer: "gem-iron-ore" },
  { hs: "27", label: "광물성 연료", layer: "gem-oil-gas-extraction" },
  { hs: "28", label: "무기화학", layer: "gem-chemicals" },
  { hs: "29", label: "유기화학", layer: "gem-chemicals" },
  { hs: "72", label: "철강", layer: "gem-steel" },
  { hs: "73", label: "철강제품", layer: "gem-steel" },
  { hs: "76", label: "알루미늄", layer: "gem-iron-ore" },
  { hs: "85", label: "전기·전자 (반도체 포함)", layer: "ai-data-centers" },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** 기본: 최근 13개월 (전년 동월 비교가 가능하도록) */
function defaultRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { from: fmt(start), to: fmt(end) };
}

async function fetchChapter(chapter, from, to) {
  const { items, format } = await fetchAll(
    ENDPOINT,
    API_KEY,
    { strtYymm: from, endYymm: to, hsSgn: chapter.hs },
    { numOfRows: 500, maxPages: 10, delayMs: 1_200 },
  );
  return { rows: normalizeRows(items), format, raw: items.length };
}

async function main() {
  if (!API_KEY) {
    console.error(
      "\nKCS_TRADE_API_KEY 가 없다.\n" +
        "  1) https://www.data.go.kr 회원가입\n" +
        "  2) '관세청_품목별 수출입실적(GW)' 활용신청\n" +
        "     https://www.data.go.kr/data/15101609/openapi.do\n" +
        "  3) .env 에 KCS_TRADE_API_KEY=... (일반 인증키)\n\n" +
        "⚠️ 활용신청 페이지 하단의 **공공누리 유형**을 반드시 확인할 것.\n" +
        "   제2·4유형이면 유료 티어 노출이 금지된다.\n",
    );
    process.exit(1);
  }

  const from = arg("--from", defaultRange().from);
  const to = arg("--to", defaultRange().to);
  console.log(`관세청 무역통계 수집 — ${from} ~ ${to}`);

  const all = [];
  const perChapter = [];
  let format = "json";

  for (const chapter of WATCHED_CHAPTERS) {
    try {
      const { rows, format: f, raw } = await fetchChapter(chapter, from, to);
      format = f;
      all.push(...rows);
      perChapter.push({ ...chapter, rows: rows.length });
      console.log(`   HS ${chapter.hs} ${chapter.label}: ${rows.length}행 (원본 ${raw})`);
      // 응답은 있는데 정규화 후 0이면 필드명이 바뀐 것이다 — 조용히 넘기지 않는다
      if (raw > 0 && rows.length === 0) {
        console.warn(
          `   ⚠ HS ${chapter.hs}: 응답 ${raw}행이 전부 정규화 실패. ` +
            `필드명이 바뀌었는지 scripts/lib/kcs-trade-parse.js FIELD 를 확인할 것.`,
        );
      }
    } catch (error) {
      const msg = error instanceof KoreaOpenDataError ? error.message : String(error);
      console.warn(`   ✗ HS ${chapter.hs}: ${msg}`);
    }
    await new Promise((r) => setTimeout(r, 1_200));
  }

  if (all.length === 0) {
    console.error(
      "\n수집된 행이 0이다. 덮어쓰지 않고 중단한다.\n" +
        "  · 인증키가 승인 대기 중일 수 있다 (활용신청 후 1~2시간)\n" +
        "  · 엔드포인트가 바뀌었을 수 있다 — KCS_TRADE_ENDPOINT 로 덮어쓸 수 있다\n",
    );
    process.exit(1);
  }

  // 최신 기간 기준 챕터 집계 + 전년 동월 대비
  const periods = [...new Set(all.map((r) => r.period).filter(Boolean))].sort();
  const latest = periods.at(-1) ?? null;
  const yearAgo =
    latest && latest.length === 7
      ? `${Number(latest.slice(0, 4)) - 1}-${latest.slice(5, 7)}`
      : null;

  const latestAgg = aggregateByChapter(all.filter((r) => r.period === latest));
  const yearAgoAgg = new Map(
    aggregateByChapter(all.filter((r) => r.period === yearAgo)).map((a) => [a.hsChapter, a]),
  );

  const chapters = latestAgg.map((a) => {
    const prev = yearAgoAgg.get(a.hsChapter);
    const meta = WATCHED_CHAPTERS.find((c) => Number(c.hs) === a.hsChapter);
    return {
      ...a,
      label: meta?.label ?? null,
      // GTA `hs_chapter` · GEM 레이어와 조인하는 키
      mappedLayer: meta?.layer ?? null,
      exportYoY: prev ? changeRate(a.exportUsd, prev.exportUsd) : null,
      importYoY: prev ? changeRate(a.importUsd, prev.importUsd) : null,
    };
  });

  const payload = {
    fetchedAt: new Date().toISOString(),
    source: "관세청 무역통계 (품목별 수출입실적)",
    endpoint: ENDPOINT,
    attribution: "관세청 무역통계 · 공공데이터포털(data.go.kr)",
    license: "공공누리 유형은 데이터셋 페이지에서 확인 — 미확인 시 유료 노출 금지",
    format,
    range: { from, to },
    latestPeriod: latest,
    comparePeriod: yearAgo,
    note:
      "금액은 원본이 천 달러 단위다. exportUsd/importUsd 는 달러로 환산한 값이고, " +
      "exportThousandUsd/importThousandUsd 가 원본이다. 화면에 원본을 달러로 표기하면 1000배 틀린다.",
    chapterCount: chapters.length,
    rowCount: all.length,
    chapters,
    rows: all,
  };

  for (const profile of ["lite", "full"]) {
    const dir = path.join(OUT_DIR, profile);
    if (!fs.existsSync(dir)) continue;
    // lite 는 챕터 집계만 (행 단위는 무겁다)
    const slice =
      profile === "lite" ? { ...payload, rows: [], rowCount: 0 } : payload;
    fs.writeFileSync(
      path.join(dir, "kcs-trade.json"),
      `${JSON.stringify(slice)}\n`,
    );
    console.log(`   ✓ ${profile}: 챕터 ${chapters.length} · 행 ${slice.rows.length}`);
  }

  console.log("\n다음 단계:");
  console.log("  1) 데이터셋 페이지에서 공공누리 유형 확인");
  console.log("  2) sourceCatalog 의 kcs-trade 를 status:'shipped' 로");
  console.log("  3) node scripts/compress-data-gzip.js all");
  console.log("  4) npm run verify:data && npm run verify:commercial");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
