import { describe, expect, it } from "vitest";
import {
  classifyDeepstateName,
  deepstateToOccupiedGeoJson,
} from "@/lib/deepstate/toOccupiedGeoJson";

describe("classifyDeepstateName", () => {
  it("maps occupied / annexed / unknown and skips liberated", () => {
    expect(
      classifyDeepstateName("Окуповано /// Occupied /// geoJSON.status.occupied"),
    ).toBe("occupied");
    expect(
      classifyDeepstateName("Окупований Крим /// Occupied Crimea /// geoJSON.territories.crimea"),
    ).toBe("annexed");
    expect(
      classifyDeepstateName("Статус невідомий /// Unknown status /// geoJSON.status.unknown"),
    ).toBe("unknown");
    expect(
      classifyDeepstateName("Звільнено /// Liberated /// geoJSON.status.dismissed"),
    ).toBeNull();
    expect(
      classifyDeepstateName("Occupied Abkhazia /// geoJSON.territories.abkhazia"),
    ).toBeNull();
  });
});

describe("deepstateToOccupiedGeoJson", () => {
  it("keeps UA-theater occupied polygons as solid fills (no hatch)", () => {
    const fc = deepstateToOccupiedGeoJson({
      map: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: "Окуповано /// Occupied /// geoJSON.status.occupied",
              fill: "#a52714",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [37.2, 48.2, 0],
                  [37.4, 48.2, 0],
                  [37.4, 48.4, 0],
                  [37.2, 48.4, 0],
                  [37.2, 48.2, 0],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: {
              name: "Звільнено /// Liberated /// geoJSON.status.dismissed",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [36.0, 49.0],
                  [36.2, 49.0],
                  [36.2, 49.2],
                  [36.0, 49.2],
                  [36.0, 49.0],
                ],
              ],
            },
          },
        ],
      },
    });

    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]?.properties?.role).toBe("ru-occupied");
    expect(fc.features[0]?.properties?.fill).toBe("#a52714");
    expect(fc.features[0]?.geometry.type).toBe("Polygon");
    const ring = (fc.features[0]?.geometry as GeoJSON.Polygon).coordinates[0];
    expect(ring?.[0]).toEqual([37.2, 48.2]);
  });
});
