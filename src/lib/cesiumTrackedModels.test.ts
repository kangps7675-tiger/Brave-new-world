import { describe, expect, it } from "vitest";
import {
  OBSERVE_CAMERA_MODEL_MAX,
  OBSERVE_MODEL_CAMERA_MAX_HEIGHT_M,
  OBSERVE_NEAR_MODEL_MAX,
  selectObserveModelEntityIds,
  type ObserveModelCandidate,
} from "@/lib/cesiumTrackedModels";

describe("cesiumTrackedModels", () => {
  it("all-displayed (default): every candidate gets a model id", () => {
    const ids = selectObserveModelEntityIds("mil:aa", [
      { entityId: "mil:aa", lat: 0, lng: 0, headingDeg: 0 },
      { entityId: "mil:bb", lat: 0.1, lng: 0, headingDeg: 90 },
      { entityId: "civ:cc", lat: 20, lng: 0, headingDeg: 10 },
    ]);
    expect(ids.size).toBe(3);
    expect(ids.has("civ:cc")).toBe(true);
  });

  it("near-cluster: includes tracked and nearest within radius only", () => {
    const ids = selectObserveModelEntityIds(
      "mil:aa",
      [
        { entityId: "mil:aa", lat: 0, lng: 0, headingDeg: 0 },
        { entityId: "mil:bb", lat: 0.1, lng: 0, headingDeg: 90 },
        { entityId: "civ:cc", lat: 20, lng: 0, headingDeg: 10 },
      ],
      { mode: "near-cluster", nearMax: 2, radiusM: 50_000 },
    );
    expect(ids.has("mil:aa")).toBe(true);
    expect(ids.has("mil:bb")).toBe(true);
    expect(ids.has("civ:cc")).toBe(false);
  });

  it("near-cluster: caps near models", () => {
    const candidates: ObserveModelCandidate[] = [
      { entityId: "mil:t", lat: 0, lng: 0, headingDeg: 0 },
    ];
    for (let i = 0; i < 20; i++) {
      candidates.push({
        entityId: `mil:n${i}`,
        lat: 0.01 + i * 0.001,
        lng: 0,
        headingDeg: null,
      });
    }
    const ids = selectObserveModelEntityIds("mil:t", candidates, {
      mode: "near-cluster",
      nearMax: OBSERVE_NEAR_MODEL_MAX,
      radiusM: 500_000,
    });
    expect(ids.size).toBe(1 + OBSERVE_NEAR_MODEL_MAX);
  });

  it("near-cluster without track: camera-near models under height gate", () => {
    const candidates = [
      { entityId: "civ:a", lat: 0, lng: 0, headingDeg: 0 },
      { entityId: "civ:b", lat: 0.2, lng: 0, headingDeg: 90 },
      { entityId: "civ:far", lat: 40, lng: 0, headingDeg: 10 },
    ];
    const low = selectObserveModelEntityIds(null, candidates, {
      mode: "near-cluster",
      cameraCenter: { lat: 0, lng: 0 },
      cameraHeightM: 80_000,
      cameraNearMax: 2,
      cameraRadiusM: 50_000,
    });
    expect(low.has("civ:a")).toBe(true);
    expect(low.has("civ:far")).toBe(false);
    expect(low.size).toBeLessThanOrEqual(2);

    const high = selectObserveModelEntityIds(null, candidates, {
      mode: "near-cluster",
      cameraCenter: { lat: 0, lng: 0 },
      cameraHeightM: OBSERVE_MODEL_CAMERA_MAX_HEIGHT_M + 1,
      cameraNearMax: OBSERVE_CAMERA_MODEL_MAX,
    });
    expect(high.size).toBe(0);
  });
});
