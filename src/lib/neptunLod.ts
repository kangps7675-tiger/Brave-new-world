import type { NeptunArchivedThreat, NeptunLiveThreat } from "@/lib/neptun";
import { isInNeptunOpsBox } from "@/lib/neptun";
import type { GlobeLodTier } from "@/lib/globeLod";
import { isInUkraineTheater } from "@/lib/ukraineSettlementLabels";
import { centerDistanceDeg, type ViewPoint } from "@/lib/viewportCull";
import type { NeptunPathElevationMode } from "@/lib/neptunFlightArc";

export type NeptunRenderMode = "hidden" | "flat" | "low" | "elevated";

const UKRAINE_THEATER_CENTER: ViewPoint = { lat: 48.5, lng: 31.5 };

export const NEPTUN_THREAT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 8,
  continent: 12,
  regional: 16,
  near: 24,
  village: 32,
};

export const NEPTUN_ARCHIVED_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 4,
  continent: 6,
  regional: 8,
  near: 10,
  village: 16,
};

const FETCH_RADIUS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 55,
  continent: 42,
  regional: 30,
  near: 20,
  village: 14,
};

const VIEW_RADIUS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 26,
  regional: 18,
  near: 12,
  village: 8,
};

export function isNeptunTheaterInView(view: ViewPoint, tier: GlobeLodTier): boolean {
  if (isInUkraineTheater(view.lat, view.lng)) return true;
  const radius = FETCH_RADIUS_BY_TIER[tier];
  return centerDistanceDeg(UKRAINE_THEATER_CENTER, view) <= radius;
}

export function shouldFetchNeptunData(
  layerEnabled: boolean,
  view: ViewPoint,
  tier: GlobeLodTier,
  ukraineFrontOn = false,
): boolean {
  if (!layerEnabled) return false;
  if (ukraineFrontOn) return true;
  return isNeptunTheaterInView(view, tier);
}

export function getNeptunRenderMode(
  tier: GlobeLodTier,
  inTheater: boolean,
  layerOn: boolean,
  ukraineFrontOn = false,
): NeptunRenderMode {
  if (!layerOn || !inTheater) return "hidden";
  if (ukraineFrontOn && (tier === "global" || tier === "continent")) return "low";
  if (tier === "global" || tier === "continent") return "flat";
  if (tier === "regional") return "low";
  return "elevated";
}

export function neptunElevationForMode(mode: NeptunRenderMode): NeptunPathElevationMode {
  if (mode === "elevated") return "elevated";
  if (mode === "low") return "low";
  return "flat";
}

/** 실시간 관측 궤적 — 줌 단계별 WebGL 정점 상한 */
export function neptunTrailPointBudget(mode: NeptunRenderMode): number {
  switch (mode) {
    case "elevated":
      return 14;
    case "low":
      return 10;
    case "flat":
      return 6;
    default:
      return 0;
  }
}

/** 예측 항로 — 짧은 polyline만 */
export function neptunProjectionPointBudget(mode: NeptunRenderMode): number {
  switch (mode) {
    case "elevated":
      return 7;
    case "low":
      return 5;
    default:
      return 0;
  }
}

/** 지나간 궤적 — 정적 배치, 더 공격적으로 다운샘플 */
export function neptunArchivedPointBudget(mode: NeptunRenderMode): number {
  switch (mode) {
    case "elevated":
      return 8;
    case "low":
      return 6;
    case "flat":
      return 5;
    default:
      return 0;
  }
}

/** @deprecated neptunTrailPointBudget 사용 */
export function neptunMaxPathPoints(mode: NeptunRenderMode): number {
  return neptunTrailPointBudget(mode);
}

/** API trail 원본 좌표 상한 (고도화 전) */
export function neptunMaxGroundTrailVertices(mode: NeptunRenderMode): number {
  switch (mode) {
    case "elevated":
      return 18;
    case "low":
      return 14;
    case "flat":
      return 10;
    default:
      return 0;
  }
}

function threatCenter(threat: NeptunLiveThreat | NeptunArchivedThreat): ViewPoint {
  if ("predictedLat" in threat && Number.isFinite(threat.predictedLat)) {
    return { lat: threat.predictedLat, lng: threat.predictedLon };
  }
  return { lat: threat.lat, lng: threat.lon };
}

function isThreatInOpsBox(threat: NeptunLiveThreat | NeptunArchivedThreat): boolean {
  const center = threatCenter(threat);
  if (isInNeptunOpsBox(center.lat, center.lng)) return true;
  return isInNeptunOpsBox(threat.lat, threat.lon);
}

export function filterNeptunThreatsForViewport<T extends NeptunLiveThreat | NeptunArchivedThreat>(
  threats: T[],
  view: ViewPoint,
  tier: GlobeLodTier,
  maxCount: number,
): T[] {
  if (maxCount <= 0) return [];
  const radius = VIEW_RADIUS_BY_TIER[tier];
  if (radius <= 0) return [];

  const filtered = threats.filter((threat) => {
    if (!isThreatInOpsBox(threat)) return false;
    const center = threatCenter(threat);
    if (isInUkraineTheater(center.lat, center.lng)) {
      return centerDistanceDeg(center, view) <= radius + 10;
    }
    return centerDistanceDeg(center, view) <= radius;
  });

  return filtered.slice(0, maxCount);
}

/** 글로벌 개요에서도 작전 박스 밖(아시아 표류 등)은 제외 */
export function filterNeptunThreatsInOpsBox<T extends NeptunLiveThreat | NeptunArchivedThreat>(
  threats: T[],
  maxCount: number,
): T[] {
  if (maxCount <= 0) return [];
  return threats.filter(isThreatInOpsBox).slice(0, maxCount);
}

export function neptunShowsProjection(mode: NeptunRenderMode): boolean {
  return mode === "low" || mode === "elevated";
}

export function neptunShowsPaths(mode: NeptunRenderMode): boolean {
  return mode === "flat" || mode === "low" || mode === "elevated";
}

export function neptunShowsMarkers(mode: NeptunRenderMode): boolean {
  return mode !== "hidden";
}
