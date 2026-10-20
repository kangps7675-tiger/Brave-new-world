import { NextResponse } from "next/server";
import type { StaticPoint } from "@/data/geoTypes";
import { cachedFetchJson } from "@/lib/apiCache";
import { loadLocalStaticPoints } from "@/lib/localLayerData";
import { apiStubResponse } from "@/lib/apiStub";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 24 * 60 * 60 * 1000;

async function loadSanctions(): Promise<{ points: StaticPoint[]; lists: string[] }> {
  const points = await loadLocalStaticPoints("sanctions-entities.json");
  return {
    points,
    lists: ["OFAC SDN", "UN Consolidated"],
  };
}

export async function GET(request: Request) {
  const stub = apiStubResponse("sanctions-entities", request);
  if (stub) return stub;

  const { data, cached } = await cachedFetchJson("sanctions-entities", TTL_MS, loadSanctions);
  return NextResponse.json({
    receivedAt: new Date().toISOString(),
    cached,
    count: data.points.length,
    points: data.points,
    lists: data.lists,
    attribution: "US Treasury OFAC / UN Security Council · local build",
  }, { headers: publicCacheHeaders(CDN_CACHE.staticLayer) });
}
