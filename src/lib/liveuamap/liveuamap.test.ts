import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetLiveuamapBudgetForTests,
  getLiveuamapBudgetSnapshot,
  recordLiveuamapFetch,
  selectDueLiveuamapSlots,
} from "@/lib/liveuamap/budget";
import { normalizePlace } from "@/lib/liveuamap/fetchLiveuamap";
import { liveuamapFieldsToOccupiedGeoJson } from "@/lib/liveuamap/toOccupiedGeoJson";
import {
  LIVEUAMAP_MAX_EVENTS_PER_REGION,
  mergeLiveuamapEvents,
  getLiveuamapStore,
  replaceLiveuamapEvents,
} from "@/lib/liveuamap/store";
import type { LiveuamapEvent, LiveuamapRegionId } from "@/lib/liveuamap/types";

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

  it("maps geojson Point features from mpts geojson=true", () => {
    const ev = normalizePlace(
      {
        type: "Feature",
        properties: {
          id: 12345,
          title: "Clashes near Kupyansk",
          message: "General Staff reports clashes near Kivsharivka",
          link: "https://liveuamap.com/en/example",
          timestamp: 1_791_093_371,
          picture: "https://example.com/pic.jpg",
        },
        geometry: { type: "Point", coordinates: [37.7219, 49.6096] },
      },
      0,
      { id: "ukraine", resid: 0, theater: "russia-ukraine" },
    );
    expect(ev?.id).toBe("12345");
    expect(ev?.lng).toBeCloseTo(37.7219);
    expect(ev?.lat).toBeCloseTo(49.6096);
    expect(ev?.title).toContain("Kupyansk");
    expect(ev?.imageUrl).toContain("pic.jpg");
  });

  it("skips geojson Polygon features (control surfaces)", () => {
    const ev = normalizePlace(
      {
        type: "Feature",
        properties: { title: "occupied zone", id: 1 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [37, 48],
              [37.2, 48],
              [37.2, 48.1],
              [37, 48.1],
              [37, 48],
            ],
          ],
        },
      },
      0,
      { id: "ukraine", resid: 0, theater: "russia-ukraine" },
    );
    expect(ev).toBeNull();
  });

  it("maps one FeatureCollection Point per parchment event (skips polygons)", () => {
    const slot = { id: "ukraine" as const, resid: 0, theater: "russia-ukraine" as const };
    const features = [
      {
        type: "Feature",
        properties: {
          id: 1,
          title: "Flash A",
          message: "Body A",
          link: "https://liveuamap.com/a",
          timestamp: 1_791_093_371,
        },
        geometry: { type: "Point", coordinates: [36.2, 49.9] },
      },
      {
        type: "Feature",
        properties: { id: 99, title: "Control poly" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [37, 48],
              [37.2, 48],
              [37.2, 48.1],
              [37, 48.1],
              [37, 48],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          id: 2,
          title: "Flash B",
          message: "Body B",
          link: "https://liveuamap.com/b",
          timestamp: 1_791_093_400,
        },
        geometry: { type: "Point", coordinates: [37.7, 49.6] },
      },
    ];
    const events = features
      .map((f, i) => normalizePlace(f, i, slot))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.id)).toEqual(["1", "2"]);
    expect(events[0].sourceUrl).toContain("liveuamap.com/a");
    expect(events[1].lat).toBeCloseTo(49.6);
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
    expect(fc?.features[0]?.properties?.role).toBe("ru-occupied");
    expect(fc?.features[0]?.properties?.source).toBe("liveuamap");
    expect(fc?.features[0]?.properties?.fill).toBe("#a52714");
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

  it("keeps Gaza control under israel-palestine bbox", () => {
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
      "israel-palestine",
    );
    expect(fc?.features.length).toBe(1);
  });
});

describe("liveuamap builtin resids", () => {
  it("activates Iran Yemen Lebanon and IL/PS control slots", async () => {
    const { getLiveuamapRegionSlots, resolveResidMap } = await import(
      "@/lib/liveuamap/regions"
    );
    const map = resolveResidMap();
    expect(map.iran).toBe(66);
    expect(map.yemen).toBe(53);
    expect(map.lebanon).toBe(74);
    expect(map["israel-palestine"]).toBe(2);
    const slots = getLiveuamapRegionSlots();
    expect(slots.some((s) => s.id === "iran" && s.parseControl)).toBe(true);
    expect(slots.some((s) => s.id === "yemen" && s.parseControl)).toBe(true);
    expect(slots.some((s) => s.id === "israel-palestine" && s.parseControl)).toBe(
      true,
    );
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

  it("keeps one store row per Point for parchment 1/N deck", () => {
    const now = Date.now();
    const batch: LiveuamapEvent[] = Array.from({ length: 12 }, (_, i) => ({
      id: `flash-${i}`,
      regionId: "ukraine",
      resid: 0,
      theater: "russia-ukraine",
      lat: 49 + i * 0.01,
      lng: 36 + i * 0.01,
      title: `Flash ${i}`,
      body: `Body ${i}`,
      sourceUrl: `https://liveuamap.com/e/${i}`,
      publishedAt: new Date(now - i * 60_000).toISOString(),
      tags: [],
    }));
    mergeLiveuamapEvents(batch);
    const { events } = getLiveuamapStore();
    expect(events).toHaveLength(12);
    // 양피지 index는 0 .. length-1
    expect(events[0]?.id).toBeTruthy();
    expect(events[11]?.id).toBeTruthy();
  });

  it("keeps up to 50 newest flashes per region so non-UA slots are not crowded out", () => {
    const now = Date.now();
    const mk = (
      regionId: LiveuamapRegionId,
      resid: number,
      theater: LiveuamapEvent["theater"],
      n: number,
      prefix: string,
    ): LiveuamapEvent[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `${prefix}-${i}`,
        regionId,
        resid,
        theater,
        lat: 40,
        lng: 40,
        title: `${prefix} ${i}`,
        body: "",
        sourceUrl: `https://liveuamap.com/${prefix}/${i}`,
        publishedAt: new Date(now - i * 1_000).toISOString(),
        tags: [],
      }));

    mergeLiveuamapEvents(mk("ukraine", 0, "russia-ukraine", 80, "ua"));
    mergeLiveuamapEvents(mk("iran", 66, "middle-east", 55, "ir"));
    mergeLiveuamapEvents(mk("yemen", 53, "middle-east", 40, "ye"));

    const { events } = getLiveuamapStore();
    const byRegion = (id: LiveuamapRegionId) =>
      events.filter((e) => e.regionId === id);

    expect(byRegion("ukraine")).toHaveLength(LIVEUAMAP_MAX_EVENTS_PER_REGION);
    expect(byRegion("iran")).toHaveLength(LIVEUAMAP_MAX_EVENTS_PER_REGION);
    expect(byRegion("yemen")).toHaveLength(40);
    expect(byRegion("ukraine")[0]?.id).toBe("ua-0");
    expect(byRegion("iran")[0]?.id).toBe("ir-0");
  });
});
