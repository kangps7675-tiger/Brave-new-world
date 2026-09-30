import { describe, expect, it } from "vitest";
import {
  gibsCloudDateUtc,
  gibsCloudGlobeSnapshotUrl,
  gibsCloudWmtsUrlTemplate,
  GIBS_CLOUD_LAYER_ID,
} from "./cesiumGibsClouds";

describe("cesiumGibsClouds", () => {
  it("uses UTC yesterday for GIBS lag", () => {
    const fixed = new Date(Date.UTC(2026, 8, 30, 15, 0, 0)); // Sep 30
    expect(gibsCloudDateUtc(fixed)).toBe("2026-09-29");
  });

  it("builds WMTS and snapshot URLs for cloud fraction only", () => {
    const wmts = gibsCloudWmtsUrlTemplate("2026-09-29");
    expect(wmts).toContain(GIBS_CLOUD_LAYER_ID);
    expect(wmts).toContain("2026-09-29");
    expect(wmts).toContain("{z}/{y}/{x}");

    const snap = gibsCloudGlobeSnapshotUrl("2026-09-29");
    expect(snap).toContain("wvs.earthdata.nasa.gov");
    expect(snap).toContain(GIBS_CLOUD_LAYER_ID);
    expect(snap).not.toContain("Precipitation");
    expect(snap).not.toContain("Temperature");
  });
});
