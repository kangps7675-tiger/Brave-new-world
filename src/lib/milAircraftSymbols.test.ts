import { describe, expect, it } from "vitest";
import type { MilitaryAircraft } from "@/data/geoTypes";
import {
  aircraftSymbolIconId,
  buildAircraftSymbolModel,
  type AircraftSymbolInput,
} from "@/lib/milAircraftSymbols";

const ac = (
  hex: string,
  lat: number,
  lng: number,
  track: number | null,
  type = "F16",
): AircraftSymbolInput =>
  ({
    hex,
    id: hex,
    lat,
    lng,
    track,
    type,
  }) as unknown as MilitaryAircraft;

describe("buildAircraftSymbolModel", () => {
  it("빈 입력은 빈 모델", () => {
    const m = buildAircraftSymbolModel([], []);
    expect(m.geojson.features).toHaveLength(0);
    expect(m.items).toHaveLength(0);
    expect(m.isCivil).toHaveLength(0);
  });

  it("군용기와 민항기를 한 컬렉션으로 합치고 index를 연속 부여한다", () => {
    const m = buildAircraftSymbolModel(
      [ac("a", 10, 20, 90), ac("b", 11, 21, 180)],
      [ac("c", 12, 22, 270)],
    );
    expect(m.geojson.features).toHaveLength(3);
    expect(m.geojson.features.map((f) => f.properties?.index)).toEqual([0, 1, 2]);
    expect(m.isCivil).toEqual([false, false, true]);
  });

  /**
   * 클릭/호버 계약 — MapGlobeView.resolveFeature가 properties.index로
   * items에서 원본을 되찾는다. 이 대응이 깨지면 엉뚱한 기체가 선택된다.
   */
  it("properties.index로 원본 항공기를 되찾을 수 있다", () => {
    const m = buildAircraftSymbolModel([ac("a", 1, 1, 0)], [ac("c", 2, 2, 0)]);
    for (const f of m.geojson.features) {
      const idx = Number(f.properties?.index);
      expect(m.items[idx]).toBeDefined();
    }
    expect(m.items[0].hex).toBe("a");
    expect(m.items[1].hex).toBe("c");
    expect(m.isCivil[1]).toBe(true);
  });

  it("민항기는 여객기(transport) 실루엣으로 통일한다", () => {
    const m = buildAircraftSymbolModel([], [ac("c", 1, 1, 0, "F22")]);
    expect(m.geojson.features[0].properties?.icon).toBe(
      aircraftSymbolIconId("transport", "civil"),
    );
  });

  it("침로가 있으면 rotate=heading, opacity=1", () => {
    const m = buildAircraftSymbolModel([ac("a", 1, 1, 90)], []);
    expect(m.geojson.features[0].properties?.rotate).toBe(90);
    expect(m.geojson.features[0].properties?.opacity).toBe(1);
  });

  it("침로가 없으면 -18° 기울이고 반투명 (기존 DOM 마커 규칙)", () => {
    const m = buildAircraftSymbolModel([ac("a", 1, 1, null)], []);
    expect(m.geojson.features[0].properties?.rotate).toBe(-18);
    expect(m.geojson.features[0].properties?.opacity).toBe(0.8);
  });

  it("침로를 0~360으로 정규화한다", () => {
    const m = buildAircraftSymbolModel([ac("a", 1, 1, -90), ac("b", 1, 1, 450)], []);
    expect(m.geojson.features[0].properties?.rotate).toBe(270);
    expect(m.geojson.features[1].properties?.rotate).toBe(90);
  });

  it("좌표가 유효하지 않으면 버리고 index 연속성을 유지한다", () => {
    const m = buildAircraftSymbolModel(
      [ac("bad", Number.NaN, 5, 0), ac("good", 5, 5, 0)],
      [],
    );
    expect(m.geojson.features).toHaveLength(1);
    expect(m.items).toHaveLength(1);
    expect(m.geojson.features[0].properties?.index).toBe(0);
    expect(m.items[0].hex).toBe("good");
  });

  it("geometry는 [lng, lat] 순서", () => {
    const m = buildAircraftSymbolModel([ac("g", 37.5, 127.0, 0)], []);
    expect((m.geojson.features[0].geometry as GeoJSON.Point).coordinates).toEqual([
      127.0, 37.5,
    ]);
  });

  /**
   * properties는 MapLibre가 타일마다 직렬화하므로 최소로 유지한다.
   * 원본 객체를 통째로 넣으면 그 비용이 그대로 프레임에 실린다.
   */
  it("properties는 index/icon/rotate/opacity 4개만 담는다", () => {
    const m = buildAircraftSymbolModel([ac("a", 1, 1, 0)], []);
    expect(Object.keys(m.geojson.features[0].properties ?? {}).sort()).toEqual([
      "icon",
      "index",
      "opacity",
      "rotate",
    ]);
  });
});
