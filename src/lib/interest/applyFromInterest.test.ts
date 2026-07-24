import { describe, expect, it } from "vitest";
import {
  sortNewsByInterest,
  suggestLayerPatchFromInterest,
} from "@/lib/interest/applyFromInterest";
import type { InterestProfile } from "@/lib/interest/interestTypes";
import type { NewsStreamItem } from "@/lib/news/types";

function item(partial: Partial<NewsStreamItem> & Pick<NewsStreamItem, "id" | "theater">): NewsStreamItem {
  return {
    title: partial.id,
    link: "#",
    source: "t",
    pubDate: partial.pubDate ?? "2026-07-01T12:00:00Z",
    trustTier: 1,
    ...partial,
  };
}

describe("sortNewsByInterest", () => {
  it("boosts matching theaters before recency", () => {
    const items = [
      item({ id: "a", theater: "global", pubDate: "2026-07-02T12:00:00Z" }),
      item({ id: "b", theater: "middle-east", pubDate: "2026-07-01T12:00:00Z" }),
    ];
    const sorted = sortNewsByInterest(items, { "middle-east": 3 }, false);
    expect(sorted.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("suggestLayerPatchFromInterest", () => {
  it("returns enable-only patch from themes", () => {
    const profile: InterestProfile = {
      eventCount: 5,
      buckets: [],
      topTheaters: [],
      topThemes: [{ kind: "theme", id: "ais", score: 2, count: 3, lastAt: Date.now() }],
      topSymbols: [],
    };
    const patch = suggestLayerPatchFromInterest(profile, "conflict");
    expect(patch?.showAis).toBe(true);
  });

  it("skips cold profiles", () => {
    const profile: InterestProfile = {
      eventCount: 1,
      buckets: [{ kind: "theme", id: "ais", score: 0.2, count: 1, lastAt: Date.now() }],
      topTheaters: [],
      topThemes: [{ kind: "theme", id: "ais", score: 0.2, count: 1, lastAt: Date.now() }],
      topSymbols: [],
    };
    expect(suggestLayerPatchFromInterest(profile, "conflict")).toBeNull();
  });
});
