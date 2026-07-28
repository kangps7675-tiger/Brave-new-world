import type { PlaceKind } from "@/data/geoTypes";
import type { BasemapTone } from "@/lib/basemapTone";
import { EXTREME_ZOOM_ALTITUDE } from "@/lib/globeCamera";

/** 대도시(150만+) · 소도시(10~150만) · 읍·면(3~10만) · 마을(3만 미만) */
export type PlaceLabelTier = "megacity" | "city" | "town" | "village";

/** 대도시 라벨 — 극저고도(거의 최대 줌)에서만 표시 */
export const MEGACITY_LABEL_MAX_ALTITUDE = EXTREME_ZOOM_ALTITUDE;

const MEGACITY_LABEL_BASE_DEG = 0.065;
const MEGACITY_DOT_BASE_DEG = 0.01;

const MEGACITY_POP = 1_500_000;
const CITY_POP = 100_000;
const TOWN_POP = 30_000;

/** labelSize 기본값(각도 °). 화면에서 과대/과소하지 않게 잡은 기준 */
const PLACE_LABEL_BASE_DEG: Record<PlaceLabelTier, number> = {
  megacity: MEGACITY_LABEL_BASE_DEG,
  city: 0.15,
  town: 0.12,
  village: 0.095,
};

export function getPlaceLabelTier(
  population: number | null | undefined,
  type?: PlaceKind | string,
  scalerank?: number,
): PlaceLabelTier {
  if (population != null && population > 0) {
    if (population >= MEGACITY_POP) return "megacity";
    if (population >= CITY_POP) return "city";
    if (population >= TOWN_POP) return "town";
    return "village";
  }

  if (type === "city") {
    return scalerank != null && scalerank <= 3 ? "megacity" : "city";
  }
  if (type === "town") return "town";
  if (type === "village") return "village";
  return "village";
}

/**
 * altitude ≥ 0.2: 크기 고정 / altitude < 0.2: 줌인할수록 축소 (LOD)
 */
export function getPlaceLabelScreenScale(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : 0.2;
  if (a >= 0.2) return 1;

  if (a <= 0.04) return 0.08;
  if (a <= 0.08) return 0.08 + ((a - 0.04) / 0.04) * 0.16; // → 0.24
  if (a <= 0.12) return 0.24 + ((a - 0.08) / 0.04) * 0.24; // → 0.48
  // 0.12 → 0.2
  return 0.48 + ((a - 0.12) / 0.08) * 0.52;
}

export function isMegacityLabelVisible(altitude: number): boolean {
  const a = Number.isFinite(altitude) ? altitude : MEGACITY_LABEL_MAX_ALTITUDE;
  return a <= MEGACITY_LABEL_MAX_ALTITUDE;
}

export function getMegacityLabelSize(altitude: number): number {
  if (!isMegacityLabelVisible(altitude)) return 0;
  return MEGACITY_LABEL_BASE_DEG;
}

export function getMegacityLabelDotRadius(altitude: number): number {
  if (!isMegacityLabelVisible(altitude)) return 0;
  return MEGACITY_DOT_BASE_DEG;
}

/** 도시 이름 텍스트 높이(°) — 등급 + 카메라 고도 */
export function getPlaceLabelSize(tier: PlaceLabelTier, altitude: number): number {
  if (tier === "megacity") return getMegacityLabelSize(altitude);
  return PLACE_LABEL_BASE_DEG[tier] * getPlaceLabelScreenScale(altitude);
}

/** 도시 이름 옆 점 반경(°) — 텍스트와 동일 화면 스케일 */
export function getPlaceLabelDotRadius(tier: PlaceLabelTier, altitude: number): number {
  if (tier === "megacity") return getMegacityLabelDotRadius(altitude);
  const base: Record<PlaceLabelTier, number> = {
    megacity: MEGACITY_DOT_BASE_DEG,
    city: 0.018,
    town: 0.014,
    village: 0.011,
  };
  return base[tier] * getPlaceLabelScreenScale(altitude);
}

/**
 * glow=true 이면 도시 이름 강조 — 조금 더 밝게.
 * 밝은 베이스맵(지형 벡터)에서는 통일 슬레이트 잉크(위계는 명도·불투명도만).
 */
export function getPlaceLabelColor(
  tier: PlaceLabelTier,
  glow: boolean,
  tone: BasemapTone = "dark",
): string {
  if (tone === "light") {
    /* 단일 잉크 패밀리 — 밝은 OSM/지형 위에 읽히는 슬레이트 */
    switch (tier) {
      case "megacity":
        return glow ? "rgba(15, 23, 42, 0.98)" : "rgba(30, 41, 59, 0.94)";
      case "city":
        return glow ? "rgba(30, 41, 59, 0.96)" : "rgba(51, 65, 85, 0.92)";
      case "town":
        return glow ? "rgba(51, 65, 85, 0.94)" : "rgba(71, 85, 105, 0.9)";
      case "village":
        return glow ? "rgba(71, 85, 105, 0.92)" : "rgba(100, 116, 139, 0.88)";
    }
  }
  switch (tier) {
    case "megacity":
      return glow ? "rgba(255, 200, 50, 0.96)" : "rgba(255, 185, 40, 0.86)";
    case "city":
      return glow ? "rgba(255, 230, 70, 0.94)" : "rgba(255, 218, 55, 0.82)";
    case "town":
      /* pale yellow text — clearly lighter than city amber */
      return glow ? "rgba(255, 252, 190, 0.92)" : "rgba(255, 248, 175, 0.78)";
    case "village":
      /* white text */
      return glow ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0.82)";
  }
}
