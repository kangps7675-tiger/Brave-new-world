import { describe, expect, it } from "vitest";
import {
  CHOKEPOINT_TRANSIT_PARCHMENT_PCT,
  chokepointTransitParchmentDirection,
  shouldOfferChokepointStressParchment,
  type ChokepointStress,
} from "@/lib/logisticsStress";
import {
  buildChokepointStressBriefing,
  insightToneForDirection,
} from "@/lib/chokepointStressBriefing";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";

function baseStress(partial?: Partial<ChokepointStress>): ChokepointStress {
  return {
    chokepointId: "choke-hormuz",
    level: "unknown",
    graded: false,
    signals: [],
    latestObservedAt: null,
    ...partial,
  };
}

describe("chokepoint transit parchment", () => {
  it("flags blocked / clearing by percent threshold", () => {
    expect(chokepointTransitParchmentDirection({ changePct: -CHOKEPOINT_TRANSIT_PARCHMENT_PCT })).toBe(
      "blocked",
    );
    expect(chokepointTransitParchmentDirection({ changePct: CHOKEPOINT_TRANSIT_PARCHMENT_PCT })).toBe(
      "clearing",
    );
    expect(chokepointTransitParchmentDirection({ changePct: -5 })).toBeNull();
    expect(chokepointTransitParchmentDirection({ changePct: -20, isDemo: true })).toBeNull();
  });

  it("offers parchment on transit squeeze or A-grade elevated", () => {
    expect(
      shouldOfferChokepointStressParchment(baseStress(), { changePct: -18 }),
    ).toBe(true);
    expect(
      shouldOfferChokepointStressParchment(
        baseStress({ graded: true, level: "elevated" }),
        null,
      ),
    ).toBe(true);
    expect(shouldOfferChokepointStressParchment(baseStress(), { changePct: -3 })).toBe(false);
  });

  it("builds Korean briefing with asset slot and non-forecast insight", () => {
    const point = LOGISTICS_RISK_POINTS.find((p) => p.id === "choke-hormuz");
    expect(point).toBeTruthy();
    const briefing = buildChokepointStressBriefing({
      point: point!,
      stress: baseStress({
        signals: [
          {
            tier: "B",
            labelKo: "선박 통항 관측치 -20% (우회 가능성)",
            labelEn: "Vessel transit -20%",
            sourceKo: "IMF PortWatch",
            sourceEn: "IMF PortWatch",
          },
        ],
      }),
      aisObservation: { changePct: -20, observedAt: "2026-09-24T00:00:00.000Z" },
      lang: "ko",
      headlineSnippets: ["호르무즈 통항 지연"],
    });
    expect(briefing).not.toBeNull();
    expect(briefing!.direction).toBe("blocked");
    expect(briefing!.assetSlotLabel.length).toBeGreaterThan(0);
    expect(briefing!.paragraphs.some((p) => p.includes("시나리오 톤"))).toBe(true);
    expect(briefing!.paragraphs.some((p) => /예측이 아닙니다|투자 권유/.test(p) || p.includes("공식 물류"))).toBe(
      true,
    );
    expect(insightToneForDirection("blocked")).toBe("tighten");
    expect(insightToneForDirection("clearing")).toBe("ease");
  });
});
