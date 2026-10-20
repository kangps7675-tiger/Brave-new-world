import type { SearchPlace } from "@/data/geoTypes";
import { GLOBAL_MAJOR_CITY_LABEL_MAX } from "@/lib/globePerformance";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import {
  getPlaceLabelTier,
  isMegacityLabelVisible,
  type PlaceLabelTier,
} from "@/lib/placeLabelColors";
import { isWithinViewCone, type ViewPoint } from "@/lib/viewportCull";
import { getLodEffectiveAltitude } from "@/lib/zoomScale";

type ViewState = { lat: number; lng: number; altitude: number };

/** 캔버스 라벨은 GPU 비용이 커서 국경선보다 더 빡세게 제한 */
const MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 56,
  regional: 80,
  near: 110,
  village: 140,
};

const ALLOWED_LABEL_TIERS: Record<GlobeLodTier, ReadonlySet<PlaceLabelTier>> = {
  global: new Set(),
  continent: new Set(["city"]),
  regional: new Set(["city"]),
  near: new Set(["city", "town"]),
  village: new Set(["megacity", "city", "town", "village"]),
};

/** global tier(radiusDeg=0)도 전세계를 한꺼번에 뿌리지 않도록 밀도 반경 */
const VIEW_RADIUS_DEG: Record<GlobeLodTier, number> = {
  global: 180,
  continent: 28,
  regional: 14,
  near: 7,
  village: 2.2,
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

const MAJOR_CITY_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: GLOBAL_MAJOR_CITY_LABEL_MAX,
  continent: 48,
  regional: 72,
  near: 96,
  village: 120,
};

/** 도시명 체크 ON — 주요 도시(대도시·중도시)만, 굵은 고딕 HTML 라벨용 */
export function filterMajorCityLabels(
  places: SearchPlace[],
  view: ViewState,
  altitude: number,
): SearchPlace[] {
  const lod = getGlobeLod(getLodEffectiveAltitude(altitude));
  const maxCount = MAJOR_CITY_MAX_BY_TIER[lod.tier];
  const radiusDeg = VIEW_RADIUS_DEG[lod.tier];

  const viewPoint: ViewPoint = { lat: view.lat, lng: view.lng };
  const candidates = places.filter((place) => {
    if (place.type !== "city") return false;
    if (!isWithinViewCone(viewPoint, { lat: place.lat, lng: place.lng })) return false;
    const tier = getPlaceLabelTier(place.population, place.type, place.scalerank);
    if (tier !== "megacity" && tier !== "city") return false;
    if (tier === "megacity" && altitude > 0.55) return false;
    if (lod.tier === "global" && tier === "megacity") return false;
    if (place.minZoom != null && altitude > 1 / Math.max(place.minZoom, 0.5)) return false;
    if (radiusDeg < 180 && placeDistanceDeg(place, view) > radiusDeg) return false;
    return true;
  });

  if (candidates.length <= maxCount) return candidates;

  return candidates
    .slice()
    .sort((a, b) => {
      const popA = a.population ?? 0;
      const popB = b.population ?? 0;
      if (popB !== popA) return popB - popA;
      return placeDistanceDeg(a, view) - placeDistanceDeg(b, view);
    })
    .slice(0, maxCount);
}

export function filterPlacesForView(
  places: SearchPlace[],
  view: ViewState,
  altitude: number,
): SearchPlace[] {
  const lod = getGlobeLod(getLodEffectiveAltitude(altitude));
  const maxCount = MAX_BY_TIER[lod.tier];
  const allowed = ALLOWED_LABEL_TIERS[lod.tier];
  const radiusDeg = VIEW_RADIUS_DEG[lod.tier];

  const candidates = places.filter((place) => {
    const labelTier = getPlaceLabelTier(place.population, place.type, place.scalerank);
    if (labelTier === "megacity" && !isMegacityLabelVisible(altitude)) return false;
    if (!allowed.has(labelTier)) return false;
    if (place.minZoom != null && altitude > 1 / Math.max(place.minZoom, 0.5)) return false;
    if (radiusDeg < 180 && placeDistanceDeg(place, view) > radiusDeg) return false;
    return true;
  });

  if (candidates.length <= maxCount) return candidates;

  return candidates
    .slice()
    .sort((a, b) => {
      const popA = a.population ?? 0;
      const popB = b.population ?? 0;
      if (popB !== popA) return popB - popA;
      return placeDistanceDeg(a, view) - placeDistanceDeg(b, view);
    })
    .slice(0, maxCount);
}
