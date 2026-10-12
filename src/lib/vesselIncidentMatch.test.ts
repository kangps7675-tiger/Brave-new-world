import { describe, expect, it } from "vitest";
import type { AisVessel } from "@/data/geoTypes";
import {
  formatAisMatchParagraph,
  incidentVesselTypeToAisFamily,
  matchIncidentToAis,
  normalizeVesselName,
  vesselNameSimilarity,
} from "@/lib/vesselIncidentMatch";

function vessel(over: Partial<AisVessel>): AisVessel {
  return {
    id: over.mmsi ?? "1",
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
    ...over,
  };
}

const incident = {
  id: "ukmto-1",
  lat: 14.18,
  lng: 42.62,
  vesselName: "MV SOUNION",
  vesselType: "Oil Tanker",
  utcDateOfIncident: "2026-10-12T08:00:00Z",
};

describe("normalizeVesselName", () => {
  it("drops MV/MT prefixes and punctuation", () => {
    expect(normalizeVesselName("M/V Sounion")).toBe("SOUNION");
    expect(normalizeVesselName("MT  Eternity-C")).toBe("ETERNITYC");
    expect(normalizeVesselName(null)).toBe("");
  });
});

describe("vesselNameSimilarity", () => {
  it("is 1 for the same name after normalization", () => {
    expect(vesselNameSimilarity("MV SOUNION", "Sounion")).toBe(1);
  });
  it("tolerates one typo on a long name but not on a short one", () => {
    expect(vesselNameSimilarity("ETERNITY C", "ETERNITY G")).toBeGreaterThan(0.85);
    expect(vesselNameSimilarity("ABC", "ABD")).toBe(0);
  });
});

describe("incidentVesselTypeToAisFamily", () => {
  it("maps common UKMTO wording", () => {
    expect(incidentVesselTypeToAisFamily("Oil Tanker")).toBe(8);
    expect(incidentVesselTypeToAisFamily("Bulk Carrier")).toBe(7);
    expect(incidentVesselTypeToAisFamily("???")).toBeNull();
  });
});

describe("matchIncidentToAis", () => {
  it("grades a same-name vessel next to the incident as strong", () => {
    const m = matchIncidentToAis(incident, [vessel({})]);
    expect(m).toHaveLength(1);
    expect(m[0]!.grade).toBe("strong");
    expect(m[0]!.mmsi).toBe("538000001");
    expect(m[0]!.reasons.join(" ")).toContain("선명 일치");
  });

  it("downgrades a same-name vessel that is too far to have been there", () => {
    const far = vessel({ lat: 25.0, lng: 55.0 }); // 호르무즈 쪽 동명선
    const m = matchIncidentToAis(incident, [far]);
    expect(m[0]!.grade).toBe("probable");
    expect(m[0]!.reasons.join(" ")).toContain("밖");
  });

  it("does not match a different name when the incident names the ship", () => {
    const other = vessel({ shipName: "MAERSK ALABAMA", mmsi: "2" });
    expect(matchIncidentToAis(incident, [other])).toEqual([]);
  });

  it("offers nearby same-type candidates only when the name is undisclosed", () => {
    const nameless = { ...incident, vesselName: null };
    const near = vessel({ mmsi: "3", shipName: "UNRELATED ONE" });
    const wrongType = vessel({ mmsi: "4", shipName: "BOX CARRIER", shipType: 60 });
    const tooFar = vessel({ mmsi: "5", shipName: "FAR AWAY", lat: 15.5, lng: 43.9 });
    const m = matchIncidentToAis(nameless, [near, wrongType, tooFar]);
    expect(m.map((x) => x.mmsi)).toEqual(["3"]);
    expect(m[0]!.grade).toBe("candidate");
  });

  it("returns nothing for an incident without coordinates", () => {
    expect(
      matchIncidentToAis({ ...incident, lat: Number.NaN }, [vessel({})]),
    ).toEqual([]);
  });

  it("ranks the closer of two same-name vessels first", () => {
    const a = vessel({ mmsi: "10", lat: 14.19, lng: 42.62 });
    const b = vessel({ mmsi: "11", lat: 14.6, lng: 42.9 });
    const m = matchIncidentToAis(incident, [b, a]);
    expect(m[0]!.mmsi).toBe("10");
  });
});

describe("formatAisMatchParagraph", () => {
  it("never reads as 'no ship was hit' when nothing matches", () => {
    const ko = formatAisMatchParagraph([], "ko", 120);
    expect(ko).toContain("찾지 못했습니다");
    expect(ko).toContain("뜻하지 않습니다");
    expect(formatAisMatchParagraph([], "en", 120)).toContain("does not mean");
  });

  it("states the grade and keeps the not-a-confirmation caveat", () => {
    const [top] = matchIncidentToAis(incident, [vessel({})]);
    const ko = formatAisMatchParagraph([top!], "ko", 50);
    expect(ko).toContain("SOUNION");
    expect(ko).toContain("538000001");
    expect(ko).toContain("확정이 아니라");
    expect(formatAisMatchParagraph([top!], "en", 50)).toContain("not a confirmation");
  });
});
