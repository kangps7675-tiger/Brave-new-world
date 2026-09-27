import { describe, expect, it } from "vitest";
import { assignGdeltTheme, assignRssTheme } from "./assignTheme";
import { buildMacroBriefing } from "./rollup";
import type { MacroGdeltInputEvent, MacroRssInputItem } from "./types";

function rss(
  partial: Partial<MacroRssInputItem> & Pick<MacroRssInputItem, "id" | "title" | "link">,
): MacroRssInputItem {
  return {
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "middle-east",
    trustTier: 1,
    urgencyScore: 80,
    ageMinutes: 15,
    feedTopic: "defense",
    ...partial,
  };
}

describe("macroBriefing rollup", () => {
  it("merges Hormuz security RSS + nearby GDELT into one choke theme", () => {
    const items: MacroRssInputItem[] = [
      rss({
        id: "r1",
        title: "Navy escorts tankers through Strait of Hormuz after drone attack",
        link: "https://www.reuters.com/hormuz-1",
        summary: "IRGC threat military blockade Hormuz",
      }),
      rss({
        id: "r2",
        title: "Hormuz shipping risk rises as naval clash reported",
        link: "https://apnews.com/hormuz-2",
        source: "AP",
      }),
    ];
    const gdelt: MacroGdeltInputEvent[] = Array.from({ length: 8 }, (_, i) => ({
      id: `g${i}`,
      lat: 26.5 + i * 0.02,
      lng: 56.2 + i * 0.02,
      title: "GDELT point",
      sourceUrl: `https://example.com/${i}`,
      eventTier: "war",
      tensionScore: 6,
      createdAt: new Date().toISOString(),
    }));

    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "ko",
      rssItems: items,
      gdeltEvents: gdelt,
      newsSource: "live",
      gdeltSource: "d1",
    });

    expect(payload.topics.length).toBeGreaterThan(0);
    const top = payload.topics[0];
    expect(top.id).toBe("choke:hormuz");
    expect(top.rssIndependentSources).toBeGreaterThanOrEqual(2);
    expect(top.gdeltEventCount24h).toBe(8);
    expect(top.trustBadge).toBe("corroborated");
    expect(top.densityBadge).not.toBe("none");
    expect(top.steps.some((s) => s.kind === "rss-catalyst")).toBe(true);
    expect(top.steps.some((s) => s.kind === "gdelt-density")).toBe(true);
  });

  it("does not invent story steps for GDELT-only hot themes", () => {
    const gdelt: MacroGdeltInputEvent[] = Array.from({ length: 12 }, (_, i) => ({
      id: `g${i}`,
      lat: 48.5,
      lng: 34 + i * 0.05,
      title: null,
      sourceUrl: null,
      eventTier: "war",
      tensionScore: 7,
      importanceGrade: "A",
      createdAt: new Date().toISOString(),
    }));

    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "ko",
      rssItems: [],
      gdeltEvents: gdelt,
    });

    const ua = payload.topics.find((t) => t.id === "theater:russia-ukraine");
    expect(ua).toBeTruthy();
    expect(ua!.rssIndependentSources).toBe(0);
    expect(ua!.steps.every((s) => s.kind === "gdelt-density")).toBe(true);
    expect(ua!.steps[0].body).toMatch(/밀도|GDELT/);
    expect(ua!.steps[0].body).not.toMatch(/침공했다|승리했다/);
  });

  it("splits geo security vs econ shipping angles for Hormuz", () => {
    const security = rss({
      id: "s1",
      title: "Destroyer escorts convoy near Hormuz after missile threat",
      link: "https://www.reuters.com/sec",
      summary: "navy blockade military strike",
      feedTopic: "defense",
    });
    const economy = rss({
      id: "e1",
      title: "Oil freight rates jump as Hormuz tanker insurance soars",
      link: "https://www.reuters.com/econ",
      summary: "shipping freight crude insurance premium",
      feedTopic: "economy",
      econGenre: "shipping",
      theater: "middle-east",
    });

    expect(assignRssTheme(security, "geo")).toBe("choke:hormuz");
    expect(assignRssTheme(economy, "econ")).toBe("choke:hormuz");

    const geo = buildMacroBriefing({
      domain: "geo",
      lang: "en",
      rssItems: [security],
      gdeltEvents: [],
    });
    const econ = buildMacroBriefing({
      domain: "econ",
      lang: "en",
      rssItems: [economy],
      gdeltEvents: [],
    });
    expect(geo.topics.some((t) => t.id === "choke:hormuz")).toBe(true);
    expect(econ.topics.some((t) => t.id === "choke:hormuz")).toBe(true);
  });

  it("maps GDELT near Hormuz to choke theme", () => {
    expect(
      assignGdeltTheme(
        {
          id: "1",
          lat: 26.6,
          lng: 56.3,
          title: null,
          sourceUrl: null,
          eventTier: "war",
        },
        "geo",
      ),
    ).toBe("choke:hormuz");
  });
});
