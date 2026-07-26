import type { StaticPoint } from "@/data/geoTypes";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  MILITARY_BASE_AREA_MAX_BY_TIER,
  RESOURCE_POINT_MAX_BY_TIER,
  STATIC_POINT_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { HTML_STATIC_KINDS, isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import {
  markerPaletteForGroup,
  staticKindColorGroup,
  staticKindRgba,
} from "@/lib/layerColorGroups";
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

/**
 * kind별 공평 배분(라운드로빈) 선택.
 *
 * 예전에는 merge 순서 선착순으로 상한을 채워, 공항(수천 개)이 켜져 있으면
 * 뒤에 병합되는 kind(제재 대상·우주 발사·IXP 등)는 체크해도 슬롯이 없어
 * "켰는데 안 나옴"이 됐다. kind마다 번갈아 뽑아 모든 ON 레이어가
 * 최소한 일부라도 보이게 한다.
 */
export function pickFairByKind<T extends StaticPoint>(
  points: T[],
  view: ViewState,
  radiusDeg: number,
  max: number,
): T[] {
  if (max <= 0) return [];
  const inView =
    radiusDeg > 0 ? points.filter((p) => bboxNearView(p, view, radiusDeg)) : points;
  if (inView.length <= max) return inView;

  const byKind = new Map<string, T[]>();
  for (const point of inView) {
    const bucket = byKind.get(point.kind);
    if (bucket) bucket.push(point);
    else byKind.set(point.kind, [point]);
  }
  if (byKind.size <= 1) return inView.slice(0, max);

  const kinds = [...byKind.keys()];
  const cursors = new Map<string, number>(kinds.map((k) => [k, 0]));
  const out: T[] = [];
  while (out.length < max) {
    let advanced = false;
    for (const kind of kinds) {
      const bucket = byKind.get(kind)!;
      const cursor = cursors.get(kind)!;
      if (cursor < bucket.length) {
        out.push(bucket[cursor]);
        cursors.set(kind, cursor + 1);
        advanced = true;
        if (out.length >= max) break;
      }
    }
    if (!advanced) break;
  }
  return out;
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

  // global에서도 카메라 주변만이 아니라 전역 샘플을 일부 보여 줌아웃 ON이 죽지 않게.
  // kind별 라운드로빈 — 선착순 상한이 뒤 순서 레이어를 굶기던 문제 수정.
  const otherRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 52) : radiusDeg;
  const visibleOthers = pickFairByKind(
    others,
    view,
    otherRadius,
    STATIC_POINT_MAX_BY_TIER[tier],
  );

  const resourceRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 48) : radiusDeg;
  const visibleResources = pickFairByKind(
    resources,
    view,
    resourceRadius,
    RESOURCE_POINT_MAX_BY_TIER[tier],
  );

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
  airport: staticKindRgba("airport"),
  port: staticKindRgba("port"),
  resource: staticKindRgba("resource"),
  "military-base": staticKindRgba("military-base"),
  "cable-landing": staticKindRgba("cable-landing"),
  "nuclear-site": staticKindRgba("nuclear-site"),
  "internet-exchange": staticKindRgba("internet-exchange"),
  "refugee-camp": staticKindRgba("refugee-camp"),
  "ucdp-event": staticKindRgba("ucdp-event"),
  "ai-data-center": staticKindRgba("ai-data-center"),
  "economic-center": staticKindRgba("economic-center"),
  "sanctions-entity": staticKindRgba("sanctions-entity"),
  "space-launch": staticKindRgba("space-launch"),
  "lng-terminal": staticKindRgba("lng-terminal"),
  chokepoint: staticKindRgba("chokepoint"),
  "logistics-hub": staticKindRgba("logistics-hub"),
  "submarine-tunnel": staticKindRgba("submarine-tunnel"),
  "critical-node": staticKindRgba("critical-node"),
  "gem-coal-plant": staticKindRgba("gem-coal-plant"),
  "gem-coal-mine": staticKindRgba("gem-coal-mine"),
  "gem-coal-terminal": staticKindRgba("gem-coal-terminal"),
  "gem-nuclear": staticKindRgba("gem-nuclear"),
  "gem-solar": staticKindRgba("gem-solar"),
  "gem-wind": staticKindRgba("gem-wind"),
  "gem-hydro": staticKindRgba("gem-hydro"),
  "gem-geothermal": staticKindRgba("gem-geothermal"),
  "gem-bioenergy": staticKindRgba("gem-bioenergy"),
  "gem-oil-gas-plant": staticKindRgba("gem-oil-gas-plant"),
  "gem-oil-gas-extraction": staticKindRgba("gem-oil-gas-extraction"),
  "gem-iron-ore": staticKindRgba("gem-iron-ore"),
  "gem-cement": staticKindRgba("gem-cement"),
  "gem-steel": staticKindRgba("gem-steel"),
  "gem-chemical": staticKindRgba("gem-chemical"),
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
  airport: markerPaletteForGroup(staticKindColorGroup("airport")),
  port: markerPaletteForGroup(staticKindColorGroup("port")),
  "military-base": markerPaletteForGroup(staticKindColorGroup("military-base")),
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
    "lng-terminal": 0.28,
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
