import { describe, expect, it } from "vitest";
import {
  CESIUM_LAZY_MOUNT_REVEAL,
  CESIUM_REVEAL_ACTIVE,
  MAPLIBRE_OPACITY_AT_FULL_REVEAL,
  computeCesiumBlend,
  lerp,
  smoothstep,
} from "@/lib/cesium/maplibreCesiumBlend";
import {
  cesiumRangeToApproxMapLibreZoom,
  mapLibrePitchToCesiumPitchDeg,
  mapLibreViewToCesiumLookAt,
  mapLibreZoomToCesiumRange,
} from "@/lib/cesium/maplibreToCesiumCamera";

describe("maplibreCesiumBlend", () => {
  it("keeps MapLibre opaque and Cesium dormant at globe zoom", () => {
    const b = computeCesiumBlend({ zoom: 3, pitch: 0 });
    expect(b.cesiumReveal).toBe(0);
    expect(b.mapLibreOpacity).toBe(1);
    expect(b.cesiumActive).toBe(false);
    expect(b.shouldMountCesium).toBe(false);
  });

  it("ramps reveal with zoom and pitch", () => {
    const far = computeCesiumBlend({ zoom: 7, pitch: 0 });
    const near = computeCesiumBlend({ zoom: 10, pitch: 40 });
    expect(near.cesiumReveal).toBeGreaterThan(far.cesiumReveal);
    expect(near.mapLibreOpacity).toBeCloseTo(MAPLIBRE_OPACITY_AT_FULL_REVEAL, 2);
    expect(near.cesiumActive).toBe(true);
  });

  it("mounts Cesium before full active threshold", () => {
    expect(CESIUM_LAZY_MOUNT_REVEAL).toBeLessThan(CESIUM_REVEAL_ACTIVE);
  });

  it("smoothstep and lerp stay in range", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("maplibreToCesiumCamera", () => {
  it("maps nadir pitch to -90° and tilt toward horizon", () => {
    expect(mapLibrePitchToCesiumPitchDeg(0)).toBe(-90);
    expect(mapLibrePitchToCesiumPitchDeg(45)).toBe(-45);
  });

  it("produces lookAt params with finite range", () => {
    const look = mapLibreViewToCesiumLookAt({
      longitude: 127.0,
      latitude: 37.5,
      zoom: 9,
      pitch: 35,
      bearing: 20,
      viewportHeightPx: 900,
    });
    expect(look.longitude).toBe(127);
    expect(look.latitude).toBe(37.5);
    expect(look.range).toBeGreaterThan(100);
    expect(look.headingRad).toBeCloseTo((20 * Math.PI) / 180, 5);
    expect(look.pitchRad).toBeCloseTo((-55 * Math.PI) / 180, 5);
  });

  it("round-trips zoom ↔ range approximately", () => {
    const lat = 25;
    const zoom = 8.5;
    const range = mapLibreZoomToCesiumRange(lat, zoom, 800);
    const back = cesiumRangeToApproxMapLibreZoom(lat, range, 800);
    expect(Math.abs(back - zoom)).toBeLessThan(0.05);
  });
});
