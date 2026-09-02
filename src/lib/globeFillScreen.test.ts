import { describe, expect, it } from "vitest";
import {
  entryBootAltitude,
  globeFillScreenAltitude,
  globeFillScreenZoom,
  globeOrbitMaxAltitude,
  globeProjectedRadiusPixels,
} from "@/lib/globeFillScreen";
import { altitudeToMapLibreZoom } from "@/lib/mapLibreBasemap";

describe("globeFillScreenZoom", () => {
  it("1920×1080 에서 구 직경이 짧은 변(높이)을 채운다", () => {
    const zoom = globeFillScreenZoom(1920, 1080);
    const radius = globeProjectedRadiusPixels(zoom, 1920, 1080);
    expect(radius * 2).toBeGreaterThan(1060);
    expect(radius * 2).toBeLessThan(1100);
    // 예전 boot zoom ~3.49 는 상하가 잘림. 맞춤은 그보다 줌아웃.
    expect(zoom).toBeLessThan(3.45);
    expect(zoom).toBeGreaterThan(2.8);
  });

  it("작은 화면일수록 줌아웃한다 (구 전체가 들어가게)", () => {
    const desktop = globeFillScreenZoom(1920, 1080);
    const laptop = globeFillScreenZoom(1366, 768);
    const phone = globeFillScreenZoom(390, 844);
    expect(laptop).toBeLessThan(desktop);
    expect(phone).toBeLessThan(laptop);
  });

  it("altitude 왕복이 fill zoom 을 유지한다", () => {
    const zoom = globeFillScreenZoom(1920, 1080);
    const alt = globeFillScreenAltitude(1920, 1080);
    expect(altitudeToMapLibreZoom(alt)).toBeCloseTo(zoom, 3);
  });

  it("줌아웃 상한은 화면맞춤보다 멀고 절대 상한을 넘지 않는다", () => {
    const fill = globeFillScreenAltitude(1920, 1080);
    const max = globeOrbitMaxAltitude(1920, 1080);
    expect(max).toBeGreaterThan(fill);
    expect(max).toBeLessThanOrEqual(7.2);
  });

  it("entryBootAltitude 는 주어진 크기를 쓴다", () => {
    expect(entryBootAltitude({ width: 1920, height: 1080 })).toBe(
      globeFillScreenAltitude(1920, 1080),
    );
  });
});

describe("ENTRY_GATE 전역 궤도", () => {
  it("pitch 0 이라 구 전체가 잘리지 않는다", async () => {
    const { ENTRY_GATE } = await import("@/lib/entryOverview");
    expect(ENTRY_GATE.bootPitch).toBe(0);
  });
});
