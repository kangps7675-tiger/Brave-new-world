import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { isApiStubMode } from "@/lib/apiStubMode";
import { fetchCountryEconomicRisk } from "@/lib/worldBank";
import { CDN_CACHE, NO_STORE_HEADERS, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** World Bank는 연간 지표 — 24h 서버 캐시로 충분 */
const TTL_MS = 24 * 60 * 60 * 1000;
const WORLD_CDN = publicCacheHeaders(CDN_CACHE.worldStats);

/** GET /api/world-bank/country?iso=KOR — 국가 경제 위험도 스냅샷 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iso = searchParams.get("iso")?.trim().toUpperCase();

  if (!iso || !/^[A-Z]{3}$/.test(iso)) {
    return NextResponse.json(
      { error: "iso (ISO A3) query required" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (isApiStubMode()) {
    return NextResponse.json(
      {
        stub: true,
        iso3: iso,
        riskScore: null,
        band: "unknown",
        indicators: [],
        attribution: "Stub mode — World Bank disabled",
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  try {
    const { data, cached } = await cachedFetchJson(`world-bank-country-${iso}`, TTL_MS, () =>
      fetchCountryEconomicRisk(iso),
    );
    return NextResponse.json({ ...data, cached }, { headers: WORLD_CDN });
  } catch (error) {
    return NextResponse.json(
      {
        iso3: iso,
        riskScore: null,
        band: "unknown",
        indicators: [],
        error: error instanceof Error ? error.message : "world-bank failed",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
