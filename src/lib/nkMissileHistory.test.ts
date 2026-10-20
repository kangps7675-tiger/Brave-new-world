import { describe, expect, it } from "vitest";
import { pickCesiumMissileLaunches } from "@/lib/cesiumMissileLaunches";
import {
  buildNkMissileHistoryCards,
  historyArcSamples,
  matchNkMissileHistoryCard,
} from "@/lib/nkMissileHistory";

describe("cesium missile launches stay on the latest issues", () => {
  it("drops the archive when a live issue exists", () => {
    const picked = pickCesiumMissileLaunches([
      { id: "hist-nk-nk-launch-1998-taepodong1" },
      { id: "hist-nk-nk-launch-2025-irbm" },
      { id: "live-nk-cluster-1" },
      { id: "seed-nk-nk-sunan-ballistic" },
    ]);
    expect(picked.map((item) => item.id)).toEqual(["live-nk-cluster-1"]);
  });

  it("keeps only the two newest chronicle points when nothing is live", () => {
    const picked = pickCesiumMissileLaunches([
      { id: "hist-nk-nk-launch-1998-taepodong1" },
      { id: "hist-nk-nk-launch-2024-cruise" },
      { id: "hist-nk-nk-launch-2025-irbm" },
      { id: "seed-nk-nk-sunan-ballistic" },
    ]);
    expect(picked.map((item) => item.id).sort()).toEqual([
      "hist-nk-nk-launch-2024-cruise",
      "hist-nk-nk-launch-2025-irbm",
    ]);
  });
});

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
