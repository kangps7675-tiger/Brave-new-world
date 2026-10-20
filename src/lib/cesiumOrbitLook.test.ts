import { describe, expect, it } from "vitest";
import {
  clampOrbitLookPitchRad,
  ORBIT_LOOK_MIN_DOWN_DEG,
  ORBIT_LOOK_NADIR_PITCH_DEG,
} from "@/lib/cesiumOrbitLook";

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

describe("clampOrbitLookPitchRad", () => {
  it("stops at nadir instead of flipping over", () => {
    expect(deg(clampOrbitLookPitchRad(rad(-95), 600))).toBeCloseTo(
      ORBIT_LOOK_NADIR_PITCH_DEG,
    );
  });

  it("stops short of the horizon at low altitude", () => {
    expect(deg(clampOrbitLookPitchRad(rad(-2), 600))).toBeCloseTo(
      -ORBIT_LOOK_MIN_DOWN_DEG,
      0,
    );
  });

  it("keeps a mid tilt untouched", () => {
    expect(deg(clampOrbitLookPitchRad(rad(-45), 600))).toBeCloseTo(-45);
  });
});
