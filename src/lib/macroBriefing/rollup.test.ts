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

  it("does not snap Levant GDELT to Suez choke", () => {
    expect(
      assignGdeltTheme(
        {
          id: "gaza",
          lat: 31.5,
          lng: 34.47,
          title: null,
          sourceUrl: null,
          eventTier: "war",
        },
        "geo",
      ),
    ).toBe("theater:middle-east");
  });

  it("flies RSS catalyst to place match, not theme center only", () => {
    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "en",
      rssItems: [
        rss({
          id: "kyiv",
          title: "Explosion reported near Kyiv as air raid sirens sound",
          link: "https://www.reuters.com/kyiv-1",
          theater: "russia-ukraine",
          summary: "air defense Kyiv",
        }),
      ],
      gdeltEvents: [],
    });
    const topic = payload.topics.find((t) => t.id === "theater:russia-ukraine");
    expect(topic).toBeTruthy();
    const catalyst = topic!.steps.find((s) => s.kind === "rss-catalyst");
    expect(catalyst).toBeTruthy();
    // Kyiv ~50.45, 30.52 — not theater centroid (48.5, 34)
    expect(catalyst!.camera.lat).toBeGreaterThan(50);
    expect(catalyst!.camera.lat).toBeLessThan(51);
    expect(catalyst!.camera.lng).toBeGreaterThan(30);
    expect(catalyst!.camera.lng).toBeLessThan(31.5);
  });

  it("flies to gazetteer city from Korean title (Taipei)", () => {
    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "ko",
      rssItems: [
        rss({
          id: "tpe",
          title: "Taiwan drills near Taipei amid PLA pressure",
          titleKo: "타이베이 인근에서 대만군 훈련",
          link: "https://www.reuters.com/taipei-1",
          theater: "china-taiwan",
        }),
      ],
      gdeltEvents: [],
    });
    const topic = payload.topics.find((t) => t.id === "theater:china-taiwan");
    expect(topic).toBeTruthy();
    const catalyst = topic!.steps.find((s) => s.kind === "rss-catalyst");
    expect(catalyst).toBeTruthy();
    // Taipei ~25.03, 121.57
    expect(catalyst!.camera.lat).toBeGreaterThan(24.5);
    expect(catalyst!.camera.lat).toBeLessThan(25.5);
    expect(catalyst!.camera.lng).toBeGreaterThan(121);
    expect(catalyst!.camera.lng).toBeLessThan(122);
  });

  it("flies GDELT density to densest cell, not mean centroid", () => {
    const dense = Array.from({ length: 8 }, (_, i) => ({
      id: `d${i}`,
      lat: 48.4 + i * 0.01,
      lng: 37.8 + i * 0.01,
      title: null,
      sourceUrl: null,
      eventTier: "war" as const,
      tensionScore: 8,
      createdAt: new Date().toISOString(),
    }));
    const outliers = [
      {
        id: "o1",
        lat: 55.0,
        lng: 37.6,
        title: null,
        sourceUrl: null,
        eventTier: "war" as const,
        tensionScore: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: "o2",
        lat: 59.9,
        lng: 30.3,
        title: null,
        sourceUrl: null,
        eventTier: "war" as const,
        tensionScore: 2,
        createdAt: new Date().toISOString(),
      },
    ];
    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "en",
      rssItems: [],
      gdeltEvents: [...dense, ...outliers],
    });
    const ua = payload.topics.find((t) => t.id === "theater:russia-ukraine");
    expect(ua).toBeTruthy();
    const gdeltStep = ua!.steps.find((s) => s.kind === "gdelt-density");
    expect(gdeltStep).toBeTruthy();
    // densest around Donbas ~48.4, 37.8 — not pulled north by Moscow/Petersburg
    expect(gdeltStep!.camera.lat).toBeGreaterThan(48);
    expect(gdeltStep!.camera.lat).toBeLessThan(49.5);
    expect(gdeltStep!.camera.lng).toBeGreaterThan(37);
    expect(gdeltStep!.camera.lng).toBeLessThan(39);
  });

  it("econ chips theme camera is East Asia, not Africa", () => {
    const payload = buildMacroBriefing({
      domain: "econ",
      lang: "en",
      rssItems: [
        rss({
          id: "chip1",
          title: "TSMC raises advanced chip CapEx amid AI demand",
          link: "https://www.reuters.com/tsmc",
          feedTopic: "economy",
          econGenre: "chips",
          theater: "china-taiwan",
        }),
      ],
      gdeltEvents: [],
    });
    const chips = payload.topics.find((t) => t.id === "econ:chips");
    expect(chips).toBeTruthy();
    expect(chips!.camera.lng).toBeGreaterThan(100);
    expect(chips!.camera.lat).toBeGreaterThan(20);
    expect(chips!.camera.lat).toBeLessThan(30);
  });
});
