import { describe, expect, it } from "vitest";
import type { GoldStrike } from "@/data/gold/maritimeStrikes";
import { MARITIME_GOLD } from "@/data/gold/maritimeStrikes";
import { sameDate, scoreAgainstGold } from "./maritimeGold";

const g = (vessel: string, date: string, reviewed = true): GoldStrike => ({
  id: vessel, vessel, flag: null, date, place: "", outcome: "hit", sourceUrl: "u", reviewed,
});

describe("scoreAgainstGold", () => {
  it("리뷰 안 된 정답은 점수에 쓰지 않는다", () => {
    const s = scoreAgainstGold([{ vessel: "X", at: "2024-01-05" }], [g("X", "2024-01", false)]);
    expect(s.goldCount).toBe(0);
    expect(s.recall).toBeNull();
  });
  it("선명(접두어 무시)·날짜가 맞으면 일치", () => {
    const s = scoreAgainstGold([{ vessel: "MV Sounion", at: "2024-08-22T03:00:00Z" }], [g("Sounion", "2024-08-21")]);
    expect(s.matched).toBe(1);
    expect(s.precision).toBe(1);
    expect(s.recall).toBe(1);
  });
  it("놓친 건과 정답표에 없는 예측을 구분한다", () => {
    const s = scoreAgainstGold(
      [{ vessel: "Ghost", at: "2024-08-10" }],
      [g("Sounion", "2024-08-21"), g("Tutor", "2024-06")],
    );
    expect(s.missed).toEqual(["Sounion", "Tutor"]);
    expect(s.unmatchedPredictions[0]).toContain("Ghost");
    expect(s.precision).toBe(0);
  });
  it("정답표 기간 밖 예측은 정밀도에서 뺀다", () => {
    const s = scoreAgainstGold([{ vessel: "Late", at: "2026-01-01" }], [g("Sounion", "2024-08-21")]);
    expect(s.predictedCount).toBe(0);
    expect(s.precision).toBeNull();
  });
  it("월 단위 날짜는 같은 달이면 일치", () => {
    expect(sameDate("2024-03", "2024-03-30")).toBe(true);
    expect(sameDate("2024-03", "2024-04-01")).toBe(false);
  });
});

describe("MARITIME_GOLD 씨앗", () => {
  it("모든 줄에 출처가 있고 id가 겹치지 않는다", () => {
    expect(MARITIME_GOLD.every((x) => x.sourceUrl.startsWith("https://"))).toBe(true);
    expect(new Set(MARITIME_GOLD.map((x) => x.id)).size).toBe(MARITIME_GOLD.length);
  });
});
