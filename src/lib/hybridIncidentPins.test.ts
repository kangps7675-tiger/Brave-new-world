import { describe, expect, it } from "vitest";
import {
  HYBRID_PIN_MAX,
  hybridPinsFromLiveua,
  hybridPinsFromNews,
  mergeHybridPins,
  type HybridIncidentPin,
} from "@/lib/hybridIncidentPins";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsStreamItem } from "@/lib/news/types";

const NOW = Date.parse("2026-10-13T12:00:00Z");
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function liveua(over: Partial<LiveuamapEvent> & Pick<LiveuamapEvent, "id">): LiveuamapEvent {
  return {
    regionId: "ukraine",
    resid: 0,
    theater: "russia-ukraine",
    lat: 51.2,
    lng: 23.5,
    title: "Russian drone violated Polish airspace",
    body: "",
    sourceUrl: "https://liveuamap.com/",
    publishedAt: ago(1),
    tags: ["hybrid", "hybrid:airspace-incursion", "hybrid-zone:ce-europe"],
    ...over,
  };
}

function news(over: Partial<NewsStreamItem> & Pick<NewsStreamItem, "id" | "title">): NewsStreamItem {
  return {
    link: "https://example.com/n",
    source: "Reuters",
    pubDate: ago(2),
    theater: "global",
    trustTier: 1,
    ...over,
  };
}

describe("hybridPinsFromLiveua", () => {
  it("keeps only hybrid-tagged events, with zone and agency", () => {
    const pins = hybridPinsFromLiveua(
      [
        liveua({ id: "a" }),
        liveua({ id: "b", tags: [] }),
        liveua({
          id: "c",
          tags: ["hybrid", "hybrid:sabotage", "hybrid-zone:europe", "hybrid-agency"],
        }),
      ],
      "en",
    );
    expect(pins.map((p) => p.id)).toEqual(["liveua:a", "liveua:c"]);
    expect(pins[1]).toMatchObject({ kind: "sabotage", zone: "europe", agency: true });
  });
});

describe("hybridPinsFromNews", () => {
  const resolve = (item: NewsStreamItem) =>
    item.title.includes("Hamburg") ? { lat: 53.55, lng: 9.99 } : null;

  it("pins a classified news item when its place was resolved", () => {
    const pins = hybridPinsFromNews(
      [
        news({
          id: "n1",
          title: "Rail sabotage near Hamburg, intelligence agency suspected",
        }),
      ],
      resolve,
      "en",
    );
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({
      id: "news:n1",
      kind: "sabotage",
      zone: "europe",
      agency: true,
      source: "news",
    });
  });

  it("skips items with no resolved place or no hybrid signal", () => {
    const pins = hybridPinsFromNews(
      [
        news({ id: "n2", title: "Rail sabotage investigated, agents suspected" }),
        news({ id: "n3", title: "Hamburg port reports record cargo volume" }),
      ],
      resolve,
      "en",
    );
    expect(pins).toEqual([]);
  });
});

describe("mergeHybridPins", () => {
  const pin = (over: Partial<HybridIncidentPin> & Pick<HybridIncidentPin, "id">): HybridIncidentPin => ({
    lat: 52,
    lng: 21,
    title: "t",
    kind: "sabotage",
    zone: "ce-europe",
    agency: false,
    publishedAt: ago(1),
    source: "liveuamap",
    ...over,
  });

  it("drops pins older than 72h and sorts newest first", () => {
    const merged = mergeHybridPins(
      [[pin({ id: "old", publishedAt: ago(80), lat: 1 }), pin({ id: "mid", publishedAt: ago(10), lat: 2 })], [pin({ id: "new", publishedAt: ago(1), lat: 3 })]],
      NOW,
    );
    expect(merged.map((p) => p.id)).toEqual(["new", "mid"]);
  });

  it("merges the same incident reported by Liveuamap and news, keeping an agency flag", () => {
    const merged = mergeHybridPins(
      [
        [pin({ id: "l", publishedAt: ago(1) })],
        [pin({ id: "n", source: "news", agency: true, lat: 52.05, lng: 21.1, publishedAt: ago(2) })],
      ],
      NOW,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.agency).toBe(true);
  });

  it("does not merge different kinds at the same place", () => {
    const merged = mergeHybridPins(
      [[pin({ id: "a" }), pin({ id: "b", kind: "cyber" })]],
      NOW,
    );
    expect(merged).toHaveLength(2);
  });

  it("caps the list", () => {
    const many = Array.from({ length: HYBRID_PIN_MAX + 15 }, (_, i) =>
      pin({ id: `p${i}`, lat: i, lng: i, publishedAt: ago(1 + i * 0.01) }),
    );
    expect(mergeHybridPins([many], NOW)).toHaveLength(HYBRID_PIN_MAX);
  });
});

describe("zone priority when the cap is exceeded", () => {
  it("keeps Central-Eastern Europe (incl. Baltics) pins ahead of lower-priority zones", () => {
    const mk = (i: number, zone: HybridIncidentPin["zone"], hoursAgo: number): HybridIncidentPin => ({
      id: `${zone}-${i}`,
      lat: i * 0.5,
      lng: i * 0.5,
      title: "t",
      kind: "sabotage",
      zone,
      agency: false,
      publishedAt: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
      source: "liveuamap",
    });
    // 세계 구역 사건이 더 최신이어도, 상한을 넘으면 중부-동부유럽이 남는다
    const world = Array.from({ length: HYBRID_PIN_MAX }, (_, i) => mk(i, "world", 0.5 + i * 0.01));
    const ce = Array.from({ length: 5 }, (_, i) => mk(200 + i, "ce-europe", 30 + i));
    const merged = mergeHybridPins([world, ce], NOW);
    expect(merged).toHaveLength(HYBRID_PIN_MAX);
    expect(merged.filter((p) => p.zone === "ce-europe")).toHaveLength(5);
  });
});
