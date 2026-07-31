/**
 * 한국 공공데이터 파서 회귀 테스트 — 해수부 · ECOS · KOSIS.
 *
 * GEM 널섬 사고와 같은 원칙: **가장 틀리기 쉬운 변환은 의존성 없이 검증한다.**
 *
 * 이 세 소스의 공통 함정:
 *   · 실패를 **HTTP 200** 으로 준다 (본문에 에러 코드) → 조용한 실패
 *   · 결측을 0 으로 만들면 "환율 0원" 같은 가짜 값이 생긴다
 *   · 주기·단위가 한 응답에 섞인다
 */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";

const require_ = createRequire(import.meta.url);
const LIB = path.resolve(__dirname, "..", "..", "scripts", "lib");

const mof = require_(path.join(LIB, "mof-port-parse.js")) as {
  normalizePortCode: (v: unknown) => { code: string; scheme: string; country: string | null } | null;
  normalizeDirection: (v: unknown) => string | null;
  normalizeDate: (v: unknown) => string | null;
  normalizeMovement: (row: unknown) => Record<string, unknown> | null;
  normalizeMovements: (rows: unknown) => Array<Record<string, unknown>>;
  aggregateByPort: (rows: unknown[]) => Array<Record<string, unknown>>;
  aggregateFlows: (rows: unknown[], o?: { minCount?: number }) => Array<Record<string, unknown>>;
};

const ek = require_(path.join(LIB, "ecos-kosis-parse.js")) as {
  ecosError: (p: unknown) => { code: string; message: string } | null;
  ecosPeriod: (raw: unknown, cycle?: unknown) => { period: string; cycle: string } | null;
  normalizeEcosRow: (row: unknown) => Record<string, unknown> | null;
  normalizeEcosRows: (p: unknown) => Array<Record<string, unknown>>;
  kosisError: (p: unknown) => { code: string; message: string } | null;
  normalizeKosisRow: (row: unknown) => Record<string, unknown> | null;
  normalizeKosisRows: (p: unknown) => Array<Record<string, unknown>>;
  latestChange: (rows: Array<Record<string, unknown>>) => Record<string, unknown> | null;
};

// ─────────────────────────────────────────────────────────────────────
//  해수부
// ─────────────────────────────────────────────────────────────────────

describe("해수부 — 항구 코드 체계 혼재", () => {
  it("UN/LOCODE 를 인식한다", () => {
    expect(mof.normalizePortCode("KRPUS")).toEqual({
      code: "KRPUS",
      scheme: "unlocode",
      country: "KR",
    });
  });

  it("자체 코드는 national 로 표시한다", () => {
    expect(mof.normalizePortCode("020")).toEqual({
      code: "020",
      scheme: "national",
      country: null,
    });
  });
});

describe("해수부 — 입출항 방향 표기 제각각", () => {
  it.each(["I", "IN", "ENTRY", "입항", "입"])("%s → entry", (v) => {
    expect(mof.normalizeDirection(v)).toBe("entry");
  });

  it.each(["O", "OUT", "DEPARTURE", "출항", "출"])("%s → departure", (v) => {
    expect(mof.normalizeDirection(v)).toBe("departure");
  });

  it("모르는 값은 null — 추측하지 않는다", () => {
    for (const v of ["X", "??", "기타"]) {
      expect(mof.normalizeDirection(v)).toBeNull();
    }
  });
});

describe("해수부 — 날짜에 시각이 붙기도 안 붙기도", () => {
  it.each([
    ["20260131", "2026-01-31"],
    ["202601311430", "2026-01-31T14:30"],
    ["20260131143055", "2026-01-31T14:30:55"],
    ["202601", "2026-01"],
  ])("%s → %s", (input, expected) => {
    expect(mof.normalizeDate(input)).toBe(expected);
  });
});

describe("해수부 — 입출항 정규화", () => {
  it("다음항·목적지를 보존한다 (이 데이터셋의 값어치)", () => {
    const r = mof.normalizeMovement({
      prtAgNm: "부산",
      etryDprtSe: "O",
      etryDt: "20260131",
      nxtPrtNm: "상하이",
      dstnPrtNm: "로테르담",
      cargoWt: "12,500",
    })!;
    expect(r.nextPort).toBe("상하이");
    expect(r.destination).toBe("로테르담");
    expect(r.cargoWeightTon).toBe(12_500);
    expect(r.direction).toBe("departure");
  });

  it("톤수를 단위별로 분리한다 — 합산하면 무의미하다", () => {
    // G/T(총톤수)와 D/W/T(재화중량톤수)는 서로 다른 개념이다
    const r = mof.normalizeMovement({
      prtAgNm: "울산",
      grsTong: "50000",
      dwt: "98000",
      cargoWt: "75000",
    })!;
    expect(r.grossTonnage).toBe(50_000);
    expect(r.deadweightTonnage).toBe(98_000);
    expect(r.cargoWeightTon).toBe(75_000);
  });

  it("결측은 null 이다 — 0 으로 만들지 않는다", () => {
    const r = mof.normalizeMovement({ prtAgNm: "인천", etryDt: "20260131" })!;
    expect(r.cargoWeightTon).toBeNull();
    expect(r.grossTonnage).toBeNull();
  });

  it("항구·날짜가 모두 없으면 버린다", () => {
    expect(mof.normalizeMovement({ cargoWt: "999" })).toBeNull();
  });
});

describe("해수부 — 목적지 흐름 (초크포인트 연결)", () => {
  it("from→to 로 집계한다", () => {
    const rows = mof.normalizeMovements([
      { prtAgNm: "부산", dstnPrtNm: "로테르담", cargoWt: "1000" },
      { prtAgNm: "부산", dstnPrtNm: "로테르담", cargoWt: "2000" },
      { prtAgNm: "부산", dstnPrtNm: "상하이", cargoWt: "500" },
    ]);
    const flows = mof.aggregateFlows(rows);
    expect(flows[0]!.to).toBe("로테르담");
    expect(flows[0]!.count).toBe(2);
    expect(flows[0]!.cargoWeightTon).toBe(3000);
  });

  it("출발지 = 목적지인 행은 제외한다", () => {
    const rows = mof.normalizeMovements([{ prtAgNm: "부산", dstnPrtNm: "부산" }]);
    expect(mof.aggregateFlows(rows)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
//  ECOS
// ─────────────────────────────────────────────────────────────────────

describe("ECOS — HTTP 200 으로 오는 실패", () => {
  it("INFO-000 은 정상", () => {
    expect(ek.ecosError({ RESULT: { CODE: "INFO-000" } })).toBeNull();
  });

  it("그 외 코드는 실패로 잡는다", () => {
    const e = ek.ecosError({ RESULT: { CODE: "INFO-200", MESSAGE: "데이터 없음" } });
    expect(e?.code).toBe("INFO-200");
  });

  it("normalizeEcosRows 가 예외를 던진다 — 조용히 빈 배열을 돌려주지 않는다", () => {
    expect(() =>
      ek.normalizeEcosRows({ RESULT: { CODE: "INFO-100", MESSAGE: "인증키 오류" } }),
    ).toThrow(/INFO-100/);
  });
});

describe("ECOS — 주기 혼재", () => {
  it("분기는 5자리로 온다 — 월(6자리)과 헷갈리면 안 된다", () => {
    expect(ek.ecosPeriod("20261")).toEqual({ period: "2026Q1", cycle: "quarterly" });
    expect(ek.ecosPeriod("202601")).toEqual({ period: "2026-01", cycle: "monthly" });
  });

  it.each([
    ["2026", "2026", "annual"],
    ["20260131", "2026-01-31", "daily"],
  ])("%s → %s (%s)", (input, period, cycle) => {
    expect(ek.ecosPeriod(input)).toEqual({ period, cycle });
  });
});

describe("ECOS — 결측 처리", () => {
  it("결측을 null 로 둔다 — 환율 0원이 되면 차트가 무너진다", () => {
    for (const v of ["", "-", "..."]) {
      const r = ek.normalizeEcosRow({ TIME: "20260131", DATA_VALUE: v })!;
      expect(r.value, `DATA_VALUE=${JSON.stringify(v)}`).toBeNull();
    }
  });

  it("쉼표가 든 값을 처리한다", () => {
    const r = ek.normalizeEcosRow({ TIME: "20260131", DATA_VALUE: "1,432.5" })!;
    expect(r.value).toBe(1432.5);
  });
});

// ─────────────────────────────────────────────────────────────────────
//  KOSIS
// ─────────────────────────────────────────────────────────────────────

describe("KOSIS — 정상은 배열, 실패는 객체", () => {
  it("배열이면 정상", () => {
    expect(ek.kosisError([{ PRD_DE: "202601" }])).toBeNull();
  });

  it("err 필드가 있으면 실패", () => {
    expect(ek.kosisError({ err: "30", errMsg: "등록되지 않은 인증키" })?.code).toBe("30");
  });

  it("normalizeKosisRows 가 예외를 던진다", () => {
    expect(() => ek.normalizeKosisRows({ err: "30", errMsg: "키 오류" })).toThrow(/30/);
  });
});

describe("KOSIS — 행 정규화", () => {
  it("단위를 보존한다 — 버리면 다른 지표를 같은 축에 그리게 된다", () => {
    const r = ek.normalizeKosisRow({
      TBL_ID: "DT_1EA1",
      PRD_DE: "202601",
      PRD_SE: "M",
      DT: "1,234",
      UNIT_NM: "천toe",
      ITM_NM: "석유",
    })!;
    expect(r.value).toBe(1234);
    expect(r.unit).toBe("천toe");
    expect(r.period).toBe("2026-01");
  });
});

// ─────────────────────────────────────────────────────────────────────
//  공통 — 최신값·변화율
// ─────────────────────────────────────────────────────────────────────

describe("latestChange", () => {
  it("최신값과 전기 대비 변화율", () => {
    const c = ek.latestChange([
      { period: "2026-01", value: 100 },
      { period: "2026-02", value: 120 },
    ])!;
    expect(c.value).toBe(120);
    expect(c.changeRate as number).toBeCloseTo(0.2);
  });

  it("결측 구간을 건너뛰고 몇 개를 건너뛰었는지 보고한다", () => {
    // 결측을 0 으로 채우면 가짜 급락이 생긴다
    const c = ek.latestChange([
      { period: "2026-01", value: 100 },
      { period: "2026-02", value: null },
      { period: "2026-03", value: 110 },
    ])!;
    expect(c.value).toBe(110);
    expect(c.previousValue).toBe(100);
    expect(c.missingCount).toBe(1);
  });

  it("기저가 0 이면 변화율은 null — Infinity 를 그리면 안 된다", () => {
    const c = ek.latestChange([
      { period: "2026-01", value: 0 },
      { period: "2026-02", value: 50 },
    ])!;
    expect(c.changeRate).toBeNull();
  });

  it("전부 결측이거나 비어 있으면 null", () => {
    expect(ek.latestChange([{ period: "2026-01", value: null }])).toBeNull();
    expect(ek.latestChange([])).toBeNull();
  });
});
