import { NextResponse } from "next/server";
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
    const macro = await fetchSotwMacroDeep(country);
    return NextResponse.json(macro, { headers: WORLD_CDN });
  } catch (error) {
    return NextResponse.json(
      {
        disabled: false,
        name: country,
        error: error instanceof Error ? error.message : "macro failed",
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
