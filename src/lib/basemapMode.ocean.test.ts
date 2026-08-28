import { describe, expect, it, vi } from "vitest";
import {
  TERRAIN_OCEAN_FILL,
  applyBasemapOceanColors,
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
