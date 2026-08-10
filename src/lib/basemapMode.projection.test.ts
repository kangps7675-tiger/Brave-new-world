import { describe, expect, it, vi } from "vitest";
import {
  applyBasemapGlobeProjection,
  isMercatorProjection,
  type BasemapMapLike,
} from "@/lib/basemapMode";

function mockMap(initialType: string | undefined = "mercator"): BasemapMapLike & {
  _type: string | undefined;
} {
  const map = {
    _type: initialType as string | undefined,
    getStyle: () => ({ layers: [] }),
    setLayoutProperty: vi.fn(),
    setFog: vi.fn(),
    setTerrain: vi.fn(),
    getSource: () => null,
    getLayer: () => null,
    getProjection: () => (map._type ? { type: map._type } : undefined),
    setProjection: (p: { type: string }) => {
      map._type = p.type;
    },
  };
  return map;
}

describe("applyBasemapGlobeProjection", () => {
  it("prefers vertical-perspective over adaptive globe", () => {
    const map = mockMap("mercator");
    applyBasemapGlobeProjection(map);
    expect(map.getProjection?.()?.type).toBe("vertical-perspective");
    expect(isMercatorProjection(map)).toBe(false);
  });

  it("falls back to globe when vertical-perspective does not stick", () => {
    const map = mockMap("mercator");
    map.setProjection = (p: { type: string }) => {
      // pretend only "globe" is accepted
      if (p.type === "globe") map._type = "globe";
    };
    applyBasemapGlobeProjection(map);
    expect(map.getProjection?.()?.type).toBe("globe");
  });

  it("detects unset projection as mercator-like", () => {
    const map = mockMap(undefined);
    expect(isMercatorProjection(map)).toBe(true);
  });
});
