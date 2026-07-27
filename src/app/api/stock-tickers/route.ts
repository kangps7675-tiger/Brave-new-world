import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { isApiStubMode } from "@/lib/apiStubMode";
import { fetchStockTickers, stubStockTickers } from "@/lib/stockTickersFetch";
import { FRED_ATTRIBUTION, hasFredApiKey } from "@/lib/fred";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 전일대비 등락 기준 — 서버 메모리 캐시 (Yahoo IP 차단 완화) */
const TTL_MS = 12 * 60 * 1000;
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
          changeBasis: "prev-day",
          attribution: "Stub mode — Yahoo Finance disabled",
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    const { data, cached } = await cachedFetchJson("stock-tickers-v8-prevday", TTL_MS, fetchStockTickers);
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached,
        tickers: data,
        changeBasis: "prev-day",
        attribution: hasFredApiKey()
          ? `전일 대비 등락 · Yahoo Finance · ${FRED_ATTRIBUTION} (원자재·달러)`
          : "전일 대비 등락 · Yahoo Finance (via yahoo-finance2)",
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
