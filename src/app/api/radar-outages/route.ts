import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import { normalizeRadarOutages, type RadarOutage } from "@/lib/radarOutages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM =
  "https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=50&dateRange=7d&format=json";

function emptyPayload(extra?: { error?: string; degraded?: boolean }) {
  return {
    outages: [] as RadarOutage[],
    count: 0,
    fetchedAt: new Date().toISOString(),
    attribution: "Cloudflare Radar Outage Center",
    sourceUrl: "https://developers.cloudflare.com/radar/investigate/outages/",
    degraded: extra?.degraded ?? true,
    ...(extra?.error ? { error: extra.error } : {}),
  };
}

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.radar);
  if (limited) return limited;

  const token = process.env.CLOUDFLARE_RADAR_TOKEN?.trim();
  if (!token) {
    logApiRoute("/api/radar-outages", "warn", "missing_token");
    return NextResponse.json(emptyPayload({ error: "missing_token" }), {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(UPSTREAM, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "GeoWatch/1.0 Cloudflare Radar outages bridge",
        },
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      logApiRoute("/api/radar-outages", "error", "upstream_http", {
        status: res.status,
      });
      return NextResponse.json(
        emptyPayload({ error: `upstream_http_${res.status}` }),
        {
          status: 502,
          headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
        },
      );
    }

    const json: unknown = await res.json();
    const outages = normalizeRadarOutages(json);

    return NextResponse.json(
      {
        outages,
        count: outages.length,
        fetchedAt: new Date().toISOString(),
        attribution: "Cloudflare Radar Outage Center",
        sourceUrl: "https://developers.cloudflare.com/radar/investigate/outages/",
        degraded: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = publicErrorMessage(error, "fetch_failed");
    logApiRoute("/api/radar-outages", "error", "fetch_failed", { message });
    return NextResponse.json(emptyPayload({ error: message }), {
      status: 502,
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  }
}
