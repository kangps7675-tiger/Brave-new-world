import YahooFinance from "yahoo-finance2";
import {
  FRED_ONLY_TICKER_SYMBOLS,
  STOCK_TICKER_SYMBOLS,
  type StockTickerItem,
  type StockTickerSymbol,
} from "@/lib/stockTickers";
import {
  fetchFredReadingsBySymbol,
  hasFredApiKey,
  symbolHasFredSeries,
} from "@/lib/fred";
import { hasDatabentoApiKey } from "@/lib/databento/env";
import { fetchDatabentoFuturesTickers } from "@/lib/databento/fetchFutures";
import { isDatabentoFuturesSymbol } from "@/lib/databento/symbolMap";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const LIVE_FETCH_TIMEOUT_MS = 20_000;
/** 일봉 스파크라인 — 전일대비 추세용 */
const DAILY_SPARK_DAYS = 40;

let inflightLiveFetch: Promise<StockTickerItem[]> | null = null;

/** stub 모드용 — Yahoo 호출 없이 UI 레이아웃만 유지 */
export function stubStockTickers(): StockTickerItem[] {
  return [...STOCK_TICKER_SYMBOLS, ...FRED_ONLY_TICKER_SYMBOLS].map((config) => ({
    symbol: config.symbol,
    label: config.label,
    price: null,
    changePercent: null,
    changeBasis: "prev-day",
    asOf: null,
    sparkline: [],
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeQuoteList(
  quotes: Awaited<ReturnType<typeof yahooFinance.quote>>,
): Array<Record<string, unknown>> {
  if (Array.isArray(quotes)) return quotes as Array<Record<string, unknown>>;
  if (quotes && typeof quotes === "object") return [quotes as Record<string, unknown>];
  return [];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * 전 영업일 종가 대비 %.
 * 1) previousClose + 현재가 직접 계산
 * 2) Yahoo regularMarketChangePercent (이미 전일대비)
 * 3) 일봉 스파크라인 마지막 두 점
 */
function prevDayChangePercent(
  quote: Record<string, unknown> | undefined,
  sparkline: number[],
): number | null {
  const price = finiteNumber(quote?.regularMarketPrice);
  const prevClose = finiteNumber(quote?.regularMarketPreviousClose);
  if (price != null && prevClose != null && prevClose !== 0) {
    return ((price - prevClose) / prevClose) * 100;
  }

  const yahooDayChange = finiteNumber(quote?.regularMarketChangePercent);
  if (yahooDayChange != null) return yahooDayChange;

  if (sparkline.length >= 2) {
    const latest = sparkline[sparkline.length - 1]!;
    const prev = sparkline[sparkline.length - 2]!;
    if (prev !== 0) return ((latest - prev) / prev) * 100;
  }
  return null;
}

function toTickerItem(
  config: StockTickerSymbol,
  quote: Record<string, unknown> | undefined,
  sparkline: number[],
): StockTickerItem {
  const price = finiteNumber(quote?.regularMarketPrice);
  const changePercent = prevDayChangePercent(quote, sparkline);

  return {
    symbol: config.symbol,
    label: config.label,
    price,
    changePercent,
    changeBasis: "prev-day",
    asOf: null,
    sparkline,
  };
}

/**
 * 사건(뉴스) 발생 시점 근처 종가 — "이 사건 이후 종목이 얼마나 움직였나" 계산용 앵커 가격.
 * - 최근(~5일): 15분봉 ±45분
 * - 그 이전(개전일 등): 일봉으로 역추적 — Yahoo 15분봉은 수년 전을 못 줌
 */
export async function fetchPriceNearTimestamp(
  symbol: string,
  atMs: number,
): Promise<number | null> {
  const ageMs = Date.now() - atMs;
  const useDaily = ageMs > 5 * 24 * 60 * 60 * 1000;

  try {
    if (useDaily) {
      const period1 = new Date(atMs - 10 * 24 * 60 * 60 * 1000);
      const period2 = new Date(atMs + 10 * 24 * 60 * 60 * 1000);
      const chart = await yahooFinance.chart(symbol, {
        period1,
        period2,
        interval: "1d",
      });
      return closestBarClose(chart.quotes ?? [], atMs);
    }

    const period1 = new Date(atMs - 45 * 60 * 1000);
    const period2 = new Date(atMs + 45 * 60 * 1000);
    const chart = await yahooFinance.chart(symbol, { period1, period2, interval: "15m" });
    return closestBarClose(chart.quotes ?? [], atMs);
  } catch {
    // 15분 실패 시 일봉 폴백 (경계 구간)
    try {
      const period1 = new Date(atMs - 14 * 24 * 60 * 60 * 1000);
      const period2 = new Date(atMs + 14 * 24 * 60 * 60 * 1000);
      const chart = await yahooFinance.chart(symbol, {
        period1,
        period2,
        interval: "1d",
      });
      return closestBarClose(chart.quotes ?? [], atMs);
    } catch {
      return null;
    }
  }
}

function closestBarClose(
  quotes: Array<{ date?: Date | string | null; close?: number | null }>,
  atMs: number,
): number | null {
  let closest: number | null = null;
  let closestDiff = Infinity;
  for (const bar of quotes) {
    if (typeof bar.close !== "number" || !Number.isFinite(bar.close)) continue;
    const barDate =
      bar.date instanceof Date ? bar.date : new Date(bar.date as unknown as string);
    if (!Number.isFinite(barDate.getTime())) continue;
    const diff = Math.abs(barDate.getTime() - atMs);
    if (diff < closestDiff) {
      closest = bar.close;
      closestDiff = diff;
    }
  }
  return closest;
}

/**
 * 사건 반응 "판정"용 평소 변동폭 — 최근 30일 일간 수익률의 표준편차(%).
 *
 * 원시 변동률(-1.2% 등)만으로는 그게 이례적인지 평범한지 알 수 없다.
 * 이 값으로 나눠서 σ(시그마) 단위로 환산해야 "영향 있음/없음" 판정이 가능하다.
 * 하루 단위로 거의 안 변하므로 호출부에서 길게 캐시할 것.
 */
export async function fetchDailyVolatilityPercent(symbol: string): Promise<number | null> {
  try {
    const chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      interval: "1d",
    });
    const closes = (chart.quotes ?? [])
      .map((bar) => bar.close)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (closes.length < 10) return null;

    const returns: number[] = [];
    for (let i = 1; i < closes.length; i += 1) {
      const prev = closes[i - 1];
      if (!prev) continue;
      returns.push(((closes[i] - prev) / prev) * 100);
    }
    if (returns.length < 5) return null;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
    const stdev = Math.sqrt(variance);
    return Number.isFinite(stdev) && stdev > 0 ? stdev : null;
  } catch {
    return null;
  }
}

/** 미국 정규장 개장 여부 (대략) — 장 마감 중엔 "영향 없음"이 아니라 "판정 보류"여야 한다 */
export function isUsMarketLikelyOpen(at: Date = new Date()): boolean {
  // 미 동부시각으로 환산 (DST는 무시한 근사 — 판정 보류 여부만 가르면 되므로 충분)
  const etHour = (at.getUTCHours() - 5 + 24) % 24;
  const etDay = at.getUTCDay();
  if (etDay === 0 || etDay === 6) return false;
  // 09:30~16:00 ET
  if (etHour < 9 || etHour >= 16) return false;
  if (etHour === 9 && at.getUTCMinutes() < 30) return false;
  return true;
}

/** 일봉 종가 스파크라인 — 전일대비 추세와 같은 축 */
async function fetchDailySparkline(symbol: string): Promise<number[]> {
  try {
    const chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - DAILY_SPARK_DAYS * 24 * 60 * 60 * 1000),
      interval: "1d",
    });
    return (chart.quotes ?? [])
      .map((bar) => bar.close)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  } catch {
    return [];
  }
}

export async function fetchStockTickers(): Promise<StockTickerItem[]> {
  if (inflightLiveFetch) return inflightLiveFetch;

  inflightLiveFetch = withTimeout(fetchStockTickersLive(), LIVE_FETCH_TIMEOUT_MS, "yahoo-finance").finally(
    () => {
      inflightLiveFetch = null;
    },
  );

  return inflightLiveFetch;
}

/**
 * FININT 티커 — 등락은 전부 전일(직전 관측) 대비.
 *
 * - Yahoo: 현재가 + previousClose로 전일대비 %, 일봉 스파크라인.
 * - Databento 키가 있으면: CME 선물(CL/BZ/NG/…)은 Databento ohlcv-1d 우선.
 * - FRED 키가 있으면: 유가·가스·금·달러·환율·국채·연준금리를 FRED 일간 관측으로 덮어씀
 *   (Databento가 이미 채운 선물은 FRED가 덮지 않음).
 * - 키 없으면: Yahoo만 (FEDFUNDS 등 FRED 전용은 빈 칸).
 */
async function fetchStockTickersLive(): Promise<StockTickerItem[]> {
  const yahooItems = await fetchYahooTickers(STOCK_TICKER_SYMBOLS);
  const bySymbol = new Map(yahooItems.map((item) => [item.symbol, item]));

  if (hasDatabentoApiKey()) {
    const labelBySymbol = new Map(
      STOCK_TICKER_SYMBOLS.map((c) => [c.symbol, c.label] as const),
    );
    const dbTickers = await fetchDatabentoFuturesTickers(labelBySymbol);
    for (const [symbol, item] of dbTickers) {
      bySymbol.set(symbol, item);
    }
  }

  if (hasFredApiKey()) {
    const overlaySymbols = [
      ...STOCK_TICKER_SYMBOLS.filter((c) => symbolHasFredSeries(c.symbol)).map((c) => c.symbol),
      ...FRED_ONLY_TICKER_SYMBOLS.map((c) => c.symbol),
    ].filter((symbol) => !isDatabentoFuturesSymbol(symbol) || !bySymbol.get(symbol)?.asOf);
    const fredReadings = await fetchFredReadingsBySymbol(overlaySymbols);
    const allConfigs = [...STOCK_TICKER_SYMBOLS, ...FRED_ONLY_TICKER_SYMBOLS];
    for (const config of allConfigs) {
      if (isDatabentoFuturesSymbol(config.symbol) && bySymbol.get(config.symbol)?.asOf) {
        continue;
      }
      const fred = fredReadings.get(config.symbol);
      if (!fred || fred.price == null) continue;
      bySymbol.set(config.symbol, {
        symbol: config.symbol,
        label: config.label,
        price: fred.price,
        changePercent: fred.changePercent,
        changeBasis: "prev-day",
        asOf: fred.asOf,
        sparkline:
          fred.sparkline.length > 0
            ? fred.sparkline
            : (bySymbol.get(config.symbol)?.sparkline ?? []),
      });
    }
  }

  const ordered = [...STOCK_TICKER_SYMBOLS, ...FRED_ONLY_TICKER_SYMBOLS];
  return ordered.map(
    (config) =>
      bySymbol.get(config.symbol) ?? {
        symbol: config.symbol,
        label: config.label,
        price: null,
        changePercent: null,
        changeBasis: "prev-day" as const,
        asOf: null,
        sparkline: [],
      },
  );
}

/** Yahoo quote + 일봉 스파크라인 — 전일대비 등락 */
async function fetchYahooTickers(
  configs: StockTickerSymbol[],
): Promise<StockTickerItem[]> {
  if (configs.length === 0) return [];
  const symbols = configs.map((item) => item.symbol);
  const [quotes, sparklines] = await Promise.all([
    yahooFinance.quote(symbols),
    Promise.all(configs.map((config) => fetchDailySparkline(config.symbol))),
  ]);
  const quoteBySymbol = new Map<string, Record<string, unknown>>();

  for (const quote of normalizeQuoteList(quotes)) {
    const symbol = typeof quote.symbol === "string" ? quote.symbol : null;
    if (symbol) quoteBySymbol.set(symbol, quote);
  }

  return configs.map((config, index) =>
    toTickerItem(config, quoteBySymbol.get(config.symbol), sparklines[index] ?? []),
  );
}
