import { describe, expect, it } from "vitest";
import { futuresInvestorRelevance } from "@/lib/news/futuresInvestorRelevance";
import { sortNewsByInterest } from "@/lib/interest/applyFromInterest";
import type { NewsStreamItem } from "@/lib/news/types";

function item(
  partial: Partial<NewsStreamItem> & Pick<NewsStreamItem, "id" | "title">,
): NewsStreamItem {
  return {
    link: "#",
    source: "t",
    pubDate: partial.pubDate ?? "2026-07-01T12:00:00Z",
    theater: partial.theater ?? "global",
    trustTier: 1,
    feedTopic: "economy",
    ...partial,
  };
}

describe("futuresInvestorRelevance", () => {
  it("scores energy and oil headlines high in economy mode", () => {
    const oil = item({
      id: "oil",
      title: "Brent crude jumps after Hormuz tanker risk",
      econGenre: "energy",
    });
    const tech = item({
      id: "tech",
      title: "New iPhone launch event draws crowds",
      econGenre: "tech",
    });
    expect(futuresInvestorRelevance(oil, "economy")).toBeGreaterThan(
      futuresInvestorRelevance(tech, "economy") + 40,
    );
  });

  it("still boosts choke/oil lightly in conflict mode", () => {
    const choke = item({
      id: "c",
      title: "Red Sea shipping rates spike after attacks",
      feedTopic: "defense",
      theater: "middle-east",
    });
    const other = item({
      id: "o",
      title: "Diplomatic talks resume in capital",
      feedTopic: "defense",
      theater: "middle-east",
    });
    expect(futuresInvestorRelevance(choke, "conflict")).toBeGreaterThan(
      futuresInvestorRelevance(other, "conflict"),
    );
  });
});

describe("sortNewsByInterest + futures persona", () => {
  it("puts oil/macro ahead of tech when preferEconomy", () => {
    const items = [
      item({
        id: "tech",
        title: "Big Tech AI chip partnership",
        econGenre: "tech",
        pubDate: "2026-07-03T12:00:00Z",
      }),
      item({
        id: "oil",
        title: "WTI and Brent rally on OPEC signal",
        econGenre: "energy",
        pubDate: "2026-07-01T12:00:00Z",
      }),
      item({
        id: "fed",
        title: "Fed holds rates; Treasury yields jump",
        econGenre: "macro",
        pubDate: "2026-07-02T12:00:00Z",
      }),
    ];
    const sorted = sortNewsByInterest(items, {}, true);
    expect(sorted.map((x) => x.id).slice(0, 2)).toEqual(["oil", "fed"]);
  });

  it("still respects theater interest before persona", () => {
    const items = [
      item({
        id: "oil-global",
        title: "Brent crude rises",
        econGenre: "energy",
        theater: "global",
      }),
      item({
        id: "talks",
        title: "Diplomatic talks",
        econGenre: "tech",
        theater: "middle-east",
        feedTopic: "defense",
      }),
    ];
    const sorted = sortNewsByInterest(items, { "middle-east": 5 }, true);
    expect(sorted[0]?.id).toBe("talks");
  });
});
