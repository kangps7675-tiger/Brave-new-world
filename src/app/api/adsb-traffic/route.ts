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
import { distNmToBbox, fetchAdsbCivilianHubs } from "@/lib/adsbWarmFetch";
import { readAdsbFromD1, readAdsbFromIngestWorker } from "@/lib/d1MaritimeAir";
import { demoCivAircraft } from "@/lib/maritimeAirDemo";
import { adsbTrafficQuerySchema, parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";
import { fetchOpenSky } from "@/lib/openSkyAuth";
import {
  hasOpenSkyCredentials,
  openSkyBboxAround,
  openSkyStatesUrl,
  parseOpenSkyTraffic,
  type OpenSkyBbox,
} from "@/lib/openSkyTraffic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADSB_CDN = publicCacheHeaders(CDN_CACHE.adsb);
const OPENSKY_CACHE_MS = 60_000;
const OPENSKY_MIN_UPSTREAM_INTERVAL_MS = 30_000;
const OPENSKY_TIMEOUT_MS = 10_000;

type OpenSkyCache = {
  key: string;
  at: number;
  aircraft: TrackedAircraft[];
  bbox: OpenSkyBbox;
  rateLimitRemaining: string | null;
};

let openSkyCache: OpenSkyCache | null = null;
let lastOpenSkyFetchAt = 0;
let worldCivCache: { at: number; aircraft: TrackedAircraft[]; provider: string } | null = null;
let pendingWorldCiv: Promise<typeof worldCivCache> | null = null;
let pendingOpenSky: {
  key: string;
  promise: Promise<OpenSkyCache | null>;
} | null = null;

function bboxKey(bbox: OpenSkyBbox): string {
  return [bbox.lamin, bbox.lomin, bbox.lamax, bbox.lomax].join(":");
}

async function fetchOpenSkyTraffic(
  lat: number,
  lng: number,
  max: number,
): Promise<OpenSkyCache | null> {
  if (!hasOpenSkyCredentials()) return null;
  const bbox = openSkyBboxAround(lat, lng);
  const key = bboxKey(bbox);
  const now = Date.now();
  if (openSkyCache?.key === key && now - openSkyCache.at < OPENSKY_CACHE_MS) {
    return openSkyCache;
  }
  if (pendingOpenSky?.key === key) return pendingOpenSky.promise;
  if (pendingOpenSky) return null;
  // One server process may serve many users. Bound total OpenSky credit burn.
  if (now - lastOpenSkyFetchAt < OPENSKY_MIN_UPSTREAM_INTERVAL_MS) return null;

  lastOpenSkyFetchAt = now;
  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENSKY_TIMEOUT_MS);
    try {
      const { response } = await fetchOpenSky(openSkyStatesUrl(bbox), {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "BraveNewWorld/1.0 OpenSky globe traffic",
        },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { states?: unknown; time?: number };
      const aircraft = parseOpenSkyTraffic(payload.states, { time: payload.time, max });
      if (aircraft.length === 0) return null;
      const entry: OpenSkyCache = {
        key,
        at: Date.now(),
        aircraft,
        bbox,
        rateLimitRemaining: response.headers.get("X-Rate-Limit-Remaining"),
      };
      openSkyCache = entry;
      return entry;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      pendingOpenSky = null;
    }
  })();
  pendingOpenSky = { key, promise };
  return promise;
}

const WORLD_CIV_CACHE_MS = 45_000;

async function fetchWorldwideCiv(max: number): Promise<{
  at: number;
  aircraft: TrackedAircraft[];
  provider: string;
} | null> {
  const now = Date.now();
  if (worldCivCache && now - worldCivCache.at < WORLD_CIV_CACHE_MS) {
    return worldCivCache;
  }
  if (pendingWorldCiv) return pendingWorldCiv;
  pendingWorldCiv = (async () => {
    const civ = await fetchAdsbCivilianHubs({ maxPerHub: 40, maxTotal: max });
    if (civ.aircraft.length === 0) return null;
    const entry = {
      at: Date.now(),
      aircraft: civ.aircraft.slice(0, max),
      provider: civ.provider,
    };
    worldCivCache = entry;
    return entry;
  })().finally(() => {
    pendingWorldCiv = null;
  });
  return pendingWorldCiv;
}

/**
 * 민간 항적. lat/lng 가 없으면 전 세계 스냅샷.
 * GET /api/adsb-traffic?max=
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
  const worldwide = lat == null || lng == null;

  if (worldwide && !preferLive) {
    const fromD1 = await readAdsbFromD1({ mode: "civ", max });
    if (fromD1 && fromD1.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromD1.receivedAt,
          count: fromD1.count,
          aircraft: fromD1.aircraft,
          attribution: "ADS-B civilian worldwide (via Cloudflare D1 cron warm)",
          source: "d1",
          provider: "d1",
          mode: "civilian",
          scope: "world",
          excluded: "military (dbFlags & 1)",
          cached: true,
        },
        { headers: ADSB_CDN },
      );
    }
    const fromWorker = await readAdsbFromIngestWorker({ mode: "civ", max });
    if (fromWorker && fromWorker.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromWorker.receivedAt,
          count: fromWorker.count,
          aircraft: fromWorker.aircraft,
          attribution: "ADS-B civ worldwide (via Cloudflare cron worker)",
          source: "ingest-worker",
          provider: "ingest-worker",
          mode: "civilian",
          scope: "world",
          excluded: "military (dbFlags & 1)",
          cached: true,
        },
        { headers: ADSB_CDN },
      );
    }
  }

  if (worldwide) {
    const liveWorld = await fetchWorldwideCiv(max);
    if (liveWorld && liveWorld.aircraft.length > 0) {
      return NextResponse.json(
        {
          receivedAt: new Date(liveWorld.at).toISOString(),
          count: liveWorld.aircraft.length,
          aircraft: liveWorld.aircraft,
          attribution:
            liveWorld.provider === "adsbx-all"
              ? "ADSBexchange worldwide"
              : "adsb.lol worldwide hubs (ODbL)",
          source: "live",
          provider: liveWorld.provider,
          mode: "civilian",
          scope: "world",
          excluded: "military (dbFlags & 1)",
          cached: Date.now() - liveWorld.at > 1_000,
        },
        { headers: ADSB_CDN },
      );
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
        scope: "world",
        demo: true,
        note: "worldwide live empty — showing demo seeds",
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const bbox = distNmToBbox(lat, lng, dist);

  const openSky = await fetchOpenSkyTraffic(lat, lng, max);
  if (openSky) {
    return NextResponse.json(
      {
        receivedAt: new Date(openSky.at).toISOString(),
        count: openSky.aircraft.length,
        aircraft: openSky.aircraft,
        attribution: "The OpenSky Network",
        source: "https://opensky-network.org/",
        provider: "opensky",
        mode: "civilian",
        bbox: openSky.bbox,
        cached: Date.now() - openSky.at > 1_000,
        rateLimitRemaining: openSky.rateLimitRemaining,
      },
      { headers: ADSB_CDN },
    );
  }

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
            // 실제 응답한 소스를 그대로 표기한다 — 폴백이 바뀌면 표기도 바뀌어야 한다
            attribution:
              source === "adsbx"
                ? "ADSBexchange"
                : source === "adsb.lol"
                  ? "adsb.lol (ODbL)"
                  : "adsb.fi",
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
