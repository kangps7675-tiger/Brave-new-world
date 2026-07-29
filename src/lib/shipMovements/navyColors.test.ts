import { describe, expect, it } from "vitest";
import {
  SHIP_NAVY_COLORS,
  shipNavyFillColor,
  shipNavyPulseColor,
  shipNavyTrailColor,
} from "@/lib/shipMovements/navyColors";

describe("shipMovements navyColors", () => {
  it("uses gold for USN and blue for JMSDF", () => {
    expect(shipNavyFillColor("USN")).toBe(SHIP_NAVY_COLORS.USN);
    expect(shipNavyFillColor("usn")).toBe(SHIP_NAVY_COLORS.USN);
    expect(shipNavyFillColor("JMSDF")).toBe(SHIP_NAVY_COLORS.JMSDF);
  });

  it("maps PLAN/CN to red and unknown to gray", () => {
    expect(shipNavyFillColor("PLAN")).toBe(SHIP_NAVY_COLORS.PLAN);
    expect(shipNavyFillColor("CN")).toBe(SHIP_NAVY_COLORS.PLAN);
    expect(shipNavyFillColor(null)).toBe(SHIP_NAVY_COLORS.UNKNOWN);
    expect(shipNavyFillColor("XYZ")).toBe(SHIP_NAVY_COLORS.UNKNOWN);
  });

  it("builds translucent pulse/trail colors", () => {
    expect(shipNavyPulseColor("USN")).toMatch(/^rgba\(/);
    expect(shipNavyTrailColor("JMSDF", true)).toMatch(/^rgba\(/);
    expect(shipNavyTrailColor("JMSDF", false)).toMatch(/^rgba\(/);
  });
});
