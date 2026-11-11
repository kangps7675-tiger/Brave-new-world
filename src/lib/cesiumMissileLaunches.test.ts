import { describe, expect, it } from "vitest";
import { ballisticArcSamples } from "@/lib/cesiumMissileLaunches";

describe("ballisticArcSamples", () => {
  it("returns a parabolic height profile (apex in the middle)", () => {
    const pts = ballisticArcSamples(39.2, 125.67, "ballistic");
    expect(pts.length).toBeGreaterThan(10);
    expect(pts[0].heightM).toBeCloseTo(0, 0);
    expect(pts[pts.length - 1].heightM).toBeCloseTo(0, 0);
    const mid = pts[Math.floor(pts.length / 2)];
    const quarter = pts[Math.floor(pts.length / 4)];
    expect(mid.heightM).toBeGreaterThan(quarter.heightM);
    expect(mid.heightM).toBeGreaterThan(40_000);
  });

  it("advances eastward for typical launch bearing", () => {
    const pts = ballisticArcSamples(39.2, 125.67, "ballistic");
    expect(pts[pts.length - 1].lng).toBeGreaterThan(pts[0].lng);
  });
});
