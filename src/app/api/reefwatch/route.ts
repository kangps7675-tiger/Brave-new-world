import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  SCS_BBOX,
  buildReefWatchPayload,
  demoReefWatchPayload,
  normalizeReefWatchFeatures,
  parseOpenSkyStates,
  type ReefWatchPayload,
} from "@/lib/reefWatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
/** Soft cache — stay polite under OpenSky free-tier limits */
const CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = 12_000;

type CacheEntry = {
  at: number;
  payload: ReefWatchPayload;
};

let cache: CacheEntry | null = null;

async function fetchOpenSkyStates(): Promise<{
  states: unknown;
  time: number | undefined;
  status: number;
  querySeconds: number;
}> {
  const params = new URLSearchParams({
    lamin: String(SCS_BBOX.lamin),
    lomin: String(SCS_BBOX.lomin),
    lamax: String(SCS_BBOX.lamax),
    lomax: String(SCS_BBOX.lomax),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const response = await fetch(`${OPENSKY_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "BraveNewWorld/1.0 ReefWatch feature-centric SCS monitor",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    const querySeconds = (Date.now() - t0) / 1000;
    if (response.status === 429 || response.status === 403) {
      return { states: [], time: undefined, status: response.status, querySeconds };
    }
    if (!response.ok) {
      throw new Error(`OpenSky HTTP ${response.status}`);
    }
    const body = (await response.json()) as { states?: unknown; time?: number };
    return {
      states: body.states ?? [],
      time: typeof body.time === "number" ? body.time : undefined,
      status: response.status,
      querySeconds,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.reefwatch);
  if (limited) return limited;

  if (isApiStubMode()) {
    const payload = demoReefWatchPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-ReefWatch-Mode": "stub",
      },
    });
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: {
        "Cache-Control": `s-maxage=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=120`,
        "X-ReefWatch-Cache": "hit",
      },
    });
  }

  const features = normalizeReefWatchFeatures();
  const errors: string[] = [];

  try {
    const result = await fetchOpenSkyStates();
    if (result.status === 429 || result.status === 403) {
      errors.push(`opensky: rate limited (${result.status})`);
      logApiRoute("/api/reefwatch", "warn", "opensky_rate_limited", {
        status: result.status,
      });
      const payload = buildReefWatchPayload({
        traffic: cache?.payload.traffic ?? [],
        openskyStatus: {
          status: "rate_limited",
          latestObservationAt:
            cache?.payload.sourceHealth.opensky.latestObservationAt ?? null,
          observationCount: cache?.payload.traffic.length ?? 0,
          querySeconds: result.querySeconds,
          message: `OpenSky HTTP ${result.status}`,
        },
        errors,
        features,
      });
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
          "X-ReefWatch-Cache": "rate-limited",
        },
      });
    }

    const traffic = parseOpenSkyStates(result.states, features, { time: result.time });
    const payload = buildReefWatchPayload({
      traffic,
      openskyStatus: {
        status: traffic.length > 0 ? "ready" : "empty",
        latestObservationAt: traffic[0]?.capturedAt ?? null,
        observationCount: traffic.length,
        querySeconds: result.querySeconds,
      },
      features,
    });
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `s-maxage=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=120`,
        "X-ReefWatch-Cache": "miss",
      },
    });
  } catch (error) {
    errors.push(
      `opensky: ${publicErrorMessage(error, "fetch failed")}`,
    );
    logApiRoute("/api/reefwatch", "error", "opensky_fetch_failed", {
      message: errors[0],
    });
    if (cache) {
      return NextResponse.json(
        {
          ...cache.payload,
          errors,
          fetchedAt: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
            "X-ReefWatch-Cache": "stale-error",
          },
        },
      );
    }
    const payload = buildReefWatchPayload({
      traffic: [],
      openskyStatus: {
        status: "error",
        latestObservationAt: null,
        observationCount: 0,
        querySeconds: null,
        message: errors[0],
      },
      errors,
      features,
    });
    return NextResponse.json(payload, {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "X-ReefWatch-Cache": "error",
      },
    });
  }
}
