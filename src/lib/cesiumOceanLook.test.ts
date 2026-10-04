import { describe, expect, it } from "vitest";
import { OBSERVE_OCEAN_BASE } from "@/lib/cesiumOceanLook";

describe("cesiumOceanLook", () => {
  it("uses a deep ocean base color", () => {
    expect(OBSERVE_OCEAN_BASE).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(OBSERVE_OCEAN_BASE.toLowerCase()).not.toBe("#000000");
  });
});
