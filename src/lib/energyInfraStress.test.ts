import { describe, expect, it } from "vitest";
import {
  buildEnergyInfraStressBriefing,
  matchEnergyInfraAnchor,
  pickEnergyInfraStrikeHeadline,
} from "@/lib/energyInfraStress";
import { isUkraineRussiaEnergyInfraStrike } from "@/lib/news/breakingFlash";

describe("energy infra stress", () => {
  it("detects Ukraine refinery / oil-well kinetic headlines", () => {
    expect(
      isUkraineRussiaEnergyInfraStrike(
        "Russian missiles strike Kremenchuk oil refinery in Ukraine",
      ),
    ).toBe(true);
    expect(
      isUkraineRussiaEnergyInfraStrike("Drone hits oil well facility near Shebelinka"),
    ).toBe(true);
    expect(isUkraineRussiaEnergyInfraStrike("크레멘추크 정유공장 폭격")).toBe(true);
    expect(isUkraineRussiaEnergyInfraStrike("Oil prices rise on OPEC chatter")).toBe(false);
  });

  it("picks and builds parchment briefing with Brent slot", () => {
    const hit = pickEnergyInfraStrikeHeadline([
      "Markets open mixed in Asia",
      "Russian missiles strike Kremenchuk oil refinery in central Ukraine",
    ]);
    expect(hit).toContain("Kremenchuk");
    const anchor = matchEnergyInfraAnchor(hit!);
    expect(anchor.id).toBe("ua-kremenchuk-refinery");
    const briefing = buildEnergyInfraStressBriefing({
      headline: hit!,
      lang: "ko",
    });
    expect(briefing.kind).toBe("energy-infra");
    expect(briefing.assetSlotLabel).toBe("Brent");
    expect(briefing.paragraphs.some((p) => p.includes("가격 예측이 아닙니다") || p.includes("공식 물류"))).toBe(
      true,
    );
  });
});
