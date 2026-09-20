import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { syncLiveuamapEvents } from "@/lib/liveuamap/fetchLiveuamap";
import { replaceLiveuamapEvents } from "@/lib/liveuamap/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * LIVEUAMAP 전전선 sync — cron only.
 * Attribution: Liveuamap. Use LIVEUAMAP_FEED_URL mirror; respect upstream ToS.
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
    replaceLiveuamapEvents(
      result.events,
      new Date().toISOString(),
      result.error ?? null,
    );
    return NextResponse.json({
      ok: !result.error,
      fetchedAt: new Date().toISOString(),
      eventCount: result.events.length,
      source: result.source,
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
