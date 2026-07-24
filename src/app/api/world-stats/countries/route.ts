import { NextResponse } from "next/server";
import { fetchSotwCountryCard, getSotwApiKey, SOTW_ATTRIBUTION } from "@/lib/sotw";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORLD_CDN = publicCacheHeaders(CDN_CACHE.worldStats);

/**
 * GET /api/world-stats/countries?country=Iran|USA|…
 * Proxies Statistics of the World with server-side X-API-Key.
 * @see https://statisticsoftheworld.com/api-docs
 */
export async function GET(request: Request) {
  if (!getSotwApiKey()) {
    return NextResponse.json({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
    });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  if (!country) {
    return NextResponse.json({ error: "country query required" }, { status: 400 });
  }

  try {
    const card = await fetchSotwCountryCard(country);
    return NextResponse.json(card, { headers: WORLD_CDN });
  } catch (error) {
    return NextResponse.json(
      {
        disabled: false,
        name: country,
        error: error instanceof Error ? error.message : "world-stats failed",
        gdpUsd: null,
        gdpPerCapitaUsd: null,
        tradePctGdp: null,
        population: null,
        milSpendPctGdp: null,
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
