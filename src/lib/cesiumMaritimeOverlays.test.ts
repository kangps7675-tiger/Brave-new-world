import { describe, expect, it } from "vitest";
import { buildMaritimeOverlaySegments } from "@/lib/cesiumMaritimeOverlays";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

describe("buildMaritimeOverlaySegments", () => {
  it("builds UKMTO circle outline + hatch like geopolitics", () => {
    const incident: UkmtoIncidentPoint = {
      id: "u1",
      incidentNumber: 1,
      incidentTypeName: "Attack",
      pinColour: "Red",
      lat: 12.5,
      lng: 43.3,
      region: "Red Sea",
      place: "Bab el-Mandeb",
      vesselName: null,
      vesselType: null,
      detail: null,
      utcDateOfIncident: null,
    };
    const segs = buildMaritimeOverlaySegments({
      ukmtoIncidents: [incident],
      navareaFeatures: [],
      chokeRings: [],
    });
    expect(segs.length).toBeGreaterThan(2);
    expect(segs.every((s) => s.pickId === "alert:ukmto:u1")).toBe(true);
    expect(segs.some((s) => s.points.length > 8)).toBe(true);
    // 실사 센서 문법 — hatch는 outline보다 얇음 (OBSERVE_*_WIDTH_M)
    expect(segs.every((s) => s.widthM >= 800)).toBe(true);
  });

  it("builds PortWatch ring with zoom-scaled widthM", () => {
    const segs = buildMaritimeOverlaySegments({
      ukmtoIncidents: [],
      navareaFeatures: [],
      chokeRings: [
        {
          id: "choke-hormuz",
          lat: 26.58,
          lng: 56.25,
          radiusScale: 0.38,
          color: "#ef4444",
        },
      ],
    });
    expect(segs).toHaveLength(1);
    expect(segs[0]!.pickId).toBe("alert:portwatch:choke-hormuz");
    expect(segs[0]!.points.length).toBeGreaterThan(20);
    expect(segs[0]!.color).toBe("#ef4444");
  });

  it("builds NAVAREA hatch segments with violet pick id", () => {
    const feature: NavareaFeaturePoint = {
      id: "n1",
      region: "XI",
      source: "jhod",
      date: "2026-01-01",
      areaHint: "Persian Gulf",
      description: "Missile exercise",
      geometryType: "Point",
      radiusNm: 12,
      lat: 26,
      lng: 52,
      geometry: { type: "Point", coordinates: [52, 26] },
    };
    const segs = buildMaritimeOverlaySegments({
      ukmtoIncidents: [],
      navareaFeatures: [feature],
      chokeRings: [],
    });
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every((s) => s.pickId === "alert:navarea:n1")).toBe(true);
  });
});
