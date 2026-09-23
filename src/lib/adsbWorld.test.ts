import { describe, expect, it } from "vitest";
import { ADSB_WORLD_HUBS, thinWorldwide } from "./adsbWorld";

describe("thinWorldwide", () => {
  it("does not let one longitude band fill the cap", () => {
    const europe = Array.from({ length: 80 }, (_, i) => ({
      id: `eu-${i}`,
      lat: 50,
      lng: 8,
    }));
    const pacific = Array.from({ length: 40 }, (_, i) => ({
      id: `pac-${i}`,
      lat: -33,
      lng: 151,
    }));
    const thinned = thinWorldwide([...europe, ...pacific], {
      cellDeg: 10,
      perCell: 30,
      max: 20,
    });
    const pacificKept = thinned.filter((item) => item.id.startsWith("pac-")).length;
    expect(pacificKept).toBeGreaterThan(0);
    expect(thinned.length).toBe(20);
  });
});

describe("ADSB_WORLD_HUBS", () => {
  it("covers both hemispheres and the date line sides", () => {
    const lats = ADSB_WORLD_HUBS.map((hub) => hub.lat);
    const lngs = ADSB_WORLD_HUBS.map((hub) => hub.lng);
    expect(Math.min(...lats)).toBeLessThan(0);
    expect(Math.max(...lats)).toBeGreaterThan(50);
    expect(Math.min(...lngs)).toBeLessThan(-100);
    expect(Math.max(...lngs)).toBeGreaterThan(140);
    expect(ADSB_WORLD_HUBS.length).toBeGreaterThan(16);
  });
});
