import { describe, expect, it } from "vitest";
import { shouldOpenBreakingFlash } from "@/lib/news/breakingFlash";
import type { HeroBreakingItem } from "@/lib/news/types";

function hero(title: string, feedTopic?: HeroBreakingItem["feedTopic"]): HeroBreakingItem {
  return {
    id: title,
    title,
    link: "https://example.com",
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "middle-east",
    trustTier: 1,
    heroStatus: "breaking",
    urgencyScore: 90,
    breakingGrade: 9,
    breakingRank: "S",
    ageMinutes: 20,
    feedTopic,
  } as HeroBreakingItem;
}

describe("투자 화면을 내린 기본 상태", () => {
  it("지경학 신속 속보(연준·시장)는 띄우지 않는다", () => {
    expect(shouldOpenBreakingFlash(hero("Fed signals aggressive rate cut path", "economy"), true)).toBe(false);
  });

  it("지정학 속보는 그대로 띄운다", () => {
    expect(shouldOpenBreakingFlash(hero("Missile strike hits port in Odesa"), false)).toBe(true);
  });
});
