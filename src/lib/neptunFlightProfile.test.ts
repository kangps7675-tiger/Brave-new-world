import { describe, expect, it } from "vitest";
import {
  ISKANDER_APOGEE_M,
  ISKANDER_LEVEL_M,
  iskanderHeightM,
  NEPTUN_CRUISE_HEIGHT_M,
  SHAHED_DIVE_START,
  shahedHeightM,
} from "./neptunFlightProfile";

describe("iskanderHeightM", () => {
  it("rises to apogee then levels then dives", () => {
    const launch = iskanderHeightM(0);
    const climb = iskanderHeightM(0.18);
    const apogee = iskanderHeightM(0.36);
    const afterDive = iskanderHeightM(0.58);
    const level = iskanderHeightM(0.75);
    const dive = iskanderHeightM(0.95);
    const impact = iskanderHeightM(1);

    expect(launch).toBeLessThan(2_000);
    expect(climb).toBeGreaterThan(launch);
    expect(apogee).toBeGreaterThan(70_000);
    expect(apogee).toBeLessThanOrEqual(ISKANDER_APOGEE_M + 1);
    expect(afterDive).toBeLessThan(apogee);
    expect(afterDive).toBeGreaterThan(ISKANDER_LEVEL_M * 0.85);
    expect(Math.abs(level - ISKANDER_LEVEL_M)).toBeLessThan(ISKANDER_LEVEL_M * 0.12);
    expect(dive).toBeLessThan(level);
    expect(impact).toBeLessThan(1_500);
  });
});

describe("shahedHeightM", () => {
  const cruise = NEPTUN_CRUISE_HEIGHT_M.uav;

  it("cruises then kamikaze-dives", () => {
    const mid = shahedHeightM(cruise, 0.5);
    const preDive = shahedHeightM(cruise, SHAHED_DIVE_START);
    const diving = shahedHeightM(cruise, 0.97);
    const impact = shahedHeightM(cruise, 1);

    expect(mid).toBeGreaterThan(cruise * 0.85);
    expect(mid).toBeLessThan(cruise * 1.1);
    expect(preDive).toBeGreaterThan(cruise * 0.85);
    expect(diving).toBeLessThan(preDive * 0.45);
    expect(impact).toBeLessThan(200);
  });
});

describe("NEPTUN_CRUISE_HEIGHT_M", () => {
  it("keeps UAV and KAB in the thousands of meters", () => {
    expect(NEPTUN_CRUISE_HEIGHT_M.uav).toBeGreaterThanOrEqual(2_000);
    expect(NEPTUN_CRUISE_HEIGHT_M.uav).toBeLessThan(10_000);
    expect(NEPTUN_CRUISE_HEIGHT_M.kab).toBeGreaterThanOrEqual(2_000);
    expect(NEPTUN_CRUISE_HEIGHT_M.kab).toBeLessThan(10_000);
  });
});
