import { NextResponse } from "next/server";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import { getSotwApiKey, SOTW_ATTRIBUTION } from "@/lib/sotw";
import { fetchSotwMacroDeep } from "@/lib/sotwMacro";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORLD_CDN = publicCacheHeaders(CDN_CACHE.worldStats);

/**
 * GET /api/world-stats/macro?country=Iran|USA|…
 * Deep macro: levels + inflation/growth history shock + peers + narrative paragraphs.
 */
export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.worldStats);
  if (limited) return limited;

  if (!getSotwApiKey()) {
    return NextResponse.json({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
    });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  if (!country || country.length > 80) {
    return NextResponse.json({ error: "country query required" }, { status: 400 });
  }

  try {
    const macro = await fetchSotwMacroDeep(country);
    return NextResponse.json(macro, { headers: WORLD_CDN });
  } catch (error) {
    const message = error instanceof Error ? error.message : "macro failed";
    logApiRoute("/api/world-stats/macro", "error", "fetch_failed", {
      country,
      message,
    });
    return NextResponse.json(
      {
        disabled: false,
        name: country,
        error: message,
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
