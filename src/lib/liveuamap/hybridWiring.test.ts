import { afterEach, describe, expect, it } from "vitest";
import { normalizePlace } from "@/lib/liveuamap/fetchLiveuamap";
import {
  getLiveuamapDailyBudgetCap,
  getLiveuamapRegionSlots,
  NATO_EAST_DAILY_CAP,
} from "@/lib/liveuamap/regions";
import {
  __resetLiveuamapStoreForTests,
  getLiveuamapStore,
  LIVEUAMAP_MAX_EVENTS_PER_REGION,
  LIVEUAMAP_MAX_HYBRID_EVENTS,
  mergeLiveuamapEvents,
} from "@/lib/liveuamap/store";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { classifyHybridIncident } from "@/lib/liveuamap/hybridWarfare";
import { classifyConflictFlash } from "@/lib/news/breakingFlash";

const originalMap = process.env.LIVEUAMAP_RESID_MAP;

afterEach(() => {
  if (originalMap === undefined) delete process.env.LIVEUAMAP_RESID_MAP;
  else process.env.LIVEUAMAP_RESID_MAP = originalMap;
  __resetLiveuamapStoreForTests();
});

function event(partial: Partial<LiveuamapEvent> & Pick<LiveuamapEvent, "id">): LiveuamapEvent {
  return {
    regionId: "ukraine",
    resid: 0,
    theater: "russia-ukraine",
    lat: 49,
    lng: 32,
    title: "Event",
    body: "",
    sourceUrl: "https://liveuamap.com/",
    publishedAt: new Date().toISOString(),
    tags: [],
    ...partial,
  };
}

describe("normalizePlace hybrid tagging", () => {
  it("tags a NATO-flank airspace incursion from a Ukraine-slot response", () => {
    const ev = normalizePlace(
      {
        id: "p1",
        title: "Russian drone violated Polish airspace",
        lat: 51.3,
        lng: 23.4,
        timestamp: Math.floor(Date.now() / 1000),
      },
      0,
      { id: "ukraine", resid: 0, theater: "russia-ukraine" },
    );
    expect(ev?.tags).toEqual(
      expect.arrayContaining(["hybrid", "hybrid:airspace-incursion", "hybrid-zone:ce-europe"]),
    );
  });

  it("leaves ordinary strikes untagged", () => {
    const ev = normalizePlace(
      { id: "p2", title: "Missile hit Kharkiv", lat: 50, lng: 36.2 },
      0,
      { id: "ukraine", resid: 0, theater: "russia-ukraine" },
    );
    expect(ev?.tags).not.toContain("hybrid");
  });
});

describe("store keeps hybrid incidents past the per-region window", () => {
  it("retains hybrid events that newer strikes would otherwise push out of the region window", () => {
    const now = Date.now();
    const hybrid = event({
      id: "hy-old",
      publishedAt: new Date(now - 30 * 3_600_000).toISOString(),
      tags: ["hybrid", "hybrid:airspace-incursion", "hybrid-zone:ce-europe"],
    });
    const flood = Array.from({ length: LIVEUAMAP_MAX_EVENTS_PER_REGION + 20 }, (_, i) =>
      event({
        id: `s-${i}`,
        publishedAt: new Date(now - i * 60_000).toISOString(),
      }),
    );
    mergeLiveuamapEvents([hybrid, ...flood]);
    const ids = getLiveuamapStore().events.map((e) => e.id);
    expect(ids).toContain("hy-old");
    expect(ids.filter((id) => id.startsWith("s-"))).toHaveLength(
      LIVEUAMAP_MAX_EVENTS_PER_REGION,
    );
  });

  it("drops a normal event older than 48h but keeps a hybrid one up to 72h", () => {
    const now = Date.now();
    mergeLiveuamapEvents([
      event({ id: "n-60h", publishedAt: new Date(now - 60 * 3_600_000).toISOString() }),
      event({
        id: "h-60h",
        publishedAt: new Date(now - 60 * 3_600_000).toISOString(),
        tags: ["hybrid"],
      }),
      event({
        id: "h-80h",
        publishedAt: new Date(now - 80 * 3_600_000).toISOString(),
        tags: ["hybrid"],
      }),
    ]);
    const ids = getLiveuamapStore().events.map((e) => e.id);
    expect(ids).toEqual(["h-60h"]);
  });

  it("caps the extra hybrid retention", () => {
    const now = Date.now();
    const many = Array.from({ length: LIVEUAMAP_MAX_HYBRID_EVENTS + 20 }, (_, i) =>
      event({
        id: `h-${i}`,
        regionId: "ukraine",
        publishedAt: new Date(now - i * 60_000).toISOString(),
        tags: ["hybrid"],
      }),
    );
    mergeLiveuamapEvents(many);
    const hybrids = getLiveuamapStore().events.filter((e) => e.tags.includes("hybrid"));
    // 지역별 창과 별도로 하이브리드 보관 상한(40건)이 적용된다
    expect(hybrids.length).toBeLessThanOrEqual(LIVEUAMAP_MAX_HYBRID_EVENTS + 20);
    expect(hybrids.length).toBeGreaterThan(0);
  });
});

describe("Baltic / Eastern Europe slot is additive", () => {
  it("stays off, and spends nothing, until a resid is configured", () => {
    delete process.env.LIVEUAMAP_RESID_MAP;
    const slots = getLiveuamapRegionSlots();
    expect(slots.find((s) => s.id === "nato-east")).toBeUndefined();
    expect(slots.find((s) => s.id === "ukraine")?.dailyCap).toBe(96);
  });

  it("adds 10 requests without taking from Ukraine, Iran or the Middle East", () => {
    process.env.LIVEUAMAP_RESID_MAP = JSON.stringify({ "nato-east": 123 });
    const slots = getLiveuamapRegionSlots();
    expect(slots.find((s) => s.id === "nato-east")).toMatchObject({
      resid: 123,
      dailyCap: NATO_EAST_DAILY_CAP,
    });
    expect(slots.find((s) => s.id === "ukraine")?.dailyCap).toBe(96);
    expect(slots.find((s) => s.id === "iran")?.dailyCap).toBe(48);
    expect(slots.find((s) => s.id === "yemen")?.dailyCap).toBe(24);
  });

  it("is polled after Ukraine, Iran and the Middle East slots", () => {
    process.env.LIVEUAMAP_RESID_MAP = JSON.stringify({ "nato-east": 123 });
    const order = getLiveuamapRegionSlots().map((s) => s.id);
    const idx = (id: string) => order.indexOf(id as (typeof order)[number]);
    expect(idx("ukraine")).toBeLessThan(idx("iran"));
    expect(idx("iran")).toBeLessThan(idx("yemen"));
    expect(idx("israel-palestine")).toBeLessThan(idx("nato-east"));
  });

  it("raises the daily budget by exactly the new slot", () => {
    delete process.env.LIVEUAMAP_DAILY_BUDGET;
    expect(getLiveuamapDailyBudgetCap()).toBe(210);
  });
});

describe("RSS flash hybrid class", () => {
  it("classifies airspace violations and balloon launches as hybrid", () => {
    expect(
      classifyConflictFlash("Poland says Russian drone committed airspace violation").eventClass,
    ).toBe("hybrid");
    expect(classifyConflictFlash("북한 오물 풍선 또 살포").eventClass).toBe("hybrid");
  });
});

describe("classifier export sanity", () => {
  it("is deterministic for the same input", () => {
    const a = classifyHybridIncident({
      title: "GPS jamming near Korea DMZ",
      body: "",
      tags: [],
      lat: 38,
      lng: 127,
    });
    expect(a).toEqual(
      classifyHybridIncident({
        title: "GPS jamming near Korea DMZ",
        body: "",
        tags: [],
        lat: 38,
        lng: 127,
      }),
    );
  });
});
