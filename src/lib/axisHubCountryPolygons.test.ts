import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import {
  axisHubBorderWidthPx,
  collectAxisHubBorderRings,
} from "@/lib/axisHubCountryPolygons";

const HUBS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { iso: "PRK", name: "North Korea" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [124, 38],
            [125, 38],
            [125, 39],
            [124, 38],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { iso: "CHN", name: "China" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [100, 30],
              [110, 30],
              [110, 40],
              [100, 30],
            ],
          ],
          [
            [
              [120, 25],
              [122, 25],
              [122, 27],
              [120, 25],
            ],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { iso: "KOR", name: "South Korea" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126, 35],
            [128, 35],
            [128, 37],
            [126, 35],
          ],
        ],
      },
    },
  ],
};

describe("collectAxisHubBorderRings", () => {
  it("keeps outer rings of China, Russia, North Korea, and Iran only", () => {
    const rings = collectAxisHubBorderRings(HUBS);
    expect(rings).toHaveLength(3);
    expect(rings[0]?.[0]).toEqual([124, 38]);
    expect(rings[1]?.[0]).toEqual([100, 30]);
    expect(rings[2]?.[0]).toEqual([120, 25]);
  });

  it("returns nothing for an empty collection", () => {
    expect(
      collectAxisHubBorderRings({ type: "FeatureCollection", features: [] }),
    ).toEqual([]);
  });
});

describe("axisHubBorderWidthPx", () => {
  const view = { canvasHeightPx: 1080, fovyRad: Math.PI / 3, widthM: 12_000 };

  it("halves the pixel width when the camera is twice as far", () => {
    const close = axisHubBorderWidthPx({ ...view, cameraHeightM: 1_500_000 });
    const far = axisHubBorderWidthPx({ ...view, cameraHeightM: 3_000_000 });
    expect(Math.abs(close - far * 2)).toBeLessThanOrEqual(1);
    expect(close).toBeGreaterThan(far);
  });

  it("stays a hairline when zoomed far out and caps when zoomed in", () => {
    expect(
      axisHubBorderWidthPx({ ...view, cameraHeightM: 80_000_000, canvasHeightPx: 100 }),
    ).toBe(1);
    expect(
      axisHubBorderWidthPx({ ...view, cameraHeightM: 500 }),
    ).toBe(255);
  });
});
