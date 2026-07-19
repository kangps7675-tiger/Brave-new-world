import {
  theaterAssetNote,
  theaterAssetSymbols,
  type TheaterMarketFilter,
} from "@/lib/theaterAssets";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type { TheaterMarketFilter } from "@/lib/theaterAssets";
export {
  THEATER_ASSETS,
  theaterAssetNote,
  theaterAssetSymbols,
  yahooQuoteUrl,
  tradingViewSymbolUrl,
} from "@/lib/theaterAssets";

export type StockTickerSymbol = {
  symbol: string;
  label: string;
};

export type StockTickerItem = {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
  /** 최근 2일 15분봉 종가 — 미니 스파크라인용 */
  sparkline: number[];
};

/** 특정 사건(뉴스) 발생 시점 대비 지금까지의 가격 변동 — "사건-종목 연결" 카드용 */
export type MarketReactionItem = {
  symbol: string;
  priceAt: number | null;
  priceNow: number | null;
  changePercentSinceEvent: number | null;
};

/**
 * Yahoo 심볼 → 사람이 읽는 이름 (CL=F → WTI 원유 등).
 * UI는 심볼 대신 이 이름을 쓰고, 심볼은 title/링크에만 둡니다.
 */
export const TICKER_DISPLAY_NAMES: Record<string, { ko: string; en: string }> = {
  "^VIX": { ko: "VIX 공포지수", en: "VIX Fear Index" },
  "CL=F": { ko: "WTI 원유", en: "WTI Crude Oil" },
  "BZ=F": { ko: "브렌트유", en: "Brent Crude" },
  "GC=F": { ko: "금 선물", en: "Gold Futures" },
  "BTC-USD": { ko: "비트코인", en: "Bitcoin" },
  "DX-Y.NYB": { ko: "달러 인덱스", en: "US Dollar Index" },
  "^GSPC": { ko: "S&P 500", en: "S&P 500" },
  "^IXIC": { ko: "나스닥", en: "Nasdaq Composite" },
  "^N225": { ko: "니케이 225", en: "Nikkei 225" },
  "^KS11": { ko: "코스피", en: "KOSPI" },
  "^HSI": { ko: "항셍지수", en: "Hang Seng" },
  "000001.SS": { ko: "상하이종합", en: "Shanghai Composite" },
};

/**
 * Yahoo Finance — API 키 없이 동작 검증된 심볼만 (Massive 무료 미지원 아시아·원자재 대체).
 * label은 영문 짧은 표기(API 기본값). UI는 tickerDisplayName() 사용.
 * @see `/api/stock-tickers` · `yahoo-finance2`
 */
export const STOCK_TICKER_SYMBOLS: StockTickerSymbol[] = [
  { symbol: "^VIX", label: "VIX Fear Index" },
  { symbol: "CL=F", label: "WTI Crude Oil" },
  { symbol: "BZ=F", label: "Brent Crude" },
  { symbol: "GC=F", label: "Gold Futures" },
  { symbol: "BTC-USD", label: "Bitcoin" },
  { symbol: "DX-Y.NYB", label: "US Dollar Index" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^N225", label: "Nikkei 225" },
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^HSI", label: "Hang Seng" },
  { symbol: "000001.SS", label: "Shanghai Composite" },
];

/** Yahoo 심볼을 한글/영문 표시명으로. 없으면 기존 label·심볼 정제. */
export function tickerDisplayName(
  symbol: string,
  lang: LabelLanguage = "ko",
): string {
  const named = TICKER_DISPLAY_NAMES[symbol];
  if (named) return lang === "en" ? named.en : named.ko;
  const fallback = STOCK_TICKER_SYMBOLS.find((entry) => entry.symbol === symbol)?.label;
  if (fallback) return fallback;
  return symbol.replace(/^\^/, "").replace(/=F$/, "");
}

/** 하단 스크롤 스트립 — 매크로·에너지·비트코인·미국 지수 */
export const TICKER_STRIP_SYMBOLS: string[] = [
  "^VIX",
  "CL=F",
  "BZ=F",
  "GC=F",
  "BTC-USD",
  "DX-Y.NYB",
  "^GSPC",
  "^IXIC",
];

export type MarketGroupId = "risk" | "commodities" | "crypto" | "us-equities" | "asia";

export const MARKET_GROUPS: Array<{ id: MarketGroupId; label: string; symbols: string[] }> = [
  { id: "risk", label: "리스크 · 달러", symbols: ["^VIX", "DX-Y.NYB"] },
  { id: "commodities", label: "에너지 · 금", symbols: ["CL=F", "BZ=F", "GC=F"] },
  { id: "crypto", label: "암호화폐", symbols: ["BTC-USD"] },
  { id: "us-equities", label: "미국 지수", symbols: ["^GSPC", "^IXIC"] },
  { id: "asia", label: "아시아 지수", symbols: ["^N225", "^KS11", "^HSI", "000001.SS"] },
];

export function formatTickerPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 10_000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(2);
}

export function formatTickerChangePercent(changePercent: number | null): string {
  if (changePercent === null) return "—";
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
}

export function tickerChangeTone(changePercent: number | null): "up" | "down" | "flat" {
  if (changePercent === null || Math.abs(changePercent) < 0.05) return "flat";
  return changePercent > 0 ? "up" : "down";
}

/** @deprecated Prefer theaterAssetSymbols — kept for existing imports */
export const THEATER_RELATED_SYMBOLS: Record<TheaterMarketFilter, string[]> = {
  all: theaterAssetSymbols("all"),
  "middle-east": theaterAssetSymbols("middle-east"),
  "russia-ukraine": theaterAssetSymbols("russia-ukraine"),
  "china-taiwan": theaterAssetSymbols("china-taiwan"),
  korea: theaterAssetSymbols("korea"),
  japan: theaterAssetSymbols("japan"),
  "south-asia": theaterAssetSymbols("south-asia"),
  global: theaterAssetSymbols("global"),
};

export function pickRelatedTickers(
  all: StockTickerItem[],
  filter: TheaterMarketFilter,
): StockTickerItem[] {
  const order = theaterAssetSymbols(filter);
  const bySymbol = new Map(all.map((t) => [t.symbol, t]));
  return order.map((symbol) => bySymbol.get(symbol)).filter((t): t is StockTickerItem => t != null);
}

export function theaterMarketBlurb(filter: TheaterMarketFilter): string {
  return theaterAssetNote(filter, "ko");
}
