import { describe, expect, it } from "vitest";
import {
  applyRfTrackBoost,
  exerciseApproxBBox,
  type MilitaryExercise,
} from "@/lib/militaryExercises";

function baseEx(partial: Partial<MilitaryExercise> = {}): MilitaryExercise {
  return {
    id: "ex-1",
    title: "Test",
    summary: null,
    actors: ["us"],
    coalition: null,
    theater: null,
    lat: 35,
    lng: 129,
    geojson: null,
    startsAt: null,
    endsAt: null,
    announcedAt: null,
    confidence: "announced",
    sources: [],
    rfGapNote: null,
    active: true,
    ingestedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("applyRfTrackBoost", () => {
  it("bumps announced when a track is inside padded bbox", () => {
    const ex = baseEx();
    const out = applyRfTrackBoost(ex, [{ lat: 35.05, lng: 129.02 }]);
    expect(out.confidence).toBe("announced_rf");
  });

  it("does not bump unverified", () => {
    const ex = baseEx({ confidence: "unverified" });
    const out = applyRfTrackBoost(ex, [{ lat: 35, lng: 129 }]);
    expect(out.confidence).toBe("unverified");
  });

  it("leaves announced when tracks miss bbox", () => {
    const ex = baseEx();
    const out = applyRfTrackBoost(ex, [{ lat: 10, lng: 10 }]);
    expect(out.confidence).toBe("announced");
  });

  it("builds bbox from lat/lng", () => {
    const bbox = exerciseApproxBBox(baseEx());
    expect(bbox).not.toBeNull();
    expect(bbox!.minLat).toBeLessThan(35);
    expect(bbox!.maxLat).toBeGreaterThan(35);
  });
});
