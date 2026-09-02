import { describe, expect, it } from "vitest";
import {
  buildTheaterRegionalInsight,
  pickRegionalRankEntry,
  rankEntityCandidates,
} from "@/lib/theaterRegionalInsight";
import type { DailyRankEntry } from "@/lib/dailyRanks";

function rank(
  entityId: string,
  score: number,
  delta: number | null,
  detail?: Record<string, unknown>,
): DailyRankEntry {
  return {
    rankDate: "2026-09-02",
    kind: entityId.startsWith("choke-") ? "chokepoint" : "theater",
    entityId,
    labelKo: entityId,
    labelEn: entityId,
    score,
    rank: 1,
    prevRank: 2,
    deltaRank: -1,
    deltaScore: delta,
    detail: detail ?? {
      displayScore: score,
      zScores: { mentions: 1.5, fireCount: 2.1 },
    },
    updatedAt: "2026-09-02T00:00:00.000Z",
  };
}

describe("theaterRegionalInsight", () => {
  it("maps nav id to choke entity", () => {
    const c = rankEntityCandidates("persian-gulf", "middle-east");
    expect(c.chokeIds).toContain("choke-hormuz");
  });

  it("picks theater rank for ukraine nav", () => {
    const theaters = [rank("russia-ukraine", 72, 3)];
    const hit = pickRegionalRankEntry({
      selectionId: "ukraine-east",
      newsTheater: "russia-ukraine",
      theaterRanks: theaters,
      chokeRanks: [],
    });
    expect(hit?.entityId).toBe("russia-ukraine");
  });

  it("builds Korean paragraphs with GTI driver and news", () => {
    const out = buildTheaterRegionalInsight({
      regionLabelKo: "우크라이나",
      regionLabelEn: "Ukraine",
      selectionId: "ukraine",
      newsTheater: "russia-ukraine",
      rssTitles: ["Drone strike reported near Kharkiv", "Front line shifts in Donetsk"],
      gdeltCount: 4,
      telegramAlerts: [
        {
          id: "1",
          channelUsername: "test",
          channelTitle: "Test",
          region: "ukraine",
          text: "Explosion heard in Kharkiv oblast",
          receivedAt: new Date().toISOString(),
        },
      ],
      telegramRegion: "ukraine",
      theaterRanks: [rank("russia-ukraine", 68, 2.4)],
      chokeRanks: [],
    });

    expect(out.paragraphsKo.length).toBeGreaterThanOrEqual(2);
    expect(out.paragraphsKo[0]).toContain("긴장 점수");
    expect(out.paragraphsKo[0]).toMatch(/평균보다/);
    expect(out.headlineKo).toContain("우크라이나");
    expect(out.signals.some((s) => s.id === "gti")).toBe(true);
  });
});
