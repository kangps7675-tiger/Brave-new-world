import { describe, expect, it } from "vitest";
import {
  CINEMATIC_FLY,
  LOCATION_LOOK_DOWN,
  lookAtRangeForHeight,
  resolveCinematicCamera,
} from "./globeCamera";

describe("resolveCinematicCamera", () => {
  it("lookAt 을 지정하지 않으면 키를 만들지 않는다 (기존 동작 유지)", () => {
    const r = resolveCinematicCamera();
    expect(r).toEqual({ pitch: CINEMATIC_FLY.pitch, bearing: CINEMATIC_FLY.bearing });
    expect("lookAt" in r).toBe(false);
  });

  it("lookAt: true 는 보존된다", () => {
    expect(resolveCinematicCamera({ lookAt: true }).lookAt).toBe(true);
  });

  it("LOCATION_LOOK_DOWN 은 직하에 가깝고 lookAt 이다", () => {
    const r = resolveCinematicCamera({
      pitch: LOCATION_LOOK_DOWN.pitch,
      bearing: LOCATION_LOOK_DOWN.bearing,
      lookAt: LOCATION_LOOK_DOWN.lookAt,
    });
    expect(r.pitch).toBeLessThan(20);
    expect(r.bearing).toBe(0);
    expect(r.lookAt).toBe(true);
  });
});

describe("lookAtRangeForHeight", () => {
  it("pitch −38°(하향 38°) 에서 range = H / sin38°", () => {
    const h = 1_900_000;
    expect(lookAtRangeForHeight(h, -38)).toBeCloseTo(h / Math.sin((38 * Math.PI) / 180), 3);
  });

  it("직하(−90°)에 가까우면 range ≈ H, 수평에 가까워도 폭주하지 않는다", () => {
    expect(lookAtRangeForHeight(1000, -90)).toBeCloseTo(1000 / Math.sin((89 * Math.PI) / 180), 3);
    expect(lookAtRangeForHeight(1000, 0)).toBeLessThan(1000 / Math.sin((10 * Math.PI) / 180) + 1e-6);
  });
});

import { clampCesiumPitchToGlobeDeg, horizonDipDeg } from "./globeCamera";

describe("clampCesiumPitchToGlobeDeg (우주만 보이는 카메라 방지)", () => {
  it("9,200km 에서 −38° 는 수평선(≈66°) 아래로 보정된다 — 부트 인트로 회귀", () => {
    expect(horizonDipDeg(9_200_000)).toBeGreaterThan(60);
    expect(clampCesiumPitchToGlobeDeg(9_200_000, -38)).toBeLessThan(-60);
  });

  it("저고도에서는 충분히 숙인 pitch 를 건드리지 않는다", () => {
    expect(clampCesiumPitchToGlobeDeg(100_000, -38)).toBe(-38);
  });

  it("직하는 항상 유지, 위를 보는 값은 지표 쪽으로", () => {
    expect(clampCesiumPitchToGlobeDeg(5_000_000, -90)).toBe(-90);
    expect(clampCesiumPitchToGlobeDeg(5_000_000, 10)).toBeLessThan(-30);
  });
});
