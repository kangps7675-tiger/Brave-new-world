"use client";

import { useMemo } from "react";
import type { AisVessel, MilitaryAircraft, UsCarrier } from "@/data/geoTypes";
import { chokeGlowRingSeed } from "@/data/logisticsRiskPoints";
import { mergeCarriersWithAisPositions } from "@/lib/aisCarrierMatch";
import type { GlobeLodTier } from "@/lib/globeLod";
import { isHtmlStaticKind } from "@/lib/infraStaticMarkers";
// liveAisDisplayMax/liveAirTrafficDisplayMax/liveMilDisplayMax — MapLibre 심볼 레이어 제거로 더 이상 사용 안 함 (Cesium 쪽에서 자체 상한 관리)
import { pickFairByKind } from "@/lib/staticGlobe";
import {
  carrierLabelOffsets,
  filterVisibleCarriers,
  isOperationalCarrier,
} from "@/lib/usCarrierMarkers";
// VIEWPORT_RADIUS_BY_TIER/pickInViewOrNearest — MapLibre 심볼 레이어 제거로 더 이상 사용 안 함
import type {
  AisGlobePoint,
  MilGlobePoint,
  PulseRingPoint,
  StaticGlobePoint,
  UsCarrierHtmlMarker,
  ViewState,
} from "@/components/globe/types";
import { INFRA_HTML_MARKER_CAP } from "@/components/globe/constants";

export type UseLiveOverlayMarkersOptions = {
  staticGlobePoints: StaticGlobePoint[];
  showLogisticsRisk: boolean;
  /** id → CSS color for choke glow rings (stress palette) */
  chokeGlowColorById?: Record<string, string>;
  usCarriers: UsCarrier[];
  aisVessels: AisVessel[];
  disguisedVessels: AisVessel[];
  isEconomyViewer: boolean;
  /** 항적 모드 — AIS 군·민 모두 */
  isLiveViewer?: boolean;
  showUsCarriers: boolean;
  /** GPSJam 솔로 — 작전중 항모 잔여 표시까지 완전 숨김 */
  showGpsInterference?: boolean;
  showMilitaryActivity: boolean;
  showAirTraffic: boolean;
  showAis: boolean;
  showDisguisedVessels: boolean;
  milAircraft: MilitaryAircraft[];
  civAircraft: MilitaryAircraft[];
  globeLodTier: GlobeLodTier;
  layerViewState: ViewState;
  /** Ultra-Lite — HTML 마커 상한을 추가로 낮춘다 (liveRenderGuard.applyUltraLite) */
  ultraLite?: boolean;
};

export function useLiveOverlayMarkers(opts: UseLiveOverlayMarkersOptions) {
  const {
    staticGlobePoints,
    showLogisticsRisk,
    usCarriers,
    aisVessels,
    isEconomyViewer,
    showUsCarriers,
    showGpsInterference = false,
    chokeGlowColorById,
  } = opts;
  // ADS-B/AIS 표시 옵션(milAircraft·showAis 등)은 CesiumSatelliteGlobe로 일원화 —
  // 이 훅은 인프라 HTML·초크 글로우·항모만 담당. opts 타입은 호출부 호환용으로 유지.

  /** 인프라 HTML 실루엣 마커 (공항·항구·DC·핵·초크 등) — DOM 비용 때문에 강하게 캡 */
  const airportPortHtmlMarkers = useMemo<StaticGlobePoint[]>(() => {
    const html = staticGlobePoints.filter((point) => isHtmlStaticKind(point.kind));
    if (html.length <= INFRA_HTML_MARKER_CAP) return html;
    // 자원·에너지 마커가 공항·항구 뒤에 밀려 전부 잘리지 않도록 우선 확보
    const priorityKinds = new Set([
      "resource",
      "lng-terminal",
      "nuclear-site",
      "chokepoint",
      "logistics-hub",
      "critical-node",
    ]);
    const priority = html.filter((p) => priorityKinds.has(p.kind));
    const rest = html.filter((p) => !priorityKinds.has(p.kind));
    const priorityBudget = Math.min(
      priority.length,
      Math.max(36, Math.floor(INFRA_HTML_MARKER_CAP * 0.55)),
    );
    // kind별 라운드로빈 — 한 kind(예: 공항)가 예산을 독식해 다른 ON 레이어가
    // 안 보이던 문제 방지 (radius 0 = 뷰포트 필터는 상류에서 이미 적용됨)
    const centerView = { lat: 0, lng: 0 };
    const pickedPriority = pickFairByKind(priority, centerView, 0, priorityBudget);
    const restBudget = Math.max(0, INFRA_HTML_MARKER_CAP - pickedPriority.length);
    return [...pickedPriority, ...pickFairByKind(rest, centerView, 0, restBudget)];
  }, [staticGlobePoints]);

  const chokeGlowRings = useMemo<PulseRingPoint[]>(() => {
    if (!showLogisticsRisk) return [];
    return chokeGlowRingSeed(undefined, (id) => chokeGlowColorById?.[id]).map((p) => ({
      pulseKind: "choke-glow" as const,
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      glow: p.glow,
      radiusScale: p.radiusScale,
      markerId: `choke-glow-${p.id}`,
      ...(p.color ? { color: p.color } : {}),
    }));
  }, [showLogisticsRisk, chokeGlowColorById]);

  const carrierAisMerge = useMemo(
    () => mergeCarriersWithAisPositions(usCarriers, aisVessels),
    [aisVessels, usCarriers],
  );

  const visibleUsCarriers = useMemo(
    () =>
      isEconomyViewer || showGpsInterference
        ? []
        : filterVisibleCarriers(carrierAisMerge.carriers, showUsCarriers),
    [carrierAisMerge.carriers, isEconomyViewer, showGpsInterference, showUsCarriers],
  );

  const deployedCarrierCount = useMemo(
    () => usCarriers.filter(isOperationalCarrier).length,
    [usCarriers],
  );

  const usCarrierLabelOffsets = useMemo(
    () => carrierLabelOffsets(visibleUsCarriers),
    [visibleUsCarriers],
  );

  const usCarrierHtmlMarkers = useMemo<UsCarrierHtmlMarker[]>(
    () =>
      visibleUsCarriers.map((carrier) => ({
        ...carrier,
        markerId: `carrier-html-${carrier.id}`,
        displayKind: "us-carrier-html" as const,
      })),
    [visibleUsCarriers],
  );

  // ADS-B(군용) — MapLibre 심볼 레이어에서 제거, 관측(Cesium) 모드로 일원화 (CesiumSatelliteGlobe.tsx).
  const milDisplayPoints = useMemo<MilGlobePoint[]>(() => [], []);

  /*
   * milHtmlMarkers / civHtmlMarkers 는 제거됨.
   * 항공기는 DOM Marker가 아니라 symbol 레이어로 그린다 (milAircraftSymbols.ts) —
   * GlobeDashboard가 milDisplayPoints/civDisplayPoints 를 직접 받아
   * buildAircraftSymbolModel 에 넘긴다. 사본을 만들 이유가 없어졌다.
   */

  // ADS-B(민간) — MapLibre 심볼 레이어에서 제거, 관측(Cesium) 모드로 일원화.
  const civDisplayPoints = useMemo<MilitaryAircraft[]>(() => [], []);

  // AIS(군함·상선·위장선 전부) — MapLibre 심볼 레이어에서 제거, 관측(Cesium) 모드로 일원화.
  // 지정학/지경학/항적 3개 모드에서 각각 다르게 필터링하던 로직은 CesiumSatelliteGlobe로 이전.
  const aisDisplayPoints = useMemo<AisGlobePoint[]>(() => [], []);

  /*
   * aisHtmlMarkers 는 제거됨 (항공기와 동일 이유).
   * 선박도 이제 DOM Marker가 아니라 symbol 레이어로 그린다 (aisVesselSymbols.ts) —
   * MapGlobeView가 aisDisplayPoints를 직접 받아 buildAisSymbolModel에 넘긴다.
   */

  return {
    airportPortHtmlMarkers,
    chokeGlowRings,
    carrierAisMerge,
    visibleUsCarriers,
    deployedCarrierCount,
    usCarrierLabelOffsets,
    usCarrierHtmlMarkers,
    milDisplayPoints,
    civDisplayPoints,
    aisDisplayPoints,
  };
}
