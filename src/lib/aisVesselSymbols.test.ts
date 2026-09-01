import { describe, expect, it } from "vitest";
import type { AisVessel } from "@/data/geoTypes";
import {
  aisGenericIconId,
  aisSymbolBearingBucket,
  AIS_CARRIER_ICON_ID,
  buildAisSymbolModel,
  type AisSymbolInput,
} from "@/lib/aisVesselSymbols";

const vessel = (overrides: Partial<AisVessel> = {}): AisSymbolInput =>
  ({
    id: overrides.mmsi ?? "1",
    mmsi: "1",
    shipName: "TEST SHIP",
    lat: 10,
    lng: 20,
    speedOverGround: 12,
    courseOverGround: 90,
    trueHeading: null,
    timestamp: null,
    shipType: 70,
    shipTypeLabel: "Cargo",
    category: "commercial",
    militaryKind: null,
    disguised: false,
    disguisedKind: null,
    ...overrides,
  }) as AisSymbolInput;

describe("buildAisSymbolModel", () => {
  it("빈 입력은 빈 모델", () => {
    const m = buildAisSymbolModel([], 0);
    expect(m.headingGeojson.features).toHaveLength(0);
    expect(m.aspectGeojson.features).toHaveLength(0);
    expect(m.items).toHaveLength(0);
  });

  it("일반 상선은 heading 레이어로, 침로가 있으면 rotate=heading·opacity=1", () => {
    const m = buildAisSymbolModel([vessel({ courseOverGround: 90, speedOverGround: 12 })], 0);
    expect(m.headingGeojson.features).toHaveLength(1);
    expect(m.aspectGeojson.features).toHaveLength(0);
    expect(m.headingGeojson.features[0].properties?.rotate).toBe(90);
    expect(m.headingGeojson.features[0].properties?.opacity).toBe(1);
  });

  it("저속(<0.4kn)이라 침로 미상이면 -20° 기울이고 반투명 (기존 DOM 규칙)", () => {
    const m = buildAisSymbolModel(
      [vessel({ courseOverGround: 90, speedOverGround: 0.1 })],
      0,
    );
    expect(m.headingGeojson.features[0].properties?.rotate).toBe(-20);
    expect(m.headingGeojson.features[0].properties?.opacity).toBe(0.72);
  });

  it("shipType별 색 버킷 아이콘 id를 부여한다", () => {
    const m = buildAisSymbolModel(
      [
        vessel({ mmsi: "t", shipType: 80 }), // tanker
        vessel({ mmsi: "c", shipType: 70 }), // cargo
        vessel({ mmsi: "p", shipType: 60 }), // passenger
      ],
      0,
    );
    const icons = m.headingGeojson.features.map((f) => f.properties?.icon);
    expect(icons).toEqual([
      aisGenericIconId("tanker"),
      aisGenericIconId("cargo"),
      aisGenericIconId("passenger"),
    ]);
  });

  it("항모는 heading 레이어 + 전용 아이콘 (일반 상선과 동일한 회전 취급)", () => {
    const m = buildAisSymbolModel(
      [vessel({ category: "military", militaryKind: "carrier", courseOverGround: 45 })],
      0,
    );
    expect(m.headingGeojson.features).toHaveLength(1);
    expect(m.aspectGeojson.features).toHaveLength(0);
    expect(m.headingGeojson.features[0].properties?.icon).toBe(AIS_CARRIER_ICON_ID);
    expect(m.headingGeojson.features[0].properties?.rotate).toBe(45);
  });

  it("구축함 등 수상전투함은 aspect 레이어 — rotate 고정 0, E/W 아이콘 중 하나", () => {
    const m = buildAisSymbolModel(
      [vessel({ category: "military", militaryKind: "destroyer", courseOverGround: 200 })],
      0,
    );
    expect(m.aspectGeojson.features).toHaveLength(1);
    expect(m.headingGeojson.features).toHaveLength(0);
    const f = m.aspectGeojson.features[0];
    expect(f.properties?.rotate).toBe(0);
    expect(["ais-surface-e", "ais-surface-w"]).toContain(f.properties?.icon);
  });

  it("잠수함은 aspect 레이어 — 전용 E/W 아이콘", () => {
    const m = buildAisSymbolModel(
      [vessel({ category: "military", militaryKind: "submarine", courseOverGround: 10 })],
      0,
    );
    const f = m.aspectGeojson.features[0];
    expect(["ais-submarine-e", "ais-submarine-w"]).toContain(f.properties?.icon);
  });

  it("위장 상선(disguised)은 aspect 레이어 — 군함/잠수함과 무관하게 그림자함대 아이콘", () => {
    const m = buildAisSymbolModel(
      [vessel({ disguised: true, category: "commercial", courseOverGround: 10 })],
      0,
    );
    const f = m.aspectGeojson.features[0];
    expect(["ais-shadow-e", "ais-shadow-w"]).toContain(f.properties?.icon);
  });

  it("저속 군함도 aspect 침로는 유지된다 (allowStationaryHeading)", () => {
    const m = buildAisSymbolModel(
      [
        vessel({
          category: "military",
          militaryKind: "frigate",
          courseOverGround: 300,
          speedOverGround: 0,
        }),
      ],
      0,
    );
    expect(m.aspectGeojson.features[0].properties?.opacity).toBe(1);
  });

  it("aspect 침로가 진짜로 없으면(courseOverGround/trueHeading 둘 다 null) 반투명", () => {
    const m = buildAisSymbolModel(
      [
        vessel({
          category: "military",
          militaryKind: "frigate",
          courseOverGround: null,
          trueHeading: null,
        }),
      ],
      0,
    );
    expect(m.aspectGeojson.features[0].properties?.opacity).toBe(0.72);
  });

  it("index는 heading·aspect 두 레이어가 공유하는 items 배열을 가리킨다", () => {
    const m = buildAisSymbolModel(
      [
        vessel({ mmsi: "a" }), // heading (commercial)
        vessel({ mmsi: "b", category: "military", militaryKind: "destroyer" }), // aspect
        vessel({ mmsi: "c" }), // heading
      ],
      0,
    );
    expect(m.items.map((v) => v.mmsi)).toEqual(["a", "b", "c"]);
    const headingIdx = m.headingGeojson.features.map((f) => Number(f.properties?.index));
    const aspectIdx = m.aspectGeojson.features.map((f) => Number(f.properties?.index));
    expect(headingIdx.sort()).toEqual([0, 2]);
    expect(aspectIdx).toEqual([1]);
    for (const idx of [...headingIdx, ...aspectIdx]) {
      expect(m.items[idx]).toBeDefined();
    }
  });

  it("좌표가 유효하지 않으면 버리고 index 연속성을 유지한다", () => {
    const m = buildAisSymbolModel(
      [vessel({ mmsi: "bad", lat: Number.NaN }), vessel({ mmsi: "good" })],
      0,
    );
    expect(m.headingGeojson.features).toHaveLength(1);
    expect(m.items).toHaveLength(1);
    expect(m.headingGeojson.features[0].properties?.index).toBe(0);
    expect(m.items[0].mmsi).toBe("good");
  });

  it("geometry는 [lng, lat] 순서", () => {
    const m = buildAisSymbolModel([vessel({ lat: 37.5, lng: 127.0 })], 0);
    expect((m.headingGeojson.features[0].geometry as GeoJSON.Point).coordinates).toEqual([
      127.0, 37.5,
    ]);
  });

  it("properties는 index/icon/rotate/opacity 4개만 담는다", () => {
    const m = buildAisSymbolModel([vessel()], 0);
    expect(Object.keys(m.headingGeojson.features[0].properties ?? {}).sort()).toEqual([
      "icon",
      "index",
      "opacity",
      "rotate",
    ]);
  });
});

describe("aisSymbolBearingBucket", () => {
  it("5° 단위로 반올림한다", () => {
    expect(aisSymbolBearingBucket(0)).toBe(0);
    expect(aisSymbolBearingBucket(2)).toBe(0);
    expect(aisSymbolBearingBucket(3)).toBe(5);
    expect(aisSymbolBearingBucket(178)).toBe(180);
  });

  it("음수·360 이상도 0~360 범위로 정규화한다", () => {
    expect(aisSymbolBearingBucket(-10)).toBe(350);
    expect(aisSymbolBearingBucket(370)).toBe(10);
  });
});
