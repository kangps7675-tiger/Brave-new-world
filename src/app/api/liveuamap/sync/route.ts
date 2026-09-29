import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { syncLiveuamapEvents } from "@/lib/liveuamap/fetchLiveuamap";
import { mergeLiveuamapEvents } from "@/lib/liveuamap/store";
import { saveLiveuaControlSnapshot } from "@/lib/liveuamap/controlSnapshotStore";
import type { LiveuamapControlRegionId } from "@/lib/liveuamap/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * LIVEUAMAP 전전선 sync — cron only.
 * Official mpts + budget; Attribution: Liveuamap.
 */
export async function POST(req: Request) {
  if (!authorizeCronRequest(req, ["INGEST_CRON_SECRET", "LIVEUAMAP_INGEST_SECRET"])) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await syncLiveuamapEvents();
    mergeLiveuamapEvents(
      result.events,
      new Date().toISOString(),
      result.error ?? null,
    );

    const controlSaved: string[] = [];
    for (const [regionId, fc] of Object.entries(result.controls) as [
      LiveuamapControlRegionId,
      (typeof result.controls)[LiveuamapControlRegionId],
    ][]) {
      if (!fc?.features.length) continue;
      const ok = await saveLiveuaControlSnapshot(regionId, fc);
      if (ok) controlSaved.push(regionId);
    }

    return NextResponse.json({
      ok: !result.error || result.events.length > 0,
      fetchedAt: new Date().toISOString(),
      eventCount: result.events.length,
      source: result.source,
      fetchedSlots: result.fetchedSlots,
      controlSaved,
      budget: result.budget,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "liveuamap sync failed") },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "method not allowed — use POST with Authorization: Bearer <INGEST_CRON_SECRET>",
    },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
