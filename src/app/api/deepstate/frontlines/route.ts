import { NextResponse } from "next/server";
import { publicCacheHeaders, CDN_CACHE } from "@/lib/httpCacheHeaders";
import { emptyOccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";
import { loadLiveuaControlFromD1 } from "@/lib/liveuamap/controlSnapshotStore";
import { resolveUkraineOccupied } from "@/lib/liveuamap/resolveUkraineOccupied";
import {
  isLiveuamapControlRegionId,
  type LiveuamapControlRegionId,
} from "@/lib/liveuamap/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 점령/통제 영토 GeoJSON.
 * Ukraine: LiveUA 우선 → DeepState 폴백 (MapLibre).
 *   `?liveuaOnly=1` → LiveUA만 (Cesium; DeepState 금지).
 * Iran/Yemen/Lebanon: LiveUA만 (?region=iran|yemen|lebanon).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const regionRaw = (url.searchParams.get("region") || "ukraine").toLowerCase();
  const region: LiveuamapControlRegionId = isLiveuamapControlRegionId(regionRaw)
    ? regionRaw
    : "ukraine";
  const liveuaOnly =
    url.searchParams.get("liveuaOnly") === "1" ||
    url.searchParams.get("liveuaOnly") === "true";

  if (region === "ukraine") {
    const result = await resolveUkraineOccupied({ liveuaOnly });
    if (!result.occupied.features.length) {
      return NextResponse.json(
        {
          occupied: emptyOccupiedGeoJson(),
          source: "empty",
          region,
          error: result.error || "occupied snapshot unavailable",
          timestamp: new Date().toISOString(),
        },
        // liveuaOnly: empty는 정상(동기화 대기) — 502로 DeepState 폴백 유도하지 않음
        { status: liveuaOnly ? 200 : 502 },
      );
    }
    return NextResponse.json(
      {
        occupied: result.occupied,
        source: result.source,
        region,
        skipped: result.skipped,
        timestamp: result.occupied.meta?.fetchedAt ?? new Date().toISOString(),
      },
      { headers: publicCacheHeaders(CDN_CACHE.deepstateOccupied) },
    );
  }

  const liveua = await loadLiveuaControlFromD1(region);
  if (!liveua?.features.length) {
    return NextResponse.json(
      {
        occupied: emptyOccupiedGeoJson(),
        source: "empty",
        region,
        error: "LiveUA control polygons unavailable",
        timestamp: new Date().toISOString(),
      },
      // empty도 Cesium 폴링에서 정상 대기 상태
      { status: liveuaOnly ? 200 : 404 },
    );
  }
  return NextResponse.json(
    {
      occupied: liveua,
      source: "liveuamap",
      region,
      timestamp: liveua.meta?.fetchedAt ?? new Date().toISOString(),
    },
    { headers: publicCacheHeaders(CDN_CACHE.deepstateOccupied) },
  );
}
