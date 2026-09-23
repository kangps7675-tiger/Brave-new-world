import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";
import { refreshOccupiedSnapshot } from "@/lib/deepstate/refreshOccupied";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron: DeepState history/last → 점령 좌표 스냅샷 (3일 TTL).
 * LIVEUAMAP 영토 폴링 전 임시.
 */
export async function POST(request: Request) {
  if (!authorizeCronRequest(request, ["INGEST_CRON_SECRET", "DEEPSTATE_SYNC_SECRET"])) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    const result = await refreshOccupiedSnapshot({ force });
    return NextResponse.json(
      {
        ok: result.occupied.features.length > 0 && !result.error,
        skipped: result.skipped,
        persisted: result.persisted,
        source: result.source,
        featureCount: result.occupied.features.length,
        fetchedAt: result.occupied.meta?.fetchedAt ?? null,
        error: result.error,
      },
      { status: result.occupied.features.length > 0 ? 200 : 502, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "deepstate occupied sync failed") },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
