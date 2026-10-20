import { describe, expect, it } from "vitest";
import {
  OBSERVE_IDLE_SPIN_MIN_HEIGHT_M,
  observeIdleSpinShouldRun,
} from "@/lib/cesiumObserveStage";

describe("cesiumObserveStage idle spin gate", () => {
  const base = {
    cinemaOn: true,
    tracked: false,
    pointerActive: false,
    visibilityVisible: true,
    heightM: OBSERVE_IDLE_SPIN_MIN_HEIGHT_M + 1,
  };

  it("runs only in cinema orbit idle", () => {
    expect(observeIdleSpinShouldRun(base)).toBe(true);
  });

  it("stops when tracked, dragging, hidden, low, or lite", () => {
    expect(observeIdleSpinShouldRun({ ...base, cinemaOn: false })).toBe(false);
    expect(observeIdleSpinShouldRun({ ...base, tracked: true })).toBe(false);
    expect(observeIdleSpinShouldRun({ ...base, programmatic: true })).toBe(
      false,
    );
    expect(observeIdleSpinShouldRun({ ...base, pointerActive: true })).toBe(
      false,
    );
    expect(
      observeIdleSpinShouldRun({ ...base, visibilityVisible: false }),
    ).toBe(false);
    expect(
      observeIdleSpinShouldRun({
        ...base,
        heightM: OBSERVE_IDLE_SPIN_MIN_HEIGHT_M - 1,
      }),
    ).toBe(false);
  });
});
