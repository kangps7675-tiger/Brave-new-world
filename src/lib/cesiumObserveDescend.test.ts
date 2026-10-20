import { describe, expect, it } from "vitest";
import {
  DESCEND_CLEARANCE_M,
  DESCEND_TILE_GATE_M,
  DESCEND_TRANSIT_MAX_M,
  DESCEND_TRANSIT_MIN_M,
  planObserveDescend,
} from "@/lib/cesiumObserveDescend";

describe("planObserveDescend", () => {
  it("transits at capped orbit height, then gates and lands at ground + 600m", () => {
    const plan = planObserveDescend({
      currentHeightM: 5_400_000,
      surfaceDistanceM: 3_000_000,
      groundM: 1_200,
    });
    expect(plan.transitHeightM).toBe(DESCEND_TRANSIT_MAX_M);
    expect(plan.gateHeightM).toBe(1_200 + DESCEND_TILE_GATE_M);
    expect(plan.finalHeightM).toBe(1_200 + DESCEND_CLEARANCE_M);
  });

  it("does not drop below the transit floor while moving sideways", () => {
    const plan = planObserveDescend({
      currentHeightM: 50_000,
      surfaceDistanceM: 800_000,
      groundM: 0,
    });
    expect(plan.transitHeightM).toBe(DESCEND_TRANSIT_MIN_M);
  });

  it("skips transit when already overhead and gate when already low", () => {
    const plan = planObserveDescend({
      currentHeightM: 15_000,
      surfaceDistanceM: 100,
      groundM: 0,
      clearanceM: 400,
    });
    expect(plan.transitHeightM).toBeNull();
    expect(plan.gateHeightM).toBeNull();
    expect(plan.finalHeightM).toBe(400);
  });
});
