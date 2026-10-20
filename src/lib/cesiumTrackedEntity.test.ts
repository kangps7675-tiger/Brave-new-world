import { describe, expect, it } from "vitest";
import {
  deadReckonTrackPosition,
  ensureDisplaySample,
  fixKeyOf,
  handoffFlyDurationSec,
  HANDOFF_DURATION_MAX_S,
  HANDOFF_DURATION_MIN_S,
  HANDOFF_SKIP_DISTANCE_M,
  observeTrackViewFrom,
  shouldHandoffFly,
  type DisplaySample,
  type ObserveLiveTrackFix,
} from "@/lib/cesiumTrackedEntity";

const CesiumStub = {
  Cartesian3: class Cartesian3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    static fromDegrees(lng: number, lat: number, height: number) {
      return { lng, lat, height, x: lng, y: lat, z: height };
    }
    static clone(
      src: { x: number; y: number; z: number },
      result?: { x: number; y: number; z: number },
    ) {
      if (result) {
        result.x = src.x;
        result.y = src.y;
        result.z = src.z;
        return result;
      }
      return new Cartesian3(src.x, src.y, src.z);
    }
  },
} as unknown as typeof import("cesium");

const baseFix: ObserveLiveTrackFix = {
  entityId: "ais:1",
  kind: "ais",
  lat: 0,
  lng: 0,
  heightM: 10,
  speedKn: 20,
  courseDeg: 90,
  at: 0,
};

describe("cesiumTrackedEntity", () => {
  it("observeTrackViewFrom offsets aircraft farther than ships", () => {
    const air = observeTrackViewFrom(CesiumStub, "aircraft") as {
      x: number;
      y: number;
      z: number;
    };
    const ship = observeTrackViewFrom(CesiumStub, "ais") as {
      x: number;
      y: number;
      z: number;
    };
    expect(Math.abs(air.y)).toBeGreaterThan(Math.abs(ship.y));
    expect(air.z).toBeGreaterThan(ship.z);
  });

  it("deadReckonTrackPosition advances along course", () => {
    // stub fromDegrees → {x:lng,y:lat,z:height}
    const start = deadReckonTrackPosition(CesiumStub, baseFix, 0) as {
      x: number;
      z: number;
    };
    const later = deadReckonTrackPosition(CesiumStub, baseFix, 60_000) as {
      x: number;
      z: number;
    };
    expect(later.x).toBeGreaterThan(start.x);
    expect(later.z).toBe(10);
  });

  it("ensureDisplaySample reuses one DR sample per fix+frame", () => {
    const cache: { current: DisplaySample | null } = { current: null };
    const a = ensureDisplaySample(
      CesiumStub,
      baseFix,
      7,
      cache,
      1_000,
    ) as { x: number };
    const b = ensureDisplaySample(
      CesiumStub,
      baseFix,
      7,
      cache,
      2_000,
    ) as { x: number };
    // 같은 frame이면 nowMs가 달라도 DR을 재진행하지 않음
    expect(b.x).toBe(a.x);
    expect(cache.current?.frame).toBe(7);
    expect(fixKeyOf(baseFix)).toContain("ais:1");
  });

  it("ensureDisplaySample advances when frame changes", () => {
    const cache: { current: DisplaySample | null } = { current: null };
    const a = ensureDisplaySample(
      CesiumStub,
      baseFix,
      1,
      cache,
      1_000,
    ) as { x: number };
    const b = ensureDisplaySample(
      CesiumStub,
      baseFix,
      2,
      cache,
      2_000,
    ) as { x: number };
    expect(b.x).toBeGreaterThan(a.x);
  });

  it("handoff fly skips when already near follow pose", () => {
    expect(shouldHandoffFly(HANDOFF_SKIP_DISTANCE_M)).toBe(false);
    expect(shouldHandoffFly(HANDOFF_SKIP_DISTANCE_M + 1)).toBe(true);
  });

  it("handoff duration scales with distance and clamps", () => {
    expect(handoffFlyDurationSec(0)).toBe(HANDOFF_DURATION_MIN_S);
    expect(handoffFlyDurationSec(100)).toBeGreaterThanOrEqual(
      HANDOFF_DURATION_MIN_S,
    );
    expect(handoffFlyDurationSec(10_000_000)).toBe(HANDOFF_DURATION_MAX_S);
    expect(handoffFlyDurationSec(1_000_000)).toBeGreaterThan(
      handoffFlyDurationSec(10_000),
    );
  });
});
