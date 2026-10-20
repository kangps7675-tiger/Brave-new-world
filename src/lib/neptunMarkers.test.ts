import { describe, expect, it } from "vitest";
import { neptunMarkerSizePx, neptunMarkerSvg } from "./neptunMarkers";

describe("neptunMarkers", () => {
  it("renders distinct silhouettes per threat kind", () => {
    const uav = neptunMarkerSvg("uav", "#f0820e");
    const kab = neptunMarkerSvg("kab", "#d9531e");
    const ballistic = neptunMarkerSvg("ballistic", "#b21e6b");
    expect(uav).toContain("<svg");
    expect(kab).toContain("<svg");
    expect(ballistic).toContain("<svg");
    expect(uav).not.toEqual(kab);
    expect(kab).not.toEqual(ballistic);
    expect(uav).not.toEqual(ballistic);
  });

  it("sizes ballistic larger than uav", () => {
    expect(neptunMarkerSizePx("ballistic")).toBeGreaterThan(neptunMarkerSizePx("uav"));
    expect(neptunMarkerSizePx("kab")).toBeGreaterThan(20);
  });
});
