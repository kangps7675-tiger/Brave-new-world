/**
 * LiveUA 통제 폴리곤 지역 필터 — 한 mpts resid가 여러 전장을 섞어 줄 때
 * 해당 슬롯 bbox 안의 Polygon만 남긴다.
 */

import type { Feature, Position } from "geojson";
import type { LiveuamapControlRegionId } from "@/lib/liveuamap/types";

type LngLatBounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

/** 여유를 둔 대략 bbox (OSINT 근사). */
export const LIVEUA_CONTROL_BOUNDS: Record<LiveuamapControlRegionId, LngLatBounds> = {
  ukraine: { minLng: 21.5, maxLng: 41.5, minLat: 44.0, maxLat: 53.5 },
  iran: { minLng: 43.5, maxLng: 64.0, minLat: 24.5, maxLat: 40.5 },
  yemen: { minLng: 41.5, maxLng: 55.0, minLat: 11.5, maxLat: 19.5 },
  lebanon: { minLng: 34.8, maxLng: 37.0, minLat: 32.9, maxLat: 34.8 },
};

function ringCentroid(ring: Position[]): Position | null {
  if (!ring.length) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lng = Number(p[0]);
    const lat = Number(p[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    x += lng;
    y += lat;
    n += 1;
  }
  if (!n) return null;
  return [x / n, y / n];
}

export function featureCentroidLngLat(feature: Feature): Position | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === "Polygon") {
    return ringCentroid((g.coordinates[0] ?? []) as Position[]);
  }
  if (g.type === "MultiPolygon") {
    return ringCentroid((g.coordinates[0]?.[0] ?? []) as Position[]);
  }
  return null;
}

export function featureInControlBounds(
  feature: Feature,
  regionId: LiveuamapControlRegionId,
): boolean {
  const c = featureCentroidLngLat(feature);
  if (!c) return false;
  const b = LIVEUA_CONTROL_BOUNDS[regionId];
  const [lng, lat] = c;
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}
