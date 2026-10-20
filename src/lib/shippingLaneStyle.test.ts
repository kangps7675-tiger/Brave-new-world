import { describe, expect, it } from "vitest";
import type { TransportPath } from "@/data/geoTypes";
import {
  shippingLaneColor,
  shippingLaneNearChokepoint,
  shippingLaneTypeToScalerank,
  SHIPPING_LANE_CYAN,
  SHIPPING_LANE_CHOKE,
} from "@/lib/shippingLaneStyle";

function lane(
  id: string,
  points: Array<{ lat: number; lng: number }>,
): TransportPath {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return {
    id,
    kind: "shipping-lane",
    name: null,
    scalerank: 2,
    lengthKm: null,
    bbox: { minLat, minLng, maxLat, maxLng },
    points,
  };
}

describe("shippingLaneStyle", () => {
  it("tints Taiwan Strait corridor reddish (same translucent stroke)", () => {
    const path = lane("tw", [
      { lat: 23.8, lng: 118.8 },
      { lat: 24.5, lng: 119.5 },
      { lat: 25.2, lng: 120.2 },
    ]);
    expect(shippingLaneNearChokepoint(path)).toBe(true);
    expect(shippingLaneColor(path, "dark")).toBe(SHIPPING_LANE_CHOKE);
  });

  it("keeps open-ocean corridor cyan", () => {
    const path = lane("pac", [
      { lat: 20, lng: 150 },
      { lat: 22, lng: 155 },
      { lat: 24, lng: 160 },
    ]);
    expect(shippingLaneNearChokepoint(path)).toBe(false);
    expect(shippingLaneColor(path, "dark")).toBe(SHIPPING_LANE_CYAN);
  });

  it("maps Shipping-Lanes Type to scalerank", () => {
    expect(shippingLaneTypeToScalerank("Major")).toBe(1);
    expect(shippingLaneTypeToScalerank("Middle")).toBe(2);
    expect(shippingLaneTypeToScalerank("Minor")).toBe(3);
  });
});
