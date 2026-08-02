import { describe, expect, it } from "vitest";
import {
  theaterAssetSymbols,
  theaterPrimarySymbols,
} from "@/lib/theaterAssets";
import { mergeTickerStripSymbols, TICKER_STRIP_SYMBOLS } from "@/lib/stockTickers";

describe("theaterAssets primary ordering", () => {
  it("russia-ukraine leads with grain then energy", () => {
    const symbols = theaterAssetSymbols("russia-ukraine");
    expect(symbols.slice(0, 4)).toEqual(["ZW=F", "ZC=F", "CL=F", "BZ=F"]);
  });

  it("middle-east leads with oil and natural gas", () => {
    const symbols = theaterAssetSymbols("middle-east");
    expect(symbols.slice(0, 3)).toEqual(["CL=F", "BZ=F", "NG=F"]);
  });

  it("china-taiwan leads with semiconductor proxies", () => {
    const symbols = theaterAssetSymbols("china-taiwan");
    expect(symbols[0]).toBe("SMH");
    expect(symbols[1]).toBe("TSM");
    expect(symbols).toContain("^IXIC");
  });

  it("korea leads with FX, KOSPI, and yields", () => {
    const symbols = theaterAssetSymbols("korea");
    expect(symbols.slice(0, 3)).toEqual(["KRW=X", "^KS11", "^TNX"]);
  });

  it("southeast-asia leads with oil and semis", () => {
    const symbols = theaterAssetSymbols("southeast-asia");
    expect(symbols.slice(0, 3)).toEqual(["BZ=F", "CL=F", "SMH"]);
  });

  it("theaterPrimarySymbols without limit returns full list", () => {
    expect(theaterPrimarySymbols("russia-ukraine")).toEqual(
      theaterAssetSymbols("russia-ukraine"),
    );
  });

  it("theaterPrimarySymbols with limit still slices", () => {
    expect(theaterPrimarySymbols("russia-ukraine", 3)).toEqual(["ZW=F", "ZC=F", "CL=F"]);
  });
});

describe("mergeTickerStripSymbols", () => {
  it("puts strip-external highlights first so grain/semis appear", () => {
    const merged = mergeTickerStripSymbols(["ZW=F", "SMH", "CL=F"]);
    expect(merged.slice(0, 3)).toEqual(["ZW=F", "SMH", "CL=F"]);
    expect(merged).toContain("^VIX");
    expect(merged.filter((s) => s === "CL=F")).toHaveLength(1);
  });

  it("without highlights equals core strip", () => {
    expect(mergeTickerStripSymbols([])).toEqual([...TICKER_STRIP_SYMBOLS]);
  });
});
