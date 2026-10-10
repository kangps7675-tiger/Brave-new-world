import { describe, expect, it } from "vitest";
import { marketHintForTheme } from "./marketAssets";
import { buildMacroBriefing } from "./rollup";
import type { MacroRssInputItem } from "./types";

function rss(
  partial: Partial<MacroRssInputItem> & Pick<MacroRssInputItem, "id" | "title" | "link">,
): MacroRssInputItem {
  return {
    source: "Reuters",
    pubDate: new Date(Date.now() - 30 * 60_000).toISOString(),
    theater: "middle-east",
    trustTier: 1,
    urgencyScore: 80,
    ageMinutes: 30,
    feedTopic: "defense",
    ...partial,
  };
}

describe("macro market assets", () => {
  it("maps Hormuz choke to oil/gas/VIX preferred set", () => {
    const hint = marketHintForTheme("choke:hormuz", "ko");
    expect(hint.chokepointId).toBe("choke-hormuz");
    expect(hint.symbols).toEqual(expect.arrayContaining(["CL=F", "BZ=F", "NG=F", "^VIX"]));
    expect(hint.symbols.length).toBeLessThanOrEqual(6);
    expect(hint.note).toMatch(/초크 연계|원유|호르무즈|에너지/);
  });

  it("maps russia-ukraine theater to grain/energy economy set", () => {
    const hint = marketHintForTheme("theater:russia-ukraine", "en");
    expect(hint.theater).toBe("russia-ukraine");
    expect(hint.symbols).toEqual(expect.arrayContaining(["ZW=F", "CL=F", "^VIX"]));
    expect(hint.chokepointId).toBeNull();
  });

  it("attaches marketSymbols on rollup topics", () => {
    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "ko",
      rssItems: [
        rss({
          id: "r1",
          title: "Navy escorts tankers through Strait of Hormuz after drone attack",
          link: "https://www.reuters.com/hormuz-1",
          summary: "IRGC threat military blockade Hormuz",
        }),
      ],
      gdeltEvents: [],
    });
    const top = payload.topics.find((t) => t.id === "choke:hormuz");
    expect(top).toBeTruthy();
    expect(top!.marketSymbols.length).toBeGreaterThan(0);
    expect(top!.marketChokepointId).toBe("choke-hormuz");
    expect(top!.marketAgeMinutes).toBeGreaterThanOrEqual(0);
    expect(top!.marketNote.length).toBeGreaterThan(0);
  });
});
