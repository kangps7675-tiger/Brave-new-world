import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { getSotwApiKey, sotwFetchJson, SOTW_ATTRIBUTION } from "@/lib/sotw";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankingsPayload = {
  indicator?: { id?: string; label?: string; category?: string };
  count?: number;
  data?: Array<{
    rank?: number;
    countryId?: string;
    country?: string;
    value?: number;
  }>;
};

/**
 * GET /api/world-stats/rankings?indicator=SP.POP.TOTL&limit=20
 * @see https://statisticsoftheworld.com/api-docs
 */
export async function GET(request: Request) {
  if (!getSotwApiKey()) {
    return NextResponse.json({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  }

  const { searchParams } = new URL(request.url);
  const indicator = searchParams.get("indicator")?.trim() || "NY.GDP.MKTP.CD";
  const limitRaw = Number(searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 25;

  try {
    const payload = await sotwFetchJson<RankingsPayload>(
      `/api/v1/rankings/${encodeURIComponent(indicator)}`,
      {
        searchParams: { limit: String(limit) },
        cacheKey: `sotw:rankings:${indicator}:${limit}`,
      },
    );

    return NextResponse.json({
      disabled: false,
      indicator: payload.indicator ?? { id: indicator },
      count: payload.count ?? payload.data?.length ?? 0,
      data: (payload.data ?? []).slice(0, limit),
      attribution: SOTW_ATTRIBUTION,
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  } catch (error) {
    return NextResponse.json(
      {
        disabled: false,
        error: publicErrorMessage(error, "rankings failed"),
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
