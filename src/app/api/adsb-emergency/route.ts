import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import {
  ADSB_EMERGENCY_ATTRIBUTION,
  EMERGENCY_SQUAWKS,
  normalizeSquawk,
} from "@/lib/adsbEmergency";
import {
  extractAircraftList,
  normalizeAdsbAircraft,
  readAdsbJsonBody,
  type AdsbRawAircraft,
  type TrackedAircraft,
} from "@/lib/adsbClient";
import { CDN_CACHE, NO_STORE_HEADERS, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 30_000;
const CACHE_KEY = "adsb-emergency:sqk";
const ADSB_CDN = publicCacheHeaders(CDN_CACHE.adsb);
const USER_AGENT = "BraveNewWorld/1.0 (+https://bravenew.world; ADS-B emergency squawk)";
const FETCH_TIMEOUT_MS = 12_000;

async function fetchSquawk(sqk: string): Promise<TrackedAircraft[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.adsb.lol/v2/sqk/${encodeURIComponent(sqk)}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await readAdsbJsonBody(res);
    if (!json || typeof json !== "object") return [];
    const list = extractAircraftList(json as { ac?: AdsbRawAircraft[]; aircraft?: AdsbRawAircraft[] });
    const out: TrackedAircraft[] = [];
    for (const raw of list) {
      const ac = normalizeAdsbAircraft(raw);
      if (!ac) continue;
      // Force squawk label if feed omitted it
      if (!normalizeSquawk(ac.squawk)) {
        ac.squawk = sqk;
      }
      if (!ac.emergency || ac.emergency === "none") {
        ac.emergency = sqk === "7500" ? "hijack" : sqk === "7600" ? "radio" : "general";
      }
      out.push(ac);
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function loadEmergencyAircraft(): Promise<{
  aircraft: TrackedAircraft[];
  bySquawk: Record<string, number>;
}> {
  const byHex = new Map<string, TrackedAircraft>();
  const bySquawk: Record<string, number> = { "7700": 0, "7600": 0, "7500": 0 };
  const batches = await Promise.all(EMERGENCY_SQUAWKS.map((sqk) => fetchSquawk(sqk)));
  EMERGENCY_SQUAWKS.forEach((sqk, i) => {
    for (const ac of batches[i] ?? []) {
      bySquawk[sqk] = (bySquawk[sqk] ?? 0) + 1;
      if (!byHex.has(ac.hex)) byHex.set(ac.hex, ac);
    }
  });
  return { aircraft: Array.from(byHex.values()), bySquawk };
}

export async function GET() {
  try {
    const { data, cached } = await cachedFetchJson(CACHE_KEY, TTL_MS, loadEmergencyAircraft);
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        cached,
        count: data.aircraft.length,
        bySquawk: data.bySquawk,
        aircraft: data.aircraft,
        attribution: ADSB_EMERGENCY_ATTRIBUTION,
      },
      { headers: ADSB_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        count: 0,
        bySquawk: { "7700": 0, "7600": 0, "7500": 0 },
        aircraft: [],
        attribution: ADSB_EMERGENCY_ATTRIBUTION,
        error: publicErrorMessage(error, "ADS-B emergency fetch failed"),
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
