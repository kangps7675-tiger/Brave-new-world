import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import { fetchAdsbCivilianHubs, fetchAdsbMilitary } from "@/lib/adsbWarmFetch";
import { writeAdsbToD1 } from "@/lib/d1MaritimeAir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorize(request: Request): boolean {
  return authorizeCronRequest(request, ["INGEST_CRON_SECRET", "NEWS_WARM_SECRET"]);
}

/**
 * Cron 워밍: ADS-B mil(전역) + civ(허브 격자) → D1.
 * POST /api/adsb/warm
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const milMax = Math.min(800, Math.max(50, Number(searchParams.get("milMax") || 400)));
  const civPerHub = Math.min(120, Math.max(20, Number(searchParams.get("civPerHub") || 80)));
  const skipCiv = searchParams.get("skipCiv") === "1";

  const mil = await fetchAdsbMilitary(milMax);
  const milWritten = await writeAdsbToD1(mil.aircraft, "mil");

  let civWritten = 0;
  let civFetched = 0;
  let hubsOk = 0;
  let civErrors: string[] = [];
  if (!skipCiv) {
    const civ = await fetchAdsbCivilianHubs({ maxPerHub: civPerHub });
    civFetched = civ.aircraft.length;
    hubsOk = civ.hubsOk;
    civErrors = civ.errors;
    civWritten = await writeAdsbToD1(civ.aircraft, "civ");
  }

  return NextResponse.json({
    ok: milWritten > 0 || civWritten > 0,
    mil: {
      written: milWritten,
      fetched: mil.aircraft.length,
      provider: mil.provider,
      error: mil.error,
    },
    civ: {
      written: civWritten,
      fetched: civFetched,
      hubsOk,
      errors: civErrors,
    },
    receivedAt: new Date().toISOString(),
  });
}
