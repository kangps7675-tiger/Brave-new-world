/**
 * 관세청 무역통계 파서 테스트.
 *
 * GEM 널섬 사고(2,000건)와 같은 교훈으로 만들었다:
 * **가장 틀리기 쉬운 변환은 의존성 없이 검증 가능해야 한다.**
 *
 * 이 데이터의 함정 셋:
 *   1. 금액 단위가 **천 달러** — 그대로 쓰면 1000배 틀린다
 *   2. HS 부호 앞자리 0 이 잘려 온다 ("208" ← "0208")
 *   3. 결측을 0 으로 만들면 "수출 없음"과 "데이터 없음"이 섞인다
 */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";

const require_ = createRequire(import.meta.url);
const kcs = require_(
  path.resolve(__dirname, "..", "..", "scripts", "lib", "kcs-trade-parse.js"),
) as typeof import("../../scripts/lib/kcs-trade-parse");

const {
  num,
  normalizeHs,
  normalizePeriod,
  normalizeRow,
  normalizeRows,
  aggregateByChapter,
  changeRate,
} = kcs as {
  num: (v: unknown) => number;
  normalizeHs: (v: unknown) => { code: string; digits: number; chapter: number } | null;
  normalizePeriod: (v: unknown) => string | null;
  normalizeRow: (row: Record<string, unknown>) => Record<string, unknown> | null;
  normalizeRows: (rows: unknown) => Array<Record<string, unknown>>;
  aggregateByChapter: (rows: unknown[]) => Array<Record<string, number>>;
  changeRate: (a: unknown, b: unknown) => number | null;
};

describe("HS 부호 정규화", () => {
  it("앞자리 0 이 잘려 와도 복원한다", () => {
    // 관세청 응답에서 실제로 발생하는 형태
    expect(normalizeHs("208")).toEqual({ code: "0208", digits: 4, chapter: 2 });
  });

  it.each([
    ["72", "72", 2, 72],
    ["7208", "7208", 4, 72],
    ["720851", "720851", 6, 72],
    ["7208510000", "7208510000", 10, 72],
    ["2601", "2601", 4, 26],
  ])("%s → %s (%i자리, 챕터 %i)", (input, code, digits, chapter) => {
    expect(normalizeHs(input)).toEqual({ code, digits, chapter });
  });

  it("구분자를 제거한다", () => {
    expect(normalizeHs("7208.51")).toEqual({ code: "720851", digits: 6, chapter: 72 });
  });

  it("해석 불가는 null", () => {
    for (const v of [null, undefined, "", "abc"]) {
      expect(normalizeHs(v)).toBeNull();
    }
  });
});

describe("기간 정규화", () => {
  it.each([
    ["202601", "2026-01"],
    ["2026-01", "2026-01"],
    ["2026.01", "2026-01"],
    ["2026", "2026"],
    ["20260131", "2026-01-31"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePeriod(input)).toBe(expected);
  });

  it("자릿수가 안 맞으면 null", () => {
    expect(normalizePeriod("2026013")).toBeNull();
  });
});

describe("행 정규화 — 천 달러 단위", () => {
  it("원본(천 달러)과 환산값(달러)을 모두 보존한다", () => {
    const r = normalizeRow({ hsSgn: "7208", year: "202601", expDlr: "1234", impDlr: "5678" });
    expect(r).not.toBeNull();
    // 원본 단위 그대로
    expect(r!.exportThousandUsd).toBe(1234);
    // 달러 환산 — 화면에 쓸 값
    expect(r!.exportUsd).toBe(1_234_000);
    expect(r!.importUsd).toBe(5_678_000);
  });

  it("쉼표가 들어간 금액을 처리한다", () => {
    const r = normalizeRow({ hsSgn: "7208", year: "202601", expDlr: "1,234,567" });
    expect(r!.exportThousandUsd).toBe(1_234_567);
  });

  it("결측은 null 이다 — 0 으로 만들지 않는다", () => {
    // "수출 없음"과 "데이터 없음"은 다르다
    const r = normalizeRow({ hsSgn: "7208", year: "202601" });
    expect(r!.exportUsd).toBeNull();
    expect(r!.balanceThousandUsd).toBeNull();
  });

  it("무역수지를 계산하고, 응답에 있으면 그걸 쓴다", () => {
    const calc = normalizeRow({ hsSgn: "7208", year: "202601", expDlr: "1000", impDlr: "400" });
    expect(calc!.balanceThousandUsd).toBe(600);

    const given = normalizeRow({
      hsSgn: "7208",
      year: "202601",
      expDlr: "1000",
      impDlr: "400",
      balPayments: "599",
    });
    expect(given!.balanceThousandUsd).toBe(599);
  });

  it("필드 별칭을 받는다 (API 마다 표기가 다르다)", () => {
    const r = normalizeRow({ hsCd: "2601", statYymm: "202512", expUsdAmt: "77" });
    expect(r!.hsCode).toBe("2601");
    expect(r!.period).toBe("2025-12");
    expect(r!.exportThousandUsd).toBe(77);
  });

  it("HS·기간이 둘 다 없으면 버린다 (집계행·헤더행 제거)", () => {
    expect(normalizeRow({ expDlr: "999" })).toBeNull();
  });

  it("비객체 입력에 안전하다", () => {
    for (const v of [null, undefined, "x", 1]) {
      expect(normalizeRow(v as never)).toBeNull();
    }
  });
});

describe("챕터 집계 — GTA 조인 키", () => {
  it("HS 챕터(앞 2자리)로 합산한다", () => {
    const rows = normalizeRows([
      { hsSgn: "720851", year: "202601", expDlr: "100", impDlr: "50" },
      { hsSgn: "720852", year: "202601", expDlr: "200", impDlr: "70" },
      { hsSgn: "2601", year: "202601", expDlr: "300", impDlr: "10" },
    ]);
    const agg = aggregateByChapter(rows);
    expect(agg.map((a) => a.hsChapter)).toEqual([26, 72]);

    const steel = agg.find((a) => a.hsChapter === 72)!;
    expect(steel.exportUsd).toBe(300_000);
    expect(steel.rows).toBe(2);
  });

  it("챕터가 없는 행은 제외한다", () => {
    expect(
      aggregateByChapter([{ hsChapter: null, exportUsd: 9 }, { hsChapter: 72, exportUsd: 1 }] as never),
    ).toHaveLength(1);
  });
});

describe("변화율 — 0 나눗셈 방지", () => {
  it("정상 계산", () => {
    expect(changeRate(120, 100)).toBeCloseTo(0.2);
    expect(changeRate(80, 100)).toBeCloseTo(-0.2);
  });

  it("기저가 0 이면 null — Infinity 를 화면에 그리면 안 된다", () => {
    expect(changeRate(100, 0)).toBeNull();
  });

  it("결측이면 null", () => {
    expect(changeRate(null, 100)).toBeNull();
    expect(changeRate(100, null)).toBeNull();
  });

  it("음수 기저는 절대값 기준", () => {
    expect(changeRate(-50, -100)).toBeCloseTo(0.5);
  });
});

describe("num() — Number(null) 함정", () => {
  it("null·빈문자·하이픈은 NaN", () => {
    for (const v of [null, undefined, "", "   ", "-"]) {
      expect(num(v)).toBeNaN();
    }
  });

  it("쉼표를 제거하고 변환한다", () => {
    expect(num("1,234,567")).toBe(1_234_567);
  });

  it("0 은 살린다", () => {
    expect(num("0")).toBe(0);
  });
});
