import { describe, expect, it } from "vitest";
import {
  CHOKEPOINT_PREFERRED_SYMBOLS,
  primaryMajorEventForChokepoint,
  type LogisticsChokepointId,
} from "@/data/majorEventTimeline";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { relatedTickerLabelsToSymbols } from "@/lib/assetVolatilityHint";
import { STOCK_TICKER_SYMBOLS } from "@/lib/stockTickers";

const CHOKE_IDS = Object.keys(
  CHOKEPOINT_PREFERRED_SYMBOLS,
) as LogisticsChokepointId[];

function setKey(syms: readonly string[]): string {
  return [...syms].sort().join("|");
}

describe("chokepoint asset mapping", () => {
  it("every preferred symbol is on STOCK_TICKER_SYMBOLS allowlist", () => {
    const allow = new Set(STOCK_TICKER_SYMBOLS.map((row) => row.symbol));
    for (const id of CHOKE_IDS) {
      for (const sym of CHOKEPOINT_PREFERRED_SYMBOLS[id]) {
        expect(allow.has(sym), `${id} → ${sym}`).toBe(true);
      }
    }
  });

  it("primary chokepoint events use CHOKEPOINT_PREFERRED_SYMBOLS", () => {
    for (const id of CHOKE_IDS) {
      const row = primaryMajorEventForChokepoint(id);
      expect(row, id).toBeTruthy();
      expect(row!.preferredSymbols).toEqual([
        ...CHOKEPOINT_PREFERRED_SYMBOLS[id],
      ]);
    }
  });

  it("no two chokepoints share an identical preferred set", () => {
    const seen = new Map<string, LogisticsChokepointId>();
    for (const id of CHOKE_IDS) {
      const key = setKey(CHOKEPOINT_PREFERRED_SYMBOLS[id]);
      const prev = seen.get(key);
      expect(prev, `${id} duplicates ${prev}`).toBeUndefined();
      seen.set(key, id);
    }
  });

  it("globe relatedTickers resolve to the same symbol set as preferred", () => {
    for (const id of CHOKE_IDS) {
      const point = LOGISTICS_RISK_POINTS.find((p) => p.id === id);
      expect(point, id).toBeTruthy();
      const raw = point!.meta?.relatedTickers;
      const fromLabels = relatedTickerLabelsToSymbols(
        typeof raw === "string" ? raw : undefined,
      );
      expect(setKey(fromLabels)).toBe(
        setKey(CHOKEPOINT_PREFERRED_SYMBOLS[id]),
      );
    }
  });

  it("bosporus includes grain futures; suez includes shipping proxy", () => {
    expect(CHOKEPOINT_PREFERRED_SYMBOLS["choke-bosporus"]).toEqual(
      expect.arrayContaining(["ZW=F", "ZC=F"]),
    );
    expect(CHOKEPOINT_PREFERRED_SYMBOLS["choke-suez"]).toEqual(
      expect.arrayContaining(["BDRY"]),
    );
    expect(CHOKEPOINT_PREFERRED_SYMBOLS["choke-taiwan"]).toEqual(
      expect.arrayContaining(["TSM", "SMH", "^TWII"]),
    );
    expect(CHOKEPOINT_PREFERRED_SYMBOLS["choke-hormuz"]).toEqual(
      expect.arrayContaining(["NG=F"]),
    );
  });
});
