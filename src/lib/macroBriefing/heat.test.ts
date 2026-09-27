import { describe, expect, it } from "vitest";
import {
  computeThemeHeat,
  densityBadgeFromGdelt,
  rssIndependentKeys,
  trustBadgeFromRss,
} from "./heat";
import type { MacroGdeltInputEvent, MacroRssInputItem } from "./types";

function rss(
  partial: Partial<MacroRssInputItem> & Pick<MacroRssInputItem, "id" | "title" | "link">,
): MacroRssInputItem {
  return {
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "middle-east",
    trustTier: 1,
    urgencyScore: 70,
    ageMinutes: 20,
    ...partial,
  };
}

function gdelt(
  partial: Partial<MacroGdeltInputEvent> & Pick<MacroGdeltInputEvent, "id" | "lat" | "lng">,
): MacroGdeltInputEvent {
  return {
    title: "Event",
    sourceUrl: "https://reuters.com/x",
    eventTier: "war",
    tensionScore: 5,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("macroBriefing heat", () => {
  it("counts same-host republishes as one independent source", () => {
    const items = [
      rss({
        id: "1",
        title: "Hormuz traffic slows",
        link: "https://www.reuters.com/a",
        source: "Reuters",
      }),
      rss({
        id: "2",
        title: "Hormuz traffic slows - update",
        link: "https://www.reuters.com/b",
        source: "Reuters Wire",
      }),
      rss({
        id: "3",
        title: "Hormuz delays",
        link: "https://apnews.com/c",
        source: "AP",
        trustTier: 1,
      }),
    ];
    expect(rssIndependentKeys(items).sort()).toEqual(["apnews.com", "reuters.com"]);
    expect(trustBadgeFromRss(items)).toBe("corroborated");
  });

  it("ranks higher when RSS and GDELT both fire", () => {
    const items = [
      rss({
        id: "1",
        title: "Strike near Hormuz",
        link: "https://www.reuters.com/a",
      }),
      rss({
        id: "2",
        title: "Hormuz shipping alert",
        link: "https://apnews.com/b",
        source: "AP",
      }),
    ];
    const events = [
      gdelt({ id: "g1", lat: 26.5, lng: 56.2, tensionScore: 7 }),
      gdelt({ id: "g2", lat: 26.7, lng: 56.4, tensionScore: 6 }),
      gdelt({ id: "g3", lat: 26.4, lng: 56.1, tensionScore: 5 }),
      gdelt({ id: "g4", lat: 26.8, lng: 56.5, tensionScore: 8 }),
      gdelt({ id: "g5", lat: 26.55, lng: 56.25, tensionScore: 4 }),
    ];
    const rssOnly = computeThemeHeat(items, []);
    const both = computeThemeHeat(items, events);
    const gdeltOnly = computeThemeHeat([], events);
    expect(both).toBeGreaterThan(rssOnly);
    expect(gdeltOnly).toBeGreaterThan(0);
    expect(both).toBeGreaterThan(gdeltOnly);
  });

  it("separates density badge from media trust", () => {
    expect(densityBadgeFromGdelt(0, 0)).toBe("none");
    expect(densityBadgeFromGdelt(6, 2)).toBe("elevated");
    expect(densityBadgeFromGdelt(20, 5)).toBe("high");
    expect(densityBadgeFromGdelt(45, 7)).toBe("surge");
  });
});
