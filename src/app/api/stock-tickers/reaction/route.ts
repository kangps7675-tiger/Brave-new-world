import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { isApiStubMode } from "@/lib/apiStubMode";
import { fetchPriceNearTimestamp, fetchStockTickers } from "@/lib/stockTickersFetch";
import { theaterAssetSymbols, type TheaterMarketFilter } from "@/lib/theaterAssets";
import type { MarketReactionItem } from "@/lib/stockTickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 전장당 심볼이 6~7개라 전부 조회하면 Yahoo 호출이 늘어남 — 핵심 상위 N개만 */
const MAX_SYMBOLS = 3;
/** 앵커 가격은 시간이 지나도 바뀌지 않는 과거 값이라 넉넉하게 캐시 */
const ANCHOR_TTL_MS = 6 * 60 * 60 * 1000;
const LIVE_TTL_MS = 10 * 60 * 1000;
/** 15분 버킷으로 반올림 — 같은 사건을 여러 유저·여러 번 열어도 캐시가 재사용됨 */
const BUCKET_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const theater = (searchParams.get("theater") || "all") as TheaterMarketFilter;
  const ageMinutesRaw = Number(searchParams.get("ageMinutes"));
  const ageMinutes = Number.isFinite(ageMinutesRaw) ? Math.max(0, ageMinutesRaw) : 0;

  if (isApiStubMode()) {
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      stub: true,
      items: [] as MarketReactionItem[],
    });
  }

  try {
    const symbols = theaterAssetSymbols(theater).slice(0, MAX_SYMBOLS);
    const atMs = Date.now() - ageMinutes * 60_000;
    const bucketMs = Math.round(atMs / BUCKET_MS) * BUCKET_MS;

    const [{ data: liveTickers }, priceAtEntries] = await Promise.all([
      cachedFetchJson("stock-tickers-v4", LIVE_TTL_MS, fetchStockTickers),
      Promise.all(
        symbols.map(async (symbol) => {
          const { data: priceAt } = await cachedFetchJson(
            `stock-price-at-${symbol}-${bucketMs}`,
            ANCHOR_TTL_MS,
            () => fetchPriceNearTimestamp(symbol, bucketMs),
          );
          return [symbol, priceAt] as const;
        }),
      ),
    ]);

    const liveBySymbol = new Map(liveTickers.map((t) => [t.symbol, t.price]));
    const priceAtBySymbol = new Map(priceAtEntries);

    const items: MarketReactionItem[] = symbols.map((symbol) => {
      const priceAt = priceAtBySymbol.get(symbol) ?? null;
      const priceNow = liveBySymbol.get(symbol) ?? null;
      const changePercentSinceEvent =
        priceAt != null && priceNow != null && priceAt !== 0
          ? ((priceNow - priceAt) / priceAt) * 100
          : null;
      return { symbol, priceAt, priceNow, changePercentSinceEvent };
    });

    return NextResponse.json({ receivedAt: new Date().toISOString(), items });
  } catch (error) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        items: [] as MarketReactionItem[],
        error: error instanceof Error ? error.message : "market-reaction failed",
      },
      { status: 502 },
    );
  }
}
