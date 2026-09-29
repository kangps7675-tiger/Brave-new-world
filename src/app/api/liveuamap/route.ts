import { NextResponse } from "next/server";
import { getLiveuamapStore } from "@/lib/liveuamap/store";
import type { LiveuamapFeedPayload } from "@/lib/liveuamap/types";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { events, lastIngestAt, lastError, budget } = getLiveuamapStore();
  const status: LiveuamapFeedPayload["status"] = lastError && events.length === 0
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
    budget: {
      dayUtc: budget.dayUtc,
      used: budget.used,
      cap: budget.cap,
    },
  };

  return NextResponse.json(payload, {
    headers: { ...NO_STORE_HEADERS },
  });
}
