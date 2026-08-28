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

describe("sanitizeShippingLanePath (exact upstream coords)", () => {
  it("preserves vertices without splitting or densifying", () => {
    const path = lane("tw", [
      { lat: 22.5, lng: 119.0 },
      { lat: 23.7, lng: 121.1 },
      { lat: 25.2, lng: 122.7 },
    ]);
    const pieces = sanitizeShippingLanePath(path);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.points).toEqual(path.points);
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

  it("passes shipping paths through unchanged", () => {
    const a = lane("a", [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
    const b = lane("b", [
      { lat: 5, lng: 6 },
      { lat: 7, lng: 8 },
    ]);
    expect(sanitizeShippingLanePaths([a, b])).toEqual([a, b]);
  });
});
