import { describe, expect, it } from "vitest";
import {
  theaterAssetSymbols,
  theaterPrimarySymbols,
} from "@/lib/theaterAssets";
import {
  CONFLICT_TICKER_STRIP_CORE,
  ECONOMY_TICKER_STRIP_CORE,
  mergeTickerStripSymbols,
} from "@/lib/stockTickers";

describe("theaterAssets conflict equity", () => {
  it("china-taiwan leads with TSM / SMH", () => {
    const symbols = theaterAssetSymbols("china-taiwan", "conflict");
    expect(symbols[0]).toBe("TSM");
    expect(symbols[1]).toBe("SMH");
    expect(symbols).not.toContain("CL=F");
  });

  it("korea leads with Samsung / hynix / SMH", () => {
    const symbols = theaterAssetSymbols("korea", "conflict");
    expect(symbols.slice(0, 3)).toEqual(["005930.KS", "000660.KS", "SMH"]);
  });

  it("middle-east uses defense primes not oil", () => {
    const symbols = theaterAssetSymbols("middle-east", "conflict");
    expect(symbols.slice(0, 3)).toEqual(["ITA", "LMT", "RTX"]);
    expect(symbols).not.toContain("CL=F");
  });
});

describe("theaterAssets economy futures", () => {
  it("russia-ukraine leads with grain then energy", () => {
    const symbols = theaterAssetSymbols("russia-ukraine", "economy");
    expect(symbols.slice(0, 4)).toEqual(["ZW=F", "ZC=F", "CL=F", "BZ=F"]);
  });

  it("middle-east leads with oil and natural gas", () => {
    const symbols = theaterAssetSymbols("middle-east", "economy");
    expect(symbols.slice(0, 3)).toEqual(["CL=F", "BZ=F", "NG=F"]);
  });

  it("china-taiwan has futures not chip equities", () => {
    const symbols = theaterAssetSymbols("china-taiwan", "economy");
    expect(symbols).toContain("CL=F");
    expect(symbols).not.toContain("TSM");
    expect(symbols).not.toContain("SMH");
  });

  it("theaterPrimarySymbols with limit still slices", () => {
    expect(theaterPrimarySymbols("russia-ukraine", 3, "economy")).toEqual([
      "ZW=F",
      "ZC=F",
      "CL=F",
    ]);
  });
});

describe("mergeTickerStripSymbols", () => {
  it("economy puts strip-external highlights first", () => {
    const merged = mergeTickerStripSymbols(["ZW=F", "CL=F"], "economy");
    expect(merged.slice(0, 2)).toEqual(["ZW=F", "CL=F"]);
    expect(merged).toContain("^VIX");
    expect(merged.filter((s) => s === "CL=F")).toHaveLength(1);
  });

  it("conflict core has no oil futures", () => {
    expect(mergeTickerStripSymbols([], "conflict")).toEqual([
      ...CONFLICT_TICKER_STRIP_CORE,
    ]);
    expect(CONFLICT_TICKER_STRIP_CORE).not.toContain("CL=F");
  });

  it("economy without highlights equals economy core", () => {
    expect(mergeTickerStripSymbols([], "economy")).toEqual([
      ...ECONOMY_TICKER_STRIP_CORE,
    ]);
  });
});
