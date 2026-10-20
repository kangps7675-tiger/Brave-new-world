import { describe, expect, it } from "vitest";
import { pathCrossesLand, routeOceanWaypoints, segmentCrossesLand } from "@/lib/oceanRoute";
import type { OceanLatLng } from "@/lib/oceanRoute";
import { allStrategicCorridorPaths } from "@/lib/strategicCorridorPaths";
import { STRATEGIC_CORRIDORS } from "@/data/strategicCorridors";

/** 격자 계단은 거의 모든 구간이 동서 또는 남북이다. 곡선이면 이 비율이 내려간다. */
function cardinalSegmentRatio(points: OceanLatLng[]): number {
  let cardinal = 0;
  let n = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dLat = Math.abs(points[i]!.lat - points[i - 1]!.lat);
    const rawLng = points[i]!.lng - points[i - 1]!.lng;
    const dLng = Math.abs(((rawLng + 540) % 360) - 180);
    const len = Math.hypot(dLat, dLng);
    if (len < 0.08) continue;
    n += 1;
    if (Math.min(dLat, dLng) / len < 0.18) cardinal += 1;
  }
  return n === 0 ? 0 : cardinal / n;
}

describe("oceanRoute", () => {
  it("detects Bandar Abbas → Mumbai great-circle land cut", () => {
    expect(
      segmentCrossesLand(
        { lat: 27.187, lng: 56.278 },
        { lat: 19.076, lng: 72.877 },
        16,
      ),
    ).toBe(true);
  });

  it("reroutes Bandar Abbas → Mumbai around land", () => {
    const routed = routeOceanWaypoints([
      { lat: 27.187, lng: 56.278 },
      { lat: 19.076, lng: 72.877 },
    ]);
    expect(routed.length).toBeGreaterThan(2);
    expect(pathCrossesLand(routed, 10)).toBe(false);
    expect(cardinalSegmentRatio(routed)).toBeLessThan(0.72);
  });

  it("reroutes Suez → Latakia via Mediterranean, not Levant land", () => {
    const routed = routeOceanWaypoints([
      { lat: 30.0, lng: 32.55 },
      { lat: 35.52, lng: 35.79 },
    ]);
    expect(routed.length).toBeGreaterThan(2);
    expect(pathCrossesLand(routed, 10)).toBe(false);
  });
});

describe("strategic corridor sea geometries", () => {
  it("sea legs and sea-mode corridors stay over water", () => {
    const seaCorridorIds = new Set(
      STRATEGIC_CORRIDORS.filter((c) => c.mode === "sea").map((c) => c.id),
    );
    const paths = allStrategicCorridorPaths().filter(
      (p) =>
        p.meta?.legMode === "sea" || seaCorridorIds.has(String(p.meta?.corridorId ?? "")),
    );
    expect(paths.length).toBeGreaterThan(5);
    for (const path of paths) {
      const pts = path.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      expect(pathCrossesLand(pts, 8), path.id).toBe(false);
    }
  });
});
