import { describe, expect, it } from "vitest";
import { gtiDefcon, gtiDefconLabel } from "./gti";
import { gscpiPressureLevel, gscpiPressureLabel } from "./gscpi";

describe("gtiDefcon", () => {
  it("maps GTS bands to DEFCON 5→1", () => {
    expect(gtiDefcon(0)).toBe(5);
    expect(gtiDefcon(19.9)).toBe(5);
    expect(gtiDefcon(20)).toBe(4);
    expect(gtiDefcon(40)).toBe(3);
    expect(gtiDefcon(60)).toBe(2);
    expect(gtiDefcon(80)).toBe(1);
    expect(gtiDefcon(100)).toBe(1);
  });

  it("labels DEFCON stages", () => {
    expect(gtiDefconLabel(5, true)).toBe("평시");
    expect(gtiDefconLabel(1, false)).toBe("Maximum");
  });
});

describe("gscpiPressureLevel", () => {
  it("maps sigma to pressure 1→5 (higher = tighter)", () => {
    expect(gscpiPressureLevel(-1)).toBe(1);
    expect(gscpiPressureLevel(0)).toBe(2);
    expect(gscpiPressureLevel(0.7)).toBe(3);
    expect(gscpiPressureLevel(1.2)).toBe(4);
    expect(gscpiPressureLevel(2)).toBe(5);
  });

  it("labels supply-chain pressure", () => {
    expect(gscpiPressureLabel(1, "ko")).toBe("원활");
    expect(gscpiPressureLabel(5, "en")).toBe("Severe");
  });
});
