import { describe, expect, it } from "vitest";

import { ukmtoRadiusDegForZoom, ukmtoIncidentToHatchPaths as _hatch } from "@/lib/ukmtoHatch";
describe("ukmtoRadiusDegForZoom", () => {
  it("낮은 줌은 기본 반경, 줌인할수록 작아진다", () => {
    expect(ukmtoRadiusDegForZoom(2)).toBe(0.4);
    expect(ukmtoRadiusDegForZoom(5)).toBeLessThan(ukmtoRadiusDegForZoom(4));
    expect(ukmtoRadiusDegForZoom(4)).toBeLessThan(0.4);
    expect(ukmtoRadiusDegForZoom(20)).toBeGreaterThan(0);
  });
  it("반경이 작으면 외곽선 bbox도 작다", () => {
    const inc = { id: "x", lat: 12, lng: 43, incidentTypeName: "Attack" };
    const big = _hatch(inc, 0.4)[0]!.bbox;
    const small = _hatch(inc, 0.05)[0]!.bbox;
    expect(small.maxLat - small.minLat).toBeLessThan(big.maxLat - big.minLat);
  });
});
