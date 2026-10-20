import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { CDN_CACHE, NO_STORE_HEADERS, publicCacheHeaders } from "@/lib/httpCacheHeaders";
import {
  parseSafecastMeasurements,
  pickNearestMeasurement,
  readingFromMeasurement,
  SAFECAST_ATTRIBUTION,
  SAFECAST_PRIORITY_SITES,
  type SafecastSnapshot,
} from "@/lib/safecast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Safecast near-site snapshots — 1h memory + CDN (not second-level) */
const TTL_MS = 60 * 60 * 1000;
const CACHE_KEY = "safecast:priority-sites";
const SAFECAST_CDN = publicCacheHeaders(CDN_CACHE.safecast);
const USER_AGENT = "BraveNewWorld/1.0 (+https://bravenew.world; Safecast radiation near nuclear sites)";
const FETCH_TIMEOUT_MS = 14_000;
const DISTANCE_M = 80_000;

async function fetchNear(lat: number, lng: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      distance: String(DISTANCE_M),
      latitude: String(lat),
      longitude: String(lng),
    });
    const res = await fetch(`https://api.safecast.org/measurements.json?${params}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function loadSnapshot(): Promise<SafecastSnapshot> {
  const readings = await Promise.all(
    SAFECAST_PRIORITY_SITES.map(async (site) => {
      const json = await fetchNear(site.lat, site.lng);
      const rows = parseSafecastMeasurements(json);
      const hit = pickNearestMeasurement(site, rows);
      return readingFromMeasurement(site, hit);
    }),
  );
  return {
    fetchedAt: new Date().toISOString(),
    readings,
    attribution: SAFECAST_ATTRIBUTION,
  };
}

export async function GET() {
  try {
    const { data, cached } = await cachedFetchJson(CACHE_KEY, TTL_MS, loadSnapshot);
    return NextResponse.json(
      {
        ...data,
        cached,
        count: data.readings.filter((r) => r.usvPerH != null).length,
      },
      { headers: SAFECAST_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        readings: [],
        count: 0,
        attribution: SAFECAST_ATTRIBUTION,
        error: publicErrorMessage(error, "Safecast fetch failed"),
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
