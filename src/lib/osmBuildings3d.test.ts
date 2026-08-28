import { describe, expect, it } from "vitest";
import {
  osmBuildingsArmedNext,
  osmBuildingsEligible,
  OSM_BUILDINGS_DROP_ZOOM,
  OSM_BUILDINGS_MIN_ZOOM,
} from "@/lib/osmBuildings3d";

describe("osmBuildingsEligible", () => {
  it("is only on for terrain with a token and not ultra-lite", () => {
    expect(
      osmBuildingsEligible({
        basemapMode: "terrain",
        ultraLite: false,
        ionToken: "token",
      }),
    ).toBe(true);
    expect(
      osmBuildingsEligible({
        basemapMode: "intel",
        ultraLite: false,
        ionToken: "token",
      }),
    ).toBe(false);
    expect(
      osmBuildingsEligible({
        basemapMode: "terrain",
        ultraLite: true,
        ionToken: "token",
      }),
    ).toBe(false);
    expect(
      osmBuildingsEligible({
        basemapMode: "terrain",
        ultraLite: false,
        ionToken: "",
      }),
    ).toBe(false);
  });
});

describe("osmBuildingsArmedNext", () => {
  it("arms at min zoom and holds until drop zoom", () => {
    expect(osmBuildingsArmedNext(false, OSM_BUILDINGS_MIN_ZOOM - 0.1, true)).toBe(
      false,
    );
    expect(osmBuildingsArmedNext(false, OSM_BUILDINGS_MIN_ZOOM, true)).toBe(true);
    expect(osmBuildingsArmedNext(true, OSM_BUILDINGS_DROP_ZOOM, true)).toBe(true);
    expect(
      osmBuildingsArmedNext(true, OSM_BUILDINGS_DROP_ZOOM - 0.01, true),
    ).toBe(false);
  });

  it("disarms immediately when ineligible", () => {
    expect(osmBuildingsArmedNext(true, 16, false)).toBe(false);
  });
});
