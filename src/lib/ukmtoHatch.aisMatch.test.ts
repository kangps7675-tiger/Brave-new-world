import { describe, expect, it } from "vitest";
import type { AisVessel } from "@/data/geoTypes";
import { buildUkmtoBriefingContent, type UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

const incident: UkmtoIncidentPoint = {
  id: "u1",
  incidentNumber: 123,
  incidentTypeName: "Attack",
  pinColour: null,
  lat: 14.18,
  lng: 42.62,
  region: "Red Sea",
  place: "Red Sea",
  vesselName: "MV SOUNION",
  vesselType: "Oil Tanker",
  detail: null,
  utcDateOfIncident: "2026-10-12T08:00:00Z",
};

const ship: AisVessel = {
  id: "1",
  mmsi: "538000001",
  shipName: "SOUNION",
  lat: 14.2,
  lng: 42.6,
  speedOverGround: 0,
  courseOverGround: null,
  trueHeading: null,
  timestamp: "2026-10-12T08:30:00Z",
  shipType: 80,
  shipTypeLabel: "Tanker",
  category: "commercial",
};

describe("buildUkmtoBriefingContent + AIS cross-check", () => {
  it("is unchanged when no AIS is loaded", () => {
    const base = buildUkmtoBriefingContent(incident, "ko");
    expect(buildUkmtoBriefingContent(incident, "ko", [])).toEqual(base);
    expect(base.paragraphs.join(" ")).not.toContain("AIS 대조");
  });

  it("adds one cross-check paragraph right after the vessel line", () => {
    const base = buildUkmtoBriefingContent(incident, "ko");
    const withAis = buildUkmtoBriefingContent(incident, "ko", [ship]);
    expect(withAis.paragraphs).toHaveLength(base.paragraphs.length + 1);
    expect(withAis.paragraphs[2]).toContain("AIS 대조");
    expect(withAis.paragraphs[2]).toContain("SOUNION");
  });
});
