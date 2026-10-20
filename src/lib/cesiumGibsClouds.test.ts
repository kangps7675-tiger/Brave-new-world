import { describe, expect, it } from "vitest";
import {
  CLOUD_3D_SHELLS,
  CLOUD_FADE_END_HEIGHT_M,
  CLOUD_FADE_START_HEIGHT_M,
  CLOUD_SHELL_ALTITUDE_M,
  CLOUD_SHELL_LOWEST_ALTITUDE_M,
  cloudPixelCoverageRatio,
  cloudShellFadeForCameraHeightM,
  extractCloudDensityBand,
  gibsCloudDateUtc,
  gibsCloudGlobeSnapshotUrl,
  gibsCloudLayerCandidates,
  gibsCloudWmtsUrlTemplate,
  gibsUtcDateString,
  GIBS_ALLOW_UNKEYED_WMTS_FALLBACK,
  GIBS_CLOUD_LAYER_ID,
  GIBS_CLOUD_LAYER_ID_NRT,
  GIBS_CLOUD_REFRESH_MS,
  GIBS_CLOUD_SHELL_ALPHA,
  keyCloudPixelsForShell,
} from "./cesiumGibsClouds";

describe("cesiumGibsClouds", () => {
  it("prefers NRT/today candidates for live-er clouds", () => {
    const fixed = new Date(Date.UTC(2026, 8, 30, 15, 0, 0));
    expect(gibsCloudDateUtc(fixed)).toBe("2026-09-29");
    const c = gibsCloudLayerCandidates(fixed);
    expect(c[0]?.layerId).toBe(GIBS_CLOUD_LAYER_ID_NRT);
    expect(c[0]?.time).toBe(gibsUtcDateString(0, fixed));
    expect(c.some((x) => x.layerId === GIBS_CLOUD_LAYER_ID)).toBe(true);
    expect(GIBS_CLOUD_REFRESH_MS).toBeLessThanOrEqual(30 * 60_000);
  });

  it("builds snapshot/WMTS URLs for cloud layers", () => {
    const snap = gibsCloudGlobeSnapshotUrl(
      "2026-09-29",
      2048,
      1024,
      GIBS_CLOUD_LAYER_ID_NRT,
    );
    expect(snap).toContain(GIBS_CLOUD_LAYER_ID_NRT);
    expect(snap).toContain("TRANSPARENT=TRUE");
    expect(gibsCloudWmtsUrlTemplate("2026-09-29", GIBS_CLOUD_LAYER_ID)).toContain(
      GIBS_CLOUD_LAYER_ID,
    );
  });

  it("does not allow unkeyed WMTS fallback (ocean-palette break)", () => {
    expect(GIBS_ALLOW_UNKEYED_WMTS_FALLBACK).toBe(false);
  });

  it("keeps only white cloud pixels so global atmosphere stays clear", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, // clear
      30, 40, 90, 255, // blue atmosphere tint
      100, 80, 140, 255, // purple fraction palette
      160, 160, 160, 255, // gray haze — should be weak/zero
      245, 245, 248, 255, // white cloud
    ]);
    keyCloudPixelsForShell(data);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
    expect(data[11]).toBe(0);
    expect(data[15]).toBeLessThan(50);
    expect(data[19]).toBeGreaterThan(180);
    expect(data[16]).toBe(255);
    expect(cloudPixelCoverageRatio(data)).toBeGreaterThan(0);
  });

  it("shows clouds at global height and clears when descending", () => {
    expect(cloudShellFadeForCameraHeightM(8_000_000)).toBe(1);
    expect(cloudShellFadeForCameraHeightM(CLOUD_FADE_START_HEIGHT_M)).toBe(1);
    expect(GIBS_CLOUD_SHELL_ALPHA).toBeLessThanOrEqual(0.4);
    expect(cloudShellFadeForCameraHeightM(CLOUD_FADE_END_HEIGHT_M)).toBe(0);
    expect(cloudShellFadeForCameraHeightM(CLOUD_SHELL_ALTITUDE_M * 0.5)).toBe(0);
    expect(cloudShellFadeForCameraHeightM(CLOUD_SHELL_LOWEST_ALTITUDE_M * 0.5)).toBe(
      0,
    );
  });

  it("stacks three 3D shells with rising altitude", () => {
    expect(CLOUD_3D_SHELLS).toHaveLength(3);
    expect(CLOUD_3D_SHELLS[0]!.altitudeM).toBeLessThan(CLOUD_3D_SHELLS[1]!.altitudeM);
    expect(CLOUD_3D_SHELLS[1]!.altitudeM).toBeLessThan(CLOUD_3D_SHELLS[2]!.altitudeM);
    expect(CLOUD_SHELL_ALTITUDE_M).toBe(CLOUD_3D_SHELLS[2]!.altitudeM);
  });

  it("splits keyed cloud alpha into density bands for layered shells", () => {
    const src = new Uint8ClampedArray([
      255, 255, 255, 40, // thin → high
      255, 255, 255, 140, // mid
      255, 255, 255, 230, // dense → low
      255, 255, 255, 0,
    ]);
    const high = extractCloudDensityBand(src, 0.06, 0.42);
    const mid = extractCloudDensityBand(src, 0.26, 0.7);
    const low = extractCloudDensityBand(src, 0.52, 1.01);
    expect(high[3]).toBeGreaterThan(0);
    expect(low[3]).toBe(0);
    expect(mid[7]).toBeGreaterThan(0);
    expect(low[11]).toBeGreaterThan(0);
    expect(high[11]).toBe(0);
  });
});
