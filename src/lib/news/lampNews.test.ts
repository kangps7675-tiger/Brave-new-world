import { describe, expect, it } from "vitest";
import {
  ensureLampFeaturedNews,
  isNaturalDisasterNews,
  pickConflictLampNews,
} from "./periodicBriefing";

describe("isNaturalDisasterNews", () => {
  it("지진·태풍·홍수 키워드를 잡는다", () => {
    expect(isNaturalDisasterNews("Magnitude 7.1 earthquake hits Japan")).toBe(true);
    expect(isNaturalDisasterNews("태풍 상륙에 대피령")).toBe(true);
    expect(isNaturalDisasterNews("Central bank rate hike")).toBe(false);
  });
});

describe("pickConflictLampNews", () => {
  const base = (partial: Record<string, unknown>) => ({
    id: "1",
    title: "Missile strike hits depot near front line",
    summary: "A".repeat(140),
    link: "https://www.reuters.com/world/asia-pacific/missile-strike-depot-frontline-2026-03-01/",
    source: "Reuters",
    publisher: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "middle-east" as const,
    trustTier: 1 as const,
    imageUrl: "https://cdn.example.com/wire-photo.jpg",
    ...partial,
  });

  it("실사진 없는 기사는 선정하지 않는다", () => {
    const picked = pickConflictLampNews(
      [
        base({ id: "photo", imageUrl: "https://cdn.example.com/a.jpg" }),
        base({ id: "nophoto", imageUrl: "" }),
      ],
      2,
      "ko",
    );
    expect(picked.every((n) => n.imageUrl.startsWith("https://"))).toBe(true);
    expect(picked.some((n) => n.id === "nophoto")).toBe(false);
  });

  it("자연재해 기사를 전쟁과 함께 올릴 수 있다", () => {
    const picked = pickConflictLampNews(
      [
        base({
          id: "war",
          title: "Drone strike on convoy",
          imageUrl: "https://cdn.example.com/war.jpg",
        }),
        base({
          id: "quake",
          title: "Magnitude 6.4 earthquake triggers evacuations",
          summary: "B".repeat(140),
          link: "https://www.reuters.com/world/asia-pacific/earthquake-japan-magnitude-six-evacuation-2026-03-01/",
          imageUrl: "https://cdn.example.com/quake.jpg",
          theater: "japan",
        }),
      ],
      2,
      "ko",
    );
    expect(picked.map((n) => n.id)).toContain("quake");
    expect(ensureLampFeaturedNews(picked).length).toBe(picked.length);
  });
});
