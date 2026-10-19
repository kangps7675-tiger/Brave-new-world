import { NextResponse } from "next/server";
import type { Feature, FeatureCollection } from "geojson";
import { loadLiveuaControlFromD1 } from "@/lib/liveuamap/controlSnapshotStore";
import { hydrateLiveuamapStateFromD1 } from "@/lib/liveuamap/persistState";
import { LIVEUAMAP_CONTROL_REGION_IDS } from "@/lib/liveuamap/types";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LiveUAMap 통제면 — 우크라이나 점령지 + 중동(이란·예멘·레바논·이스라엘-팔레스타인) 통제 구역.
 * 워커/ingest 가 D1(deepstate_occupied_snapshots, cacheKey=liveua-*)에 저장한 스냅샷을 합쳐서 내보낸다.
 */
export async function GET() {
  await hydrateLiveuamapStateFromD1();
  const features: Feature[] = [];
  const fetchedAt: Record<string, string | null> = {};
  for (const regionId of LIVEUAMAP_CONTROL_REGION_IDS) {
    const fc = await loadLiveuaControlFromD1(regionId);
    fetchedAt[regionId] = fc?.meta?.fetchedAt ?? null;
    for (const f of fc?.features ?? []) features.push(f);
  }
  const body: FeatureCollection & { meta: { fetchedAt: Record<string, string | null> } } = {
    type: "FeatureCollection",
    features,
    meta: { fetchedAt },
  };
  return NextResponse.json(body, { headers: { ...NO_STORE_HEADERS } });
}
