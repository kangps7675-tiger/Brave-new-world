import { describe, expect, it } from "vitest";
import {
  geocodeOrefRegion,
  hasOrefMapCoords,
  isEvidenceGradeOrefMatch,
} from "@/lib/israelAlertZones";

describe("geocodeOrefRegion", () => {
  it("returns exact match for known zone names", () => {
    const result = geocodeOrefRegion("שדרות");
    expect(result.match).toBe("exact");
    expect(result.matchedName).toBe("שדרות");
    expect(hasOrefMapCoords(result)).toBe(true);
    expect(isEvidenceGradeOrefMatch(result.match)).toBe(true);
    expect(result.lat).toBeCloseTo(31.525, 2);
    expect(result.lng).toBeCloseTo(34.596, 2);
  });

  it("records partial match without inventing coordinates", () => {
    const result = geocodeOrefRegion("שדרות - מערב");
    expect(result.match).toBe("partial");
    expect(result.matchedName).toBe("שדרות");
    expect(hasOrefMapCoords(result)).toBe(true);
    expect(isEvidenceGradeOrefMatch(result.match)).toBe(false);
  });

  it("returns null coords for unknown regions (no hash fallback)", () => {
    const unknown = "יישוב שלא קיים במאגר";
    const a = geocodeOrefRegion(unknown);
    const b = geocodeOrefRegion(`${unknown}-variant`);
    expect(a).toEqual({
      lat: null,
      lng: null,
      match: "none",
      matchedName: null,
    });
    expect(b).toEqual(a);
    expect(hasOrefMapCoords(a)).toBe(false);
    expect(isEvidenceGradeOrefMatch(a.match)).toBe(false);
  });

  it("returns none for empty input", () => {
    expect(geocodeOrefRegion("   ").match).toBe("none");
    expect(geocodeOrefRegion("").lat).toBeNull();
  });
});
