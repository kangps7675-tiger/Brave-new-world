/**
 * 점진 지명 LOD (Cesium 엔티티 · MapLibre HTML 오버레이 공용).
 *
 * 줌아웃 → 국가
 * 중간 → 메가시티·일반도시
 * 더 확대 → 일반·중소도시
 * 최근접 → 중소·도시·마을
 *
 * getLodEffectiveAltitude 클램프를 쓰지 않고 실제 카메라 고도로 판정한다.
 */

import type { SearchPlace } from "@/data/geoTypes";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import {
  getPlaceLabelTier,
  type PlaceLabelTier,
} from "@/lib/placeLabelColors";
import { isWithinViewCone, type ViewPoint } from "@/lib/viewportCull";

export type ObservePlaceLabelTier = "country" | PlaceLabelTier;

type ViewState = { lat: number; lng: number; altitude: number };

const MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 96,
  continent: 110,
  regional: 140,
  near: 180,
  village: 220,
};

/** 카메라 고도(altitude) 기준 허용 지명 등급 — getLodEffectiveAltitude 클램프를 쓰지 않는다 */
const ALLOWED_BY_LOD: Record<GlobeLodTier, ReadonlySet<ObservePlaceLabelTier>> = {
  global: new Set(["country"]),
  continent: new Set(["country", "megacity"]),
  regional: new Set(["country", "megacity", "city"]),
  near: new Set(["megacity", "city", "town"]),
  village: new Set(["megacity", "city", "town", "village"]),
};

const VIEW_RADIUS_DEG: Record<GlobeLodTier, number> = {
  global: 180,
  continent: 48,
  regional: 22,
  near: 10,
  village: 3.2,
};

const TIER_RANK: Record<ObservePlaceLabelTier, number> = {
  country: 5,
  megacity: 4,
  city: 3,
  town: 2,
  village: 1,
};

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function placeDistanceDeg(place: SearchPlace, view: ViewState) {
  const latDist = Math.abs(view.lat - place.lat);
  const lngDist = longitudeDistance(view.lng, place.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

export function getObservePlaceLabelTier(
  place: Pick<SearchPlace, "type" | "population" | "scalerank">,
): ObservePlaceLabelTier | null {
  if (place.type === "country") return "country";
  if (place.type === "dispute") return null;
  if (place.type !== "city" && place.type !== "town" && place.type !== "village") {
    return null;
  }
  return getPlaceLabelTier(place.population, place.type, place.scalerank);
}

/** 줌 LOD + 시야 반경 + 인구·등급 우선 캡 */
export function filterObservePlaceLabels(
  places: SearchPlace[],
  view: ViewState,
  altitude: number = view.altitude,
): SearchPlace[] {
  const a = Number.isFinite(altitude) ? altitude : view.altitude;
  const lod = getGlobeLod(a);
  const allowed = ALLOWED_BY_LOD[lod.tier];
  const maxCount = MAX_BY_TIER[lod.tier];
  const radiusDeg = VIEW_RADIUS_DEG[lod.tier];
  const viewPoint: ViewPoint = { lat: view.lat, lng: view.lng };

  const candidates = places.filter((place) => {
    const tier = getObservePlaceLabelTier(place);
    if (!tier || !allowed.has(tier)) return false;
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return false;
    if (!isWithinViewCone(viewPoint, { lat: place.lat, lng: place.lng })) return false;
    if (place.minZoom != null && a > 1 / Math.max(place.minZoom, 0.5)) return false;
    if (radiusDeg < 180 && placeDistanceDeg(place, view) > radiusDeg) return false;
    return true;
  });

  if (candidates.length <= maxCount) return candidates;

  return candidates
    .slice()
    .sort((aPlace, bPlace) => {
      const tierA = getObservePlaceLabelTier(aPlace)!;
      const tierB = getObservePlaceLabelTier(bPlace)!;
      const rankDiff = TIER_RANK[tierB] - TIER_RANK[tierA];
      if (rankDiff !== 0) return rankDiff;
      const popA = aPlace.population ?? 0;
      const popB = bPlace.population ?? 0;
      if (popB !== popA) return popB - popA;
      return placeDistanceDeg(aPlace, view) - placeDistanceDeg(bPlace, view);
    })
    .slice(0, maxCount);
}

export function observePlaceLabelFontPx(tier: ObservePlaceLabelTier): number {
  switch (tier) {
    case "country":
      return 16;
    case "megacity":
      return 14;
    case "city":
      return 13;
    case "town":
      return 12;
    case "village":
      return 11;
  }
}

export function observePlaceLabelScale(tier: ObservePlaceLabelTier): number {
  switch (tier) {
    case "country":
      return 1.05;
    case "megacity":
      return 0.95;
    case "city":
      return 0.88;
    case "town":
      return 0.8;
    case "village":
      return 0.72;
  }
}
