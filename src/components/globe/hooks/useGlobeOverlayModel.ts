"use client";

import { useMemo } from "react";
import type { ScoredEvent } from "@/data/eventTiers";
import type { TransportPath } from "@/data/geoTypes";
import { deconflictTheaterHtmlOverlays } from "@/lib/htmlOverlayDeconflict";
import type { GlobePoint, HtmlOverlayMarker } from "@/components/globe/types";

export type UseGlobeOverlayModelOptions = {
  /** globePoints inputs */
  gdeltTierPins: ScoredEvent[];
  scoredCyberEvents: ScoredEvent[];
  scoredElectionEvents: ScoredEvent[];
  showCyberIncidents: boolean;
  showElectionEvents: boolean;

  /** rawGlobePaths inputs — already-computed per-feature path arrays */
  visibleDisputeBoundaries: TransportPath[];
  visibleLsibBoundary: TransportPath[];
  disputeZonePaths: TransportPath[];
  frictionWarZonePaths: TransportPath[];
  eastAsiaAdizPaths: TransportPath[];
  plaIncursionHeatPaths: TransportPath[];
  axisNetworkPaths: TransportPath[];
  briTradePaths: TransportPath[];
  usDfcSupplyPaths: TransportPath[];
  visibleShipping: TransportPath[];
  visibleCables: TransportPath[];
  visibleOilPipelines: TransportPath[];
  visibleGasPipelines: TransportPath[];
  visibleSubseaPipelines: TransportPath[];
  railPaths: TransportPath[];
  armsEmbargoFramePaths: TransportPath[];
  ukmtoHatchPaths: TransportPath[];
  navareaHatchPaths: TransportPath[];
  exerciseHatchPaths: TransportPath[];
  shipMoveTrailPaths: TransportPath[];

  /** htmlOverlayMarkers inputs — already-computed per-feature HTML marker arrays */
  airportPortHtmlMarkers: HtmlOverlayMarker[];
  situationCalloutMarkers: HtmlOverlayMarker[];
  visibleCasualtySkullMarkers: HtmlOverlayMarker[];
  nuclearStockpileMarkers: HtmlOverlayMarker[];
  safecastGaugeMarkers: HtmlOverlayMarker[];
  ukraineSettlementHtmlMarkers: HtmlOverlayMarker[];
  usCarrierHtmlMarkers: HtmlOverlayMarker[];
  milHtmlMarkers: HtmlOverlayMarker[];
  civHtmlMarkers: HtmlOverlayMarker[];
  aisHtmlMarkers: HtmlOverlayMarker[];
  gdeltTagHtmlMarkers: HtmlOverlayMarker[];
  ukraineGdeltNeonMarkers: HtmlOverlayMarker[];
  newsStreamNeonMarkers: HtmlOverlayMarker[];
  telegramNeonMarkers: HtmlOverlayMarker[];
  neptunHtmlMarkers: HtmlOverlayMarker[];
  neptunImpactHtmlMarkers: HtmlOverlayMarker[];
  frictionPinMarkers: HtmlOverlayMarker[];
  frictionStageMarkers: HtmlOverlayMarker[];
  exerciseHtmlMarkers: HtmlOverlayMarker[];
  financialHubMarkers: HtmlOverlayMarker[];
  reefWatchFeatureMarkers: HtmlOverlayMarker[];
  reefWatchTrafficMarkers: HtmlOverlayMarker[];
  shipMoveHtmlMarkers: HtmlOverlayMarker[];
  chinaTheaterIncidentMarkers: HtmlOverlayMarker[];
  koreaMissileIncidentMarkers: HtmlOverlayMarker[];
  russiaStrikeIncidentMarkers: HtmlOverlayMarker[];
  reconSatelliteMarkers: HtmlOverlayMarker[];
};

export type UseGlobeOverlayModelResult = {
  globePoints: GlobePoint[];
  rawGlobePaths: TransportPath[];
  htmlOverlayMarkers: HtmlOverlayMarker[];
};

/**
 * Extracted from GlobeDashboard.tsx (Stage 3 refactor): the "assembly" memos
 * that combine dozens of already-computed per-feature point/path/marker
 * arrays into the three top-level collections the globe/map renderer
 * consumes (`globePoints`, `rawGlobePaths`, `htmlOverlayMarkers`).
 *
 * NOTE — scope of this extraction: only the *combining* memos moved here.
 * The ~25 upstream per-feature memos that produce the individual marker
 * arrays (situationCalloutMarkers, nuclearStockpileMarkers,
 * casualtySkullMarkers, ukraineSettlementHtmlMarkers, etc.) remain in
 * GlobeDashboard.tsx because they are deeply entangled with dashboard-local
 * state (hover/selection, language, viewport, live polling results, feature
 * toggles) and were not safe to move mechanically without behavior risk.
 * A future stage could peel those off individually (similar to how
 * useLiveOverlayMarkers.ts already handles the carrier/mil/civ/ais cluster).
 */
export function useGlobeOverlayModel(options: UseGlobeOverlayModelOptions): UseGlobeOverlayModelResult {
  const {
    gdeltTierPins,
    scoredCyberEvents,
    scoredElectionEvents,
    showCyberIncidents,
    showElectionEvents,

    visibleDisputeBoundaries,
    visibleLsibBoundary,
    disputeZonePaths,
    frictionWarZonePaths,
    eastAsiaAdizPaths,
    plaIncursionHeatPaths,
    axisNetworkPaths,
    briTradePaths,
    usDfcSupplyPaths,
    visibleShipping,
    visibleCables,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleSubseaPipelines,
    railPaths,
    armsEmbargoFramePaths,
    ukmtoHatchPaths,
    navareaHatchPaths,
    exerciseHatchPaths,
    shipMoveTrailPaths,

    airportPortHtmlMarkers,
    situationCalloutMarkers,
    visibleCasualtySkullMarkers,
    nuclearStockpileMarkers,
    safecastGaugeMarkers,
    ukraineSettlementHtmlMarkers,
    usCarrierHtmlMarkers,
    milHtmlMarkers,
    civHtmlMarkers,
    aisHtmlMarkers,
    gdeltTagHtmlMarkers,
    ukraineGdeltNeonMarkers,
    newsStreamNeonMarkers,
    telegramNeonMarkers,
    neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
    frictionPinMarkers,
    frictionStageMarkers,
    exerciseHtmlMarkers,
    financialHubMarkers,
    reefWatchFeatureMarkers,
    reefWatchTrafficMarkers,
    shipMoveHtmlMarkers,
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    russiaStrikeIncidentMarkers,
    reconSatelliteMarkers,
  } = options;

  const globePoints = useMemo<GlobePoint[]>(() => {
    const core = gdeltTierPins.map((event) => ({
      ...event,
      markerId: `marker-${event.id}`,
      displayKind: "event" as const,
    }));

    const themed: GlobePoint[] = [];
    if (showCyberIncidents) {
      for (const event of scoredCyberEvents) {
        themed.push({
          ...event,
          markerId: `cyber-${event.id}`,
          displayKind: "event" as const,
        });
      }
    }
    if (showElectionEvents) {
      for (const event of scoredElectionEvents) {
        themed.push({
          ...event,
          markerId: `election-${event.id}`,
          displayKind: "event" as const,
        });
      }
    }

    return [...core, ...themed];
  }, [
    gdeltTierPins,
    scoredCyberEvents,
    scoredElectionEvents,
    showCyberIncidents,
    showElectionEvents,
  ]);

  const rawGlobePaths = useMemo<TransportPath[]>(
    () => [
      ...visibleDisputeBoundaries,
      ...visibleLsibBoundary,
      ...disputeZonePaths,
      ...frictionWarZonePaths,
      ...eastAsiaAdizPaths,
      ...plaIncursionHeatPaths,
      ...axisNetworkPaths,
      ...briTradePaths,
      ...usDfcSupplyPaths,
      ...visibleShipping,
      ...visibleCables,
      ...visibleOilPipelines,
      ...visibleGasPipelines,
      ...visibleSubseaPipelines,
      ...railPaths,
      ...armsEmbargoFramePaths,
      ...ukmtoHatchPaths,
      ...navareaHatchPaths,
      ...exerciseHatchPaths,
      ...shipMoveTrailPaths,
    ],
    [
      armsEmbargoFramePaths,
      axisNetworkPaths,
      briTradePaths,
      usDfcSupplyPaths,
      disputeZonePaths,
      eastAsiaAdizPaths,
      plaIncursionHeatPaths,
      frictionWarZonePaths,
      railPaths,
      ukmtoHatchPaths,
      navareaHatchPaths,
      exerciseHatchPaths,
      shipMoveTrailPaths,
      visibleCables,
      visibleDisputeBoundaries,
      visibleLsibBoundary,
      visibleGasPipelines,
      visibleOilPipelines,
      visibleSubseaPipelines,
      visibleShipping,
    ],
  );

  const htmlOverlayMarkers = useMemo<HtmlOverlayMarker[]>(() => {
    const markers: HtmlOverlayMarker[] = [
      ...globePoints,
      ...airportPortHtmlMarkers,
      ...situationCalloutMarkers,
      ...visibleCasualtySkullMarkers,
      ...nuclearStockpileMarkers,
      ...safecastGaugeMarkers,
      ...ukraineSettlementHtmlMarkers,
      ...usCarrierHtmlMarkers,
      ...milHtmlMarkers,
      ...civHtmlMarkers,
      ...aisHtmlMarkers,
      ...gdeltTagHtmlMarkers,
      ...ukraineGdeltNeonMarkers,
      ...newsStreamNeonMarkers,
      ...telegramNeonMarkers,
      ...neptunHtmlMarkers,
      ...neptunImpactHtmlMarkers,
      ...frictionPinMarkers,
      ...frictionStageMarkers,
      ...exerciseHtmlMarkers,
      ...financialHubMarkers,
      ...reefWatchFeatureMarkers,
      ...reefWatchTrafficMarkers,
      ...shipMoveHtmlMarkers,
      ...chinaTheaterIncidentMarkers,
      ...koreaMissileIncidentMarkers,
      ...russiaStrikeIncidentMarkers,
      ...reconSatelliteMarkers,
    ];
    // MapLibre는 htmlAltitude 미지원 — 사망자·콜아웃·뉴스네온이 한 좌표에 묶이지 않게 분리
    return deconflictTheaterHtmlOverlays(markers);
  }, [
    aisHtmlMarkers,
    airportPortHtmlMarkers,
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    russiaStrikeIncidentMarkers,
    reconSatelliteMarkers,
    visibleCasualtySkullMarkers,
    exerciseHtmlMarkers,
    financialHubMarkers,
    reefWatchFeatureMarkers,
    reefWatchTrafficMarkers,
    frictionPinMarkers,
    frictionStageMarkers,
    shipMoveHtmlMarkers,
    gdeltTagHtmlMarkers,
    ukraineGdeltNeonMarkers,
    newsStreamNeonMarkers,
    telegramNeonMarkers,
    globePoints,
    milHtmlMarkers,
    civHtmlMarkers,
    neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
    nuclearStockpileMarkers,
    safecastGaugeMarkers,
    situationCalloutMarkers,
    ukraineSettlementHtmlMarkers,
    usCarrierHtmlMarkers,
  ]);

  return { globePoints, rawGlobePaths, htmlOverlayMarkers };
}
