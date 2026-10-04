import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetLiveuamapBudgetForTests,
  exportLiveuamapBudgetState,
  getLiveuamapBudgetSnapshot,
  hydrateLiveuamapBudgetState,
  recordLiveuamapFetch,
  selectDueLiveuamapSlots,
} from "@/lib/liveuamap/budget";
import {
  __resetLiveuamapStoreForTests,
  exportLiveuamapStoreState,
  getLiveuamapStore,
  hydrateLiveuamapStoreState,
  mergeLiveuamapEvents,
} from "@/lib/liveuamap/store";
import { trimEventsToBytes } from "@/lib/liveuamap/eventsTrim";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

function ev(id: string, minutesAgo: number, body = "x"): LiveuamapEvent {
  return {
    id,
    regionId: "ukraine",
    resid: 0,
    theater: "russia-ukraine",
    lat: 1,
    lng: 2,
    title: id,
    body,
    sourceUrl: "https://example.com",
    publishedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    tags: [],
  };
}

describe("budget hydrate", () => {
  beforeEach(() => __resetLiveuamapBudgetForTests());

  it("restores counters and minInterval after a memory reset (no re-burst)", () => {
    const t0 = Date.now();
    recordLiveuamapFetch("ukraine", t0);
    recordLiveuamapFetch("iran", t0);
    const saved = JSON.parse(JSON.stringify(exportLiveuamapBudgetState(t0)));

    __resetLiveuamapBudgetForTests(); // 콜드스타트/HMR 시뮬레이션
    expect(selectDueLiveuamapSlots(t0 + 1000, 3).some((s) => s.id === "ukraine")).toBe(true);

    hydrateLiveuamapBudgetState(saved, t0);
    const snap = getLiveuamapBudgetSnapshot();
    expect(snap.used).toBe(2);
    const due = selectDueLiveuamapSlots(t0 + 1000, 3).map((s) => s.id);
    expect(due).not.toContain("ukraine");
    expect(due).not.toContain("iran");
  });

  it("ignores a saved state from another UTC day", () => {
    const t0 = Date.now();
    hydrateLiveuamapBudgetState(
      { dayUtc: "2000-01-01", totalUsed: 150, perRegion: { ukraine: 90 }, lastFetchAt: {} },
      t0,
    );
    expect(getLiveuamapBudgetSnapshot().used).toBe(0);
  });

  it("never lowers counters (max merge)", () => {
    const t0 = Date.now();
    recordLiveuamapFetch("ukraine", t0);
    recordLiveuamapFetch("ukraine", t0);
    hydrateLiveuamapBudgetState(
      {
        dayUtc: exportLiveuamapBudgetState(t0).dayUtc,
        totalUsed: 1,
        perRegion: { ukraine: 1 },
        lastFetchAt: {},
      },
      t0,
    );
    expect(getLiveuamapBudgetSnapshot().used).toBe(2);
  });

  it("ignores garbage", () => {
    hydrateLiveuamapBudgetState("nope");
    hydrateLiveuamapBudgetState({ dayUtc: 5, totalUsed: "x" });
    expect(getLiveuamapBudgetSnapshot().used).toBe(0);
  });
});

describe("store hydrate", () => {
  beforeEach(() => __resetLiveuamapStoreForTests());

  it("restores events after a memory reset", () => {
    mergeLiveuamapEvents([ev("a", 5), ev("b", 10)], "2026-10-05T00:00:00.000Z");
    const saved = JSON.parse(JSON.stringify(exportLiveuamapStoreState()));
    __resetLiveuamapStoreForTests();
    expect(getLiveuamapStore().events).toHaveLength(0);
    hydrateLiveuamapStoreState(saved);
    expect(getLiveuamapStore().events.map((e) => e.id)).toEqual(["a", "b"]);
    expect(getLiveuamapStore().lastIngestAt).toBe("2026-10-05T00:00:00.000Z");
  });

  it("memory wins on same id, saved fills the rest", () => {
    mergeLiveuamapEvents([{ ...ev("a", 5), title: "fresh" }], "2026-10-05T01:00:00.000Z");
    hydrateLiveuamapStoreState({
      events: [{ ...ev("a", 5), title: "stale" }, ev("c", 20)],
      lastIngestAt: "2026-10-05T00:00:00.000Z",
    });
    const list = getLiveuamapStore().events;
    expect(list.find((e) => e.id === "a")?.title).toBe("fresh");
    expect(list.some((e) => e.id === "c")).toBe(true);
    expect(getLiveuamapStore().lastIngestAt).toBe("2026-10-05T01:00:00.000Z");
  });

  it("skips malformed rows", () => {
    hydrateLiveuamapStoreState({ events: [null, { id: 1 }, ev("ok", 1)] });
    expect(getLiveuamapStore().events.map((e) => e.id)).toEqual(["ok"]);
  });
});

describe("trimEventsToBytes", () => {
  it("keeps everything when under the limit", () => {
    const list = [ev("a", 1), ev("b", 2)];
    expect(trimEventsToBytes(list, 100_000)).toHaveLength(2);
  });

  it("drops oldest first when over the limit", () => {
    const list = Array.from({ length: 50 }, (_, i) => ev(`e${i}`, i, "y".repeat(2000)));
    const out = trimEventsToBytes(list, 20_000);
    expect(out.length).toBeLessThan(50);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].id).toBe("e0");
  });

  it("returns empty when a single event exceeds the limit", () => {
    expect(trimEventsToBytes([ev("big", 1, "z".repeat(5000))], 1000)).toEqual([]);
  });
});
