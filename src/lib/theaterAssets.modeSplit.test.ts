import { describe, expect, it } from "vitest";
import {
  theaterAssetSymbols,
  THEATER_ASSETS_CONFLICT,
  THEATER_ASSETS_ECONOMY,
} from "@/lib/theaterAssets";
import {
  CONFLICT_TICKER_STRIP_CORE,
  ECONOMY_TICKER_STRIP_CORE,
  mergeTickerStripSymbols,
} from "@/lib/stockTickers";
import { isDatabentoFuturesSymbol } from "@/lib/databento/symbolMap";

describe("theaterAssets mode split", () => {
  it("keeps TSM on china-taiwan conflict and excludes futures oil", () => {
    const symbols = theaterAssetSymbols("china-taiwan", "conflict");
    expect(symbols).toContain("TSM");
    expect(symbols).toContain("SMH");
    expect(symbols).not.toContain("CL=F");
  });

  it("excludes chip equities from china-taiwan economy", () => {
    const symbols = theaterAssetSymbols("china-taiwan", "economy");
    expect(symbols).toContain("CL=F");
    expect(symbols).not.toContain("TSM");
    expect(symbols).not.toContain("SMH");
  });

  it("uses defense primes for middle-east conflict", () => {
    const symbols = theaterAssetSymbols("middle-east", "conflict");
    expect(symbols).toContain("ITA");
    expect(symbols).toContain("LMT");
    expect(symbols).not.toContain("CL=F");
  });

  it("tables cover the same theater keys", () => {
    expect(Object.keys(THEATER_ASSETS_CONFLICT).sort()).toEqual(
      Object.keys(THEATER_ASSETS_ECONOMY).sort(),
    );
  });
});

describe("mergeTickerStripSymbols", () => {
  it("conflict strip has no oil futures in core", () => {
    expect(CONFLICT_TICKER_STRIP_CORE).not.toContain("CL=F");
    expect(CONFLICT_TICKER_STRIP_CORE).toContain("ITA");
    expect(CONFLICT_TICKER_STRIP_CORE).toContain("TSM");
    const merged = mergeTickerStripSymbols([], "conflict");
    expect(merged).not.toContain("CL=F");
    expect(merged[0]).toBe("ITA");
  });

  it("economy strip keeps futures and dual-lens semiconductors in core", () => {
    expect(ECONOMY_TICKER_STRIP_CORE).toContain("CL=F");
    expect(ECONOMY_TICKER_STRIP_CORE).toContain("TSM");
    expect(ECONOMY_TICKER_STRIP_CORE).toContain("SMH");
    const merged = mergeTickerStripSymbols(["ZW=F"], "economy");
    expect(merged[0]).toBe("ZW=F");
    expect(merged).toContain("CL=F");
    expect(merged).toContain("TSM");
  });
});

describe("databento symbol map", () => {
  it("whitelists CME futures only", () => {
    expect(isDatabentoFuturesSymbol("CL=F")).toBe(true);
    expect(isDatabentoFuturesSymbol("TSM")).toBe(false);
    expect(isDatabentoFuturesSymbol("^VIX")).toBe(false);
  });
});
