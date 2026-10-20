import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import { isApiStubMode } from "@/lib/apiStubMode";
import { hasDatabentoApiKey } from "@/lib/databento/env";
import {
  FUTURES_LIVE_CHANGE_WINDOW_SEC,
} from "@/lib/databento/futuresLiveConstants";
import {
  fetchFuturesLiveTickersCached,
  type FuturesLiveTicker,
} from "@/lib/databento/fetchFuturesLive";
import { DATABENTO_FUTURES_YAHOO_SYMBOLS } from "@/lib/databento/symbolMap";
import { tickerDisplayName } from "@/lib/stockTickers";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stubTickers(): FuturesLiveTicker[] {
  return DATABENTO_FUTURES_YAHOO_SYMBOLS.map((symbol) => ({
    symbol,
    label: tickerDisplayName(symbol, "en"),
    price: null,
    changePercent: null,
    changeWindowSec: FUTURES_LIVE_CHANGE_WINDOW_SEC,
    asOf: null,
  }));
}

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.stockFuturesLive);
  if (limited) return limited;

  try {
    if (isApiStubMode() || !hasDatabentoApiKey()) {
      return NextResponse.json(
        {
          receivedAt: new Date().toISOString(),
          tickers: stubTickers(),
          changeWindowSec: FUTURES_LIVE_CHANGE_WINDOW_SEC,
          attribution: isApiStubMode()
            ? "Stub mode — Databento disabled"
            : "Databento key missing",
          available: false,
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    const tickers = await fetchFuturesLiveTickersCached();
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        tickers,
        changeWindowSec: FUTURES_LIVE_CHANGE_WINDOW_SEC,
        attribution: "Databento (CME · ohlcv-1s)",
        available: true,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const message = publicErrorMessage(error, "futures-live failed");
    logApiRoute("/api/stock-tickers/futures-live", "error", "fetch_failed", {
      message,
    });
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        tickers: [],
        error: message,
        available: false,
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
