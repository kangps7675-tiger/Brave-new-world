/**
 * Yahoo 선물 심볼 → Databento continuous contract (CME Globex).
 * 매핑 없는 심볼(지수·FX·주식)은 Yahoo/FRED 유지.
 */

export type DatabentoInstrument = {
  dataset: string;
  /** continuous symbology e.g. CL.c.0 */
  symbol: string;
  stypeIn: "continuous";
};

/** 지경학 선물 화이트리스트 — Databento 우선 조회 대상 */
export const DATABENTO_FUTURES_YAHOO_SYMBOLS = [
  "CL=F",
  "BZ=F",
  "NG=F",
  "GC=F",
  "SI=F",
  "HG=F",
  "ZW=F",
  "ZC=F",
] as const;

export type DatabentoFuturesYahooSymbol = (typeof DATABENTO_FUTURES_YAHOO_SYMBOLS)[number];

const MAP: Record<DatabentoFuturesYahooSymbol, DatabentoInstrument> = {
  "CL=F": { dataset: "GLBX.MDP3", symbol: "CL.c.0", stypeIn: "continuous" },
  "BZ=F": { dataset: "GLBX.MDP3", symbol: "BZ.c.0", stypeIn: "continuous" },
  "NG=F": { dataset: "GLBX.MDP3", symbol: "NG.c.0", stypeIn: "continuous" },
  "GC=F": { dataset: "GLBX.MDP3", symbol: "GC.c.0", stypeIn: "continuous" },
  "SI=F": { dataset: "GLBX.MDP3", symbol: "SI.c.0", stypeIn: "continuous" },
  "HG=F": { dataset: "GLBX.MDP3", symbol: "HG.c.0", stypeIn: "continuous" },
  "ZW=F": { dataset: "GLBX.MDP3", symbol: "ZW.c.0", stypeIn: "continuous" },
  "ZC=F": { dataset: "GLBX.MDP3", symbol: "ZC.c.0", stypeIn: "continuous" },
};

export function isDatabentoFuturesSymbol(symbol: string): symbol is DatabentoFuturesYahooSymbol {
  return (DATABENTO_FUTURES_YAHOO_SYMBOLS as readonly string[]).includes(symbol);
}

export function databentoInstrumentForYahoo(
  yahooSymbol: string,
): DatabentoInstrument | null {
  if (!isDatabentoFuturesSymbol(yahooSymbol)) return null;
  return MAP[yahooSymbol];
}
