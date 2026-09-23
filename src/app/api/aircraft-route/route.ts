import { NextRequest, NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 항공기 클릭 상세 카드용 목적지(항로) 조회.
 * ADS-B 신호 자체에는 목적지가 없어서, 콜사인 기반 route-lookup을 쓴다
 * (adsb.lol의 routeset API — tar1090류 프런트가 같은 방식으로 씀). 콜사인이
 * 등록 안 된 군용기·일반항공 등은 결과가 없을 수 있음 — best-effort.
 */

const TTL_MS = 6 * 60 * 60 * 1000; // 노선은 하루 몇 번 안 바뀜 — 6h 캐시
const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "BraveNewWorld/1.0 (+https://bravenew.world; aircraft route lookup)";
const ROUTESET_URL = "https://api.adsb.lol/api/0/routeset";

export type AircraftRouteResult = {
  originIata: string | null;
  originName: string | null;
  destIata: string | null;
  destName: string | null;
};

const EMPTY: AircraftRouteResult = {
  originIata: null,
  originName: null,
  destIata: null,
  destName: null,
};

type RoutesetAirport = {
  icao?: string;
  iata?: string;
  name?: string;
};

type RoutesetPlane = {
  _airport_codes_iata?: string;
  _airports?: RoutesetAirport[];
};

function parseRouteset(plane: RoutesetPlane | undefined): AircraftRouteResult {
  if (!plane) return EMPTY;
  const airports = Array.isArray(plane._airports) ? plane._airports : [];
  if (airports.length >= 2) {
    const [origin, dest] = airports;
    return {
      originIata: origin?.iata ?? null,
      originName: origin?.name ?? null,
      destIata: dest?.iata ?? null,
      destName: dest?.name ?? null,
    };
  }
  // _airports가 없으면 "ICN-LAX" 형태 코드만이라도 사용
  const codes = plane._airport_codes_iata;
  if (codes && codes.includes("-")) {
    const [originIata, destIata] = codes.split("-");
    return {
      originIata: originIata || null,
      originName: null,
      destIata: destIata || null,
      destName: null,
    };
  }
  return EMPTY;
}

async function fetchRoute(callsign: string, lat: number, lng: number): Promise<AircraftRouteResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(ROUTESET_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ planes: [{ callsign, lat, lng }] }),
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    const json = (await res.json()) as RoutesetPlane[] | RoutesetPlane;
    const plane = Array.isArray(json) ? json[0] : json;
    return parseRouteset(plane);
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callsign = searchParams.get("callsign")?.trim().toUpperCase() || "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!callsign || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(EMPTY, { headers: NO_STORE_HEADERS });
  }

  const cacheKey = `aircraft-route:${callsign}`;
  const { data } = await cachedFetchJson(cacheKey, TTL_MS, () => fetchRoute(callsign, lat, lng));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=21600" },
  });
}
