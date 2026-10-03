import { describe, expect, it } from "vitest";
import {
  economyGenreContentMatches,
  isEconomySoftNoise,
  matchesEconomyGenreItem,
} from "@/lib/news/economyGenres";
import { isFeedItemRelevant, type NewsFeedDef } from "@/lib/news/feedCatalog";

const infraFeed: NewsFeedDef = {
  url: "https://example.com/infra",
  name: "Critical Minerals",
  theater: "global",
  topic: "economy",
  econGenre: "infra",
  unfiltered: true,
};

describe("economy soft noise", () => {
  it("flags sports and entertainment headlines", () => {
    expect(isEconomySoftNoise("Australia cricket team wins World Cup")).toBe(true);
    expect(isEconomySoftNoise("NBA finals draw record TV audience")).toBe(true);
    expect(isEconomySoftNoise("손흥민 축구 골 기록")).toBe(true);
  });

  it("keeps mineral and infrastructure headlines", () => {
    expect(isEconomySoftNoise("China rare earth export controls tighten")).toBe(false);
    expect(isEconomySoftNoise("Lithium mining investment rises in Australia")).toBe(false);
  });
});

describe("economyGenreContentMatches", () => {
  it("accepts infra keywords and rejects sports", () => {
    expect(
      economyGenreContentMatches(
        "Lithium and cobalt mining investment in Australia",
        "infra",
      ),
    ).toBe(true);
    expect(
      economyGenreContentMatches("Premier League stadium naming rights deal", "infra"),
    ).toBe(false);
  });

  it("keeps energy and chips distinct", () => {
    expect(economyGenreContentMatches("Brent crude jumps after OPEC cut", "energy")).toBe(
      true,
    );
    expect(economyGenreContentMatches("Brent crude jumps after OPEC cut", "chips")).toBe(
      false,
    );
    expect(economyGenreContentMatches("TSMC expands advanced chip fab", "chips")).toBe(
      true,
    );
  });
});

describe("matchesEconomyGenreItem", () => {
  it("hides sports even when tagged infra", () => {
    expect(
      matchesEconomyGenreItem(
        {
          econGenre: "infra",
          title: "Australia sports investment fund expands cricket venues",
        },
        "infra",
      ),
    ).toBe(false);
  });

  it("requires content match for specific genres", () => {
    expect(
      matchesEconomyGenreItem(
        {
          econGenre: "infra",
          title: "Generic Australia investment outlook improves",
        },
        "infra",
      ),
    ).toBe(false);
    expect(
      matchesEconomyGenreItem(
        {
          econGenre: "infra",
          title: "Critical minerals mining deal with China",
        },
        "infra",
      ),
    ).toBe(true);
  });

  it("allows markets breadth after soft-noise filter", () => {
    expect(
      matchesEconomyGenreItem(
        { econGenre: "markets", title: "US stocks rise on earnings beat" },
        "markets",
      ),
    ).toBe(true);
    expect(
      matchesEconomyGenreItem(
        { econGenre: "markets", title: "Football club IPO rumors swirl" },
        "markets",
      ),
    ).toBe(false);
  });
});

describe("isFeedItemRelevant economy genre gate", () => {
  it("drops sports from unfiltered infra Google feeds", () => {
    expect(
      isFeedItemRelevant(
        "Australia cricket stars sign record sponsorship deals",
        "Sports",
        infraFeed,
      ),
    ).toBe(false);
  });

  it("keeps mineral headlines on infra feeds", () => {
    expect(
      isFeedItemRelevant(
        "Rare earth mining investment jumps in Australia",
        "Business",
        infraFeed,
      ),
    ).toBe(true);
  });

  it("drops infra-tagged items that lack genre keywords", () => {
    expect(
      isFeedItemRelevant("Australia investment climate improves", undefined, infraFeed),
    ).toBe(false);
  });
});
