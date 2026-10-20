import { NextResponse } from "next/server";
import type { StaticPoint } from "@/data/geoTypes";
import { cachedFetchJson } from "@/lib/apiCache";
import { loadLocalStaticPoints } from "@/lib/localLayerData";
import { apiStubResponse } from "@/lib/apiStub";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 4 * 60 * 60 * 1000;

async function loadEconomicCenters(): Promise<StaticPoint[]> {
  const snapshot = await loadLocalStaticPoints("economic-centers.json");
  if (snapshot.length > 0) return snapshot;
  return [];
}

export async function GET(request: Request) {
  const stub = apiStubResponse("economic-centers", request);
  if (stub) return stub;

  const { data, cached } = await cachedFetchJson("economic-centers", TTL_MS, loadEconomicCenters);
  return NextResponse.json({
    receivedAt: new Date().toISOString(),
    cached,
    count: data.length,
    points: data,
    attribution: "World Bank Open Data context · local build",
  }, { headers: publicCacheHeaders(CDN_CACHE.staticLayer) });
}
