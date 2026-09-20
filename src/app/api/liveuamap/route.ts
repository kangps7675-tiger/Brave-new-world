import { NextResponse } from "next/server";
import { getLiveuamapStore } from "@/lib/liveuamap/store";
import type { LiveuamapFeedPayload } from "@/lib/liveuamap/types";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { events, lastIngestAt, lastError } = getLiveuamapStore();
  const status: LiveuamapFeedPayload["status"] = lastError
    ? "error"
    : events.length > 0 || lastIngestAt
      ? "ok"
      : "idle";

  const payload: LiveuamapFeedPayload = {
    fetchedAt: lastIngestAt ?? new Date().toISOString(),
    events,
    status,
    error: lastError ?? undefined,
    source: events.length > 0 ? "liveuamap" : "empty",
  };

  return NextResponse.json(payload, {
    headers: { ...NO_STORE_HEADERS },
  });
}
