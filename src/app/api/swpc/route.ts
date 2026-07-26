import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { CDN_CACHE, NO_STORE_HEADERS, publicCacheHeaders } from "@/lib/httpCacheHeaders";
import { buildSwpcSnapshot, SWPC_ATTRIBUTION } from "@/lib/swpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SWPC scales update often; 10 min memory + CDN is enough for a status chip */
const TTL_MS = 10 * 60 * 1000;
const CACHE_KEY = "swpc:scales-kp";
const SWPC_CDN = publicCacheHeaders(CDN_CACHE.swpc);
const USER_AGENT = "BraveNewWorld/1.0 (+https://bravenew.world; NOAA SWPC status)";
const FETCH_TIMEOUT_MS = 12_000;

const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const SCALES_URL = "https://services.swpc.noaa.gov/products/noaa-scales.json";

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`SWPC HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadSnapshot() {
  const [kpFeed, scalesFeed] = await Promise.all([fetchJson(KP_URL), fetchJson(SCALES_URL)]);
  return buildSwpcSnapshot(kpFeed, scalesFeed);
}

export async function GET() {
  try {
    const { data, cached } = await cachedFetchJson(CACHE_KEY, TTL_MS, loadSnapshot);
    return NextResponse.json({ ...data, cached }, { headers: SWPC_CDN });
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        kp: null,
        kpObservedAt: null,
        scales: { R: 0, S: 0, G: 0 },
        band: "quiet",
        summaryKo: "우주기상 데이터를 불러오지 못했습니다",
        summaryEn: "Space weather unavailable",
        attribution: SWPC_ATTRIBUTION,
        error: error instanceof Error ? error.message : "SWPC fetch failed",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
