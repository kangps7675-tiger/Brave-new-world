import { describe, expect, it } from "vitest";
import {
  STRIKE_BLAZE_MS,
  STRIKE_FX_MAX,
  STRIKE_SMOLDER_MS,
  pickStrikeFxPoints,
  strikeBurnPhase,
  strikeFxScale,
} from "@/lib/cesiumStrikeFireSmoke";

const NOW = Date.parse("2026-10-12T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("strikeBurnPhase", () => {
  it("blazes while fresh, smolders afterwards, then goes out", () => {
    expect(strikeBurnPhase(ago(10 * 60_000), NOW)).toBe("blaze");
    expect(strikeBurnPhase(ago(STRIKE_BLAZE_MS), NOW)).toBe("blaze");
    expect(strikeBurnPhase(ago(STRIKE_BLAZE_MS + 60_000), NOW)).toBe("smolder");
    expect(strikeBurnPhase(ago(STRIKE_SMOLDER_MS + 60_000), NOW)).toBe("none");
  });

  it("treats a missing or invalid time as smolder, not blaze", () => {
    expect(strikeBurnPhase(undefined, NOW)).toBe("smolder");
    expect(strikeBurnPhase("not-a-date", NOW)).toBe("smolder");
  });
});

describe("strikeFxScale", () => {
  it("makes bombs and missiles bigger than drones", () => {
    expect(strikeFxScale("bomb")).toBeGreaterThan(strikeFxScale("missile"));
    expect(strikeFxScale("missile")).toBeGreaterThan(strikeFxScale("drone"));
  });
});

describe("pickStrikeFxPoints", () => {
  it("drops burnt-out strikes and bad coordinates, newest first", () => {
    const picked = pickStrikeFxPoints(
      [
        { id: "old", lat: 1, lng: 1, kind: "drone", publishedAt: ago(20 * 3_600_000) },
        { id: "bad", lat: Number.NaN, lng: 1, kind: "drone", publishedAt: ago(60_000) },
        { id: "mid", lat: 2, lng: 2, kind: "missile", publishedAt: ago(5 * 3_600_000) },
        { id: "new", lat: 3, lng: 3, kind: "bomb", publishedAt: ago(60_000) },
      ],
      NOW,
    );
    expect(picked.map((p) => p.id)).toEqual(["new", "mid"]);
    expect(picked.map((p) => p.phase)).toEqual(["blaze", "smolder"]);
  });

  it("caps the number of simultaneous fires", () => {
    const many = Array.from({ length: STRIKE_FX_MAX + 10 }, (_, i) => ({
      id: `s${i}`,
      lat: i,
      lng: i,
      kind: "drone" as const,
      publishedAt: ago(i * 60_000),
    }));
    expect(pickStrikeFxPoints(many, NOW)).toHaveLength(STRIKE_FX_MAX);
  });
});
