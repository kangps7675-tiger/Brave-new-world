import { describe, expect, it } from "vitest";
import {
  evaluateTaiwanTensionSpike,
  TAIWAN_SPIKE_SCORE,
  WORLD_PROXY_SPIKE_SCORE,
} from "@/lib/tensionSpikeCut";
import type { DailyRankEntry } from "@/lib/dailyRanks";

function theater(
  entityId: string,
  score: number,
  deltaScore: number | null = null,
  detail: Record<string, unknown> = {},
): DailyRankEntry {
  return {
    rankDate: "2026-07-19",
    kind: "theater",
    entityId,
    labelKo: entityId,
    labelEn: entityId,
    score,
    rank: 1,
    prevRank: null,
    deltaRank: null,
    deltaScore,
    detail: { displayScore: score, ...detail },
    updatedAt: "2026-07-19T00:00:00Z",
  };
}

describe("evaluateTaiwanTensionSpike", () => {
  it("triggers on high Taiwan theater score", () => {
    const spike = evaluateTaiwanTensionSpike({
      theater: [theater("taiwan", TAIWAN_SPIKE_SCORE)],
    });
    expect(spike).not.toBeNull();
    expect(spike?.proxy).toBe(false);
    expect(spike?.theaterScore).toBe(TAIWAN_SPIKE_SCORE);
  });

  it("explains drivers in plain language without sigma", () => {
    const spike = evaluateTaiwanTensionSpike({
      theater: [
        theater("taiwan", TAIWAN_SPIKE_SCORE, 5, {
          components: {
            zScores: {
              fireCount: 2.4,
              mentions: 1.3,
              points: 0.2,
              telegramCount: 0,
              airRaidScore: 0,
            },
          },
        }),
      ],
    });
    expect(spike?.driverKo).toContain("주요인");
    expect(spike?.driverKo).toContain("위성 화재");
    expect(spike?.driverKo).toContain("평소보다");
    expect(spike?.driverKo).not.toMatch(/σ|z-score/i);
    expect(spike?.driverEn).toMatch(/Mainly:/);
    expect(spike?.telegraphKo).toContain("어제보다 +5");
  });

  it("triggers on world proxy when Taiwan row missing", () => {
    const spike = evaluateTaiwanTensionSpike({
      theater: [theater("ukraine", 80)],
      worldTension: {
        score: WORLD_PROXY_SPIKE_SCORE,
        deltaScore: 1,
        prevScore: 70,
      },
    });
    expect(spike?.proxy).toBe(true);
  });

  it("returns null below thresholds", () => {
    expect(
      evaluateTaiwanTensionSpike({
        theater: [theater("taiwan", 40)],
        worldTension: { score: 50, deltaScore: 0, prevScore: 50 },
      }),
    ).toBeNull();
  });
});
