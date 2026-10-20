import { describe, expect, it } from "vitest";
import {
  GTS,
  GTI_BLEND,
  blendTheaterScoresToGti,
  displayGtiDelta,
  displayGtiScore,
  formatGtiBriefingLead,
  formatGtiDeltaLabel,
  formatGtiTitle,
  gtiMethodologyProseShort,
  gtiPredictQuestion,
  normalizeGtiScore,
  analystTierLabel,
} from "@/lib/gti";
import {
  deriveWorldTensionFromTheaters,
  formatWorldTensionDelta,
  type DailyRankEntry,
} from "@/lib/dailyRanks";

function theater(score: number, delta: number | null = null): DailyRankEntry {
  return {
    rankDate: "2026-08-09",
    kind: "theater",
    entityId: `t-${score}`,
    labelKo: "테스트",
    labelEn: "Test",
    score,
    rank: 1,
    prevRank: null,
    deltaRank: null,
    deltaScore: delta,
    detail: { displayScore: score },
    updatedAt: "2026-08-09T00:00:00.000Z",
  };
}

describe("GTS display single source", () => {
  it("displayGtiScore is integer 0–100 everywhere", () => {
    expect(displayGtiScore(56.4)).toBe(56);
    expect(displayGtiScore(56.5)).toBe(57);
    expect(displayGtiScore(58.9)).toBe(59);
    expect(displayGtiScore(null)).toBeNull();
  });

  it("displayGtiDelta keeps one decimal (not chip-style integer)", () => {
    expect(displayGtiDelta(1.9)).toBe(1.9);
    expect(displayGtiDelta(1.94)).toBe(1.9);
    expect(displayGtiDelta(2.0)).toBe(2);
    expect(displayGtiDelta(0.04)).toBeNull();
    expect(displayGtiDelta(null)).toBeNull();
  });

  it("chip / hero / briefing delta labels match", () => {
    const snap = { score: 56.4, deltaScore: 1.9, prevScore: 54.5 };
    const chipDelta = displayGtiDelta(snap.deltaScore);
    const heroLabel = formatGtiDeltaLabel(snap.deltaScore, "ko");
    const brief = formatGtiBriefingLead(snap, "ko");
    const legacy = formatWorldTensionDelta(snap.deltaScore, "ko");

    expect(displayGtiScore(snap.score)).toBe(56);
    expect(chipDelta).toBe(1.9);
    expect(heroLabel).toBe(legacy);
    expect(heroLabel).toContain("1.9");
    expect(brief).toContain("56");
    expect(brief).toContain("1.9");
    expect(brief).not.toMatch(/어제보다 2포인트/);
  });

  it("blend weights match cron (0.55 avg + 0.45 max)", () => {
    expect(GTI_BLEND.avgWeight).toBe(0.55);
    expect(GTI_BLEND.maxWeight).toBe(0.45);
    // scores [50,100]: avg=75, max=100 → 0.55*75+0.45*100 = 86.25
    expect(blendTheaterScoresToGti([50, 100])).toBe(86.25);
  });

  it("deriveWorldTensionFromTheaters uses same blend as cron weights", () => {
    const derived = deriveWorldTensionFromTheaters([
      theater(50, 1),
      theater(100, 2),
    ]);
    expect(derived).not.toBeNull();
    expect(derived!.score).toBe(normalizeGtiScore(86.25));
    expect(derived!.method).toBe("theater-blend-fallback");
    // Old bug: 0.6*avg+0.4*max = 0.6*75+0.4*100 = 85 — must use 0.55/0.45
    expect(derived!.score).not.toBe(85);
    expect(derived!.score).not.toBe(70);
  });

  it("analystTierLabel stays observational, not game-rank copy", () => {
    expect(analystTierLabel("rookie", true)).toBe("관측 입문");
    expect(analystTierLabel("chief", true)).toBe("수석 관측자");
    expect(analystTierLabel("rookie", false)).toBe("Observer");
    expect(analystTierLabel("chief", false)).toBe("Lead observer");
  });

  it("GTS brand ticker and predict copy", () => {
    expect(GTS.ticker).toBe("GTS");
    expect(formatGtiTitle(true)).toContain("GTS");
    const q = gtiPredictQuestion();
    expect(q.ko).toContain("GTS");
    expect(gtiMethodologyProseShort("ko")).toContain("IEP");
  });
});