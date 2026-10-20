import { describe, expect, it } from "vitest";
import {
  HISTORY_PLAYBACK,
  playbackSegmentWeights,
  playbackTToYear,
  yearToPlaybackT,
} from "@/lib/historical/historyPlayback";

describe("historyPlayback pacing", () => {
  it("puts yearMin at 0 and yearMax at 1", () => {
    expect(yearToPlaybackT(HISTORY_PLAYBACK.yearMin)).toBe(0);
    expect(yearToPlaybackT(HISTORY_PLAYBACK.yearMax)).toBe(1);
  });

  it("gives modern (≥1900) about 22% of the scrubber", () => {
    const t1900 = yearToPlaybackT(1900);
    expect(t1900).toBeCloseTo(HISTORY_PLAYBACK.preModernShare, 5);
    expect(1 - t1900).toBeCloseTo(0.22, 5);
  });

  it("is calendar-even within pre-modern (midpoint ≈ halfway in share)", () => {
    // midpoint calendar of [-3000, 1900) is -550
    const mid = (-3000 + 1900) / 2;
    const t = yearToPlaybackT(mid);
    expect(t).toBeCloseTo(HISTORY_PLAYBACK.preModernShare / 2, 5);
  });

  it("round-trips year ↔ t", () => {
    for (const y of [-3000, -1000, 0, 1500, 1900, 1945, 2024]) {
      const back = playbackTToYear(yearToPlaybackT(y));
      expect(back).toBeCloseTo(y, 5);
    }
  });

  it("gives ancient gaps more segment weight than dense modern gaps", () => {
    const years = [-3000, -2000, -1000, 1900, 1914, 1939, 2024];
    const w = playbackSegmentWeights(years);
    // -3000→-2000 (1000y pre-modern) vs 1900→1914 (14y modern)
    expect(w[0]!).toBeGreaterThan(w[3]!);
  });
});
