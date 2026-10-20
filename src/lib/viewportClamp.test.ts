import { describe, expect, it } from "vitest";
import {
  boxesOverlap,
  clampBoxToViewport,
  shiftBoxFromObstacles,
  type ViewportBox,
} from "@/lib/viewportClamp";

describe("viewportClamp chrome obstacles", () => {
  const viewport = { width: 1280, height: 720 };

  it("detects overlap with padding", () => {
    const chip: ViewportBox = { left: 1100, top: 12, width: 160, height: 80 };
    const tip: ViewportBox = { left: 1080, top: 20, width: 200, height: 64 };
    expect(boxesOverlap(chip, tip)).toBe(true);
    expect(boxesOverlap(chip, { left: 10, top: 10, width: 80, height: 40 })).toBe(false);
  });

  it("shifts a tooltip below the top-right chip stack", () => {
    const chip: ViewportBox = { left: 1100, top: 12, width: 160, height: 80 };
    const tip: ViewportBox = { left: 1080, top: 20, width: 200, height: 64 };
    const shifted = shiftBoxFromObstacles(tip, [chip], viewport, 10);
    const placed: ViewportBox = { ...tip, ...shifted };
    expect(boxesOverlap(placed, chip, 2)).toBe(false);
    expect(shifted.top).toBeGreaterThanOrEqual(chip.top + chip.height);
  });

  it("still clamps to the viewport after shifting", () => {
    const shifted = clampBoxToViewport(-40, -20, 200, 64, 10, viewport);
    expect(shifted.left).toBe(10);
    expect(shifted.top).toBe(10);
  });
});
