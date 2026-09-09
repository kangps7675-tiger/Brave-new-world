import { describe, expect, it } from "vitest";
import { clampIntelStackClearancePx } from "@/lib/news/intelStackMode";

describe("clampIntelStackClearancePx", () => {
  it("pads measured height", () => {
    expect(clampIntelStackClearancePx(100, 900)).toBe(110);
  });

  it("never exceeds ~36vh", () => {
    const vh = 800;
    const capped = clampIntelStackClearancePx(600, vh);
    expect(capped).toBeLessThanOrEqual(Math.floor(vh * 0.36));
  });

  it("keeps a minimum floor", () => {
    expect(clampIntelStackClearancePx(10, 900)).toBe(52);
  });
});
