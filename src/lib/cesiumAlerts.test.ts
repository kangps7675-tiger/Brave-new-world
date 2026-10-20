import { describe, expect, it } from "vitest";
import { buildCesiumAlerts } from "./cesiumAlerts";
import type { UkmtoIncidentPoint } from "./ukmtoHatch";

function incident(partial: Partial<UkmtoIncidentPoint> & Pick<UkmtoIncidentPoint, "id" | "incidentTypeName">): UkmtoIncidentPoint {
  return {
    incidentNumber: 1,
    pinColour: null,
    lat: 12,
    lng: 44,
    region: null,
    place: partial.place ?? partial.incidentTypeName,
    vesselName: null,
    vesselType: null,
    detail: null,
    utcDateOfIncident: null,
    ...partial,
  };
}

describe("buildCesiumAlerts", () => {
  it("puts high-threat UKMTO ahead of advisories and keeps AIS gates", () => {
    const alerts = buildCesiumAlerts({
      lang: "ko",
      ukmtoIncidents: [
        incident({ id: "a", incidentTypeName: "Advisory", place: "안내" }),
        incident({ id: "h", incidentTypeName: "Hijack", place: "나포" }),
      ],
      navareaFeatures: [],
      exercises: [],
      disguisedVessels: [],
      portWatchByChokeId: {},
    });
    const ukmto = alerts.filter((item) => item.kind === "ukmto");
    expect(ukmto[0]?.id).toBe("ukmto:h");
    expect(alerts.some((item) => item.kind === "ais-gate")).toBe(true);
  });
});
