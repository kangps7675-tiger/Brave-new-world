"use client";

import { useMemo } from "react";
import type { AisVessel, MilitaryAircraft, UsCarrier } from "@/data/geoTypes";
import { chokeGlowRingSeed } from "@/data/logisticsRiskPoints";
import { mergeCarriersWithAisPositions } from "@/lib/aisCarrierMatch";
import type { GlobeLodTier } from "@/lib/globeLod";
import { isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import {
  liveAisDisplayMax,
  liveAirTrafficDisplayMax,
  liveMilDisplayMax,
} from "@/lib/liveRenderGuard";
import { pickFairByKind } from "@/lib/staticGlobe";
import {
  carrierLabelOffsets,
  filterVisibleCarriers,
  isOperationalCarrier,
} from "@/lib/usCarrierMarkers";
import { VIEWPORT_RADIUS_BY_TIER, pickInViewOrNearest } from "@/lib/viewportCull";
import type {
  AisGlobePoint,
  AisHtmlMarker,
  MilGlobePoint,
  MilHtmlMarker,
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
    disguisedVessels,
    isEconomyViewer,
    showUsCarriers,
    showGpsInterference = false,
    showMilitaryActivity,
    showAirTraffic,
    showAis,
    showDisguisedVessels,
    milAircraft,
    civAircraft,
    globeLodTier,
    layerViewState,
    chokeGlowColorById,
    ultraLite = false,
  } = opts;

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

  const milDisplayPoints = useMemo<MilGlobePoint[]>(
    () =>
      !isEconomyViewer && showMilitaryActivity
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
    [globeLodTier, isEconomyViewer, layerViewState, milAircraft, showMilitaryActivity, ultraLite],
  );

  const milHtmlMarkers = useMemo<MilHtmlMarker[]>(
    () =>
      milDisplayPoints.map((aircraft) => ({
        ...aircraft,
        markerId: `mil-html-${aircraft.hex || aircraft.id}`,
        displayKind: "mil-html" as const,
      })),
    [milDisplayPoints],
  );

  const civDisplayPoints = useMemo(
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

  const civHtmlMarkers = useMemo<MilHtmlMarker[]>(
    () =>
      civDisplayPoints.map((aircraft) => ({
        ...aircraft,
        markerId: `civ-html-${aircraft.hex || aircraft.id}`,
        displayKind: "civ-html" as const,
      })),
    [civDisplayPoints],
  );

  const aisDisplayPoints = useMemo<AisGlobePoint[]>(() => {
    const civilianOnly = isEconomyViewer
      ? (v: AisVessel) => v.category !== "military"
      : () => true;
    const live = showAis
      ? pickInViewOrNearest(
          aisVessels
            .filter((vessel) => !carrierAisMerge.matchedMmsi.has(vessel.mmsi))
            .filter(civilianOnly),
          layerViewState,
          VIEWPORT_RADIUS_BY_TIER[globeLodTier] + 6,
          liveAisDisplayMax(globeLodTier, ultraLite),
        )
      : [];
    // 지경학: 위장·무기고 선박 제외 (경제=민간·물류만)
    const disguised =
      !isEconomyViewer && showDisguisedVessels
        ? pickInViewOrNearest(
            disguisedVessels,
            layerViewState,
            VIEWPORT_RADIUS_BY_TIER[globeLodTier] + 12,
            liveAisDisplayMax(globeLodTier, ultraLite),
          )
        : [];
    const seen = new Set(live.map((v) => v.mmsi));
    return [...live, ...disguised.filter((v) => !seen.has(v.mmsi))].map((vessel) => ({
      ...vessel,
      markerId: vessel.disguised ? `disguised-${vessel.mmsi}` : `ais-${vessel.mmsi}`,
      displayKind: "ais" as const,
    }));
  }, [
    aisVessels,
    carrierAisMerge.matchedMmsi,
    disguisedVessels,
    globeLodTier,
    isEconomyViewer,
    layerViewState,
    showAis,
    showDisguisedVessels,
    ultraLite,
  ]);

  const aisHtmlMarkers = useMemo<AisHtmlMarker[]>(
    () =>
      aisDisplayPoints.map((vessel) => ({
        ...vessel,
        markerId: `ais-html-${vessel.mmsi}`,
        displayKind: "ais-html" as const,
      })),
    [aisDisplayPoints],
  );

  return {
    airportPortHtmlMarkers,
    chokeGlowRings,
    carrierAisMerge,
    visibleUsCarriers,
    deployedCarrierCount,
    usCarrierLabelOffsets,
    usCarrierHtmlMarkers,
    milDisplayPoints,
    milHtmlMarkers,
    civDisplayPoints,
    civHtmlMarkers,
    aisDisplayPoints,
    aisHtmlMarkers,
  };
}
