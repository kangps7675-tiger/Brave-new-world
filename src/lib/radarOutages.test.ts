import { describe, expect, it } from "vitest";
import {
  extractAnnotationRows,
  normalizeRadarOutages,
} from "@/lib/radarOutages";

describe("radarOutages normalize", () => {
  it("reads result.annotations (Cloudflare Radar actual shape)", () => {
    const json = {
      success: true,
      result: {
        annotations: [
          {
            id: "1630",
            description: "Super Typhoon Bavi causes power and Internet outages across Guam",
            scope: null,
            startDate: "2026-07-05T12:00:00Z",
            endDate: null,
            locations: ["GU"],
            asns: [3605, 9246],
            eventType: "OUTAGE",
            linkedUrl: "https://x.com/CloudflareRadar/status/2074140640649105914",
            locationsDetails: [{ name: "Guam", code: "GU" }],
            outage: { outageCause: "NATURAL_DISASTER", outageType: "NATIONWIDE" },
            dataSource: "ALL",
          },
        ],
      },
    };

    expect(extractAnnotationRows(json)).toHaveLength(1);
    const outages = normalizeRadarOutages(json);
    expect(outages).toHaveLength(1);
    expect(outages[0]).toMatchObject({
      id: "1630",
      locations: ["GU"],
      outageCause: "NATURAL_DISASTER",
      outageType: "NATIONWIDE",
    });
  });

  it("falls back to result.outages when annotations empty", () => {
    const json = {
      result: {
        annotations: [],
        outages: [
          {
            id: "legacy",
            startDate: "2026-01-01T00:00:00Z",
            locations: ["KR"],
            outage: { outageCause: "UNKNOWN", outageType: "REGIONAL" },
          },
        ],
      },
    };
    expect(normalizeRadarOutages(json)[0]?.id).toBe("legacy");
  });

  it("returns empty array on garbage input", () => {
    expect(normalizeRadarOutages(null)).toEqual([]);
    expect(normalizeRadarOutages({})).toEqual([]);
    expect(normalizeRadarOutages({ result: { annotations: "nope" } })).toEqual([]);
  });
});
