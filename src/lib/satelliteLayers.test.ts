import { describe, expect, it } from "vitest";
import { CESIUM_LAYERS_OFF, cesiumLayerProps } from "./satelliteLayers";

const callout = { id: "c1", lat: 14.6, lng: 42.1 } as never;
const onReady = () => {};

const full = {
  aisVessels: [{ mmsi: "1" }] as never,
  showAis: true,
  milAircraft: [{ icao: "x" }] as never,
  showAirTraffic: true,
  liveuaStrikes: [{ id: "s" }] as never,
  straitLabels: [{ id: "l" }] as never,
  showPlaceLabels: true,
  showConflictEvents: true,
  eventCallout: callout,
  cameraCeilingM: 5_000_000,
  onReady,
};

describe("세슘은 레이어를 그리지 않고 콜아웃만 남긴다", () => {
  it("기본(draw=false): 레이어 데이터·표시 플래그가 비워진다", () => {
    const p = cesiumLayerProps(full, false);
    expect(p.aisVessels).toBeUndefined();
    expect(p.milAircraft).toBeUndefined();
    expect(p.liveuaStrikes).toBeUndefined();
    expect(p.straitLabels).toBeUndefined();
    expect(p.showAis).toBe(false);
    expect(p.showAirTraffic).toBe(false);
    expect(p.showPlaceLabels).toBe(false);
    expect(p.showConflictEvents).toBe(false);
  });

  it("콜아웃·카메라 제한·핸들러는 그대로 통과한다", () => {
    const p = cesiumLayerProps(full, false);
    expect(p.eventCallout).toBe(callout);
    expect(p.cameraCeilingM).toBe(5_000_000);
    expect(p.onReady).toBe(onReady);
  });

  it("실험실(draw=true): 아무것도 바꾸지 않는다", () => {
    expect(cesiumLayerProps(full, true)).toBe(full);
  });

  it("끄는 목록에 콜아웃·카메라·핸들러 키가 들어 있지 않다", () => {
    for (const k of ["eventCallout", "onDismissEventCallout", "cameraCeilingM", "onReady", "onCameraIdle", "onPickGroundPoint", "focusedLiveuaId"]) {
      expect(Object.keys(CESIUM_LAYERS_OFF)).not.toContain(k);
    }
  });

  it("원본 객체를 바꾸지 않는다", () => {
    const copy = { ...full };
    cesiumLayerProps(full, false);
    expect(full).toEqual(copy);
  });
});
