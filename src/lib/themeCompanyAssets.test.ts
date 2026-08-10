import { describe, expect, it } from "vitest";
import {
  COMPANY_THEME_IDS,
  THEME_COMPANY_ASSETS,
  allThemeCompanySymbols,
  companyThemeSymbols,
} from "@/lib/themeCompanyAssets";
import { STOCK_TICKER_SYMBOLS, tickerDisplayName } from "@/lib/stockTickers";

describe("themeCompanyAssets", () => {
  it("keeps at most 6 symbols per theme", () => {
    for (const id of COMPANY_THEME_IDS) {
      expect(THEME_COMPANY_ASSETS[id].symbols.length).toBeGreaterThan(0);
      expect(THEME_COMPANY_ASSETS[id].symbols.length).toBeLessThanOrEqual(6);
    }
  });

  it("forbids duplicate symbols across themes", () => {
    const seen = new Map<string, string>();
    for (const id of COMPANY_THEME_IDS) {
      for (const symbol of companyThemeSymbols(id)) {
        const prev = seen.get(symbol);
        expect(prev, `${symbol} duplicated in ${prev} and ${id}`).toBeUndefined();
        seen.set(symbol, id);
      }
    }
  });

  it("keeps majors separate from thematic / defense boards", () => {
    const majors = new Set(companyThemeSymbols("majors"));
    for (const id of COMPANY_THEME_IDS) {
      if (id === "majors") continue;
      for (const symbol of companyThemeSymbols(id)) {
        expect(majors.has(symbol)).toBe(false);
      }
    }
  });

  it("registers every theme symbol in STOCK_TICKER_SYMBOLS with display names", () => {
    const catalog = new Set(STOCK_TICKER_SYMBOLS.map((s) => s.symbol));
    for (const symbol of allThemeCompanySymbols()) {
      expect(catalog.has(symbol)).toBe(true);
      expect(tickerDisplayName(symbol, "ko").length).toBeGreaterThan(0);
      expect(tickerDisplayName(symbol, "en").length).toBeGreaterThan(0);
    }
  });

  it("defense board uses ITA plus US primes", () => {
    const defense = companyThemeSymbols("defense");
    expect(defense).toContain("ITA");
    expect(defense).toEqual(expect.arrayContaining(["LMT", "RTX", "NOC", "GD"]));
  });
});
