import { describe, expect, it } from "vitest";
import type { SearchPlace } from "@/data/geoTypes";
import type { NewsStreamItem } from "@/lib/news/types";
import {
  buildNewsKeywordCatalog,
  createNewsSearchIndex,
  createPlaceSearchIndex,
  searchChromeHits,
  suggestNewsKeywords,
} from "./chromeSearch";

const places: SearchPlace[] = [
  {
    id: "city-seoul",
    name: "Seoul",
    nameKo: "서울",
    country: "South Korea",
    lat: 37.5,
    lng: 127,
    type: "city",
  },
  {
    id: "search-taiwan",
    name: "Taiwan Strait",
    nameKo: "대만 해협",
    country: "dispute",
    lat: 24,
    lng: 119,
    type: "dispute",
  },
];

const articles: NewsStreamItem[] = [
  {
    id: "n1",
    title: "Red Sea freighters divert after missile warning",
    link: "https://example.com/1",
    source: "Reuters",
    pubDate: "2026-09-01T00:00:00Z",
    theater: "middle-east",
    trustTier: 1,
    summary: "Shipping lanes face higher war-risk premiums.",
  },
  {
    id: "n2",
    title: "Seoul monitors North Korea artillery drills",
    link: "https://example.com/2",
    source: "Yonhap",
    pubDate: "2026-09-02T00:00:00Z",
    theater: "korea",
    trustTier: 1,
  },
  {
    id: "n3",
    title: "Missile tests raise Red Sea insurance costs",
    link: "https://example.com/3",
    source: "FT",
    pubDate: "2026-09-03T00:00:00Z",
    theater: "middle-east",
    trustTier: 1,
  },
];

describe("searchChromeHits", () => {
  const placeIndex = createPlaceSearchIndex(places);
  const newsIndex = createNewsSearchIndex(articles);

  it("returns places for city queries", () => {
    const hits = searchChromeHits({ query: "서울", placeIndex, newsIndex });
    expect(hits.some((h) => h.kind === "place" && h.place.id === "city-seoul")).toBe(
      true,
    );
  });

  it("returns news for article title queries", () => {
    const hits = searchChromeHits({ query: "Red Sea freighters", placeIndex, newsIndex });
    expect(hits.some((h) => h.kind === "news" && h.article.id === "n1")).toBe(true);
  });

  it("can mix place and news when both match", () => {
    const hits = searchChromeHits({ query: "Seoul", placeIndex, newsIndex, limit: 10 });
    const kinds = new Set(hits.map((h) => h.kind));
    expect(kinds.has("place")).toBe(true);
    expect(kinds.has("news")).toBe(true);
  });

  it("returns empty for blank query", () => {
    expect(searchChromeHits({ query: "  ", placeIndex, newsIndex })).toEqual([]);
  });
});

describe("suggestNewsKeywords", () => {
  const catalog = buildNewsKeywordCatalog(articles);

  it("suggests keywords that prefix-match the query", () => {
    const tips = suggestNewsKeywords("miss", catalog);
    expect(tips.some((t) => /missile/i.test(t.keyword))).toBe(true);
  });

  it("suggests multi-word phrases for short prefixes", () => {
    const tips = suggestNewsKeywords("red", catalog);
    expect(tips.some((t) => /red sea/i.test(t.keyword))).toBe(true);
  });

  it("returns empty for blank query", () => {
    expect(suggestNewsKeywords(" ", catalog)).toEqual([]);
  });
});
