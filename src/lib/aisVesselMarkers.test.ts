import { describe, expect, it } from "vitest";
import { aisTrackerArrowSvg, aisTrackerKind } from "@/lib/aisVesselMarkers";

describe("aisTrackerKind", () => {
  it("picks a different mark per vessel class", () => {
    expect(aisTrackerKind({ shipType: 70, category: "commercial" })).toBe("cargo");
    expect(aisTrackerKind({ shipType: 80, category: "commercial" })).toBe("tanker");
    expect(aisTrackerKind({ shipType: 60, category: "commercial" })).toBe("passenger");
    expect(aisTrackerKind({ shipType: 30, category: "commercial" })).toBe("fishing");
    expect(aisTrackerKind({ shipType: 2, category: "commercial" })).toBe("fishing");
    expect(aisTrackerKind({ shipType: 40, category: "commercial" })).toBe("hsc");
    expect(aisTrackerKind({ shipType: 52, category: "other" })).toBe("special");
    expect(aisTrackerKind({ shipType: 7, category: "commercial" })).toBe("cargo");
    expect(aisTrackerKind({ shipType: 37, category: "other" })).toBe("pleasure");
    expect(aisTrackerKind({ shipType: 35, category: "military" })).toBe("military");
    expect(aisTrackerKind({ shipType: 70, category: "commercial", disguised: true })).toBe(
      "disguised",
    );
  });

  it("draws a distinct arrow silhouette per kind", () => {
    const cargo = aisTrackerArrowSvg("cargo", "#1B8F3A", 32);
    const tanker = aisTrackerArrowSvg("tanker", "#E10600", 32);
    const military = aisTrackerArrowSvg("military", "#111827", 32);
    expect(cargo).not.toBe(tanker);
    expect(military).toContain("M16 1 L26 13.5");
    expect(cargo).not.toContain("M16 1 L26 13.5");
    expect(aisTrackerArrowSvg("disguised", "#F59E0B", 32)).toContain('fill="none"');
  });
});
