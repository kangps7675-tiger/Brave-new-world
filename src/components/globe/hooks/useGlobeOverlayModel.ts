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
  territorialWarZonePaths: TransportPath[];
  eastAsiaAdizPaths: TransportPath[];
  plaIncursionHeatPaths: TransportPath[];
  axisNetworkPaths: TransportPath[];
  briTradePaths: TransportPath[];
  gtaTradePaths: TransportPath[];
  strategicCorridorBackgroundPaths: TransportPath[];
  strategicCorridorPaths: TransportPath[];
  alliedLogisticsCorridorPaths: TransportPath[];
  sanctionsEvasionCorridorPaths: TransportPath[];
  usDfcSupplyPaths: TransportPath[];
  crinkInfraPaths: TransportPath[];
  visibleShipping: TransportPath[];
  maritimeRoutePaths: TransportPath[];
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
  gevTrackPath: TransportPath | null;
  strategicSupportPaths: TransportPath[];

  /** htmlOverlayMarkers inputs — already-computed per-feature HTML marker arrays */
  airportPortHtmlMarkers: HtmlOverlayMarker[];
  situationCalloutMarkers: HtmlOverlayMarker[];
  visibleCasualtySkullMarkers: HtmlOverlayMarker[];
  nuclearStockpileMarkers: HtmlOverlayMarker[];
  ukraineSettlementHtmlMarkers: HtmlOverlayMarker[];
  usCarrierHtmlMarkers: HtmlOverlayMarker[];
  gdeltTagHtmlMarkers: HtmlOverlayMarker[];
  newsStreamNeonMarkers: HtmlOverlayMarker[];
  newsInsightCalloutMarkers: HtmlOverlayMarker[];
  telegramNeonMarkers: HtmlOverlayMarker[];
  neptunHtmlMarkers: HtmlOverlayMarker[];
  neptunImpactHtmlMarkers: HtmlOverlayMarker[];
  frictionPinMarkers: HtmlOverlayMarker[];
  frictionStageMarkers: HtmlOverlayMarker[];
  territorialPinMarkers: HtmlOverlayMarker[];
  territorialStageMarkers: HtmlOverlayMarker[];
  exerciseHtmlMarkers: HtmlOverlayMarker[];
  financialHubMarkers: HtmlOverlayMarker[];
  reefWatchFeatureMarkers: HtmlOverlayMarker[];
  reefWatchTrafficMarkers: HtmlOverlayMarker[];
  shipMoveHtmlMarkers: HtmlOverlayMarker[];
  chinaTheaterIncidentMarkers: HtmlOverlayMarker[];
  koreaMissileIncidentMarkers: HtmlOverlayMarker[];
  russiaStrikeIncidentMarkers: HtmlOverlayMarker[];
  europeDroneIncidentMarkers: HtmlOverlayMarker[];
  conflictEventMarkers: HtmlOverlayMarker[];
  reconSatelliteMarkers: HtmlOverlayMarker[];
  strategicPostureMarkers: HtmlOverlayMarker[];
  strategicOverviewCalloutMarkers: HtmlOverlayMarker[];
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
 * Upstream per-feature memos remain in GlobeDashboard (or cluster hooks like
 * useLiveOverlayMarkers). Aircraft/AIS HTML markers are intentionally absent —
 * they render via MapLibre symbol layers.
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
    territorialWarZonePaths,
    eastAsiaAdizPaths,
    plaIncursionHeatPaths,
    axisNetworkPaths,
    briTradePaths,
    gtaTradePaths,
    strategicCorridorBackgroundPaths,
    strategicCorridorPaths,
    alliedLogisticsCorridorPaths,
    sanctionsEvasionCorridorPaths,
    usDfcSupplyPaths,
    crinkInfraPaths,
    visibleShipping,
    maritimeRoutePaths,
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
    gevTrackPath,
    strategicSupportPaths,

    airportPortHtmlMarkers,
    situationCalloutMarkers,
    visibleCasualtySkullMarkers,
    nuclearStockpileMarkers,
    ukraineSettlementHtmlMarkers,
    usCarrierHtmlMarkers,
    gdeltTagHtmlMarkers,
    newsStreamNeonMarkers,
    newsInsightCalloutMarkers,
    telegramNeonMarkers,
    neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
    frictionPinMarkers,
    frictionStageMarkers,
    territorialPinMarkers,
    territorialStageMarkers,
    exerciseHtmlMarkers,
    financialHubMarkers,
    reefWatchFeatureMarkers,
    reefWatchTrafficMarkers,
    shipMoveHtmlMarkers,
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    russiaStrikeIncidentMarkers,
    europeDroneIncidentMarkers,
    conflictEventMarkers,
    reconSatelliteMarkers,
    strategicPostureMarkers,
    strategicOverviewCalloutMarkers,
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
      ...territorialWarZonePaths,
      ...eastAsiaAdizPaths,
      ...plaIncursionHeatPaths,
      ...axisNetworkPaths,
      ...briTradePaths,
      ...gtaTradePaths,
      ...strategicCorridorBackgroundPaths,
      ...strategicCorridorPaths,
      ...alliedLogisticsCorridorPaths,
      ...sanctionsEvasionCorridorPaths,
      ...usDfcSupplyPaths,
      ...crinkInfraPaths,
      ...visibleShipping,
      ...maritimeRoutePaths,
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
      ...(gevTrackPath ? [gevTrackPath] : []),
      ...strategicSupportPaths,
    ],
    [
      armsEmbargoFramePaths,
      axisNetworkPaths,
      briTradePaths,
      gtaTradePaths,
      strategicCorridorBackgroundPaths,
      strategicCorridorPaths,
      alliedLogisticsCorridorPaths,
      sanctionsEvasionCorridorPaths,
      usDfcSupplyPaths,
      crinkInfraPaths,
      disputeZonePaths,
      eastAsiaAdizPaths,
      plaIncursionHeatPaths,
      frictionWarZonePaths,
      territorialWarZonePaths,
      railPaths,
      ukmtoHatchPaths,
      navareaHatchPaths,
      exerciseHatchPaths,
      shipMoveTrailPaths,
      gevTrackPath,
      strategicSupportPaths,
      visibleCables,
      visibleDisputeBoundaries,
      visibleLsibBoundary,
      visibleGasPipelines,
      visibleOilPipelines,
      visibleSubseaPipelines,
      visibleShipping,
      maritimeRoutePaths,
    ],
  );

  const htmlOverlayMarkers = useMemo<HtmlOverlayMarker[]>(() => {
    const markers: HtmlOverlayMarker[] = [
      ...globePoints,
      ...airportPortHtmlMarkers,
      ...situationCalloutMarkers,
      ...visibleCasualtySkullMarkers,
      ...nuclearStockpileMarkers,
      ...ukraineSettlementHtmlMarkers,
      ...usCarrierHtmlMarkers,
      // 군용기·민항기·선박(AIS)은 여기 없다 — symbol 레이어로 이전됨.
      ...gdeltTagHtmlMarkers,
      ...newsStreamNeonMarkers,
      ...newsInsightCalloutMarkers,
      ...telegramNeonMarkers,
      ...neptunHtmlMarkers,
      ...neptunImpactHtmlMarkers,
      ...frictionPinMarkers,
      ...frictionStageMarkers,
      ...territorialPinMarkers,
      ...territorialStageMarkers,
      ...exerciseHtmlMarkers,
      ...financialHubMarkers,
      ...reefWatchFeatureMarkers,
      ...reefWatchTrafficMarkers,
      ...shipMoveHtmlMarkers,
      ...chinaTheaterIncidentMarkers,
      ...koreaMissileIncidentMarkers,
      ...russiaStrikeIncidentMarkers,
      ...europeDroneIncidentMarkers,
      ...conflictEventMarkers,
      ...reconSatelliteMarkers,
      ...strategicPostureMarkers,
      ...strategicOverviewCalloutMarkers,
    ];
    // MapLibre는 htmlAltitude 미지원 — 사망자·콜아웃·뉴스네온이 한 좌표에 묶이지 않게 분리
    return deconflictTheaterHtmlOverlays(markers);
  }, [
    airportPortHtmlMarkers,
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    russiaStrikeIncidentMarkers,
    europeDroneIncidentMarkers,
    conflictEventMarkers,
    reconSatelliteMarkers,
    visibleCasualtySkullMarkers,
    exerciseHtmlMarkers,
    financialHubMarkers,
    reefWatchFeatureMarkers,
    reefWatchTrafficMarkers,
    frictionPinMarkers,
    frictionStageMarkers,
    territorialPinMarkers,
    territorialStageMarkers,
    shipMoveHtmlMarkers,
    gdeltTagHtmlMarkers,
    newsStreamNeonMarkers,
    newsInsightCalloutMarkers,
    telegramNeonMarkers,
    globePoints,
    neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
    nuclearStockpileMarkers,
    situationCalloutMarkers,
    ukraineSettlementHtmlMarkers,
    usCarrierHtmlMarkers,
    strategicPostureMarkers,
    strategicOverviewCalloutMarkers,
  ]);

  return { globePoints, rawGlobePaths, htmlOverlayMarkers };
}
