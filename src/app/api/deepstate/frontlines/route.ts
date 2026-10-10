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
 * 점령/통제 영토 GeoJSON — 전 지역 LiveUAMap만.
 * Ukraine/Iran/Yemen/Lebanon/IL-PS: LiveUA D1 스냅샷.
 * (`?liveuaOnly=` 는 하위 호환 — 동작 동일)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const regionRaw = (url.searchParams.get("region") || "ukraine").toLowerCase();
  const region: LiveuamapControlRegionId = isLiveuamapControlRegionId(regionRaw)
    ? regionRaw
    : "ukraine";

  if (region === "ukraine") {
    const result = await resolveUkraineOccupied();
    if (!result.occupied.features.length) {
      return NextResponse.json(
        {
          occupied: emptyOccupiedGeoJson(),
          source: "empty",
          region,
          error: result.error || "occupied snapshot unavailable",
          timestamp: new Date().toISOString(),
        },
        // empty는 동기화 대기 — DeepState 폴백 유도하지 않음
        { status: 200 },
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
      { status: 200 },
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
