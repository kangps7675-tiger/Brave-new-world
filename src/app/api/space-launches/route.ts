import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import type { StaticPoint } from "@/data/geoTypes";
import { cachedFetchJson } from "@/lib/apiCache";
import { apiStubResponse } from "@/lib/apiStub";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 60 * 60 * 1000;

type Ll2Launch = {
  id?: string;
  name?: string;
  net?: string;
  status?: { name?: string };
  pad?: {
    name?: string;
    latitude?: string | number;
    longitude?: string | number;
    location?: { name?: string; country_code?: string };
  };
  rocket?: { configuration?: { name?: string } };
};

function toPoint(item: Ll2Launch, index: number): StaticPoint | null {
  const lat = Number(item.pad?.latitude);
  const lng = Number(item.pad?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: `launch-${item.id || index}`,
    kind: "space-launch",
    name: item.name || item.pad?.name || `Launch ${index}`,
    lat,
    lng,
    tier: 1,
    meta: {
      pad: item.pad?.name || null,
      location: item.pad?.location?.name || null,
      country: item.pad?.location?.country_code || null,
      status: item.status?.name || null,
      net: item.net || null,
      rocket: item.rocket?.configuration?.name || null,
      source: "thespacedevs-ll2",
    },
  };
}

async function loadLaunches(): Promise<StaticPoint[]> {
  const url =
    "https://ll.thespacedevs.com/2.3.0/launch/previous/?limit=40&mode=detailed";
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`LL2 HTTP ${response.status}`);
  const payload = (await response.json()) as { results?: Ll2Launch[] };
  const points: StaticPoint[] = [];
  for (const [index, item] of (payload.results || []).entries()) {
    const point = toPoint(item, index);
    if (point) points.push(point);
  }
  return points;
}

export async function GET(request: Request) {
  const stub = apiStubResponse("space-launches", request);
  if (stub) return stub;

  try {
    const { data, cached } = await cachedFetchJson("space-launches", TTL_MS, loadLaunches);
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      count: data.length,
      points: data,
      attribution: "The Space Devs",
    }, { headers: publicCacheHeaders(CDN_CACHE.satellites) });
  } catch (error) {
    return NextResponse.json(
      {
        points: [],
        error: publicErrorMessage(error, "space launches fetch failed"),
      },
      { status: 502 },
    );
  }
}
