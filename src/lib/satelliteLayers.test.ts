import { describe, expect, it } from "vitest";
import { CESIUM_SHIPS_OFF, cesiumShipProps } from "./satelliteLayers";

const callout = { id: "c1", lat: 14.6, lng: 42.1 } as never;

const full = {
  aisVessels: [{ mmsi: "1" }] as never,
  disguisedVessels: [{ mmsi: "2" }] as never,
  showAis: true,
  showAisMilitary: true,
  showAisCommercial: true,
  showDisguisedVessels: true,
  // 선박이 아닌 것 — 그대로 남아야 한다
  milAircraft: [{ icao: "x" }] as never,
  showAirTraffic: true,
  liveuaStrikes: [{ id: "s" }] as never,
  straitLabels: [{ id: "l" }] as never,
  showPlaceLabels: true,
  eventCallout: callout,
  cameraCeilingM: 5_000_000,
};

describe("세슘은 선박(AIS)만 그리지 않는다", () => {
  it("기본(draw=false): 선박 데이터·표시 플래그가 비워진다", () => {
    const p = cesiumShipProps(full, false);
    expect(p.aisVessels).toBeUndefined();
    expect(p.disguisedVessels).toBeUndefined();
    expect(p.showAis).toBe(false);
    expect(p.showAisMilitary).toBe(false);
    expect(p.showAisCommercial).toBe(false);
    expect(p.showDisguisedVessels).toBe(false);
  });

  it("선박이 아닌 항공기·불꽃·해협 라벨·장소 라벨·콜아웃·카메라 제한은 그대로 통과", () => {
    const p = cesiumShipProps(full, false);
    expect(p.milAircraft).toBe(full.milAircraft);
    expect(p.showAirTraffic).toBe(true);
    expect(p.liveuaStrikes).toBe(full.liveuaStrikes);
    expect(p.straitLabels).toBe(full.straitLabels);
    expect(p.showPlaceLabels).toBe(true);
    expect(p.eventCallout).toBe(callout);
    expect(p.cameraCeilingM).toBe(5_000_000);
  });

  it("실험실(draw=true): 아무것도 바꾸지 않는다", () => {
    expect(cesiumShipProps(full, true)).toBe(full);
  });

  it("끄는 목록은 선박 키 6개뿐이다", () => {
    expect(Object.keys(CESIUM_SHIPS_OFF).sort()).toEqual(
      ["aisVessels", "disguisedVessels", "showAis", "showAisCommercial", "showAisMilitary", "showDisguisedVessels"].sort(),
    );
  });

  it("원본 객체를 바꾸지 않는다", () => {
    const copy = { ...full };
    cesiumShipProps(full, false);
    expect(full).toEqual(copy);
  });
});
