import { describe, expect, it } from "vitest";
import { classifyMediaTier } from "@/lib/news/mediaTiers";

describe("classifyMediaTier — 짧은 이름이 주소 속 단어에 걸리지 않는다", () => {
  it("주소에 report가 있어도 일반 매체를 국영(3)으로 보지 않는다", () => {
    expect(
      classifyMediaTier(
        "NBC News",
        "https://www.nbcnews.com/world/russia-ukraine/ukraine-russia-prisoner-swap-report-rcna1.html",
      ),
    ).toBe(2);
    expect(
      classifyMediaTier("WZTV", "https://fox17.com/news/world/airport-sport-short-story"),
    ).toBe(2);
  });

  it("주소에 option·reference가 있어도 와이어(1)로 올리지 않는다", () => {
    expect(
      classifyMediaTier("Some Blog", "https://example.com/option-reference-transaction"),
    ).toBe(2);
  });

  it("진짜 RT·TASS·DoD는 그대로 3등급", () => {
    expect(classifyMediaTier("RT", "https://www.rt.com/news/123")).toBe(3);
    expect(classifyMediaTier("TASS", "https://tass.com/world/1")).toBe(3);
    expect(classifyMediaTier("DoD", "https://www.defense.gov/News/1")).toBe(3);
  });

  it("진짜 1등급은 그대로", () => {
    expect(classifyMediaTier("Reuters", "https://www.reuters.com/world/x")).toBe(1);
    expect(classifyMediaTier("PTI", "https://www.ptinews.com/x")).toBe(1);
  });
});
