import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  fetchFreightIndices,
  stubFreightIndices,
  type FreightIndex,
} from "@/lib/freightIndicesFetch";
import { CDN_CACHE, NO_STORE_HEADERS, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type { FreightIndex };

/** Yahoo IP 차단 완화 — 증시 티커와 비슷한 메모리 캐시 */
const TTL_MS = 12 * 60 * 1000;
const FREIGHT_CDN = publicCacheHeaders(CDN_CACHE.stock);

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.freight);
  if (limited) return limited;

  try {
    if (isApiStubMode()) {
      return NextResponse.json(
        {
          indices: stubFreightIndices(),
          updatedAt: new Date().toISOString(),
          stub: true,
          attribution: "Stub mode — Yahoo Finance disabled",
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    const { data, cached } = await cachedFetchJson(
      "freight-indices-v2-yf2",
      TTL_MS,
      fetchFreightIndices,
    );

    return NextResponse.json(
      {
        indices: data,
        updatedAt: new Date().toISOString(),
        cached,
        attribution: "전일 대비 등락 · Yahoo Finance (via yahoo-finance2)",
      },
      { headers: FREIGHT_CDN },
    );
  } catch (error) {
    const message = publicErrorMessage(error, "freight-indices failed");
    logApiRoute("/api/freight-indices", "error", "fetch_failed", { message });
    return NextResponse.json(
      {
        indices: [],
        updatedAt: new Date().toISOString(),
        cached: false,
        error: message,
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
