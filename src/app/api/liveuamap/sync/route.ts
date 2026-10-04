import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { runLiveuamapIngest } from "@/lib/liveuamap/runIngest";

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
    const result = await runLiveuamapIngest();
    return NextResponse.json({
      ok: !result.error || result.events.length > 0,
      fetchedAt: result.fetchedAt,
      eventCount: result.events.length,
      source: result.source,
      fetchedSlots: result.fetchedSlots,
      controlSaved: result.controlSaved,
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
