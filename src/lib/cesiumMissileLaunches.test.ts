import { describe, expect, it } from "vitest";
import { ballisticArcPositions } from "@/lib/cesiumMissileLaunches";

/** Cesium 없이도 각도·포물 형태만 검증 — Cartesian3 mock */
function mockCesium() {
  return {
    Cartesian3: {
      fromDegrees: (lon: number, lat: number, h: number) => ({ lon, lat, h }),
    },
  } as unknown as typeof import("cesium");
}

describe("ballisticArcPositions", () => {
  it("returns a parabolic height profile (apex in the middle)", () => {
    const pts = ballisticArcPositions(
      mockCesium(),
      39.2,
      125.67,
      "ballistic",
    ) as unknown as Array<{ lon: number; lat: number; h: number }>;
    expect(pts.length).toBeGreaterThan(10);
    expect(pts[0].h).toBeCloseTo(0, 0);
    expect(pts[pts.length - 1].h).toBeCloseTo(0, 0);
    const mid = pts[Math.floor(pts.length / 2)];
    const quarter = pts[Math.floor(pts.length / 4)];
    expect(mid.h).toBeGreaterThan(quarter.h);
    expect(mid.h).toBeGreaterThan(40_000);
  });

  it("advances eastward for typical launch bearing", () => {
    const pts = ballisticArcPositions(
      mockCesium(),
      39.2,
      125.67,
      "ballistic",
    ) as unknown as Array<{ lon: number; lat: number; h: number }>;
    expect(pts[pts.length - 1].lon).toBeGreaterThan(pts[0].lon);
  });
});
