import type { StaticPoint } from "@/data/geoTypes";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  MILITARY_BASE_AREA_MAX_BY_TIER,
  RESOURCE_POINT_MAX_BY_TIER,
  STATIC_POINT_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { HTML_STATIC_KINDS, isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import { getZoomOutScale } from "@/lib/zoomScale";

type ViewState = { lat: number; lng: number };

function bboxNearView(point: StaticPoint, view: ViewState, radiusDeg: number): boolean {
  if (radiusDeg <= 0) return true;
  const latDistance = Math.abs(view.lat - point.lat);
  const lngDistance = Math.abs(view.lng - point.lng);
  return Math.sqrt(latDistance ** 2 + lngDistance ** 2) <= radiusDeg;
}

/** 전역 줌에서도 항상 표시 — 전략 병목·물류 거점 */
const PINNED_STATIC_KINDS = new Set<StaticPoint["kind"]>([
  "chokepoint",
  "logistics-hub",
  "submarine-tunnel",
  "critical-node",
]);

function isResourceLikeKind(kind: StaticPoint["kind"]): boolean {
  if (kind === "resource") return true;
  // GEM 시설은 kind가 gem-* — 예전엔 others로 분류되어 global에서 전부 잘림
  return typeof kind === "string" && kind.startsWith("gem-");
}

export function filterStaticPointsForView(
  points: StaticPoint[],
  view: ViewState,
  tier: GlobeLodTier,
  radiusDeg: number,
): StaticPoint[] {
  const pinned: StaticPoint[] = [];
  const military: StaticPoint[] = [];
  const resources: StaticPoint[] = [];
  const others: StaticPoint[] = [];
  for (const point of points) {
    if (PINNED_STATIC_KINDS.has(point.kind)) pinned.push(point);
    else if (point.kind === "military-base") military.push(point);
    else if (isResourceLikeKind(point.kind)) resources.push(point);
    else others.push(point);
  }

  const visibleOthers: StaticPoint[] = [];
  const otherMax = STATIC_POINT_MAX_BY_TIER[tier];
  // global에서도 카메라 주변만이 아니라 전역 샘플을 일부 보여 줌아웃 ON이 죽지 않게
  const otherRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 52) : radiusDeg;
  if (otherMax > 0) {
    for (const point of others) {
      if (otherRadius > 0 && !bboxNearView(point, view, otherRadius)) continue;
      visibleOthers.push(point);
      if (visibleOthers.length >= otherMax) break;
    }
  }

  const resourceMax = RESOURCE_POINT_MAX_BY_TIER[tier];
  const resourceRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 48) : radiusDeg;
  const visibleResources: StaticPoint[] = [];
  if (resourceMax > 0) {
    for (const point of resources) {
      if (resourceRadius > 0 && !bboxNearView(point, view, resourceRadius)) continue;
      visibleResources.push(point);
      if (visibleResources.length >= resourceMax) break;
    }
  }

  const militaryMax = MILITARY_BASE_AREA_MAX_BY_TIER[tier];
  const militaryRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 55) : radiusDeg;
  const visibleMilitary: StaticPoint[] = [];
  if (militaryMax > 0) {
    for (const point of military) {
      if (militaryRadius > 0 && !bboxNearView(point, view, militaryRadius)) continue;
      visibleMilitary.push(point);
      if (visibleMilitary.length >= militaryMax) break;
    }
  }

  return [...pinned, ...visibleResources, ...visibleOthers, ...visibleMilitary];
}

export const STATIC_POINT_COLORS: Record<StaticPoint["kind"], string> = {
  airport: "rgba(163, 230, 53, 0.88)",
  port: "rgba(37, 99, 235, 0.88)",
  resource: "rgba(251, 191, 36, 0.92)",
  "military-base": "rgba(59, 130, 246, 0.92)",
  "cable-landing": "rgba(167, 139, 250, 0.9)",
  "nuclear-site": "rgba(250, 204, 21, 0.92)",
  "internet-exchange": "rgba(45, 212, 191, 0.88)",
  "refugee-camp": "rgba(251, 146, 60, 0.9)",
  "ucdp-event": "rgba(248, 113, 113, 0.88)",
  "ai-data-center": "rgba(59, 130, 246, 0.92)",
  "economic-center": "rgba(52, 211, 153, 0.9)",
  "sanctions-entity": "rgba(244, 114, 182, 0.9)",
  "space-launch": "rgba(96, 165, 250, 0.9)",
  "lng-terminal": "rgba(251, 146, 60, 0.92)",
  chokepoint: "rgba(251, 113, 133, 0.95)",
  "logistics-hub": "rgba(244, 63, 94, 0.92)",
  "submarine-tunnel": "rgba(125, 211, 252, 0.95)",
  "critical-node": "rgba(250, 204, 21, 0.95)",
  "gem-coal-plant": "rgba(120, 113, 108, 0.95)",
  "gem-coal-mine": "rgba(68, 64, 60, 0.95)",
  "gem-coal-terminal": "rgba(168, 162, 158, 0.92)",
  "gem-nuclear": "rgba(250, 204, 21, 0.95)",
  "gem-solar": "rgba(245, 158, 11, 0.92)",
  "gem-wind": "rgba(34, 211, 238, 0.92)",
  "gem-hydro": "rgba(14, 165, 233, 0.92)",
  "gem-geothermal": "rgba(251, 113, 133, 0.9)",
  "gem-bioenergy": "rgba(74, 222, 128, 0.9)",
  "gem-oil-gas-plant": "rgba(249, 115, 22, 0.92)",
  "gem-oil-gas-extraction": "rgba(217, 119, 6, 0.92)",
  "gem-iron-ore": "rgba(185, 28, 28, 0.9)",
  "gem-cement": "rgba(163, 163, 163, 0.92)",
  "gem-steel": "rgba(100, 116, 139, 0.92)",
  "gem-chemical": "rgba(168, 85, 247, 0.9)",
};

/** HTML 실루엣 마커 kinds — globe points와 이중 렌더 금지 */
export const STATIC_EMOJI_KINDS = HTML_STATIC_KINDS;

/** @deprecated 원형 SVG 배지 사용 — 호환용 심볼만 유지 */
export const STATIC_POINT_EMOJI: Record<"airport" | "port" | "military-base", string> = {
  airport: "✈️",
  port: "⚓️",
  "military-base": "🇺🇸",
};

export const STATIC_MARKER_PALETTE: Record<
  "airport" | "port" | "military-base",
  { fill: string; glow: string; ink: string; rim: string }
> = {
  airport: {
    fill: "rgba(163, 230, 53, 0.92)",
    glow: "rgba(163, 230, 53, 0.45)",
    ink: "rgba(255, 255, 255, 0.98)",
    rim: "rgba(236, 252, 203, 0.7)",
  },
  port: {
    fill: "rgba(37, 99, 235, 0.92)",
    glow: "rgba(59, 130, 246, 0.5)",
    ink: "rgba(255, 255, 255, 0.98)",
    rim: "rgba(147, 197, 253, 0.65)",
  },
  "military-base": {
    fill: "rgba(37, 99, 235, 0.28)",
    glow: "rgba(59, 130, 246, 0.55)",
    ink: "rgba(239, 246, 255, 0.98)",
    rim: "rgba(147, 197, 253, 0.72)",
  },
};

export function isEmojiStaticKind(kind: StaticPoint["kind"]): boolean {
  return isHtmlStaticKind(kind);
}

export function staticPointRadius(kind: StaticPoint["kind"], altitude = 1): number {
  const map: Record<StaticPoint["kind"], number> = {
    airport: 0.18,
    port: 0.19,
    resource: 0.2,
    "military-base": 0.26,
    "cable-landing": 0.18,
    "nuclear-site": 0.22,
    "internet-exchange": 0.18,
    "refugee-camp": 0.2,
    "ucdp-event": 0.17,
    "ai-data-center": 0.2,
    "economic-center": 0.21,
    "sanctions-entity": 0.18,
    "space-launch": 0.22,
    "lng-terminal": 0.21,
    chokepoint: 0.28,
    "logistics-hub": 0.26,
    "submarine-tunnel": 0.27,
    "critical-node": 0.3,
    "gem-coal-plant": 0.2,
    "gem-coal-mine": 0.2,
    "gem-coal-terminal": 0.2,
    "gem-nuclear": 0.22,
    "gem-solar": 0.18,
    "gem-wind": 0.18,
    "gem-hydro": 0.2,
    "gem-geothermal": 0.19,
    "gem-bioenergy": 0.19,
    "gem-oil-gas-plant": 0.2,
    "gem-oil-gas-extraction": 0.19,
    "gem-iron-ore": 0.2,
    "gem-cement": 0.19,
    "gem-steel": 0.2,
    "gem-chemical": 0.19,
  };
  return map[kind] * getZoomOutScale(altitude);
}
