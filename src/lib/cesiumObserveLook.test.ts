import { describe, expect, it } from "vitest";
import {
  OBSERVE_CLOUD_ALPHA_CINEMA,
  OBSERVE_CLOUD_ALPHA_LITE,
  OBSERVE_LOOK_NEAR_M,
  OBSERVE_LOOK_ORBIT_M,
  observeLookForHeightM,
} from "@/lib/cesiumObserveLook";

describe("cesiumObserveLook", () => {
  it("orbit is brighter rim than near", () => {
    const orbit = observeLookForHeightM(OBSERVE_LOOK_ORBIT_M + 1);
    const near = observeLookForHeightM(OBSERVE_LOOK_NEAR_M - 1);
    expect(orbit.atmosphereLightIntensity).toBeGreaterThan(
      near.atmosphereLightIntensity,
    );
    expect(orbit.sseBias).toBeGreaterThan(near.sseBias);
  });

  it("interpolates mid altitudes", () => {
    const mid = observeLookForHeightM(
      (OBSERVE_LOOK_NEAR_M + OBSERVE_LOOK_ORBIT_M) / 2,
    );
    const near = observeLookForHeightM(OBSERVE_LOOK_NEAR_M);
    const orbit = observeLookForHeightM(OBSERVE_LOOK_ORBIT_M);
    expect(mid.atmosphereLightIntensity).toBeGreaterThan(
      near.atmosphereLightIntensity,
    );
    expect(mid.atmosphereLightIntensity).toBeLessThan(
      orbit.atmosphereLightIntensity,
    );
  });

  it("cinema boosts orbit rim and cloud alpha only", () => {
    const liteOrbit = observeLookForHeightM(OBSERVE_LOOK_ORBIT_M + 1);
    const cinemaOrbit = observeLookForHeightM(OBSERVE_LOOK_ORBIT_M + 1, {
      cinema: true,
    });
    expect(cinemaOrbit.atmosphereLightIntensity).toBeGreaterThan(
      liteOrbit.atmosphereLightIntensity,
    );
    expect(cinemaOrbit.cloudAlpha).toBeCloseTo(OBSERVE_CLOUD_ALPHA_CINEMA);
    expect(liteOrbit.cloudAlpha).toBeCloseTo(OBSERVE_CLOUD_ALPHA_LITE);

    const liteNear = observeLookForHeightM(OBSERVE_LOOK_NEAR_M - 1);
    const cinemaNear = observeLookForHeightM(OBSERVE_LOOK_NEAR_M - 1, {
      cinema: true,
    });
    expect(cinemaNear.atmosphereLightIntensity).toBeCloseTo(
      liteNear.atmosphereLightIntensity,
    );
    expect(cinemaNear.cloudAlpha).toBeCloseTo(OBSERVE_CLOUD_ALPHA_LITE);
  });
});
