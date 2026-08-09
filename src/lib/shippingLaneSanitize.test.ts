import { describe, expect, it } from "vitest";
import type { TransportPath } from "@/data/geoTypes";
import {
  sanitizeShippingLanePath,
  sanitizeShippingLanePaths,
} from "@/lib/shippingLaneSanitize";
import { isLandLngLat } from "@/lib/landMask1deg";

function lane(
  id: string,
  points: Array<{ lat: number; lng: number }>,
): TransportPath {
  return {
    id,
    kind: "shipping-lane",
    name: null,
    scalerank: 0,
    lengthKm: null,
    bbox: { minLat: 0, minLng: 0, maxLat: 1, maxLng: 1 },
    points,
  };
}

describe("isLandLngLat (1° mask)", () => {
  it("marks continental interiors as land", () => {
    expect(isLandLngLat(20, 0)).toBe(true); // Sahara / Africa
    expect(isLandLngLat(100, 35)).toBe(true); // China interior
  });

  it("keeps open ocean as water", () => {
    expect(isLandLngLat(-40, 30)).toBe(false); // mid-Atlantic
    expect(isLandLngLat(160, 0)).toBe(false); // Pacific
  });

  it("keeps Suez corridor open", () => {
    expect(isLandLngLat(32.5, 30.5)).toBe(false);
  });
});

describe("sanitizeShippingLanePath", () => {
  it("breaks chords that jump across Taiwan island", () => {
    const path = lane("tw-cut", [
      { lat: 22.5, lng: 119.0 },
      { lat: 23.0, lng: 119.25 },
      { lat: 23.7, lng: 121.1 },
      { lat: 24.8, lng: 122.4 },
      { lat: 25.2, lng: 122.7 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(pieces.every((p) => p.points.length >= 2)).toBe(true);
  });

  it("breaks Sahara-crossing Atlantic→Red Sea chords", () => {
    const path = lane("africa-cut", [
      { lat: -8.1, lng: -34.9 },
      { lat: 17.3, lng: -25.5 },
      { lat: 25.0, lng: 35.0 }, // 아프리카 내륙 관통 현
    ]);
    const pieces = sanitizeShippingLanePath(path);
    for (const piece of pieces) {
      for (let i = 1; i < piece.points.length; i += 1) {
        const a = piece.points[i - 1]!;
        const b = piece.points[i]!;
        const mid = {
          lat: (a.lat + b.lat) / 2,
          lng: a.lng + ((((b.lng - a.lng + 540) % 360) - 180) / 2),
        };
        expect(isLandLngLat(mid.lng, mid.lat)).toBe(false);
      }
    }
  });

  it("densifies short open-ocean legs", () => {
    const path = lane("ocean", [
      { lat: 30, lng: -40 },
      { lat: 32, lng: -35 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.points.length).toBeGreaterThan(2);
  });

  it("keeps dense Taiwan Strait coastal segments intact", () => {
    const path = lane("strait", [
      { lat: 23.5, lng: 119.4 },
      { lat: 24.0, lng: 119.55 },
      { lat: 24.5, lng: 119.7 },
      { lat: 25.0, lng: 119.85 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.points.length).toBeGreaterThanOrEqual(4);
  });

  it("leaves non-shipping paths alone", () => {
    const cable: TransportPath = {
      ...lane("c", [
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ]),
      kind: "submarine-cable",
    };
    expect(sanitizeShippingLanePaths([cable])).toEqual([cable]);
  });
});
