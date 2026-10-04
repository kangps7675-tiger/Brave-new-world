import { describe, expect, it } from "vitest";
import { OBSERVE_OCEAN_BASE } from "@/lib/cesiumOceanLook";

describe("cesiumOceanLook", () => {
  it("uses a near-black preload base (not deep-ocean paint)", () => {
    expect(OBSERVE_OCEAN_BASE).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(OBSERVE_OCEAN_BASE.toLowerCase()).not.toBe("#0a3a52");
    expect(OBSERVE_OCEAN_BASE.toLowerCase()).not.toBe("#1c1917");
  });
});

