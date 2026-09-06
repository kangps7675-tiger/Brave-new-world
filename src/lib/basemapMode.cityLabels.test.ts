import { describe, expect, it, vi } from "vitest";
import {
  PLACE_LABEL_HIDE_LAYER_IDS,
  PLACE_LABEL_KEEP_LAYER_IDS,
  applyBasemapCityLabelRank,
  applyBasemapPlaceLabelScale,
  type BasemapMapLike,
} from "@/lib/basemapMode";

function makeMap(layerIds: string[]) {
  const layouts = new Map<string, Record<string, unknown>>();
  const map: BasemapMapLike = {
    getStyle: () => ({ layers: layerIds.map((id) => ({ id })) }),
    getLayer: (id) => (layerIds.includes(id) ? { id } : undefined),
    setLayoutProperty: (id, name, value) => {
      const cur = layouts.get(id) ?? {};
      cur[name] = value;
      layouts.set(id, cur);
    },
    setPaintProperty: vi.fn(),
    setFog: vi.fn(),
    setTerrain: vi.fn(),
    getSource: vi.fn(),
  };
  return { map, layouts };
}

describe("applyBasemapCityLabelRank", () => {
  it("체크박스 OFF면 city/capital도 숨긴다", () => {
    const { map, layouts } = makeMap([
      "label_other",
      "label_village",
      "label_town",
      "label_city",
      "label_city_capital",
      "label_country_1",
      "label_state",
    ]);
    applyBasemapCityLabelRank(map, { showCityLabels: false });
    for (const id of [
      "label_other",
      "label_village",
      "label_town",
      "label_city",
      "label_city_capital",
    ]) {
      expect(layouts.get(id)?.visibility).toBe("none");
    }
    expect(layouts.has("label_country_1")).toBe(false);
    expect(layouts.has("label_state")).toBe(false);
  });

  it("체크박스 ON이면 town/village만 숨기고 city/capital 유지", () => {
    const { map, layouts } = makeMap([
      "label_other",
      "label_village",
      "label_town",
      "label_city",
      "label_city_capital",
    ]);
    applyBasemapCityLabelRank(map, { showCityLabels: true });
    for (const id of ["label_other", "label_village", "label_town"]) {
      expect(layouts.get(id)?.visibility).toBe("none");
    }
    expect(layouts.get("label_city")?.visibility).toBe("visible");
    expect(layouts.get("label_city_capital")?.visibility).toBe("visible");
  });

  it("체크박스 ON — Dark 스타일 place_* 도 동일", () => {
    const { map, layouts } = makeMap([
      "place_other",
      "place_suburb",
      "place_village",
      "place_town",
      "place_city",
      "place_city_large",
      "place_country_major",
    ]);
    applyBasemapCityLabelRank(map, { showCityLabels: true });
    for (const id of ["place_other", "place_suburb", "place_village", "place_town"]) {
      expect(layouts.get(id)?.visibility).toBe("none");
    }
    expect(layouts.get("place_city")?.visibility).toBe("visible");
    expect(layouts.get("place_city_large")?.visibility).toBe("visible");
    expect(layouts.has("place_country_major")).toBe(false);
  });

  it("skips missing layers", () => {
    const { map, layouts } = makeMap(["water"]);
    applyBasemapCityLabelRank(map);
    expect(layouts.size).toBe(0);
  });
});

describe("applyBasemapPlaceLabelScale", () => {
  it("intel 모드 기본(OFF)은 city 레이어도 숨긴다", () => {
    const { map, layouts } = makeMap([...PLACE_LABEL_HIDE_LAYER_IDS, ...PLACE_LABEL_KEEP_LAYER_IDS]);
    applyBasemapPlaceLabelScale(map, "intel");
    expect(layouts.get("place_town")?.visibility).toBe("none");
    expect(layouts.get("place_city")?.visibility).toBe("none");
  });

  it("도시명 ON + 지형에서만 text-size 스케일", () => {
    const { map, layouts } = makeMap(["label_city", "label_city_capital", "label_town"]);
    applyBasemapPlaceLabelScale(map, "terrain", { showCityLabels: true });
    expect(layouts.get("label_city")?.["text-size"]).toBeTruthy();
    expect(layouts.get("label_city_capital")?.["text-size"]).toBeTruthy();
  });
});
