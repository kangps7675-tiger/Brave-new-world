import { describe, expect, it } from "vitest";
import {
  gateBadgeAnchor,
  gateCongestionRing,
  gateLinePoints,
  nextStraitId,
  OBSERVE_STRAIT_PRESETS,
  observeStraitInitialCamera,
  observeStraitPreset,
} from "@/lib/cesiumStraitScene";
import { buildStraitGateSegments } from "@/lib/cesiumStraitOverlays";
import { formatTransitBadgeText } from "@/lib/cesiumStraitCallouts";

describe("cesiumStraitScene", () => {
  it("defaults to Hormuz close-up, not global orbit", () => {
    const cam = observeStraitInitialCamera();
    const hormuz = observeStraitPreset("hormuz");
    expect(cam.lat).toBeCloseTo(hormuz.lat, 1);
    expect(cam.lng).toBeCloseTo(hormuz.lng, 1);
    // 전역(~12e6m)보다 훨씬 낮음
    expect(cam.heightM).toBeLessThan(6_000_000);
    expect(hormuz.altitude).toBeLessThan(1.0);
  });

  it("has three tour presets including Red Sea·Suez", () => {
    expect(OBSERVE_STRAIT_PRESETS.map((p) => p.id)).toEqual([
      "hormuz",
      "red-sea-suez",
      "malacca",
    ]);
    expect(nextStraitId("hormuz")).toBe("red-sea-suez");
    expect(nextStraitId("malacca")).toBe("hormuz");
  });

  it("builds gate line + congestion ring for Hormuz", () => {
    const line = gateLinePoints("hormuz");
    const ring = gateCongestionRing("hormuz");
    const badge = gateBadgeAnchor("hormuz");
    expect(line?.length).toBe(2);
    expect(ring?.length).toBe(5);
    expect(badge?.lat).toBeGreaterThan(26);
    const segs = buildStraitGateSegments(observeStraitPreset("hormuz"));
    expect(segs.some((s) => s.id.startsWith("strait-gate:"))).toBe(true);
    expect(segs.some((s) => s.id.startsWith("strait-congest:"))).toBe(true);
  });

  it("formats transit badge with today/baseline", () => {
    expect(
      formatTransitBadgeText(
        { recentAvg: 42.2, baselineAvg: 55.8, changePct: -24, latestDate: "2026-10-01" },
        "ko",
      ),
    ).toBe("오늘 통항 42 / 기준선 56");
    expect(formatTransitBadgeText(undefined, "en")).toContain("baseline");
  });
});
