import { describe, expect, it } from "vitest";
import {
  coolCssColor,
  disconfirmCollapseFactor,
  isPromotion,
  timeWindowAlpha,
} from "@/lib/intelContract/deskDynamics";

describe("timeWindowAlpha", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  it("keeps recent bright", () => {
    expect(
      timeWindowAlpha("2026-10-04T10:00:00Z", 72, now),
    ).toBeGreaterThan(0.8);
  });
  it("dims outside 72h", () => {
    expect(
      timeWindowAlpha("2026-09-20T12:00:00Z", 72, now),
    ).toBeLessThan(0.3);
  });
});

describe("disconfirm cool", () => {
  it("cools color and collapses", () => {
    expect(coolCssColor("#5eead4", 2)).not.toBe("#5eead4");
    expect(disconfirmCollapseFactor(2)).toBeLessThan(1);
    expect(disconfirmCollapseFactor(0)).toBe(1);
  });
});

describe("isPromotion", () => {
  it("detects hold to active", () => {
    expect(isPromotion("hold", "std")).toBe(true);
    expect(isPromotion("std", "high")).toBe(false);
    expect(isPromotion(undefined, "low")).toBe(false);
  });
});
