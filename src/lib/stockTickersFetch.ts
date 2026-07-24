import YahooFinance from "yahoo-finance2";
import {
  STOCK_TICKER_SYMBOLS,
  type StockTickerItem,
  type StockTickerSymbol,
} from "@/lib/stockTickers";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const LIVE_FETCH_TIMEOUT_MS = 20_000;

let inflightLiveFetch: Promise<StockTickerItem[]> | null = null;

/** stub 모드용 — Yahoo 호출 없이 UI 레이아웃만 유지 */
export function stubStockTickers(): StockTickerItem[] {
  return STOCK_TICKER_SYMBOLS.map((config) => ({
    symbol: config.symbol,
    label: config.label,
    price: null,
    changePercent: null,
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

function toTickerItem(
  config: StockTickerSymbol,
  quote: Record<string, unknown> | undefined,
  sparkline: number[],
): StockTickerItem {
  const priceRaw = quote?.regularMarketPrice;
  const changeRaw = quote?.regularMarketChangePercent;
  const price = typeof priceRaw === "number" && Number.isFinite(priceRaw) ? priceRaw : null;
  const changePercent =
    typeof changeRaw === "number" && Number.isFinite(changeRaw) ? changeRaw : null;

  return {
    symbol: config.symbol,
    label: config.label,
    price,
    changePercent,
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

async function fetchSparkline(symbol: string): Promise<number[]> {
  try {
    const chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      interval: "15m",
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

async function fetchStockTickersLive(): Promise<StockTickerItem[]> {
  const symbols = STOCK_TICKER_SYMBOLS.map((item) => item.symbol);
  const [quotes, sparklines] = await Promise.all([
    yahooFinance.quote(symbols),
    Promise.all(STOCK_TICKER_SYMBOLS.map((config) => fetchSparkline(config.symbol))),
  ]);
  const quoteBySymbol = new Map<string, Record<string, unknown>>();

  for (const quote of normalizeQuoteList(quotes)) {
    const symbol = typeof quote.symbol === "string" ? quote.symbol : null;
    if (symbol) quoteBySymbol.set(symbol, quote);
  }

  return STOCK_TICKER_SYMBOLS.map((config, index) =>
    toTickerItem(config, quoteBySymbol.get(config.symbol), sparklines[index] ?? []),
  );
}
