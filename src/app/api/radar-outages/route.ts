import { NextResponse } from "next/server";
import { normalizeRadarOutages, type RadarOutage } from "@/lib/radarOutages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM =
  "https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=50&dateRange=7d&format=json";

function emptyPayload(extra?: { error?: string }) {
  return {
    outages: [] as RadarOutage[],
    count: 0,
    fetchedAt: new Date().toISOString(),
    attribution: "Cloudflare Radar Outage Center",
    sourceUrl: "https://developers.cloudflare.com/radar/investigate/outages/",
    ...(extra?.error ? { error: extra.error } : {}),
  };
}

export async function GET() {
  const token = process.env.CLOUDFLARE_RADAR_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(emptyPayload({ error: "missing_token" }), {
      status: 200,
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
      return NextResponse.json(
        emptyPayload({ error: `upstream_http_${res.status}` }),
        {
          status: 200,
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
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      emptyPayload({
        error: error instanceof Error ? error.message : "fetch_failed",
      }),
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=60" },
      },
    );
  }
}
