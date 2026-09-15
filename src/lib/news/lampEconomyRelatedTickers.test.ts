import { describe, expect, it } from "vitest";
import { pickEconomyLampRelatedSymbols } from "@/lib/news/lampEconomyRelatedTickers";
import type { LampFeaturedNews } from "@/lib/news/periodicBriefing";

function news(partial: Partial<LampFeaturedNews> & Pick<LampFeaturedNews, "title">): LampFeaturedNews {
  return {
    id: partial.id ?? "n1",
    title: partial.title,
    summary: partial.summary ?? "summary",
    imageUrl: partial.imageUrl ?? "https://example.com/a.jpg",
    link: partial.link ?? "https://example.com/a",
    source: partial.source ?? "Reuters",
    trustTier: partial.trustTier ?? 1,
    focusLabel: partial.focusLabel,
    theater: partial.theater,
    econGenre: partial.econGenre,
  };
}

describe("pickEconomyLampRelatedSymbols", () => {
  it("maps company mentions to catalog symbols", () => {
    const symbols = pickEconomyLampRelatedSymbols(
      [news({ title: "Nvidia and Samsung chip export controls" })],
      8,
    );
    expect(symbols).toContain("NVDA");
    expect(symbols).toContain("005930.KS");
  });

  it("falls back to macro symbols when no entity match", () => {
    const symbols = pickEconomyLampRelatedSymbols(
      [news({ title: "Global markets quiet day", theater: "global", econGenre: "markets" })],
      6,
    );
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols.some((s) => ["^GSPC", "^VIX", "^TNX", "CL=F"].includes(s))).toBe(true);
  });
});
