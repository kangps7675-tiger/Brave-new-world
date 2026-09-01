import { describe, expect, it } from "vitest";
import { hasLampPhoto, normalizeLampImageUrl } from "./lampThumbnail";
import { filterNewsToPreviousWeek } from "./lampNewsPool";
import {
  ensureLampFeaturedNews,
  isNaturalDisasterNews,
  isWeeklyRecapBriefingKey,
  pickConflictLampNews,
  previousIsoWeekRange,
  resolveMondayWeeklyRecap,
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

  it("첨부 사진 없는 기사는 선정하지 않는다", () => {
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

  it("기사에 붙은 SVG·CMS 경로 이미지도 선정한다", () => {
    const picked = pickConflictLampNews(
      [
        base({
          id: "infographic",
          imageUrl: "https://cdn.example.com/graphics/frontline-map.svg",
        }),
        base({
          id: "cms",
          title: "Artillery barrage hits supply depot",
          link: "https://www.reuters.com/world/europe/artillery-barrage-supply-depot-2026-03-02/",
          imageUrl: "https://media.example.com/placeholder/2026/hero.jpg",
        }),
      ],
      2,
      "ko",
    );
    expect(picked.map((n) => n.id)).toEqual(expect.arrayContaining(["infographic", "cms"]));
  });
});

describe("normalizeLampImageUrl", () => {
  it("기사에 붙은 사진 URL은 통과한다", () => {
    expect(hasLampPhoto("https://cdn.example.com/story.jpg")).toBe(true);
    expect(hasLampPhoto("https://cdn.example.com/graphics/map.svg")).toBe(true);
    expect(hasLampPhoto("https://media.example.com/placeholder/hero.jpg")).toBe(true);
    expect(hasLampPhoto("https://cdn.example.com/icons/story-thumb.webp")).toBe(true);
    expect(normalizeLampImageUrl("//cdn.example.com/og.jpg")).toBe(
      "https://cdn.example.com/og.jpg",
    );
  });

  it("파비콘·트래킹 픽셀만 탈락한다", () => {
    expect(hasLampPhoto("https://www.example.com/favicon.ico")).toBe(false);
    expect(hasLampPhoto("https://pixel.example.com/1x1.gif")).toBe(false);
    expect(hasLampPhoto("https://cdn.example.com/tracking-pixel.gif")).toBe(false);
    expect(hasLampPhoto("")).toBe(false);
    expect(hasLampPhoto("data:image/png;base64,abc")).toBe(false);
  });
});

describe("monday weekly photo recap window", () => {
  it("월요일에만 지난주 회고 오퍼를 연다", () => {
    const monday = new Date(2026, 7, 31, 10, 0, 0); // Aug 31 2026 = Monday
    const tuesday = new Date(2026, 8, 1, 10, 0, 0);
    expect(resolveMondayWeeklyRecap(monday)?.weekKey).toMatch(/^weekly-\d{4}-W\d{2}$/);
    expect(resolveMondayWeeklyRecap(tuesday)).toBeNull();
  });

  it("전주 ISO 주 구간만 남기고, 부족하면 직전 7일로 완화한다", () => {
    const monday = new Date(2026, 7, 31, 9, 0, 0);
    const { startMs, endMs, weekKey } = previousIsoWeekRange(monday);
    expect(weekKey).toBe("weekly-2026-W35");
    expect(isWeeklyRecapBriefingKey(`${weekKey}-conflict`)).toBe(true);

    const inWeek = {
      id: "in",
      title: "Frontline strike",
      summary: "A".repeat(80),
      link: "https://www.reuters.com/world/europe/frontline-2026-08-26/",
      source: "Reuters",
      publisher: "Reuters",
      pubDate: new Date(2026, 7, 26, 12, 0, 0).toISOString(),
      theater: "russia-ukraine" as const,
      trustTier: 1 as const,
      imageUrl: "https://cdn.example.com/a.jpg",
    };
    const tooOld = {
      ...inWeek,
      id: "old",
      pubDate: new Date(2026, 7, 10, 12, 0, 0).toISOString(),
    };
    const today = {
      ...inWeek,
      id: "today",
      pubDate: monday.toISOString(),
    };

    const filtered = filterNewsToPreviousWeek(
      [inWeek, tooOld, today] as never[],
      monday,
    );
    expect(filtered.map((n) => n.id)).toEqual(["in"]);
  });
});
