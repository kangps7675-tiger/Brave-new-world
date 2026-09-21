import { NextResponse } from "next/server";
import { publicCacheHeaders, CDN_CACHE } from "@/lib/httpCacheHeaders";
import { readOccupiedSnapshotForClient } from "@/lib/deepstate/refreshOccupied";
import { emptyOccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 임시: DeepState 점령 영토 GeoJSON (좌표 스냅샷).
 * news_project occupiedUkraine 패턴 — 3일에 한 번 좌표만 반영.
 * LIVEUAMAP 영토 폴링 전. 유저 GET은 스냅샷만 읽고 원본 API를 치지 않는다
 * (스냅샷이 3일 지났을 때만 한 번 갱신).
 */
export async function GET() {
  const result = await readOccupiedSnapshotForClient();
  if (!result.occupied.features.length) {
    return NextResponse.json(
      {
        occupied: emptyOccupiedGeoJson(),
        source: "empty",
        error: result.error || "DeepState snapshot unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      occupied: result.occupied,
      source: result.source,
      skipped: result.skipped,
      timestamp: result.occupied.meta?.fetchedAt ?? new Date().toISOString(),
    },
    {
      headers: publicCacheHeaders(CDN_CACHE.deepstateOccupied),
    },
  );
}
