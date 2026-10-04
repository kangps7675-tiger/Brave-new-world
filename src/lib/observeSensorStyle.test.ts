import { describe, expect, it } from "vitest";
import {
  OBSERVE_CONFLICT_PIN_MAX,
  OBSERVE_CONTROL_FILL_ALPHA,
  observeGradeStyle,
} from "@/lib/observeSensorStyle";

describe("observeSensorStyle", () => {
  it("maps displayGrade to sensor ring styles", () => {
    expect(observeGradeStyle("high").pulse).toBe(true);
    expect(observeGradeStyle("std").stroke).toMatch(/^#/);
    expect(observeGradeStyle("low").scale).toBeLessThan(
      observeGradeStyle("high").scale,
    );
    expect(observeGradeStyle(undefined).scale).toBe(observeGradeStyle("low").scale);
  });

  it("keeps control fill translucent for photoreal", () => {
    expect(OBSERVE_CONTROL_FILL_ALPHA).toBeLessThan(0.5);
    expect(OBSERVE_CONFLICT_PIN_MAX).toBeGreaterThan(0);
  });
});
