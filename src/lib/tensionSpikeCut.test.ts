import { describe, expect, it } from "vitest";
import {
  evaluateHotTensionSpike,
  HOT_SPIKE_SCORE,
  pickHottestRankEntry,
  resolveTensionCutNav,
  WORLD_PROXY_SPIKE_SCORE,
} from "@/lib/tensionSpikeCut";
import type { DailyRankEntry } from "@/lib/dailyRanks";

function entry(
  kind: "theater" | "chokepoint",
  entityId: string,
  score: number,
  deltaScore: number | null = null,
  detail: Record<string, unknown> = {},
): DailyRankEntry {
  return {
    rankDate: "2026-07-19",
    kind,
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

describe("pickHottestRankEntry", () => {
  it("picks higher score between theater and choke tops", () => {
    const winner = pickHottestRankEntry({
      theater: [entry("theater", "ukraine", 70)],
      chokepoint: [entry("chokepoint", "choke-hormuz", 80)],
    });
    expect(winner?.entityId).toBe("choke-hormuz");
  });
});

describe("evaluateHotTensionSpike", () => {
  it("triggers on hottest theater above score threshold", () => {
    const spike = evaluateHotTensionSpike({
      theater: [
        entry("theater", "ukraine", HOT_SPIKE_SCORE),
        entry("theater", "taiwan", 40),
      ],
    });
    expect(spike).not.toBeNull();
    expect(spike?.entityId).toBe("ukraine");
    expect(spike?.proxy).toBe(false);
    expect(spike?.labelKo).toBe("ukraine");
  });

  it("triggers on hottest choke when it beats theater", () => {
    const spike = evaluateHotTensionSpike({
      theater: [entry("theater", "taiwan", 50)],
      chokepoint: [entry("chokepoint", "choke-hormuz", HOT_SPIKE_SCORE)],
    });
    expect(spike?.entityId).toBe("choke-hormuz");
  });

  it("explains drivers in plain language without sigma", () => {
    const spike = evaluateHotTensionSpike({
      theater: [
        entry("theater", "taiwan", HOT_SPIKE_SCORE, 5, {
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
    expect(spike?.driverKo).not.toMatch(/σ|z-score/i);
    expect(spike?.telegraphKo).toContain("어제보다 +5");
  });

  it("uses world proxy on TOP when below threshold but world is high", () => {
    const spike = evaluateHotTensionSpike({
      theater: [entry("theater", "korea", 40)],
      worldTension: {
        score: WORLD_PROXY_SPIKE_SCORE,
        deltaScore: 1,
        prevScore: 70,
      },
    });
    expect(spike?.proxy).toBe(true);
    expect(spike?.entityId).toBe("korea");
  });

  it("returns null below thresholds", () => {
    expect(
      evaluateHotTensionSpike({
        theater: [entry("theater", "taiwan", 40)],
        worldTension: { score: 50, deltaScore: 0, prevScore: 50 },
      }),
    ).toBeNull();
  });
});

describe("resolveTensionCutNav", () => {
  it("maps taiwan lenses to known nav ids", () => {
    expect(resolveTensionCutNav("taiwan", "market").economyNavId).toBe("taiwan-chip");
    expect(resolveTensionCutNav("taiwan", "route").economyNavId).toBe(
      "taiwan-strait-econ",
    );
    expect(resolveTensionCutNav("taiwan", "front").conflictNavId).toBe(
      "taiwan-strait",
    );
  });

  it("maps hormuz choke to gulf front", () => {
    expect(resolveTensionCutNav("choke-hormuz", "front").conflictNavId).toBe(
      "persian-gulf",
    );
  });
});
