import { describe, expect, it } from "vitest";
import { ADSB_LOL_RADIUS_NM, ADSB_WORLD_HUBS, thinWorldwide } from "./adsbWorld";

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

describe("ADSB_WORLD_HUBS 대양 커버", () => {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const h =
      Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const RADIUS_KM = ADSB_LOL_RADIUS_NM * 1.852;

  // 허브 반경(1000nm) 안에 들어와야 하는 대양 한가운데 지점들
  const OCEANS: Array<[string, number, number]> = [
    ["북태평양 중앙", 35, -160],
    ["적도 태평양", 0, -140],
    ["남태평양", -25, -130],
    ["북대서양 중앙", 40, -40],
    ["남대서양", -25, -15],
    ["중부 인도양", -15, 75],
  ];

  for (const [name, lat, lng] of OCEANS) {
    it(`${name} 이 어느 허브 반경 안에 든다`, () => {
      const nearest = Math.min(...ADSB_WORLD_HUBS.map((h) => km(h, { lat, lng })));
      expect(nearest).toBeLessThanOrEqual(RADIUS_KM);
    });
  }
});
