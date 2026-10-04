"use client";

import { useEffect, useMemo, useState } from "react";
import {
  frictionEpisodeById,
  frictionEpisodeWarGeometry,
  episodeLat,
  episodeLng,
  hubColorForLens,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";
import { frictionDeepDoc } from "@/data/frictionEpisodeDeep";
import {
  territorialEpisodeById,
  type TerritorialDisputeEpisode,
} from "@/data/territorialDisputeEpisodes";
import {
  territorialDeepDoc,
  territorialEpisodeLat,
  territorialEpisodeLng,
  territorialEpisodeWarGeometry,
} from "@/data/territorialDisputeDeep";
import { ECONOMY_OVERVIEW_CALLOUTS, economyAxisArrowPaths } from "@/data/economyOverviewFormations";
import { STRATEGIC_OVERVIEW_CALLOUTS } from "@/data/strategicFormations";
import type { MilitaryAircraft, AisVessel, TransportPath } from "@/data/geoTypes";
import type { NavSelection } from "@/data/navRegions";
import type {
  FrictionPinHtmlMarker,
  FrictionStageHtmlMarker,
} from "@/components/globe/types";
import { geometryToAccentOutlineAndHatch, TENSION_GRADE_STYLES } from "@/lib/disputeHatch";
import { buildPlaIncursionHeatPaths, type CrossStraitSignalPayload } from "@/lib/crossStraitSignal";
import { financialHubHtmlMarkers } from "@/lib/financialMarketHubMarkers";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { militaryExercisesToPaths } from "@/lib/militaryExerciseHatch";
import { militaryExerciseHtmlMarkers } from "@/lib/militaryExerciseMarkers";
import { applyRfTrackBoost, type MilitaryExercise } from "@/lib/militaryExercises";
import { navareaFeaturesToPaths, type NavareaFeaturePoint } from "@/lib/navareaHatch";
import type { ReefWatchPayload } from "@/lib/reefWatch";
import { reefWatchFeatureHtmlMarkers, reefWatchTrafficHtmlMarkers } from "@/lib/reefWatchMarkers";
import {
  isMapDisplayableShipObservation,
  shipMovementHtmlMarkers,
  shipMovementPulseRings,
  shipMovementTrailPaths,
} from "@/lib/shipMovements/globeOverlay";
import { observationsForGroupKey, type ShipTrailMode } from "@/lib/shipMovements/shipMovementBrief";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import { strategicPostureHtmlMarkers, strategicSupportArrowPaths } from "@/lib/strategicFormationMarkers";
import { ukmtoIncidentToHatchPaths, type UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

export type UseEpisodePostureOverlaysOptions = {
  labelLanguage: LabelLanguage;
  isEconomyViewer: boolean;
  isConflictViewer: boolean;
  hubFocusMode: NavSelection["focusMode"] | null;

  /** friction / territorial 에피소드 선택 상태 */
  frictionEpisodeBrief: FrictionEpisode | null;
  regimeSelectedEpisodeId: string | null;
  frictionActiveStageId: string | null;
  territorialEpisodeBrief: TerritorialDisputeEpisode | null;
  disputeEpisodeSelectedId: string | null;
  territorialActiveStageId: string | null;
  territorialRevealedStageIds: string[];

  /** ship moves / exercises / maritime hatch 입력 */
  shipMovesMap: PublicShipObservation[];
  shipMovesTimeline: PublicShipObservation[];
  shipMovesTrailMode: ShipTrailMode;
  shipMovesFocusGroupKey: string | null;
  showShipMovesLayer: boolean;
  crossStraitSignal: CrossStraitSignalPayload | null;
  militaryExercises: MilitaryExercise[];
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];
  milAircraft: MilitaryAircraft[];
  aisVessels: AisVessel[];
  reefWatch: ReefWatchPayload | null;

  showUkmtoIncidents: boolean;
  showNavareaWarnings: boolean;
  showMilitaryExercises: boolean;
  showEastAsiaAdiz: boolean;
  showMilitaryActivity: boolean;
  showAis: boolean;
  showReefWatch: boolean;
};

/**
 * 에피소드(마찰·영유권)·함정이동·훈련·전략태세 오버레이 memo 묶음 —
 * GlobeDashboard에서 추출 (분리 Phase D). useGlobeOverlayModel 상류 입력을 만든다.
 */
export function useEpisodePostureOverlays(opts: UseEpisodePostureOverlaysOptions) {
  const {
    labelLanguage,
    isEconomyViewer,
    isConflictViewer,
    hubFocusMode,
    frictionEpisodeBrief,
    regimeSelectedEpisodeId,
    frictionActiveStageId,
    territorialEpisodeBrief,
    disputeEpisodeSelectedId,
    territorialActiveStageId,
    territorialRevealedStageIds,
    shipMovesMap,
    shipMovesTimeline,
    shipMovesTrailMode,
    shipMovesFocusGroupKey,
    showShipMovesLayer,
    crossStraitSignal,
    militaryExercises,
    ukmtoIncidents,
    navareaFeatures,
    milAircraft,
    aisVessels,
    reefWatch,
    showUkmtoIncidents,
    showNavareaWarnings,
    showMilitaryExercises,
    showEastAsiaAdiz,
    showMilitaryActivity,
    showAis,
    showReefWatch,
  } = opts;

  const [financialHubTick, setFinancialHubTick] = useState(0);
  /** 분쟁 외교사 선택 시 — 체크박스 없이 해당 좌표만 전쟁구역 빗금 */
  const activeFrictionEpisode = useMemo<FrictionEpisode | null>(() => {
    if (hubFocusMode !== "regime" && hubFocusMode !== "disputes") return null;
    if (frictionEpisodeBrief) return frictionEpisodeBrief;
    if (regimeSelectedEpisodeId) return frictionEpisodeById(regimeSelectedEpisodeId) ?? null;
    return null;
  }, [frictionEpisodeBrief, hubFocusMode, regimeSelectedEpisodeId]);

  const frictionWarZonePaths = useMemo<TransportPath[]>(() => {
    if (!activeFrictionEpisode) return [];
    const style = TENSION_GRADE_STYLES.combat;
    return geometryToAccentOutlineAndHatch(
      `friction-war-${activeFrictionEpisode.id}`,
      activeFrictionEpisode.locationName,
      frictionEpisodeWarGeometry(activeFrictionEpisode),
      {
        outlineKind: "dispute-zone",
        hatchKind: "conflict-hatch",
        outlineColor: style.outline,
        hatchColor: style.hatch,
        pattern: style.pattern,
        preferDetailSegments: false,
      },
    );
  }, [activeFrictionEpisode]);

  const frictionPinMarkers = useMemo<FrictionPinHtmlMarker[]>(() => {
    if (!activeFrictionEpisode) return [];
    return [
      {
        markerId: `friction-pin-${activeFrictionEpisode.id}`,
        displayKind: "friction-pin",
        id: activeFrictionEpisode.id,
        lat: episodeLat(activeFrictionEpisode),
        lng: episodeLng(activeFrictionEpisode),
        label: `${activeFrictionEpisode.title} · ${activeFrictionEpisode.locationName}`,
        color: hubColorForLens(activeFrictionEpisode.lens),
      },
    ];
  }, [activeFrictionEpisode]);

  const frictionStageMarkers = useMemo<FrictionStageHtmlMarker[]>(() => {
    if (
      !activeFrictionEpisode ||
      (hubFocusMode !== "regime" && hubFocusMode !== "disputes")
    ) {
      return [];
    }
    const deep = frictionDeepDoc(activeFrictionEpisode.id);
    if (!deep) return [];
    return deep.stages.map((stage) => ({
      markerId: `friction-stage-${stage.id}`,
      displayKind: "friction-stage" as const,
      id: stage.id,
      lat: stage.coordinates[1],
      lng: stage.coordinates[0],
      order: stage.order,
      active: stage.id === frictionActiveStageId,
      label:
        labelLanguage === "en"
          ? `${stage.order}. ${stage.titleEn}`
          : `${stage.order}. ${stage.titleKo}`,
    }));
  }, [activeFrictionEpisode, frictionActiveStageId, hubFocusMode, labelLanguage]);

  const activeTerritorialEpisode = useMemo<TerritorialDisputeEpisode | null>(() => {
    if (hubFocusMode !== "disputes") return null;
    if (territorialEpisodeBrief) return territorialEpisodeBrief;
    return territorialEpisodeById(disputeEpisodeSelectedId);
  }, [disputeEpisodeSelectedId, hubFocusMode, territorialEpisodeBrief]);

  const territorialWarZonePaths = useMemo<TransportPath[]>(() => {
    if (!activeTerritorialEpisode) return [];
    const style = TENSION_GRADE_STYLES.combat;
    return geometryToAccentOutlineAndHatch(
      `territorial-war-${activeTerritorialEpisode.id}`,
      activeTerritorialEpisode.locationName,
      territorialEpisodeWarGeometry(activeTerritorialEpisode),
      {
        outlineKind: "dispute-zone",
        hatchKind: "conflict-hatch",
        outlineColor: "rgba(251,113,133,0.88)",
        hatchColor: style.hatch,
        pattern: style.pattern,
        preferDetailSegments: false,
      },
    );
  }, [activeTerritorialEpisode]);

  const territorialPinMarkers = useMemo(() => {
    if (!activeTerritorialEpisode) return [];
    return [
      {
        markerId: `territorial-pin-${activeTerritorialEpisode.id}`,
        displayKind: "friction-pin" as const,
        id: activeTerritorialEpisode.id,
        lat: territorialEpisodeLat(activeTerritorialEpisode),
        lng: territorialEpisodeLng(activeTerritorialEpisode),
        label: `${activeTerritorialEpisode.title} · ${activeTerritorialEpisode.locationName}`,
        color: "rgba(251, 113, 133, 0.92)",
      },
    ];
  }, [activeTerritorialEpisode]);

  const territorialStageMarkers = useMemo<FrictionStageHtmlMarker[]>(() => {
    if (!activeTerritorialEpisode || hubFocusMode !== "disputes") return [];
    const deep = territorialDeepDoc(activeTerritorialEpisode.id);
    if (!deep) return [];
    return deep.stages
      .filter((stage) => territorialRevealedStageIds.includes(stage.id))
      .map((stage) => ({
        markerId: `territorial-stage-${stage.id}`,
        displayKind: "friction-stage" as const,
        id: stage.id,
        lat: stage.coordinates[1],
        lng: stage.coordinates[0],
        order: stage.order,
        active: stage.id === territorialActiveStageId,
        tone: "rose" as const,
        label:
          labelLanguage === "en"
            ? `${stage.order}. ${stage.titleEn}`
            : `${stage.order}. ${stage.titleKo}`,
      }));
  }, [
    activeTerritorialEpisode,
    hubFocusMode,
    labelLanguage,
    territorialActiveStageId,
    territorialRevealedStageIds,
  ]);

  const combinedShipMovesMap = useMemo(() => {
    const byId = new Map<string, PublicShipObservation>();
    for (const item of shipMovesMap) byId.set(item.id, item);
    for (const item of crossStraitSignal?.shipObservations ?? []) byId.set(item.id, item);
    // 구 mapEligible=0 broad 등 — 타임라인에만 있어도 추정 해역으로 표시
    for (const item of shipMovesTimeline) {
      if (isMapDisplayableShipObservation(item)) byId.set(item.id, item);
    }
    return [...byId.values()];
  }, [crossStraitSignal?.shipObservations, shipMovesMap, shipMovesTimeline]);

  /** 추정 경로용 — 타임라인(다주 관측) + 맵 관측을 합쳐 함정별 이동을 잇는다 */
  const combinedShipMovesForTrails = useMemo(() => {
    const byId = new Map<string, PublicShipObservation>();
    for (const item of shipMovesTimeline) byId.set(item.id, item);
    for (const item of combinedShipMovesMap) byId.set(item.id, item);
    return [...byId.values()];
  }, [combinedShipMovesMap, shipMovesTimeline]);

  const combinedMilitaryExercises = useMemo(() => {
    const byId = new Map<string, MilitaryExercise>();
    for (const item of militaryExercises) byId.set(item.id, item);
    for (const item of crossStraitSignal?.exercises ?? []) byId.set(item.id, item);
    return [...byId.values()].filter((item) => item.active);
  }, [crossStraitSignal?.exercises, militaryExercises]);

  const shipMovesLayerObservations = useMemo(() => {
    if (shipMovesTrailMode === "vessel") {
      if (!shipMovesFocusGroupKey) return [];
      return observationsForGroupKey(combinedShipMovesMap, shipMovesFocusGroupKey);
    }
    return combinedShipMovesMap;
  }, [combinedShipMovesMap, shipMovesFocusGroupKey, shipMovesTrailMode]);

  const shipMovesTrailObservations = useMemo(() => {
    if (shipMovesTrailMode === "vessel") {
      if (!shipMovesFocusGroupKey) return [];
      return observationsForGroupKey(combinedShipMovesForTrails, shipMovesFocusGroupKey);
    }
    return combinedShipMovesForTrails;
  }, [combinedShipMovesForTrails, shipMovesFocusGroupKey, shipMovesTrailMode]);

  const shipMoveHtmlMarkers = useMemo(
    () =>
      showShipMovesLayer && isConflictViewer
        ? shipMovementHtmlMarkers(shipMovesLayerObservations)
        : [],
    [isEconomyViewer, shipMovesLayerObservations, showShipMovesLayer],
  );

  const shipMovePulseRings = useMemo(
    () =>
      showShipMovesLayer && isConflictViewer
        ? shipMovementPulseRings(shipMovesLayerObservations)
        : [],
    [isEconomyViewer, shipMovesLayerObservations, showShipMovesLayer],
  );

  const shipMoveTrailPaths = useMemo(
    () =>
      showShipMovesLayer && isConflictViewer
        ? shipMovementTrailPaths(
            shipMovesTrailObservations,
            labelLanguage === "en" ? "en" : "ko",
          )
        : [],
    [isEconomyViewer, labelLanguage, shipMovesTrailObservations, showShipMovesLayer],
  );

  /** UKMTO 사건 → 검은 동그라미 빗금 박스 (강도별 흑↔백) — dispute-zone/conflict-hatch kind 재사용 */
  const ukmtoHatchPaths = useMemo<TransportPath[]>(() => {
    if (!showUkmtoIncidents || ukmtoIncidents.length === 0) return [];
    const out: TransportPath[] = [];
    for (const incident of ukmtoIncidents) {
      out.push(...ukmtoIncidentToHatchPaths(incident));
    }
    return out;
  }, [showUkmtoIncidents, ukmtoIncidents]);

  /** NAVAREA → 보라색 폴리곤/선 */
  const navareaHatchPaths = useMemo<TransportPath[]>(() => {
    if (!showNavareaWarnings || navareaFeatures.length === 0) return [];
    return navareaFeaturesToPaths(navareaFeatures);
  }, [showNavareaWarnings, navareaFeatures]);

  /** 군사 훈련 → 청록 폴리곤 */
  const exerciseHatchPaths = useMemo<TransportPath[]>(() => {
    if (!showMilitaryExercises || combinedMilitaryExercises.length === 0) return [];
    return militaryExercisesToPaths(combinedMilitaryExercises);
  }, [combinedMilitaryExercises, showMilitaryExercises]);

  /** 최근 30일 PLA ADIZ 구역별 활동일 — 공식 경계/개별 항적이 아닌 개략 히트 구역 */
  const plaIncursionHeatPaths = useMemo<TransportPath[]>(() => {
    if (!showEastAsiaAdiz) return [];
    return buildPlaIncursionHeatPaths(
      crossStraitSignal?.incursions ?? [],
      labelLanguage === "en" ? "en" : "ko",
    );
  }, [crossStraitSignal?.incursions, labelLanguage, showEastAsiaAdiz]);

  /** 공시 + 뷰포트 항적 soft bump (표시·양피지용, DB 미갱신) */
  const displayMilitaryExercises = useMemo(() => {
    const tracks: Array<{ lat: number; lng: number }> = [];
    if (showMilitaryActivity) {
      for (const a of milAircraft) {
        if (Number.isFinite(a.lat) && Number.isFinite(a.lng)) {
          tracks.push({ lat: a.lat, lng: a.lng });
        }
      }
    }
    if (showAis) {
      for (const v of aisVessels) {
        if (Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
          tracks.push({ lat: v.lat, lng: v.lng });
        }
      }
    }
    if (tracks.length === 0) return combinedMilitaryExercises;
    return combinedMilitaryExercises.map((ex) => applyRfTrackBoost(ex, tracks));
  }, [
    aisVessels,
    combinedMilitaryExercises,
    milAircraft,
    showAis,
    showMilitaryActivity,
  ]);

  const exerciseHtmlMarkers = useMemo(
    () =>
      showMilitaryExercises
        ? militaryExerciseHtmlMarkers(displayMilitaryExercises)
        : [],
    [displayMilitaryExercises, showMilitaryExercises],
  );

  useEffect(() => {
    if (!isEconomyViewer) return;
    const timer = window.setInterval(() => setFinancialHubTick((n) => n + 1), 60_000);
    return () => window.clearInterval(timer);
  }, [isEconomyViewer]);

  const financialHubMarkers = useMemo(
    () => (isEconomyViewer ? financialHubHtmlMarkers(new Date()) : []),
    // financialHubTick forces 1-min refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEconomyViewer, financialHubTick],
  );

  /** 지정학 개관 — 핵심 거점(동맹/CRINK)·명명된 전략태세 라벨. 지경학 뷰에서는 숨김. */
  const strategicPostureMarkers = useMemo(
    () => (isEconomyViewer ? [] : strategicPostureHtmlMarkers()),
    [isEconomyViewer],
  );

  /** 지정학 개관 상시 콜아웃 3건 / 지경학 개관 콜아웃 3건 — 기존 situation-callout 뱃지 재사용 */
  const strategicOverviewCalloutMarkers = useMemo(
    () =>
      (isEconomyViewer ? ECONOMY_OVERVIEW_CALLOUTS : STRATEGIC_OVERVIEW_CALLOUTS).map((c) => ({
        ...c,
        markerId: `${isEconomyViewer ? "economy" : "strategic"}-overview-${c.id}`,
        displayKind: "situation-callout" as const,
      })),
    [isEconomyViewer],
  );

  /** 지정학 전략지원 호 / 지경학 에너지·무역·결제 축 호 */
  const strategicSupportPaths = useMemo(
    () =>
      isEconomyViewer
        ? economyAxisArrowPaths(labelLanguage)
        : strategicSupportArrowPaths(labelLanguage),
    [isEconomyViewer, labelLanguage],
  );

  const reefWatchFeatureMarkers = useMemo(
    () =>
      showReefWatch && reefWatch?.featureStatus
        ? reefWatchFeatureHtmlMarkers(reefWatch.featureStatus)
        : [],
    [reefWatch?.featureStatus, showReefWatch],
  );

  const reefWatchTrafficMarkers = useMemo(
    () =>
      showReefWatch && reefWatch?.traffic
        ? reefWatchTrafficHtmlMarkers(reefWatch.traffic)
        : [],
    [reefWatch?.traffic, showReefWatch],
  );

  return {
    activeFrictionEpisode,
    frictionWarZonePaths,
    frictionPinMarkers,
    frictionStageMarkers,
    activeTerritorialEpisode,
    territorialWarZonePaths,
    territorialPinMarkers,
    territorialStageMarkers,
    combinedShipMovesMap,
    combinedMilitaryExercises,
    shipMoveHtmlMarkers,
    shipMovePulseRings,
    shipMoveTrailPaths,
    ukmtoHatchPaths,
    navareaHatchPaths,
    exerciseHatchPaths,
    plaIncursionHeatPaths,
    displayMilitaryExercises,
    exerciseHtmlMarkers,
    financialHubMarkers,
    strategicPostureMarkers,
    strategicOverviewCalloutMarkers,
    strategicSupportPaths,
    reefWatchFeatureMarkers,
    reefWatchTrafficMarkers,
  };
}