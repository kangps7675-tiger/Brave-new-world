"use client";

import { useMemo } from "react";
import type { AisVessel, MilitaryAircraft, UsCarrier } from "@/data/geoTypes";
import { chokeGlowRingSeed } from "@/data/logisticsRiskPoints";
import { mergeCarriersWithAisPositions } from "@/lib/aisCarrierMatch";
import type { GlobeLodTier } from "@/lib/globeLod";
import { isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import {
  liveAirTrafficDisplayMax,
  liveAisDisplayMax,
  liveMilDisplayMax,
} from "@/lib/liveRenderGuard";
import { pickFairByKind } from "@/lib/staticGlobe";
import {
  carrierLabelOffsets,
  filterVisibleCarriers,
  isOperationalCarrier,
} from "@/lib/usCarrierMarkers";
import { VIEWPORT_RADIUS_BY_TIER, pickInViewOrNearest } from "@/lib/viewportCull";
import { useIncidentVessels } from "@/components/globe/hooks/useIncidentVessels";
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
  /** AIS 세부 필터 — 군함 / 상선·민간 (기본 둘 다 켜짐) */
  showAisMilitary?: boolean;
  showAisCommercial?: boolean;
  showDisguisedVessels: boolean;
  milAircraft: MilitaryAircraft[];
  civAircraft: MilitaryAircraft[];
  globeLodTier: GlobeLodTier;
  layerViewState: ViewState;
  /** Ultra-Lite — HTML 마커 상한을 추가로 낮춘다 (liveRenderGuard.applyUltraLite) */
  ultraLite?: boolean;
};

const AIS_WORLD_RADIUS_DEG = 400; // 뷰포트 컷 해제 — 선박은 symbol 레이어라 3000척까지 전 지구를 그린다

export function useLiveOverlayMarkers(opts: UseLiveOverlayMarkersOptions) {
  const {
    staticGlobePoints,
    showLogisticsRisk,
    usCarriers,
    aisVessels,
    disguisedVessels,
    isEconomyViewer,
    showUsCarriers,
    showGpsInterference = false,
    chokeGlowColorById,
    showAis,
    showAisMilitary = true,
    showAisCommercial = true,
    showDisguisedVessels,
    showMilitaryActivity,
    showAirTraffic,
    milAircraft,
    civAircraft,
    globeLodTier,
    layerViewState,
    ultraLite,
  } = opts;
  // AIS·ADS-B는 지정학 지도(MapLibre)에서만 그린다. 세슘(위성)은 지도 레이어를 그리지 않는다.

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

  // ADS-B(군용) — 지정학 지도 심볼 레이어. 3,000대까지 화면 안(없으면 가까운 순)으로 추린다.
  const milDisplayPoints = useMemo<MilGlobePoint[]>(
    () =>
      showMilitaryActivity
        ? pickInViewOrNearest(
            milAircraft,
            layerViewState,
            VIEWPORT_RADIUS_BY_TIER[globeLodTier] + 4,
            liveMilDisplayMax(globeLodTier, ultraLite),
          ).map((aircraft) => ({
            ...aircraft,
            markerId: `mil-${aircraft.hex || aircraft.id}`,
            displayKind: "mil" as const,
          }))
        : [],
    [globeLodTier, layerViewState, milAircraft, showMilitaryActivity, ultraLite],
  );

  /*
   * milHtmlMarkers / civHtmlMarkers 는 제거됨.
   * 항공기는 DOM Marker가 아니라 symbol 레이어로 그린다 (milAircraftSymbols.ts) —
   * GlobeDashboard가 milDisplayPoints/civDisplayPoints 를 직접 받아
   * buildAircraftSymbolModel 에 넘긴다. 사본을 만들 이유가 없어졌다.
   */

  // ADS-B(민간) — 지정학 지도 심볼 레이어.
  const civDisplayPoints = useMemo<MilitaryAircraft[]>(
    () =>
      showAirTraffic
        ? pickInViewOrNearest(
            civAircraft,
            layerViewState,
            VIEWPORT_RADIUS_BY_TIER[globeLodTier] + 4,
            liveAirTrafficDisplayMax(globeLodTier, ultraLite),
          )
        : [],
    [civAircraft, globeLodTier, layerViewState, showAirTraffic, ultraLite],
  );

  // AIS — 지정학 지도(MapLibre) 전용. 모드는 하나라 군함·상선을 모두 보이고,
  // 군/민 세부 토글(showAisMilitary/showAisCommercial)로만 거른다. 바닷길 보기도 같은 경로.
  const incidentVessels = useIncidentVessels(showAis);
  const aisDisplayPoints = useMemo<AisGlobePoint[]>(() => {
    // 군·민 세부 토글이 둘 다 꺼진 저장값은 의도된 상태가 아니다 — 전부 걸러 빈 화면이 되므로 둘 다 켠 것으로 본다
    const subBothOff = !showAisMilitary && !showAisCommercial;
    const live = showAis
      ? pickInViewOrNearest(
          aisVessels
            .filter((vessel) => !carrierAisMerge.matchedMmsi.has(vessel.mmsi))
            .filter((vessel) =>
              subBothOff || (vessel.category === "military" ? showAisMilitary : showAisCommercial),
            ),
          layerViewState,
          AIS_WORLD_RADIUS_DEG,
          liveAisDisplayMax(globeLodTier, ultraLite),
        )
      : [];
    const disguised = showDisguisedVessels
      ? pickInViewOrNearest(
          disguisedVessels,
          layerViewState,
          VIEWPORT_RADIUS_BY_TIER[globeLodTier] + 12,
          liveAisDisplayMax(globeLodTier, ultraLite),
        )
      : [];
    // 사건에 걸린 배는 필터·개수 컷과 상관없이 항상 넣고(같은 MMSI 는 사건 쪽으로 교체) incident 표시를 단다
    const incidentMmsi = new Set(incidentVessels.map((v) => v.mmsi));
    const seen = new Set(live.map((v) => v.mmsi));
    const base = [...live, ...disguised.filter((v) => !seen.has(v.mmsi))].filter((v) => !incidentMmsi.has(v.mmsi));
    return [...base, ...(showAis ? incidentVessels : [])].map((vessel) => ({
      ...vessel,
      markerId: vessel.disguised ? `disguised-${vessel.mmsi}` : `ais-${vessel.mmsi}`,
      displayKind: "ais" as const,
    }));
  }, [
    aisVessels,
    carrierAisMerge.matchedMmsi,
    disguisedVessels,
    globeLodTier,
    incidentVessels,
    layerViewState,
    showAis,
    showAisCommercial,
    showAisMilitary,
    showDisguisedVessels,
    ultraLite,
  ]);

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
