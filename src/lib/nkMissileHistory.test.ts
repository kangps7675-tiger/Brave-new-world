import { describe, expect, it } from "vitest";
import {
  buildNkMissileHistoryCards,
  historyArcSamples,
  matchNkMissileHistoryCard,
} from "@/lib/nkMissileHistory";

describe("missile history cards", () => {
  it("orders newest first and keeps a reference link", () => {
    const cards = buildNkMissileHistoryCards();
    expect(cards.length).toBeGreaterThan(2);
    expect(cards[0].date >= cards[1].date).toBe(true);
    expect(cards.every((card) => card.sourceUrl)).toBe(true);
    const arc = historyArcSamples(cards[0]);
    expect(arc.length).toBeGreaterThan(8);
    expect(arc[0].heightM).toBe(0);
  });

  it("matches a card from an article date", () => {
    const cards = buildNkMissileHistoryCards();
    const hit = matchNkMissileHistoryCard(cards, "ICBM", "2024-10-31");
    expect(hit?.id).toBe("dprk-2024-10-31");
  });
});
