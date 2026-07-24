import { NextResponse } from "next/server";
import { apiStubResponse } from "@/lib/apiStub";
import {
  adsbAuthHeaders,
  civilianTrafficUrl,
  extractAircraftList,
  getAdsbApiKey,
  normalizeAdsbAircraft,
  readAdsbJsonBody,
  type TrackedAircraft,
} from "@/lib/adsbClient";
import { distNmToBbox } from "@/lib/adsbWarmFetch";
import { readAdsbFromD1, readAdsbFromIngestWorker } from "@/lib/d1MaritimeAir";
import { demoCivAircraft } from "@/lib/maritimeAirDemo";
import { adsbTrafficQuerySchema, parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADSB_CDN = publicCacheHeaders(CDN_CACHE.adsb);

/**
 * 지경학(민간 항공 운항) — D1 → 라이브 → 데모.
 * GET /api/adsb-traffic?lat=&lng=&dist=&max=
 */
export async function GET(request: Request) {
  const apiKey = getAdsbApiKey();
  if (!apiKey) {
    const stub = apiStubResponse("adsb-traffic", request);
    if (stub) return stub;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, adsbTrafficQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, aircraft: [] },
      { status: 400 },
    );
  }
  const { lat, lng, dist, max, live } = parsed.data;
  const preferLive = Boolean(live);
  const bbox = distNmToBbox(lat, lng, dist);

  if (!preferLive) {
    const fromD1 = await readAdsbFromD1({
      mode: "civ",
      max,
      ...bbox,
    });
    if (fromD1 && fromD1.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromD1.receivedAt,
          count: fromD1.count,
          aircraft: fromD1.aircraft,
          attribution: "ADS-B civilian hubs (via Cloudflare D1 cron warm)",
          source: "d1",
          provider: "d1",
          mode: "civilian",
          excluded: "military (dbFlags & 1)",
          cached: true,
          bbox,
        },
        { headers: ADSB_CDN },
      );
    }
    const fromWorker = await readAdsbFromIngestWorker({
      mode: "civ",
      max,
      ...bbox,
    });
    if (fromWorker && fromWorker.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromWorker.receivedAt,
          count: fromWorker.count,
          aircraft: fromWorker.aircraft,
          attribution: "ADS-B civ (via Cloudflare cron worker)",
          source: "ingest-worker",
          provider: "ingest-worker",
          mode: "civilian",
          excluded: "military (dbFlags & 1)",
          cached: true,
          bbox,
        },
        { headers: ADSB_CDN },
      );
    }
  }

  const { url, source } = civilianTrafficUrl(lat, lng, dist);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: adsbAuthHeaders(source === "adsbx" ? apiKey : null),
    });
    if (response.ok) {
      const payload = (await readAdsbJsonBody(response)) as {
        ac?: unknown[];
        aircraft?: unknown[];
      };
      const aircraft: TrackedAircraft[] = [];
      for (const raw of extractAircraftList(payload as never)) {
        const item = normalizeAdsbAircraft(raw, { excludeMilitary: true });
        if (!item) continue;
        aircraft.push(item);
        if (aircraft.length >= max) break;
      }
      if (aircraft.length > 0) {
        return NextResponse.json(
          {
            receivedAt: new Date().toISOString(),
            count: aircraft.length,
            aircraft,
            attribution: source === "adsbx" ? "ADSBexchange" : "adsb.fi",
            source: url,
            provider: source,
            mode: "civilian",
            excluded: "military (dbFlags & 1)",
          },
          { headers: ADSB_CDN },
        );
      }
    }
  } catch {
    // fall through to demo
  }

  const demo = demoCivAircraft().slice(0, max);
  return NextResponse.json(
    {
      receivedAt: new Date().toISOString(),
      count: demo.length,
      aircraft: demo,
      attribution: "ADS-B civ demo",
      source: "demo",
      provider: "demo",
      mode: "civilian",
      demo: true,
      bbox,
      note: "live empty — showing demo seeds",
    },
    { headers: NO_STORE_HEADERS },
  );
}
