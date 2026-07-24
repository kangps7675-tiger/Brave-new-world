import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { isApiStubMode } from "@/lib/apiStubMode";
import { fetchStockTickers, stubStockTickers } from "@/lib/stockTickersFetch";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Yahoo Finance IP 차단 방지 — 10분 서버 메모리 캐시 */
const TTL_MS = 10 * 60 * 1000;
const STOCK_CDN = publicCacheHeaders(CDN_CACHE.stock);

export async function GET() {
  try {
    if (isApiStubMode()) {
      return NextResponse.json(
        {
          receivedAt: new Date().toISOString(),
          cached: false,
          stub: true,
          tickers: stubStockTickers(),
          attribution: "Stub mode — Yahoo Finance disabled",
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    const { data, cached } = await cachedFetchJson("stock-tickers-v4", TTL_MS, fetchStockTickers);
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached,
        tickers: data,
        attribution: "Yahoo Finance (via yahoo-finance2)",
      },
      { headers: STOCK_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached: false,
        tickers: [],
        error: error instanceof Error ? error.message : "stock-tickers failed",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
