import { describe, expect, it } from "vitest";
import {
  observeSensorPinSvg,
  observeSensorPinUri,
  observePinCoreHex,
} from "@/lib/cesiumObservePins";

describe("cesiumObservePins", () => {
  it("builds grounded needle SVG with core color", () => {
    const svg = observeSensorPinSvg({ coreHex: "#fbbf24", kind: "event" });
    expect(svg).toContain("ellipse"); // ground disc
    expect(svg).toContain("#fbbf24");
    expect(svg).toContain('viewBox="0 0 48 64"');
  });

  it("caches URI by options", () => {
    const a = observeSensorPinUri({ coreHex: "#f87171", kind: "strike" });
    const b = observeSensorPinUri({ coreHex: "#f87171", kind: "strike" });
    expect(a).toBe(b);
    expect(a.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("maps category accent to palette hex", () => {
    expect(observePinCoreHex("red")).toBe("#f87171");
    expect(observePinCoreHex("unknown")).toBe("#e2e8f0");
  });
});
