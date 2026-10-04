"use client";

import { useMemo } from "react";
import type {
  ConflictZoneFeature,
  DisputeArea,
  FirmsFire,
  MilitaryAircraft,
  TransportPath,
} from "@/data/geoTypes";
import { isFreshEvent, type ScoredEvent } from "@/data/eventTiers";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import { conflictEventsReplaceLegacy } from "@/lib/conflictEvents/flags";
import { pickGdeltTensionTags } from "@/lib/gdeltLocationTags";
import {
  isUkraineTheaterGdeltWar,
  type UkraineGdeltNeonMarker,
} from "@/lib/ukraineGdeltNeonMarker";
import { theaterIntensityFromGdeltGrade } from "@/lib/theaterIntensityRadius";
import { buildAircraftSymbolModel } from "@/lib/milAircraftSymbols";
import { buildNewsStreamMapTags } from "@/lib/news/newsStreamMapTags";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";
import { buildTensionHeatmaps } from "@/lib/tensionHeatmap";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  buildFirmsCombatHotspots,
  classifyFirmsFireForSound,
} from "@/lib/firmsSoundClassify";
import { filterFirmsToTheaters } from "@/lib/firmsTheaters";
import { isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import {
  FIRMS_FIRE_MAX_BY_TIER,
  VIEWPORT_RADIUS_BY_TIER,
  isCenterInView,
} from "@/lib/viewportCull";
import { ultraLiteGdeltPinScale } from "@/lib/ultraLiteMode";
import {
  reconCountryAccent,
  sampleReconOrbitTrack,
} from "@/lib/reconSatellitePropagate";
import type {
  ConflictClusterPoint,
  FirmsFireGlobePoint,
  GlobeDisplayPoint,
  MilGlobePoint,
  NewsInsightCalloutMarker,
  NewsStreamNeonMarker,
  NewfeedsAttackGlobePoint,
  PulseRingPoint,
  Selection,
  StaticGlobePoint,
  TzevaAdomGlobePoint,
  UkraineTheaterIntensityGlobePoint,
  ViewState,
} from "@/components/globe/types";

export type UseFirmsTheaterDisplayModelOptions = {
  milDisplayPoints: MilGlobePoint[];
  civDisplayPoints: MilitaryAircraft[];
  /** 선택된 군용기 hex — aircraft symbol 강조 */
  selectedHex: string | null;
  firmsFires: FirmsFire[];
  showFirmsFires: boolean;
  showWarZones: boolean;
  showConflictZones: boolean;
  disputes: DisputeArea[];
  visibleConflictZones: ConflictZoneFeature[];
  showUkraineControl: boolean;
  isSatelliteViewer: boolean;
  showTzevaAdom: boolean;
  tzevaAdomActive: TzevaAdomAlert[];
  showNewfeedsIranAttacks: boolean;
  newfeedsAttacks: NewfeedsAttackPoint[];
  globeLodTier: GlobeLodTier;
  layerViewState: ViewState;
  scoredEvents: ScoredEvent[];
  showGdeltWar: boolean;
  showGdeltDiplomatic: boolean;
  showGdeltProtests: boolean;
  showGdeltOceanCompetition: boolean;
  ultraLite: boolean;
  staticGlobePoints: StaticGlobePoint[];
  conflictClusterPoints: ConflictClusterPoint[];
  claimRingPoints: PulseRingPoint[];
  frictionRingPoints: PulseRingPoint[];
  shipMovePulseRings: PulseRingPoint[];
  chokeGlowRings: PulseRingPoint[];
  selected: Selection | null;
  isCompactUi: boolean;
  isHistoryViewer: boolean;
  isEconomyViewer: boolean;
  newsStreamPayload: NewsStreamPayload | null;
  newsInsightCallout: NewsInsightCalloutMarker | null;
  layerAltitude: number;
};

export function useFirmsTheaterDisplayModel(opts: UseFirmsTheaterDisplayModelOptions) {
  const {
    milDisplayPoints,
    civDisplayPoints,
    selectedHex,
    firmsFires,
    showFirmsFires,
    showWarZones,
    showConflictZones,
    disputes,
    visibleConflictZones,
    showUkraineControl,
    isSatelliteViewer,
    showTzevaAdom,
    tzevaAdomActive,
    showNewfeedsIranAttacks,
    newfeedsAttacks,
    globeLodTier,
    layerViewState,
    scoredEvents,
    showGdeltWar,
    showGdeltDiplomatic,
    showGdeltProtests,
    showGdeltOceanCompetition,
    ultraLite,
    staticGlobePoints,
    conflictClusterPoints,
    claimRingPoints,
    frictionRingPoints,
    shipMovePulseRings,
    chokeGlowRings,
    selected,
    isCompactUi,
    isHistoryViewer,
    isEconomyViewer,
    newsStreamPayload,
    newsInsightCallout,
    layerAltitude,
  } = opts;

  /**
   * 항공기 — DOM Marker에서 MapLibre symbol 레이어로 이전 (milAircraftSymbols.ts).
   *
   * 이전에는 milHtmlMarkers·civHtmlMarkers가 htmlOverlayMarkers에 합쳐져
   * 마커 하나당 div>button>span>span + SVG innerHTML + drop-shadow 필터가
   * 만들어졌고, 프레임마다 project+transform+오클루전 판정이 돌았다.
   * village 티어에서 최대 430개 — 화면 마커 중 압도적 1위였다.
   *
   * 여기서는 GeoJSON 하나로 합쳐 GPU가 배치로 그린다.
   * milDisplayPoints/civDisplayPoints(원본)를 쓰는 이유는 *HtmlMarkers가
   * markerId만 덧붙인 사본이라 symbol 경로에선 불필요하기 때문.
   */
  const aircraftSymbols = useMemo(
    () =>
      buildAircraftSymbolModel(milDisplayPoints, civDisplayPoints, {
        selectedHex,
      }),
    [milDisplayPoints, civDisplayPoints, selectedHex],
  );

  const visibleFirmsFires = useMemo(() => {
    if (!showFirmsFires) return [];
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLodTier];
    const maxCount = FIRMS_FIRE_MAX_BY_TIER[globeLodTier];
    // 전장 권역만 — 산불·농지 소각 등 전역 열점 제외
    return filterFirmsToTheaters(firmsFires)
      .filter((fire) => isCenterInView(fire, layerViewState, radiusDeg))
      .slice()
      .sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0))
      .slice(0, maxCount);
  }, [firmsFires, globeLodTier, layerViewState, showFirmsFires]);

  const firmsCombatHotspots = useMemo(() => {
    // bomb 링·전투 분류는 FIRMS/전장 기하만 — GDELT war는 빨간 MapLibre 점으로만 표시
    return buildFirmsCombatHotspots({
      disputes,
      includeWarZones: showWarZones,
      conflictZones: visibleConflictZones,
      includeConflictZones: showConflictZones,
    });
  }, [disputes, showConflictZones, showWarZones, visibleConflictZones]);

  const firmsCombatFireIds = useMemo(() => {
    if (!showFirmsFires) return [];
    return visibleFirmsFires
      .filter(
        (fire) =>
          classifyFirmsFireForSound(fire, {
            ukraineFrontActive: showUkraineControl,
            combatHotspots: firmsCombatHotspots,
          }) === "combat",
      )
      .map((fire) => fire.id);
  }, [firmsCombatHotspots, showFirmsFires, showUkraineControl, visibleFirmsFires]);

  const firmsBombRingPoints = useMemo<PulseRingPoint[]>(() => {
    if (!showFirmsFires) return [];
    const combatIdSet = new Set(firmsCombatFireIds);
    return visibleFirmsFires
      .filter((fire) => combatIdSet.has(fire.id))
      .slice(0, 36)
      .map((fire) => ({
        pulseKind: "firms-bomb" as const,
        id: fire.id,
        lat: fire.lat,
        lng: fire.lng,
        frp: fire.frp ?? null,
        markerId: `firms-bomb-ring-${fire.id}`,
      }));
  }, [firmsCombatFireIds, showFirmsFires, visibleFirmsFires]);

  const firmsDisplayPoints = useMemo<FirmsFireGlobePoint[]>(
    () =>
      visibleFirmsFires.map((fire) => ({
        ...fire,
        markerId: `firms-${fire.id}`,
        displayKind: "firms-fire" as const,
        soundKind: classifyFirmsFireForSound(fire, {
          ukraineFrontActive: showUkraineControl,
          combatHotspots: firmsCombatHotspots,
        }),
      })),
    [firmsCombatHotspots, showUkraineControl, visibleFirmsFires],
  );

  /** Cesium 관측 — MapLibre 뷰포트 컬 없이 전장 FIRMS 상위 N */
  const cesiumFirmsFires = useMemo(() => {
    if (!showFirmsFires || !isSatelliteViewer) return [];
    return filterFirmsToTheaters(firmsFires)
      .slice()
      .sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0))
      .slice(0, 80)
      .map((fire) => ({
        id: fire.id,
        lat: fire.lat,
        lng: fire.lng,
        frp: fire.frp,
        soundKind: classifyFirmsFireForSound(fire, {
          ukraineFrontActive: showUkraineControl,
          combatHotspots: firmsCombatHotspots,
        }),
      }));
  }, [
    firmsCombatHotspots,
    firmsFires,
    isSatelliteViewer,
    showFirmsFires,
    showUkraineControl,
  ]);

  const tzevaAdomDisplayPoints = useMemo<TzevaAdomGlobePoint[]>(() => {
    if (!showTzevaAdom) return [];
    // 활성 경보만 — history fallback은 해제 후에도 빨간 마커가 남는 원인
    return tzevaAdomActive.map((alert) => ({
      ...alert,
      markerId: `tzeva-${alert.id}`,
      displayKind: "tzeva-adom" as const,
    }));
  }, [showTzevaAdom, tzevaAdomActive]);

  const newfeedsAttackDisplayPoints = useMemo<NewfeedsAttackGlobePoint[]>(() => {
    if (conflictEventsReplaceLegacy() || !showNewfeedsIranAttacks) return [];
    // NewFeeds = 이란 국영·공식 매체 → 빨간 구체
    return newfeedsAttacks.map((attack) => ({
      ...attack,
      markerId: `newfeeds-${attack.id}`,
      displayKind: "newfeeds-attack" as const,
    }));
  }, [newfeedsAttacks, showNewfeedsIranAttacks]);

  const firmsCombatInView = firmsCombatFireIds.length > 0;

  const gdeltTensionTags = useMemo(() => {
    const tags = pickGdeltTensionTags(scoredEvents, {
      showWar: showGdeltWar,
      showDiplomatic: showGdeltDiplomatic,
      showProtest: showGdeltProtests,
      showOceanCompetition: showGdeltOceanCompetition,
      view: layerViewState,
    });
    if (!ultraLite) return tags;
    const max = Math.max(6, Math.ceil(tags.length * ultraLiteGdeltPinScale()));
    return tags.slice(0, Math.min(50, max));
  }, [
    layerViewState,
    scoredEvents,
    showGdeltDiplomatic,
    showGdeltOceanCompetition,
    showGdeltProtests,
    showGdeltWar,
    ultraLite,
  ]);

  const ukraineGdeltNeonMarkers = useMemo<UkraineGdeltNeonMarker[]>(() => {
    if (!showGdeltWar) return [];
    return gdeltTensionTags
      .filter((event) => isUkraineTheaterGdeltWar(event) && isFreshEvent(event))
      .map((event) => ({
        ...event,
        markerId: `ukr-gdelt-${event.id}`,
        displayKind: "ukraine-gdelt-neon" as const,
      }));
  }, [gdeltTensionTags, showGdeltWar]);

  /** 이란 NewFeeds와 동일 — MapLibre 빨간 강도 원 (전쟁소식 한 채널, HTML 네온 미사용) */
  const ukraineTheaterIntensityPoints = useMemo<UkraineTheaterIntensityGlobePoint[]>(() => {
    return ukraineGdeltNeonMarkers.map((event) => ({
      id: event.id,
      lat: event.lat,
      lng: event.lng,
      markerId: `ukr-intensity-${event.id}`,
      displayKind: "ukraine-theater-intensity" as const,
      severity: theaterIntensityFromGdeltGrade(event.importanceGrade, isFreshEvent(event)),
      title: event.title || event.category || "Ukraine theater",
    }));
  }, [ukraineGdeltNeonMarkers]);

  /** 정적 포인트 + AI 전쟁지역 (FIRMS는 전용 불꽃 레이어) + 이란/우크라 전장 강도 원
   * UCDP는 원(네온점) 대신 사상자 HTML 라벨로만 표시 */
  const globeDisplayPoints = useMemo<GlobeDisplayPoint[]>(() => {
    const points: GlobeDisplayPoint[] = [
      ...staticGlobePoints.filter(
        (point) => !isHtmlStaticKind(point.kind) && point.kind !== "ucdp-event",
      ),
      ...conflictClusterPoints,
      ...tzevaAdomDisplayPoints,
      ...newfeedsAttackDisplayPoints,
      ...ukraineTheaterIntensityPoints,
    ];
    return points;
  }, [
    conflictClusterPoints,
    newfeedsAttackDisplayPoints,
    staticGlobePoints,
    tzevaAdomDisplayPoints,
    ukraineTheaterIntensityPoints,
  ]);

  const reconHorizonRings = useMemo<PulseRingPoint[]>(() => {
    if (selected?.kind !== "recon-sat") return [];
    const sat = selected.item;
    return [
      {
        pulseKind: "recon-horizon" as const,
        id: `recon-horizon-${sat.markerId}`,
        markerId: `recon-horizon-${sat.markerId}`,
        lat: sat.lat,
        lng: sat.lng,
        // buildRingsGeoJson uses maxRadius * 0.35 → angular degrees
        radiusScale: sat.horizonDeg / 0.35,
        color: reconCountryAccent(sat.country),
      },
    ];
  }, [selected]);

  /** 선택 시에만 — 향후 ~1궤도 지상 궤적 (상시 금지) */
  const reconOrbitPaths = useMemo<TransportPath[]>(() => {
    if (selected?.kind !== "recon-sat") return [];
    const sat = selected.item;
    const points = sampleReconOrbitTrack(sat, new Date());
    if (points.length < 2) return [];
    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;
    for (const p of points) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    return [
      {
        id: `recon-orbit-${sat.markerId}`,
        kind: "recon-orbit" as const,
        name: sat.name,
        scalerank: 1,
        lengthKm: null,
        accentColor: reconCountryAccent(sat.country),
        bbox: { minLat, minLng, maxLat, maxLng },
        points,
      },
    ];
  }, [selected]);

  const conflictClusterRings = useMemo<PulseRingPoint[]>(
    () => [
      ...conflictClusterPoints.map((point) => ({ ...point, pulseKind: "ai-zone" as const })),
      ...firmsBombRingPoints,
      ...claimRingPoints,
      ...frictionRingPoints,
      ...shipMovePulseRings,
      ...chokeGlowRings,
      ...reconHorizonRings,
    ],
    [
      claimRingPoints,
      chokeGlowRings,
      conflictClusterPoints,
      firmsBombRingPoints,
      frictionRingPoints,
      reconHorizonRings,
      shipMovePulseRings,
    ],
  );

  const rawTensionHeatmaps = useMemo(
    () =>
      // 전투·외교는 위치 태그로 대체 — 히트맵(수천 점 WebGL) 비활성화로 메모리 절약
      buildTensionHeatmaps(scoredEvents, {
        showWar: false,
        showDiplomatic: false,
        altitude: layerAltitude,
      }),
    [layerAltitude, scoredEvents],
  );

  const newsStreamNeonMarkers = useMemo<NewsStreamNeonMarker[]>(() => {
    // 지정학=빨간 네온(전쟁·긴장), 지경학=초록 네온(거시·시장만)
    if (isCompactUi || isHistoryViewer) return [];
    const payload = newsStreamPayload;
    if (!payload) return [];
    const pool: NewsStreamItem[] = [...payload.verified, ...payload.stateMedia];
    return buildNewsStreamMapTags(pool, {
      mode: isEconomyViewer ? "economy" : "conflict",
    });
  }, [isCompactUi, isEconomyViewer, isHistoryViewer, newsStreamPayload]);

  const newsInsightCalloutMarkers = useMemo<NewsInsightCalloutMarker[]>(() => {
    if (!newsInsightCallout || selected?.kind !== "news-insight") return [];
    return [newsInsightCallout];
  }, [newsInsightCallout, selected]);

  return {
    aircraftSymbols,
    visibleFirmsFires,
    firmsCombatHotspots,
    firmsCombatFireIds,
    firmsBombRingPoints,
    firmsDisplayPoints,
    cesiumFirmsFires,
    tzevaAdomDisplayPoints,
    newfeedsAttackDisplayPoints,
    firmsCombatInView,
    gdeltTensionTags,
    ukraineGdeltNeonMarkers,
    ukraineTheaterIntensityPoints,
    globeDisplayPoints,
    reconHorizonRings,
    reconOrbitPaths,
    conflictClusterRings,
    rawTensionHeatmaps,
    newsStreamNeonMarkers,
    newsInsightCalloutMarkers,
  };
}
