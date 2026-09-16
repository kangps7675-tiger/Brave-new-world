import { describe, expect, it } from "vitest";
import { pathCrossesLand, routeOceanWaypoints, segmentCrossesLand } from "@/lib/oceanRoute";
import { allStrategicCorridorPaths } from "@/lib/strategicCorridorPaths";
import { STRATEGIC_CORRIDORS } from "@/data/strategicCorridors";

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
