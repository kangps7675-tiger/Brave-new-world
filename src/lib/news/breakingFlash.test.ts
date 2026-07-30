import { describe, expect, it } from "vitest";
import {
  detectSupplyChainLinks,
  extractFlashActors,
  formatActorsLine,
  formatSupplyChainBridge,
  formatWhyImportant,
} from "@/lib/news/breakingFlashNarrative";
import {
  buildBreakingFlashBriefing,
  shouldOpenBreakingFlash,
  formatFlashSourceAttribution,
} from "@/lib/news/breakingFlash";
import type { HeroBreakingItem } from "@/lib/news/types";

function hero(partial: Partial<HeroBreakingItem> & Pick<HeroBreakingItem, "title">): HeroBreakingItem {
  return {
    id: partial.id ?? "h1",
    title: partial.title,
    link: "https://example.com",
    source: partial.source ?? "Reuters",
    publisher: partial.publisher,
    pubDate: new Date().toISOString(),
    theater: partial.theater ?? "russia-ukraine",
    trustTier: partial.trustTier ?? 1,
    heroStatus: "breaking",
    urgencyScore: (partial.breakingGrade ?? 9) * 10,
    breakingGrade: partial.breakingGrade ?? 9,
    breakingRank: partial.breakingRank ?? "S",
    ageMinutes: partial.ageMinutes ?? 20,
    summary: partial.summary,
    feedTopic: partial.feedTopic,
  };
}

describe("breakingFlashNarrative", () => {
  it("extracts active → passive from strike wording", () => {
    const a = extractFlashActors(
      "Russia strikes Ukraine energy grid with missiles",
      "en",
    );
    expect(a.active).toBe("Russia");
    expect(a.passive).toBe("Ukraine");
  });

  it("formats Korean actor line", () => {
    const a = extractFlashActors("러시아가 우크라이나를 공습", "ko");
    expect(a.active).toBe("러시아");
    expect(a.passive).toBe("우크라이나");
    const line = formatActorsLine(a, "ko");
    expect(line).toBeTruthy();
    expect(line!).toMatch(/능동/);
    expect(line!).toMatch(/피동/);
  });

  it("why-important mentions theater stakes", () => {
    expect(formatWhyImportant("middle-east", "airstrike hormuz", "ko")).toMatch(/왜 중요/);
  });

  it("detects event-level supply-chain axes", () => {
    expect(detectSupplyChainLinks("PLA drills near Taiwan Strait; TSMC fabs watch")).toEqual([
      "chokepoint",
      "chips",
    ]);
    expect(detectSupplyChainLinks("Celebrity visits summit")).toEqual([]);
  });

  it("formats supply-chain bridge only when signals exist", () => {
    expect(formatSupplyChainBridge("routine diplomacy talks", "ko")).toBeNull();
    const line = formatSupplyChainBridge(
      "Houthi strike raises Red Sea freight and war-risk insurance",
      "ko",
    );
    expect(line).toMatch(/^공급망 연결:/);
    expect(line).toMatch(/통항|운임|보험/);
  });
});

describe("buildBreakingFlashBriefing supply bridge", () => {
  it("adds supply-chain paragraph on geopolitics flash when linked", () => {
    const briefing = buildBreakingFlashBriefing(
      hero({
        title: "Missile strike near Hormuz disrupts tanker traffic",
        summary: "War-risk premiums jump on crude tankers",
        theater: "middle-east",
        feedTopic: "defense",
      }),
      "ko",
      false,
    );
    expect(briefing.mode).toBe("conflict");
    expect(briefing.paragraphs.some((p) => p.startsWith("공급망 연결:"))).toBe(true);
  });

  it("omits supply-chain paragraph when no logistics signal", () => {
    const briefing = buildBreakingFlashBriefing(
      hero({
        title: "Artillery duel reported on eastern front",
        summary: "Front-line positions exchanged fire overnight",
        theater: "russia-ukraine",
      }),
      "ko",
      false,
    );
    expect(briefing.paragraphs.some((p) => p.startsWith("공급망 연결:"))).toBe(false);
  });
});

describe("formatFlashSourceAttribution", () => {
  it("puts outlet and age on the attribution line", () => {
    const line = formatFlashSourceAttribution(
      hero({ title: "x", source: "Reuters", ageMinutes: 12 }),
      "ko",
    );
    expect(line).toMatch(/^출처:/);
    expect(line).toContain("Reuters");
    expect(line).toMatch(/12분/);
  });
});

describe("shouldOpenBreakingFlash", () => {
  it("allows S kinetic within rapid window", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Missile barrage hits Kyiv", breakingRank: "S", breakingGrade: 9, ageMinutes: 20 }),
        false,
      ),
    ).toBe(true);
  });

  it("rejects soft / stale / low grade", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Celebrity visits summit", breakingRank: "S", breakingGrade: 9 }),
        false,
      ),
    ).toBe(false);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Diplomats meet for talks",
          breakingRank: "A",
          breakingGrade: 7,
        }),
        false,
      ),
    ).toBe(false);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Missile strike reported",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 90,
        }),
        false,
      ),
    ).toBe(false);
  });
});
