import { describe, expect, it, vi } from "vitest";
import {
  TERRAIN_OCEAN_FILL,
  BASEMAP_SPACE_BACKGROUND,
  TERRAIN_MIN_ZOOM,
  applyBasemapOceanColors,
  applyBasemapSpaceBackground,
  applyBasemapTerrain,
  shouldEnableBasemapTerrain,
  fogForBasemapMode,
  type BasemapMapLike,
} from "@/lib/basemapMode";

function makeMap(layers: { id: string; type?: string; "source-layer"?: string }[]) {
  const paints = new Map<string, Record<string, unknown>>();
  const map: BasemapMapLike = {
    getStyle: () => ({ layers }),
    getLayer: (id) => layers.find((l) => l.id === id) ?? undefined,
    setLayoutProperty: vi.fn(),
    setPaintProperty: (id, name, value) => {
      const cur = paints.get(id) ?? {};
      cur[name] = value;
      paints.set(id, cur);
    },
    setFog: vi.fn(),
    setTerrain: vi.fn(),
    getSource: vi.fn(),
  };
  return { map, paints };
}

describe("applyBasemapOceanColors", () => {
  it("paints Liberty water fill in terrain mode", () => {
    const { map, paints } = makeMap([
      { id: "background", type: "background" },
      { id: "natural_earth", type: "raster" },
      { id: "water", type: "fill", "source-layer": "water" },
      { id: "waterway_river", type: "line", "source-layer": "waterway" },
    ]);
    applyBasemapOceanColors(map, "terrain");
    expect(paints.get("water")?.["fill-color"]).toBe(TERRAIN_OCEAN_FILL);
    expect(paints.get("waterway_river")?.["line-color"]).toBe(TERRAIN_OCEAN_FILL);
    expect(paints.get("natural_earth")?.["raster-opacity"]).toBeTruthy();
  });

  it("no-ops in intel mode", () => {
    const { map, paints } = makeMap([{ id: "water", type: "fill", "source-layer": "water" }]);
    applyBasemapOceanColors(map, "intel");
    expect(paints.size).toBe(0);
  });
});

describe("fog and space background", () => {
  it("uses a bright atmosphere on terrain and the war-room fog on intel", () => {
    const terrain = fogForBasemapMode("terrain");
    const intel = fogForBasemapMode("intel");
    expect(terrain.color).toMatch(/198,\s*218,\s*238/);
    expect(intel.color).toMatch(/8,\s*12,\s*24/);
    expect(terrain["space-color"]).toBeDefined();
  });

  it("does not paint Liberty land background as space in terrain mode", () => {
    const { map, paints } = makeMap([{ id: "background", type: "background" }]);
    applyBasemapSpaceBackground(map, "terrain");
    expect(paints.size).toBe(0);
  });

  it("paints intel background as space, matching the war-room void", () => {
    const { map, paints } = makeMap([{ id: "background", type: "background" }]);
    applyBasemapSpaceBackground(map, "intel");
    expect(paints.get("background")?.["background-color"]).toBe(BASEMAP_SPACE_BACKGROUND);
  });
});

describe("shouldEnableBasemapTerrain", () => {
  it("stays off at globe zoom even in intel", () => {
    expect(
      shouldEnableBasemapTerrain({ mode: "intel", zoom: 3.2 }),
    ).toBe(false);
    expect(
      shouldEnableBasemapTerrain({ mode: "intel", zoom: TERRAIN_MIN_ZOOM }),
    ).toBe(true);
  });

  it("stays off when zoom is unknown (boot)", () => {
    expect(shouldEnableBasemapTerrain({ mode: "terrain" })).toBe(false);
  });
});

describe("applyBasemapTerrain", () => {
  it("clears DEM below globe-safe zoom", () => {
    const { map } = makeMap([]);
    map.getSource = () => ({});
    map.getZoom = () => 3.2;
    applyBasemapTerrain(map, "intel", { zoom: 3.2 });
    expect(map.setTerrain).toHaveBeenCalledWith(null);
  });

  it("enables DEM once zoomed in", () => {
    const { map } = makeMap([]);
    map.getSource = () => ({});
    applyBasemapTerrain(map, "intel", { zoom: 7.2 });
    expect(map.setTerrain).toHaveBeenCalledWith(
      expect.objectContaining({ source: "terrain-dem", exaggeration: 0.6 }),
    );
  });
});
