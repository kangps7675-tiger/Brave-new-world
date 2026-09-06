import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import {
  getSotwApiKey,
  resolveSotwCountryIso,
  sotwFetchJson,
  SOTW_ATTRIBUTION,
} from "@/lib/sotw";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryPayload = {
  indicator?: { id?: string; label?: string };
  country?: string;
  data?: Array<{ year?: number | string; value?: number | null }>;
};

/**
 * GET /api/world-stats/history?indicator=NY.GDP.MKTP.CD&country=USA
 * Uses v2 history when available; falls back to v1 path form.
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
  const countryHint = searchParams.get("country")?.trim();
  if (!countryHint) {
    return NextResponse.json({ error: "country query required" }, { status: 400 });
  }

  const iso = resolveSotwCountryIso(countryHint);
  if (!iso) {
    return NextResponse.json({ error: "unmapped country hint", country: countryHint }, { status: 400 });
  }

  try {
    let payload: HistoryPayload;
    try {
      payload = await sotwFetchJson<HistoryPayload>("/api/v2/history", {
        searchParams: { indicator, country: iso },
        cacheKey: `sotw:history:v2:${indicator}:${iso}`,
      });
    } catch {
      payload = await sotwFetchJson<HistoryPayload>(
        `/api/v1/history/${encodeURIComponent(indicator)}/${encodeURIComponent(iso)}`,
        { cacheKey: `sotw:history:v1:${indicator}:${iso}` },
      );
    }

    return NextResponse.json({
      disabled: false,
      indicator: payload.indicator ?? { id: indicator },
      country: payload.country ?? iso,
      data: payload.data ?? [],
      attribution: SOTW_ATTRIBUTION,
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  } catch (error) {
    return NextResponse.json(
      {
        disabled: false,
        error: publicErrorMessage(error, "history failed"),
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
