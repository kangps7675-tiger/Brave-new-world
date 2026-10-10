"use client";

import {
  buildNewsKeywordCatalog,
  createNewsSearchIndex,
  createPlaceSearchIndex,
  searchChromeHits,
  suggestNewsKeywords,
  type ChromeSearchHit,
} from "@/lib/chromeSearch";
import dynamic from "@/lib/clientDynamic";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { CursorHoverCard } from "@/components/CursorHoverCard";
import { NewsPerspectivesPanel } from "@/components/NewsPerspectivesPanel";
import {
  NewsInsightPanel,
} from "@/components/NewsInsightPanel";
import { type DailyPrompt } from "@/lib/dailyPrompt";

import type { SceneLinkState } from "@/lib/sceneLink";
import { type AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import { NeptunThreatDetailPanel } from "@/components/NeptunThreatDetailPanel";
import { type LayerCategory } from "@/components/LayerCategoryPanel";
/**
 * 폰 UI 전용 화면(948줄) — 데스크톱 사용자는 절대 렌더하지 않는데도
 * 정적 import라 대시보드 청크에 항상 실려 있었다. 렌더 지점이 이미
 * `isPhoneUi ? … : null` 이라 지연 로드가 그대로 맞물린다.
 */
const MobileHomeView = dynamic(
  () => import("@/components/MobileHomeView").then((m) => m.MobileHomeView),
  { ssr: false },
);
/** P3-1: 분석 패널 on-demand — 초기 청크에서 제외 */
const AnalysisPanel = dynamic(
  () => import("@/components/globe/AnalysisPanel").then((m) => m.AnalysisPanel),
  { ssr: false },
);
/** P3-1 Intel 청크 — 시트 열릴 때 / idle 전에 로드 */
const IntelNewsSheet = dynamic(
  () =>
    import("@/components/BottomIntelStack").then((m) => m.IntelNewsSheet),
  { ssr: false },
);
import { MapAttributionBar } from "@/components/MapAttributionBar";

import { useCompactUi } from "@/hooks/useCompactUi";
import { usePhoneUi } from "@/hooks/usePhoneUi";
import { useDeviceProfile } from "@/hooks/deviceProfile";
import {
  buildCompactPrefs,
  compactPresetsForMode,
  defaultCompactChipId,
  type CompactChipId,
} from "@/lib/compactViewPreset";
import {
  trackLayerToggle,
} from "@/lib/analyticsEvents";
import { DashboardOverlayHost } from "@/components/globe/DashboardOverlayHost";
import { CesiumAlertDock } from "@/components/globe/CesiumAlertDock";
import { useSceneDeeplink } from "@/components/globe/hooks/useSceneDeeplink";
import { useAmbientSoundSelectors } from "@/components/globe/hooks/useAmbientSoundSelectors";
import { useMaritimeAlertBriefs } from "@/components/globe/hooks/useMaritimeAlertBriefs";
import { useLayerPanelCategories } from "@/components/globe/hooks/useLayerPanelCategories";

import { useAirRaidAutoLayer } from "@/components/globe/hooks/useAirRaidAutoLayer";

import { useEscalationSignals } from "@/components/globe/hooks/useEscalationSignals";
import {
  type ExerciseBriefingContent,
} from "@/components/ExerciseBriefingParchment";
import { useChokepointStressParchment } from "@/components/globe/hooks/useChokepointStressParchment";
import {
  type ChokepointStressBriefing,
} from "@/lib/chokepointStressBriefing";

import { NkMissileHistoryDock } from "@/components/missile/NkMissileHistoryDock";

import {
  type MilitaryExercise,
} from "@/lib/militaryExercises";

import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { useNeptunGlobeLayer } from "@/components/globe/hooks/useNeptunGlobeLayer";
import { useLiveOverlayMarkers } from "@/components/globe/hooks/useLiveOverlayMarkers";
import { useReconSatelliteLayer } from "@/components/globe/hooks/useReconSatelliteLayer";
import { useSituationHtmlMarkers } from "@/components/globe/hooks/useSituationHtmlMarkers";
import { useHoverCard } from "@/components/globe/hooks/useHoverCard";
import { useGevLiveTrack } from "@/hooks/useGevLiveTrack";
import { GevTrackHud } from "@/components/globe/GevTrackHud";

import { useGpsJamLayer } from "@/hooks/useGpsJamLayer";
import { buildDailyTourScenes } from "@/lib/dailyTour";
import { emitBreakingDispatchSound } from "@/components/SoundEffectsBridge";
import {
  emitLayerClickSounds,
} from "@/lib/infraClickSounds";
import { resolveHubBrief } from "@/data/hubBriefs";
import { resolveCriticalNodeBrief } from "@/data/resolveCriticalNodeBrief";
import type { EconInsightBrief } from "@/data/econInsightBriefs";
import type { ChromeCoachStep } from "@/components/ChromeOnboardingCoach";
import {
  shouldOfferFrictionCoach,
  type FrictionCoachStep,
} from "@/components/FrictionOnboardingCoach";

import {
  hasSeenClearanceChip,
  localClearanceDay,
  resolveClearanceStatus,
  syncClearancePrefs,
  type ClearanceStatus,
} from "@/lib/analystClearance";
import {
  nextUtcRankDate,
  readDailyPredictPrefs,
  writeDailyPredictPrefs,
} from "@/lib/dailyPredictPrefs";
import { type AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";

import {
  type UxGuideBriefContent,
} from "@/lib/uxGuideBrief";

import { liveuaConfirmedStrike, liveuaGroundAssault } from "@/lib/liveuamap/confirmedStrike";
import { LiveuaFlashToast } from "@/components/globe/LiveuaFlashToast";
import { LiveuaFlashDock } from "@/components/globe/LiveuaFlashDock";
import { LiveuaFlashParchment } from "@/components/globe/LiveuaFlashParchment";
import { LiveuaEventFocusCard } from "@/components/globe/LiveuaEventFocusCard";
import { ObserveScopeMask } from "@/components/globe/ObserveScopeMask";
import { TheaterSitrepBook } from "@/components/globe/TheaterSitrepBook";
import { IntelWatchboard } from "@/components/globe/IntelWatchboard";
import { IntelSourceDrill } from "@/components/globe/IntelSourceDrill";
import { IntelDeskTipCard } from "@/components/globe/IntelDeskTipCard";
import {
  markIntelDeskTipDone,
  shouldOfferIntelDeskTip,
} from "@/lib/intelContract/uxCopy";

import { liveuaFlashMarketContext } from "@/lib/liveuamap/flashMarketContext";
import { buildTheaterSitrep } from "@/lib/theaterReport/buildTheaterSitrep";
import { type TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import {
  canPublish,
  candidatesFromNewsLike,
  gateTheaterSitrep,
  type DeskFocus,
  type DisplayGrade,
  type GateResult,
  type PirModalityStatus,
} from "@/lib/intelContract";
import { LIVEUAMAP_CONTROL_REGION_IDS } from "@/lib/liveuamap/types";
import { filterObservePlaceLabels } from "@/lib/cesiumObservePlaceLod";
import { type PipelineRevealSnap } from "@/lib/flashPipelineReveal";
import {
  INTEL_STACK_CLEARANCE_HISTORY,
  INTEL_STACK_CLEARANCE_HISTORY_COMPACT,
} from "@/lib/news/intelStackMode";

import {
  rememberConflictNav,
  rememberEconomyNav,
  upsertWatchPin,
} from "@/lib/watchFocus";
import type { NewsStreamItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import {
  recordInterestTheme,
} from "@/lib/interest/recordInterest";
import { useLocalCalendarDayKey } from "@/hooks/useLocalCalendarDayKey";
import { useLampContentSlotKey } from "@/hooks/useLampContentSlotKey";
import {
  type SentinelFlyTarget,
} from "@/lib/sentinelMode";
import { type AppUpdate } from "@/lib/appUpdates";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { t } from "@/lib/uiStrings";

import { GeoeconomicsChrome } from "@/components/globe/GeoeconomicsChrome";

import type { NavSelection } from "@/data/navRegions";

import {
  type EconomyHubChoice,
} from "@/lib/autoFlyTarget";
import {
  conceptLayersForEconomyNavId,
  UKRAINE_LIVE_COMPANIONS,
} from "@/lib/conceptLayers";

import { resolveNewsCoords } from "@/lib/news/newsStreamMapTags";
import {
  filterEventsByNavSelection,
  pickMenuCoreAlerts,
  type MenuCoreAlert,
} from "@/lib/regionFilter";
import { getGlobeLod, globeLodFromTier } from "@/lib/globeLod";
import { getTransportLod } from "@/lib/transportLod";
import { expandPlaces } from "@/lib/compactData";

import { fetchAppDataStream, fetchAppDataPlaces, type AppDataLoadProgress } from "@/lib/fetchAppDataStream";
import { useViewportPaths } from "@/hooks/useViewportPaths";
import { computeDashboardBootProgress } from "@/lib/bootLoadingProgress";
import { runWhenIdle } from "@/lib/deferIdle";
import { isClientApiStubMode } from "@/lib/apiStubMode";

import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
} from "@/lib/telegramAlerts";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import {
  type NewfeedsAttackPoint,
} from "@/lib/newfeeds";
import {
  type UkmtoIncidentPoint,
} from "@/lib/ukmtoHatch";
import {
  type NavareaFeaturePoint,
} from "@/lib/navareaHatch";

import { type NeptunLiveThreat } from "@/lib/neptun";
import { SoundEffectsBridge } from "@/components/SoundEffectsBridge";
import {
  type AirRaidFocusBox,
  type AirRaidSirenKind,
} from "@/lib/airRaidFocus";
import { useDataSync } from "@/hooks/useDataSync";
import { useGlobeStaticLayers } from "@/hooks/useGlobeStaticLayers";
import { useMaritimeRoutePaths } from "@/hooks/useMaritimeRoutePaths";
import { useLayerPrefsController } from "@/hooks/useLayerPrefsController";
import {
  DEFAULT_PACKAGE_SELECTION,
  loadViewConfig,
  viewerModeFromPackages,
  type ViewPackageId,
  type ViewPackageUi,
  type ViewTheaterChoice,
  type ViewerMode,
} from "@/lib/viewPackages";
import {
  getViewerChrome,
  stripEconomyGeopoliticsPatch,
} from "@/lib/viewerChrome";

import {
  DEFAULT_BASEMAP_MODE,
  basemapForViewerMode,
  type BasemapMode,
} from "@/lib/basemapMode";

import {
  anyDisputeOverlay,
  DEFAULT_LAYER_PREFS,
  loadLayerPrefs,
  type LabelLanguage,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";
import {
  applyNormalCapToLayerPrefs,
  applyUltraLiteToLayerPrefs,
  estimateWeakDeviceHint,
  hasStoredPerfPrefs,
  loadPerfPrefs,
  savePerfPrefs,
} from "@/lib/ultraLiteMode";

import {
  LOCATION_LOOK_DOWN,
  resolveCinematicCamera,
  resolveCinematicDurationMs,
  type FlyCameraOpts,
} from "@/lib/globeCamera";
import {
  type BattlefieldZone,
} from "@/lib/battlefieldPresets";
import {
  markHotTheaterSessionApplied,
  type HotTheaterFocus,
} from "@/lib/hotTheaterLayers";

import {
  ReturnToGlobeChip,
  SceneMissionPicker,
} from "@/components/SceneMissionPicker";

import {
  hubBriefingLayers,
  type LiveBriefingSession,
} from "@/lib/eventBriefingSession";
import {
  applyConflictDeepDiveLayers,
  FRICTION_DEEP_DIVE_PATCH,
  TERRITORIAL_DEEP_DIVE_PATCH,
  type DeepDiveSession,
} from "@/lib/deepDive/session";
import { DEEP_DIVE_LAYER_TARGET } from "@/lib/deepDive/layerBudget";
import { resolveGeopoliticsRings } from "@/lib/deepDive/geopoliticsRings";
import type { DeepDiveRing } from "@/lib/deepDive/rings";
import { DeepDiveRingPanel } from "@/components/DeepDiveRingPanel";

import {
  type AxisArmsPayload,
} from "@/lib/axisArmsPaths";

import { hubById, selectionForArms, selectionForHubNetwork, type HubClaim } from "@/data/hubNav";
import {
  preferredAxisHub,
  type SelectedAxisLink,
} from "@/lib/axisLinkSelection";
import {
  type SelectedCorridor,
} from "@/lib/corridorSelection";
import { trackEvent } from "@/lib/trackClient";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import {
  altitudeFromEpisodeZoom,
  episodeLat,
  episodeLng,
  frictionEpisodeById,
  hubColorForLens,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";
import { useLazyJsonObject } from "@/hooks/useLazyJson";
import type { FeatureCollection } from "geojson";
import { getGlobeTextures } from "@/lib/mapStyles";
import { setActiveBasemapTone, type BasemapTone } from "@/lib/basemapTone";

import {
  shouldClosePanelOnDataError,
  shouldCloseLocalForGdelt,
} from "@/lib/localOverlayPolicy";

import { useCameraViewport } from "@/hooks/useCameraViewport";
import {
  COUNTRY_POLYGON_MAX_BY_TIER,
  VIEWPORT_RADIUS_BY_TIER,
} from "@/lib/viewportCull";
import {
  pickDisputeAlerts,
  type DisputeAlert,
} from "@/lib/disputeAlerts";
import { resolveDisputeCenter } from "@/lib/disputeCenter";

import { buildDisputeHotspots, type DisputeHotspotEntry } from "@/lib/disputeHotspots";
import { selectViinaPolygons } from "@/lib/viinaLod";
import {
  prefetchUkraineControl,
  readUkraineControlCache,
} from "@/lib/viinaPrefetch";
import { prefetchNeptun } from "@/lib/neptunPrefetch";
import { buildViinaFrontEvents, type ViinaFrontEvent } from "@/lib/viinaFrontEvents";

import { emptyOccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";

import {
  isInUkraineTheater,
} from "@/lib/ukraineSettlementLabels";

import type { ConflictTheater } from "@/lib/conflictEvents/types";
import { CONFLICT_THEATER_PREF_KEY } from "@/lib/conflictEvents/theaterMeta";

import {
  HAPI_CASUALTY_SEED,
  type HapiConflictCasualtiesPayload,
} from "@/lib/hapiConflictCasualties";
import {
  MEDIAZONA_CASUALTY_SEED,
  type MediazonaCasualtySnapshot,
} from "@/lib/mediazonaCasualties";

import type {
  AisVessel,
  AppData,
  ConflictEvent,
  CountryFeature,
  FirmsFire,
  MilitaryAircraft,
  TransportPath,
  UkraineControlData,
  UkraineControlZone,
  UkraineSettlement,
  UsCarrier,
} from "@/data/geoTypes";
import {
  scoreEvents,
  type ScoredEvent,
} from "@/data/eventTiers";
import {
  frictionDeepDoc,
} from "@/data/frictionEpisodeDeep";

import {
  type TerritorialDisputeEpisode,
} from "@/data/territorialDisputeEpisodes";
import {
  GeopoliticsHubChrome,
  GeopoliticsMapChrome,
  GeopoliticsParchmentChrome,
  GeopoliticsSidebarChrome,
} from "@/components/globe/GeopoliticsChrome";
import {
  NewsStreamProvider,
  IntelCompactBar,
  type BottomIntelStackHandle,
} from "@/components/BottomIntelStack";
import {
  isUkraineNavId,
  navIdForNewsTheater,
  navSelectionFromId,
  theaterFocusFromNav,
  type TheaterSidebarTab,
} from "@/lib/theaterFocus";
import { navIdForAxisHubNews } from "@/lib/selectionNewsCoords";
import {
  flyTargetForTheater,
  newsTheaterFromCoords,
  THEATER_FLY_TO,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";
import type { PublicShipObservation } from "@/lib/shipMovements/types";

import {
  type ShipTrailMode,
} from "@/lib/shipMovements/shipMovementBrief";
import {
  type CrossStraitSignalPayload,
} from "@/lib/crossStraitSignal";
import type { ReefWatchPayload } from "@/lib/reefWatch";

import { LogisticsStressCard } from "@/components/LogisticsStressCard";
import { stressForChokepoint } from "@/lib/chokepointStressForUi";

import {
  LOGISTICS_RISK_POINTS,
} from "@/data/logisticsRiskPoints";
import { usePortWatchObservations } from "@/hooks/usePortWatchObservations";
import { useLogisticsStressSiren } from "@/components/globe/hooks/useLogisticsStressSiren";
import { useLogisticsAssetTickers } from "@/components/globe/hooks/useLogisticsAssetTickers";
import { assetVolatilityHintForPoint } from "@/lib/assetVolatilityHint";
import { useAdsbEmergencyAlert } from "@/components/globe/hooks/useAdsbEmergencyAlert";
import type { CesiumEntitySelection, CesiumGlobeHandle } from "@/components/globe/CesiumSatelliteGlobe";
import { FlyToConfirmBanner, type FlyToConfirmOffer } from "@/components/FlyToConfirmBanner";
import { useNatoPerimeterDroneAlert } from "@/components/globe/hooks/useNatoPerimeterDroneAlert";
import { useUltraLiteAutoOffer } from "@/hooks/useUltraLiteAutoOffer";
import { useScreenState } from "@/components/globe/hooks/useScreenState";
import { useFirstImpressionController } from "@/hooks/useFirstImpressionController";
import { useLiveGeoFeedPolling } from "@/components/globe/hooks/useLiveGeoFeedPolling";
import {
  useFocusedSpaceNavigation,
  INCIDENT_ENTRY_ALT,
} from "@/components/globe/hooks/useFocusedSpaceNavigation";
import type {
  EntryGate,
  GlobeDashboardProps,
  GlobeDisplayPoint,
  GlobeLabel,
  GlobeSize,
  NewsStreamNeonMarker,
  NewsInsightCalloutMarker,
  PolygonLayerFeature,
  PulseRingPoint,
  Selection,
} from "@/components/globe/types";
import {
  armsEmbargoStroke,
  infraColors,
  pathLayerColors,
  HISTORY_IMMERSION_MAX_ALTITUDE,
  emptyData,
} from "@/components/globe/constants";
import {
  markWelcomeGateDone,
  markLangChoiceDone,
  markSourcesGateDone,
  readLangChoiceDone,
  readPurposeJobDone,
} from "@/components/globe/formatters";
import {
  getStableLodTier,
} from "@/components/globe/htmlOverlayPointerEvents";
import { GlobeMapCanvas } from "@/components/globe/GlobeMapCanvas";
import { useGlobeMapGlobeProps } from "@/components/globe/hooks/useGlobeMapGlobeProps";
import { useHistoryPolityLayers } from "@/components/globe/hooks/useHistoryPolityLayers";
import { DashboardTopChrome } from "@/components/globe/DashboardTopChrome";
import {
  CesiumDayScrubber,
  useCesiumDayScrubState,
  utcHourNow,
} from "@/components/globe/CesiumDayScrubber";
import { ObserveSensorChips } from "@/components/globe/ObserveSensorChips";
import { ObserveStraitTourChips } from "@/components/globe/ObserveStraitTourChips";
import { StraitReplayHost } from "@/components/globe/replay/StraitReplayHost";
import { ObserveLayerLegend } from "@/components/globe/ObserveLayerLegend";
import { ObserveDeskBookmarkRail } from "@/components/globe/ObserveDeskBookmarkRail";
import { CaseFileDeskPanel } from "@/components/globe/CaseFileDeskPanel";
import { CaseEvidenceAttachBar } from "@/components/globe/CaseEvidenceAttachBar";
import { FirmsFireDetailPanel } from "@/components/globe/FirmsFireDetailPanel";
import { DeskVerifyHud } from "@/components/globe/DeskVerifyHud";
import { readActiveCaseId } from "@/lib/caseFile/clientSession";
import { ObservePaywallOverlay } from "@/components/ObservePaywallOverlay";
import {
  OBSERVE_PREVIEW_MS,
  canMountFullObserve,
  readObserveUnlocked,
} from "@/lib/observeAccess";
import {
  recordCesiumClip,
  shareOrDownloadVideoBlob,
} from "@/lib/cesiumRecordClip";
import { brandName } from "@/lib/brand";
import { zc } from "@/lib/uiStack";
import { MacroBriefingPanel } from "@/components/MacroBriefingPanel";
import type {
  MacroBriefingPayload,
  MacroDomain,
  MacroStep,
} from "@/lib/macroBriefing";
import { useGlobeCamera } from "@/components/globe/hooks/useGlobeCamera";
import { useTheaterNavigation } from "@/components/globe/hooks/useTheaterNavigation";
import { LayerPanelHost, type LayerPanelTab } from "@/components/globe/LayerPanelHost";
import {
  buildOverlayHostAlertProps,
  buildOverlayHostBreakingEscalationProps,
  buildOverlayHostExerciseProps,
  buildOverlayHostPerimeterProps,
  buildOverlayHostUltraLiteProps,
  buildOverlayHostObserveFeedProps,
  buildOverlayHostChromeActionsProps,
} from "@/components/globe/overlayHostPropGroups";
import { useHistoryImmersionActions } from "@/components/globe/hooks/useHistoryImmersionActions";
import { useAlertDisplayModel } from "@/components/globe/hooks/useAlertDisplayModel";
import { runBreakingFlashGoToLocation } from "@/lib/news/breakingFlashNavigate";
import { useGlobeOverlayModel } from "@/components/globe/hooks/useGlobeOverlayModel";
import { useLiveVesselAirPolling } from "@/components/globe/hooks/useLiveVesselAirPolling";
import { useLiveOsintPolling } from "@/components/globe/hooks/useLiveOsintPolling";
import { useDailyLampPipeline } from "@/components/globe/hooks/useDailyLampPipeline";
import { useLiveuaObserveFeed } from "@/components/globe/hooks/useLiveuaObserveFeed";
import { useBreakingFlashController } from "@/components/globe/hooks/useBreakingFlashController";
import { useMapInteractionHandlers } from "@/components/globe/hooks/useMapInteractionHandlers";
import { useEpisodePostureOverlays } from "@/components/globe/hooks/useEpisodePostureOverlays";
import { useIncidentMarkers } from "@/components/globe/hooks/useIncidentMarkers";
import { useFirmsTheaterDisplayModel } from "@/components/globe/hooks/useFirmsTheaterDisplayModel";
import { useNewsInsightActions } from "@/components/globe/hooks/useNewsInsightActions";
import { useSessionOfferEffects } from "@/components/globe/hooks/useSessionOfferEffects";
import { useModeSceneHandlers } from "@/components/globe/hooks/useModeSceneHandlers";
import { useObserveAlertModel } from "@/components/globe/hooks/useObserveAlertModel";
import { useAlertAndAutoOfferEffects } from "@/components/globe/hooks/useAlertAndAutoOfferEffects";
import { useLayerPanelActions } from "@/components/globe/hooks/useLayerPanelActions";
import { useStableGlobeLayers } from "@/components/globe/hooks/useStableGlobeLayers";
import { useStrategicPathLayers } from "@/components/globe/hooks/useStrategicPathLayers";
import { useDisputeZoneLayers } from "@/components/globe/hooks/useDisputeZoneLayers";
import { useBlocPolygonLayers } from "@/components/globe/hooks/useBlocPolygonLayers";

export type { GlobeDashboardProps } from "@/components/globe/types";

/** 좌하단 일일 랭킹·WTI·예측 패널 접기 선호 (텔레그램 패널 가림 방지) */
const DAILY_RANK_PANEL_KEY = "cv-daily-rank-panel-open";

export function GlobeDashboard({
  viinaMeta = null,
  initialViewConfig = null,
  onBootProgress,
  onBootReady,
}: GlobeDashboardProps) {
  const globeRef = useRef<MapGlobeMethods>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intelStackRef = useRef<BottomIntelStackHandle>(null);
  /** P3-1: BottomIntel 청크 — idle 또는 시트 오픈 시에만 마운트 */
  const [intelChunkReady, setIntelChunkReady] = useState(false);
  const lastGlobeClickAt = useRef(0);
  const skipNextGlobeClickRef = useRef(false);
  const introPlayedRef = useRef(false);
  const packageTheaterFocusPlayedRef = useRef(false);
  const packageEconFocusPlayedRef = useRef(false);
  const [size, setSize] = useState<GlobeSize>(() => {
    if (typeof window === "undefined") return { width: 1280, height: 720 };
    return {
      width: Math.max(320, window.innerWidth),
      height: Math.max(420, window.innerHeight),
    };
  });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AppData>(emptyData);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  /** 좌 서랍 역할 — 레이어 / 설정 / 데이터 (탭바 없이 메뉴로 고름) */
  const [leftPanelTab, setLeftPanelTab] = useState<LayerPanelTab>("layers");
  /** 퀵 드롭다운 UI는 Nullschool 크롬으로 이전 — 게이트 플래그만 유지(항상 닫힘) */
  const [layerDropdownOpen] = useState(false);
  const [layerPanelDirty, setLayerPanelDirty] = useState(false);
  const deferLayerMapApplyRef = useRef(false);
  const panelDraftPatchRef = useRef<Partial<LayerPrefs>>({});
  const categorySnapshotRef = useRef<LayerCategory[] | null>(null);
  const layerPanelSessionRef = useRef(0);
  const prevShowLeftPanelRef = useRef(false);
  /** 패널 열 때 커밋 스냅샷 — 취소 시 복원 */
  const panelOpenSnapshotRef = useRef<LayerPrefs | null>(null);
  const [intelSheetOpen, setIntelSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const arm = () => {
      if (!cancelled) setIntelChunkReady(true);
    };
    const w = typeof globalThis !== "undefined" ? globalThis : null;
    if (w && "requestIdleCallback" in w) {
      const id = (
        w as typeof globalThis & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
          cancelIdleCallback: (id: number) => void;
        }
      ).requestIdleCallback(arm, { timeout: 5_000 });
      return () => {
        cancelled = true;
        (
          w as typeof globalThis & { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback(id);
      };
    }
    const t = setTimeout(arm, 2_800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);
  useEffect(() => {
    if (intelSheetOpen) setIntelChunkReady(true);
  }, [intelSheetOpen]);
  const [layerPanelReady, setLayerPanelReady] = useState(false);
  const [frozenPanelCategories, setFrozenPanelCategories] = useState<LayerCategory[] | null>(null);

  useEffect(() => {
    if (showLeftPanel && !prevShowLeftPanelRef.current) {
      layerPanelSessionRef.current += 1;
      setLayerPanelDirty(false);
      panelDraftPatchRef.current = {};
      panelOpenSnapshotRef.current = { ...layerPrefsLiveRef.current };
    }
    prevShowLeftPanelRef.current = showLeftPanel;
    // 패널 체크는 soft-apply로 지도에 바로 반영(배치). defer 하면 송유/가스/케이블이
    // 「설정」 전까지 영원히 안 보이는 것처럼 난다.
    deferLayerMapApplyRef.current = false;
    if (!showLeftPanel) {
      setLayerPanelDirty(false);
    }
  }, [showLeftPanel]);

  useEffect(() => {
    if (!showLeftPanel && !layerDropdownOpen) {
      setLayerPanelReady(false);
      return;
    }
    const id = requestAnimationFrame(() => setLayerPanelReady(true));
    return () => cancelAnimationFrame(id);
  }, [showLeftPanel, layerDropdownOpen]);

  const [intelTheaterFilter, setIntelTheaterFilter] = useState<IntelTheaterFilter>(() => {
    const theater = initialViewConfig?.theater;
    if (theater && theater !== "auto") return theater;
    return "all";
  });
  const [viewUi, setViewUi] = useState<ViewPackageUi>(() => ({
    ...(initialViewConfig?.ui ?? {
      showTicker: true,
      defaultIntelTab: "news" as const,
      openLayerPanel: false,
    }),
    // 뉴스 시트는 지구본을 가리므로 첫 진입 시 항상 닫아 둔다.
    autoOpenIntelSheet: false,
  }));
  const [viewTheater, setViewTheater] = useState<ViewTheaterChoice>(
    () => initialViewConfig?.theater ?? "auto",
  );
  const [viewEconomyHub, setViewEconomyHub] = useState<EconomyHubChoice>(
    () => initialViewConfig?.economyHub ?? "auto",
  );
  const [viewPackages, setViewPackages] = useState<ViewPackageId[]>(() => {
    const saved = initialViewConfig?.packages.filter((id) => id !== "custom");
    return saved && saved.length > 0 ? saved : DEFAULT_PACKAGE_SELECTION;
  });
  /** packages만으로는 conflict/history 구분이 안 되어 명시 상태 유지 */
  const [viewerMode, setViewerMode] = useState<ViewerMode>(() => {
    const saved = loadViewConfig()?.viewerMode;
    if (
      saved === "conflict" ||
      saved === "history" ||
      saved === "economy" ||
      saved === "satellite" ||
      saved === "live"
    ) {
      if (saved === "history") return "conflict";
      if (saved === "live") return "satellite";
      return saved;
    }
    const pkgs = initialViewConfig?.packages.filter((id) => id !== "custom");
    return viewerModeFromPackages(
      pkgs && pkgs.length > 0 ? pkgs : DEFAULT_PACKAGE_SELECTION,
    );
  });
  const viewerChromePreset = getViewerChrome(viewerMode);
  const isEconomyViewer = viewerMode === "economy";
  const isSatelliteViewer = viewerMode === "satellite";
  const isLiveViewer = viewerMode === "live";
  const isConflictViewer = viewerMode === "conflict";
  const isHistoryViewer = viewerMode === "history";
  /** 역사 토글 연도 스크러버 — Balhae peak 데모 기본 850 (요동·연해주 중부) */
  const [historyYear, setHistoryYear] = useState(850);
  /** peacesciencer 배경 — 지정학/지경학만 (역사·관측·항적 제외) */
  const peaceScienceFlashDomain =
    isEconomyViewer ? ("economy" as const) : isConflictViewer ? ("conflict" as const) : null;
  const isCompactUi = useCompactUi();
  // 폰: 지구본을 mount하지 않고 텍스트/알림 뷰만. 태블릿/데스크톱만 3D 지구본.
  const isPhoneUi = usePhoneUi();
  const deviceProfile = useDeviceProfile();
  const isTabletUi = deviceProfile === "tablet";
  const isDesktopWideUi = deviceProfile === "desktop-wide";

  /** 역사 모드 — 인텔 스택 언마운트 시 clearance를 연도 스크럽 높이로 맞춤 */
  useEffect(() => {
    if (!isHistoryViewer || intelSheetOpen) return;
    document.documentElement.style.setProperty(
      "--bottom-intel-stack-clearance",
      isCompactUi
        ? INTEL_STACK_CLEARANCE_HISTORY_COMPACT
        : INTEL_STACK_CLEARANCE_HISTORY,
    );
  }, [isHistoryViewer, intelSheetOpen, isCompactUi]);
  const [compactChipId, setCompactChipId] = useState<CompactChipId>("frontline");
  const desktopSnapshotRef = useRef<{ layers: LayerPrefs; ultraLite: boolean } | null>(null);
  const compactWasActiveRef = useRef(false);
  const layerPrefsLiveRef = useRef<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const [showModePicker, setShowModePicker] = useState(false);
  const [modePickerLockMode, setModePickerLockMode] = useState(false);
  const [modePickerInitialMode, setModePickerInitialMode] = useState<ViewerMode | null>(null);
  const [entryGate, setEntryGate] = useState<EntryGate>(null);
  /** 언어 확정 여부 — false면 등불·LampPreparing 보류 */
  const [langChoiceDone, setLangChoiceDone] = useState(false);
  const [langChoiceChecked, setLangChoiceChecked] = useState(false);
  const [purposeJobDone, setPurposeJobDone] = useState(false);
  const [purposeJobChecked, setPurposeJobChecked] = useState(false);
  const [purposeJobForced, setPurposeJobForced] = useState(false);

  /** 관측대 soft entitlement (1A) — 실결제 없음 */
  const [observeTracksNudge, setObserveTracksNudge] = useState(false);
  const [observeUnlocked, setObserveUnlocked] = useState(false);
  const [observePreview, setObservePreview] = useState<{
    phase: "preview" | "expired";
    startedAt: number;
  } | null>(null);
  const observePreviewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setObserveUnlocked(readObserveUnlocked());
  }, []);

  const clearObservePreviewTimer = useCallback(() => {
    if (observePreviewTimerRef.current != null) {
      window.clearTimeout(observePreviewTimerRef.current);
      observePreviewTimerRef.current = null;
    }
  }, []);

  const startObservePreview = useCallback(() => {
    clearObservePreviewTimer();
    const startedAt = Date.now();
    setObservePreview({ phase: "preview", startedAt });
    observePreviewTimerRef.current = window.setTimeout(() => {
      setObservePreview({ phase: "expired", startedAt });
      observePreviewTimerRef.current = null;
    }, OBSERVE_PREVIEW_MS);
  }, [clearObservePreviewTimer]);

  const endObservePreview = useCallback(() => {
    clearObservePreviewTimer();
    setObservePreview(null);
  }, [clearObservePreviewTimer]);

  useEffect(() => {
    return () => clearObservePreviewTimer();
  }, [clearObservePreviewTimer]);

  const nudgeObserveForTracks = useCallback(() => {
    setObserveTracksNudge(true);
    window.setTimeout(() => setObserveTracksNudge(false), 5_500);
  }, []);
  /** 오늘의 투어 — 분쟁 상위 장면 순차 재생 */
  const [tourActive, setTourActive] = useState(false);
  const domainThenDetailTimerRef = useRef<number | null>(null);

  /** 모바일에서는 환영 양피지를 건너뛰고 출처 고지로 — 언어 확정 후에만 */
  useEffect(() => {
    if (entryGate === "welcome" && isCompactUi) {
      if (!readLangChoiceDone()) {
        setEntryGate(null);
        return;
      }
      setEntryGate("sources");
    }
  }, [entryGate, isCompactUi]);

  useEffect(() => {
    setLangChoiceDone(readLangChoiceDone());
    setLangChoiceChecked(true);
    setPurposeJobDone(readPurposeJobDone());
    setPurposeJobChecked(true);
  }, []);

  const [chromeCoachStep, setChromeCoachStep] = useState<ChromeCoachStep | null>(null);
  const [showFirstVisitTour, setShowFirstVisitTour] = useState(false);
  const [frictionCoachStep, setFrictionCoachStep] = useState<FrictionCoachStep | null>(null);
  const frictionCoachAwaitHistoryRef = useRef(false);
  const frictionCoachListAckRef = useRef(false);
  const [showAirRaidCoach, setShowAirRaidCoach] = useState(false);
  /** 거시 요약본 창 — RSS×GDELT 롤업 */
  const [macroBriefingOpen, setMacroBriefingOpen] = useState(false);
  const [macroBriefingFolded, setMacroBriefingFolded] = useState(false);
  const [macroBriefingDomain, setMacroBriefingDomain] = useState<MacroDomain>("geo");
  const [macroBriefingPayload, setMacroBriefingPayload] =
    useState<MacroBriefingPayload | null>(null);
  const [macroBriefingLoading, setMacroBriefingLoading] = useState(false);
  const [macroBriefingError, setMacroBriefingError] = useState<string | null>(null);
  /** 뉴스 네온 — 매체 2개 이상이면 관점 조합 패널 */
  const [newsPerspectives, setNewsPerspectives] = useState<NewsStreamNeonMarker | null>(null);
  /** 뉴스 인사이트 「지도에서 보기」 콜아웃 — 패널 열린 동안만 */
  const [newsInsightCallout, setNewsInsightCallout] =
    useState<NewsInsightCalloutMarker | null>(null);
  const [economyAttackReaction, setEconomyAttackReaction] = useState<{
    ageMinutes: number;
    title: string;
  } | null>(null);
  const [watchFocusLine, setWatchFocusLine] = useState<string | null>(null);
  const [tomorrowTensionPrompt, setTomorrowTensionPrompt] = useState<DailyPrompt | null>(null);
  /** 인가 강등 위기/강등 칩 */
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceStatus | null>(null);
  /** 강등 칩을 닫았거나 불필요 — 등불보다 우선 */
  const [, setClearanceChipSettled] = useState(false);
  const livePrefsBeforeHistoryRef = useRef<Partial<Record<string, boolean>> | null>(null);
  const [showTourInvite, setShowTourInvite] = useState(false);
  /** 전역 입장 후 — 핫 지역 이동 선택창 (수락 시에만 fly) */
  const [hotTheaterOffer, setHotTheaterOffer] = useState<HotTheaterFocus | null>(null);
  const [showSceneMissionPicker, setShowSceneMissionPicker] = useState(false);
  const [sceneMissionActive, setSceneMissionActive] = useState(false);
  const quietOverviewAppliedRef = useRef(false);
  const pendingQuietOverviewRef = useRef(false);
  const [airRaidBriefing, setAirRaidBriefing] = useState<AirRaidBriefingContent | null>(null);
  /** 레이어 패널 첫 오픈 — UX 안내 양피지 (브라우저당 1회) */
  const [uxGuideBrief, setUxGuideBrief] = useState<UxGuideBriefContent | null>(null);
  /** 가까운 경사 시야로 들어간 창. 휠 줌아웃은 막고, 나가기로만 빠진다. */
  const [incidentSpace, setIncidentSpace] = useState<{
    title: string;
    kicker: string;
    ceilingAltitude: number;
    returnTo: { lat: number; lng: number; altitude: number };
  } | null>(null);
  const incidentSpaceRef = useRef(incidentSpace);
  incidentSpaceRef.current = incidentSpace;
  const pendingObserveFlyRef = useRef<{
    lat: number;
    lng: number;
    altitude?: number;
    durationMs?: number;
    camera?: FlyCameraOpts;
    subtitle: string;
    title: string;
    selection?: Selection;
  } | null>(null);
  const [flyToConfirmOffer, setFlyToConfirmOffer] = useState<FlyToConfirmOffer | null>(null);
  const focusAltitudeCeilingRef = useRef<number | null>(null);
  const historyReturnRef = useRef<{ lat: number; lng: number; altitude: number } | null>(null);
  const historyRoomTargetRef = useRef<number | null>(null);
  const outsideViewRef = useRef<{ lat: number; lng: number; altitude: number } | null>(null);
  const [historyEntryAlt, setHistoryEntryAlt] = useState<number | null>(null);
  const onCloseLookRef = useRef<
    | ((info: {
        lat: number;
        lng: number;
        altitude: number;
        pitch: number;
        bearing: number;
        durationMs: number;
        title?: string;
        kicker?: string;
      }) => void)
    | null
  >(null);
  /**
   * 지정학 심층 — 허브/마찰/영토 브리프 중.
   * 레이어 교체(목표 3) · 속보 타전 잠금.
   */
  const [deepDiveSession, setDeepDiveSession] = useState<DeepDiveSession | null>(null);
  const deepDiveSessionRef = useRef<DeepDiveSession | null>(null);
  deepDiveSessionRef.current = deepDiveSession;
  /** 등불 파이프라인(useDailyLampPipeline)이 일찍 필요로 하는 양피지 점유 상태 */
  const [hubBriefOpen, setHubBriefOpen] = useState(false);
  const [econInsightOpen, setEconInsightOpen] = useState(false);
  const [frictionEpisodeBrief, setFrictionEpisodeBrief] = useState<FrictionEpisode | null>(null);
  /** 로컬 자정에 바뀜 — 매일 등불·인가 재점화 트리거 */
  const calendarDayKey = useLocalCalendarDayKey();
  /** 6시간 슬롯 — 등불 사진·뉴스 재점화 */
  const lampContentSlot = useLampContentSlotKey();
  const battlefieldSoftZoneRef = useRef<BattlefieldZone | null>(null);
  const battlefieldManualUntilRef = useRef(0);
  /**
   * 유저가 레이어 체크를 직접 바꾸면 true.
   * 전장 soft-apply(진입/이탈 시 allShowOff 프리셋)가 수동 선택을 덮어쓰지 못하게 한다.
   * 탐색 탭·도메인 전환처럼 프리셋을 의도한 진입에서는 풀린다.
   */
  const userLayerPinRef = useRef(false);
  const pinUserLayers = useCallback(() => {
    userLayerPinRef.current = true;
  }, []);
  const unpinUserLayers = useCallback(() => {
    userLayerPinRef.current = false;
  }, []);

  useEffect(() => {
    if (viewerMode === "economy") setMacroBriefingDomain("econ");
    else if (viewerMode === "conflict" || viewerMode === "live") {
      setMacroBriefingDomain("geo");
    }
  }, [viewerMode]);

  useEffect(() => {
    if (viewerMode === "history" || viewerMode === "satellite") {
      setMacroBriefingOpen(false);
      setMacroBriefingFolded(false);
    }
  }, [viewerMode]);

  const [showViewerIntro, setShowViewerIntro] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const [askLayersOpen, setAskLayersOpen] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showDataSourceParchment, setShowDataSourceParchment] = useState(false);
  const [showTrustPanel, setShowTrustPanel] = useState(false);
  /** 모바일 전용 — 지구본을 가리지 않는 속보+반응 바텀시트 (지구본과 동시에 볼 수 있음) */
  const [showMobileAlertFeed, setShowMobileAlertFeed] = useState(false);
  const [playOverlay, setPlayOverlay] = useState<"where" | "sense" | null>(null);
  const [sentinelActive, setSentinelActive] = useState(false);
  const [sentinelTour, setSentinelTour] = useState<SentinelFlyTarget[]>([]);
  const [sentinelIndex, setSentinelIndex] = useState(0);
  const [whatsNewUpdate, setWhatsNewUpdate] = useState<AppUpdate | null>(null);
  /**
   * 일일 랭킹·WTI·UP/DOWN 패널 접기 — 좌하단에서 텔레그램 OSINT 패널을 가리는 문제 때문에
   * 유저가 직접 여닫을 수 있어야 한다. SSR 불일치를 피하려고 초기값은 항상 true,
   * 저장된 선호는 마운트 후 useEffect에서 반영.
   */
  const [showDailyRankPanel, setShowDailyRankPanel] = useState(true);
  const [showLocalAlertPanel, setShowLocalAlertPanel] = useState(false);
  const [showGdeltAlertPanel, setShowGdeltAlertPanel] = useState(false);
  const [showDisputeLegendPanel, setShowDisputeLegendPanel] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [activeCaseOpen, setActiveCaseOpen] = useState(false);
  const [incidentPickActive, setIncidentPickActive] = useState(false);
  const [pickedIncidentPoint, setPickedIncidentPoint] = useState<{
    lat: number;
    lng: number;
    seq: number;
  } | null>(null);
  useEffect(() => {
    setActiveCaseOpen(Boolean(readActiveCaseId()));
  }, []);
  const [hoveredPoint, setHoveredPoint] = useState<GlobeDisplayPoint | null>(null);
  const [hoveredNeptunThreat, setHoveredNeptunThreat] = useState<NeptunLiveThreat | null>(null);
  const [hoveredPolygon, setHoveredPolygon] = useState<PolygonLayerFeature | null>(null);
  const [hoveredPath, setHoveredPath] = useState<TransportPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appDataLoadProgress, setAppDataLoadProgress] = useState<AppDataLoadProgress | null>(
    null,
  );
  const [globeReady, setGlobeReady] = useState(false);
  const [showIntroHint, setShowIntroHint] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const showLanguageGate =
    langChoiceChecked &&
    !langChoiceDone &&
    !isLoading &&
    !loadError &&
    globeReady &&
    entryGate === null &&
    !showModePicker;
  const showPurposeJobGate =
    purposeJobChecked &&
    langChoiceChecked &&
    langChoiceDone &&
    (!purposeJobDone || purposeJobForced) &&
    !showLanguageGate &&
    !isLoading &&
    !loadError &&
    globeReady &&
    entryGate === null &&
    !showModePicker;
  const [gdeltEvents, setGdeltEvents] = useState<ConflictEvent[]>([]);
  const [gdeltLoading, setGdeltLoading] = useState(false);
  const [gdeltError, setGdeltError] = useState<string | null>(null);
  const [gdeltFetchedAt, setGdeltFetchedAt] = useState<string | null>(null);
  const [telegramAlerts, setTelegramAlerts] = useState<TelegramAlert[]>([]);
  const [newsStreamPayload, setNewsStreamPayload] = useState<NewsStreamPayload | null>(null);
  /** 세슘 전황 책 보고서 — 국소 프로토타입 */
  const [theaterSitrepRegion, setTheaterSitrepRegion] =
    useState<TheaterSitrepRegionId | null>(null);
  /** IntelContract Source drill — 관측/지정학/지경학 공통 */
  const [intelDrillGate, setIntelDrillGate] = useState<GateResult | null>(null);
  const [intelDrillPirStatuses, setIntelDrillPirStatuses] = useState<
    PirModalityStatus[]
  >([]);
  /** 워치보드 → 세슘 스포트라이트 */
  const [deskFocus, setDeskFocus] = useState<DeskFocus | null>(null);
  /** hold→active 승격 하이라이트 */
  const [promotingItemId, setPromotingItemId] = useState<string | null>(null);
  const watchGradePrevRef = useRef<Map<string, DisplayGrade>>(new Map());
  const openIntelDrill = useCallback(
    (gate: GateResult, pirStatuses: PirModalityStatus[] = []) => {
      setIntelDrillGate(gate);
      setIntelDrillPirStatuses(pirStatuses);
    },
    [],
  );
  const closeIntelDrill = useCallback(() => {
    setIntelDrillGate(null);
    setIntelDrillPirStatuses([]);
  }, []);
  /** 관측대 안건 보드 첫 안내 카드 */
  const [intelDeskTipVisible, setIntelDeskTipVisible] = useState(false);
  /** 속보→배관 잠깐 표시 — 원래 OFF였던 키만 타이머 후 복원 */
  const pipelineRevealSnapRef = useRef<PipelineRevealSnap | null>(null);
  const pipelineRevealTimerRef = useRef<number | null>(null);
  const [telegramLive, setTelegramLive] = useState(false);
  const [telegramNeedsAuth, setTelegramNeedsAuth] = useState(false);
  const [telegramSessionExists, setTelegramSessionExists] = useState(false);
  const [telegramEmbedMode, setTelegramEmbedMode] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState<
    "idle" | "loading" | "ok" | "error" | "stub" | "waiting"
  >("idle");
  const [tzevaAdomActive, setTzevaAdomActive] = useState<TzevaAdomAlert[]>([]);
  const [tzevaAdomHistory, setTzevaAdomHistory] = useState<TzevaAdomAlert[]>([]);
  const [tzevaAdomLive, setTzevaAdomLive] = useState(false);
  const [tzevaAdomGeoRestricted, setTzevaAdomGeoRestricted] = useState(false);
  const [tzevaAdomError, setTzevaAdomError] = useState<string | null>(null);
  const [tzevaAdomStatus, setTzevaAdomStatus] = useState<
    "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked"
  >("idle");
  const [newfeedsAttacks, setNewfeedsAttacks] = useState<NewfeedsAttackPoint[]>([]);
  const [newfeedsThreatLabel, setNewfeedsThreatLabel] = useState<string | null>(null);
  const [newfeedsLive, setNewfeedsLive] = useState(false);
  const [newfeedsError, setNewfeedsError] = useState<string | null>(null);
  const [newfeedsStatus, setNewfeedsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  /** UKMTO(Royal Navy) 상선 피습·나포·의심활동 — 비공식 엔드포인트, cron이 D1에 적재한 걸 읽기만 함 */
  const [ukmtoIncidents, setUkmtoIncidents] = useState<UkmtoIncidentPoint[]>([]);
  const [ukmtoStatus, setUkmtoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  /** NAVAREA in-force — 보라 폴리곤, cron D1 스냅샷 */
  const [navareaFeatures, setNavareaFeatures] = useState<NavareaFeaturePoint[]>([]);
  const [navareaStatus, setNavareaStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  /** 군사 훈련 경보 — 공시·OSINT 다층 */
  const [militaryExercises, setMilitaryExercises] = useState<MilitaryExercise[]>([]);
  const [militaryExercisesStatus, setMilitaryExercisesStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  /** Cross-Strait Signal 공개 API — 훈련·ADIZ 집계·긴장 기사·보도된 함정 위치 */
  const [crossStraitSignal, setCrossStraitSignal] =
    useState<CrossStraitSignalPayload | null>(null);
  const [crossStraitSignalStatus, setCrossStraitSignalStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  /** ReefWatch — SCS feature registry + OpenSky near-feature traffic */
  const [reefWatch, setReefWatch] = useState<ReefWatchPayload | null>(null);
  const [reefWatchStatus, setReefWatchStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [exerciseBriefing, setExerciseBriefing] = useState<ExerciseBriefingContent | null>(null);
  const [chokepointStressBriefing, setChokepointStressBriefing] =
    useState<ChokepointStressBriefing | null>(null);
  /** 공습사이렌 포커스 — 사각 틀 없이 해당 지역 빗금만 */
  const [airRaidFocusPaths, setAirRaidFocusPaths] = useState<TransportPath[]>([]);
  const [airRaidFocusBox, setAirRaidFocusBox] = useState<AirRaidFocusBox | null>(null);
  const airRaidFocusClearRef = useRef<number | null>(null);

  const parseEastAsiaAdiz = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  const { data: eastAsiaAdizFc } = useLazyJsonObject<FeatureCollection>(
    "east-asia-adiz.geojson",
    isConflictViewer && globeReady,
    parseEastAsiaAdiz,
    { deferUntilIdle: true },
  );

  useEffect(() => {
    if (!isEconomyViewer) return;
    setAirRaidFocusPaths([]);
    setAirRaidFocusBox(null);
    if (airRaidFocusClearRef.current != null) {
      window.clearTimeout(airRaidFocusClearRef.current);
      airRaidFocusClearRef.current = null;
    }
  }, [isEconomyViewer]);

  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [syncBusy, setSyncBusy] = useState(false);
  const [ukraineControl, setUkraineControl] = useState<UkraineControlZone[]>([]);
  const [ukraineControlOverview, setUkraineControlOverview] = useState<UkraineControlZone[]>([]);
  const [ukraineControlDate, setUkraineControlDate] = useState<string | null>(
    () => viinaMeta?.controlDate ?? null,
  );
  const [ukraineRuCellCount, setUkraineRuCellCount] = useState(
    () => viinaMeta?.ruCellCount ?? 0,
  );
  const [ukraineSettlements, setUkraineSettlements] = useState<UkraineSettlement[]>([]);
  const [ukraineControlStatus, setUkraineControlStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >(() => (viinaMeta?.available ? "idle" : "error"));
  /**
   * LiveUA 다전장 통제면 (UA·IR·YE·LB·IL-PS) — MapLibre macro/micro + Cesium 공유.
   * 60s 폴링으로만 채움. DeepState 금지.
   */
  const [ukraineOccupiedGeoJson, setUkraineOccupiedGeoJson] = useState<FeatureCollection>(
    () => emptyOccupiedGeoJson(),
  );
  const [ukraineOccupiedStatus, setUkraineOccupiedStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  /** Cesium DataSource용 — ukraineOccupiedGeoJson과 동일 소스 */
  const [liveuaControlGeoJson, setLiveuaControlGeoJson] =
    useState<FeatureCollection | null>(null);
  const liveuaTerritoryByRegionRef = useRef<
    Partial<Record<
      "ukraine" | "iran" | "yemen" | "lebanon" | "israel-palestine",
      FeatureCollection["features"]
    >>
  >({});
  const [hapiCasualties] = useState<HapiConflictCasualtiesPayload>(() => ({
    ...HAPI_CASUALTY_SEED,
    fronts: [],
  }));
  const [mediazonaCasualties] = useState<MediazonaCasualtySnapshot>(MEDIAZONA_CASUALTY_SEED);
  const ukraineSettlementsLoadedRef = useRef(false);
  const ukraineSettlementsSourceRef = useRef<UkraineSettlement[]>([]);
  const ukraineFetchStartedRef = useRef(false);
  const ukraineZoomPendingRef = useRef(false);
  const autoRegionZoomSeededRef = useRef(false);
  const prevUkraineLayerOnRef = useRef(false);
  const prevNeptunLayerOnRef = useRef(false);
  const neptunZoomPendingRef = useRef(false);
  /** 도메인 선택~세부 확정 전: 우크라/NEPTUN/인트로 자동 줌 억제 */
  const suppressAutoRegionZoomRef = useRef(false);
  const [aisVessels, setAisVessels] = useState<AisVessel[]>([]);
  const [disguisedVessels, setDisguisedVessels] = useState<AisVessel[]>([]);
  const [disguisedLoading, setDisguisedLoading] = useState(false);
  const [disguisedError, setDisguisedError] = useState<string | null>(null);
  const [aisLoading, setAisLoading] = useState(false);
  const [aisError, setAisError] = useState<string | null>(null);
  const [milAircraft, setMilAircraft] = useState<MilitaryAircraft[]>([]);
  const [civAircraft, setCivAircraft] = useState<MilitaryAircraft[]>([]);
  const [milLoading, setMilLoading] = useState(false);
  const [civLoading, setCivLoading] = useState(false);
  const [milError, setMilError] = useState<string | null>(null);
  const [civError, setCivError] = useState<string | null>(null);
  const [usCarriers, setUsCarriers] = useState<UsCarrier[]>([]);
  const [usCarriersLoading, setUsCarriersLoading] = useState(false);
  const [hoveredCarrier, setHoveredCarrier] = useState<UsCarrier | null>(null);
  const [hoveredMilAircraft, setHoveredMilAircraft] = useState<MilitaryAircraft | null>(null);
  const [shipMovesMap, setShipMovesMap] = useState<PublicShipObservation[]>([]);
  const [shipMovesTimeline, setShipMovesTimeline] = useState<PublicShipObservation[]>([]);
  const [, setShipMovesLoading] = useState(false);
  const [, setShipMovesDisclaimer] = useState<string | null>(null);
  const [, setShipMovesSelectedId] = useState<string | null>(null);
  const [shipMovesTrailMode] = useState<ShipTrailMode>("fleet");
  const [shipMovesFocusGroupKey, setShipMovesFocusGroupKey] = useState<string | null>(null);
  const [shipMovesBriefTrack, setShipMovesBriefTrack] = useState<PublicShipObservation[] | null>(
    null,
  );
  const [shipMovesBriefFocusId, setShipMovesBriefFocusId] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLElement>(null);
  const [hoverPointer, setHoverPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverGlobeCoords, setHoverGlobeCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [cyberEvents, setCyberEvents] = useState<ConflictEvent[]>([]);
  const [electionEvents, setElectionEvents] = useState<ConflictEvent[]>([]);
  const [firmsFires, setFirmsFires] = useState<FirmsFire[]>([]);
  const [, setFirmsLoading] = useState(false);
  const [firmsError, setFirmsError] = useState<string | null>(null);
  const firmsBboxRef = useRef("");
  const firmsFetchBusyRef = useRef(false);
  const ultraLiteRef = useRef(false);
  const [ultraLite, setUltraLite] = useState(false);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>(DEFAULT_BASEMAP_MODE);
  /** 레이어·지도 호버 데이터 패널 — PerfPrefs, 기본 ON */
  const [showLayerHoverInfo, setShowLayerHoverInfo] = useState(true);
  const {
    layerPrefs,
    draftPrefs,
    togglePref: togglePrefRaw,
    toggleCategoryPrefs: toggleCategoryPrefsRaw,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    patchDraftOnly,
    discardDraftPrefs,
    peekDraftPrefs,
    batchPending,
    applyGeneration,
    immediateUntilRef,
  } = useLayerPrefsController(deferLayerMapApplyRef, { ultraLiteRef });

  /**
   * 오늘의 등불 / 주간 회고 / WTI / 일별 랭크 스크럽 — useDailyLampPipeline.
   * (layerPrefs.labelLanguage 이후, getSceneForShare·useSceneDeeplink 이전에 호출)
   */
  const {
    dailyLampSettled,
    weeklyRecap,
    weeklyRecapCollapsed,
    setWeeklyRecapCollapsed,
    weeklyRecapSettled,
    periodicBriefing,
    setPeriodicBriefing,
    foldedPeriodicBriefing,
    setFoldedPeriodicBriefing,
    setDailyLampSettled,
    wtiSnapshot,
    wtiFetchedAt,
    setViewAsOf,
    rankAvailableDates,
    lampModeSwitchPendingRef,
    weeklyExpanded,
    issueUiPausedForLamp,
    showLampPreparing,
    todayUtc,
    effectiveAsOf,
    isHistoricalView,
    prepareLampForModeSwitch,
    resetForCalendarDay,
  } = useDailyLampPipeline({
    calendarDayKey,
    lampContentSlot,
    viewerMode,
    isHistoryViewer,
    isSatelliteViewer,
    labelLanguage: layerPrefs.labelLanguage,
    globeReady,
    isLoading,
    loadError,
    entryGate,
    showModePicker,
    langChoiceChecked,
    langChoiceDone,
    purposeJobChecked,
    purposeJobDone,
    purposeJobForced,
    chromeCoachStep,
    showAirRaidCoach,
    hubBriefOpen,
    frictionEpisodeBrief,
    econInsightOpen,
    watchFocusLine,
  });

  useEffect(() => {
    if (periodicBriefing || weeklyExpanded) {
      setMacroBriefingOpen(false);
    }
  }, [periodicBriefing, weeklyExpanded]);

  /**
   * RSS 신속속보 ↔ LiveUA 양피지 상호 배타.
   * BreakingFlash 컨트롤러는 newsStreamPayload/intelDisconfirmCorpus 이후에 호출되므로
   * LiveUA 훅에는 ref 경유 안정 콜백을 넘기고, 컨트롤러 호출 직후 ref를 채운다.
   */
  const clearBreakingFlashRef = useRef<() => void>(() => {});
  const clearBreakingFlash = useCallback(() => {
    clearBreakingFlashRef.current();
  }, []);

  const {
    liveuaEvents,
    liveuaEnergyEvents,
    liveuaToast,
    setLiveuaToast,
    liveuaUnread,
    liveuaReadIds,
    markAllLiveuaRead,
    liveuaParchmentIndex,
    setLiveuaParchmentIndex,
    focusedLiveuaId,
    setFocusedLiveuaId,
    focusedLiveuaEvent,
    resetLiveuaUi,
  } = useLiveuaObserveFeed({
    isSatelliteViewer,
    theaterSitrepRegion,
  });

  /** 체크박스·카테고리 토글 = 유저 의도 → 전장 soft-apply가 덮지 않게 고정 */
  const togglePref = useCallback(
    ((key, value) => {
      pinUserLayers();
      return togglePrefRaw(key, value);
    }) as typeof togglePrefRaw,
    [pinUserLayers, togglePrefRaw],
  );
  const toggleCategoryPrefs = useCallback(
    ((updates) => {
      pinUserLayers();
      return toggleCategoryPrefsRaw(updates);
    }) as typeof toggleCategoryPrefsRaw,
    [pinUserLayers, toggleCategoryPrefsRaw],
  );

  useEffect(() => {
    const perf = loadPerfPrefs();
    /**
     * 생애 첫 방문(저장된 성능 설정 없음)만 기기 신호로 초기값을 가늠한다.
     * 저장된 선호가 있으면(재방문) 그 값이 항상 우선 — 사용자가 되돌리기를
     * 눌렀다면 그 결정을 존중한다. 어느 쪽이든 ~4.2초 뒤 probeFps 실측이
     * 오면 useUltraLiteAutoOffer가 필요시 즉시 교정한다.
     */
    const initialUltraLite = hasStoredPerfPrefs() ? perf.ultraLite : estimateWeakDeviceHint();
    ultraLiteRef.current = initialUltraLite;
    setUltraLite(initialUltraLite);
    setBasemapMode(perf.basemapMode);
    setShowLayerHoverInfo(perf.showLayerHoverInfo);
    if (initialUltraLite) {
      applyLayerPrefs(applyUltraLiteToLayerPrefs(loadLayerPrefs()));
    }
  }, [applyLayerPrefs]);

  /**
   * 지정학·역사·지경학·항적 → 전부 인텔(다크). 지형은 수동 토글.
   * 관측(Cesium)은 MapLibre basemap 유지(복귀 시 재적용).
   */
  useEffect(() => {
    const next = basemapForViewerMode(viewerMode);
    if (!next) return;
    setBasemapMode((prev) => {
      if (prev === next) return prev;
      savePerfPrefs({ basemapMode: next });
      return next;
    });
  }, [viewerMode]);

  /** 지형(밝은 벡터) 베이스맵이면 라벨·마커 팔레트를 저명도로 뒤집는다 */
  const basemapTone: BasemapTone = basemapMode === "terrain" ? "light" : "dark";

  // 명령형 마커 팩토리는 prop을 못 받으므로 전역 톤 + html[data-basemap-tone]으로 전달
  useEffect(() => {
    setActiveBasemapTone(basemapTone);
  }, [basemapTone]);

  const tonedPathColors = useMemo(() => pathLayerColors(basemapTone), [basemapTone]);
  const tonedInfraColors = useMemo(() => infraColors(basemapTone), [basemapTone]);
  const tonedArmsEmbargoStroke = useMemo(
    () => armsEmbargoStroke(basemapTone),
    [basemapTone],
  );

  /** 관측(Cesium) 장면 딥링크 — MapLibre POV 대신 Cesium 준비 후 flyTo */
  const observeDeeplinkFlyRef = useRef<{
    lat: number;
    lng: number;
    altitude: number;
  } | null>(null);
  /** 속보·안건·딥링크로 관측 진입 시 해협 투어가 카메라를 덮지 않게 */
  const [observeEntryHadTarget, setObserveEntryHadTarget] = useState(false);

  /** 장면 딥링크(?scene=1) — 게이트 생략 후 모드·레이어·카메라 적용 */
  const { hasPendingScene } = useSceneDeeplink({
    globeReady,
    isLoading,
    loadError,
    ultraLiteRef,
    layerPrefsLiveRef,
    globeRef,
    applyLayerPrefs,
    selectDomain: (mode, ultraLiteOn) => handleDomainSelect(mode, ultraLiteOn),
    onSceneApplied: (scene: SceneLinkState) => {
      if (scene.asOf) setViewAsOf(scene.asOf);
      if (scene.mode === "satellite" || scene.mode === "live") {
        observeDeeplinkFlyRef.current = {
          lat: scene.lat,
          lng: scene.lng,
          altitude: scene.altitude,
        };
        setObserveEntryHadTarget(true);
        if (!canMountFullObserve(readObserveUnlocked())) {
          startObservePreview();
        }
      }
    },
  });

  /** 장면 링크 버튼 공용 — 현재 카메라·모드·레이어·asOf 스냅샷 */
  const getSceneForShare = useCallback(() => {
    const pov = globeRef.current?.pointOfView();
    if (!pov) return null;
    return {
      mode: viewerMode,
      lat: pov.lat,
      lng: pov.lng,
      altitude: pov.altitude ?? 1.2,
      prefs: layerPrefsLiveRef.current,
      asOf: isHistoricalView ? effectiveAsOf : null,
    };
  }, [viewerMode, isHistoricalView, effectiveAsOf]);

  /** 일일 패널 접기 상태 복원 — 마운트 후 1회 (SSR 하이드레이션 불일치 방지) */
  useEffect(() => {
    try {
      if (localStorage.getItem(DAILY_RANK_PANEL_KEY) === "0") {
        setShowDailyRankPanel(false);
      }
    } catch {
      /* localStorage 차단 환경 — 기본값(열림) 유지 */
    }
  }, []);

  const toggleDailyRankPanel = useCallback((next: boolean) => {
    setShowDailyRankPanel(next);
    try {
      localStorage.setItem(DAILY_RANK_PANEL_KEY, next ? "1" : "0");
    } catch {
      /* 저장 실패는 무시 — 이번 세션에만 적용 */
    }
  }, []);

  const openClearanceRecovery = useCallback(() => {
    toggleDailyRankPanel(true);
    void (async () => {
      try {
        const targetDate = encodeURIComponent(nextUtcRankDate());
        const res = await fetch(`/api/daily-prompt?date=${targetDate}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { prompt?: DailyPrompt | null };
        if (data.prompt) setTomorrowTensionPrompt(data.prompt);
      } catch {
        /* 패널만 열림 */
      }
    })();
  }, [toggleDailyRankPanel]);

  // 일자 전환 — 등불·주간·인가 게이트 전체 재시작
  useEffect(() => {
    resetForCalendarDay();
    setNewsPerspectives(null);
    setEconomyAttackReaction(null);
    setTomorrowTensionPrompt(null);
    setShowAirRaidCoach(false);
    setClearanceChipSettled(false);
    setClearanceStatus(null);
  }, [calendarDayKey, resetForCalendarDay]);

  /** 인가 강등 상태 — 등불보다 먼저 평가 (모드 전환 리셋 직후 재실행) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;

    let prefs = readDailyPredictPrefs();
    prefs = syncClearancePrefs(prefs, localClearanceDay());
    writeDailyPredictPrefs(prefs);
    const status = resolveClearanceStatus(prefs);
    setClearanceStatus(status);

    if (status.kind === "ok") {
      setClearanceChipSettled(true);
      return;
    }
    if (hasSeenClearanceChip(calendarDayKey)) {
      setClearanceChipSettled(true);
      return;
    }
    // threat/downgraded + 미열람: 칩 dismiss 전까지 settled false — 칩이 다시 뜸
    setClearanceChipSettled(false);
  }, [
    calendarDayKey,
    entryGate,
    globeReady,
    isLoading,
    loadError,
    showModePicker,
    tomorrowTensionPrompt,
    viewerMode,
  ]);

  const handleUltraLiteToggle = useCallback(
    (on: boolean) => {
      if (isCompactUi) return;
      ultraLiteRef.current = on;
      setUltraLite(on);
      savePerfPrefs({ ultraLite: on });
      const base = showLeftPanel ? draftPrefs : layerPrefs;
      applyLayerPrefs(on ? applyUltraLiteToLayerPrefs(base) : applyNormalCapToLayerPrefs(base));
    },
    [applyLayerPrefs, draftPrefs, isCompactUi, layerPrefs, showLeftPanel],
  );

  const handleShowLayerHoverInfoToggle = useCallback((on: boolean) => {
    setShowLayerHoverInfo(on);
    savePerfPrefs({ showLayerHoverInfo: on });
  }, []);

  layerPrefsLiveRef.current = layerPrefs;

  /** Compact 진입/해제 — 데스크톱 prefs 스냅샷 분리 */
  useEffect(() => {
    if (isCompactUi) {
      if (!compactWasActiveRef.current) {
        desktopSnapshotRef.current = {
          layers: { ...loadLayerPrefs() },
          ultraLite: loadPerfPrefs().ultraLite,
        };
        compactWasActiveRef.current = true;
        savePerfPrefs({ ultraLite: true });
        ultraLiteRef.current = true;
        setUltraLite(true);
        setShowLeftPanel(false);
        setHoveredPoint(null);
        setHoveredPolygon(null);
        setHoveredPath(null);
        setHoverPointer(null);
        const chip = defaultCompactChipId(viewerMode);
        setCompactChipId(chip);
        const compactPrefs = buildCompactPrefs(viewerMode, chip, layerPrefsLiveRef.current);
        applyLayerPrefs(compactPrefs);
        // 초기 loadLayerPrefs / Ultra-Lite effect와 경합 시 Compact가 이기도록 재적용
        const t = window.setTimeout(() => {
          if (!compactWasActiveRef.current) return;
          ultraLiteRef.current = true;
          applyLayerPrefs(compactPrefs);
        }, 0);
        return () => window.clearTimeout(t);
      }
      return;
    }
    if (!compactWasActiveRef.current) return;
    compactWasActiveRef.current = false;
    const snap = desktopSnapshotRef.current;
    desktopSnapshotRef.current = null;
    if (!snap) return;
    ultraLiteRef.current = snap.ultraLite;
    setUltraLite(snap.ultraLite);
    savePerfPrefs({ ultraLite: snap.ultraLite });
    applyLayerPrefs(snap.layers);
  }, [applyLayerPrefs, isCompactUi, viewerMode]);

  /** Compact 중 모드 전환 시 칩·프리셋 재적용 */
  useEffect(() => {
    if (!isCompactUi || !compactWasActiveRef.current) return;
    const presets = compactPresetsForMode(viewerMode);
    const chip = presets.some((p) => p.id === compactChipId)
      ? compactChipId
      : defaultCompactChipId(viewerMode);
    if (chip !== compactChipId) setCompactChipId(chip);
    ultraLiteRef.current = true;
    setUltraLite(true);
    applyLayerPrefs(buildCompactPrefs(viewerMode, chip, layerPrefsLiveRef.current));
    // chipId intentionally omitted — Compact 중 모드 전환 시에만 재적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyLayerPrefs, isCompactUi, viewerMode]);

  const handlePanelDraftPatch = useCallback(
    (patch: Partial<LayerPrefs>) => {
      pinUserLayers();
      panelDraftPatchRef.current = { ...panelDraftPatchRef.current, ...patch };
      for (const [key, value] of Object.entries(patch)) {
        if (typeof value === "boolean") trackLayerToggle(key, value);
      }
      // 지도에는 soft 배치로 즉시 반영. 상단 「설정」은 강제 flush·저장 확인용.
      patchLayerPrefsSoft(patch);
      setLayerPanelDirty(true);
    },
    [patchLayerPrefsSoft, pinUserLayers],
  );

  const handlePanelLangDraft = useCallback(
    (lang: LabelLanguage) => {
      panelDraftPatchRef.current = {
        ...panelDraftPatchRef.current,
        labelLanguage: lang,
      };
      patchDraftOnly({ labelLanguage: lang });
      setLayerPanelDirty(true);
    },
    [patchDraftOnly],
  );

  const syncFrozenCategoriesFromPrefs = useCallback((prefs: LayerPrefs) => {
    const base = categorySnapshotRef.current ?? frozenPanelCategories;
    if (!base) return;
    const updated = base.map((category) => ({
      ...category,
      items: category.items.map((item) => {
        const walk = (node: (typeof item)): typeof item => {
          const key = LAYER_ITEM_PREF_KEYS[node.id];
          const nextOptions = node.options?.map(walk);
          const leafChecked =
            key && typeof prefs[key] === "boolean" ? (prefs[key] as boolean) : node.checked;
          if (nextOptions?.length) {
            const anyOn = nextOptions.some((opt) => opt.checked);
            return { ...node, checked: anyOn, options: nextOptions };
          }
          return key ? { ...node, checked: leafChecked } : node;
        };
        return walk(item);
      }),
    }));
    categorySnapshotRef.current = updated;
    setFrozenPanelCategories(updated);
  }, [frozenPanelCategories]);

  const confirmLayerPanelDraft = useCallback(() => {
    deferLayerMapApplyRef.current = false;
    const latest = peekDraftPrefs();
    applyLayerPrefs(latest);
    panelDraftPatchRef.current = {};
    panelOpenSnapshotRef.current = { ...latest };
    syncFrozenCategoriesFromPrefs(latest);
    setLayerPanelDirty(false);
  }, [applyLayerPrefs, peekDraftPrefs, syncFrozenCategoriesFromPrefs]);

  const cancelLayerPanelDraft = useCallback(() => {
    const snap = panelOpenSnapshotRef.current;
    if (snap) {
      deferLayerMapApplyRef.current = false;
      applyLayerPrefs(snap);
      syncFrozenCategoriesFromPrefs(snap);
    } else {
      discardDraftPrefs();
    }
    panelDraftPatchRef.current = {};
    setLayerPanelDirty(false);
    layerPanelSessionRef.current += 1;
    // frozen 카테고리 체크 UI를 커밋 상태로 다시 맞춤
    categorySnapshotRef.current = null;
    setFrozenPanelCategories(null);
  }, [applyLayerPrefs, discardDraftPrefs, syncFrozenCategoriesFromPrefs]);

  const {
    showWarZones,
    showDiplomaticTension,
    showCityLabels,
    showRailGlow,
    showAis,
    showAisMilitary,
    showAisCommercial,
    showDisguisedVessels,
    showShippingLanes,
    showLsibBoundary,
    showSubmarineCables,
    showSubmarineTunnels,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
    showSubseaPipelines,
    showGemCoalPlants,
    showGemCoalMines,
    showGemCoalTerminals,
    showGemNuclear,
    showGemSolar,
    showGemWind,
    showGemHydro,
    showGemGeothermal,
    showGemBioenergy,
    showGemOilGasPlants,
    showGemOilGasExtraction,
    showGemIronOre,
    showGemCement,
    showGemSteel,
    showGemChemicals,
    showAirports,
    showPorts,
    showLogisticsRisk,
    showLogisticsStress,
    showGscpiGauge,
    showCriticalNodes,
    showMilitaryBases,
    showAlliedBlocs,
    showCstoBloc,
    showGeoEconBlocs,
    showRokMilitaryBases,
    showJapanMilitaryBases,
    showTaiwanMilitaryBases,
    showPhilippinesMilitaryBases,
    showAustraliaMilitaryBases,
    showEasternNatoMilitaryBases,
    showMissileSilos,
    showStrategicMissileBases,
    showMissileTestSites,
    showMissileSiloFields,
    showResources,
    showNuclearSites,
    showInternetExchanges,
    showRefugeeCamps,
    showUcdpEvents: _showUcdpEventsPref,
    showMilitaryActivity,
    showAirTraffic,
    showUsCarriers,
    showSpaceLaunches,
    showReconSatellites,
    showGpsInterference,
    showIntelHotspots,
    showAiDataCenters,
    showEconomicCenters,
    showSanctionsEntities,
    showArmsEmbargo,
    showConflictZones,
    showCyberIncidents,
    showElectionEvents,
    showFirmsFires,
    showUkraineControl,
    showGdeltWar,
    showGdeltDiplomatic,
    showGdeltAlliance,
    showGdeltProtests,
    showGdeltOceanCompetition,
    showTelegramOsint,
    showTzevaAdom,
    showNewfeedsIranAttacks,
    showUkmtoIncidents,
    showEscalationSignals,
    showNavareaWarnings,
    showMilitaryExercises,
    showChinaTaiwanIncidents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showUsChinaIncidents,
    showWeeklyShipMoves,
    showReefWatch,
    showNorthKoreaMissileTests,
    showUkraineStrikesOnRussia,
    showConflictEvents,
    showConflictTheaterUkraine,
    showConflictTheaterIran,
    showConflictTheaterLebanon,
    showConflictTheaterSyria,
    showConflictTheaterTaiwan,
    showConflictTheaterKorea,
    showConflictTheaterKuril,
    showConflictTheaterBaltic,
    showConflictTheaterBlackSea,
    showConflictTheaterJapan,
    showConflictTheaterCaucasus,
    showConflictTheaterCentralAsia,
    showEuropeDroneIncidents,
    showNeptun,
    showNeptunPreviousTrails,
    showGtaInterventions,
    showEastAsiaAdiz,
    showIslandChains,
    showAxisNetwork,
    showBriTradeConnectivity,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    showSesChip,
    showUsDfcSupplyChain,
    labelLanguage,
  } = layerPrefs;

  /** 올리기 직전 반증 탐색용 — RSS·LiveUA 텍스트. 없으면 게이트가 queried:false */
  const intelDisconfirmCorpus = useMemo(
    () => [
      ...candidatesFromNewsLike([
        ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
        ...(newsStreamPayload?.flashHeroes ?? []),
        ...(newsStreamPayload?.verified ?? []),
        ...(newsStreamPayload?.stateMedia ?? []),
      ]),
      ...candidatesFromNewsLike(
        liveuaEvents.map((e) => ({
          id: e.id,
          title: e.title,
          titleKo: e.titleKo,
          summary: e.body,
          publishedAt: e.publishedAt,
        })),
      ),
    ],
    [
      liveuaEvents,
      newsStreamPayload?.flashHeroes,
      newsStreamPayload?.hero,
      newsStreamPayload?.stateMedia,
      newsStreamPayload?.verified,
    ],
  );

  const {
    breakingFlash,
    breakingFlashGate,
    dismissBreakingFlash,
    clearBreakingFlash: clearBreakingFlashFromHook,
  } = useBreakingFlashController({
    entryGate,
    showModePicker,
    langChoiceDone,
    deepDiveSession,
    isHistoryViewer,
    isSatelliteViewer,
    isEconomyViewer,
    theaterSitrepRegion,
    liveuaParchmentIndex,
    dailyLampSettled,
    weeklyRecapSettled,
    periodicBriefing,
    airRaidBriefing,
    exerciseBriefing,
    weeklyExpanded,
    newsStreamPayload,
    intelDisconfirmCorpus,
    peaceScienceFlashDomain,
    labelLanguage,
  });
  clearBreakingFlashRef.current = clearBreakingFlashFromHook;

  const theaterSitrepDoc = useMemo(() => {
    if (!theaterSitrepRegion) return null;
    const rssItems = [
      ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
      ...(newsStreamPayload?.flashHeroes ?? []),
      ...(newsStreamPayload?.verified ?? []),
    ];
    const doc = buildTheaterSitrep({
      regionId: theaterSitrepRegion,
      events: liveuaEvents,
      rssItems,
      windowHours: 72,
      lang: labelLanguage === "en" ? "en" : "ko",
    });
    const gate = gateTheaterSitrep(doc, {
      disconfirmCorpus: intelDisconfirmCorpus,
      windowHours: 72,
    });
    if (!canPublish("theater_sitrep", gate.grade)) return null;
    return doc;
  }, [
    theaterSitrepRegion,
    liveuaEvents,
    labelLanguage,
    intelDisconfirmCorpus,
    newsStreamPayload?.hero,
    newsStreamPayload?.flashHeroes,
    newsStreamPayload?.verified,
  ]);

  const liveuaPins = useMemo(
    () =>
      liveuaEvents
        .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
        .slice(0, 120)
        .map((e) => ({
          id: e.id,
          title: labelLanguage === "ko" ? e.titleKo?.trim() || e.title : e.title,
          lat: e.lat,
          lng: e.lng,
          imageUrl: e.imageUrl,
          publishedAt: e.publishedAt,
        })),
    [liveuaEvents, labelLanguage],
  );

  const liveuaStrikes = useMemo(
    () =>
      liveuaEvents.flatMap((event) => {
        const hit = liveuaConfirmedStrike(event);
        if (!hit) return [];
        const title =
          labelLanguage === "ko" ? event.titleKo?.trim() || event.title : event.title;
        return [
          {
            id: event.id,
            lat: event.lat,
            lng: event.lng,
            title,
            kind: hit.kind,
          },
        ];
      }).slice(0, 40),
    [liveuaEvents, labelLanguage],
  );

  const liveuaGround = useMemo(
    () =>
      liveuaEvents.flatMap((event) => {
        const hit = liveuaGroundAssault(event);
        if (!hit) return [];
        const title =
          labelLanguage === "ko" ? event.titleKo?.trim() || event.title : event.title;
        return [
          {
            id: event.id,
            lat: event.lat,
            lng: event.lng,
            title,
          },
        ];
      }).slice(0, 40),
    [liveuaEvents, labelLanguage],
  );
  useEffect(() => {
    if (!macroBriefingOpen) return;
    if (periodicBriefing || weeklyExpanded) return;
    let cancelled = false;
    setMacroBriefingLoading(true);
    setMacroBriefingError(null);
    const lang = labelLanguage === "en" ? "en" : "ko";
    void fetch(`/api/macro-briefing?domain=${macroBriefingDomain}&lang=${lang}`)
      .then(async (res) => {
        const json = (await res.json()) as MacroBriefingPayload;
        if (cancelled) return;
        if (json.error && (!json.topics || json.topics.length === 0)) {
          setMacroBriefingError(json.error);
        } else {
          setMacroBriefingError(null);
        }
        setMacroBriefingPayload(json);
      })
      .catch(() => {
        if (!cancelled) {
          setMacroBriefingError(
            labelLanguage === "en"
              ? "Failed to load macro briefing"
              : "거시 요약본을 불러오지 못했습니다",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMacroBriefingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    macroBriefingOpen,
    macroBriefingDomain,
    labelLanguage,
    periodicBriefing,
    weeklyExpanded,
  ]);

  const handleMacroStepActivate = useCallback(
    (step: MacroStep) => {
      const cam = step.camera;
      if (cam) {
        globeRef.current?.pointOfView(
          { lat: cam.lat, lng: cam.lng, altitude: cam.altitude },
          1100,
        );
      }
      const hints = cam?.layerHints ?? [];
      if (hints.includes("conflictEvents")) {
        togglePref("showConflictEvents", true);
      }
      if (hints.includes("gdelt")) {
        togglePref("showGdeltWar", true);
        togglePref("showGdeltDiplomatic", true);
      }
    },
    [togglePref],
  );

  /** 오늘의 투어 장면 — 분쟁 상위 5곳 (시작 시점 데이터로 고정) */
  const tourScenes = useMemo(
    () => buildDailyTourScenes(data.disputes ?? [], labelLanguage),
    [data.disputes, labelLanguage],
  );

  const refreshUkraineControl = useCallback(async () => {
    if (ukraineFetchStartedRef.current) return;
    ukraineFetchStartedRef.current = true;
    setUkraineControlStatus("loading");

    const applyPayload = (payload: UkraineControlData) => {
      setUkraineControl(payload.features ?? []);
      setUkraineControlOverview(payload.overviewFeatures ?? []);
      setUkraineControlDate(payload.controlDate ?? null);
      setUkraineRuCellCount(payload.ruCellCount ?? 0);
      ukraineSettlementsSourceRef.current = payload.settlements ?? [];
      setUkraineControlStatus("ok");
    };

    try {
      const cached = readUkraineControlCache();
      if (cached?.features?.length) {
        applyPayload(cached);
        return;
      }

      const payload = await prefetchUkraineControl();
      if (payload?.features?.length) {
        applyPayload(payload);
        return;
      }

      throw new Error("viina-render empty");
    } catch {
      ukraineFetchStartedRef.current = false;
      setUkraineControlStatus("error");
    }
  }, []);

  const setShowUkraineControl = (v: boolean) => {
    if (!v) {
      setUkraineFrontLegendEngaged(false);
      if (
        !historyStoryLockedRef.current &&
        (regionNavSelection?.id === "ukraine" ||
          regionNavSelection?.id.startsWith("ukraine-"))
      ) {
      setRegionNavSelection(null);
      }
      togglePref("showUkraineControl", v);
      return;
    }
    if (historyStoryLockedRef.current) return;
    // 전선 폴리곤만 — 전장 내비·VIINA Intel 탭과 분리 (NEPTUN 토글과 동일 패턴)
    setUkraineFrontLegendEngaged(true);
    ukraineZoomPendingRef.current = true;
    immediateUntilRef.current = Date.now() + 1800;
    togglePref("showUkraineControl", true);
  };
  const showAnyDisputeOverlay = anyDisputeOverlay({ showWarZones, showDiplomaticTension });

  const setShowWarZones = (v: boolean) => {
    if (v) setShowDisputeLegendPanel(true);
    else if (!showDiplomaticTension) {
      setShowDisputeLegendPanel(false);
      setShowLocalAlertPanel(false);
    }
    togglePref("showWarZones", v);
  };
  const setShowDiplomaticTension = (v: boolean) => {
    if (v) setShowDisputeLegendPanel(true);
    else if (!showWarZones) {
      setShowDisputeLegendPanel(false);
      setShowLocalAlertPanel(false);
    }
    togglePref("showDiplomaticTension", v);
  };
  const setShowCityLabels = (v: boolean) => togglePref("showCityLabels", v);
  const setShowRailGlow = (v: boolean) => togglePref("showRailGlow", v);
  /** AIS/ADS-B — MapLibre에서는 모드 점프 없이 prefs만. 관측 탭 CTA 토스트 */
  const setShowAis = (v: boolean) => {
    if (v && viewerMode !== "satellite") {
      togglePref("showAis", true);
      nudgeObserveForTracks();
      return;
    }
    togglePref("showAis", v);
  };
  const setShowAisMilitary = (v: boolean) => togglePref("showAisMilitary", v);
  const setShowAisCommercial = (v: boolean) => togglePref("showAisCommercial", v);
  const setShowDisguisedVessels = (v: boolean) => {
    if (v && viewerMode !== "satellite") {
      togglePref("showDisguisedVessels", true);
      nudgeObserveForTracks();
      return;
    }
    togglePref("showDisguisedVessels", v);
  };
  const setShowShippingLanes = (v: boolean) => togglePref("showShippingLanes", v);
  const setShowLsibBoundary = (v: boolean) => togglePref("showLsibBoundary", v);
  const setShowSubmarineCables = (v: boolean) => togglePref("showSubmarineCables", v);
  const setShowSubmarineTunnels = (v: boolean) => togglePref("showSubmarineTunnels", v);
  const setShowOilPipelines = (v: boolean) => togglePref("showOilPipelines", v);
  const setShowGasPipelines = (v: boolean) => togglePref("showGasPipelines", v);
  const setShowLngTerminals = (v: boolean) => togglePref("showLngTerminals", v);
  const setShowSubseaPipelines = (v: boolean) => togglePref("showSubseaPipelines", v);
  const setShowAirports = (v: boolean) => togglePref("showAirports", v);
  const setShowPorts = (v: boolean) => togglePref("showPorts", v);
  const setShowLogisticsRisk = (v: boolean) => togglePref("showLogisticsRisk", v);
  const setShowLogisticsStress = (v: boolean) => togglePref("showLogisticsStress", v);
  const setShowGscpiGauge = (v: boolean) => togglePref("showGscpiGauge", v);
  const setShowCriticalNodes = (v: boolean) => togglePref("showCriticalNodes", v);
  const setShowMilitaryBases = (v: boolean) => togglePref("showMilitaryBases", v);
  const setShowAlliedBlocs = (v: boolean) => togglePref("showAlliedBlocs", v);
  const setShowCstoBloc = (v: boolean) => togglePref("showCstoBloc", v);
  const setShowGeoEconBlocs = (v: boolean) => togglePref("showGeoEconBlocs", v);
  const setShowRokMilitaryBases = (v: boolean) => togglePref("showRokMilitaryBases", v);
  const setShowJapanMilitaryBases = (v: boolean) => togglePref("showJapanMilitaryBases", v);
  const setShowTaiwanMilitaryBases = (v: boolean) => togglePref("showTaiwanMilitaryBases", v);
  const setShowPhilippinesMilitaryBases = (v: boolean) =>
    togglePref("showPhilippinesMilitaryBases", v);
  const setShowAustraliaMilitaryBases = (v: boolean) =>
    togglePref("showAustraliaMilitaryBases", v);
  const setShowEasternNatoMilitaryBases = (v: boolean) =>
    togglePref("showEasternNatoMilitaryBases", v);
  const setShowMissileSilos = (v: boolean) => togglePref("showMissileSilos", v);
  const setShowStrategicMissileBases = (v: boolean) =>
    togglePref("showStrategicMissileBases", v);
  const setShowMissileTestSites = (v: boolean) => togglePref("showMissileTestSites", v);
  const setShowMissileSiloFields = (v: boolean) => togglePref("showMissileSiloFields", v);
  const setShowResources = (v: boolean) => togglePref("showResources", v);
  const setShowNuclearSites = (v: boolean) => togglePref("showNuclearSites", v);
  const setShowInternetExchanges = (v: boolean) => togglePref("showInternetExchanges", v);
  const setShowRefugeeCamps = (v: boolean) => togglePref("showRefugeeCamps", v);
  /** UCDP 레이어 제거 — 토글·로드 모두 무시 */
  const showUcdpEvents = false;
  void _showUcdpEventsPref;
  const setShowUcdpEvents: (value: boolean) => void = () =>
    togglePref("showUcdpEvents", false);
  const setShowMilitaryActivity = (v: boolean) => {
    if (v && viewerMode !== "satellite") {
      togglePref("showMilitaryActivity", true);
      nudgeObserveForTracks();
      return;
    }
    togglePref("showMilitaryActivity", v);
  };
  const setShowAirTraffic = (v: boolean) => {
    if (v && viewerMode !== "satellite") {
      togglePref("showAirTraffic", true);
      nudgeObserveForTracks();
      return;
    }
    togglePref("showAirTraffic", v);
  };
  const setShowUsCarriers = (v: boolean) => togglePref("showUsCarriers", v);
  const setShowWeeklyShipMoves = (v: boolean) => togglePref("showWeeklyShipMoves", v);
  const setShowReefWatch = (v: boolean) => togglePref("showReefWatch", v);
  const setShowSpaceLaunches = (v: boolean) => togglePref("showSpaceLaunches", v);
  const setShowReconSatellites = (v: boolean) => togglePref("showReconSatellites", v);
  const setShowGpsInterference = (v: boolean) => togglePref("showGpsInterference", v);
  const setShowIntelHotspots = (v: boolean) => togglePref("showIntelHotspots", v);
  const setShowAiDataCenters = (v: boolean) => togglePref("showAiDataCenters", v);
  const setShowEconomicCenters = (v: boolean) => togglePref("showEconomicCenters", v);
  const setShowSanctionsEntities = (v: boolean) => togglePref("showSanctionsEntities", v);
  const setShowArmsEmbargo = (v: boolean) => togglePref("showArmsEmbargo", v);
  const setShowConflictZones = (v: boolean) => togglePref("showConflictZones", v);
  const setShowCyberIncidents = (v: boolean) => togglePref("showCyberIncidents", v);
  const setShowElectionEvents = (v: boolean) => togglePref("showElectionEvents", v);
  const setShowFirmsFires = (v: boolean) => togglePref("showFirmsFires", v);
  const setShowGdeltWar = (v: boolean) => togglePref("showGdeltWar", v);
  const setShowGdeltDiplomatic = (v: boolean) => togglePref("showGdeltDiplomatic", v);
  const setShowGdeltAlliance = (v: boolean) => togglePref("showGdeltAlliance", v);
  const setShowGdeltProtests = (v: boolean) => togglePref("showGdeltProtests", v);
  const setShowGdeltOceanCompetition = (v: boolean) =>
    togglePref("showGdeltOceanCompetition", v);
  const setShowTelegramOsint = (v: boolean) => togglePref("showTelegramOsint", v);
  const closeTelegramOsintLayer = useCallback(() => {
    togglePref("showTelegramOsint", false);
  }, [togglePref]);
  const setShowTzevaAdom = (v: boolean) => togglePref("showTzevaAdom", v);
  const setShowNewfeedsIranAttacks = (v: boolean) => togglePref("showNewfeedsIranAttacks", v);
  const setShowUkmtoIncidents = (v: boolean) => togglePref("showUkmtoIncidents", v);
  const setShowEscalationSignals = (v: boolean) => togglePref("showEscalationSignals", v);
  const setShowNavareaWarnings = (v: boolean) => togglePref("showNavareaWarnings", v);
  const setShowMilitaryExercises = (v: boolean) => togglePref("showMilitaryExercises", v);
  const setShowChinaTaiwanIncidents = (v: boolean) => togglePref("showChinaTaiwanIncidents", v);
  const setShowChinaJapanIncidents = (v: boolean) => togglePref("showChinaJapanIncidents", v);
  const setShowChinaPhilippinesIncidents = (v: boolean) =>
    togglePref("showChinaPhilippinesIncidents", v);
  const setShowUsChinaIncidents = (v: boolean) => togglePref("showUsChinaIncidents", v);
  const setShowNorthKoreaMissileTests = (v: boolean) =>
    togglePref("showNorthKoreaMissileTests", v);
  const setShowUkraineStrikesOnRussia = (v: boolean) => {
    if (v) {
      if (historyStoryLockedRef.current) return;
      toggleCategoryPrefs(UKRAINE_LIVE_COMPANIONS);
      return;
    }
    togglePref("showUkraineStrikesOnRussia", false);
  };
  const setShowConflictEvents = (v: boolean) => togglePref("showConflictEvents", v);
  const setConflictTheater = (theater: ConflictTheater, v: boolean) => {
    togglePref(CONFLICT_THEATER_PREF_KEY[theater], v);
  };
  const setShowEuropeDroneIncidents = (v: boolean) =>
    togglePref("showEuropeDroneIncidents", v);

  const setShowNeptun = (v: boolean) => {
    if (v) {
      if (historyStoryLockedRef.current) return;
      neptunZoomPendingRef.current = true;
      immediateUntilRef.current = Date.now() + 1500;
      setRegionNavSelection(null);
      setSelected(null);
      // 공습·드론 궤적 + 타격 화염 (전선 제외)
      toggleCategoryPrefs(UKRAINE_LIVE_COMPANIONS);
      return;
    }
    toggleCategoryPrefs({
      showNeptun: false,
      showNeptunPreviousTrails: false,
    });
  };
  const setShowEastAsiaAdiz = (v: boolean) => togglePref("showEastAsiaAdiz", v);
  const setShowIslandChains = (v: boolean) => togglePref("showIslandChains", v);
  const setShowAxisNetwork = (v: boolean) => togglePref("showAxisNetwork", v);
  const setShowBriTradeConnectivity = (v: boolean) => togglePref("showBriTradeConnectivity", v);
  const setShowGtaInterventions = (v: boolean) => togglePref("showGtaInterventions", v);
  const setShowStrategicCorridors = (v: boolean) => togglePref("showStrategicCorridors", v);
  const setShowAlliedLogisticsCorridors = (v: boolean) =>
    togglePref("showAlliedLogisticsCorridors", v);
  const setShowSanctionsEvasionCorridors = (v: boolean) =>
    togglePref("showSanctionsEvasionCorridors", v);
  const setShowSesChip = (v: boolean) => togglePref("showSesChip", v);
  const setShowUsDfcSupplyChain = (v: boolean) => togglePref("showUsDfcSupplyChain", v);

  const showGdeltLayers =
    viewerChromePreset.fetchGdelt &&
    (showGdeltWar ||
      showGdeltDiplomatic ||
      showGdeltAlliance ||
      showGdeltProtests ||
      showGdeltOceanCompetition);
  /** 대치·미사일 네온은 속보 GDELT가 있어야 점등 — 해당 레이어만 켜도 피드 유지 */
  const fetchGdeltForNeonIncidents =
    showChinaTaiwanIncidents ||
    showChinaJapanIncidents ||
    showChinaPhilippinesIncidents ||
    showUsChinaIncidents ||
    showNorthKoreaMissileTests;
  const shouldFetchGdeltFeed =
    viewerChromePreset.fetchGdelt && (showGdeltLayers || fetchGdeltForNeonIncidents);
  const setLabelLanguage = (v: LabelLanguage) => togglePref("labelLanguage", v);
  const confirmLabelLanguage = useCallback(
    (lang: LabelLanguage) => {
      togglePref("labelLanguage", lang);
      markLangChoiceDone();
      markWelcomeGateDone();
      markSourcesGateDone();
      setLangChoiceDone(true);
      setEntryGate(null);
      pendingQuietOverviewRef.current = true;
      quietOverviewAppliedRef.current = false;
    },
    [togglePref],
  );

  const [regionNavSelection, setRegionNavSelection] = useState<NavSelection | null>(null);
  const [selectedAxisLink, setSelectedAxisLink] = useState<SelectedAxisLink | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<SelectedCorridor | null>(null);
  const [armsHighlightPair, setArmsHighlightPair] = useState<{ a: string; b: string } | null>(
    null,
  );
  const [livingTaiwanOpen, setLivingTaiwanOpen] = useState(false);
  const hubBriefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ukraineFrontLegendEngaged, setUkraineFrontLegendEngaged] = useState(false);
  /** 경제 모드에선 지정학 범례(우크라 전선·분쟁 빗금) 상태를 항상 끈다 — 스위치 잔상 방지 */
  useEffect(() => {
    if (!isEconomyViewer) return;
    setUkraineFrontLegendEngaged(false);
    setShowDisputeLegendPanel(false);
  }, [isEconomyViewer]);
  const [econNavSelection, setEconNavSelection] = useState<NavSelection | null>(null);
  const [econInsightBrief, setEconInsightBrief] = useState<EconInsightBrief | null>(null);
  const [econInsightCompact, setEconInsightCompact] = useState(false);
  const [econNewsPanelReveal, setEconNewsPanelReveal] = useState(false);
  const econInsightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theaterSidebarTab, setTheaterSidebarTab] = useState<TheaterSidebarTab>("insight");
  const [regimeSelectedEpisodeId, setRegimeSelectedEpisodeId] = useState<string | null>(null);
  const [disputeHotspotSelectedId, setDisputeHotspotSelectedId] = useState<string | null>(null);
  const [disputeEpisodeSelectedId, setDisputeEpisodeSelectedId] = useState<string | null>(null);
  const [territorialEpisodeBrief, setTerritorialEpisodeBrief] =
    useState<TerritorialDisputeEpisode | null>(null);
  const [territorialActiveStageId, setTerritorialActiveStageId] = useState<string | null>(null);
  const [territorialRevealedStageIds, setTerritorialRevealedStageIds] = useState<string[]>([]);
  const territorialSequenceRef = useRef<number[]>([]);

  const clearTerritorialSequence = useCallback(() => {
    for (const timer of territorialSequenceRef.current) {
      window.clearTimeout(timer);
    }
    territorialSequenceRef.current = [];
  }, []);
  const [frictionActiveStageId, setFrictionActiveStageId] = useState<string | null>(null);
  const frictionEpisodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyImmersionRef = useRef(false);
  /** 분쟁사(regime) 창 안 — 나가기 버튼 전엔 regionNav/모드/줌아웃 탈출 금지 */
  const historyStoryLockedRef = useRef(false);
  /** 양피지 이후 실시간 중계 — 레이어 스냅샷 복원용 */
  const [liveBriefingSession, setLiveBriefingSession] = useState<LiveBriefingSession | null>(null);

  const activeHubId = regionNavSelection?.hubId ?? null;
  const hubFocusMode = regionNavSelection?.focusMode ?? null;
  /** 역사 창·영토분쟁 창 — 목록과 에피소드 모두 나가기 전까지 잠금 */
  const historyImmersionActive =
    hubFocusMode === "regime" || hubFocusMode === "disputes";
  const disputesOverviewActive = hubFocusMode === "disputes";
  const showShipMovesLayer = false;
  /** 목록·에피소드 공통 — 나가기 전까지 잠금 */
  const historyStoryLocked = historyImmersionActive;
  /** 에피소드 스토리 중 — 카메라 회전 제한 */
  const historyEpisodeActive = Boolean(
    historyImmersionActive && (regimeSelectedEpisodeId || frictionEpisodeBrief),
  );
  historyImmersionRef.current = historyImmersionActive;
  historyStoryLockedRef.current = historyStoryLocked;

  const archiveCeiling =
    historyImmersionActive && historyEntryAlt != null
      ? Math.min(HISTORY_IMMERSION_MAX_ALTITUDE, historyEntryAlt + 0.12)
      : null;
  const focusCeilingAltitude = !isSatelliteViewer
    ? (incidentSpace?.ceilingAltitude ?? archiveCeiling)
    : null;
  focusAltitudeCeilingRef.current = focusCeilingAltitude;

  const {
    layerCenterRef,
    layerAltitudeRef,
    layerLodTierRef,
    isCameraMovingRef,
    viewState,
    filterCenter,
    setFilterCenter,
    layerAltitude,
    setLayerAltitude,
    isCameraMoving,
    configureGlobe,
    resetMapLibreBinding,
    flyTo,
    interruptFlySnap,
    computeRegionFitAltitude,
    flyToBounds,
  } = useGlobeCamera({
    globeRef,
    size,
    globeReady,
    setGlobeReady,
    historyImmersionRef,
    focusAltitudeCeilingRef,
    focusCeilingAltitude,
    onCloseLookRef,
    historyImmersionActive,
    historyEpisodeActive,
  });

  /**
   * 관측(Cesium) 모드 카메라·엔티티 클릭 브리지.
   * - cesiumGlobeRef.current.flyTo — 관측 모드일 때만 유효 (MapLibre globeRef와 별도).
   * - unifiedFlyTo — 어느 모드에서 호출되든 "현재 켜져 있는 지구본"의 카메라를 움직인다.
   *   GEV 추적처럼 관측 모드 전용 엔티티를 따라가는 flyTo 호출부에 사용.
   */
  const cesiumGlobeRef = useRef<CesiumGlobeHandle>(null);

  const {
    enterFocusedSpace,
    leaveIncidentSpace,
    unifiedFlyTo,
    revealIncidentEnergyPipelines,
    switchToObserveAndFly,
    focusWatchboardItem,
    acceptFlyToConfirm,
    dismissFlyToConfirm,
    flushPendingCesiumFly,
  } = useFocusedSpaceNavigation({
    cesiumGlobeRef,
    viewState,
    labelLanguage,
    viewerMode,
    flyTo,
    incidentSpaceRef,
    setIncidentSpace,
    focusAltitudeCeilingRef,
    onCloseLookRef,
    historyStoryLockedRef,
    historyRoomTargetRef,
    layerPrefsLiveRef,
    pipelineRevealSnapRef,
    pipelineRevealTimerRef,
    patchLayerPrefsSoft,
    pendingObserveFlyRef,
    flyToConfirmOffer,
    setFlyToConfirmOffer,
    setFocusedLiveuaId,
    setSelected,
    setViewerMode,
    setObserveEntryHadTarget,
    observeUnlocked,
    startObservePreview,
    endObservePreview,
    watchGradePrevRef,
    setDeskFocus,
    setPromotingItemId,
  });

  if (hubFocusMode !== "regime" && hubFocusMode !== "disputes") {
    outsideViewRef.current = {
      lat: viewState.lat,
      lng: viewState.lng,
      altitude: viewState.altitude,
    };
  }

  useEffect(() => {
    const active = hubFocusMode === "regime" || hubFocusMode === "disputes";
    if (!active) {
      historyReturnRef.current = null;
      historyRoomTargetRef.current = null;
      setHistoryEntryAlt(null);
      return;
    }
    if (historyReturnRef.current) return;
    const outside = outsideViewRef.current ?? {
      lat: viewState.lat,
      lng: viewState.lng,
      altitude: viewState.altitude,
    };
    const altitude = outside.altitude;
    historyReturnRef.current =
      altitude >= 1.8
        ? {
            lat: outside.lat,
            lng: outside.lng,
            altitude: Math.min(7.2, altitude),
          }
        : {
            lat: outside.lat,
            lng: outside.lng,
            altitude: Math.min(7.2, Math.max(2.6, altitude + 1.4)),
          };
    setHistoryEntryAlt(altitude);
  }, [hubFocusMode, viewState.altitude, viewState.lat, viewState.lng]);

  useEffect(() => {
    if (hubFocusMode !== "regime" && hubFocusMode !== "disputes") return;
    const target = historyRoomTargetRef.current;
    if (target == null) return;
    if (viewState.altitude > target + 0.18) return;
    historyRoomTargetRef.current = null;
    setHistoryEntryAlt(target);
  }, [hubFocusMode, viewState.altitude]);

  useEffect(() => {
    if (viewerMode === "satellite") return;
    if (!incidentSpaceRef.current) return;
    incidentSpaceRef.current = null;
    focusAltitudeCeilingRef.current = null;
    setIncidentSpace(null);
    setFocusedLiveuaId(null);
  }, [viewerMode, setFocusedLiveuaId]);

  useEffect(() => {
    if (!incidentSpace) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      leaveIncidentSpace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [incidentSpace, leaveIncidentSpace]);

  const [cesiumReady, setCesiumReady] = useState(false);
  const { hourUtc, setHourUtc, playing, setPlaying } = useCesiumDayScrubState();
  const [recordClipBusy, setRecordClipBusy] = useState(false);

  /** 위성(Cesium) 모드에서는 MapLibre POV가 없으므로 Cesium 카메라로 장면 링크를 만든다 */
  const getSceneForShareResolved = useCallback(() => {
    if (viewerMode === "satellite") {
      const pov = cesiumGlobeRef.current?.pointOfView();
      if (!pov) return null;
      return {
        mode: viewerMode,
        lat: pov.lat,
        lng: pov.lng,
        altitude: pov.altitude ?? 0.85,
        prefs: layerPrefsLiveRef.current,
        asOf: null as string | null,
      };
    }
    return getSceneForShare();
  }, [viewerMode, getSceneForShare]);

  const captureFrameResolved = useCallback(async () => {
    if (viewerMode === "satellite") {
      return (await cesiumGlobeRef.current?.captureFrame()) ?? null;
    }
    return (await globeRef.current?.captureFrame()) ?? null;
  }, [viewerMode]);

  const handleRecordClip = useCallback(async () => {
    if (recordClipBusy || viewerMode !== "satellite") return;
    const canvas = cesiumGlobeRef.current?.getCanvas();
    if (!canvas) return;
    setRecordClipBusy(true);
    try {
      const site = brandName(labelLanguage);
      const blob = await recordCesiumClip(canvas, {
        durationMs: 6_000,
        fps: 24,
        bindPresenting: (onPresent) =>
          cesiumGlobeRef.current?.bindPresenting(onPresent) ?? (() => undefined),
        branding: {
          siteName: site,
          url: typeof window !== "undefined" ? window.location.host : "",
          badge:
            labelLanguage === "en" ? "Live 3D · Observatory" : "실시간 3D · 관측",
        },
      });
      if (!blob) return;
      const filename = `${site.replace(/\s+/g, "-")}-clip-${Date.now()}.webm`;
      await shareOrDownloadVideoBlob(
        blob,
        filename,
        site,
        labelLanguage === "en"
          ? `Short clip from ${site}`
          : `${site} 짧은 녹화`,
      );
    } finally {
      setRecordClipBusy(false);
    }
  }, [recordClipBusy, viewerMode, labelLanguage]);

  useEffect(() => {
    if (!playing || viewerMode !== "satellite") return;
    const id = window.setInterval(() => {
      setHourUtc((h) => {
        const next = (h + 0.25) % 24;
        cesiumGlobeRef.current?.setClockHourUtc(next);
        return next;
      });
    }, 280);
    return () => window.clearInterval(id);
  }, [playing, viewerMode, setHourUtc]);

  useEffect(() => {
    if (viewerMode === "satellite") return;
    setPlaying(false);
  }, [viewerMode, setPlaying]);

  useEffect(() => {
    if (viewerMode === "satellite") {
      // MapLibre 언마운트 — 재진입 시 configureGlobe / 레이어 게이트가 다시 돌도록 리셋
      resetMapLibreBinding();
      return;
    }
    setCesiumReady(false);
    pendingObserveFlyRef.current = null;
    observeDeeplinkFlyRef.current = null;
    setFlyToConfirmOffer(null);
    setObserveEntryHadTarget(false);
  }, [viewerMode, resetMapLibreBinding]);

  useEffect(() => {
    if (!cesiumReady) return;
    const deeplink = observeDeeplinkFlyRef.current;
    const fly = cesiumGlobeRef.current?.flyTo;
    if (deeplink && typeof fly === "function") {
      observeDeeplinkFlyRef.current = null;
      fly(
        deeplink.lat,
        deeplink.lng,
        deeplink.altitude,
        resolveCinematicDurationMs(),
        resolveCinematicCamera(),
      );
      return;
    }
    flushPendingCesiumFly();
  }, [cesiumReady, flushPendingCesiumFly]);

  const handleSelectCesiumEntity = useCallback(
    (sel: CesiumEntitySelection) => {
      // AIS / OpenSky(ADS-B) / NEPTUN 클릭 → 선택 + useGevLiveTrack가 줌인·팔로우
      if (sel.kind === "ais") {
        setSelected({ kind: "ais", item: sel.item });
        return;
      }
      if (sel.kind === "mil") {
        setSelected({ kind: "mil", item: sel.item, traffic: sel.traffic });
        return;
      }
      if (sel.kind === "firms") {
        const full =
          firmsFires.find((f) => f.id === sel.item.id) ??
          ({
            id: sel.item.id,
            lat: sel.item.lat,
            lng: sel.item.lng,
            frp: sel.item.frp ?? null,
            brightness: null,
            confidence: null,
            acqDate: null,
            acqTime: null,
            satellite: null,
            daynight: null,
          } satisfies import("@/data/geoTypes").FirmsFire);
        setSelected({ kind: "firms-fire", item: full });
        return;
      }
      if (sel.kind === "neptun") {
        setSelected({ kind: "neptun-threat", item: sel.item });
      }
    },
    [firmsFires, setSelected],
  );

  const { syncInfo, syncGeneration, forceSync } = useDataSync({
    mode: "default",
    enabled: !isClientApiStubMode(),
    cameraMovingRef: isCameraMovingRef,
  });

  const hubBriefDoc = useMemo(() => {
    if (!regionNavSelection || !hubBriefOpen) return null;
    return resolveHubBrief(regionNavSelection, labelLanguage);
  }, [regionNavSelection, hubBriefOpen, labelLanguage]);

  const clearHubBriefTimer = useCallback(() => {
    if (hubBriefTimerRef.current != null) {
      clearTimeout(hubBriefTimerRef.current);
      hubBriefTimerRef.current = null;
    }
  }, []);

  const clearFrictionEpisodeTimer = useCallback(() => {
    if (frictionEpisodeTimerRef.current != null) {
      clearTimeout(frictionEpisodeTimerRef.current);
      frictionEpisodeTimerRef.current = null;
    }
  }, []);

  const clearRegionNavSelection = useCallback(() => {
    if (historyStoryLockedRef.current) return;
    setRegionNavSelection(null);
  }, []);

  const endLiveBriefing = useCallback(() => {
    setLiveBriefingSession((prev) => {
      if (prev) applyLayerPrefs(prev.snapshot);
      return null;
    });
  }, [applyLayerPrefs]);

  const exitConflictDeepDive = useCallback(
    (opts?: { restore?: boolean }) => {
      const restore = opts?.restore !== false;
      const prev = deepDiveSessionRef.current;
      deepDiveSessionRef.current = null;
      if (prev && restore) applyLayerPrefs(prev.snapshot);
      setDeepDiveSession(null);
    },
    [applyLayerPrefs],
  );

  const {
    enterConflictDeepDive,
    beginLiveBriefing,
    exitHistoryImmersion,
    handleFrictionCoachStepChange,
  } = useHistoryImmersionActions({
    isEconomyViewer,
    viewState,
    size,
    flyTo,
    applyLayerPrefs,
    clearBreakingFlash,
    exitConflictDeepDive,
    clearFrictionEpisodeTimer,
    clearTerritorialSequence,
    clearHubBriefTimer,
    layerPrefsLiveRef,
    deepDiveSessionRef,
    historyReturnRef,
    historyRoomTargetRef,
    historyImmersionRef,
    historyStoryLockedRef,
    focusAltitudeCeilingRef,
    frictionCoachAwaitHistoryRef,
    frictionCoachListAckRef,
    globeRef,
    setDeepDiveSession,
    setLiveBriefingSession,
    setHistoryEntryAlt,
    setFrictionEpisodeBrief,
    setRegimeSelectedEpisodeId,
    setFrictionActiveStageId,
    setDisputeHotspotSelectedId,
    setDisputeEpisodeSelectedId,
    setTerritorialEpisodeBrief,
    setTerritorialActiveStageId,
    setTerritorialRevealedStageIds,
    setHubBriefOpen,
    setRegionNavSelection,
    setFrictionCoachStep,
  });

  /** 분쟁외교사 목록 첫 진입 — 크롬 코치가 없을 때만 */
  useEffect(() => {
    if (isEconomyViewer) return;
    if (hubFocusMode !== "regime") {
      setFrictionCoachStep((prev) => (prev ? null : prev));
      frictionCoachAwaitHistoryRef.current = false;
      frictionCoachListAckRef.current = false;
      return;
    }
    if (chromeCoachStep || showAirRaidCoach) return;
    if (!shouldOfferFrictionCoach()) return;
    if (frictionCoachListAckRef.current) return;
    if (frictionCoachStep) return;
    if (regimeSelectedEpisodeId || hubBriefOpen || frictionEpisodeBrief) return;
    const timer = window.setTimeout(() => setFrictionCoachStep("list"), 450);
    return () => window.clearTimeout(timer);
  }, [
    chromeCoachStep,
    frictionCoachStep,
    frictionEpisodeBrief,
    hubBriefOpen,
    hubFocusMode,
    isEconomyViewer,
    regimeSelectedEpisodeId,
    showAirRaidCoach,
  ]);

  /** 목록 코치 중 에피소드 선택 → 역사 스텝 대기 */
  useEffect(() => {
    if (!regimeSelectedEpisodeId) return;
    if (frictionCoachStep === "list") {
      frictionCoachListAckRef.current = true;
      if (shouldOfferFrictionCoach()) frictionCoachAwaitHistoryRef.current = true;
      setFrictionCoachStep(null);
    }
  }, [frictionCoachStep, regimeSelectedEpisodeId]);

  /** 역사 크롬 표시 + 양피지 닫힌 뒤 → 조작법 스텝 */
  useEffect(() => {
    if (isEconomyViewer) return;
    if (!historyImmersionActive || !regimeSelectedEpisodeId) return;
    if (hubBriefOpen || frictionEpisodeBrief) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    if (!shouldOfferFrictionCoach()) return;
    if (!frictionCoachAwaitHistoryRef.current) return;
    if (frictionCoachStep === "history") return;
    const timer = window.setTimeout(() => setFrictionCoachStep("history"), 500);
    return () => window.clearTimeout(timer);
  }, [
    chromeCoachStep,
    frictionCoachStep,
    frictionEpisodeBrief,
    historyImmersionActive,
    hubBriefOpen,
    isEconomyViewer,
    regimeSelectedEpisodeId,
    showAirRaidCoach,
  ]);

  const closeHubBrief = useCallback(() => {
    const sel = regionNavSelection;
    const diveSnap = deepDiveSessionRef.current?.snapshot;
    setHubBriefOpen(false);
    exitConflictDeepDive({ restore: false });
    if (diveSnap) applyLayerPrefs(diveSnap);
    if (!sel) return;
    // 분쟁사는 역사 창 유지 — 실시간 중계 데스크로 전환하지 않음
    if (sel.focusMode === "regime" || sel.focusMode === "westpac-pulse") return;
    const place = sel.label || sel.id;
    beginLiveBriefing("hub", hubBriefingLayers(sel.id), place);
  }, [
    applyLayerPrefs,
    beginLiveBriefing,
    exitConflictDeepDive,
    regionNavSelection,
  ]);

  useEffect(() => {
    return () => {
      if (hubBriefTimerRef.current != null) {
        clearTimeout(hubBriefTimerRef.current);
      }
      if (frictionEpisodeTimerRef.current != null) {
        clearTimeout(frictionEpisodeTimerRef.current);
      }
    };
  }, []);

  const scheduleHubBrief = useCallback(
    (selection: NavSelection) => {
      clearHubBriefTimer();
      setHubBriefOpen(false);
      if (!selection.hubId || !selection.focusMode) return;
      const brief = resolveHubBrief(selection, labelLanguage);
      if (!brief) return;
      hubBriefTimerRef.current = setTimeout(() => {
        hubBriefTimerRef.current = null;
        setHubBriefOpen(true);
        if (brief.playBreakingDispatch) {
          emitBreakingDispatchSound();
        }
      }, 780);
    },
    [clearHubBriefTimer, labelLanguage],
  );

  /**
   * 지정학 심층 키 — 허브/마찰/영토 브리프가 열려 있는 동안만.
   * 레이어 목표 3교체 · 속보 타전 잠금.
   */
  const geopoliticsDeepDiveKey = (() => {
    if (isEconomyViewer || isSatelliteViewer) return null;
    if (hubBriefOpen && regionNavSelection) {
      return `hub:${regionNavSelection.id}`;
    }
    if (frictionEpisodeBrief) return `friction:${frictionEpisodeBrief.id}`;
    if (territorialEpisodeBrief) return `territorial:${territorialEpisodeBrief.id}`;
    return null;
  })();

  useEffect(() => {
    if (!geopoliticsDeepDiveKey) {
      if (deepDiveSessionRef.current) {
        exitConflictDeepDive();
      }
      return;
    }
    if (deepDiveSessionRef.current?.key === geopoliticsDeepDiveKey) return;
    if (geopoliticsDeepDiveKey.startsWith("hub:") && regionNavSelection) {
      enterConflictDeepDive(
        "hub",
        geopoliticsDeepDiveKey,
        hubBriefingLayers(regionNavSelection.id),
        regionNavSelection.label || regionNavSelection.id,
      );
      return;
    }
    if (geopoliticsDeepDiveKey.startsWith("friction:") && frictionEpisodeBrief) {
      enterConflictDeepDive(
        "friction",
        geopoliticsDeepDiveKey,
        FRICTION_DEEP_DIVE_PATCH,
        frictionEpisodeBrief.title,
      );
      return;
    }
    if (geopoliticsDeepDiveKey.startsWith("territorial:") && territorialEpisodeBrief) {
      const title =
        labelLanguage === "en"
          ? territorialEpisodeBrief.titleEn
          : territorialEpisodeBrief.title;
      enterConflictDeepDive(
        "territorial",
        geopoliticsDeepDiveKey,
        TERRITORIAL_DEEP_DIVE_PATCH,
        title,
      );
    }
  }, [
    enterConflictDeepDive,
    exitConflictDeepDive,
    frictionEpisodeBrief,
    geopoliticsDeepDiveKey,
    labelLanguage,
    regionNavSelection,
    territorialEpisodeBrief,
  ]);

  const deepDiveRings = useMemo(() => {
    if (!geopoliticsDeepDiveKey || !deepDiveSession) return [];
    const stages =
      frictionEpisodeBrief != null
        ? frictionDeepDoc(frictionEpisodeBrief.id)?.stages ?? null
        : null;
    return resolveGeopoliticsRings({
      deepDiveKey: geopoliticsDeepDiveKey,
      navId: regionNavSelection?.id ?? null,
      frictionStages: stages,
    });
  }, [
    deepDiveSession,
    frictionEpisodeBrief,
    geopoliticsDeepDiveKey,
    regionNavSelection?.id,
  ]);

  const selectDeepDiveRing = useCallback(
    (ring: DeepDiveRing) => {
      const session = deepDiveSessionRef.current;
      if (!session) return;
      const { prefs, sceneKeys } = applyConflictDeepDiveLayers(
        session.snapshot,
        ring.layers,
        DEEP_DIVE_LAYER_TARGET,
      );
      applyLayerPrefs(prefs);
      const next: DeepDiveSession = {
        ...session,
        sceneKeys,
        activeRingId: ring.id,
      };
      deepDiveSessionRef.current = next;
      setDeepDiveSession(next);
      if (ring.camera) {
        flyTo(ring.camera.lat, ring.camera.lng, ring.camera.altitude);
      }
    },
    [applyLayerPrefs, flyTo],
  );

  const dismissAxisLink = useCallback(() => {
    trackEvent("axis_link_dismiss");
    setSelectedAxisLink(null);
    setArmsHighlightPair(null);
  }, []);

  const dismissCorridor = useCallback(() => {
    trackEvent("strategic_corridor_dismiss");
    setSelectedCorridor(null);
  }, []);

  const axisLinkOpenHub = useCallback(() => {
    const link = selectedAxisLink;
    if (!link) return;
    const hubId = preferredAxisHub(link.from, link.to, link.hubs, activeHubId);
    const hub = hubId ? hubById(hubId) : null;
    if (!hub) return;
    trackEvent("axis_link_cta_hub", { hub: hub.hubId, pathId: link.pathId });
    upsertWatchPin({
      mode: "conflict",
      navId: hub.id,
      labelKo: hub.label,
      labelEn: hub.label,
    });
    const sel = selectionForHubNetwork(hub);
    setSelectedAxisLink(null);
    setRegionNavSelection(sel);
    setShowAxisNetwork(true);
    flyTo(hub.lat, hub.lng, hub.altitude);
    scheduleHubBrief(sel);
  }, [activeHubId, flyTo, scheduleHubBrief, selectedAxisLink]);

  const axisLinkOpenArms = useCallback(() => {
    const link = selectedAxisLink;
    if (!link) return;
    if (!SIPRI_ARMS_LENS_ENABLED) {
      axisLinkOpenHub();
      return;
    }
    const hubId = preferredAxisHub(link.from, link.to, link.hubs, activeHubId);
    const hub = hubId ? hubById(hubId) : null;
    if (!hub) return;
    trackEvent("axis_link_cta_arms", { hub: hub.hubId, pathId: link.pathId });
    setArmsHighlightPair({ a: link.from, b: link.to });
    const sel = selectionForArms(hub);
    setSelectedAxisLink(null);
    setRegionNavSelection(sel);
    setShowAxisNetwork(true);
    flyTo(hub.lat, hub.lng, hub.altitude);
    scheduleHubBrief(sel);
  }, [activeHubId, axisLinkOpenHub, flyTo, scheduleHubBrief, selectedAxisLink]);

  const axisLinkOpenNewsRef = useRef<() => void>(() => {});
  const axisLinkOpenNews = useCallback(() => {
    axisLinkOpenNewsRef.current();
  }, []);

  const axisLinkHighlightArms = useCallback(() => {
    const link = selectedAxisLink;
    if (!link) return;
    if (!SIPRI_ARMS_LENS_ENABLED) {
      axisLinkOpenHub();
      return;
    }
    const hubId = preferredAxisHub(link.from, link.to, link.hubs, activeHubId);
    const hub = hubId ? hubById(hubId) : null;
    if (!hub) return;
    trackEvent("axis_link_cta_deals", { hub: hub.hubId, pathId: link.pathId });
    clearHubBriefTimer();
    setHubBriefOpen(false);
    setArmsHighlightPair({ a: link.from, b: link.to });
    setSelectedAxisLink(null);
    setRegionNavSelection(selectionForArms(hub));
    setShowAxisNetwork(true);
    flyTo(hub.lat, hub.lng, hub.altitude);
  }, [activeHubId, axisLinkOpenHub, clearHubBriefTimer, flyTo, selectedAxisLink]);

  const clearEconInsightTimer = useCallback(() => {
    if (econInsightTimerRef.current != null) {
      clearTimeout(econInsightTimerRef.current);
      econInsightTimerRef.current = null;
    }
  }, []);

  const closeEconInsight = useCallback(() => {
    const brief = econInsightBrief;
    setEconInsightOpen(false);
    setEconInsightBrief(null);
    setEconInsightCompact(false);
    if (brief?.navId) {
      beginLiveBriefing(
        "economy",
        conceptLayersForEconomyNavId(brief.navId),
        brief.titleKo || brief.navId,
      );
    }
  }, [beginLiveBriefing, econInsightBrief]);

  useEffect(() => {
    return () => {
      if (econInsightTimerRef.current != null) {
        clearTimeout(econInsightTimerRef.current);
      }
    };
  }, []);

  const scheduleEconInsight = useCallback(
    (opts: { navId?: string | null; criticalNodeId?: string | null; compact?: boolean }) => {
      clearEconInsightTimer();
      setEconInsightOpen(false);
      setEconNewsPanelReveal(false);
      const brief = resolveCriticalNodeBrief(opts);
      if (!brief) return;
      econInsightTimerRef.current = setTimeout(() => {
        econInsightTimerRef.current = null;
        setEconInsightBrief(brief);
        setEconInsightCompact(Boolean(opts.compact));
        setEconInsightOpen(true);
      }, 780);
    },
    [clearEconInsightTimer],
  );

  const openCriticalNodeInsight = useCallback(
    (criticalNodeId: string, compact: boolean) => {
      clearEconInsightTimer();
      const brief = resolveCriticalNodeBrief({ criticalNodeId });
      if (!brief) return;
      setEconInsightBrief(brief);
      setEconInsightCompact(compact);
      setEconInsightOpen(true);
      setEconNewsPanelReveal(false);
    },
    [clearEconInsightTimer],
  );

  const parseAxisArms = useCallback((raw: unknown) => raw as AxisArmsPayload, []);
  const { data: axisArmsPayload } = useLazyJsonObject<AxisArmsPayload>(
    "axis-arms.json",
    Boolean(SIPRI_ARMS_LENS_ENABLED && activeHubId && hubFocusMode === "arms"),
    parseAxisArms,
  );
  const parseAxisHubCountries = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  /** NE 10m 고정밀 CRINK 4국 — 첫 프레임 양보 후 (idle, 상한 3s) */
  const { data: axisHubCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "axis-hub-countries.json",
    isConflictViewer && globeReady,
    parseAxisHubCountries,
    { deferUntilIdle: true, idleTimeoutMs: 3_000 },
  );
  const parseAxisSatelliteCountries = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  /** CRINK 위성국(NE 110m) — 허브 fill 직후 (idle, 상한 3.5s) */
  const { data: axisSatelliteCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "axis-satellite-countries.json",
    isConflictViewer && globeReady,
    parseAxisSatelliteCountries,
    { deferUntilIdle: true, idleTimeoutMs: 3_500 },
  );
  const parseAlliedBlocCountries = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  /** CRINK·NATO 등 진영 음영 — CRINK보다 늦게 (idle, 상한 5.5s) */
  const { data: alliedBlocCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "allied-bloc-countries.json",
    isConflictViewer && showAlliedBlocs && globeReady,
    parseAlliedBlocCountries,
    { deferUntilIdle: true, idleTimeoutMs: 5_500 },
  );
  const parseGeoEconBlocCountries = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  /** 지경학 진영 음영 — 첫 프레임 양보 후 (idle, 상한 5.5s) */
  const { data: geoEconBlocCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "geoecon-bloc-countries.json",
    isEconomyViewer && showGeoEconBlocs && globeReady,
    parseGeoEconBlocCountries,
    { deferUntilIdle: true, idleTimeoutMs: 5_500 },
  );
  const { layerViewState, mapZoom } = useCameraViewport(filterCenter, layerAltitude);

  const selectedReconMarkerId =
    selected?.kind === "recon-sat" ? selected.item.markerId : null;
  const {
    satellites: reconSatelliteMarkers,
    tleCount: reconTleCount,
    status: reconSatStatus,
    error: reconSatError,
  } = useReconSatelliteLayer({
    // 전역 시야 전용 게이트를 풀었다 — 줌인 상태에서도 filterCenter 컬링으로만 줄인다
    enabled: showReconSatellites && isConflictViewer,
    filterCenter,
    cameraAltitude: layerAltitude,
    keepMarkerId: selectedReconMarkerId,
  });

  useEffect(() => {
    const mapEl = containerRef.current;
    if (!mapEl) return;

    let lastOpenAt = 0;

    const openNewsFromMiddleClick = (event: MouseEvent) => {
      if (event.button !== 1) return;
      if (showLeftPanel || selected || regionNavSelection) return;
      const now = Date.now();
      if (now - lastOpenAt < 250) return;
      lastOpenAt = now;
      event.preventDefault();
      event.stopPropagation();
      setIntelTheaterFilter(
        isEconomyViewer
          ? "all"
          : newsTheaterFromCoords(layerCenterRef.current.lat, layerCenterRef.current.lng),
      );
      setIntelSheetOpen(true);
    };

    mapEl.addEventListener("mousedown", openNewsFromMiddleClick, true);
    return () => {
      mapEl.removeEventListener("mousedown", openNewsFromMiddleClick, true);
    };
  }, [showLeftPanel, selected, regionNavSelection, isEconomyViewer]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        let firstPaint = false;
        const { data: raw } = await fetchAppDataStream({
          onProgress: (progress) => {
            if (!mounted) return;
            setAppDataLoadProgress(progress);
          },
          onPartial: (patch) => {
            if (!mounted) return;
            setData((prev) => ({
              ...prev,
              ...patch,
              countries: patch.countries ?? prev.countries ?? [],
              disputes: patch.disputes ?? prev.disputes ?? [],
              places: [],
              events: [],
              roads: patch.roads ?? prev.roads ?? [],
              railroads: [],
            }));
            if (!firstPaint && patch.countries && patch.countries.length > 0) {
              firstPaint = true;
              setIsLoading(false);
              setLoadError(null);
            }
          },
        });

        const nextData: AppData = {
          ...raw,
          countries: raw.countries ?? [],
          disputes: raw.disputes ?? [],
          roads: raw.roads ?? [],
          railroads: [],
          events: [],
          places: [],
        };

        if (!mounted) return;
        setData(nextData);
        setLoadError(null);
        setIsLoading(false);
        setAppDataLoadProgress(null);

        const cancelPlaces = runWhenIdle(() => {
          if (!mounted) return;
          void fetchAppDataPlaces()
            .then((placesRaw) => {
              if (!mounted) return;
              setData((prev) => ({
                ...prev,
                places: expandPlaces(placesRaw),
              }));
            })
            .catch(() => {
              /* search degraded — globe still usable */
            });
        });
        return cancelPlaces;
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : "데이터 로드 실패");
        setIsLoading(false);
        setAppDataLoadProgress(null);
      }
    }

    // fetch hang 시 isLoading이 풀리지 않아 부트가 고착될 수 있음
    const loadWatchdog = window.setTimeout(() => {
      if (!mounted) return;
      setIsLoading((prev) => {
        if (!prev) return prev;
        setLoadError((err) => err ?? "데이터 로드가 지연되어 부분 화면으로 진입합니다.");
        return false;
      });
    }, 35_000);

    let cancelPlaces: (() => void) | undefined;
    void loadData().then((cancel) => {
      cancelPlaces = cancel;
    });
    return () => {
      mounted = false;
      window.clearTimeout(loadWatchdog);
      cancelPlaces?.();
    };
  }, [syncGeneration]);

  const bootReadyRef = useRef(false);
  useEffect(() => {
    // 폰은 지구본을 mount하지 않으므로 globeReady가 영영 false — 부팅을 막지 않도록 준비된 것으로 간주.
    const globeMountReady = globeReady || isPhoneUi;
    const progress = computeDashboardBootProgress({
      globeReady: globeMountReady,
      isLoading,
      appDataLoadProgress,
    });
    onBootProgress?.(progress);

    if (
      !bootReadyRef.current &&
      progress >= 100 &&
      globeMountReady &&
      !isLoading
    ) {
      bootReadyRef.current = true;
      onBootReady?.();
    }
  }, [
    appDataLoadProgress,
    globeReady,
    isPhoneUi,
    isLoading,
    onBootProgress,
    onBootReady,
  ]);

  useEffect(() => {
    const syncStamp =
      (typeof syncInfo?.status?.lastSuccessAt === "string" && syncInfo.status.lastSuccessAt) ||
      null;
    if (!isLoading && !loadError) {
      setLiveStatus(syncInfo?.running ? "loading" : "ok");
      setLiveUpdatedAt(syncStamp || data.generatedAt || null);
    } else if (loadError) {
      setLiveStatus("error");
    }
  }, [data.generatedAt, isLoading, loadError, syncInfo]);

  useEffect(() => {
    if (!showUkraineControl || !viinaMeta?.available || !globeReady) return;
    if (ukraineControl.length > 0 || ukraineControlStatus === "loading") return;
      void refreshUkraineControl();
  }, [
    globeReady,
    refreshUkraineControl,
    showUkraineControl,
    ukraineControl.length,
    ukraineControlStatus,
    viinaMeta?.available,
  ]);

  /** 관측대 설명 카드 — 첫 방문 유저가 관측대를 처음 켤 때만 */
  useEffect(() => {
    if (!isSatelliteViewer || isPhoneUi) {
      setIntelDeskTipVisible(false);
      return;
    }
    if (!shouldOfferIntelDeskTip()) {
      // 일반·재방문 유저: 자동 설명창 없음
      markIntelDeskTipDone();
      setIntelDeskTipVisible(false);
      return;
    }
    setIntelDeskTipVisible(true);
  }, [isSatelliteViewer, isPhoneUi]);

  /**
   * LiveUA 다전장 통제면 — MapLibre·Cesium 공통.
   * UA/IR/YE/LB/IL-PS를 60s 틱으로 폴링. `source !== liveuamap` IGNORE.
   */
  useEffect(() => {
    if (!globeReady || !showUkraineControl) return;
    let cancelled = false;
    const regions = LIVEUAMAP_CONTROL_REGION_IDS;
    setUkraineOccupiedStatus((prev) => (prev === "ok" ? prev : "loading"));

    const pullTerritory = async () => {
      await Promise.all(
        regions.map(async (region) => {
          try {
            const res = await fetch(
              `/api/deepstate/frontlines?region=${region}&liveuaOnly=1`,
              { cache: "no-store" },
            );
            if (!res.ok) return;
            const body = (await res.json()) as {
              occupied?: FeatureCollection;
              source?: string;
            };
            if (body.source === "liveuamap" && body.occupied?.features?.length) {
              liveuaTerritoryByRegionRef.current[region] = body.occupied.features;
            }
          } catch {
            // region optional — last-good 유지
          }
        }),
      );
      if (cancelled) return;
      const features = regions.flatMap(
        (r) => liveuaTerritoryByRegionRef.current[r] ?? [],
      );
      const fc: FeatureCollection | null = features.length
        ? { type: "FeatureCollection", features }
        : null;
      setLiveuaControlGeoJson(fc);
      if (fc) {
        setUkraineOccupiedGeoJson(fc);
        setUkraineOccupiedStatus("ok");
      } else {
        setUkraineOccupiedStatus("error");
      }
    };

    void pullTerritory();
    const timer = window.setInterval(() => {
      void pullTerritory();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [globeReady, showUkraineControl]);

  useEffect(() => {
    if (!globeReady || (!showNeptun && !showNeptunPreviousTrails)) return;
    void prefetchNeptun();
  }, [globeReady, showNeptun, showNeptunPreviousTrails]);

  useEffect(() => {
    if (suppressAutoRegionZoomRef.current) return;
    // 지정학 히어로는 전선/NEPTUN 레이어가 기본 ON — 가용성만으로 우크라 줌하면
    // 전역 궤도 초입을 깨뜨린다. 유저가 OFF→ON으로 켠 경우에만 자동 줌.
    const ukraineTurnedOn = showUkraineControl && !prevUkraineLayerOnRef.current;
    const neptunTurnedOn = showNeptun && !prevNeptunLayerOnRef.current;
    if (!autoRegionZoomSeededRef.current) {
      autoRegionZoomSeededRef.current = true;
      prevUkraineLayerOnRef.current = showUkraineControl;
      prevNeptunLayerOnRef.current = showNeptun;
      return;
    }
    prevUkraineLayerOnRef.current = showUkraineControl;
    prevNeptunLayerOnRef.current = showNeptun;
    if (!ukraineTurnedOn && !neptunTurnedOn) return;
    if (ukraineTurnedOn && (viinaMeta?.available || ukraineOccupiedStatus === "ok")) {
      ukraineZoomPendingRef.current = true;
    }
    if (neptunTurnedOn) {
      neptunZoomPendingRef.current = true;
    }
    immediateUntilRef.current = Date.now() + 1800;
  }, [showNeptun, showUkraineControl, ukraineOccupiedStatus, viinaMeta?.available, immediateUntilRef]);

  useEffect(() => {
    if (!showUkraineControl) {
      setUkraineSettlements([]);
      ukraineSettlementsLoadedRef.current = false;
      return;
    }
    const tier = getStableLodTier(layerLodTierRef.current, layerAltitude);
    if (
      (tier === "near" || tier === "village") &&
      ukraineSettlementsSourceRef.current.length > 0
    ) {
      setUkraineSettlements(ukraineSettlementsSourceRef.current);
      ukraineSettlementsLoadedRef.current = true;
    } else {
      setUkraineSettlements([]);
      ukraineSettlementsLoadedRef.current = false;
    }
  }, [layerAltitude, showUkraineControl]);

  const globeLod = useMemo(() => {
    const nextTier = getStableLodTier(layerLodTierRef.current, layerAltitude);
    layerLodTierRef.current = nextTier;
    return globeLodFromTier(nextTier, labelLanguage === "en" ? "en" : "ko");
  }, [layerAltitude, labelLanguage]);

  const {
    polygons: gpsJamPolygons,
    date: gpsJamDate,
    status: gpsJamStatus,
  } = useGpsJamLayer({
    enabled: showGpsInterference && isLiveViewer,
    view: layerViewState,
    radiusDeg: VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 8,
  });

  const viinaDisplay = useMemo(
    () =>
      selectViinaPolygons(
        ukraineControl,
        ukraineControlOverview,
        layerViewState,
        layerAltitude,
        globeLod.tier,
      ),
    [ukraineControl, ukraineControlOverview, layerViewState, layerAltitude, globeLod.tier],
  );

  /** Intel VIINA 탭 — 전선 레이어 ON과 분리. 우크라 전장 내비 또는 frontline-live 패키지에서만 */
  const showViinaIntel = useMemo(() => {
    if (isEconomyViewer || !viinaMeta?.available) return false;
    if (viewUi.defaultIntelTab === "viina") return true;
    return isUkraineNavId(regionNavSelection?.id ?? "");
  }, [
    isEconomyViewer,
    regionNavSelection?.id,
    viinaMeta?.available,
    viewUi.defaultIntelTab,
  ]);

  const viinaFrontEvents = useMemo(() => {
    if (!showViinaIntel || !showUkraineControl) return [];
    return buildViinaFrontEvents([...viinaDisplay.contestedZones, ...viinaDisplay.ruZones]).slice(
      0,
      200,
    );
  }, [
    showViinaIntel,
    showUkraineControl,
    viinaDisplay.contestedZones,
    viinaDisplay.ruZones,
  ]);

  /** NEPTUN — useNeptunGlobeLayer (스트림·뷰포트·궤적·마커) */
  const {
    neptunFetchEnabled,
    neptunThreats,
    neptunArchivedThreats,
    neptunAlerts,
    neptunLive,
    neptunStatus,
    neptunError,
    neptunServerTime,
    neptunAlertCount,
    neptunRenderMode,
    visibleNeptunThreats,
    visibleNeptunArchived,
    neptunPathElevation,
    stableNeptunLivePaths,
    stableNeptunArchivedPaths,
    neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
    neptunImpactInView,
  } = useNeptunGlobeLayer({
    showNeptun,
    showNeptunPreviousTrails,
    showUkraineControl,
    forceNeptunTheater: isSatelliteViewer,
    /** 드론·미사일·폭탄은 Cesium 공중 엔티티만 — MapLibre 경로/HTML 배지 OFF */
    maplibreNeptunVisuals: false,
    layerViewState,
    globeTier: globeLod.tier,
    isCameraMoving,
    immediateUntilRef,
  });

  /** AIS · OpenSky/ADS-B · NEPTUN 클릭 → Cesium 줌인·팔로우 */
  const {
    tracking: gevTracking,
    followCamera: gevFollowCamera,
    hud: gevHud,
    trackPath: gevTrackPath,
    contacts: gevContacts,
    stopTracking: stopGevTracking,
    toggleFollow: toggleGevFollow,
    setFollowCamera: setGevFollowCamera,
  } = useGevLiveTrack({
    selected,
    setSelected,
    aisVessels,
    milAircraft,
    civAircraft,
    neptunThreats: visibleNeptunThreats,
    flyTo: unifiedFlyTo,
    setLiveTrackFollow:
      viewerMode === "satellite"
        ? (spec) => {
            cesiumGlobeRef.current?.setLiveTrackFollow(spec);
          }
        : undefined,
    cesiumTrackReady: viewerMode === "satellite" && cesiumReady,
    isCameraMovingRef,
    labelLanguage,
  });

  // 관측 모드를 벗어나면 Cesium trackedEntity 잔존 방지
  useEffect(() => {
    if (viewerMode === "satellite") return;
    cesiumGlobeRef.current?.setLiveTrackFollow(null);
  }, [viewerMode]);

  /** 전선 레이어 ON 또는 우크라이나 극동부를 확대해 볼 때 하단 UI 전환 */
  /**
   * 좌하단 텔레그램 OSINT 미니 패널 — 우측 속보/선택과 독립.
   * (다른 크롬을 위로 밀지 않음 · ✕로만 닫기)
   */
  const telegramMiniPanelVisible = false;

  const isUkraineTheaterFocus = useMemo(() => {
    if (showUkraineControl) return true;
    if (!isInUkraineTheater(filterCenter.lat, filterCenter.lng)) return false;
    return layerAltitude <= 1.1;
  }, [filterCenter.lat, filterCenter.lng, layerAltitude, showUkraineControl]);

  /** VIINA 근접 줌 — 폴리곤 raycast·라벨 부하 완화 구간 */
  const isViinaCloseZoom =
    globeLod.tier === "near" || globeLod.tier === "village";

  /** VIINA 근접 줌 — 폴리곤 fill 레이캐스트 제외 (수천 정점 hover 피킹 방지) */
  const mapInteractiveLayerIds = useMemo(() => {
    const blocFills: string[] = [];
    if (isConflictViewer) {
      blocFills.push("axis-satellite-countries-fill");
      blocFills.push("axis-hub-countries-fill");
      if (showAlliedBlocs) blocFills.push("allied-bloc-countries-fill");
    } else if (showGeoEconBlocs) {
      blocFills.push("geoecon-bloc-countries-fill");
    }
    const core =
      isViinaCloseZoom && showUkraineControl
        ? (["map-points", "map-gem-facilities", "map-paths", "map-rings", "firms-flame"] as const)
        : ([
            "map-points",
            "map-gem-facilities",
            "map-paths",
            "map-polygons-fill",
            "map-rings",
            "firms-flame",
          ] as const);
    return [...core, ...blocFills];
  }, [
    isConflictViewer,
    isViinaCloseZoom,
    showAlliedBlocs,
    showGeoEconBlocs,
    showUkraineControl,
  ]);

  const transportLod = useMemo(
    () => getTransportLod(layerAltitude),
    [layerAltitude],
  );

  const globeTextures = useMemo(() => getGlobeTextures(basemapMode), [basemapMode]);
  const isVectorBaseMap = globeTextures.vectorBase;

  const {
    paths: railPaths,
    loading: transportLoading,
    error: transportError,
  } = useViewportPaths({
    layer: "railroads",
    enabled: showRailGlow && transportLod.maxRailroads > 0,
    lat: layerViewState.lat,
    lng: layerViewState.lng,
    // global tier의 radiusDeg=0은 전역 조회용이지만, 가까운 노선 우선 정렬을 위해 최소 반경 부여
    radiusDeg:
      transportLod.radiusDeg > 0
        ? transportLod.radiusDeg
        : globeLod.tier === "global"
          ? 55
          : 28,
    tier: globeLod.tier,
    max: transportLod.maxRailroads,
    maxScalerank: transportLod.railMaxScalerank,
    arterialMaxRank: transportLod.arterialMaxRank,
  });

  const [viewportCountries, setViewportCountries] = useState<CountryFeature[]>([]);

  useEffect(() => {
    if (isVectorBaseMap) {
      setViewportCountries([]);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        lat: String(Math.round(layerViewState.lat * 10) / 10),
        lng: String(Math.round(layerViewState.lng * 10) / 10),
        radius: String(VIEWPORT_RADIUS_BY_TIER[globeLod.tier]),
        tier: globeLod.tier,
        max: String(COUNTRY_POLYGON_MAX_BY_TIER[globeLod.tier]),
      });
      void fetch(`/api/layers/viewport-countries?${params}`, {
        cache: "no-store",
        signal: ac.signal,
      })
        .then(async (res) => {
          if (!res.ok) return;
          const payload = (await res.json()) as { countries?: CountryFeature[] };
          if (ac.signal.aborted) return;
          setViewportCountries(Array.isArray(payload.countries) ? payload.countries : []);
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [globeLod.tier, isVectorBaseMap, layerViewState.lat, layerViewState.lng]);

  // global(radiusDeg=0): 뷰포트 컷 없이 scalerank·거리 순으로 전 세계 균등 배분
  const pathRadiusDeg = globeLod.radiusDeg;

  const staticLayers = useGlobeStaticLayers({
    viewState: layerViewState,
    globeTier: globeLod.tier,
    radiusDeg: pathRadiusDeg,
    viewerMode,
    showDisputeBoundaries: showAnyDisputeOverlay && globeReady,
    showLsibBoundary: showLsibBoundary && globeReady && !isHistoryViewer,
    showShippingLanes,
    showSubmarineCables,
    showSubmarineTunnels,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
    showSubseaPipelines,
    gemShow: {
      showGemCoalPlants,
      showGemCoalMines,
      showGemCoalTerminals,
      showGemNuclear,
      showGemSolar,
      showGemWind,
      showGemHydro,
      showGemGeothermal,
      showGemBioenergy,
      showGemOilGasPlants,
      showGemOilGasExtraction,
      showGemIronOre,
      showGemCement,
      showGemSteel,
      showGemChemicals,
    },
    showAirports,
    showPorts,
    showLogisticsRisk,
    showCriticalNodes,
    showMilitaryBases,
    showRokMilitaryBases,
    showJapanMilitaryBases,
    showTaiwanMilitaryBases,
    showPhilippinesMilitaryBases,
    showAustraliaMilitaryBases,
    showEasternNatoMilitaryBases,
    showMissileSilos,
    showStrategicMissileBases,
    showMissileTestSites,
    showMissileSiloFields,
    showResources,
    showCableLandings: showSubmarineCables,
    showNuclearSites,
    showInternetExchanges,
    showRefugeeCamps,
    showUcdpEvents,
    showAiDataCenters,
    showEconomicCenters,
    showSanctionsEntities,
    showSpaceLaunches,
    showIntelHotspots,
    showConflictZones: showConflictZones && globeReady,
    showArmsEmbargo,
    reloadToken: syncGeneration,
  });

  const {
    visibleDisputeBoundaries,
    visibleLsibBoundary,
    visibleShipping,
    visibleCables,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleSubseaPipelines,
    visibleStaticPoints,
    visibleMilitaryBaseAreas,
    visibleMissileSiloFields,
    visibleResourceDeposits,
    visibleConflictZones,
    visibleArmsEmbargoZones,
    disputeOverviews,
    counts: staticCounts,
  } = staticLayers;

  /** IMF PortWatch graph sample routes (A* through chokepoints) — overlays Benden lanes */
  const maritimeRoutePaths = useMaritimeRoutePaths(showShippingLanes);

  /** 국경·영토 분쟁 핫스팟 — disputes.json(실제 폴리곤) × dispute-overviews.json(한국어 개요) 매칭 실데이터 */
  const disputeHotspots = useMemo<DisputeHotspotEntry[]>(
    () => buildDisputeHotspots(data.disputes ?? [], disputeOverviews),
    [data.disputes, disputeOverviews],
  );

  /**
   * 국가 면·분쟁 구역(해칭)·오버레이 폴리곤·무기금수 프레임 memo 묶음.
   * useDisputeZoneLayers 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useDisputeZoneLayers.ts
   */
  const {
    countryPolygonData,
    overlayPolygonData,
    disputeZonePaths,
    disputeFromPath,
    conflictZoneFromPath,
    disputeZoneOutlineCount,
    armsEmbargoFramePaths,
    conflictClusterPoints,
  } = useDisputeZoneLayers({
    data,
    isEconomyViewer,
    isConflictViewer,
    isHistoryViewer,
    globeReady,
    showWarZones,
    showDiplomaticTension,
    showMilitaryBases,
    showMissileSiloFields,
    showResources,
    showGpsInterference,
    showArmsEmbargo,
    showConflictZones,
    showAnyDisputeOverlay,
    filterCenter,
    layerViewState,
    globeLod,
    gpsJamPolygons,
    isVectorBaseMap,
    viewportCountries,
    visibleMilitaryBaseAreas,
    visibleMissileSiloFields,
    visibleResourceDeposits,
    visibleConflictZones,
    visibleArmsEmbargoZones,
  });

  /**
   * 안정화 오버레이 폴리곤·우크라이나 전선·축/동맹/지경학 블록 GeoJSON memo 묶음.
   * useBlocPolygonLayers 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useBlocPolygonLayers.ts
   */
  const {
    polygonData,
    ukraineMacroGeoJson,
    ukraineMicroGeoJson,
    polygonDataWithUkraine,
    axisHubCountriesGeoJson,
    axisSatelliteCountriesGeoJson,
    alliedBlocCountriesGeoJson,
    geoEconBlocCountriesGeoJson,
  } = useBlocPolygonLayers({
    isEconomyViewer,
    isConflictViewer,
    ukraineOccupiedGeoJson,
    applyGeneration,
    immediateUntilRef,
    showAlliedBlocs,
    showCstoBloc,
    showGeoEconBlocs,
    showUkraineControl,
    activeHubId,
    isCameraMoving,
    axisHubCountriesSource,
    axisSatelliteCountriesSource,
    alliedBlocCountriesSource,
    geoEconBlocCountriesSource,
    viinaDisplay,
    countryPolygonData,
    overlayPolygonData,
  });

  /**
   * ADIZ·축 네트워크·BRI/GTA 교역·전략 회랑·CRINK 인프라 경로 memo 묶음.
   * useStrategicPathLayers 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useStrategicPathLayers.ts
   */
  const {
    eastAsiaAdizPaths,
    axisNetworkPaths,
    briTradePaths,
    gtaInterventions,
    gtaTradePaths,
    strategicCorridorPaths,
    strategicCorridorBackgroundPaths,
    alliedLogisticsCorridorPaths,
    sanctionsEvasionCorridorPaths,
    usDfcSupplyPaths,
    crinkInfraPaths,
    crinkInfraPathCountByCategory,
    crinkInfraStatus,
    crinkInfraVisibilityHint,
  } = useStrategicPathLayers({
    isEconomyViewer,
    eastAsiaAdizFc,
    ultraLite,
    basemapMode,
    layerPrefs,
    showGtaInterventions,
    showEastAsiaAdiz,
    showAxisNetwork,
    showBriTradeConnectivity,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    showUsDfcSupplyChain,
    labelLanguage,
    activeHubId,
    hubFocusMode,
    axisArmsPayload,
    layerViewState,
    mapZoom,
    globeLod,
  });

  const hubHighlightIsos = useMemo(() => {
    if (!activeHubId) return null;
    const hub = hubById(activeHubId);
    if (!hub) return null;
    const set = new Set<string>([hub.iso]);
    if (hubFocusMode === "ally" && regionNavSelection?.allyCode) {
      set.add(regionNavSelection.allyCode);
    } else {
      for (const a of hub.allies) set.add(a.code);
    }
    return set;
  }, [activeHubId, hubFocusMode, regionNavSelection?.allyCode]);

  const claimRingPoints = useMemo<PulseRingPoint[]>(() => {
    if (!activeHubId || hubFocusMode !== "claim") return [];
    const hub = hubById(activeHubId);
    if (!hub) return [];
    const claims: HubClaim[] = regionNavSelection?.claimId
      ? hub.claims.filter((c) => c.id === regionNavSelection.claimId)
      : hub.claims;
    return claims.map((c) => ({
      pulseKind: "claim" as const,
      id: c.id,
      lat: c.lat,
      lng: c.lng,
      radiusScale: c.radiusScale,
      color: hub.color,
      markerId: `claim-ring-${c.id}`,
      label: c.label,
    }));
  }, [activeHubId, hubFocusMode, regionNavSelection?.claimId]);

  const frictionRingPoints = useMemo<PulseRingPoint[]>(() => {
    if (hubFocusMode !== "regime" && hubFocusMode !== "disputes") return [];
    const ep =
      frictionEpisodeBrief ??
      (regimeSelectedEpisodeId ? frictionEpisodeById(regimeSelectedEpisodeId) : null);
    if (!ep) return [];
    return [
      {
        pulseKind: "friction" as const,
        id: ep.id,
        lat: episodeLat(ep),
        lng: episodeLng(ep),
        radiusScale: ep.radiusScale,
        color: hubColorForLens(ep.lens),
        markerId: `friction-ring-${ep.id}`,
        label: ep.title,
      },
    ];
  }, [frictionEpisodeBrief, hubFocusMode, regimeSelectedEpisodeId]);

  /**
   * 마찰·영유권 에피소드 / 함정이동 / 훈련 / 전략태세 오버레이 memo —
   * useEpisodePostureOverlays 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useEpisodePostureOverlays.ts
   */
  const {
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
  } = useEpisodePostureOverlays({
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
  });

  const scoredEvents = useMemo(() => scoreEvents(gdeltEvents), [gdeltEvents]);

  const scoredCyberEvents = useMemo(() => scoreEvents(cyberEvents), [cyberEvents]);
  const scoredElectionEvents = useMemo(() => scoreEvents(electionEvents), [electionEvents]);

  const localDisputeAlerts = useMemo(
    () => pickDisputeAlerts(data.disputes ?? [], { limit: 12 }),
    [data.disputes],
  );

  const regionFilteredEvents = useMemo(
    () => filterEventsByNavSelection(scoredEvents, regionNavSelection),
    [scoredEvents, regionNavSelection],
  );

  const theaterFocusConfig = useMemo(
    () => (regionNavSelection ? theaterFocusFromNav(regionNavSelection) : null),
    [regionNavSelection],
  );

  const gdeltMenuCoreAlerts = useMemo(
    () => pickMenuCoreAlerts(scoredEvents, { limit: 12 }),
    [scoredEvents],
  );

  useEffect(() => {
    if (shouldCloseLocalForGdelt(showGdeltLayers)) {
      setShowLocalAlertPanel(false);
      setShowGdeltAlertPanel(showGdeltLayers);
    }
  }, [showGdeltLayers]);

  useEffect(() => {
    const { local, gdelt } = shouldClosePanelOnDataError({
      loadError,
      gdeltError,
      showGdeltLayers,
    });
    if (local) setShowLocalAlertPanel(false);
    if (gdelt) setShowGdeltAlertPanel(false);
  }, [loadError, gdeltError, showGdeltLayers]);

  useEffect(() => {
    if (!showAnyDisputeOverlay || showGdeltLayers || loadError || isLoading) return;
    if (localDisputeAlerts.length > 0) setShowLocalAlertPanel(true);
  }, [showAnyDisputeOverlay, showGdeltLayers, loadError, isLoading, localDisputeAlerts.length]);

  const {
    byChokeId: portWatchByChokeId,
    transits: portWatchTransits,
  } = usePortWatchObservations();
  const assetTickerSnapshot = useLogisticsAssetTickers(showLogisticsRisk && showLogisticsStress);

  const {
    whereIsItPool,
    bottomAlertPanel,
    gdeltTierPins,
    staticGlobePoints,
    chokeGlowColorById,
  } = useAlertDisplayModel({
    gdeltEvents,
    firmsFires,
    aisVessels,
    scoredEvents,
    gdeltMenuCoreAlerts,
    localDisputeAlerts,
    showGdeltLayers,
    showAnyDisputeOverlay,
    gdeltError,
    gdeltLoading,
    loadError,
    isLoading,
    showLocalAlertPanel,
    showGdeltAlertPanel,
    showGdeltAlliance,
    showGdeltProtests,
    layerViewState,
    ultraLite,
    econNavSelection,
    visibleStaticPoints,
    showLogisticsRisk,
    showLogisticsStress,
    ukmtoIncidents,
    portWatchByChokeId,
    assetTickerSnapshot,
  });

  const {
    airportPortHtmlMarkers,
    chokeGlowRings,
    deployedCarrierCount,
    usCarrierLabelOffsets,
    usCarrierHtmlMarkers,
    // 항공기·선박은 symbol 레이어로 그리므로 *HtmlMarkers(사본) 대신 원본 포인트를 쓴다
    milDisplayPoints,
    civDisplayPoints,
    aisDisplayPoints,
  } = useLiveOverlayMarkers({
    staticGlobePoints,
    showLogisticsRisk,
    chokeGlowColorById,
    usCarriers,
    aisVessels,
    disguisedVessels,
    isEconomyViewer,
    isLiveViewer,
    showUsCarriers,
    showGpsInterference,
    showMilitaryActivity,
    showAirTraffic,
    showAis,
    showDisguisedVessels,
    milAircraft,
    civAircraft,
    globeLodTier: globeLod.tier,
    layerViewState,
    // Ultra-Lite는 레이어 강제 OFF만 하고 마커 상한엔 관여하지 않았다 → 연동
    ultraLite,
  });

  const aircraftTrackHex =
    selected?.kind === "mil" ? selected.item.hex : null;
  const aisTrackMmsi = selected?.kind === "ais" ? selected.item.mmsi : null;

  const {
    aircraftSymbols,
    visibleFirmsFires,
    firmsCombatFireIds,
    firmsDisplayPoints,
    cesiumFirmsFires,
    firmsCombatInView,
    gdeltTensionTags,
    ukraineGdeltNeonMarkers,
    globeDisplayPoints,
    reconOrbitPaths,
    conflictClusterRings,
    rawTensionHeatmaps,
    newsStreamNeonMarkers,
    newsInsightCalloutMarkers,
  } = useFirmsTheaterDisplayModel({
    milDisplayPoints,
    civDisplayPoints,
    selectedHex: aircraftTrackHex,
    firmsFires,
    showFirmsFires,
    showWarZones,
    showConflictZones,
    disputes: data.disputes ?? [],
    visibleConflictZones,
    showUkraineControl,
    isSatelliteViewer,
    showTzevaAdom,
    tzevaAdomActive,
    showNewfeedsIranAttacks,
    newfeedsAttacks,
    globeLodTier: globeLod.tier,
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
  });

  /**
   * 사건 마커 (중국 theater · 북한 미사일 · 러시아 타격 · 유럽 드론 · conflict events) —
   * useIncidentMarkers 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useIncidentMarkers.ts
   */
  const {
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    cesiumMissileLaunches,
    russiaStrikeIncidentMarkers,
    europeDroneIncidentMarkers,
    conflictEventMarkers,
  } = useIncidentMarkers({
    scoredEvents,
    crossStraitSignal,
    newsStreamPayload,
    newfeedsAttacks,
    intelDisconfirmCorpus,
    layerViewState,
    globeLodTier: globeLod.tier,
    isSatelliteViewer,
    layerPrefs,
    showChinaTaiwanIncidents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showUsChinaIncidents,
    showNorthKoreaMissileTests,
    showUkraineStrikesOnRussia,
    showEuropeDroneIncidents,
    showConflictEvents,
    showConflictTheaterIran,
    showConflictTheaterKorea,
    showConflictTheaterLebanon,
    showConflictTheaterSyria,
    showConflictTheaterTaiwan,
    showConflictTheaterUkraine,
    showConflictTheaterKuril,
    showConflictTheaterBaltic,
    showConflictTheaterBlackSea,
    showConflictTheaterJapan,
    showConflictTheaterCaucasus,
    showConflictTheaterCentralAsia,
  });

  /** 앰비언트 사운드 셀렉터 — useAmbientSoundSelectors 훅으로 추출 (분리 2단계) */
  const episodeAmbientCenter = useMemo(
    () =>
      activeFrictionEpisode
        ? { lat: episodeLat(activeFrictionEpisode), lng: episodeLng(activeFrictionEpisode) }
        : null,
    [activeFrictionEpisode],
  );
  const { conflictAmbient: soundConflictAmbient, economyAmbient: soundEconomyAmbient } =
    useAmbientSoundSelectors({
      isEconomyViewer,
      globeTier: globeLod.tier,
      layerViewState,
      filterCenter,
      episodeCenter: episodeAmbientCenter,
      disputes: data.disputes ?? [],
      showAnyDisputeOverlay,
      showWarZones,
      showDiplomaticTension,
      showOilPipelines,
      showGasPipelines,
      showAiDataCenters,
      showInternetExchanges,
      showPorts,
      showShippingLanes,
      showLngTerminals,
      showEconomicCenters,
    });

  const handleHtmlMarkerHover = useCallback((point: GlobeDisplayPoint | null) => {
    if (isCompactUi) {
      setHoveredPoint(null);
      return;
    }
    setHoveredPoint(point);
  }, [isCompactUi]);

  const handleGlobeMouseMove = useCallback((coords: { lat: number; lng: number } | null) => {
    if (isCompactUi) {
      setHoverGlobeCoords(null);
      return;
    }
    setHoverGlobeCoords(coords);
  }, [isCompactUi]);

  const handleMapPointerMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (isCompactUi) return;
    const section = mapSectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    setHoverPointer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, [isCompactUi]);

  const handleMapPointerLeave = useCallback(() => {
    setHoverPointer(null);
    setHoverGlobeCoords(null);
    setHoveredNeptunThreat(null);
  }, []);

  const {
    gdeltTagHtmlMarkers,
    telegramNeonMarkers,
    situationCalloutMarkers,
    casualtySkullMarkers,
    visibleCasualtySkullMarkers,
    nuclearStockpileMarkers,
    safecastGaugesGeoJson,
    ukraineSettlementHtmlMarkers,
  } = useSituationHtmlMarkers({
    isEconomyViewer,
    isHistoryViewer,
    isCompactUi,
    labelLanguage,
    gdeltTensionTags,
    showTelegramOsint,
    telegramAlerts,
    globeLodTier: globeLod.tier,
    filterCenter,
    showUkraineControl,
    showWarZones,
    showDiplomaticTension,
    showTzevaAdom,
    showNewfeedsIranAttacks,
    hapiCasualties,
    mediazonaCasualties,
    showUcdpEvents,
    staticGlobePoints,
    hoveredPolygon,
    hoveredPath,
    showNuclearSites,
    mapZoom,
    ukraineSettlements,
    viinaDisplay,
    layerViewState,
  });

  /** MapLibre HTML · Cesium 공용 — 국가→메가→도시→마을 줌 LOD */
  const labelPlaces = useMemo(() => {
    if (!showCityLabels) return [];
    const filtered = filterObservePlaceLabels(
      data.places ?? [],
      layerViewState,
      layerViewState.altitude,
    );
    if (showUkraineControl) {
      return filtered.filter((place) => !isInUkraineTheater(place.lat, place.lng));
    }
    return filtered;
  }, [data.places, layerViewState, showCityLabels, showUkraineControl]);

  const rawGlobeLabels = useMemo<GlobeLabel[]>(
    () =>
      labelPlaces.map((place) => ({
        ...place,
        labelKind: "place" as const,
      })),
    [labelPlaces],
  );

  /** 분리 3단계 — points/paths/html 조립 memos → useGlobeOverlayModel */
  const { globePoints, rawGlobePaths, htmlOverlayMarkers } = useGlobeOverlayModel({
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
  });

  /**
   * 마커 재스케일·히트맵/라벨/경로 안정화(카메라 이동 중 동결) 묶음.
   * useStableGlobeLayers 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useStableGlobeLayers.ts
   */
  const {
    tensionHeatmaps,
    globeLabels,
    globePaths,
  } = useStableGlobeLayers({
    applyGeneration,
    immediateUntilRef,
    showGtaInterventions,
    showBriTradeConnectivity,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    showUsDfcSupplyChain,
    layerAltitude,
    isCameraMoving,
    stableNeptunLivePaths,
    stableNeptunArchivedPaths,
    isVectorBaseMap,
    reconOrbitPaths,
    rawTensionHeatmaps,
    casualtySkullMarkers,
    nuclearStockpileMarkers,
    rawGlobeLabels,
    rawGlobePaths,
  });

  const hoverCard = useHoverCard({
    hoveredCarrier,
    hoveredMilAircraft,
    civAircraft,
    hoveredNeptunThreat,
    hoveredPoint,
    hoveredPolygon,
    hoveredPath,
    hoverGlobeCoords,
    labelLanguage,
    gpsJamDate,
    ukmtoIncidents,
    navareaFeatures,
    displayMilitaryExercises,
    disputeFromPath,
    disputeOverviews,
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(420, Math.floor(height)),
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /** 분리 2단계 — AIS/ADS-B/항모 폴링 → useLiveVesselAirPolling */
  const {
    refreshAis,
    refreshMilAircraft,
    refreshCivAircraft,
    refreshUsCarriers,
  } = useLiveVesselAirPolling({
    isCameraMovingRef,
    layerAltitudeRef,
    layerCenterRef,
    isEconomyViewer,
    isConflictViewer,
    isLiveViewer,
    isSatelliteViewer,
    showAis,
    showDisguisedVessels,
    showMilitaryActivity,
    showAirTraffic,
    showUsCarriers,
    setAisVessels,
    setAisLoading,
    setAisError,
    setDisguisedVessels,
    setDisguisedLoading,
    setDisguisedError,
    setMilAircraft,
    setMilLoading,
    setMilError,
    setCivAircraft,
    setCivLoading,
    setCivError,
    setUsCarriers,
    setUsCarriersLoading,
  });

  /** Cesium 줌/팬 idle → LOD ref 동기화 + OpenSky 지역 densify 즉시 요청 */
  const handleCesiumCameraIdle = useCallback(
    (view: { lat: number; lng: number; altitude: number; heightM: number }) => {
      const prevLat = layerCenterRef.current.lat;
      const prevLng = layerCenterRef.current.lng;
      const prevAlt = layerAltitudeRef.current;
      const prevTier = getGlobeLod(prevAlt).tier;
      const nextTier = getGlobeLod(view.altitude).tier;

      layerCenterRef.current = { lat: view.lat, lng: view.lng };
      layerAltitudeRef.current = view.altitude;
      layerLodTierRef.current = nextTier;
      setFilterCenter({ lat: view.lat, lng: view.lng });
      setLayerAltitude(view.altitude);

      if (!showAirTraffic) return;
      const densifyNow = nextTier !== "global";
      const densifyWas = prevTier !== "global";
      const movedDeg = Math.hypot(view.lat - prevLat, view.lng - prevLng);
      if (
        densifyNow &&
        (!densifyWas || movedDeg >= 1.2 || prevTier !== nextTier)
      ) {
        void refreshCivAircraft();
      }
    },
    [
      getGlobeLod,
      layerAltitudeRef,
      layerCenterRef,
      layerLodTierRef,
      refreshCivAircraft,
      setFilterCenter,
      setLayerAltitude,
      showAirTraffic,
    ],
  );

  // 지경학: 군용·전선 레이어가 soft patch 등으로 켜져도 즉시 OFF
  useEffect(() => {
    if (!isEconomyViewer) return;
    if (
      showMilitaryActivity ||
      showMilitaryBases ||
      showRokMilitaryBases ||
      showJapanMilitaryBases ||
      showTaiwanMilitaryBases ||
      showPhilippinesMilitaryBases ||
      showAustraliaMilitaryBases ||
      showEasternNatoMilitaryBases ||
      showUsCarriers ||
      showDisguisedVessels ||
      showWeeklyShipMoves ||
      showReconSatellites ||
      showWarZones ||
      showDiplomaticTension ||
      showGdeltWar ||
      showUkraineControl ||
      showNeptun ||
      showTzevaAdom ||
      showConflictZones ||
      showTelegramOsint
    ) {
      patchLayerPrefsSoft(stripEconomyGeopoliticsPatch({}));
      if (selected?.kind === "recon-sat") setSelected(null);
    }
  }, [
    isEconomyViewer,
    patchLayerPrefsSoft,
    selected,
    showConflictZones,
    showDiplomaticTension,
    showDisguisedVessels,
    showGdeltWar,
    showMilitaryActivity,
    showMilitaryBases,
    showNeptun,
    showRokMilitaryBases,
    showJapanMilitaryBases,
    showTaiwanMilitaryBases,
    showPhilippinesMilitaryBases,
    showAustraliaMilitaryBases,
    showEasternNatoMilitaryBases,
    showReconSatellites,
    showTelegramOsint,
    showTzevaAdom,
    showUkraineControl,
    showUsCarriers,
    showWarZones,
    showWeeklyShipMoves,
  ]);

  /** 분리 2단계 — 텔레그램·Tzeva·NewFeeds 폴링 → useLiveOsintPolling */
  useLiveOsintPolling({
    isCameraMovingRef,
    isEconomyViewer,
    globeReady,
    showTelegramOsint,
    intelSheetOpen,
    viewerChromePreset,
    telegramEmbedMode,
    setTelegramAlerts,
    setTelegramLive,
    setTelegramStatus,
    setTelegramEmbedMode,
    setTelegramNeedsAuth,
    setTelegramSessionExists,
    setTzevaAdomActive,
    setTzevaAdomHistory,
    setTzevaAdomLive,
    setTzevaAdomGeoRestricted,
    setTzevaAdomError,
    setTzevaAdomStatus,
    setNewfeedsAttacks,
    setNewfeedsThreatLabel,
    setNewfeedsLive,
    setNewfeedsError,
    setNewfeedsStatus,
  });

  /**
   * 사이버·선거·GDELT · FIRMS 화재 · UKMTO·NAVAREA·군사훈련 라이브 폴링
   * (+ 선박이동·양안 신호·리프워치 페치) — useLiveGeoFeedPolling 훅으로 추출 (분리 4단계).
   */
  const {
    refreshGdeltEvents,
  } = useLiveGeoFeedPolling({
    isCameraMovingRef,
    isEconomyViewer,
    globeReady,
    isCameraMoving,
    layerAltitude,
    layerViewState,
    globeLod,
    applyGeneration,
    immediateUntilRef,
    labelLanguage,
    viewerChromePreset,
    shouldFetchGdeltFeed,
    showCyberIncidents,
    showElectionEvents,
    showFirmsFires,
    showUkmtoIncidents: showUkmtoIncidents || isSatelliteViewer,
    showNavareaWarnings: showNavareaWarnings || isSatelliteViewer,
    showShipMovesLayer,
    showMilitaryExercises,
    showEastAsiaAdiz,
    showChinaTaiwanIncidents,
    showReefWatch,
    firmsBboxRef,
    firmsFetchBusyRef,
    setCyberEvents,
    setElectionEvents,
    setGdeltEvents,
    setGdeltLoading,
    setGdeltError,
    setGdeltFetchedAt,
    setFirmsFires,
    setFirmsLoading,
    setFirmsError,
    setUkmtoIncidents,
    setUkmtoStatus,
    setNavareaFeatures,
    setNavareaStatus,
    setMilitaryExercises,
    setMilitaryExercisesStatus,
    setShipMovesMap,
    setShipMovesTimeline,
    setShipMovesLoading,
    setShipMovesDisclaimer,
    setCrossStraitSignal,
    setCrossStraitSignalStatus,
    setReefWatch,
    setReefWatchStatus,
  });

  const layerPanelGdeltCounts = useMemo(
    () => ({
      war: gdeltTensionTags.filter((e) => e.eventTier === "war").length,
      diplomatic: gdeltTensionTags.filter((e) => e.eventTier === "diplomatic").length,
      alliance: gdeltTierPins.filter((e) => e.eventTier === "alliance").length,
      protest: gdeltTensionTags.filter((e) => e.eventTier === "protest").length,
    }),
    [gdeltTensionTags, gdeltTierPins],
  );

  const escalationNewsItems = useMemo(
    () => [
      ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
      ...(newsStreamPayload?.verified ?? []),
      ...(newsStreamPayload?.stateMedia ?? []),
    ],
    [newsStreamPayload?.hero, newsStreamPayload?.verified, newsStreamPayload?.stateMedia],
  );

  /** 상단 검색용 — hero·flash·verified·stateMedia (id 중복 제거) */
  const newsSearchPool = useMemo(() => {
    const seen = new Set<string>();
    const out: NewsStreamItem[] = [];
    for (const item of [
      ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
      ...(newsStreamPayload?.flashHeroes ?? []),
      ...(newsStreamPayload?.verified ?? []),
      ...(newsStreamPayload?.stateMedia ?? []),
    ]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    return out;
  }, [
    newsStreamPayload?.flashHeroes,
    newsStreamPayload?.hero,
    newsStreamPayload?.stateMedia,
    newsStreamPayload?.verified,
  ]);

  const placeSearchIndex = useMemo(
    () => createPlaceSearchIndex(data.places ?? []),
    [data.places],
  );

  const newsSearchIndex = useMemo(
    () => createNewsSearchIndex(newsSearchPool),
    [newsSearchPool],
  );

  const newsKeywordCatalog = useMemo(
    () => buildNewsKeywordCatalog(newsSearchPool),
    [newsSearchPool],
  );

  const searchResults = useMemo(
    () =>
      searchChromeHits({
        query,
        placeIndex: placeSearchIndex,
        newsIndex: newsSearchIndex,
        limit: 12,
      }),
    [newsSearchIndex, placeSearchIndex, query],
  );

  const searchKeywordSuggestions = useMemo(
    () => suggestNewsKeywords(query, newsKeywordCatalog, 8),
    [newsKeywordCatalog, query],
  );

  const escalationHotTheaters = useMemo(() => {
    const theaters = newsStreamPayload?.stats?.theaters;
    if (!theaters) return undefined;
    return Object.entries(theaters)
      .filter(([, n]) => (n ?? 0) > 0)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 4)
      .map(([id]) => id as NewsTheater);
  }, [newsStreamPayload?.stats?.theaters]);

  const {
    offer: escalationOffer,
    visible: escalationVisible,
    dismiss: dismissEscalationOffer,
  } = useEscalationSignals({
    items: escalationNewsItems,
    enabled: showEscalationSignals,
    hotTheaters: escalationHotTheaters,
  });

  const layerCategories = useLayerPanelCategories({
    showLeftPanel: showLeftPanel || layerDropdownOpen,
    layerPanelReady,
    categorySnapshotRef,
    labelLanguage,
    globeLod,
    labelPlaces,
    showCityLabels,
    layerPrefs,
    setShowCityLabels,
    showRailGlow,
    railPaths,
    setShowRailGlow,
    toggleCategoryPrefs,
    ukraineControlStatus,
    showUkraineControl,
    ukraineMacroGeoJson,
    ukraineMicroGeoJson,
    viinaMeta,
    setShowUkraineControl,
    showNeptun,
    neptunFetchEnabled,
    neptunRenderMode,
    visibleNeptunThreats,
    neptunAlertCount,
    neptunLive,
    neptunStatus,
    setShowNeptun,
    showChinaTaiwanIncidents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showUsChinaIncidents,
    showNorthKoreaMissileTests,
    showUkraineStrikesOnRussia,
    showEuropeDroneIncidents,
    setShowChinaTaiwanIncidents,
    setShowChinaJapanIncidents,
    setShowChinaPhilippinesIncidents,
    setShowUsChinaIncidents,
    setShowNorthKoreaMissileTests,
    setShowUkraineStrikesOnRussia,
    setShowEuropeDroneIncidents,
    showConflictEvents,
    setShowConflictEvents,
    conflictEventMarkerCount: conflictEventMarkers.length,
    setConflictTheater,
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    russiaStrikeIncidentMarkers,
    europeDroneIncidentMarkers,
    showWarZones,
    disputeZoneOutlineCount,
    setShowWarZones,
    showDiplomaticTension,
    setShowDiplomaticTension,
    showEastAsiaAdiz,
    setShowEastAsiaAdiz,
    showIslandChains,
    setShowIslandChains,
    showNewfeedsIranAttacks,
    newfeedsStatus,
    newfeedsThreatLabel,
    newfeedsAttacks,
    setShowNewfeedsIranAttacks,
    showUkmtoIncidents,
    ukmtoStatus,
    ukmtoIncidents,
    setShowUkmtoIncidents,
    showEscalationSignals,
    escalationVisibleCount: escalationVisible.length,
    escalationSuppressedCount: escalationOffer?.suppressed ?? 0,
    setShowEscalationSignals,
    showNavareaWarnings,
    navareaStatus,
    navareaFeatures,
    setShowNavareaWarnings,
    showMilitaryExercises,
    militaryExercisesStatus:
      militaryExercisesStatus === "error" && crossStraitSignalStatus === "error"
        ? "error"
        : militaryExercisesStatus === "loading" || crossStraitSignalStatus === "loading"
          ? "loading"
          : "ok",
    militaryExercises: combinedMilitaryExercises,
    setShowMilitaryExercises,
    showTzevaAdom,
    tzevaAdomActive,
    tzevaAdomLive,
    tzevaAdomStatus,
    tzevaAdomHistory,
    setShowTzevaAdom,
    showAxisNetwork,
    axisNetworkPaths,
    setShowAxisNetwork,
    crinkInfraPathCountByCategory,
    crinkInfraStatus,
    crinkInfraVisibilityHint,
    showConflictZones,
    visibleConflictZones,
    setShowConflictZones,
    showArmsEmbargo,
    armsEmbargoFramePaths,
    setShowArmsEmbargo,
    showUcdpEvents,
    setShowUcdpEvents,
    showGdeltWar,
    gdeltLoading,
    ukraineGdeltNeonMarkers,
    layerPanelGdeltCounts,
    setShowGdeltWar,
    showGdeltDiplomatic,
    setShowGdeltDiplomatic,
    showGdeltOceanCompetition,
    setShowGdeltOceanCompetition,
    showGdeltProtests,
    setShowGdeltProtests,
    showTelegramOsint,
    telegramStatus,
    telegramLive,
    telegramAlerts,
    telegramEmbedMode,
    setShowTelegramOsint,
    viinaDisplay,
    ukraineControlDate,
    showGdeltLayers,
    refreshGdeltEvents,
    gdeltError,
    gdeltFetchedAt,
    setShowDisputeLegendPanel,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
    showSubseaPipelines,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleSubseaPipelines,
    visibleStaticPoints,
    staticCounts,
    setShowOilPipelines,
    setShowGasPipelines,
    setShowLngTerminals,
    setShowSubseaPipelines,
    togglePref,
    showResources,
    showNuclearSites,
    setShowResources,
    setShowNuclearSites,
    isEconomyViewer,
    isLiveViewer,
    isSatelliteViewer,
    showUsDfcSupplyChain,
    usDfcSupplyPaths,
    setShowUsDfcSupplyChain,
    showBriTradeConnectivity,
    briTradePaths,
    setShowBriTradeConnectivity,
    showGtaInterventions,
    gtaTradePaths,
    gtaInterventionCount: gtaInterventions.length,
    setShowGtaInterventions,
    showStrategicCorridors,
    strategicCorridorPaths,
    setShowStrategicCorridors,
    showAlliedLogisticsCorridors,
    alliedLogisticsCorridorPaths,
    setShowAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    sanctionsEvasionCorridorPaths,
    setShowSanctionsEvasionCorridors,
    showSesChip,
    setShowSesChip,
    showShippingLanes,
    visibleShipping,
    setShowShippingLanes,
    showLsibBoundary,
    visibleLsibBoundary,
    setShowLsibBoundary,
    showSubmarineCables,
    visibleCables,
    setShowSubmarineCables,
    showSubmarineTunnels,
    setShowSubmarineTunnels,
    showAirports,
    setShowAirports,
    showPorts,
    setShowPorts,
    showInternetExchanges,
    setShowInternetExchanges,
    showLogisticsRisk,
    setShowLogisticsRisk,
    showLogisticsStress,
    setShowLogisticsStress,
    showGscpiGauge,
    setShowGscpiGauge,
    showCriticalNodes,
    setShowCriticalNodes,
    showAis,
    aisVessels,
    setShowAis,
    showAisMilitary,
    setShowAisMilitary,
    showAisCommercial,
    setShowAisCommercial,
    showWeeklyShipMoves,
    weeklyShipMoveCount: combinedShipMovesMap.length,
    setShowWeeklyShipMoves,
    showReefWatch,
    reefWatchFeatureCount: reefWatch?.overview.featureCount ?? 0,
    reefWatchTrafficCount: reefWatch?.overview.trafficCount ?? 0,
    reefWatchStatus,
    setShowReefWatch,
    showDisguisedVessels,
    disguisedLoading,
    disguisedVessels,
    disguisedError,
    setShowDisguisedVessels,
    showMilitaryBases,
    showRokMilitaryBases,
    showJapanMilitaryBases,
    showTaiwanMilitaryBases,
    showPhilippinesMilitaryBases,
    showAustraliaMilitaryBases,
    showEasternNatoMilitaryBases,
    visibleMilitaryBaseAreas,
    setShowMilitaryBases,
    showCstoBloc,
    showGeoEconBlocs,
    setShowAlliedBlocs,
    setShowCstoBloc,
    setShowGeoEconBlocs,
    setShowRokMilitaryBases,
    setShowJapanMilitaryBases,
    setShowTaiwanMilitaryBases,
    setShowPhilippinesMilitaryBases,
    setShowAustraliaMilitaryBases,
    setShowEasternNatoMilitaryBases,
    showMissileSilos,
    setShowMissileSilos,
    showStrategicMissileBases,
    setShowStrategicMissileBases,
    showMissileTestSites,
    setShowMissileTestSites,
    showMissileSiloFields,
    setShowMissileSiloFields,
    visibleMissileSiloFields,
    showMilitaryActivity,
    milAircraft,
    setShowMilitaryActivity,
    showIntelHotspots,
    setShowIntelHotspots,
    showRefugeeCamps,
    setShowRefugeeCamps,
    refreshMilAircraft,
    milLoading,
    milError,
    showFirmsFires,
    visibleFirmsFires,
    firmsCombatFireIds,
    firmsError,
    setShowFirmsFires,
    showCyberIncidents,
    cyberEvents,
    setShowCyberIncidents,
    showElectionEvents,
    electionEvents,
    setShowElectionEvents,
    showSpaceLaunches,
    setShowSpaceLaunches,
    showReconSatellites,
    setShowReconSatellites,
    reconSatCount: reconSatelliteMarkers.length || reconTleCount,
    reconSatStatus,
    reconSatError,
    showGpsInterference,
    setShowGpsInterference,
    gpsJamCellCount: gpsJamPolygons.length,
    gpsJamDate,
    gpsJamStatus,
    showAirTraffic,
    civAircraft,
    setShowAirTraffic,
    showEconomicCenters,
    setShowEconomicCenters,
    showAiDataCenters,
    setShowAiDataCenters,
    showSanctionsEntities,
    setShowSanctionsEntities,
    refreshCivAircraft,
    civLoading,
    civError,
    viewerChromePreset,
    refreshUsCarriers,
    showUsCarriers,
    usCarriers,
    usCarriersLoading,
    showNeptunPreviousTrails,
    ukraineRuCellCount,
    newfeedsLive,
    neptunThreats,
    neptunArchivedThreats,
    visibleNeptunArchived,
  });

  /**
   * 레이어 패널·좌측 드로어·마찰/영유권 에피소드 시작 콜백 묶음.
   * useLayerPanelActions 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useLayerPanelActions.ts
   */
  const {
    dismissLayerPanel,
    toggleLeftPanel,
    openLeftDrawer,
    closeLeftPanel,
    ensureLeftPanelOpen,
    handleResetCheckboxSettings,
    selectFrictionStage,
    selectTerritorialStage,
    beginTerritorialEpisode,
  } = useLayerPanelActions({
    showLeftPanel,
    setShowLeftPanel,
    leftPanelTab,
    setLeftPanelTab,
    layerPanelDirty,
    setLayerPanelDirty,
    deferLayerMapApplyRef,
    panelDraftPatchRef,
    categorySnapshotRef,
    layerPanelSessionRef,
    setIntelSheetOpen,
    layerPanelReady,
    frozenPanelCategories,
    setFrozenPanelCategories,
    setFrictionEpisodeBrief,
    setSelected,
    ultraLiteRef,
    layerPrefs,
    applyLayerPrefs,
    peekDraftPrefs,
    labelLanguage,
    setRegionNavSelection,
    setEconNavSelection,
    setRegimeSelectedEpisodeId,
    setDisputeEpisodeSelectedId,
    setTerritorialEpisodeBrief,
    setTerritorialActiveStageId,
    setTerritorialRevealedStageIds,
    territorialSequenceRef,
    clearTerritorialSequence,
    setFrictionActiveStageId,
    historyImmersionRef,
    flyTo,
    clearFrictionEpisodeTimer,
    layerCategories,
  });

  /** 공습 포커스 정리 — 빗금·박스·지연 타이머 */
  const clearAirRaidFocus = useCallback(() => {
    if (airRaidFocusClearRef.current != null) {
      window.clearTimeout(airRaidFocusClearRef.current);
      airRaidFocusClearRef.current = null;
    }
    setAirRaidFocusPaths([]);
    setAirRaidFocusBox(null);
  }, []);

  /**
   * 공습경보 자동 ON·배너 — useAirRaidAutoLayer 훅 (분리 3단계).
   * handleAirRaidFocus는 아래쪽에서 정의되므로 ref로 우회 호출.
   */
  const handleAirRaidFocusRef = useRef<
    (
      target: AirRaidFocusTarget,
      kind: AirRaidSirenKind,
      options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
    ) => void
  >(() => {});
  const {
    airRaidOffer,
    dismissAirRaidOffer,
    clearAirRaidOffer,
    releaseAirRaidAutoBusy,
  } = useAirRaidAutoLayer({
    paused:
      isEconomyViewer || entryGate !== null || showModePicker || issueUiPausedForLamp,
    labelLanguage,
    tzevaAdomActive,
    newfeedsAttacks,
    airRaidBriefing,
    setAirRaidBriefing,
    briefingBlocked:
      Boolean(periodicBriefing) || Boolean(exerciseBriefing) || Boolean(breakingFlash),
    handleAirRaidFocus: (target, kind, options) =>
      handleAirRaidFocusRef.current(target, kind, options),
    patchLayerPrefsSoft,
    layerPrefsLiveRef,
    clearAirRaidFocus,
  });

  /**
   * 공습·훈련·시스템 경보 자동 제안 이펙트 묶음.
   * useAlertAndAutoOfferEffects 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useAlertAndAutoOfferEffects.ts
   */
  const {
    exerciseOffer,
    dismissExerciseOffer,
  } = useAlertAndAutoOfferEffects({
    showLeftPanel,
    viewerMode,
    isEconomyViewer,
    isSatelliteViewer,
    isHistoryViewer,
    layerPrefsLiveRef,
    showModePicker,
    entryGate,
    langChoiceDone,
    langChoiceChecked,
    chromeCoachStep,
    showFirstVisitTour,
    showAirRaidCoach,
    airRaidBriefing,
    setAirRaidBriefing,
    uxGuideBrief,
    setUxGuideBrief,
    deepDiveSession,
    showFeatureGuide,
    showControlsGuide,
    setShowControlsGuide,
    isLoading,
    globeReady,
    loadError,
    theaterSitrepRegion,
    exerciseBriefing,
    setExerciseBriefing,
    patchLayerPrefsSoft,
    dailyLampSettled,
    weeklyRecapSettled,
    periodicBriefing,
    weeklyExpanded,
    issueUiPausedForLamp,
    showNeptun,
    labelLanguage,
    breakingFlash,
    neptunStatus,
    isUkraineTheaterFocus,
    displayMilitaryExercises,
    airRaidOffer,
  });

  /** 초크포인트 호버 → 물류 스트레스 관측 카드 (UKMTO A + PortWatch B + 연동자산 시세 대리지표 C) */
  const hoveredChokepointStress = useMemo(() => {
    if (!hoveredPoint || hoveredPoint.displayKind !== "static") return null;
    if (hoveredPoint.kind !== "chokepoint") return null;
    const nameEn = hoveredPoint.meta?.nameEn;
    const title =
      labelLanguage === "en" && typeof nameEn === "string" && nameEn.trim()
        ? nameEn
        : hoveredPoint.name;
    const stress = stressForChokepoint(
      hoveredPoint,
      ukmtoIncidents,
      portWatchByChokeId[hoveredPoint.id] ?? null,
      assetVolatilityHintForPoint(hoveredPoint.meta?.relatedTickers as string | undefined, assetTickerSnapshot),
    );
    return { title, stress };
  }, [hoveredPoint, labelLanguage, ukmtoIncidents, portWatchByChokeId, assetTickerSnapshot]);

  useLogisticsStressSiren({
    paused: entryGate !== null || showModePicker || issueUiPausedForLamp,
    ukmtoIncidents,
    aisByChokeId: portWatchByChokeId,
    flyTo,
  });

  const assetByChokeId = useMemo(() => {
    const out: Record<string, ReturnType<typeof assetVolatilityHintForPoint>> = {};
    for (const p of LOGISTICS_RISK_POINTS) {
      out[p.id] = assetVolatilityHintForPoint(
        p.meta?.relatedTickers as string | undefined,
        assetTickerSnapshot,
      );
    }
    return out;
  }, [assetTickerSnapshot]);

  useChokepointStressParchment({
    paused: entryGate !== null || showModePicker || issueUiPausedForLamp,
    lang: labelLanguage,
    ukmtoIncidents,
    aisByChokeId: portWatchByChokeId,
    assetByChokeId,
    blockedByOtherBriefing:
      Boolean(airRaidBriefing) ||
      Boolean(periodicBriefing) ||
      Boolean(breakingFlash) ||
      Boolean(exerciseBriefing) ||
      Boolean(chokepointStressBriefing),
    satelliteFlash: isSatelliteViewer,
    onOffer: setChokepointStressBriefing,
  });

  const { adsbEmergencyOffer, dismissAdsbEmergencyOffer } = useAdsbEmergencyAlert({
    paused:
      isEconomyViewer ||
      entryGate !== null ||
      showModePicker ||
      issueUiPausedForLamp ||
      Boolean(airRaidBriefing) ||
      Boolean(airRaidOffer) ||
      Boolean(periodicBriefing),
    flyTo,
    isSatelliteViewer,
  });

  /** 지정학/항적 등 MapLibre 모드에서 배너의 "관측 모드로 이동" 버튼 핸들러 */
  const handleAdsbGoToObserve = useCallback(() => {
    if (!adsbEmergencyOffer) return;
    const ac = adsbEmergencyOffer.aircraft;
    const traffic: "military" | "civil" = ((ac.dbFlags ?? 0) & 1) === 1 ? "military" : "civil";
    switchToObserveAndFly(ac.lat, ac.lng, {
      altitude: 0.55,
      durationMs: 900,
      camera: { pitch: 42, bearing: -8 },
      subtitle: "ADS-B",
      title: ac.callsign || ac.registration || ac.hex.toUpperCase(),
      selection: { kind: "mil", item: ac, traffic },
    });
    dismissAdsbEmergencyOffer();
  }, [adsbEmergencyOffer, switchToObserveAndFly, dismissAdsbEmergencyOffer]);

  /** NATO 동부 접경 UAV — 등불 pause 우회 · 지정학+Neptun만 */
  const { natoPerimeterAlert, dismissNatoPerimeterAlert } = useNatoPerimeterDroneAlert({
    enabled: isConflictViewer && showNeptun,
    threats: neptunThreats,
    flyTo,
    hardPaused: entryGate !== null || showModePicker,
  });

  /**
   * FPS 프로브 → Ultra-Lite 1회 제안.
   * enabled는 반드시 globeReady — 부트 스파이크를 저사양으로 오독하지 않는다.
   * Compact/Phone은 이미 가벼운 경로이므로 측정하지 않는다.
   * 첫 90초(firstImpression) 동안은 재지 않는다.
   */
  const [mapElForImpression, setMapElForImpression] = useState<HTMLElement | null>(
    null,
  );
  useEffect(() => {
    if (!globeReady) {
      setMapElForImpression(null);
      return;
    }
    setMapElForImpression(containerRef.current);
  }, [globeReady, size.width, size.height]);

  const applyFirstImpressionPatch = useCallback(
    (patch: Parameters<typeof patchLayerPrefsSoft>[0]) => {
      patchLayerPrefsSoft(patch);
    },
    [patchLayerPrefsSoft],
  );

  /**
   * 화면 상태 파생 (P2-1 8단계) — 게이트 조합을 이름 붙은 판정으로.
   *
   * 아래 두 훅은 같은 조건을 각각 6·7항으로 다시 조합하고 있었다.
   * 하나만 바뀌어도 두 곳을 같이 고쳐야 하고, 빠뜨리면 조용히 어긋난다.
   * 판정을 한 곳에 모아 `screen.canRunFirstImpression` / `canMeasurePerf`로 읽는다.
   */
  const screen = useScreenState({
    entryGate,
    showModePicker,
    showLeftPanel,
    intelSheetOpen,
    globeReady,
    isLoading,
    loadError,
    isPhoneUi,
    isCompactUi,
  });

  const firstImpression = useFirstImpressionController({
    enabled: screen.canRunFirstImpression,
    isPhone: isPhoneUi,
    hasGti: Boolean(wtiSnapshot),
    hasMarketLink: false,
    /** 장면 모드가 fly를 소유 — 첫인상 자동 핫존 fly 끔 */
    hotTheaterFocus: null,
    flyTo,
    mapElement: mapElForImpression,
    onApplyHotTheaterPatch: applyFirstImpressionPatch,
    onHotTheaterAutoConsumed: () => undefined,
  });

  const ultraLiteAutoOffer = useUltraLiteAutoOffer(
    /** 측정 가능 상태 + 첫 90초가 끝났을 때만 */
    screen.canMeasurePerf && firstImpression.onboardingReady,
    handleUltraLiteToggle,
  );

  /** 해상 경보 브리프 — useMaritimeAlertBriefs 훅 (분리 3단계) */
  const {
    ukmtoBriefing,
    navareaBriefing,
    maritimeOffer,
    openUkmtoBrief,
    openNavareaBrief,
    acceptMaritimeOffer,
    dismissMaritimeOffer,
    closeUkmtoBriefing,
    closeNavareaBriefing,
  } = useMaritimeAlertBriefs({
    paused:
      isEconomyViewer ||
      entryGate !== null ||
      showModePicker ||
      issueUiPausedForLamp ||
      Boolean(airRaidBriefing) ||
      Boolean(airRaidOffer) ||
      Boolean(exerciseBriefing) ||
      Boolean(exerciseOffer) ||
      Boolean(periodicBriefing) ||
      Boolean(breakingFlash) ||
      Boolean(chokepointStressBriefing) ||
      Boolean(theaterSitrepRegion),
    labelLanguage,
    showNavareaWarnings: showNavareaWarnings || isSatelliteViewer,
    showUkmtoIncidents: showUkmtoIncidents || isSatelliteViewer,
    navareaFeatures,
    ukmtoIncidents,
    flyTo,
    patchLayerPrefsSoft,
    layerPrefsLiveRef,
    skipNextGlobeClickRef,
    satelliteAutoFlash: isSatelliteViewer,
  });

  /** 전황 책 열리면 진행 중 타전·경보 UI 정리 */
  useEffect(() => {
    if (!theaterSitrepRegion) return;
    clearBreakingFlash();
    resetLiveuaUi();
    closeUkmtoBriefing();
    closeNavareaBriefing();
    setChokepointStressBriefing(null);
  }, [
    theaterSitrepRegion,
    clearBreakingFlash,
    resetLiveuaUi,
    closeUkmtoBriefing,
    closeNavareaBriefing,
  ]);

  /**
   * Observe 경보·워치보드·초크 스트레스·해협 오버레이 파생 데이터 묶음.
   * useObserveAlertModel 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useObserveAlertModel.ts
   */
  const {
    cesiumAlerts,
    observeWatchboardItems,
    escalationIntel,
    chokepointStressGate,
    cesiumChokeRings,
    straitTour,
    straitPorts,
    straitOverlaySegments,
    straitLabels,
    openCesiumAlert,
  } = useObserveAlertModel({
    isSatelliteViewer,
    isPhoneUi,
    setSelected,
    newsStreamPayload,
    deskFocus,
    setDeskFocus,
    setPromotingItemId,
    watchGradePrevRef,
    newfeedsAttacks,
    ukmtoIncidents,
    navareaFeatures,
    setExerciseBriefing,
    chokepointStressBriefing,
    setChokepointStressBriefing,
    disguisedVessels,
    liveuaEvents,
    observeEntryHadTarget,
    labelLanguage,
    intelDisconfirmCorpus,
    flyTo,
    INCIDENT_ENTRY_ALT,
    cesiumReady,
    unifiedFlyTo,
    switchToObserveAndFly,
    displayMilitaryExercises,
    scoredEvents,
    portWatchByChokeId,
    portWatchTransits,
    escalationOffer,
    assetByChokeId,
    openUkmtoBrief,
    openNavareaBrief,
  });

  function openIntelSheet(options?: {
    theater?: IntelTheaterFilter;
    tab?: "news" | "video" | "telegram" | "viina";
    economyTab?: "news" | "video" | "markets" | "majors" | "shipping-choke" | "aviation";
    lat?: number;
    lng?: number;
    altitude?: number;
  }) {
    dismissLayerPanel(true);
    setSelected(null);
    if (!historyImmersionRef.current) setRegionNavSelection(null);
    setIntelTheaterFilter(options?.theater ?? "all");
    setIntelSheetOpen(true);
    intelStackRef.current?.openNewsPanel(
      options?.theater ?? "all",
      options?.tab ?? "news",
      options?.economyTab,
    );
    if (options?.lat != null && options?.lng != null) {
      flyTo(options.lat, options.lng, options.altitude ?? 0.92);
    }
  }

  const handleViinaEventFlyTo = useCallback(
    (event: ViinaFrontEvent) => {
      setIntelSheetOpen(false);
      flyTo(event.lat, event.lng, 0.68);
    },
    [flyTo],
  );

  const openIntelFromCoords = useCallback((lat: number, lng: number, altitude = 0.92) => {
    setSelected(null);
    clearRegionNavSelection();
    // 지경학 RSS는 대부분 theater=global — 좌표 전장 필터를 걸면 목록이 비게 됨
    const theater = isEconomyViewer ? "all" : newsTheaterFromCoords(lat, lng);
    setIntelTheaterFilter(theater);
    setIntelSheetOpen(true);
    intelStackRef.current?.openNewsPanel(theater, "news");
    flyTo(lat, lng, altitude);
  }, [clearRegionNavSelection, flyTo, isEconomyViewer]);

  /** 카메라가 멈춘 뒤 하단 주요 뉴스 필터를 현위치 전장으로 맞춤 */
  useEffect(() => {
    if (isEconomyViewer || isCameraMoving || intelSheetOpen || regionNavSelection) return;
    const theater = newsTheaterFromCoords(filterCenter.lat, filterCenter.lng);
    setIntelTheaterFilter((prev) => (prev === theater ? prev : theater));
  }, [
    filterCenter.lat,
    filterCenter.lng,
    intelSheetOpen,
    isCameraMoving,
    isEconomyViewer,
    regionNavSelection,
  ]);

  function handleIntelFlyTo(target: MapFlyTarget) {
    if (target.kind === "coords") {
      flyTo(target.lat, target.lng, target.altitude ?? 0.92);
      return;
    }
    const center = THEATER_FLY_TO[target.theater];
    flyTo(center.lat, center.lng, center.altitude);
  }

  const handleTelegramFlyToPlace = useCallback(
    (place: { lat: number; lng: number; label: string }) => {
      if (isEconomyViewer) return;
      flyTo(place.lat, place.lng, 0.88);
    },
    [flyTo, isEconomyViewer],
  );

  const {
    enterTheaterFocus,
    enterEconomyRegionFocus,
    flyToTheaterDetail,
  } = useTheaterNavigation({
    flyTo,
    flyToBounds,
    computeRegionFitAltitude,
    globeReady,
    isLoading,
    loadError,
    entryGate,
    showModePicker,
    viewUi,
    initialViewConfig,
    closeLeftPanel,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    toggleCategoryPrefs,
    layerPrefsLiveRef,
    setSelected,
    setIntelSheetOpen,
    setShowDisputeLegendPanel,
    setShowLocalAlertPanel,
    setEconNavSelection,
    setEconNewsPanelReveal,
    setLiveBriefingSession,
    setRegionNavSelection,
    setRegimeSelectedEpisodeId,
    setFrictionEpisodeBrief,
    setTheaterSidebarTab,
    setIntelTheaterFilter,
    setShipMovesSelectedId,
    scheduleHubBrief,
    scheduleEconInsight,
    closeEconInsight,
    clearEconInsightTimer,
    clearFrictionEpisodeTimer,
    rememberConflictNav,
    rememberEconomyNav,
    clearRegionNavSelection,
    ukraineControl,
    showUkraineControl,
    refreshUkraineControl,
    viinaMeta,
    setUkraineFrontLegendEngaged,
    isUkraineTheaterFocus,
    showNeptun,
    theaterFocusConfig,
    labelLanguage,
    historyStoryLockedRef,
    layerCenterRef,
    layerAltitudeRef,
    layerLodTierRef,
    setFilterCenter,
    setLayerAltitude,
    getGlobeLod,
    ukraineZoomPendingRef,
    neptunZoomPendingRef,
    packageTheaterFocusPlayedRef,
    packageEconFocusPlayedRef,
    introPlayedRef,
    immediateUntilRef,
    suppressAutoRegionZoomRef,
  });

  /** 현위치 태그 → 우측 TheaterIntel (속보) 패널 */
  const openCurrentLocationNews = useCallback(() => {
    if (isEconomyViewer) {
      openIntelSheet({ theater: "all" });
      return;
    }
    const theater = newsTheaterFromCoords(filterCenter.lat, filterCenter.lng);
    setIntelTheaterFilter(theater);
    const navId = navIdForNewsTheater(theater);
    const sel = navId ? navSelectionFromId(navId) : null;
    if (sel) {
      enterTheaterFocus(sel, "news");
      return;
    }
    openIntelSheet({ theater });
  }, [enterTheaterFocus, filterCenter.lat, filterCenter.lng, isEconomyViewer]);

  /** 지리 분석 패널 → 좌표 기반 관련 뉴스 (우측 TheaterIntel) */
  const openRelatedNewsAt = useCallback(
    (coords: { lat: number; lng: number }) => {
      const theater = newsTheaterFromCoords(coords.lat, coords.lng);
      setIntelTheaterFilter(theater);
      const navId = navIdForNewsTheater(theater);
      const sel = navId ? navSelectionFromId(navId) : null;
      if (sel) {
        enterTheaterFocus(sel, "news");
        return;
      }
      openIntelSheet({ theater, tab: "news" });
    },
    [enterTheaterFocus],
  );

  axisLinkOpenNewsRef.current = () => {
    const link = selectedAxisLink;
    trackEvent("axis_link_cta_news", {
      pathId: link?.pathId,
      from: link?.from,
      to: link?.to,
    });
    setShowGdeltAlliance(true);
    setShowGdeltDiplomatic(true);
    const hubId = link
      ? preferredAxisHub(link.from, link.to, link.hubs, activeHubId)
      : null;
    setSelectedAxisLink(null);
    if (hubId) {
      const navId = navIdForAxisHubNews(hubId);
      const sel = navSelectionFromId(navId);
      if (sel) {
        enterTheaterFocus(sel, "news");
        return;
      }
      const hub = hubById(hubId);
      if (hub) {
        openRelatedNewsAt({ lat: hub.lat, lng: hub.lng });
        return;
      }
    }
    openIntelSheet({ theater: "all", tab: "news" });
  };

  useEffect(() => {
    if (!initialViewConfig?.ui.openLayerPanel || isCompactUi) return;
    const timer = window.setTimeout(() => {
      setLeftPanelTab("layers");
      setShowLeftPanel(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialViewConfig?.ui.openLayerPanel, isCompactUi]);

  /**
   * 뷰 모드·장면 미션·도메인 선택 핸들러 묶음.
   * useModeSceneHandlers 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useModeSceneHandlers.ts
   */
  const {
    handleModeApply,
    handleCustomLayerApply,
    handleViewerModeChange,
    confirmPurposeJob,
    handleObserveUnlock,
    handleObservePaywallDismiss,
    openModePickerManual,
    openSceneMissionPicker,
    returnToEntryOrbit,
    applySceneMission,
    handleDomainSelect,
    handleModePickerCancel,
    maybeOfferAirRaidCoach,
  } = useModeSceneHandlers({
    initialViewConfig,
    introPlayedRef,
    packageTheaterFocusPlayedRef,
    packageEconFocusPlayedRef,
    size,
    setShowLeftPanel,
    setLeftPanelTab,
    setIntelSheetOpen,
    setIntelTheaterFilter,
    viewUi,
    setViewUi,
    viewTheater,
    setViewTheater,
    viewEconomyHub,
    setViewEconomyHub,
    setViewPackages,
    viewerMode,
    setViewerMode,
    isEconomyViewer,
    isCompactUi,
    layerPrefsLiveRef,
    showModePicker,
    setShowModePicker,
    setModePickerLockMode,
    setModePickerInitialMode,
    entryGate,
    setEntryGate,
    langChoiceDone,
    purposeJobDone,
    setPurposeJobDone,
    setPurposeJobForced,
    observeUnlocked,
    setObserveUnlocked,
    startObservePreview,
    endObservePreview,
    domainThenDetailTimerRef,
    chromeCoachStep,
    showFirstVisitTour,
    showAirRaidCoach,
    setShowAirRaidCoach,
    hotTheaterOffer,
    setShowSceneMissionPicker,
    setSceneMissionActive,
    quietOverviewAppliedRef,
    pendingQuietOverviewRef,
    setHubBriefOpen,
    setFrictionEpisodeBrief,
    battlefieldSoftZoneRef,
    battlefieldManualUntilRef,
    unpinUserLayers,
    setShowViewerIntro,
    setAskLayersOpen,
    setShowQuickStart,
    setShowDisputeLegendPanel,
    setSelected,
    isLoading,
    globeReady,
    setShowIntroHint,
    loadError,
    setGdeltEvents,
    setGdeltError,
    setGdeltFetchedAt,
    setTelegramAlerts,
    setDeskFocus,
    setTelegramLive,
    setTelegramStatus,
    ukraineZoomPendingRef,
    neptunZoomPendingRef,
    suppressAutoRegionZoomRef,
    ultraLiteRef,
    setUltraLite,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    setPeriodicBriefing,
    setFoldedPeriodicBriefing,
    setDailyLampSettled,
    lampModeSwitchPendingRef,
    issueUiPausedForLamp,
    prepareLampForModeSwitch,
    clearBreakingFlash,
    hasPendingScene,
    showUkraineControl,
    setRegionNavSelection,
    setUkraineFrontLegendEngaged,
    setEconNavSelection,
    setEconNewsPanelReveal,
    setRegimeSelectedEpisodeId,
    historyStoryLockedRef,
    layerCenterRef,
    layerAltitudeRef,
    layerLodTierRef,
    setFilterCenter,
    setLayerAltitude,
    flyTo,
    pendingObserveFlyRef,
    flushPendingCesiumFly,
    clearHubBriefTimer,
    clearFrictionEpisodeTimer,
    clearRegionNavSelection,
    clearEconInsightTimer,
    closeEconInsight,
    dismissLayerPanel,
    firstImpression,
  });

  /**
   * 세션 시작 자동 제안·핫시어터·텐션 스파이크 이펙트 묶음.
   * useSessionOfferEffects 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useSessionOfferEffects.ts
   */
  const {
    acceptHotTheaterOffer,
    dismissHotTheaterOffer,
    tensionSpike,
    dismissTensionSpike,
    onTensionSpikeJump,
  } = useSessionOfferEffects({
    intelSheetOpen,
    viewTheater,
    viewEconomyHub,
    viewerMode,
    isEconomyViewer,
    isConflictViewer,
    layerPrefsLiveRef,
    showModePicker,
    entryGate,
    langChoiceDone,
    langChoiceChecked,
    purposeJobDone,
    purposeJobChecked,
    purposeJobForced,
    showFirstVisitTour,
    setShowAirRaidCoach,
    setNewsPerspectives,
    setWatchFocusLine,
    livePrefsBeforeHistoryRef,
    showTourInvite,
    setShowTourInvite,
    hotTheaterOffer,
    setHotTheaterOffer,
    airRaidBriefing,
    hubBriefOpen,
    econInsightOpen,
    frictionEpisodeBrief,
    calendarDayKey,
    battlefieldSoftZoneRef,
    battlefieldManualUntilRef,
    sentinelActive,
    setSentinelActive,
    setSentinelTour,
    setSentinelIndex,
    isLoading,
    globeReady,
    loadError,
    exerciseBriefing,
    patchLayerPrefsSoft,
    dailyLampSettled,
    weeklyRecap,
    weeklyRecapSettled,
    periodicBriefing,
    weeklyExpanded,
    issueUiPausedForLamp,
    isHistoricalView,
    labelLanguage,
    regionNavSelection,
    econNavSelection,
    layerLodTierRef,
    viewState,
    flyTo,
    flyToBounds,
    layerViewState,
    polygonData,
    rawTensionHeatmaps,
    rawGlobePaths,
    globeLabels,
    clearAirRaidOffer,
  });

  /**
   * 레이어 질문 적용·뉴스 인사이트 지도 적용·네비게이션 핸들러 묶음.
   * useNewsInsightActions 훅으로 추출 (분리 Phase D).
   * src/components/globe/hooks/useNewsInsightActions.ts
   */
  const {
    handleAskLayersApply,
    handleOpenNewsInsight,
    handleNewsInsightApplyMap,
    handleNavNavigate,
  } = useNewsInsightActions({
    showLeftPanel,
    layerDropdownOpen,
    layerPanelDirty,
    setIntelSheetOpen,
    isEconomyViewer,
    layerPrefsLiveRef,
    showModePicker,
    entryGate,
    setNewsPerspectives,
    setNewsInsightCallout,
    battlefieldSoftZoneRef,
    battlefieldManualUntilRef,
    userLayerPinRef,
    pinUserLayers,
    selected,
    setSelected,
    ultraLiteRef,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    setEconNavSelection,
    setEconNewsPanelReveal,
    historyStoryLockedRef,
    filterCenter,
    flyTo,
    interruptFlySnap,
    layerViewState,
    dismissLayerPanel,
    enterTheaterFocus,
    enterEconomyRegionFocus,
  });

  function handleRegionEventSelect(event: ScoredEvent) {
    flyTo(event.lat, event.lng, 0.72);
    openSelection({ kind: "event", item: event });
  }

  const handleNeptunThreatSelect = useCallback(
    (threat: NeptunLiveThreat) => {
      dismissLayerPanel(true);
      clearRegionNavSelection();
      setIntelSheetOpen(false);
      if (isConflictViewer) {
        setUkraineFrontLegendEngaged(true);
        if (!showUkraineControl) togglePref("showUkraineControl", true);
        if (!showNeptun) togglePref("showNeptun", true);
      }
      if (threat.type === "ballistic" || threat.type === "mig31k") {
        emitLayerClickSounds(
          [{ eventId: "ballistic-travel", volumeScale: 0.9, durationMs: 5200 }],
          { altitude: layerAltitude },
        );
      } else if (threat.type === "uav" || threat.type === "recon") {
        emitLayerClickSounds(
          [{ eventId: "neptun-uav-flyby", volumeScale: 0.85, durationMs: 4000 }],
          { altitude: layerAltitude },
        );
      }
      requestAnimationFrame(() => {
    flyTo(threat.predictedLat, threat.predictedLon, 0.58);
        setSelected({ kind: "neptun-threat", item: threat });
      });
    },
    [clearRegionNavSelection, dismissLayerPanel, flyTo, isEconomyViewer, layerAltitude, showNeptun, showUkraineControl, togglePref],
  );

  function handleAlertSelect(alert: DisputeAlert) {
    clearRegionNavSelection();
    setIntelSheetOpen(false);
    if (isConflictViewer) setShowDisputeLegendPanel(true);
    flyTo(alert.center.lat, alert.center.lng, 0.88);
    openSelection({ kind: "dispute", item: alert });
  }

  function handleGdeltAlertSelect(alert: MenuCoreAlert) {
    clearRegionNavSelection();
    setIntelSheetOpen(false);
    flyTo(alert.lat, alert.lng, 0.88);
    openSelection({ kind: "event", item: alert });
  }

  /**
   * 지도·글로브 클릭/호버 핸들러 (openSelection · 공습 포커스 · 선택/호버 · point/path/polygon/globe 클릭) —
   * useMapInteractionHandlers 훅으로 추출 (분리 Phase C).
   * src/components/globe/hooks/useMapInteractionHandlers.ts
   */
  const {
    openSelection,
    handleAirRaidFocus,
    handleGevContactSelect,
    handleMilAircraftSelect,
    handleCivAircraftSelect,
    handleAisSymbolSelect,
    handleAisSymbolHover,
    createHtmlOverlayElement,
    handleGlobePointClick,
    handlePathClick,
    handlePolygonClick,
    handleGlobeClick,
  } = useMapInteractionHandlers({
    layerAltitudeRef,
    layerAltitude,
    labelLanguage,
    isEconomyViewer,
    isConflictViewer,
    showLogisticsStress,
    chokeGlowColorById,
    usCarrierLabelOffsets,
    displayMilitaryExercises,
    combinedShipMovesMap,
    activeFrictionEpisode,
    activeTerritorialEpisode,
    skipNextGlobeClickRef,
    layerPrefsLiveRef,
    historyImmersionRef,
    airRaidFocusClearRef,
    lastGlobeClickAt,
    aisVessels,
    milAircraft,
    civAircraft,
    ukmtoIncidents,
    navareaFeatures,
    handleHtmlMarkerHover,
    openIntelFromCoords,
    flyTo,
    handleNeptunThreatSelect,
    selectFrictionStage,
    selectTerritorialStage,
    clearRegionNavSelection,
    closeEconInsight,
    dismissLayerPanel,
    openCriticalNodeInsight,
    openUkmtoBrief,
    openNavareaBrief,
    disputeFromPath,
    setAirRaidFocusBox,
    setAirRaidFocusPaths,
    setHubBriefOpen,
    setFrictionEpisodeBrief,
    setLivingTaiwanOpen,
    setHoveredPoint,
    setHoveredCarrier,
    setHoveredMilAircraft,
    setHoveredNeptunThreat,
    setHoveredPolygon,
    setHoveredPath,
    setSelected,
    setSelectedAxisLink,
    setSelectedCorridor,
    setArmsHighlightPair,
    setEconNavSelection,
    setEconNewsPanelReveal,
    setIntelSheetOpen,
    setNewsPerspectives,
    setEconomyAttackReaction,
    setExerciseBriefing,
    setShipMovesSelectedId,
    setShipMovesFocusGroupKey,
  });

  /**
   * 이스라엘·이란 신규 공습 자동 ON·배너 — useAirRaidAutoLayer 훅으로 추출 (분리 3단계).
   * src/components/globe/hooks/useAirRaidAutoLayer.ts
   */
  handleAirRaidFocusRef.current = handleAirRaidFocus;

  function handleSearchSelect(hit: ChromeSearchHit) {
    if (hit.kind === "news") {
      const article = hit.article;
      // 앱 안 인사이트 — 원문은 패널의 「원문 보기」로만
      handleOpenNewsInsight(article);
      const pinned = resolveNewsCoords(article);
      const theaterFly = THEATER_FLY_TO[article.theater];
      const lat = pinned?.lat ?? theaterFly?.lat;
      const lng = pinned?.lng ?? theaterFly?.lng;
      const altitude = pinned ? 0.95 : (theaterFly?.altitude ?? 1.4);
      if (lat != null && lng != null) {
        interruptFlySnap();
        flyTo(lat, lng, altitude);
        setNewsInsightCallout({
          markerId: `news-insight-callout-search-${article.id}`,
          displayKind: "news-insight-callout",
          id: article.id,
          lat,
          lng,
          title: article.title,
          link: article.link,
          article,
        });
      }
      return;
    }

    const place = hit.place;
    setQuery(place.name);
    flyTo(place.lat, place.lng, place.type === "city" ? 0.88 : 1.1);

    if (place.type === "dispute") {
      const dispute = (data.disputes ?? []).find((area) => `search-${area.id}` === place.id);
      if (dispute) {
        const center = resolveDisputeCenter(dispute);
        openIntelFromCoords(center.lat, center.lng, 0.88);
      }
    }

    if (place.type === "country") {
      const country = data.countries.find((item) => `country-${item.id}` === place.id);
      if (country) openSelection({ kind: "country", item: country });
    }
  }

  const historyPolityLayers = useHistoryPolityLayers({
    enabled: isHistoryViewer && !isSatelliteViewer && !isPhoneUi,
    year: historyYear,
  });

  const mapGlobeProps = useGlobeMapGlobeProps({
    showLeftPanel,
    globeTextures,
    basemapMode,
    ultraLite,
    mapInteractiveLayerIds,
    showIslandChains,
    configureGlobe,
    handleGlobeMouseMove,
    tensionHeatmaps,
    isCameraMoving,
    globeDisplayPoints,
    firmsDisplayPoints,
    viewState,
    basemapTone,
    firmsCombatFireIds,
    labelLanguage,
    setHoveredPoint,
    handleGlobePointClick,
    conflictClusterRings,
    htmlOverlayMarkers,
    createHtmlOverlayElement,
    aircraftSymbols,
    handleMilAircraftSelect,
    handleCivAircraftSelect,
    setHoveredMilAircraft,
    aisDisplayPoints,
    aisSymbolSelectedMmsi: aisTrackMmsi,
    handleAisSymbolSelect,
    handleAisSymbolHover,
    safecastGaugesGeoJson,
    isViinaCloseZoom,
    showUkraineControl,
    layerAltitudeRef,
    globeLabels,
    showCityLabels,
    polygonDataWithUkraine,
    hubHighlightIsos,
    activeHubId,
    gpsJamDate,
    handlePolygonClick,
    isCompactUi,
    setHoveredPolygon,
    globePaths,
    airRaidFocusPaths,
    airRaidFocusBox,
    ukraineMacroGeoJson,
    ukraineMicroGeoJson,
    historyCliopatriaGeoJson: historyPolityLayers.cliopatriaGeoJson,
    historyKoreaGeoJson: historyPolityLayers.koreaGeoJson,
    historyLabelGeoJson: historyPolityLayers.labelGeoJson,
    historyTerritoryActive: isHistoryViewer && !isSatelliteViewer && !isPhoneUi,
    axisHubCountriesGeoJson,
    axisSatelliteCountriesGeoJson,
    alliedBlocCountriesGeoJson,
    geoEconBlocCountriesGeoJson,
    neptunPathElevation,
    tonedPathColors,
    tonedInfraColors,
    tonedArmsEmbargoStroke,
    showRailGlow,
    globeLod,
    disputeOverviews,
    disputeFromPath,
    conflictZoneFromPath,
    handlePathClick,
    setHoveredPath,
    handleGlobeClick,
    selectedAxisPathId: selectedAxisLink?.pathId ?? null,
  });

  return (
    <LocaleProvider lang={labelLanguage}>
    <main
      className="relative flex h-screen w-screen flex-col overflow-hidden space-ambient text-slate-100"
      data-ui-lang={labelLanguage}
      data-viewer={viewerMode}
    >

      <SoundEffectsBridge
        viewerMode={viewerMode}
        neptunImpactInView={neptunImpactInView}
        firmsCombatInView={firmsCombatInView}
        conflictAmbient={soundConflictAmbient}
        economyAmbient={soundEconomyAmbient}
        reefWatchTrafficVisible={
          showReefWatch && reefWatchTrafficMarkers.length > 0
        }
        cameraAltitude={layerAltitude}
        globeLodTier={globeLod.tier}
        wtiScore={wtiSnapshot?.score ?? null}
      />

      {!isPhoneUi ? (
      <DashboardTopChrome
        intelSheetOpen={intelSheetOpen}
        entryGate={entryGate}
        showModePicker={showModePicker || showSceneMissionPicker || showPurposeJobGate}
        viewerMode={viewerMode}
        labelLanguage={labelLanguage}
        handleNavNavigate={handleNavNavigate}
        liveUpdatedAt={liveUpdatedAt}
        dataGeneratedAt={data.generatedAt}
        liveStatus={liveStatus}
        query={query}
        setQuery={setQuery}
        searchResults={searchResults}
        searchKeywordSuggestions={searchKeywordSuggestions}
        handleSearchSelect={handleSearchSelect}
        isCompactUi={isCompactUi}
        isTabletUi={isTabletUi}
        setAskLayersOpen={setAskLayersOpen}
        handleViewerModeChange={handleViewerModeChange}
        globeRef={globeRef}
        getSceneForShare={getSceneForShareResolved}
        captureFrameOverride={captureFrameResolved}
        recordClip={isSatelliteViewer ? handleRecordClip : undefined}
        recordClipBusy={recordClipBusy}
        setChromeCoachStep={setChromeCoachStep}
        setShowFeatureGuide={setShowFeatureGuide}
        onSceneStart={openSceneMissionPicker}
        onOpenSources={() => setShowSourcesPanel(true)}
        onOpenPurposeJob={() => setPurposeJobForced(true)}
        onOpenLayers={
          isSatelliteViewer ? undefined : () => openLeftDrawer("layers")
        }
        onOpenSettings={() => openLeftDrawer("settings")}
        onOpenData={() => openLeftDrawer("data")}
        onOpenControlsGuide={() => setShowControlsGuide(true)}
        wtiScore={wtiSnapshot?.score ?? null}
        wtiDelta={wtiSnapshot?.deltaScore ?? null}
        wtiAsOf={wtiFetchedAt}
        wtiIsEstimate={
          wtiSnapshot?.method === "theater-blend" ||
          wtiSnapshot?.method === "estimate"
            ? true
            : false
        }
        showSesChip={showSesChip}
        showGscpi={showGscpiGauge}
        macroBriefingOpen={macroBriefingOpen}
        observeUnlocked={observeUnlocked}
        onToggleMacroBriefing={() => {
          if (viewerMode === "history" || viewerMode === "satellite") return;
          if (macroBriefingOpen) {
            setMacroBriefingOpen(false);
            setMacroBriefingFolded(false);
            return;
          }
          setMacroBriefingFolded(false);
          setMacroBriefingOpen(true);
        }}
      />
      ) : null}

      {!intelSheetOpen &&
      entryGate === null &&
      !showModePicker &&
      !periodicBriefing &&
      !weeklyExpanded &&
      (macroBriefingOpen || macroBriefingFolded) ? (
        <MacroBriefingPanel
          open={macroBriefingOpen}
          folded={macroBriefingFolded && !macroBriefingOpen}
          domain={macroBriefingDomain}
          lang={labelLanguage}
          payload={macroBriefingPayload}
          loading={macroBriefingLoading}
          error={macroBriefingError}
          onClose={() => {
            setMacroBriefingOpen(false);
            setMacroBriefingFolded(false);
          }}
          onFold={() => {
            setMacroBriefingOpen(false);
            setMacroBriefingFolded(true);
          }}
          onUnfold={() => {
            setMacroBriefingFolded(false);
            setMacroBriefingOpen(true);
          }}
          onDomainChange={setMacroBriefingDomain}
          onStepActivate={handleMacroStepActivate}
        />
      ) : null}

      {showSceneMissionPicker ? (
        <SceneMissionPicker
          lang={labelLanguage}
          hotFocus={hotTheaterOffer}
          onSelect={applySceneMission}
          onDismiss={() => setShowSceneMissionPicker(false)}
        />
      ) : null}

      {sceneMissionActive &&
      entryGate === null &&
      !showModePicker &&
      !showSceneMissionPicker &&
      !intelSheetOpen ? (
        <ReturnToGlobeChip lang={labelLanguage} onClick={returnToEntryOrbit} />
      ) : null}

      {deepDiveSession && deepDiveRings.length > 0 ? (
        <DeepDiveRingPanel
          rings={deepDiveRings}
          activeRingId={deepDiveSession.activeRingId}
          onSelect={selectDeepDiveRing}
          lang={labelLanguage}
        />
      ) : null}

      <GeopoliticsHubChrome
        activeHubId={activeHubId}
        hubFocusMode={hubFocusMode}
        axisArmsPayload={axisArmsPayload}
        hubBriefOpen={hubBriefOpen}
        labelLanguage={labelLanguage}
        onArmsClose={() => {
          clearHubBriefTimer();
          setHubBriefOpen(false);
          clearRegionNavSelection();
        }}
        regimeSelectedEpisodeId={regimeSelectedEpisodeId}
        onRegimeSelectEpisode={(episode) => {
          clearFrictionEpisodeTimer();
          setRegimeSelectedEpisodeId(episode.id);
          setFrictionEpisodeBrief(null);
          flyTo(
            episodeLat(episode),
            episodeLng(episode),
            altitudeFromEpisodeZoom(episode.zoom),
            1100,
            { pitch: episode.pitch, bearing: episode.bearing },
          );
          const deep = frictionDeepDoc(episode.id);
          setFrictionActiveStageId(deep?.stages[0]?.id ?? null);
          frictionEpisodeTimerRef.current = setTimeout(() => {
            frictionEpisodeTimerRef.current = null;
            setFrictionEpisodeBrief(episode);
          }, 750);
        }}
        onExitHistoryImmersion={exitHistoryImmersion}
        historyImmersionActive={historyImmersionActive}
        activeFrictionEpisode={activeFrictionEpisode}
        frictionActiveStageId={frictionActiveStageId}
        onSelectFrictionStage={selectFrictionStage}
        onOpenFrictionBrief={() => setFrictionEpisodeBrief(activeFrictionEpisode)}
        onBackToFrictionList={() => {
          setFrictionEpisodeBrief(null);
          setRegimeSelectedEpisodeId(null);
          setFrictionActiveStageId(null);
        }}
        activeTerritorialEpisode={activeTerritorialEpisode}
        territorialActiveStageId={territorialActiveStageId}
        territorialRevealedStageIds={territorialRevealedStageIds}
        onSelectTerritorialStage={selectTerritorialStage}
        onOpenTerritorialBrief={() => {
          if (activeTerritorialEpisode) setTerritorialEpisodeBrief(activeTerritorialEpisode);
        }}
        onBackToTerritorialList={() => {
          clearTerritorialSequence();
          setTerritorialEpisodeBrief(null);
          setDisputeEpisodeSelectedId(null);
          setTerritorialActiveStageId(null);
          setTerritorialRevealedStageIds([]);
        }}
        isEconomyViewer={isEconomyViewer}
        livingTaiwanOpen={livingTaiwanOpen}
        onLivingTaiwanClose={() => setLivingTaiwanOpen(false)}
        onLivingTaiwanFlyToMap={(lat, lng, altitude) => {
          if (!showWarZones) togglePref("showWarZones", true);
          if (!showChinaTaiwanIncidents) togglePref("showChinaTaiwanIncidents", true);
          flyTo(lat, lng, altitude);
        }}
        disputesOverviewOpen={disputesOverviewActive}
        disputeHotspots={disputeHotspots}
        disputeHotspotSelectedId={disputeHotspotSelectedId}
        disputeEpisodeSelectedId={disputeEpisodeSelectedId}
        disputeFrictionSelectedId={regimeSelectedEpisodeId}
        onSelectDisputeHotspot={(hotspot) => {
          setDisputeHotspotSelectedId(hotspot.id);
          flyTo(hotspot.center.lat, hotspot.center.lng, 0.95, 1400, { pitch: 45 });
        }}
        onSelectDisputeEpisode={(episode) => {
          beginTerritorialEpisode(episode);
        }}
        onSelectDisputeFriction={(episode) => {
          clearTerritorialSequence();
          setDisputeEpisodeSelectedId(null);
          setTerritorialEpisodeBrief(null);
          setTerritorialActiveStageId(null);
          setTerritorialRevealedStageIds([]);
          clearFrictionEpisodeTimer();
          setRegimeSelectedEpisodeId(episode.id);
          setFrictionEpisodeBrief(null);
          flyTo(
            episodeLat(episode),
            episodeLng(episode),
            altitudeFromEpisodeZoom(episode.zoom),
            1100,
            { pitch: episode.pitch, bearing: episode.bearing },
          );
          const deep = frictionDeepDoc(episode.id);
          setFrictionActiveStageId(deep?.stages[0]?.id ?? null);
          frictionEpisodeTimerRef.current = setTimeout(() => {
            frictionEpisodeTimerRef.current = null;
            setFrictionEpisodeBrief(episode);
          }, 750);
        }}
        onDisputesOverviewClose={exitHistoryImmersion}
        selectedAxisLink={selectedAxisLink}
        onAxisLinkDismiss={dismissAxisLink}
        onAxisLinkHubBrief={axisLinkOpenHub}
        onAxisLinkArms={axisLinkOpenArms}
        onAxisLinkNews={axisLinkOpenNews}
        onAxisLinkHighlightArms={axisLinkHighlightArms}
        selectedCorridor={selectedCorridor}
        onCorridorDismiss={dismissCorridor}
        armsHighlightPair={armsHighlightPair}
      />

      <NewsStreamProvider
        visible={
          !showLeftPanel &&
          (isEconomyViewer
            ? intelSheetOpen ||
              econNavSelection != null ||
              (!selected && !isUkraineTheaterFocus)
            : true)
        }
        theaterFilter={intelTheaterFilter}
        onTheaterFilterChange={setIntelTheaterFilter}
        viewPackages={viewPackages}
        labelLanguage={labelLanguage}
        onPayloadChange={setNewsStreamPayload}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {isPhoneUi ? (
            <MobileHomeView
              viewerMode={viewerMode}
              onViewerModeChange={handleViewerModeChange}
              labelLanguage={labelLanguage}
              onLabelLanguageChange={setLabelLanguage}
            />
          ) : null}
      <section
        ref={mapSectionRef}
        id="map-globe-section"
        className="relative min-h-0 flex-1 w-full"
        onMouseMove={handleMapPointerMove}
        onMouseLeave={handleMapPointerLeave}
      >
        <GlobeMapCanvas
          containerRef={containerRef}
          globeRef={globeRef}
          isPhoneUi={isPhoneUi}
          isCompactUi={isCompactUi}
          loadError={loadError}
          containerBackgroundColor={globeTextures.backgroundColor}
          satelliteMode={isSatelliteViewer}
          aisVessels={aisVessels}
          disguisedVessels={disguisedVessels}
          milAircraft={milAircraft}
          civAircraft={civAircraft}
          showAis={showAis || isSatelliteViewer}
          showAisMilitary={showAisMilitary}
          showAisCommercial={showAisCommercial}
          showDisguisedVessels={showDisguisedVessels || isSatelliteViewer}
          showMilitaryActivity={showMilitaryActivity}
          showAirTraffic={showAirTraffic}
          showNeptun={showNeptun}
          neptunThreats={visibleNeptunThreats}
          cesiumRef={cesiumGlobeRef}
          onCesiumReady={() => setCesiumReady(true)}
          onCesiumCameraIdle={handleCesiumCameraIdle}
          onSelectCesiumEntity={handleSelectCesiumEntity}
          onCesiumUserBreakFollow={() => setGevFollowCamera(false)}
          alertPins={cesiumAlerts}
          cameraCeilingM={
            isSatelliteViewer && !isPhoneUi && incidentSpace
              ? incidentSpace.ceilingAltitude * 6_371_000
              : null
          }
          onSelectCesiumAlert={openCesiumAlert}
          ukmtoIncidents={isSatelliteViewer ? ukmtoIncidents : undefined}
          navareaFeatures={isSatelliteViewer ? navareaFeatures : undefined}
          chokeRings={cesiumChokeRings}
          straitOverlaySegments={
            isSatelliteViewer ? straitOverlaySegments : undefined
          }
          straitLabels={isSatelliteViewer ? straitLabels : undefined}
          straitPorts={isSatelliteViewer ? straitPorts : undefined}
          liveuaPins={liveuaPins}
          focusedLiveuaId={isSatelliteViewer ? focusedLiveuaId : null}
          deskFocus={isSatelliteViewer ? deskFocus : null}
          liveuaStrikes={isSatelliteViewer ? liveuaStrikes : []}
          liveuaGround={isSatelliteViewer ? liveuaGround : []}
          onPickGroundPoint={
            isSatelliteViewer && incidentPickActive
              ? (point) => {
                  setPickedIncidentPoint((prev) => ({
                    ...point,
                    seq: (prev?.seq ?? 0) + 1,
                  }));
                  setIncidentPickActive(false);
                }
              : undefined
          }
          onSelectLiveuaPin={(id) => {
            // 양피지는 유가·가스·초크만 — 그 외는 포커스 카드
            const energyIdx = liveuaEnergyEvents.findIndex((e) => e.id === id);
            if (energyIdx >= 0) {
              setFocusedLiveuaId(null);
              setLiveuaParchmentIndex(energyIdx);
              return;
            }
            if (liveuaEvents.some((e) => e.id === id)) {
              setLiveuaParchmentIndex(null);
              setFocusedLiveuaId(id);
            }
          }}
          controlGeoJson={
            isSatelliteViewer && showUkraineControl ? liveuaControlGeoJson : null
          }
          firmsFires={cesiumFirmsFires}
          showFirmsFires={showFirmsFires}
          missileLaunches={cesiumMissileLaunches}
          showMissileLaunches={showNorthKoreaMissileTests}
          neptunAlerts={neptunAlerts}
          showAirRaidZones={showNeptun || neptunAlertCount > 0}
          placeLabels={isSatelliteViewer ? labelPlaces : undefined}
          placeLabelLang={labelLanguage}
          showPlaceLabels={isSatelliteViewer && showCityLabels}
          conflictEvents={
            isSatelliteViewer
              ? conflictEventMarkers.filter((m) => m.displayGrade !== "drop")
              : undefined
          }
          showConflictEvents={isSatelliteViewer && showConflictEvents}
          onSelectConflictEvent={(ev) => {
            if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lng)) return;
            void unifiedFlyTo(
              ev.lat,
              ev.lng,
              0.12,
              LOCATION_LOOK_DOWN.durationMs,
              {
                pitch: LOCATION_LOOK_DOWN.pitch,
                bearing: LOCATION_LOOK_DOWN.bearing,
                lookAt: LOCATION_LOOK_DOWN.lookAt,
              },
              { descend: true },
            );
          }}
          {...mapGlobeProps}
        />

        {!isPhoneUi && incidentSpace ? (
          <>
            {/* LiveUA 위치: GEV식 망원 원형 시야 / 그 외: 기존 인셋 비네팅 */}
            {incidentSpace.kicker.includes("Liveuamap") ||
            incidentSpace.kicker.includes("LiveUA") ? (
              <ObserveScopeMask active />
            ) : (
              <div
                className={`pointer-events-none absolute inset-0 ${zc("mapChrome")} shadow-[inset_0_0_90px_rgba(0,0,0,0.62)] ring-1 ring-inset ring-white/20`}
                aria-hidden
              />
            )}
            <div
              className={`pointer-events-auto absolute left-1/2 top-3 ${zc("immersive")} flex max-w-[min(28rem,92vw)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-[#0b0d12]/92 py-1.5 pl-4 pr-1.5 shadow-2xl backdrop-blur-md font-sans`}
            >
              <div className="min-w-0">
                <p className="text-micro uppercase tracking-[0.18em] text-amber-200/80">
                  {incidentSpace.kicker}
                </p>
                <p className="truncate text-meta text-white/90">{incidentSpace.title}</p>
                <p className="text-micro text-white/45">
                  {t("breakingFlashSpaceHint", labelLanguage)}
                </p>
              </div>
              <button
                type="button"
                onClick={leaveIncidentSpace}
                className="tap-target shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-meta font-semibold text-white hover:bg-white/20"
              >
                {t("breakingFlashSpaceExit", labelLanguage)}
              </button>
            </div>
          </>
        ) : null}

        {!isPhoneUi && !incidentSpace && (hubFocusMode === "regime" || hubFocusMode === "disputes") ? (
          <>
            <div
              className={`pointer-events-none absolute inset-0 ${zc("mapChrome")} shadow-[inset_0_0_90px_rgba(0,0,0,0.62)] ring-1 ring-inset ${
                hubFocusMode === "regime" ? "ring-violet-300/75" : "ring-rose-300/75"
              }`}
              aria-hidden
            />
            <div
              className={`pointer-events-auto absolute left-1/2 top-3 ${zc("immersive")} flex max-w-[min(28rem,92vw)] -translate-x-1/2 items-center gap-3 rounded-full border bg-[#0b0d12]/92 py-1.5 pl-4 pr-1.5 shadow-2xl backdrop-blur-md ${
                hubFocusMode === "regime" ? "border-violet-300/45" : "border-rose-300/45"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`text-micro uppercase tracking-[0.18em] ${
                    hubFocusMode === "regime" ? "text-violet-200/85" : "text-rose-200/85"
                  }`}
                >
                  {hubFocusMode === "regime"
                    ? t("historyWindowKicker", labelLanguage)
                    : t("territorialWindowKicker", labelLanguage)}
                </p>
                <p className="truncate text-meta text-white/90">
                  {hubFocusMode === "regime"
                    ? (activeFrictionEpisode?.title ?? t("historyWindowTitle", labelLanguage))
                    : (labelLanguage === "en"
                        ? territorialEpisodeBrief?.titleEn
                        : territorialEpisodeBrief?.title) ||
                      activeFrictionEpisode?.title ||
                      t("territorialWindowTitle", labelLanguage)}
                </p>
                <p className="text-micro text-white/45">
                  {t("breakingFlashSpaceHint", labelLanguage)}
                </p>
              </div>
              <button
                type="button"
                onClick={exitHistoryImmersion}
                className={`tap-target shrink-0 rounded-full border px-3 py-2 text-meta font-semibold text-white ${
                  hubFocusMode === "regime"
                    ? "border-violet-200/40 bg-violet-400/15 hover:bg-violet-400/25"
                    : "border-rose-200/40 bg-rose-400/15 hover:bg-rose-400/25"
                }`}
              >
                {t("breakingFlashSpaceExit", labelLanguage)}
              </button>
            </div>
          </>
        ) : null}

        {/* 지구본·Cesium 공통 출처 크레딧 */}
        {!isPhoneUi ? (
          <MapAttributionBar
            lang={labelLanguage}
            layerPrefs={layerPrefs}
            basemapMode={basemapMode}
            extraCredits={[
              ...(isSatelliteViewer
                ? [
                    { label: "Cesium Ion", url: "https://cesium.com/ion/" },
                    { label: "Liveuamap", url: "https://liveuamap.com/" },
                    {
                      label: "NASA GIBS aerosol",
                      url: "https://earthdata.nasa.gov/gibs",
                    },
                    ...(showFirmsFires
                      ? [
                          {
                            label: "NASA FIRMS",
                            url: "https://firms.modaps.eosdis.nasa.gov/",
                          },
                        ]
                      : []),
                  ]
                : []),
              ...(showNorthKoreaMissileTests
                ? [
                    { label: "KCNA", url: "http://www.kcna.kp/" },
                    { label: "Daily NK", url: "https://www.dailynk.com/" },
                    { label: "Yonhap", url: "https://en.yna.co.kr/" },
                  ]
                : []),
            ]}
            onOpenSources={() => setShowSourcesPanel(true)}
            onOpenParchment={() => setShowDataSourceParchment(true)}
            onOpenTrust={() => setShowTrustPanel(true)}
          />
        ) : null}

        {isHistoryViewer && !isPhoneUi && !isSatelliteViewer ? (
          <div
            className="pointer-events-auto absolute bottom-16 left-1/2 z-[100] flex w-[min(420px,92vw)] -translate-x-1/2 flex-col gap-1 rounded-md border border-stone-600/50 bg-stone-950/85 px-3 py-2 shadow-lg backdrop-blur-sm"
            role="group"
            aria-label="역사 연도"
          >
            <div className="flex items-baseline justify-between gap-2 text-meta text-stone-200">
              <span className="font-medium tracking-wide">역사 영토</span>
              <span className="tabular-nums text-amber-200/90">
                {historyPolityLayers.snapYear < 0
                  ? `BCE ${Math.abs(historyPolityLayers.snapYear)}`
                  : `CE ${historyPolityLayers.snapYear}`}
                {historyPolityLayers.loading ? " · …" : ""}
              </span>
            </div>
            <input
              type="range"
              min={historyPolityLayers.years[0] ?? -3000}
              max={
                historyPolityLayers.years[
                  historyPolityLayers.years.length - 1
                ] ?? 2024
              }
              step={1}
              value={historyYear}
              onChange={(e) => setHistoryYear(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <p className="text-micro leading-snug text-stone-400">
              한국사 GeoJSON 조사안 우선 · 발해 전성기(≈850)는 요동·연해주 중부 해안(교과서형)
            </p>
          </div>
        ) : null}

        {isSatelliteViewer && !isPhoneUi ? (
          <div
            className="pointer-events-auto cv-observe-dock flex w-[min(520px,94vw)] flex-col gap-1.5"
            role="region"
            aria-label={
              labelLanguage === "en" ? "Observatory desk" : "관측대"
            }
          >
            <NkMissileHistoryDock
              lang={labelLanguage === "en" ? "en" : "ko"}
            />
            <ObserveSensorChips
              lang={labelLanguage}
              tracksOn={
                showAis ||
                showAirTraffic ||
                showMilitaryActivity ||
                showDisguisedVessels
              }
              frontlineOn={showUkraineControl}
              hazardsOn={showFirmsFires || showNorthKoreaMissileTests}
              neptunOn={showNeptun}
              eventsOn={showConflictEvents}
              onToggle={(id, next) => {
                if (id === "tracks") {
                  togglePref("showAis", next);
                  togglePref("showAirTraffic", next);
                  togglePref("showMilitaryActivity", next);
                  togglePref("showDisguisedVessels", next);
                  return;
                }
                if (id === "frontline") {
                  setShowUkraineControl(next);
                  return;
                }
                if (id === "hazards") {
                  setShowFirmsFires(next);
                  setShowNorthKoreaMissileTests(next);
                  return;
                }
                if (id === "events") {
                  setShowConflictEvents(next);
                  return;
                }
                setShowNeptun(next);
              }}
            />
            <ObserveStraitTourChips
              lang={labelLanguage}
              activeId={straitTour.activeId}
              touring={straitTour.touring}
              onSelect={(id) => straitTour.goToStrait(id)}
              onToggleTour={() => {
                if (straitTour.touring) straitTour.pauseTour();
                else straitTour.resumeTour();
              }}
            />
            <StraitReplayHost lang={labelLanguage} cesiumRef={cesiumGlobeRef} />
            <ObserveLayerLegend
              lang={labelLanguage}
              tracksOn={
                showAis ||
                showAirTraffic ||
                showMilitaryActivity ||
                showDisguisedVessels
              }
              frontlineOn={showUkraineControl}
              hazardsOn={showFirmsFires || showNorthKoreaMissileTests}
              neptunOn={showNeptun}
              eventsOn={showConflictEvents}
            />
            <CesiumDayScrubber
              lang={labelLanguage}
              hourUtc={hourUtc}
              onChangeHour={(h) => {
                setPlaying(false);
                setHourUtc(h);
                cesiumGlobeRef.current?.setClockHourUtc(h);
              }}
              onResetLive={() => {
                setPlaying(false);
                const now = utcHourNow();
                setHourUtc(now);
                cesiumGlobeRef.current?.resetClockLive();
              }}
              playing={playing}
              onTogglePlay={() => {
                setPlaying((p) => {
                  const next = !p;
                  if (!next) {
                    cesiumGlobeRef.current?.setClockMultiplier(0);
                  }
                  return next;
                });
              }}
            />
          </div>
        ) : null}

        {isSatelliteViewer && !isPhoneUi ? (
          <ObserveDeskBookmarkRail
            lang={labelLanguage}
            unreadFlash={liveuaUnread}
            alertCount={cesiumAlerts.length}
            boardCount={observeWatchboardItems.filter((i) => i.grade !== "hold").length}
            hasVerify={Boolean(deskFocus)}
            autoOpenVerify={Boolean(deskFocus)}
            hasCase={activeCaseOpen}
            flash={
              <LiveuaFlashDock
                lang={labelLanguage}
                chrome="bare"
                events={liveuaEnergyEvents}
                unreadCount={liveuaUnread}
                readIds={liveuaReadIds}
                onMarkAllRead={markAllLiveuaRead}
                onOpen={(index) => {
                  if (theaterSitrepRegion) return;
                  setLiveuaParchmentIndex(index);
                }}
              />
            }
            board={
              <IntelWatchboard
                lang={labelLanguage}
                chrome="bare"
                items={observeWatchboardItems}
                promotingItemId={promotingItemId}
                onFocusItem={focusWatchboardItem}
                onOpenSitrep={(regionId) => {
                  const item = observeWatchboardItems.find(
                    (row) => row.sitrepRegion === regionId,
                  );
                  if (item && !canPublish("theater_sitrep", item.grade)) {
                    openIntelDrill(item.gate, item.pirStatuses);
                    return;
                  }
                  setTheaterSitrepRegion(regionId);
                }}
                onOpenAlert={(cesiumAlertId) => {
                  if (theaterSitrepRegion) return;
                  const item = cesiumAlerts.find((a) => a.id === cesiumAlertId);
                  if (item) openCesiumAlert(item);
                }}
                onDrill={(item) => openIntelDrill(item.gate, item.pirStatuses)}
                onOpenFullGuide={() => setShowFeatureGuide(true)}
              />
            }
            alerts={
              <CesiumAlertDock
                lang={labelLanguage}
                chrome="bare"
                items={cesiumAlerts}
                onOpen={(item) => {
                  if (theaterSitrepRegion) return;
                  openCesiumAlert(item);
                }}
              />
            }
            verify={
              deskFocus ? (
                <DeskVerifyHud
                  lang={labelLanguage}
                  focus={deskFocus}
                  onDismiss={() => setDeskFocus(null)}
                />
              ) : null
            }
            casePanel={
              <CaseFileDeskPanel
                lang={labelLanguage}
                chrome="bare"
                camera={{ lat: viewState.lat, lng: viewState.lng }}
                captureFrame={captureFrameResolved}
                onCaseChange={(id) => {
                  setActiveCaseOpen(Boolean(id));
                  if (!id) setIncidentPickActive(false);
                }}
                mapPickActive={incidentPickActive}
                onToggleMapPick={setIncidentPickActive}
                pickedPoint={pickedIncidentPoint}
              />
            }
          />
        ) : null}

        {isSatelliteViewer && isPhoneUi ? (
          <div
            className={`pointer-events-auto fixed left-3 ${zc("mapControl")}`}
            style={{ top: "calc(var(--hover-nav-height, 4.5rem) + 0.5rem)" }}
          >
            <NkMissileHistoryDock lang={labelLanguage === "en" ? "en" : "ko"} />
          </div>
        ) : null}

        {isSatelliteViewer && observePreview ? (
          <ObservePaywallOverlay
            lang={labelLanguage}
            phase={observePreview.phase}
            previewStartedAt={observePreview.startedAt}
            onUnlock={handleObserveUnlock}
            onDismiss={handleObservePaywallDismiss}
          />
        ) : null}

        {observeTracksNudge && !isSatelliteViewer ? (
          <div
            className={`pointer-events-auto fixed right-3 ${zc("toast")} max-w-[min(20rem,72vw)] rounded-sm border border-teal-500/40 bg-[#041018]/92 px-3 py-2 shadow-lg backdrop-blur-sm`}
            style={{
              top: "calc(var(--hover-nav-height, 4.5rem) + 0.5rem)",
            }}
            role="status"
            aria-live="polite"
          >
            <p className="text-meta text-teal-50">
              {t("observeTracksInObserveTab", labelLanguage)}
            </p>
            <button
              type="button"
              className="mt-1.5 text-micro font-semibold text-teal-200 underline underline-offset-2 hover:text-teal-50"
              onClick={() => {
                setObserveTracksNudge(false);
                handleViewerModeChange("satellite");
              }}
            >
              {t("observeTracksOpenCta", labelLanguage)}
            </button>
          </div>
        ) : null}

        {isSatelliteViewer && !theaterSitrepRegion ? (
          <LiveuaFlashToast
            lang={labelLanguage}
            event={liveuaToast}
            onDismiss={() => setLiveuaToast(null)}
          />
        ) : null}

        {isSatelliteViewer &&
        liveuaParchmentIndex != null &&
        !theaterSitrepRegion ? (
          <LiveuaFlashParchment
            lang={labelLanguage}
            events={liveuaEnergyEvents}
            index={liveuaParchmentIndex}
            onIndexChange={setLiveuaParchmentIndex}
            onDismiss={() => setLiveuaParchmentIndex(null)}
            exitToDock
            onGoToLocation={(ev) => {
              const market = liveuaFlashMarketContext(ev);
              if (market.suggestPipelines) {
                revealIncidentEnergyPipelines();
              }
              // 사건 → 해협 함선·물류 (킬러 4묶음 브릿지)
              if (market.chokepoint) {
                patchLayerPrefsSoft({
                  showAis: true,
                  showAisCommercial: true,
                  showLogisticsRisk: true,
                });
              }
              const title =
                labelLanguage === "ko" ? ev.titleKo?.trim() || ev.title : ev.title;
              // 양피지를 닫아야 세슘에서 Ctrl/Alt 카메라 조작이 가능
              setLiveuaParchmentIndex(null);
              setFocusedLiveuaId(ev.id);
              enterFocusedSpace({
                lat: ev.lat,
                lng: ev.lng,
                altitude: 0.3,
                pitch: LOCATION_LOOK_DOWN.pitch,
                title,
                kicker: labelLanguage === "en" ? "Liveuamap · location" : "Liveuamap · 위치",
              });
              // 직하 + lookAt: 사건 좌표를 화면 중앙에서 내려다봄 (대각선 CINEMATIC_FLY 아님)
              unifiedFlyTo(
                ev.lat,
                ev.lng,
                0.3,
                LOCATION_LOOK_DOWN.durationMs,
                {
                  pitch: LOCATION_LOOK_DOWN.pitch,
                  bearing: LOCATION_LOOK_DOWN.bearing,
                  lookAt: LOCATION_LOOK_DOWN.lookAt,
                },
                { descend: true },
              );
            }}
            onFocusChokepoint={(choke) => {
              patchLayerPrefsSoft({
                showLogisticsRisk: true,
                showAis: true,
                showAisCommercial: true,
              });
              setLiveuaParchmentIndex(null);
              unifiedFlyTo(choke.lat, choke.lng, 0.75);
            }}
            onFocusPipelines={(ev) => {
              revealIncidentEnergyPipelines();
              setLiveuaParchmentIndex(null);
              if (isSatelliteViewer) {
                handleModeApply("economy", "auto", "auto");
                window.setTimeout(() => {
                  flyTo(ev.lat, ev.lng, 0.85);
                }, 500);
                return;
              }
              unifiedFlyTo(ev.lat, ev.lng, 0.85);
            }}
            onGoConflict={() => {
              setLiveuaParchmentIndex(null);
              handleViewerModeChange("conflict");
            }}
            onGoEconomy={() => {
              setLiveuaParchmentIndex(null);
              handleViewerModeChange("economy");
            }}
          />
        ) : null}

        {isSatelliteViewer &&
        focusedLiveuaEvent &&
        liveuaParchmentIndex == null &&
        !theaterSitrepRegion ? (
          <LiveuaEventFocusCard
            lang={labelLanguage}
            event={focusedLiveuaEvent}
            onClose={() => {
              setFocusedLiveuaId(null);
            }}
            onOpenFull={() => {
              const idx = liveuaEnergyEvents.findIndex(
                (e) => e.id === focusedLiveuaEvent.id,
              );
              if (idx >= 0) {
                setFocusedLiveuaId(null);
                setLiveuaParchmentIndex(idx);
              }
            }}
            onFocusChokepoint={(choke) => {
              patchLayerPrefsSoft({
                showLogisticsRisk: true,
                showAis: true,
                showAisCommercial: true,
              });
              unifiedFlyTo(choke.lat, choke.lng, 0.75);
            }}
            onFocusMarkets={() => {
              handleViewerModeChange("economy");
            }}
            onEnableShipTraffic={() => {
              patchLayerPrefsSoft({
                showAis: true,
                showAisCommercial: true,
                showLogisticsRisk: true,
              });
              const market = liveuaFlashMarketContext(focusedLiveuaEvent);
              if (market.chokepoint) {
                unifiedFlyTo(market.chokepoint.lat, market.chokepoint.lng, 0.7);
              }
            }}
          />
        ) : null}

        {isSatelliteViewer && theaterSitrepDoc ? (
          <TheaterSitrepBook
            lang={labelLanguage}
            doc={theaterSitrepDoc}
            onClose={() => setTheaterSitrepRegion(null)}
          />
        ) : null}

        {isSatelliteViewer && intelDeskTipVisible && !theaterSitrepRegion ? (
          <div
            className={`pointer-events-none fixed ${zc("alert")}`}
            style={{
              right: "0.75rem",
              bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
            }}
          >
            <IntelDeskTipCard
              lang={labelLanguage}
              onDismiss={() => {
                markIntelDeskTipDone();
                setIntelDeskTipVisible(false);
              }}
              onOpenGuide={() => {
                markIntelDeskTipDone();
                setIntelDeskTipVisible(false);
                setShowFeatureGuide(true);
              }}
            />
          </div>
        ) : null}

        {intelDrillGate ? (
          <div
            className={`pointer-events-none fixed bottom-4 right-3 ${zc("alert")}`}
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <IntelSourceDrill
              lang={labelLanguage}
              gate={intelDrillGate}
              pirStatuses={intelDrillPirStatuses}
              onClose={closeIntelDrill}
            />
          </div>
        ) : null}

        {!isSatelliteViewer ? (
        <GeopoliticsMapChrome
          isEconomyViewer={isEconomyViewer}
          regionNavSelection={regionNavSelection}
          selected={selected}
          intelSheetOpen={intelSheetOpen}
          showLeftPanel={showLeftPanel}
          theaterFocusConfig={theaterFocusConfig}
          onTheaterDetailClick={flyToTheaterDetail}
          ukraineFrontLegendEngaged={ukraineFrontLegendEngaged}
          showUkraineControl={showUkraineControl}
          ukraineControlDate={ukraineControlDate}
          viinaLodMode={viinaDisplay.lod.mode}
          showAnyDisputeOverlay={showAnyDisputeOverlay}
          showDisputeLegendPanel={showDisputeLegendPanel}
          isUkraineTheaterFocus={isUkraineTheaterFocus}
          onCloseDisputeLegend={() => setShowDisputeLegendPanel(false)}
          onReopenDisputeLegend={() => setShowDisputeLegendPanel(true)}
          telegramMiniPanelVisible={telegramMiniPanelVisible}
          telegramAlerts={telegramAlerts}
          telegramLive={telegramLive}
          telegramStatus={telegramStatus}
          telegramNeedsAuth={telegramNeedsAuth}
          telegramSessionExists={telegramSessionExists}
          telegramEmbedMode={telegramEmbedMode}
          isCompactUi={isCompactUi}
          onCloseTelegram={closeTelegramOsintLayer}
          onTelegramFlyToPlace={isEconomyViewer ? undefined : handleTelegramFlyToPlace}
          bottomAlertPanel={bottomAlertPanel}
          gdeltMenuCoreAlerts={gdeltMenuCoreAlerts}
          gdeltLoading={gdeltLoading}
          gdeltError={gdeltError}
          onGdeltAlertSelect={handleGdeltAlertSelect}
          onCloseGdeltPanel={() => setShowGdeltAlertPanel(false)}
          localDisputeAlerts={localDisputeAlerts}
          isLoading={isLoading}
          loadError={loadError}
          onLocalAlertSelect={handleAlertSelect}
          onCloseLocalPanel={() => setShowLocalAlertPanel(false)}
          labelLanguage={labelLanguage}
          showGdeltWar={showGdeltWar}
          showGdeltDiplomatic={showGdeltDiplomatic}
          showGdeltProtests={showGdeltProtests}
          showUsCarriers={showUsCarriers}
          deployedCarrierCount={usCarriers.filter((c) => c.status === "deployed").length}
        />
        ) : null}
        {!showLeftPanel &&
          !selected &&
          !isCompactUi &&
          showLayerHoverInfo &&
          hoverPointer &&
          (!regionNavSelection || hoveredPath?.kind === "axis-link") && (
          hoveredChokepointStress && showLogisticsStress ? (
            <CursorHoverCard visible x={hoverPointer.x} y={hoverPointer.y}>
              <LogisticsStressCard
                title={hoveredChokepointStress.title}
                stress={hoveredChokepointStress.stress}
                lang={labelLanguage}
              />
            </CursorHoverCard>
          ) : (
          <CursorHoverCard
            visible
            x={hoverPointer.x}
            y={hoverPointer.y}
            title={hoverCard.title}
            detail={hoverCard.detail}
            badge={"badge" in hoverCard ? hoverCard.badge : undefined}
            meta={hoverCard.meta}
            body={hoverCard.body}
            hint={hoverCard.hint}
          />
          )
        )}
        {(() => {
          /** 우크라 전선 포커스: 전체 스택 대신 📰 FAB만 — 데스크톱도 인텔 진입 유지 */
          const fabOnly = Boolean(isUkraineTheaterFocus);
          const stackVisible = !intelSheetOpen && !showLeftPanel && !selected;
          if (isSatelliteViewer || isHistoryViewer) return null;
          return (
            <div
              className={stackVisible ? "contents" : "pointer-events-none invisible"}
              aria-hidden={!stackVisible}
            >
              <IntelCompactBar
                showTicker={viewUi.showTicker}
                viewerMode={viewerMode}
                pauseUpdates={isCameraMoving}
                fabOnly={fabOnly}
                currentLocationTheater={
                  isEconomyViewer
                    ? null
                    : newsTheaterFromCoords(filterCenter.lat, filterCenter.lng)
                }
                onOpenCurrentLocationNews={openCurrentLocationNews}
                onOpenSheet={(theater) => openIntelSheet({ theater: theater ?? "all" })}
                onFlyToTheater={(theater) => {
                  const target = flyTargetForTheater(theater);
                  if (target) handleIntelFlyTo(target);
                }}
                onEnableLayer={(layerKey) => {
                  if (
                    isEconomyViewer &&
                    (layerKey === "showMilitaryActivity" ||
                      layerKey === "showUsCarriers" ||
                      layerKey === "showMilitaryBases" ||
                      layerKey === "showRokMilitaryBases" ||
                      layerKey === "showJapanMilitaryBases" ||
                      layerKey === "showTaiwanMilitaryBases" ||
                      layerKey === "showPhilippinesMilitaryBases" ||
                      layerKey === "showAustraliaMilitaryBases" ||
                      layerKey === "showEasternNatoMilitaryBases" ||
                      layerKey === "showDisguisedVessels")
                  ) {
                    return;
                  }
                  const key = layerKey as keyof typeof layerPrefs;
                  if (typeof layerPrefs[key] !== "boolean") return;
                  applyLayerPrefs({ ...layerPrefs, [key]: true });
                  const themeByLayer: Record<string, string> = {
                    showAis: "ais",
                    showDisguisedVessels: "disguised-vessels",
                    showUsCarriers: "carriers",
                    showFirmsFires: "firms",
                    showMilitaryActivity: "military",
                    showAirTraffic: "airTraffic",
                  };
                  const themeId = themeByLayer[layerKey] ?? layerKey;
                  recordInterestTheme(themeId, layerKey, 1.1);
                }}
              />
            </div>
          );
        })()}
      </section>
        </div>

        {intelChunkReady || intelSheetOpen ? (
        <IntelNewsSheet
          ref={intelStackRef}
          open={intelSheetOpen && !showLeftPanel && !selected}
          onClose={() => setIntelSheetOpen(false)}
          onOpen={() => setIntelSheetOpen(true)}
          onFlyToMap={handleIntelFlyTo}
          onOpenNewsInsight={handleOpenNewsInsight}
          showTelegram={isConflictViewer}
          telegramAlerts={telegramAlerts}
          telegramLive={telegramLive}
          telegramStatus={telegramStatus}
          telegramNeedsAuth={telegramNeedsAuth}
          telegramSessionExists={telegramSessionExists}
          telegramEmbedMode={telegramEmbedMode}
          telegramChannelCount={TELEGRAM_CHANNEL_COUNT}
          onCloseTelegramLayer={closeTelegramOsintLayer}
          onTelegramFlyToPlace={isEconomyViewer ? undefined : handleTelegramFlyToPlace}
          showViina={showViinaIntel}
          viinaEvents={viinaFrontEvents}
          viinaControlDate={ukraineControlDate}
          viinaRuCellCount={ukraineRuCellCount}
          viinaLoading={ukraineControlStatus === "loading"}
          onViinaFlyTo={handleViinaEventFlyTo}
          showGdelt={isConflictViewer && isCompactUi}
          gdeltAlerts={gdeltMenuCoreAlerts}
          gdeltLiveStatus={gdeltLoading ? "loading" : gdeltError ? "error" : "ok"}
          gdeltErrorMessage={gdeltError}
          onGdeltSelect={handleGdeltAlertSelect}
          initialIntelTab={viewUi.defaultIntelTab}
          autoOpenOnMount={false}
          onOpenTrust={() => setShowTrustPanel(true)}
        />
        ) : null}

      <DashboardOverlayHost
        labelLanguage={labelLanguage}
        isCompactUi={isCompactUi}
        isTabletUi={isTabletUi}
        isPhoneUi={isPhoneUi}
        isEconomyViewer={isEconomyViewer}
        viewerMode={viewerMode}
        intelSheetOpen={intelSheetOpen}
        showLeftPanel={showLeftPanel}
        showIntroHint={showIntroHint}
        showUkraineControl={showUkraineControl}
        showQuickStart={showQuickStart}
        chromeCoachStep={chromeCoachStep}
        showViewerIntro={showViewerIntro}
        selected={selected}
        regionNavSelection={regionNavSelection}
        econNavSelection={econNavSelection}
        showModePicker={showModePicker}
        entryGate={entryGate}
        globeReady={globeReady}
        isLoading={isLoading}
        showUsCarriers={showUsCarriers}
        usCarriers={usCarriers}
        deployedCarrierCount={deployedCarrierCount}
        showGpsInterference={showGpsInterference}
        gpsJamStatus={gpsJamStatus}
        gpsJamCellCount={gpsJamPolygons.length}
        gpsJamDate={gpsJamDate}
        showUsDfcSupplyChain={showUsDfcSupplyChain}
        showBriTradeConnectivity={showBriTradeConnectivity}
        usDfcSupplyPaths={usDfcSupplyPaths}
        briTradePaths={briTradePaths}
        issueUiPausedForLamp={issueUiPausedForLamp}
        {...buildOverlayHostObserveFeedProps({
          showNeptun,
          neptunAlertCount,
          showTzevaAdom,
          showNewfeedsIranAttacks,
          neptunAlerts,
          neptunLive,
          neptunStatus,
          neptunError,
          tzevaAdomActive,
          tzevaAdomHistory,
          tzevaAdomLive,
          tzevaAdomStatus,
          tzevaAdomGeoRestricted,
          tzevaAdomError,
          newfeedsAttacks,
          newfeedsThreatLabel,
          newfeedsLive,
          newfeedsStatus,
          newfeedsError,
        })}
        tourScenes={tourScenes}
        showFeatureGuide={showFeatureGuide}
        showControlsGuide={showControlsGuide}
        askLayersOpen={askLayersOpen}
        showTrustPanel={showTrustPanel}
        showSourcesPanel={showSourcesPanel}
        showDataSourceParchment={showDataSourceParchment}
        onSetShowDataSourceParchment={setShowDataSourceParchment}
        showMobileAlertFeed={showMobileAlertFeed}
        playOverlay={playOverlay}
        sentinelActive={sentinelActive}
        sentinelTour={sentinelTour}
        sentinelIndex={sentinelIndex}
        whereIsItPool={whereIsItPool}
        liveBriefingSession={liveBriefingSession}
        whatsNewUpdate={whatsNewUpdate}
        tomorrowTensionPrompt={tomorrowTensionPrompt}
        periodicBriefing={periodicBriefing}
        foldedPeriodicBriefing={foldedPeriodicBriefing}
        weeklyExpanded={weeklyExpanded}
        tourActive={tourActive}
        modePickerInitialMode={modePickerInitialMode}
        viewTheater={viewTheater}
        viewEconomyHub={viewEconomyHub}
        modePickerLockMode={modePickerLockMode}
        showFirstVisitTour={showFirstVisitTour}
        hubBriefOpen={hubBriefOpen}
        frictionEpisodeBrief={frictionEpisodeBrief}
        frictionCoachStep={frictionCoachStep}
        watchFocusLine={watchFocusLine}
        clearanceStatus={clearanceStatus}
        calendarDayKey={calendarDayKey}
        weeklyRecap={weeklyRecap}
        weeklyRecapCollapsed={weeklyRecapCollapsed}
        showLampPreparing={showLampPreparing}
        showLanguageGate={showLanguageGate}
        showPurposeJobGate={showPurposeJobGate}
        purposeJobAllowDismiss={purposeJobForced}
        showDailyRankPanel={showDailyRankPanel}
        showTourInvite={showTourInvite}
        {...buildOverlayHostAlertProps({
          airRaid: {
            offer: airRaidOffer,
            briefing: airRaidBriefing,
            showCoach: showAirRaidCoach,
            onDismissOffer: dismissAirRaidOffer,
            onSetBriefing: setAirRaidBriefing,
            onReleaseBusy: releaseAirRaidAutoBusy,
            onFocus: handleAirRaidFocus,
            onMaybeOfferCoach: maybeOfferAirRaidCoach,
          },
          maritime: {
            offer: maritimeOffer,
            ukmtoBriefing,
            navareaBriefing,
            onAccept: acceptMaritimeOffer,
            onDismiss: dismissMaritimeOffer,
            onCloseUkmto: closeUkmtoBriefing,
            onCloseNavarea: closeNavareaBriefing,
          },
          tension: {
            spike: tensionSpike,
            onDismiss: () => {
              dismissTensionSpike();
              markHotTheaterSessionApplied();
            },
            onJump: onTensionSpikeJump,
          },
          hotTheater: {
            // 세션 내 핫전장 오퍼는 별도 UI로 처리 — Host에는 null 유지
            offer: null,
            onAccept: acceptHotTheaterOffer,
            onDismiss: dismissHotTheaterOffer,
          },
        })}
        uxGuideBrief={uxGuideBrief}
        onDismissUxGuideBrief={() => setUxGuideBrief(null)}
        {...buildOverlayHostBreakingEscalationProps({
          breakingFlash,
          onDismissBreakingFlash: dismissBreakingFlash,
          breakingFlashGrade: breakingFlashGate?.grade,
          onBreakingFlashDrill: breakingFlashGate
            ? () => openIntelDrill(breakingFlashGate)
            : undefined,
          onBreakingFlashGoToLocation: () =>
            runBreakingFlashGoToLocation({
              breakingFlash,
              labelLanguage,
              incidentEntryAltitude: INCIDENT_ENTRY_ALT,
              revealIncidentEnergyPipelines,
              dismissBreakingFlash,
              switchToObserveAndFly,
            }),
          escalationOffer: escalationIntel?.offer ?? null,
          onDismissEscalationOffer: dismissEscalationOffer,
          escalationDisplayGrade: escalationIntel?.gate.grade,
          onEscalationDrill: escalationIntel
            ? () => openIntelDrill(escalationIntel.gate)
            : undefined,
        })}
        {...buildOverlayHostPerimeterProps({
          adsbOffer: adsbEmergencyOffer,
          onGoToObserveFromAdsb: isSatelliteViewer ? undefined : handleAdsbGoToObserve,
          onDismissAdsb: dismissAdsbEmergencyOffer,
          natoAlert: natoPerimeterAlert,
          onDismissNato: dismissNatoPerimeterAlert,
        })}
        {...buildOverlayHostExerciseProps({
          offer: exerciseOffer,
          briefing: exerciseBriefing,
          chokepointBriefing: chokepointStressGate ? chokepointStressBriefing : null,
          chokepointGrade: chokepointStressGate?.grade,
          onDismissOffer: dismissExerciseOffer,
          onSetBriefing: setExerciseBriefing,
          onSetChokepointBriefing: setChokepointStressBriefing,
          onChokepointDrill: chokepointStressGate
            ? () => openIntelDrill(chokepointStressGate)
            : undefined,
          onChokepointOpenObserve: isSatelliteViewer
            ? undefined
            : () => {
                setChokepointStressBriefing(null);
                handleViewerModeChange("satellite");
              },
          onExerciseFlyTo: () => {
            if (!exerciseBriefing) return;
            flyTo(exerciseBriefing.lat, exerciseBriefing.lng, 0.85, 900);
          },
          onChokepointFlyTo: () => {
            if (!chokepointStressBriefing) return;
            flyTo(chokepointStressBriefing.lat, chokepointStressBriefing.lng, 0.72, 900);
          },
        })}
        {...buildOverlayHostUltraLiteProps({
          visible: ultraLiteAutoOffer.visible,
          probe: ultraLiteAutoOffer.probe,
          onAccept: ultraLiteAutoOffer.accept,
          onDismiss: ultraLiteAutoOffer.dismiss,
        })}
        gtiHeroSnapshot={wtiSnapshot}
        gtiHeroVisible={firstImpression.gtiHeroVisible}
        timeScrubber={{
          asOf: effectiveAsOf,
          today: todayUtc,
          availableDates: rankAvailableDates,
          onChange: (date) => setViewAsOf(date === todayUtc ? null : date),
          onGoToday: () => setViewAsOf(null),
        }}
        soundUnmuteReady={firstImpression.onboardingReady}
        globeRef={globeRef}
        intelStackRef={intelStackRef}
        layerPrefs={layerPrefs}
        showLayerPanelToggle={false}
        {...buildOverlayHostChromeActionsProps({
          onCloseLeftPanel: closeLeftPanel,
          onToggleLeftPanel: toggleLeftPanel,
          onOpenLeftPanel: ensureLeftPanelOpen,
          onSetShowUsCarriers: setShowUsCarriers,
          onSetShowGpsInterference: setShowGpsInterference,
          onSetShowUsDfcSupplyChain: setShowUsDfcSupplyChain,
          onSetShowBriTradeConnectivity: setShowBriTradeConnectivity,
          onSetShowQuickStart: setShowQuickStart,
          onSetShowViewerIntro: setShowViewerIntro,
          onSetShowTrustPanel: setShowTrustPanel,
          onSetShowSourcesPanel: setShowSourcesPanel,
          onSetShowFeatureGuide: setShowFeatureGuide,
          onSetShowControlsGuide: setShowControlsGuide,
          onSetAskLayersOpen: setAskLayersOpen,
          onSetShowMobileAlertFeed: setShowMobileAlertFeed,
          onAskLayersApply: handleAskLayersApply,
          onSetShowFirstVisitTour: setShowFirstVisitTour,
          onSetTourActive: setTourActive,
          getSceneForShare: getSceneForShareResolved,
          onSetSentinelActive: setSentinelActive,
          onSetPlayOverlay: setPlayOverlay,
          onSetShowCityLabels: setShowCityLabels,
          onEndLiveBriefing: endLiveBriefing,
          flyTo,
          onSetWhatsNewUpdate: setWhatsNewUpdate,
          onLabelLanguageChange: setLabelLanguage,
          onConfirmLabelLanguage: confirmLabelLanguage,
          onConfirmPurposeJob: confirmPurposeJob,
          onDismissPurposeJob: () => setPurposeJobForced(false),
          onLangChoiceConfirmed: () => setLangChoiceDone(true),
          onSetEntryGate: setEntryGate,
          onDomainSelect: handleDomainSelect,
          onModeApply: handleModeApply,
          onCustomLayerApply: handleCustomLayerApply,
          onModePickerCancel: handleModePickerCancel,
          onSetChromeCoachStep: setChromeCoachStep,
          onSetIntelSheetOpen: setIntelSheetOpen,
          onFrictionCoachStepChange: handleFrictionCoachStepChange,
          onSetShowAirRaidCoach: setShowAirRaidCoach,
          onOpenClearanceRecovery: openClearanceRecovery,
          onSetClearanceChipSettled: setClearanceChipSettled,
          onSetWeeklyRecapCollapsed: setWeeklyRecapCollapsed,
          onSetShowTourInvite: setShowTourInvite,
          onSetPeriodicBriefing: setPeriodicBriefing,
          onSetFoldedPeriodicBriefing: setFoldedPeriodicBriefing,
          onSetTomorrowTensionPrompt: setTomorrowTensionPrompt,
          onSetClearanceStatus: setClearanceStatus,
          onToggleDailyRankPanel: toggleDailyRankPanel,
          onBeginLiveBriefing: beginLiveBriefing,
        })}
      />

      {showLeftPanel ? (
        <LayerPanelHost
          isCompactUi={isCompactUi}
          isTabletUi={isTabletUi}
          isDesktopWideUi={isDesktopWideUi}
          labelLanguage={labelLanguage}
          activeTab={leftPanelTab}
          showTabBar={false}
          layerPanelDirty={layerPanelDirty}
          onConfirmDraft={confirmLayerPanelDraft}
          onCancelDraft={cancelLayerPanelDraft}
          navHeaderLabel={viewerChromePreset.navHeaderLabel}
          layerPanelTitle={
            leftPanelTab === "settings"
              ? t("layerTabSettings", labelLanguage)
              : leftPanelTab === "data"
                ? t("layerTabData", labelLanguage)
                : viewerChromePreset.layerPanelTitle
          }
          onClose={closeLeftPanel}
          onLangDraftChange={handlePanelLangDraft}
          ultraLite={ultraLite}
          onUltraLiteToggle={handleUltraLiteToggle}
          showLayerHoverInfo={showLayerHoverInfo}
          onShowLayerHoverInfoToggle={handleShowLayerHoverInfoToggle}
          draftPrefs={draftPrefs}
          onOpenModePicker={() => {
            closeLeftPanel();
            openModePickerManual();
          }}
          onResetCheckboxSettings={handleResetCheckboxSettings}
          frozenPanelCategories={frozenPanelCategories}
          layerPanelSessionKey={layerPanelSessionRef.current}
          batchPending={batchPending}
          isEconomyViewer={isEconomyViewer}
          isHistoryViewer={isHistoryViewer}
          showUkraineControl={showUkraineControl}
          onPanelDraftPatch={handlePanelDraftPatch}
          showNeptun={showNeptun}
          neptunThreats={neptunThreats}
          neptunAlerts={neptunAlerts}
          neptunLive={neptunLive}
          neptunStatus={neptunStatus}
          neptunServerTime={neptunServerTime}
          neptunError={neptunError}
          neptunFetchEnabled={neptunFetchEnabled}
          neptunRenderMode={neptunRenderMode}
          onNeptunThreatSelect={handleNeptunThreatSelect}
          transportLoading={transportLoading}
          transportError={transportError}
          globeLodLabel={globeLod.label}
          viinaLodMode={viinaDisplay.lod.mode}
          globePointsCount={globePoints.length}
          aisLoading={aisLoading}
          showAis={showAis}
          onRefreshAis={() => startTransition(() => void refreshAis())}
          aisError={aisError}
          syncBusy={syncBusy}
          syncRunning={syncInfo?.running === true}
          onForceSync={() => {
            startTransition(() => {
              setSyncBusy(true);
              void forceSync().finally(() => setSyncBusy(false));
            });
          }}
          gdeltEventsCount={gdeltEvents.length}
          disputesCount={(data.disputes ?? []).length}
          railPathsCount={railPaths.length}
          aisVesselsCount={aisVessels.length}
          milAircraftCount={milAircraft.length}
          civAircraftCount={civAircraft.length}
          visibleFirmsFiresCount={visibleFirmsFires.length}
          countriesCount={data.countries.length}
          labelPlacesCount={labelPlaces.length}
          generatedAt={data.generatedAt}
          loadError={loadError}
        />
      ) : null}

      <GeopoliticsSidebarChrome
        regionNavSelection={regionNavSelection}
        isEconomyViewer={isEconomyViewer}
        selected={selected}
        showLeftPanel={showLeftPanel}
        labelLanguage={labelLanguage}
        theaterFocusConfig={theaterFocusConfig}
        regionFilteredEvents={regionFilteredEvents}
        telegramAlerts={telegramAlerts}
        telegramLive={telegramLive}
        telegramStatus={telegramStatus}
        telegramNeedsAuth={telegramNeedsAuth}
        telegramSessionExists={telegramSessionExists}
        telegramEmbedMode={telegramEmbedMode}
        theaterSidebarTab={theaterSidebarTab}
        onClearRegionNav={clearRegionNavSelection}
        onFlyToCoords={(lat, lng, altitude) => flyTo(lat, lng, altitude ?? 0.72)}
        onSelectGdeltEvent={handleRegionEventSelect}
      />

      {gevTracking && gevHud ? (
        <GevTrackHud
          hud={gevHud}
          contacts={gevContacts}
          followCamera={gevFollowCamera}
          onToggleFollow={toggleGevFollow}
          onStop={() => {
            stopGevTracking();
            setSelected(null);
          }}
          onSelectContact={handleGevContactSelect}
          lang={labelLanguage === "en" ? "en" : "ko"}
        />
      ) : null}

      {flyToConfirmOffer ? (
        <FlyToConfirmBanner
          offer={flyToConfirmOffer}
          lang={labelLanguage === "en" ? "en" : "ko"}
          onAccept={acceptFlyToConfirm}
          onDismiss={dismissFlyToConfirm}
        />
      ) : null}

      {selected && !showLeftPanel && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseInfoPanel", labelLanguage)}
            className="absolute inset-0 z-[500] bg-black/20 lg:bg-black/10"
            onClick={() => {
              stopGevTracking();
              setSelected(null);
            }}
          />
          <aside className="intel-panel intel-sidebar-right z-[600] flex flex-col overflow-hidden p-4">
            {selected.kind === "neptun-threat" ? (
              <div className="intel-scroll-y min-h-0 flex-1">
                <NeptunThreatDetailPanel
                  threat={selected.item}
                  lang={labelLanguage}
                  onClose={() => {
                    stopGevTracking();
                    setSelected(null);
                  }}
                />
                <CaseEvidenceAttachBar
                  lang={labelLanguage}
                  captureFrame={captureFrameResolved}
                  target={{
                    source: "air-raid",
                    lat: selected.item.lat,
                    lng: selected.item.lon,
                    at: selected.item.confirmedAt ?? selected.item.updatedAt ?? null,
                    pickThreatId: selected.item.id,
                    label:
                      labelLanguage === "en"
                        ? `NEPTUN ${selected.item.type}`
                        : `NEPTUN ${selected.item.type}`,
                  }}
                />
              </div>
            ) : selected.kind === "firms-fire" ? (
              <div className="intel-scroll-y min-h-0 flex-1">
                <FirmsFireDetailPanel
                  fire={selected.item}
                  lang={labelLanguage}
                  onClose={() => {
                    stopGevTracking();
                    setSelected(null);
                  }}
                  footer={
                    <CaseEvidenceAttachBar
                      lang={labelLanguage}
                      captureFrame={captureFrameResolved}
                      target={{
                        source: "firms",
                        lat: selected.item.lat,
                        lng: selected.item.lng,
                        pickId: selected.item.id,
                        fromDate: selected.item.acqDate,
                        toDate: selected.item.acqDate,
                        label: `FIRMS ${selected.item.id}`,
                      }}
                    />
                  }
                />
              </div>
            ) : selected.kind === "news-insight" ? (
              <div className="intel-scroll-y min-h-0 flex-1">
                <NewsInsightPanel
                  item={selected.item}
                  mode={isEconomyViewer ? "economy" : "conflict"}
                  lang={labelLanguage}
                  onClose={() => {
                    setNewsInsightCallout(null);
                    stopGevTracking();
                    setSelected(null);
                  }}
                  onApplyMap={handleNewsInsightApplyMap}
                />
              </div>
            ) : (
              <>
                {regionNavSelection && (
                  <button
                    type="button"
                    onClick={() => {
                      stopGevTracking();
                      setSelected(null);
                    }}
                    className="mb-3 shrink-0 text-xs text-amber-200/80 transition hover:text-amber-100"
                  >
                    ← {regionNavSelection.label} 뉴스 목록
                  </button>
                )}
                <div className="intel-scroll-y min-h-0 flex-1">
                  <AnalysisPanel
                    selection={selected}
                    onClose={() => {
                      stopGevTracking();
                      setSelected(null);
                    }}
                    onOpenRelatedNews={openRelatedNewsAt}
                    ukraineControlDate={ukraineControlDate}
                    ukraineRuCellCount={ukraineRuCellCount}
                    disputeOverview={
                      selected.kind === "dispute"
                        ? disputeOverviews.get(selected.item.id) ?? null
                        : null
                    }
                    ukmtoIncidents={ukmtoIncidents}
                    aisByChokeId={portWatchByChokeId}
                  />
                  {selected.kind === "ais" &&
                  Number.isFinite(selected.item.lat) &&
                  Number.isFinite(selected.item.lng) ? (
                    <CaseEvidenceAttachBar
                      lang={labelLanguage}
                      captureFrame={captureFrameResolved}
                      target={{
                        source: "ais",
                        lat: selected.item.lat,
                        lng: selected.item.lng,
                        pickId: selected.item.id,
                        pickMmsi: selected.item.mmsi,
                        label:
                          selected.item.shipName ||
                          selected.item.mmsi ||
                          selected.item.id,
                      }}
                    />
                  ) : null}
                </div>
              </>
            )}
          </aside>
        </>
      )}
      <GeoeconomicsChrome
        labelLanguage={labelLanguage}
        isEconomyViewer={isEconomyViewer}
        hasAnalysisSelection={selected != null || showLeftPanel}
        econNavSelection={econNavSelection}
        econInsightOpen={econInsightOpen}
        econInsightBrief={econInsightBrief}
        econInsightCompact={econInsightCompact}
        econNewsPanelReveal={econNewsPanelReveal}
        onCloseEconNavSelection={() => {
          setEconNavSelection(null);
          setEconNewsPanelReveal(false);
        }}
        onEconRegionOpenIntel={() => {
          setEconNavSelection(null);
          setEconNewsPanelReveal(false);
          openIntelSheet({ theater: "all", tab: "news" });
        }}
        onEconRegionFlyToMap={(target) => {
          setEconNavSelection(null);
          setEconNewsPanelReveal(false);
          handleIntelFlyTo(target);
        }}
        onOpenNewsInsight={handleOpenNewsInsight}
        onCloseEconInsight={closeEconInsight}
        onSetEconNewsPanelReveal={setEconNewsPanelReveal}
        onOpenIntelSheet={openIntelSheet}
      />

      <GeopoliticsParchmentChrome
        labelLanguage={labelLanguage}
        hubBriefDoc={hubBriefDoc}
        onCloseHubBrief={closeHubBrief}
        frictionEpisodeBrief={frictionEpisodeBrief}
        onCloseFrictionBrief={() => setFrictionEpisodeBrief(null)}
        territorialEpisodeBrief={territorialEpisodeBrief}
        onCloseTerritorialBrief={() => setTerritorialEpisodeBrief(null)}
        shipMovementBriefTrack={shipMovesBriefTrack}
        shipMovementBriefFocusId={shipMovesBriefFocusId}
        onCloseShipMovementBrief={() => {
          setShipMovesBriefTrack(null);
          setShipMovesBriefFocusId(null);
        }}
        activeHubId={activeHubId}
      />

      {newsPerspectives ? (
        <NewsPerspectivesPanel
          headline={newsPerspectives.title}
          placeLabel={newsPerspectives.placeLabel}
          kind={newsPerspectives.kind}
          perspectives={newsPerspectives.perspectives ?? []}
          theater={newsPerspectives.theater}
          ageMinutes={newsPerspectives.ageMinutes ?? 60}
          viewerMode={viewerMode}
          lang={labelLanguage}
          onClose={() => setNewsPerspectives(null)}
        />
      ) : null}

      {economyAttackReaction && isEconomyViewer ? (
        <aside
          className="pointer-events-auto absolute left-3 top-[5.75rem] z-[600] w-[min(94vw,360px)] overflow-hidden rounded-2xl border border-amber-400/25 bg-[#0b1020]/95 shadow-2xl backdrop-blur-xl sm:left-4"
          role="dialog"
          aria-label={labelLanguage === "en" ? "Event market reaction" : "사건 시장 반응"}
        >
          <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <p className="text-micro font-semibold uppercase tracking-wider text-amber-200/80">
                {labelLanguage === "en" ? "Event ↔ Markets" : "사건 ↔ 시장"}
              </p>
              <p className="mt-0.5 truncate text-caption text-slate-200">
                {economyAttackReaction.title}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-slate-500/30 px-2 py-1 text-meta text-slate-300"
              onClick={() => setEconomyAttackReaction(null)}
            >
              {labelLanguage === "en" ? "Close" : "닫기"}
            </button>
          </div>
          <EventMarketReactionCard
            theater="middle-east"
            ageMinutes={economyAttackReaction.ageMinutes}
            prominent
            viewerMode="economy"
          />
        </aside>
      ) : null}

      </NewsStreamProvider>
    </main>
    </LocaleProvider>
  );
}

