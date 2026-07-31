import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import { writeAisToD1 } from "@/lib/d1MaritimeAir";
import {
  fetchMarineTrafficCommercial,
  getMarineTrafficApiKey,
} from "@/lib/marineTrafficFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request): boolean {
  return authorizeCronRequest(request, ["INGEST_CRON_SECRET", "NEWS_WARM_SECRET"]);
}

/**
 * Cron 워밍: MarineTraffic 민간 AIS → D1.
 * POST /api/ais/warm
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mtKey = getMarineTrafficApiKey();
  if (!mtKey) {
    return NextResponse.json({
      ok: false,
      written: 0,
      error: "MARINETRAFFIC_API_KEY missing",
    });
  }

  const max = Math.min(
    800,
    Math.max(50, Number(new URL(request.url).searchParams.get("max") || 400)),
  );

  try {
    const vessels = await fetchMarineTrafficCommercial(mtKey, max);
    const written = await writeAisToD1(vessels, "marinetraffic");
    return NextResponse.json({
      ok: written > 0,
      written,
      fetched: vessels.length,
      provider: "marinetraffic",
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        written: 0,
        error: publicErrorMessage(error, "ais warm failed"),
      },
      { status: 502 },
    );
  }
}
