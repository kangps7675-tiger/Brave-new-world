import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import { isApiStubMode } from "@/lib/apiStubMode";
import { hasFredApiKey } from "@/lib/fred";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";
import { SOVEREIGN_RATES_ATTRIBUTION } from "@/lib/sovereignRates";
import { fetchSovereignRates, stubSovereignRates } from "@/lib/sovereignRatesFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 20 * 60_000;
const RATES_CDN = publicCacheHeaders(CDN_CACHE.sovereignRates);

/**
 * GET /api/sovereign-rates
 * 주요국 기준금리·국채금리(숫자) + 장단기 금리차 시계열.
 * FRED_API_KEY 필요.
 */
export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.sovereignRates);
  if (limited) return limited;

  try {
    if (isApiStubMode()) {
      return NextResponse.json(
        {
          receivedAt: new Date().toISOString(),
          cached: false,
          stub: true,
          countries: stubSovereignRates(),
          attribution: "Stub mode — FRED disabled",
          needsFredKey: false,
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    if (!hasFredApiKey()) {
      return NextResponse.json(
        {
          receivedAt: new Date().toISOString(),
          cached: false,
          countries: [],
          needsFredKey: true,
          error: "FRED_API_KEY 가 없어 주요국 금리를 불러올 수 없습니다.",
          attribution: SOVEREIGN_RATES_ATTRIBUTION,
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    const { data, cached } = await cachedFetchJson(
      "sovereign-rates-v1",
      TTL_MS,
      fetchSovereignRates,
    );

    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached,
        countries: data,
        needsFredKey: false,
        attribution: SOVEREIGN_RATES_ATTRIBUTION,
      },
      { headers: RATES_CDN },
    );
  } catch (error) {
    const message = publicErrorMessage(error, "sovereign-rates failed");
    logApiRoute("/api/sovereign-rates", "error", "fetch_failed", { message });
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached: false,
        countries: [],
        error: message,
        attribution: SOVEREIGN_RATES_ATTRIBUTION,
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
