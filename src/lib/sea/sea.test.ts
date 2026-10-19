import { describe, expect, it } from "vitest";
import { ENERGY_FACILITIES, nearestEnergyFacility } from "@/data/energyFacilities";
import { classifyEnergyStrike, energyStrikesFrom, ukraineWarEvents } from "@/lib/sea/energyStrikes";
import { getSeaRegion, seaRegionAt, SEA_REGIONS } from "@/lib/sea/regions";
import { rankNewsForRegion } from "@/lib/sea/newsRelevance";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsStreamItem } from "@/lib/news/types";

function ev(p: Partial<LiveuamapEvent>): LiveuamapEvent {
  return {
    id: p.id ?? "e1",
    regionId: p.regionId ?? "ukraine",
    resid: 0,
    theater: "russia-ukraine",
    lat: p.lat ?? 0,
    lng: p.lng ?? 0,
    title: p.title ?? "",
    body: p.body ?? "",
    sourceUrl: "https://example.com",
    publishedAt: p.publishedAt ?? "2026-10-19T12:00:00Z",
    tags: [],
  };
}

describe("energy facilities", () => {
  it("has unique ids and sane coordinates", () => {
    const ids = new Set(ENERGY_FACILITIES.map((f) => f.id));
    expect(ids.size).toBe(ENERGY_FACILITIES.length);
    for (const f of ENERGY_FACILITIES) {
      expect(f.lat).toBeGreaterThan(40);
      expect(f.lat).toBeLessThan(70);
      expect(f.lng).toBeGreaterThan(20);
      expect(f.lng).toBeLessThan(70);
    }
  });

  it("finds Novorossiysk from a nearby point", () => {
    expect(nearestEnergyFacility(44.7, 37.79)?.facility.id).toBe("ru-novorossiysk-sheskharis");
    expect(nearestEnergyFacility(50, 30)).toBeNull();
  });
});

describe("classifyEnergyStrike", () => {
  it("tags a drone hit on the Ryazan refinery and upgrades with a FIRMS hotspot", () => {
    const e = ev({ lat: 54.58, lng: 39.72, title: "Drones struck the Ryazan oil refinery, fire reported" });
    const plain = classifyEnergyStrike(e);
    expect(plain?.facility?.id).toBe("ru-ryazan");
    expect(plain?.evidence).toBe("report");
    const firms = classifyEnergyStrike(e, [{ lat: 54.585, lng: 39.71, acqDate: "2026-10-19", acqTime: "2300" }]);
    expect(firms?.evidence).toBe("firms");
  });

  it("ignores intercepts and non-energy strikes", () => {
    expect(classifyEnergyStrike(ev({ lat: 54.58, lng: 39.72, title: "Air defense shot down drones over Ryazan" }))).toBeNull();
    expect(classifyEnergyStrike(ev({ lat: 50.0, lng: 36.2, title: "Missile hit a residential building in Kharkiv" }))).toBeNull();
  });

  it("splits Ukraine events into energy strikes and the war tab", () => {
    const events = [
      ev({ id: "a", lat: 44.1, lng: 39.08, title: "Drone attack hit Tuapse refinery" }),
      ev({ id: "b", lat: 48.0, lng: 37.8, title: "Heavy fighting near Pokrovsk" }),
      ev({ id: "c", regionId: "yemen", lat: 15, lng: 43, title: "Houthi missile hit a tanker" }),
    ];
    expect(energyStrikesFrom(events).map((s) => s.id)).toEqual(["a"]);
    expect(ukraineWarEvents(events).map((e) => e.id)).toEqual(["b"]);
  });
});

describe("sea regions", () => {
  it("maps coordinates to regions", () => {
    expect(seaRegionAt(13, 43.3)).toBe("red-sea");
    expect(seaRegionAt(26.5, 56.3)).toBe("hormuz");
    expect(seaRegionAt(0, 0)).toBeNull();
    expect(getSeaRegion("nope").id).toBe(SEA_REGIONS[0].id);
  });

  it("ranks regional shipping news first", () => {
    const base = { source: "x", theater: "global", trustTier: 1 } as const;
    const items = [
      { ...base, id: "1", title: "Stocks rally", link: "l1", pubDate: "2026-10-19T10:00:00Z" },
      { ...base, id: "2", title: "Houthis claim attack on tanker in Red Sea", link: "l2", pubDate: "2026-10-18T10:00:00Z" },
      { ...base, id: "3", title: "Yemen talks resume", link: "l3", pubDate: "2026-10-19T09:00:00Z" },
    ] as NewsStreamItem[];
    const ranked = rankNewsForRegion(items, getSeaRegion("red-sea"));
    expect(ranked.map((r) => r.id)).toEqual(["2", "3", "1"]);
  });
});
