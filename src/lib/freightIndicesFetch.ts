import YahooFinance from "yahoo-finance2";

export type FreightIndex = {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  updatedAt: string;
};

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const LIVE_FETCH_TIMEOUT_MS = 18_000;

export const SHIPPING_ASSETS = [
  { symbol: "BDRY", name: "건화물 운임 ETF", unit: "USD" },
  { symbol: "ZIM", name: "ZIM 컨테이너 해운", unit: "USD" },
  { symbol: "SBLK", name: "스타벌크 벌크선", unit: "USD" },
] as const;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

/** stub — Yahoo 호출 없이 UI 자리만 유지 */
export function stubFreightIndices(): FreightIndex[] {
  const now = new Date().toISOString();
  return SHIPPING_ASSETS.map((asset) => ({
    ...asset,
    value: 0,
    change: 0,
    changePercent: 0,
    updatedAt: now,
  }));
}

/**
 * 해운 프록시(BDRY/ZIM/SBLK) — yahoo-finance2 quote.
 * 구 `/api/freight-indices`의 raw chart fetch는 Yahoo 봇 차단에
 * "Failed to fetch"로 자주 죽었다. 증시 티커와 같은 클라이언트를 쓴다.
 */
export async function fetchFreightIndices(): Promise<FreightIndex[]> {
  return withTimeout(fetchFreightIndicesLive(), LIVE_FETCH_TIMEOUT_MS, "freight-yahoo");
}

async function fetchFreightIndicesLive(): Promise<FreightIndex[]> {
  const symbols = SHIPPING_ASSETS.map((a) => a.symbol);
  const quotes = normalizeQuoteList(await yahooFinance.quote([...symbols]));
  const bySymbol = new Map<string, Record<string, unknown>>();
  for (const quote of quotes) {
    const symbol = typeof quote.symbol === "string" ? quote.symbol : null;
    if (symbol) bySymbol.set(symbol, quote);
  }

  const out: FreightIndex[] = [];
  for (const asset of SHIPPING_ASSETS) {
    const quote = bySymbol.get(asset.symbol);
    const value = finiteNumber(quote?.regularMarketPrice);
    const prevClose = finiteNumber(quote?.regularMarketPreviousClose);
    const change =
      value != null && prevClose != null
        ? value - prevClose
        : finiteNumber(quote?.regularMarketChange);
    const changePercent =
      value != null && prevClose != null && prevClose !== 0
        ? ((value - prevClose) / prevClose) * 100
        : finiteNumber(quote?.regularMarketChangePercent);

    if (value == null || change == null || changePercent == null) {
      throw new Error(`Yahoo ${asset.symbol}: quote incomplete`);
    }

    const asOf = finiteNumber(quote?.regularMarketTime);
    out.push({
      ...asset,
      value: round(value),
      change: round(change),
      changePercent: round(changePercent),
      updatedAt:
        asOf != null ? new Date(asOf * 1000).toISOString() : new Date().toISOString(),
    });
  }
  return out;
}
