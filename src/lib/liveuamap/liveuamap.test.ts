import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetLiveuamapBudgetForTests,
  getLiveuamapBudgetSnapshot,
  recordLiveuamapFetch,
  selectDueLiveuamapSlots,
} from "@/lib/liveuamap/budget";
import { normalizePlace } from "@/lib/liveuamap/fetchLiveuamap";
import { liveuamapFieldsToOccupiedGeoJson } from "@/lib/liveuamap/toOccupiedGeoJson";
import { mergeLiveuamapEvents, getLiveuamapStore, replaceLiveuamapEvents } from "@/lib/liveuamap/store";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

describe("liveuamap budget", () => {
  beforeEach(() => {
    __resetLiveuamapBudgetForTests();
  });

  it("caps daily total and respects region interval", () => {
    const due1 = selectDueLiveuamapSlots(Date.now(), 3);
    expect(due1.some((s) => s.id === "ukraine")).toBe(true);
    recordLiveuamapFetch("ukraine");
    const snap = getLiveuamapBudgetSnapshot();
    expect(snap.used).toBe(1);
    expect(snap.perRegion.ukraine).toBe(1);
    const due2 = selectDueLiveuamapSlots(Date.now(), 3);
    expect(due2.some((s) => s.id === "ukraine")).toBe(false);
  });
});

describe("normalizePlace", () => {
  it("maps mpts place fields", () => {
    const ev = normalizePlace(
      {
        id: 99,
        name: "Test strike near Kharkiv",
        lat: "49.99",
        lng: "36.23",
        timestamp: 1_700_000_000,
        link: "https://example.com/x",
        photo: "https://example.com/p.jpg",
        viaSource: "OSINT",
      },
      0,
      { id: "ukraine", resid: 0, theater: "russia-ukraine" },
    );
    expect(ev?.id).toBe("99");
    expect(ev?.lat).toBeCloseTo(49.99);
    expect(ev?.lng).toBeCloseTo(36.23);
    expect(ev?.imageUrl).toContain("p.jpg");
    expect(ev?.theater).toBe("russia-ukraine");
  });
});

describe("liveuamapFieldsToOccupiedGeoJson", () => {
  it("returns null for empty fields", () => {
    expect(liveuamapFieldsToOccupiedGeoJson({ fields: [], kmls: [] }, "ukraine")).toBeNull();
  });

  it("builds polygon from points", () => {
    const fc = liveuamapFieldsToOccupiedGeoJson(
      {
        fields: [
          {
            id: 1,
            name: "zone",
            // [lng, lat] near Donetsk
            points: [
              [37.0, 48.0],
              [37.2, 48.0],
              [37.2, 48.1],
              [37.0, 48.1],
            ],
          },
        ],
      },
      "ukraine",
    );
    expect(fc?.features.length).toBe(1);
    expect(fc?.meta?.source).toBe("liveuamap");
  });

  it("drops polygons outside the region bbox", () => {
    const fc = liveuamapFieldsToOccupiedGeoJson(
      {
        fields: [
          {
            id: 1,
            name: "gaza",
            points: [
              [34.3, 31.3],
              [34.5, 31.3],
              [34.5, 31.5],
              [34.3, 31.5],
            ],
          },
        ],
      },
      "lebanon",
    );
    expect(fc).toBeNull();
  });
});

describe("mergeLiveuamapEvents", () => {
  beforeEach(() => {
    replaceLiveuamapEvents([]);
  });

  it("dedupes by id and keeps ko fields", () => {
    const a: LiveuamapEvent = {
      id: "1",
      regionId: "ukraine",
      resid: 0,
      theater: "russia-ukraine",
      lat: 1,
      lng: 2,
      title: "Hello",
      titleKo: "안녕",
      body: "Body",
      sourceUrl: "https://x",
      publishedAt: new Date().toISOString(),
      tags: [],
    };
    mergeLiveuamapEvents([a]);
    mergeLiveuamapEvents([{ ...a, title: "Hello2" }]);
    const { events } = getLiveuamapStore();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Hello2");
    expect(events[0].titleKo).toBe("안녕");
  });
});
