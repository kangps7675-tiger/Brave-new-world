import { describe, expect, it } from "vitest";
import {
  globeNavActionFromCode,
  panDeltaForDirs,
  shouldIgnoreGlobeKeyboardNav,
} from "@/lib/globeKeyboardNav";

describe("globeNavActionFromCode", () => {
  it("maps WASD and arrows to pan", () => {
    expect(globeNavActionFromCode("KeyW")).toEqual({ type: "pan", dir: "up" });
    expect(globeNavActionFromCode("KeyA")).toEqual({ type: "pan", dir: "left" });
    expect(globeNavActionFromCode("KeyS")).toEqual({ type: "pan", dir: "down" });
    expect(globeNavActionFromCode("KeyD")).toEqual({ type: "pan", dir: "right" });
    expect(globeNavActionFromCode("ArrowLeft")).toEqual({ type: "pan", dir: "left" });
    expect(globeNavActionFromCode("ArrowUp")).toEqual({ type: "pan", dir: "up" });
  });

  it("maps +/- and numpad to zoom", () => {
    expect(globeNavActionFromCode("Equal")).toEqual({ type: "zoom", dir: 1 });
    expect(globeNavActionFromCode("Minus")).toEqual({ type: "zoom", dir: -1 });
    expect(globeNavActionFromCode("NumpadAdd")).toEqual({ type: "zoom", dir: 1 });
    expect(globeNavActionFromCode("NumpadSubtract")).toEqual({ type: "zoom", dir: -1 });
    expect(globeNavActionFromCode("", "+")).toEqual({ type: "zoom", dir: 1 });
  });
});

describe("panDeltaForDirs", () => {
  it("returns null when no dirs", () => {
    expect(panDeltaForDirs(new Set(), 0.016)).toBeNull();
  });

  it("normalizes diagonal speed", () => {
    const single = panDeltaForDirs(new Set(["right"]), 0.016, 1000)!;
    const diag = panDeltaForDirs(new Set(["right", "up"]), 0.016, 1000)!;
    expect(Math.hypot(single.dx, single.dy)).toBeCloseTo(Math.hypot(diag.dx, diag.dy), 5);
  });
});

describe("shouldIgnoreGlobeKeyboardNav", () => {
  it("ignores elements that closest-match input selectors", () => {
    const inputish = {
      closest: (sel: string) => (sel.includes("input") ? inputish : null),
    } as unknown as Element;
    expect(shouldIgnoreGlobeKeyboardNav(inputish, inputish)).toBe(true);
  });

  it("allows plain elements without blocking ancestors", () => {
    const plain = {
      closest: () => null,
    } as unknown as Element;
    expect(shouldIgnoreGlobeKeyboardNav(plain, plain)).toBe(false);
  });
});
