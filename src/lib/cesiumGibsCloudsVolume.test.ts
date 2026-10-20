import { describe, expect, it } from "vitest";
import {
  CLOUD_VOLUME_BOTTOM_M,
  CLOUD_VOLUME_DENSITY,
  CLOUD_VOLUME_STEPS,
  CLOUD_VOLUME_TOP_M,
  volumetricCloudMaterialSource,
} from "@/lib/cesiumGibsCloudsVolume";

describe("cesiumGibsCloudsVolume", () => {
  it("defines a thick cloud slab for orbital volume", () => {
    expect(CLOUD_VOLUME_TOP_M).toBeGreaterThan(CLOUD_VOLUME_BOTTOM_M);
    expect(CLOUD_VOLUME_TOP_M - CLOUD_VOLUME_BOTTOM_M).toBeGreaterThan(40_000);
    expect(CLOUD_VOLUME_STEPS).toBeGreaterThanOrEqual(24);
    expect(CLOUD_VOLUME_DENSITY).toBeGreaterThan(0);
  });

  it("emits a raymarch material source with density sampling", () => {
    const src = volumetricCloudMaterialSource();
    expect(src).toContain("czm_getMaterial");
    expect(src).toContain("cloudMap");
    expect(src).toContain("intersectSphere");
    expect(src).toContain("CLOUD_STEPS");
    expect(src).toContain("fbm");
  });
});
