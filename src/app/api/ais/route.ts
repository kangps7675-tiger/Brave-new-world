import { NextResponse } from "next/server";
import { apiStubResponse } from "@/lib/apiStub";
import { aisQuerySchema, parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  matchesAisClassFilter,
  parseAisClassFilter,
} from "@/lib/aisVesselClass";
import { distNmToBbox } from "@/lib/adsbWarmFetch";
import {
  readAisFromD1,
  readAisFromIngestWorker,
} from "@/lib/d1MaritimeAir";
import { demoAisVessels } from "@/lib/maritimeAirDemo";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AIS_CDN = publicCacheHeaders(CDN_CACHE.ais);

/**
 * GET /api/ais?max=&class=&provider=auto
 * GET /api/ais?lat=&lng=&dist=&max=  — 근접 densify (bbox 필터)
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("ais", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, aisQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, vessels: [] },
      { status: 400 },
    );
  }

  const { max, class: classRaw, lat, lng, dist } = parsed.data;
  const classFilter = parseAisClassFilter(classRaw ?? null);
  const category =
    classFilter === "military" || classFilter === "commercial"
      ? classFilter
      : "all";

  const worldwide = lat == null || lng == null;
  const bbox =
    !worldwide && lat != null && lng != null
      ? distNmToBbox(lat, lng, dist ?? 250)
      : null;

  const fromD1 = await readAisFromD1({
    category,
    max,
    west: bbox?.west,
    south: bbox?.south,
    east: bbox?.east,
    north: bbox?.north,
  });
  if (fromD1 && fromD1.count > 0) {
    const vessels = fromD1.vessels.filter((v) =>
      matchesAisClassFilter(v.category, classFilter, v.disguised),
    );
    return NextResponse.json(
      {
        receivedAt: fromD1.receivedAt,
        count: vessels.length,
        vessels: vessels.slice(0, max),
        source: "d1",
        provider: "d1",
        scope: worldwide ? "world" : "viewport",
        attribution: "MarineTraffic / AISstream (via Cloudflare D1 cron warm)",
      },
      { headers: AIS_CDN },
    );
  }

  const fromWorker = await readAisFromIngestWorker({ category, max });
  if (fromWorker && fromWorker.count > 0) {
    let vessels = fromWorker.vessels.filter((v) =>
      matchesAisClassFilter(v.category, classFilter, v.disguised),
    );
    if (bbox) {
      vessels = vessels.filter((v) => {
        if (v.lat < bbox.south || v.lat > bbox.north) return false;
        if (bbox.west <= bbox.east) return v.lng >= bbox.west && v.lng <= bbox.east;
        return v.lng >= bbox.west || v.lng <= bbox.east;
      });
    }
    return NextResponse.json(
      {
        receivedAt: fromWorker.receivedAt,
        count: vessels.length,
        vessels: vessels.slice(0, max),
        source: "ingest-worker",
        provider: "d1",
        scope: worldwide ? "world" : "viewport",
        attribution: "MarineTraffic / AISstream (via ingest worker)",
      },
      { headers: AIS_CDN },
    );
  }

  const demo = demoAisVessels(
    classFilter === "disguised" ? "all" : classFilter === "military" || classFilter === "commercial" ? classFilter : "all",
  ).filter((v) => matchesAisClassFilter(v.category, classFilter, v.disguised));

  return NextResponse.json(
    {
      receivedAt: new Date().toISOString(),
      count: demo.length,
      vessels: demo.slice(0, max),
      source: "demo",
      provider: "demo",
      demo: true,
      scope: worldwide ? "world" : "viewport",
      attribution: "Demo AIS seed (no D1 snapshot)",
    },
    { headers: AIS_CDN },
  );
}
