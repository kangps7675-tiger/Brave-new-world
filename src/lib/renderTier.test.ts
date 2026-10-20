import { describe, expect, it, beforeEach } from "vitest";
import {
  getLoadingShaderPlan,
  resetLoadingShaderPlanCache,
} from "@/lib/renderTier";

describe("renderTier getLoadingShaderPlan", () => {
  beforeEach(() => {
    resetLoadingShaderPlanCache();
  });

  it("returns a valid plan shape", () => {
    const plan = getLoadingShaderPlan(true);
    expect(["static", "low", "full"]).toContain(plan.tier);
    expect([2, 4]).toContain(plan.fbmOctaves);
    expect(typeof plan.useShader).toBe("boolean");
    if (plan.tier === "static") expect(plan.useShader).toBe(false);
  });
});
