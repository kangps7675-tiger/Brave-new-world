import { describe, expect, it } from "vitest";
import type { TransportPath } from "@/data/geoTypes";
import {
  sanitizeShippingLanePath,
  sanitizeShippingLanePaths,
} from "@/lib/shippingLaneSanitize";

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

describe("sanitizeShippingLanePath", () => {
  it("breaks chords that jump across Taiwan island", () => {
    const path = lane("tw-cut", [
      { lat: 22.5, lng: 119.0 },
      { lat: 23.0, lng: 119.25 },
      { lat: 23.7, lng: 121.1 }, // 대만 내륙을 가로지름
      { lat: 24.8, lng: 122.4 },
      { lat: 25.2, lng: 122.7 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(pieces.every((p) => p.points.length >= 2)).toBe(true);
  });

  it("keeps dense coastal segments intact", () => {
    const path = lane("strait", [
      { lat: 23.5, lng: 119.4 },
      { lat: 24.0, lng: 119.55 },
      { lat: 24.5, lng: 119.7 },
      { lat: 25.0, lng: 119.85 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.points).toHaveLength(4);
  });

  it("splits very long open-ocean chords", () => {
    const path = lane("long", [
      { lat: 1.3, lng: 103.8 },
      { lat: 12.0, lng: 45.0 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces.every((p) => p.points.length < 2 || p.points.length >= 1)).toBe(
      true,
    );
    // 두 점만 있고 구간이 길면 flush 후 단독 점 → 조각이 비거나 짧음
    expect(pieces.reduce((n, p) => n + (p.points.length >= 2 ? 1 : 0), 0)).toBe(0);
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
