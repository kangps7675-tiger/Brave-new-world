import type { GlobeLodTier } from "@/lib/globeLod";

export type ViewPoint = { lat: number; lng: number };

export type Bbox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function longitudeDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

export function centerDistanceDeg(center: ViewPoint, view: ViewPoint): number {
  const latDist = Math.abs(view.lat - center.lat);
  const lngDist = longitudeDistance(view.lng, center.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

/** 뷰포트 안 우선, 비면 가장 가까운 N개 — AIS/ADS-B 체크 ON 빈 화면 방지 */
export function pickInViewOrNearest<T extends ViewPoint>(
  items: T[],
  view: ViewPoint,
  radiusDeg: number,
  maxCount: number,
): T[] {
  if (maxCount <= 0 || items.length === 0) return [];
  const inView = items.filter((item) => isCenterInView(item, view, radiusDeg));
  if (inView.length > 0) return inView.slice(0, maxCount);
  return [...items]
    .sort((a, b) => centerDistanceDeg(a, view) - centerDistanceDeg(b, view))
    .slice(0, maxCount);
}

const EARTH_RADIUS_KM = 6371;

/** Haversine — VIINA 정착지 라벨 뷰포트 반경 필터용 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isCenterInView(center: ViewPoint, view: ViewPoint, radiusDeg: number): boolean {
  if (radiusDeg <= 0) return true;
  return centerDistanceDeg(center, view) <= radiusDeg;
}

/**
 * 뷰포인트와 bbox 최근접점 거리(도).
 * 이란처럼 큰 박스는 중심이 화면 밖이어도 가장자리가 보이면 유지해야 함.
 */
export function distanceToBboxDeg(view: ViewPoint, bbox: Bbox): number {
  const clampedLat = Math.min(Math.max(view.lat, bbox.minLat), bbox.maxLat);
  // 경도 wrap이 없는 단순 bbox (분쟁 박스는 ±180 안) — 클램프
  let clampedLng = view.lng;
  if (view.lng < bbox.minLng || view.lng > bbox.maxLng) {
    const dMin = longitudeDistance(view.lng, bbox.minLng);
    const dMax = longitudeDistance(view.lng, bbox.maxLng);
    clampedLng = dMin <= dMax ? bbox.minLng : bbox.maxLng;
  }
  return centerDistanceDeg({ lat: clampedLat, lng: clampedLng }, view);
}

export function isBboxNearView(bbox: Bbox, view: ViewPoint, radiusDeg: number): boolean {
  if (radiusDeg <= 0) return true;
  return distanceToBboxDeg(view, bbox) <= radiusDeg;
}

/** 카메라가 바라보는 반구 밖(지평선 너머·뒤편) 제외 — θ > 80° */
export const VIEW_CONE_MAX_DEG = 80;

function toUnitVector(point: ViewPoint): [number, number, number] {
  const phi = ((90 - point.lat) * Math.PI) / 180;
  const theta = (point.lng * Math.PI) / 180;
  return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

/** 구면 각거리(°) — flat lat/lng 근사보다 뒤편 컬링에 정확 */
export function angularDistanceDeg(a: ViewPoint, b: ViewPoint): number {
  const va = toUnitVector(a);
  const vb = toUnitVector(b);
  const dot = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
  const clamped = Math.min(1, Math.max(-1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}

export function isWithinViewCone(
  view: ViewPoint,
  point: ViewPoint,
  maxDeg = VIEW_CONE_MAX_DEG,
): boolean {
  return angularDistanceDeg(view, point) <= maxDeg;
}

/** 반경 + 구면 뷰콘 — GPU 전달 전 프론트엔드 slice용 */
export function isPointInViewport(
  point: ViewPoint,
  view: ViewPoint,
  radiusDeg: number,
  useViewCone = true,
): boolean {
  if (useViewCone && !isWithinViewCone(view, point)) return false;
  return isCenterInView(point, view, radiusDeg);
}

export function bboxNearView(bbox: Bbox, view: ViewPoint, radiusDeg: number): boolean {
  if (radiusDeg <= 0) return true;
  const latDistance =
    view.lat < bbox.minLat
      ? bbox.minLat - view.lat
      : view.lat > bbox.maxLat
        ? view.lat - bbox.maxLat
        : 0;
  const lngCenter = (bbox.minLng + bbox.maxLng) / 2;
  const lngHalfWidth = Math.max(0.5, Math.abs(bbox.maxLng - bbox.minLng) / 2);
  const lngDistance = Math.max(0, Math.abs(view.lng - lngCenter) - lngHalfWidth);
  return Math.sqrt(latDistance ** 2 + lngDistance ** 2) <= radiusDeg;
}

export function filterByViewportCenter<T extends { center: ViewPoint }>(
  items: T[],
  view: ViewPoint,
  radiusDeg: number,
  maxCount: number,
  sortFn?: (a: T, b: T) => number,
): T[] {
  if (maxCount <= 0) return [];
  let candidates =
    radiusDeg > 0
      ? items.filter((item) => isPointInViewport(item.center, view, radiusDeg))
      : items.filter((item) => isWithinViewCone(view, item.center));
  if (sortFn) candidates = candidates.slice().sort(sortFn);
  return candidates.slice(0, maxCount);
}

/** 스케일(LOD)별 화면 반경 — global은 전세계 밀도 제한용 */
export const VIEWPORT_RADIUS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 55,
  continent: 28,
  regional: 16,
  near: 8,
  village: 2.2,
};

/** 국가 폴리곤 — 스케일별 상한 */
export const COUNTRY_POLYGON_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 28,
  continent: 48,
  regional: 72,
  near: 100,
  village: 140,
};

/** 분쟁지역 — 스케일별 상한 */
export const DISPUTE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 12,
  continent: 24,
  regional: 48,
  near: 72,
  village: 100,
};

export function viewToBbox(
  view: ViewPoint,
  radiusDeg: number,
): { west: number; south: number; east: number; north: number } {
  const pad = radiusDeg > 0 ? radiusDeg : 40;
  return {
    west: view.lng - pad,
    south: Math.max(-90, view.lat - pad),
    east: view.lng + pad,
    north: Math.min(90, view.lat + pad),
  };
}

/** 화재 탐지 — 스케일별 상한 */
export const FIRMS_FIRE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 60,
  continent: 120,
  regional: 240,
  near: 480,
  village: 900,
};

