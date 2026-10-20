import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import {
  HISTORY_POLITY_LABEL_MAX_VISIBLE,
  buildHistoryPolityLabelGeoJson,
  historyLabelUsesHangul,
} from "@/lib/historical/historyPolityLabels";

describe("historyPolityLabels", () => {
  it("detects Hangul labels", () => {
    expect(historyLabelUsesHangul("발해")).toBe(true);
    expect(historyLabelUsesHangul("Balhae")).toBe(false);
  });

  it("builds ranked centroid points from polity polygons", () => {
    const cliopatria: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Rome" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [10, 40],
                [20, 40],
                [20, 50],
                [10, 50],
                [10, 40],
              ],
            ],
          },
        },
      ],
    };
    const korea: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { nameKo: "발해" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [127, 40],
                [131, 40],
                [131, 43],
                [127, 43],
                [127, 40],
              ],
            ],
          },
        },
      ],
    };

    const fc = buildHistoryPolityLabelGeoJson({ cliopatria, korea });
    expect(fc.features.length).toBeGreaterThanOrEqual(2);
    expect(fc.features[0]?.geometry.type).toBe("Point");
    expect(fc.features.some((f) => f.properties?.label === "발해")).toBe(true);
    expect(fc.features.length).toBeLessThanOrEqual(HISTORY_POLITY_LABEL_MAX_VISIBLE * 3);
  });
});
