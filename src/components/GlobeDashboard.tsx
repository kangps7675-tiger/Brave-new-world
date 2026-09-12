"use client";

import Fuse from "fuse.js";
import dynamic from "@/lib/clientDynamic";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { CursorHoverCard } from "@/components/CursorHoverCard";
import { NewsPerspectivesPanel } from "@/components/NewsPerspectivesPanel";
import {
  NewsInsightPanel,
  type NewsInsightApplyPayload,
} from "@/components/NewsInsightPanel";
import { type DailyPrompt } from "@/lib/dailyPrompt";
import {
  type DailyRanksPayload,
  type WorldTensionSnapshot,
  utcRankDate,
} from "@/lib/dailyRanks";
import {
  getWorldTensionEntry,
  refreshWorldTension,
  subscribeWorldTension,
} from "@/lib/worldTensionStore";
import {
  HISTORICAL_MODE_LIVE_PREF_KEYS,
} from "@/lib/historicalFrames";
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
import { type AskLayersApplyPayload } from "@/components/AskLayersOverlay";
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
  buildScenarioPrefs,
  findScenarioPreset,
  type ScenarioPresetId,
} from "@/lib/scenarioPresets";
import {
  trackDomainSelect,
  trackModeSwitch,
  trackLayerToggle,
} from "@/lib/analyticsEvents";
import { DashboardOverlayHost } from "@/components/globe/DashboardOverlayHost";
import { useSceneDeeplink } from "@/components/globe/hooks/useSceneDeeplink";
import { useAmbientSoundSelectors } from "@/components/globe/hooks/useAmbientSoundSelectors";
import { useMaritimeAlertBriefs } from "@/components/globe/hooks/useMaritimeAlertBriefs";
import { useLayerPanelCategories } from "@/components/globe/hooks/useLayerPanelCategories";
import { useCrinkInfraLayers } from "@/components/globe/hooks/useCrinkInfraLayers";
import { useAirRaidAutoLayer } from "@/components/globe/hooks/useAirRaidAutoLayer";
import { useExerciseAlertAuto } from "@/components/globe/hooks/useExerciseAlertAuto";
import { useEscalationSignals } from "@/components/globe/hooks/useEscalationSignals";
import {
  buildExerciseBriefingContent,
  type ExerciseBriefingContent,
} from "@/components/ExerciseBriefingParchment";
import {
  applyRfTrackBoost,
  type MilitaryExercise,
} from "@/lib/militaryExercises";
import {
  findMilitaryExercise,
  militaryExercisesToPaths,
} from "@/lib/militaryExerciseHatch";
import {
  militaryExerciseHtmlMarkers,
} from "@/lib/militaryExerciseMarkers";
import {
  financialHubHtmlMarkers,
} from "@/lib/financialMarketHubMarkers";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { useNeptunGlobeLayer } from "@/components/globe/hooks/useNeptunGlobeLayer";
import { useLiveOverlayMarkers } from "@/components/globe/hooks/useLiveOverlayMarkers";
import { useReconSatelliteLayer } from "@/components/globe/hooks/useReconSatelliteLayer";
import { useSituationHtmlMarkers } from "@/components/globe/hooks/useSituationHtmlMarkers";
import { useHoverCard } from "@/components/globe/hooks/useHoverCard";
import {
  useTensionSpikeCut,
  type TensionCutDestination,
} from "@/components/globe/hooks/useTensionSpikeCut";
import { useGpsJamLayer } from "@/hooks/useGpsJamLayer";
import { buildGpsJamSoloPatch } from "@/lib/gpsJamSolo";
import {
  reconCountryAccent,
  sampleReconOrbitTrack,
} from "@/lib/reconSatellitePropagate";
import { buildDailyTourScenes } from "@/lib/dailyTour";
import { emitBreakingDispatchSound } from "@/components/SoundEffectsBridge";
import {
  CARRIER_CLICK_CUES,
  cuesForAircraft,
  cuesForAisVessel,
  cuesForPathKind,
  cuesForStaticKind,
  emitLayerClickSounds,
  MIL_BASE_CUES,
} from "@/lib/infraClickSounds";
import { resolveHubBrief } from "@/data/hubBriefs";
import { resolveCriticalNodeBrief } from "@/data/resolveCriticalNodeBrief";
import {
  ECON_NAV_TO_CRITICAL_NODE,
  focusCriticalNodeIds,
} from "@/data/criticalNodes";
import type { EconInsightBrief } from "@/data/econInsightBriefs";
import type { ChromeCoachStep } from "@/components/ChromeOnboardingCoach";
import {
  shouldOfferFrictionCoach,
  type FrictionCoachStep,
} from "@/components/FrictionOnboardingCoach";
import { shouldOfferAirRaidCoach } from "@/components/AirRaidOnboardingCoach";
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
  buildBreakingFlashBriefingForLang,
  claimBreakingFlash,
  pickNextBreakingFlashHero,
  type BreakingFlashBriefing,
} from "@/lib/news/breakingFlash";
import {
  INTEL_STACK_CLEARANCE_HISTORY,
  INTEL_STACK_CLEARANCE_HISTORY_COMPACT,
} from "@/lib/news/intelStackMode";
import {
  buildLampMacroTable,
  hasFoldedLamp,
  clearLampFolded,
  localizePeriodicBriefing,
  hasFoldedWeeklyRecap,
  lampSeenKey,
  ensureLampFeaturedNews,
  resolveLampPeriod,
  resolveMondayWeeklyRecap,
  weeklyRecapStorageKey,
  weeklyRecapTitle,
  type PeriodicBriefing,
} from "@/lib/news/periodicBriefing";
import {
  formatWatchPinsLine,
  loadWatchPins,
  rememberConflictNav,
  rememberConflictTheater,
  rememberEconomyHub,
  rememberEconomyNav,
  upsertWatchPin,
} from "@/lib/watchFocus";
import type { NewsStreamItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import {
  recordInterestFromSelection,
  recordInterestMode,
  recordInterestTheme,
} from "@/lib/interest/recordInterest";
import { useLocalCalendarDayKey } from "@/hooks/useLocalCalendarDayKey";
import { useLampContentSlotKey } from "@/hooks/useLampContentSlotKey";
import {
  SENTINEL_CYCLE_MS,
  fetchSentinelTour,
  type SentinelFlyTarget,
} from "@/lib/sentinelMode";
import { type AppUpdate } from "@/lib/appUpdates";
import type { WhereIsItPoolItem } from "@/lib/whereIsItGame";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { t } from "@/lib/uiStrings";
import { markViewerIntroDone } from "@/components/ViewerIntroOverlay";
import { GeoeconomicsChrome } from "@/components/globe/GeoeconomicsChrome";
import { markQuickStartDone } from "@/components/QuickStartCoach";
import type { NavSelection } from "@/data/navRegions";
import { EXPLORATION_PRESETS, toNavSelection } from "@/data/navRegions";
import { econNavSelectionFromId } from "@/data/econNavRegions";
import {
  type EconomyHubChoice,
} from "@/lib/autoFlyTarget";
import {
  conceptLayersForEconomyNavId,
  UKRAINE_LIVE_COMPANIONS,
} from "@/lib/conceptLayers";
import { pickGdeltTensionTags, pickGdeltTierPins } from "@/lib/gdeltLocationTags";
import {
  isUkraineTheaterGdeltWar,
  type UkraineGdeltNeonMarker,
} from "@/lib/ukraineGdeltNeonMarker";
import {
  theaterIntensityFromGdeltGrade,
} from "@/lib/theaterIntensityRadius";
import { deconflictTheaterHtmlOverlays } from "@/lib/htmlOverlayDeconflict";
import { buildAircraftSymbolModel } from "@/lib/milAircraftSymbols";
import { buildNewsStreamMapTags } from "@/lib/news/newsStreamMapTags";
import {
  filterEventsByNavSelection,
  pickMenuCoreAlerts,
  type MenuCoreAlert,
} from "@/lib/regionFilter";
import {
  buildTensionHeatmaps,
} from "@/lib/tensionHeatmap";
import { getGlobeLod, globeLodFromTier } from "@/lib/globeLod";
import { getTransportLod } from "@/lib/transportLod";
import { expandPlaces } from "@/lib/compactData";
import { dataPath } from "@/lib/dataProfile";
import { fetchAppDataStream, fetchAppDataPlaces, type AppDataLoadProgress } from "@/lib/fetchAppDataStream";
import { useViewportPaths } from "@/hooks/useViewportPaths";
import { computeDashboardBootProgress } from "@/lib/bootLoadingProgress";
import { runWhenIdle } from "@/lib/deferIdle";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import {
  liveAisFetchMax,
  liveAisPollMs,
  liveMilFetchMax,
  liveMilPollMs,
  liveAirTrafficFetchMax,
  liveAirTrafficPollMs,
  airTrafficDistNm,
  liveTelegramPollMs,
  liveTelegramSyncPollMs,
  liveTzevaPollMs,
  liveNewfeedsPollMs,
  liveUsCarriersPollMs,
  shouldDeferLiveNetworkRefresh,
} from "@/lib/liveRenderGuard";
import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
  type TelegramAlertsPayload,
} from "@/lib/telegramAlerts";
import type { TzevaAdomAlert, TzevaAdomPayload } from "@/lib/tzevaAdom";
import {
  type NewfeedsAttackPoint,
  type NewfeedsAttacksPayload,
} from "@/lib/newfeeds";
import {
  findUkmtoIncident,
  ukmtoIncidentToHatchPaths,
  type UkmtoIncidentPoint,
} from "@/lib/ukmtoHatch";
import {
  findNavareaFeature,
  navareaFeaturesToPaths,
  type NavareaFeaturePoint,
} from "@/lib/navareaHatch";
import {
  localizeNewfeedsLocation,
  localizeNewfeedsTitle,
} from "@/lib/newfeedsI18n";
import { type NeptunLiveThreat } from "@/lib/neptun";
import { SoundEffectsBridge } from "@/components/SoundEffectsBridge";
import {
  AIR_RAID_FLY_ALTITUDE,
  AIR_RAID_FLY_MS,
  AIR_RAID_FOCUS_HATCH_MS,
  AIR_RAID_SIREN_DELAY_MS,
  buildAirRaidFocusBox,
  buildAirRaidFocusHatchPaths,
  playAirRaidSirenAfterFly,
  type AirRaidFocusBox,
  type AirRaidSirenKind,
} from "@/lib/airRaidFocus";
import {
  buildFirmsCombatHotspots,
  classifyFirmsFireForSound,
} from "@/lib/firmsSoundClassify";
import { filterFirmsToTheaters } from "@/lib/firmsTheaters";
import { useDataSync } from "@/hooks/useDataSync";
import { useGlobeStaticLayers } from "@/hooks/useGlobeStaticLayers";
import { useMaritimeRoutePaths } from "@/hooks/useMaritimeRoutePaths";
import { useLayerPrefsController } from "@/hooks/useLayerPrefsController";
import {
  applyViewPackages,
  DEFAULT_PACKAGE_SELECTION,
  viewerModeFromPackages,
  type MergedViewConfig,
  type ViewPackageId,
  type ViewPackageUi,
  type ViewTheaterChoice,
  type ViewerMode,
} from "@/lib/viewPackages";
import { applyViewerMode, getViewerChrome, stripEconomyGeopoliticsPatch } from "@/lib/viewerChrome";
import {
  patchFromNewsInsightIds,
  resolveFlyHint,
  type NewsInsightMode,
} from "@/data/newsInsightCatalog";
import {
  DEFAULT_BASEMAP_MODE,
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
  ultraLiteGdeltPinScale,
} from "@/lib/ultraLiteMode";
import {
  buildDomainOverviewPrefs,
  ENTRY_GATE,
  entryOrbitCamera,
} from "@/lib/entryOverview";
import { globeDistanceForAltitude } from "@/lib/globeCamera";
import { globeOrbitMaxAltitude } from "@/lib/globeFillScreen";
import {
  applyBattlefieldPreset,
  battlefieldZoneFromExplorationId,
  detectBattlefieldZone,
  type BattlefieldZone,
} from "@/lib/battlefieldPresets";
import {
  hotTheaterSessionConsumed,
  markHotTheaterSessionApplied,
  resolveHotTheaterFocus,
  type HotTheaterFocus,
} from "@/lib/hotTheaterLayers";
import { resolveTensionCutNav } from "@/lib/tensionSpikeCut";
import {
  markInterestSoftApplyToday,
  resolveInterestSoftApply,
} from "@/lib/interest/applyFromInterest";
import {
  applyLayerPatch,
  hubBriefingLayers,
  liveBriefingLabel,
  type LiveBriefingSession,
} from "@/lib/eventBriefingSession";
import {
  eastAsiaAdizToPaths,
  isEastAsiaAdizVisibleAtAltitude,
} from "@/lib/eastAsiaAdiz";
import { axisNetworkToPaths } from "@/lib/axisNetworkPaths";
import { briTradePathsToTransport } from "@/lib/briTradePaths";
import { getCorridorLod } from "@/lib/corridorLod";
import { strategicCorridorPathsForLod, sanctionsEvasionCorridorPathsForLod } from "@/lib/strategicCorridorPaths";
import {
  usDfcSupplyPathsToTransport,
} from "@/lib/usDfcSupplyPaths";
import { paintAxisHubCountriesGeoJson } from "@/lib/axisHubCountryPolygons";
import { paintAlliedBlocCountriesGeoJson } from "@/lib/alliedBlocCountryPolygons";
import { paintGeoEconBlocCountriesGeoJson } from "@/lib/geoeconBlocCountryPolygons";
import {
  armsPairsToPaths,
  filterArmsForHub,
  type AxisArmsPayload,
} from "@/lib/axisArmsPaths";
import { type AxisHubId } from "@/data/axisNetwork";
import { hubById, selectionForArms, selectionForHubNetwork, type HubClaim } from "@/data/hubNav";
import {
  preferredAxisHub,
  selectedAxisLinkFromPath,
  type SelectedAxisLink,
} from "@/lib/axisLinkSelection";
import {
  selectedCorridorFromPath,
  type SelectedCorridor,
} from "@/lib/corridorSelection";
import { trackEvent } from "@/lib/trackClient";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import {
  altitudeFromEpisodeZoom,
  episodeLat,
  episodeLng,
  frictionEpisodeById,
  frictionEpisodeWarGeometry,
  hubColorForLens,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";
import { useLazyJsonObject } from "@/hooks/useLazyJson";
import type { FeatureCollection } from "geojson";
import { getGlobeTextures } from "@/lib/mapStyles";
import { setActiveBasemapTone, type BasemapTone } from "@/lib/basemapTone";
import { isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import { filterMajorCityLabels } from "@/lib/placeLod";
import {
  resolveBottomAlertPanel,
  shouldClosePanelOnDataError,
  shouldCloseLocalForGdelt,
} from "@/lib/localOverlayPolicy";
import {
  HEATMAP_UPDATE_CADENCE_MS,
  LABEL_UPDATE_CADENCE_MS,
  PATH_UPDATE_CADENCE_MS,
} from "@/lib/globePerformance";
import { useCameraViewport } from "@/hooks/useCameraViewport";
import {
  COUNTRY_POLYGON_MAX_BY_TIER,
  DISPUTE_MAX_BY_TIER,
  FIRMS_FIRE_MAX_BY_TIER,
  VIEWPORT_RADIUS_BY_TIER,
  filterByViewportCenter,
  isBboxNearView,
  isCenterInView,
} from "@/lib/viewportCull";
import {
  pickDisputeAlerts,
  type DisputeAlert,
} from "@/lib/disputeAlerts";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import {
  conflictZoneToOutlineAndHatchPaths,
  disputeGeometryBbox,
  disputeMatchesWarDiplomaticLayers,
  geometryToAccentOutlineAndHatch,
  rankDisputesForDisplay,
  TENSION_GRADE_STYLES,
} from "@/lib/disputeHatch";
import { getCachedDisputeHatchPaths } from "@/lib/disputeHatchCache";
import { buildDisputeHotspots, type DisputeHotspotEntry } from "@/lib/disputeHotspots";
import { selectViinaPolygons } from "@/lib/viinaLod";
import {
  prefetchUkraineControl,
  readUkraineControlCache,
} from "@/lib/viinaPrefetch";
import { prefetchNeptun } from "@/lib/neptunPrefetch";
import { buildViinaFrontEvents, type ViinaFrontEvent } from "@/lib/viinaFrontEvents";
import {
  buildUkraineMacroGeoJson,
  buildUkraineMacroSeedGeoJson,
  buildUkraineMicroGeoJson,
  buildUkraineMicroSeedGeoJson,
  emptyUkraineFrontGeoJson,
} from "@/lib/ukraineFrontGeojson";
import { filterHatchPathsByView } from "@/lib/ukraineHatchPrecompute";
import {
  prefetchDisputeHatchPaths,
  readDisputeHatchPathsCache,
} from "@/lib/disputeHatchPrefetch";
import type { DisputeHatchLod } from "@/lib/disputeHatchPrecompute";
import {
  isInUkraineTheater,
} from "@/lib/ukraineSettlementLabels";
import {
  KOREA_MISSILE_BELTS,
} from "@/data/koreaMissileBeltSeed";
import {
  CHINA_MISSILE_BELTS,
  isNearChinaMissileBelt,
} from "@/data/chinaMissileBeltSeed";
import {
  RUSSIA_MISSILE_BELTS,
  isNearRussiaMissileBelt,
} from "@/data/russiaMissileBeltSeed";
import {
  RUSSIA_NAVAL_BASTION_BELTS,
  isNearRussiaNavalBastion,
} from "@/data/russiaNavalBastionSeed";
import {
  IRAN_MISSILE_BELTS,
  isNearIranMissileBelt,
} from "@/data/iranMissileBeltSeed";
import { type ChinaTheaterDyad } from "@/data/chinaTheaterIncidentsSeed";
import {
  activateChinaTheaterIncidents,
  activateKoreaMissileIncidents,
  activateRussiaStrikeIncidents,
  activateEuropeDroneIncidents,
} from "@/lib/neonIncidentActivation";
import { provenanceFromActivation } from "@/lib/eventProvenance";
import { resolveCombatTheaterAt } from "@/lib/theaterCombat";
import {
  HAPI_CASUALTY_SEED,
  type HapiConflictCasualtiesPayload,
} from "@/lib/hapiConflictCasualties";
import {
  MEDIAZONA_CASUALTY_SEED,
  type MediazonaCasualtySnapshot,
} from "@/lib/mediazonaCasualties";
import {
  applyCasualtyOverlayMetrics,
  getCasualtyOverlayScale,
} from "@/lib/warCasualtyOverlay";
import {
  applyNuclearOverlayScale,
  getNuclearOverlayScale,
} from "@/lib/nuclearStockpiles";
import type {
  AisVessel,
  AppData,
  ConflictEvent,
  ConflictZoneFeature,
  CountryFeature,
  DisputeArea,
  FirmsFire,
  MilitaryAircraft,
  SearchPlace,
  StaticPoint,
  TransportPath,
  UkraineControlData,
  UkraineControlZone,
  UkraineSettlement,
  UsCarrier,
} from "@/data/geoTypes";
import {
  isFreshEvent,
  scoreEvents,
  type ScoredEvent,
} from "@/data/eventTiers";
import {
  frictionDeepDoc,
  type FrictionTimelineStage,
} from "@/data/frictionEpisodeDeep";
import {
  altitudeFromTerritorialZoom,
  territorialDeepDoc,
  territorialEpisodeLat,
  territorialEpisodeLng,
  territorialEpisodeWarGeometry,
} from "@/data/territorialDisputeDeep";
import {
  territorialEpisodeById,
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
  readBottomDockMode,
  writeBottomDockMode,
  type BottomDockMode,
} from "@/components/BottomDockModeToggle";
import {
  isUkraineNavId,
  navIdForNewsTheater,
  navSelectionFromId,
  theaterFocusFromNav,
  type TheaterSidebarTab,
} from "@/lib/theaterFocus";
import {
  flyTargetForTheater,
  newsTheaterFromCoords,
  THEATER_FLY_TO,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import {
  isMapDisplayableShipObservation,
  shipMovementHtmlMarkers,
  shipMovementPulseRings,
  shipMovementTrailPaths,
} from "@/lib/shipMovements/globeOverlay";
import {
  groupKeyForObservation,
  observationsForGroupKey,
  vesselTrackFlyTarget,
  type ShipTrailMode,
} from "@/lib/shipMovements/shipMovementBrief";
import {
  buildPlaIncursionHeatPaths,
  type CrossStraitSignalPayload,
} from "@/lib/crossStraitSignal";
import type { ReefWatchPayload } from "@/lib/reefWatch";
import {
  reefWatchFeatureHtmlMarkers,
  reefWatchTrafficHtmlMarkers,
} from "@/lib/reefWatchMarkers";

import { LogisticsStressCard } from "@/components/LogisticsStressCard";
import { stressForChokepoint } from "@/lib/chokepointStressForUi";
import { chokeStressHex } from "@/lib/chokeStressColor";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { usePortWatchObservations } from "@/hooks/usePortWatchObservations";
import { useLogisticsStressSiren } from "@/components/globe/hooks/useLogisticsStressSiren";
import { useAdsbEmergencyAlert } from "@/components/globe/hooks/useAdsbEmergencyAlert";
import { useNatoPerimeterDroneAlert } from "@/components/globe/hooks/useNatoPerimeterDroneAlert";
import { useUltraLiteAutoOffer } from "@/hooks/useUltraLiteAutoOffer";
import { useScreenState } from "@/components/globe/hooks/useScreenState";
import { useFirstImpressionController } from "@/hooks/useFirstImpressionController";
import { useLiveGeoFeedPolling } from "@/components/globe/hooks/useLiveGeoFeedPolling";
import type {
  ChinaTheaterIncidentHtmlMarker,
  ConflictClusterPoint,
  EntryGate,
  FirmsFireGlobePoint,
  FrictionPinHtmlMarker,
  FrictionStageHtmlMarker,
  GlobeDashboardProps,
  GlobeDisplayPoint,
  GlobeLabel,
  GlobePoint,
  GlobeSize,
  HtmlOverlayMarker,
  KoreaMissileIncidentHtmlMarker,
  RussiaStrikeIncidentHtmlMarker,
  EuropeDroneIncidentHtmlMarker,
  NewsStreamNeonMarker,
  NewsInsightCalloutMarker,
  NewfeedsAttackGlobePoint,
  UkraineTheaterIntensityGlobePoint,
  PolygonLayerFeature,
  PulseRingPoint,
  StaticGlobePoint,
  TzevaAdomGlobePoint,
  Selection,
} from "@/components/globe/types";
import {
  armsEmbargoStroke,
  infraColors,
  pathLayerColors,
  EMPTY_LAYER_CATEGORIES,
  EMPTY_OVERLAY_POLYGONS,
  HEATMAP_MEANINGFUL_DELTA,
  INTRO_CAMERA_DELAY_MS,
  INTRO_CAMERA_DURATION_MS,
  INTRO_SESSION_KEY,
  LABEL_MEANINGFUL_DELTA,
  PATH_MEANINGFUL_DELTA,
  emptyData,
} from "@/components/globe/constants";
import { geometryToBorderPaths } from "@/components/globe/geometryToBorderPaths";
import {
  overlayPolygonsEqual,
} from "@/components/globe/overlayPolygons";
import {
  markWelcomeGateDone,
  markLangChoiceDone,
  readWelcomeGateDone,
  readSourcesGateDone,
  readLangChoiceDone,
} from "@/components/globe/formatters";
import {
  getStableLodTier,
} from "@/components/globe/htmlOverlayPointerEvents";
import { createDashboardHtmlOverlayElement } from "@/components/globe/markers/createDashboardHtmlOverlayElement";
import { GlobeMapCanvas } from "@/components/globe/GlobeMapCanvas";
import { useGlobeMapGlobeProps } from "@/components/globe/hooks/useGlobeMapGlobeProps";
import { DashboardTopChrome } from "@/components/globe/DashboardTopChrome";
import { MapZoomControl } from "@/components/MapZoomControl";
import { useGlobeCamera } from "@/components/globe/hooks/useGlobeCamera";
import { useTheaterNavigation } from "@/components/globe/hooks/useTheaterNavigation";
import { LayerPanelHost } from "@/components/globe/LayerPanelHost";

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
  /** 지정학↔지경학 전환 — 접힘·주간 대기 없이 등불 즉시 재점화 */
  const lampModeSwitchPendingRef = useRef(false);
  const prevViewerModeRef = useRef<ViewerMode | null>(null);
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
  const [layerDropdownOpen, setLayerDropdownOpen] = useState(false);
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
  const [bottomDockMode, setBottomDockMode] = useState<BottomDockMode>("history");
  const [layerPanelReady, setLayerPanelReady] = useState(false);
  const [frozenPanelCategories, setFrozenPanelCategories] = useState<LayerCategory[] | null>(null);

  useEffect(() => {
    setBottomDockMode(readBottomDockMode());
  }, []);

  /** openIntelSheet 정의 후에 실제 핸들러로 교체 (뉴스 클릭 → 시트 오픈) */
  const bottomDockModeChangeRef = useRef<(mode: BottomDockMode) => void>((mode) => {
    setBottomDockMode(mode);
    writeBottomDockMode(mode);
    if (mode === "history") setIntelSheetOpen(false);
  });
  const handleBottomDockModeChange = useCallback((mode: BottomDockMode) => {
    bottomDockModeChangeRef.current(mode);
  }, []);

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
  const viewerMode = viewerModeFromPackages(viewPackages);
  const viewerChromePreset = getViewerChrome(viewerMode);
  const isEconomyViewer = viewerMode === "economy";
  const isCompactUi = useCompactUi();
  // 폰: 지구본을 mount하지 않고 텍스트/알림 뷰만. 태블릿/데스크톱만 3D 지구본.
  const isPhoneUi = usePhoneUi();
  const deviceProfile = useDeviceProfile();
  const isTabletUi = deviceProfile === "tablet";
  const isDesktopWideUi = deviceProfile === "desktop-wide";

  /** 히스토리 독일 때 인텔 스택이 언마운트되므로 clearance를 스크럽+토글 높이로 직접 맞춤 */
  useEffect(() => {
    if (bottomDockMode !== "history" || intelSheetOpen) return;
    document.documentElement.style.setProperty(
      "--bottom-intel-stack-clearance",
      isCompactUi
        ? INTEL_STACK_CLEARANCE_HISTORY_COMPACT
        : INTEL_STACK_CLEARANCE_HISTORY,
    );
  }, [bottomDockMode, intelSheetOpen, isCompactUi]);
  const [compactChipId, setCompactChipId] = useState<CompactChipId>("frontline");
  /** 일반 모드 시나리오 프리셋 선택 (P2-1) — null이면 직접 구성 상태 */
  const [scenarioPresetId, setScenarioPresetId] = useState<ScenarioPresetId | null>(null);
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
  }, []);

  const [chromeCoachStep, setChromeCoachStep] = useState<ChromeCoachStep | null>(null);
  const [showFirstVisitTour, setShowFirstVisitTour] = useState(false);
  const [frictionCoachStep, setFrictionCoachStep] = useState<FrictionCoachStep | null>(null);
  const frictionCoachAwaitHistoryRef = useRef(false);
  const frictionCoachListAckRef = useRef(false);
  const [showAirRaidCoach, setShowAirRaidCoach] = useState(false);
  const [periodicBriefing, setPeriodicBriefing] = useState<PeriodicBriefing | null>(null);
  /** 접어 둔 오늘의 등불 — 지도는 사용하면서 같은 날 다시 펼칠 수 있음 */
  const [foldedPeriodicBriefing, setFoldedPeriodicBriefing] =
    useState<PeriodicBriefing | null>(null);
  /** 뉴스 네온 — 매체 2개 이상이면 관점 조합 패널 */
  const [newsPerspectives, setNewsPerspectives] = useState<NewsStreamNeonMarker | null>(null);
  /** 뉴스 인사이트 「지도에서 보기」 콜아웃 — 패널 열린 동안만 */
  const [newsInsightCallout, setNewsInsightCallout] =
    useState<NewsInsightCalloutMarker | null>(null);
  const [economyAttackReaction, setEconomyAttackReaction] = useState<{
    ageMinutes: number;
    title: string;
  } | null>(null);
  const [financialHubTick, setFinancialHubTick] = useState(0);
  /** 오늘 등불 파이프라인 종료 여부(표시·스킵·이미 봄). false면 공습/이슈 UI 보류 */
  const [dailyLampSettled, setDailyLampSettled] = useState(false);
  const [weeklyRecap, setWeeklyRecap] = useState<PeriodicBriefing | null>(null);
  const [weeklyRecapCollapsed, setWeeklyRecapCollapsed] = useState(false);
  const [weeklyRecapSettled, setWeeklyRecapSettled] = useState(false);
  const [watchFocusLine, setWatchFocusLine] = useState<string | null>(null);
  const [tomorrowTensionPrompt, setTomorrowTensionPrompt] = useState<DailyPrompt | null>(null);
  /** 인가 강등 위기/강등 칩 */
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceStatus | null>(null);
  /** 강등 칩을 닫았거나 불필요 — 등불보다 우선 */
  const [, setClearanceChipSettled] = useState(false);
  /** 오늘의 WTI — 사운드·등불·예측 기축 */
  const [wtiSnapshot, setWtiSnapshot] = useState<WorldTensionSnapshot | null>(null);
  /** WTI 기준 시각 — 상황판 "as of" 표시용 */
  const [wtiFetchedAt, setWtiFetchedAt] = useState<string | null>(null);
  /** 일별 랭크 스크럽 기준일 (UTC YYYY-MM-DD). null = 오늘 */
  const [viewAsOf, setViewAsOf] = useState<string | null>(null);
  const [rankAvailableDates, setRankAvailableDates] = useState<string[]>([]);
  const livePrefsBeforeHistoryRef = useRef<Partial<Record<string, boolean>> | null>(null);
  const todayUtc = utcRankDate();
  const effectiveAsOf = viewAsOf && viewAsOf !== todayUtc ? viewAsOf : todayUtc;
  const isHistoricalView = effectiveAsOf !== todayUtc;
  const [showTourInvite, setShowTourInvite] = useState(false);
  /** 전역 입장 후 — 핫 지역 이동 선택창 (수락 시에만 fly) */
  const [hotTheaterOffer, setHotTheaterOffer] = useState<HotTheaterFocus | null>(null);
  const [airRaidBriefing, setAirRaidBriefing] = useState<AirRaidBriefingContent | null>(null);
  /** 귀중한 속보 타전 양피지 — S급·고충격만 */
  const [breakingFlash, setBreakingFlash] = useState<BreakingFlashBriefing | null>(null);
  /** 로컬 자정에 바뀜 — 매일 등불·인가 재점화 트리거 */
  const calendarDayKey = useLocalCalendarDayKey();
  /** 6시간 슬롯 — 등불 사진·뉴스 재점화 */
  const lampContentSlot = useLampContentSlotKey();
  const weeklyExpanded = Boolean(weeklyRecap) && !weeklyRecapCollapsed;
  /** 등불 양피지가 떠 있거나 아직 오늘 등불이 끝나지 않으면 공습·이슈 UI 정지 */
  const issueUiPausedForLamp =
    weeklyExpanded || Boolean(periodicBriefing) || !weeklyRecapSettled || !dailyLampSettled;
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
  const [showViewerIntro, setShowViewerIntro] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
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
  /** 양피지 나오기 전 — 반투명 로딩으로 “곧 뜬다” 암시 */
  const showLampPreparing =
    !isLoading &&
    !loadError &&
    globeReady &&
    entryGate === null &&
    !showModePicker &&
    langChoiceChecked &&
    langChoiceDone &&
    issueUiPausedForLamp &&
    !periodicBriefing &&
    !weeklyExpanded;
  const showLanguageGate =
    langChoiceChecked &&
    !langChoiceDone &&
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
    !isEconomyViewer && globeReady,
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
  const [shipMovesLoading, setShipMovesLoading] = useState(false);
  const [shipMovesDisclaimer, setShipMovesDisclaimer] = useState<string | null>(null);
  const [shipMovesSelectedId, setShipMovesSelectedId] = useState<string | null>(null);
  const [shipMovesTrailMode, setShipMovesTrailMode] = useState<ShipTrailMode>("fleet");
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
    batchPending,
    applyGeneration,
    immediateUntilRef,
  } = useLayerPrefsController(deferLayerMapApplyRef, { ultraLiteRef });

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

  const handleBasemapModeChange = useCallback((mode: BasemapMode) => {
    setBasemapMode(mode);
    savePerfPrefs({ basemapMode: mode });
  }, []);

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

  /** 모드 전환 — 이전 등불 내리고 대상 모드 등불을 바로 띄울 준비 */
  const prepareLampForModeSwitch = useCallback(
    (targetMode: ViewerMode) => {
      setPeriodicBriefing(null);
      setFoldedPeriodicBriefing(null);
      setDailyLampSettled(false);
      lampModeSwitchPendingRef.current = true;
      const { contentSlot } = resolveLampPeriod();
      const slot = lampContentSlot.startsWith("daily-") ? lampContentSlot : contentSlot;
      clearLampFolded(lampSeenKey(slot, targetMode));
    },
    [lampContentSlot],
  );

  // 일자 전환 — 등불·주간·인가 게이트 전체 재시작
  useEffect(() => {
    setPeriodicBriefing(null);
    setFoldedPeriodicBriefing(null);
    setNewsPerspectives(null);
    setEconomyAttackReaction(null);
    setDailyLampSettled(false);
    setWeeklyRecap(null);
    setWeeklyRecapCollapsed(false);
    setWeeklyRecapSettled(false);
    setTomorrowTensionPrompt(null);
    setShowAirRaidCoach(false);
    setClearanceChipSettled(false);
    setClearanceStatus(null);
  }, [calendarDayKey]);

  // 모드 전환 — 등불만 즉시 재점화 (주간·인가는 유지)
  useEffect(() => {
    if (prevViewerModeRef.current === null) {
      prevViewerModeRef.current = viewerMode;
      return;
    }
    if (prevViewerModeRef.current === viewerMode) return;
    prevViewerModeRef.current = viewerMode;
    prepareLampForModeSwitch(viewerMode);
  }, [viewerMode, prepareLampForModeSwitch]);

  // 6시간 슬롯만 바뀌면 등불만 재점화 (주간·인가는 유지)
  useEffect(() => {
    setPeriodicBriefing(null);
    setFoldedPeriodicBriefing(null);
    setDailyLampSettled(false);
  }, [lampContentSlot]);

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

  const handleCompactChipSelect = useCallback(
    (chipId: CompactChipId) => {
      setCompactChipId(chipId);
      ultraLiteRef.current = true;
      setUltraLite(true);
      applyLayerPrefs(buildCompactPrefs(viewerMode, chipId, layerPrefsLiveRef.current));
    },
    [applyLayerPrefs, viewerMode],
  );

  /** 뷰어 모드가 바뀌면 다른 도메인의 프리셋 선택은 무효 (P2-1) */
  useEffect(() => {
    setScenarioPresetId((prev) => {
      if (!prev) return prev;
      return findScenarioPreset(prev)?.mode === viewerMode ? prev : null;
    });
  }, [viewerMode]);

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
    // chipId intentionally omitted — selection goes through handleCompactChipSelect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyLayerPrefs, isCompactUi, viewerMode]);

  /** 뷰어 모드가 바뀌면 다른 도메인의 프리셋 선택은 무효 (P2-1) */
  useEffect(() => {
    setScenarioPresetId((prev) => {
      if (!prev) return prev;
      return findScenarioPreset(prev)?.mode === viewerMode ? prev : null;
    });
  }, [viewerMode]);

  const handlePanelDraftPatch = useCallback(
    (patch: Partial<LayerPrefs>) => {
      pinUserLayers();
      // 손으로 하나라도 건드린 순간 그 화면은 더 이상 프리셋이 아니다 (P2-1)
      setScenarioPresetId(null);
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

  const confirmLayerPanelDraft = useCallback(() => {
    deferLayerMapApplyRef.current = false;
    applyLayerPrefs(draftPrefs);
    panelDraftPatchRef.current = {};
    panelOpenSnapshotRef.current = { ...draftPrefs };
    setLayerPanelDirty(false);
  }, [applyLayerPrefs, draftPrefs]);

  const cancelLayerPanelDraft = useCallback(() => {
    const snap = panelOpenSnapshotRef.current;
    if (snap) {
      deferLayerMapApplyRef.current = false;
      applyLayerPrefs(snap);
    } else {
      discardDraftPrefs();
    }
    panelDraftPatchRef.current = {};
    setLayerPanelDirty(false);
    layerPanelSessionRef.current += 1;
    // frozen 카테고리 체크 UI를 커밋 상태로 다시 맞춤
    categorySnapshotRef.current = null;
    setFrozenPanelCategories(null);
  }, [applyLayerPrefs, discardDraftPrefs]);

  const {
    showWarZones,
    showDiplomaticTension,
    showCityLabels,
    showRailGlow,
    showAis,
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
    showEuropeDroneIncidents,
    showNeptun,
    showNeptunPreviousTrails,
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
  const setShowAis = (v: boolean) => togglePref("showAis", v);
  const setShowDisguisedVessels = (v: boolean) => togglePref("showDisguisedVessels", v);
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
  const setShowMilitaryActivity = (v: boolean) => togglePref("showMilitaryActivity", v);
  const setShowAirTraffic = (v: boolean) => togglePref("showAirTraffic", v);
  const setShowUsCarriers = (v: boolean) => togglePref("showUsCarriers", v);
  const setShowWeeklyShipMoves = (v: boolean) => togglePref("showWeeklyShipMoves", v);
  const setShowReefWatch = (v: boolean) => togglePref("showReefWatch", v);
  const setShowSpaceLaunches = (v: boolean) => togglePref("showSpaceLaunches", v);
  const setShowReconSatellites = (v: boolean) => togglePref("showReconSatellites", v);
  const gpsJamSoloSnapshotRef = useRef<LayerPrefs | null>(null);
  const setShowGpsInterference = (v: boolean) => {
    if (v) {
      if (!layerPrefs.showGpsInterference) {
        gpsJamSoloSnapshotRef.current = { ...layerPrefs };
      }
      applyLayerPrefs({
        ...layerPrefs,
        ...buildGpsJamSoloPatch(layerPrefs),
      });
      return;
    }
    const snap = gpsJamSoloSnapshotRef.current;
    gpsJamSoloSnapshotRef.current = null;
    if (snap) {
      applyLayerPrefs({ ...snap, showGpsInterference: false });
    } else {
      togglePref("showGpsInterference", false);
    }
  };
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
      setLangChoiceDone(true);
      // 언어 확정 후 입장 게이트 — caution → welcome → sources → domain
      if (!readWelcomeGateDone()) {
        if (!readSourcesGateDone()) {
          setEntryGate("caution");
        } else {
          setEntryGate("domain");
        }
      }
    },
    [togglePref],
  );

  const [regionNavSelection, setRegionNavSelection] = useState<NavSelection | null>(null);
  const [hubBriefOpen, setHubBriefOpen] = useState(false);
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
  const [econInsightOpen, setEconInsightOpen] = useState(false);
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
  const [frictionEpisodeBrief, setFrictionEpisodeBrief] = useState<FrictionEpisode | null>(null);
  const [frictionActiveStageId, setFrictionActiveStageId] = useState<string | null>(null);
  const frictionEpisodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyImmersionRef = useRef(false);
  /** 분쟁사(regime) 창 안 — 나가기 버튼 전엔 regionNav/모드/줌아웃 탈출 금지 */
  const historyStoryLockedRef = useRef(false);
  /** 양피지 이후 실시간 중계 — 레이어 스냅샷 복원용 */
  const [liveBriefingSession, setLiveBriefingSession] = useState<LiveBriefingSession | null>(null);

  const activeHubId = regionNavSelection?.hubId ?? null;
  const hubFocusMode = regionNavSelection?.focusMode ?? null;
  const historyImmersionActive =
    hubFocusMode === "regime" ||
    (hubFocusMode === "disputes" &&
      Boolean(
        regimeSelectedEpisodeId ||
          frictionEpisodeBrief ||
          disputeEpisodeSelectedId ||
          territorialEpisodeBrief,
      ));
  const westpacPulseActive = hubFocusMode === "westpac-pulse";
  const disputesOverviewActive = hubFocusMode === "disputes";
  const showShipMovesLayer = showWeeklyShipMoves || westpacPulseActive;
  /** 목록·에피소드 공통 — 나가기 전까지 잠금 */
  const historyStoryLocked = historyImmersionActive;
  /** 에피소드 스토리 중 — 카메라 회전 제한 */
  const historyEpisodeActive = Boolean(
    historyImmersionActive && (regimeSelectedEpisodeId || frictionEpisodeBrief),
  );
  historyImmersionRef.current = historyImmersionActive;
  historyStoryLockedRef.current = historyStoryLocked;

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
    historyImmersionActive,
    historyEpisodeActive,
  });

  /**
   * 시나리오 프리셋 선택 (P2-1).
   *
   * 핵심은 **단일 커밋**이다. 레이어를 하나씩 `patchLayerPrefsSoft`로 넣으면
   * 8~10번의 debounce·재계산이 누적돼 프리셋 자체가 느려진다. 이미 완성된
   * prefs 객체를 `applyLayerPrefs` 한 번으로 넘겨야 도허티 임계 안에 들어온다.
   *
   * 카메라 이동은 레이어 적용 **뒤**에 건다 — 순서가 반대면 비어 있는 화면으로
   * 날아간 다음 레이어가 뒤늦게 나타난다.
   *
   * (`flyTo`가 useGlobeCamera에서 나오므로 이 훅은 반드시 그 아래에 있어야 한다.)
   */
  const handleScenarioPresetSelect = useCallback(
    (id: ScenarioPresetId) => {
      const preset = findScenarioPreset(id);
      if (!preset) return;

      setScenarioPresetId(id);
      pinUserLayers();

      const built = buildScenarioPrefs(preset, layerPrefsLiveRef.current, ultraLiteRef.current);
      applyLayerPrefs(built);

      flyTo(preset.camera.lat, preset.camera.lng, preset.camera.altitude);
    },
    [applyLayerPrefs, flyTo, pinUserLayers],
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

  const beginLiveBriefing = useCallback(
    (
      kind: LiveBriefingSession["kind"],
      patch: Parameters<typeof applyLayerPatch>[1],
      placeLabel: string,
    ) => {
      setLiveBriefingSession((prev) => {
        const snapshot = prev?.snapshot ?? { ...layerPrefsLiveRef.current };
        const labels = liveBriefingLabel(kind, placeLabel);
        applyLayerPrefs(applyLayerPatch({ ...layerPrefsLiveRef.current }, patch));
        return {
          kind,
          snapshot,
          labelKo: labels.ko,
          labelEn: labels.en,
        };
      });
    },
    [applyLayerPrefs],
  );

  const exitHistoryImmersion = useCallback(() => {
    clearFrictionEpisodeTimer();
    clearTerritorialSequence();
    clearHubBriefTimer();
    historyStoryLockedRef.current = false;
    setFrictionEpisodeBrief(null);
    setRegimeSelectedEpisodeId(null);
    setFrictionActiveStageId(null);
    setDisputeEpisodeSelectedId(null);
    setTerritorialEpisodeBrief(null);
    setTerritorialActiveStageId(null);
    setTerritorialRevealedStageIds([]);
    setHubBriefOpen(false);
    setRegionNavSelection(null);
    setFrictionCoachStep(null);
    frictionCoachAwaitHistoryRef.current = false;
    frictionCoachListAckRef.current = false;
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.maxDistance = globeDistanceForAltitude(
        globeOrbitMaxAltitude(size.width, size.height),
      );
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
    }
  }, [clearFrictionEpisodeTimer, clearHubBriefTimer, clearTerritorialSequence, size.height, size.width]);

  const handleFrictionCoachStepChange = useCallback((next: FrictionCoachStep | null) => {
    setFrictionCoachStep((prev) => {
      if (prev === "list" && next === null) {
        frictionCoachListAckRef.current = true;
        if (shouldOfferFrictionCoach()) {
          frictionCoachAwaitHistoryRef.current = true;
        } else {
          frictionCoachAwaitHistoryRef.current = false;
        }
      }
      if (next === null && !shouldOfferFrictionCoach()) {
        frictionCoachAwaitHistoryRef.current = false;
      }
      return next;
    });
  }, []);

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
    setHubBriefOpen(false);
    const sel = regionNavSelection;
    if (!sel) return;
    // 분쟁사는 역사 창 유지 — 실시간 중계 데스크로 전환하지 않음
    if (sel.focusMode === "regime" || sel.focusMode === "westpac-pulse") return;
    const place = sel.label || sel.id;
    beginLiveBriefing("hub", hubBriefingLayers(sel.id), place);
  }, [beginLiveBriefing, regionNavSelection]);

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

  const axisLinkOpenNews = useCallback(() => {
    const link = selectedAxisLink;
    trackEvent("axis_link_cta_news", {
      pathId: link?.pathId,
      from: link?.from,
      to: link?.to,
    });
    setShowGdeltAlliance(true);
    setShowGdeltDiplomatic(true);
    setSelectedAxisLink(null);
  }, [selectedAxisLink]);

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
  /** NE 10m 고정밀 — 지구본 첫 프레임 이후 idle에 로드 (부트 JSON.parse 정체 방지) */
  const { data: axisHubCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "axis-hub-countries.json",
    !isEconomyViewer && globeReady,
    parseAxisHubCountries,
    { deferUntilIdle: true },
  );
  const parseAlliedBlocCountries = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  /** 진영 블록 배경색 — 토글 켰을 때만 로드 (기본 OFF) */
  const { data: alliedBlocCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "allied-bloc-countries.json",
    !isEconomyViewer && showAlliedBlocs && globeReady,
    parseAlliedBlocCountries,
    { deferUntilIdle: true },
  );
  const parseGeoEconBlocCountries = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  /** 지경학 진영 음영 — 지경학 모드에서만, 토글 켰을 때만 로드 */
  const { data: geoEconBlocCountriesSource } = useLazyJsonObject<FeatureCollection>(
    "geoecon-bloc-countries.json",
    isEconomyViewer && showGeoEconBlocs && globeReady,
    parseGeoEconBlocCountries,
    { deferUntilIdle: true },
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
    enabled: showReconSatellites && !isEconomyViewer,
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
    if (ukraineTurnedOn && viinaMeta?.available) {
      ukraineZoomPendingRef.current = true;
    }
    if (neptunTurnedOn) {
      neptunZoomPendingRef.current = true;
    }
    immediateUntilRef.current = Date.now() + 1800;
  }, [showNeptun, showUkraineControl, viinaMeta?.available, immediateUntilRef]);

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
    enabled: showGpsInterference && !isEconomyViewer,
    view: layerViewState,
    radiusDeg: VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 8,
  });

  // 드래프트·다른 경로로 GPSJam ON 된 경우에도 솔로 강제
  useEffect(() => {
    if (!showGpsInterference || isEconomyViewer) return;
    const patch = buildGpsJamSoloPatch(layerPrefs);
    const extra = Object.keys(patch).filter((k) => k !== "showGpsInterference");
    if (extra.length === 0) return;
    if (!gpsJamSoloSnapshotRef.current) {
      gpsJamSoloSnapshotRef.current = { ...layerPrefs, showGpsInterference: false };
    }
    patchLayerPrefsSoft(patch);
  }, [showGpsInterference, isEconomyViewer, layerPrefs, patchLayerPrefsSoft]);

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
    layerViewState,
    globeTier: globeLod.tier,
    isCameraMoving,
    immediateUntilRef,
  });

  /** 전선 레이어 ON 또는 우크라이나 극동부를 확대해 볼 때 하단 UI 전환 */
  /**
   * 좌하단 텔레그램 OSINT 미니 패널 — 우측 속보/선택과 독립.
   * (다른 크롬을 위로 밀지 않음 · ✕로만 닫기)
   */
  const telegramMiniPanelVisible =
    showTelegramOsint && !isEconomyViewer && !intelSheetOpen && !isCompactUi;

  const isUkraineTheaterFocus = useMemo(() => {
    if (showUkraineControl) return true;
    if (!isInUkraineTheater(filterCenter.lat, filterCenter.lng)) return false;
    return layerAltitude <= 1.1;
  }, [filterCenter.lat, filterCenter.lng, layerAltitude, showUkraineControl]);

  /** VIINA 근접 줌 — 폴리곤 raycast·라벨 부하 완화 구간 */
  const isViinaCloseZoom =
    globeLod.tier === "near" || globeLod.tier === "village";

  /** VIINA 근접 줌 — 폴리곤 fill 레이캐스트 제외 (수천 정점 hover 피킹 방지) */
  const mapInteractiveLayerIds = useMemo(
    () =>
      isViinaCloseZoom && showUkraineControl
        ? (["map-points", "map-gem-facilities", "map-paths", "map-rings", "firms-flame"] as const)
        : ([
            "map-points",
            "map-gem-facilities",
            "map-paths",
            "map-polygons-fill",
            "map-rings",
            "firms-flame",
          ] as const),
    [isViinaCloseZoom, showUkraineControl],
  );

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
    showLsibBoundary: showLsibBoundary && globeReady,
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

  const countryPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    const withGeometry = (data.countries ?? []).filter((country) => Boolean(country.geometry));
    if (isVectorBaseMap) {
      return withGeometry.map((country) => ({ ...country, polygonLayer: "country" as const }));
    }
    // 서버 뷰포트 응답이 있으면 그걸 우선 (전체 countries geometry 미보유)
    if (viewportCountries.length > 0) {
      return viewportCountries.map((country) => ({
        ...country,
        polygonLayer: "country" as const,
      }));
    }
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const maxCount = COUNTRY_POLYGON_MAX_BY_TIER[globeLod.tier];
    const visible = filterByViewportCenter(
      withGeometry,
      layerViewState,
      radiusDeg,
      maxCount,
      (a, b) => (b.population ?? 0) - (a.population ?? 0),
    );
    return visible.map((country) => ({ ...country, polygonLayer: "country" as const }));
  }, [
    data.countries,
    globeLod.tier,
    isVectorBaseMap,
    layerViewState,
    viewportCountries,
  ]);

  const disputeHatchLod: DisputeHatchLod =
    globeLod.tier === "global" || globeLod.tier === "continent" ? "overview" : "detail";
  const [disputeHatchCachePaths, setDisputeHatchCachePaths] = useState<TransportPath[]>(
    () => readDisputeHatchPathsCache(disputeHatchLod)?.paths ?? [],
  );

  useEffect(() => {
    if (!showAnyDisputeOverlay || !globeReady) return;
    let cancelled = false;
    const cached = readDisputeHatchPathsCache(disputeHatchLod);
    if (cached?.paths?.length) setDisputeHatchCachePaths(cached.paths);
    void prefetchDisputeHatchPaths(disputeHatchLod).then((payload) => {
      if (cancelled || !payload?.paths?.length) return;
      setDisputeHatchCachePaths(payload.paths);
    });
    return () => {
      cancelled = true;
    };
  }, [disputeHatchLod, globeReady, showAnyDisputeOverlay]);

  const overlayPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    const layers: PolygonLayerFeature[] = [];

    // 우크라이나 점령·주장: MapLibre macro/micro GeoJSON — deck.gl overlay 면 없음

    if (showGpsInterference && gpsJamPolygons.length > 0) {
      layers.push(...gpsJamPolygons);
    }

    if (!showGpsInterference && showMilitaryBases && visibleMilitaryBaseAreas.length > 0) {
      layers.push(
        ...visibleMilitaryBaseAreas.map((area) => ({
          ...area,
          polygonLayer: "military-base" as const,
        })),
      );
    }
    if (
      !showGpsInterference &&
      showResources &&
      visibleResourceDeposits.length > 0
    ) {
      layers.push(
        ...visibleResourceDeposits.map((area) => ({
          ...area,
          polygonLayer: "resource-deposit" as const,
        })),
      );
    }
    if (
      !showGpsInterference &&
      showMissileSiloFields &&
      visibleMissileSiloFields.length > 0
    ) {
      layers.push(
        ...visibleMissileSiloFields.map((area) => ({
          ...area,
          polygonLayer: "missile-silo-field" as const,
        })),
      );
    }

    // 미사일 벨트 — 지정학에서 해당 권역이면 자동 표시 (레이어 토글 불필요)
    if (
      !showGpsInterference &&
      !isEconomyViewer &&
      (globeLod.tier === "continent" ||
        globeLod.tier === "regional" ||
        globeLod.tier === "near" ||
        globeLod.tier === "village")
    ) {
      const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
      if (theater === "korea") {
        for (const belt of KOREA_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearChinaMissileBelt(filterCenter.lat, filterCenter.lng)) {
        for (const belt of CHINA_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearRussiaMissileBelt(filterCenter.lat, filterCenter.lng)) {
        for (const belt of RUSSIA_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearRussiaNavalBastion(filterCenter.lat, filterCenter.lng)) {
        for (const belt of RUSSIA_NAVAL_BASTION_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearIranMissileBelt(filterCenter.lat, filterCenter.lng)) {
        for (const belt of IRAN_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
    }

    return layers.length > 0 ? layers : EMPTY_OVERLAY_POLYGONS;
  }, [
    showGpsInterference,
    gpsJamPolygons,
    showMilitaryBases,
    visibleMilitaryBaseAreas,
    showResources,
    visibleResourceDeposits,
    showMissileSiloFields,
    visibleMissileSiloFields,
    isEconomyViewer,
    globeLod.tier,
    filterCenter.lat,
    filterCenter.lng,
  ]);

  const disputeZonePaths = useMemo<TransportPath[]>(() => {
    if (isEconomyViewer) return [];
    if (!showAnyDisputeOverlay && !showConflictZones) return [];
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 6;
    const maxZones = DISPUTE_MAX_BY_TIER[globeLod.tier];
    const maxPaths = Math.max(400, maxZones * 24);
    const paths: TransportPath[] = [];

    if (showAnyDisputeOverlay) {
      const preferDetail = disputeHatchLod === "detail";
      const coveredDisputeIds = new Set<string>();

      if (disputeHatchCachePaths.length > 0) {
        const filtered = filterHatchPathsByView(
          disputeHatchCachePaths,
          layerViewState,
          radiusDeg,
          maxPaths,
        ).filter((path) => {
          // 레이어 체크: war/diplomatic — path id에서 dispute 매칭
          const match = path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/);
          if (!match) return true;
          const disputeId = match[1];
          const dispute = (data.disputes ?? []).find((d) => d.id === disputeId);
          if (!dispute) {
            coveredDisputeIds.add(disputeId);
            return true;
          }
          const keep = disputeMatchesWarDiplomaticLayers(
            dispute,
            showWarZones,
            showDiplomaticTension,
          );
          if (keep) coveredDisputeIds.add(disputeId);
          return keep;
        });
        paths.push(...filtered);
      }

      // 캐시 누락·구버전(이란 등) — 보이는 전쟁/외교 분쟁은 geometry로 보강
      const candidates = rankDisputesForDisplay(data.disputes ?? []).filter((d) => {
        if (coveredDisputeIds.has(d.id)) return false;
        if (
          !d.geometry ||
          !disputeMatchesWarDiplomaticLayers(d, showWarZones, showDiplomaticTension)
        ) {
          return false;
        }
        const box = disputeGeometryBbox(d.geometry);
        if (box) return isBboxNearView(box, layerViewState, radiusDeg);
        return isCenterInView(resolveDisputeCenter(d), layerViewState, radiusDeg);
      });
      for (const dispute of candidates.slice(0, maxZones)) {
        if (paths.length >= maxPaths) break;
        const built = getCachedDisputeHatchPaths(dispute, {
          preferDetailSegments: preferDetail,
        });
        if (!built.length) continue;
        paths.push(...built);
        if (paths.length >= maxPaths) {
          paths.length = maxPaths;
          break;
        }
      }
    }

    if (showConflictZones) {
      for (const zone of visibleConflictZones.slice(0, maxZones)) {
        if (zone.hatchPaths?.length) {
          paths.push(...zone.hatchPaths);
        } else {
          paths.push(...conflictZoneToOutlineAndHatchPaths(zone));
        }
      }
    }

    return paths;
  }, [
    data.disputes,
    disputeHatchCachePaths,
    disputeHatchLod,
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showAnyDisputeOverlay,
    showConflictZones,
    showDiplomaticTension,
    showWarZones,
    visibleConflictZones,
  ]);

  const disputeByZonePath = useMemo(() => {
    const map = new Map<string, DisputeArea>();
    for (const dispute of data.disputes ?? []) {
      map.set(dispute.id, dispute);
    }
    return map;
  }, [data.disputes]);

  const conflictZoneByPath = useMemo(() => {
    const map = new Map<string, ConflictZoneFeature>();
    for (const zone of visibleConflictZones) {
      map.set(zone.id, zone);
    }
    return map;
  }, [visibleConflictZones]);

  const disputeFromPath = useCallback((path: TransportPath): DisputeArea | undefined => {
    if (path.kind === "conflict-hatch") return undefined;
    const match = path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/);
    if (!match) return undefined;
    return disputeByZonePath.get(match[1]);
  }, [disputeByZonePath]);

  function conflictZoneFromPath(path: TransportPath): ConflictZoneFeature | undefined {
    const hatchMatch = path.id.match(/^conflict-hatch-(?:combat|gray|high|medium|low)-(.+)-\d+$/);
    if (hatchMatch) return conflictZoneByPath.get(hatchMatch[1]);
    if (path.kind !== "dispute-zone") return undefined;
    const frameMatch = path.id.match(/^dispute-zone-(.+)-\d+$/);
    if (!frameMatch) return undefined;
    return conflictZoneByPath.get(frameMatch[1]);
  }

  /** 뷰포트에 잡힌 분쟁 구역 수(고유 id) — MultiPolygon 외곽 path 개수와 구분 */
  const disputeZoneOutlineCount = useMemo(() => {
    const ids = new Set<string>();
    for (const path of disputeZonePaths) {
      if (path.kind !== "dispute-zone") continue;
      const match = path.id.match(/^dispute-zone-(.+)-\d+$/);
      ids.add(match?.[1] ?? path.id);
    }
    return ids.size;
  }, [disputeZonePaths]);

  const armsEmbargoFramePaths = useMemo<TransportPath[]>(() => {
    if (!showArmsEmbargo) return [];
    const paths: TransportPath[] = [];
    for (const embargo of visibleArmsEmbargoZones) {
      // 실전투·폭격(빨강) 국가와 겹치면 보라 금수 테두리는 표시하지 않음
      // (이란이 보라로 보이는 원인: arms-embargo 레이어)
      const label = `${embargo.id} ${embargo.name} ${embargo.isoA3 || ""}`;
      if (/iran|\bIRN\b|emb-ir\b/i.test(label)) continue;

      const country = embargo.isoA3
        ? data.countries.find((item) => item.isoA3 === embargo.isoA3)
        : undefined;
      const geometry = embargo.geometry ?? country?.geometry ?? null;
      if (!geometry) continue;
      paths.push(...geometryToBorderPaths(embargo.id, embargo.name, geometry));
    }
    return paths;
  }, [data.countries, showArmsEmbargo, visibleArmsEmbargoZones]);

  const conflictClusterPoints = useMemo<ConflictClusterPoint[]>(
    () =>
      showConflictZones
        ? visibleConflictZones.map((zone) => ({
            ...zone,
            lat: zone.center.lat,
            lng: zone.center.lng,
            markerId: `conflict-cluster-${zone.id}`,
            displayKind: "conflict-cluster" as const,
          }))
        : [],
    [showConflictZones, visibleConflictZones],
  );

  // 카메라 이동 중에는 오버레이(점령지 등)만 동결해 전체 색 깜빡임 완화
  const [stableOverlayPolygons, setStableOverlayPolygons] = useState(overlayPolygonData);
  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current || showUkraineControl;
    if (isCameraMoving && !bypass) return;
    setStableOverlayPolygons((prev) =>
      overlayPolygonsEqual(prev, overlayPolygonData) ? prev : overlayPolygonData,
    );
  }, [applyGeneration, immediateUntilRef, isCameraMoving, overlayPolygonData, showUkraineControl]);

  const polygonData = useMemo<PolygonLayerFeature[]>(
    () => [...countryPolygonData, ...stableOverlayPolygons],
    [countryPolygonData, stableOverlayPolygons],
  );

  const ukraineMacroGeoJson = useMemo(() => {
    if (isEconomyViewer || !showUkraineControl || viinaDisplay.lod.mode === "hidden") {
      return emptyUkraineFrontGeoJson();
    }
    if (viinaDisplay.ruZones.length > 0 || viinaDisplay.contestedZones.length > 0) {
      return buildUkraineMacroGeoJson(
        viinaDisplay.ruZones,
        viinaDisplay.uaZones,
        viinaDisplay.contestedZones,
      );
    }
    return buildUkraineMacroSeedGeoJson();
  }, [
    isEconomyViewer,
    showUkraineControl,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
    viinaDisplay.uaZones,
  ]);

  const ukraineMicroGeoJson = useMemo(() => {
    if (isEconomyViewer || !showUkraineControl || viinaDisplay.lod.mode === "hidden") {
      return emptyUkraineFrontGeoJson();
    }
    if (viinaDisplay.ruZones.length > 0 || viinaDisplay.contestedZones.length > 0) {
      return buildUkraineMicroGeoJson(viinaDisplay.ruZones, viinaDisplay.contestedZones);
    }
    return buildUkraineMicroSeedGeoJson();
  }, [
    isEconomyViewer,
    showUkraineControl,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
  ]);

  const polygonDataWithUkraine = polygonData;

  const axisHubCountriesGeoJson = useMemo(() => {
    // 지정학 전용 — NE 10m 고정밀 소스만 사용 (저정밀 countries.json 폴백 금지)
    if (isEconomyViewer) {
      return paintAxisHubCountriesGeoJson(null);
    }
    return paintAxisHubCountriesGeoJson(axisHubCountriesSource, {
      activeIso: activeHubId ?? null,
    });
  }, [activeHubId, axisHubCountriesSource, isEconomyViewer]);

  const alliedBlocCountriesGeoJson = useMemo(() => {
    if (isEconomyViewer || !showAlliedBlocs) {
      return paintAlliedBlocCountriesGeoJson(null);
    }
    return paintAlliedBlocCountriesGeoJson(alliedBlocCountriesSource, {
      includeCsto: showCstoBloc,
    });
  }, [alliedBlocCountriesSource, isEconomyViewer, showAlliedBlocs, showCstoBloc]);

  const geoEconBlocCountriesGeoJson = useMemo(() => {
    if (!isEconomyViewer || !showGeoEconBlocs) {
      return paintGeoEconBlocCountriesGeoJson(null);
    }
    return paintGeoEconBlocCountriesGeoJson(geoEconBlocCountriesSource);
  }, [geoEconBlocCountriesSource, isEconomyViewer, showGeoEconBlocs]);

  const eastAsiaAdizPaths = useMemo<TransportPath[]>(() => {
    if (!showEastAsiaAdiz) return [];
    if (!isEastAsiaAdizVisibleAtAltitude(layerViewState.altitude)) return [];
    return eastAsiaAdizToPaths(eastAsiaAdizFc);
  }, [eastAsiaAdizFc, layerViewState.altitude, showEastAsiaAdiz]);

  const axisNetworkPaths = useMemo<TransportPath[]>(() => {
    if (!showAxisNetwork) return [];
    const hub = (activeHubId ?? "all") as AxisHubId | "all";
    const axisViewerMode = isEconomyViewer ? "economy" : "conflict";
    if (
      SIPRI_ARMS_LENS_ENABLED &&
      hubFocusMode === "arms" &&
      activeHubId &&
      axisArmsPayload
    ) {
      const { pairs } = filterArmsForHub(axisArmsPayload, activeHubId);
      return armsPairsToPaths(pairs, labelLanguage);
    }
    if (hubFocusMode === "arms" && !SIPRI_ARMS_LENS_ENABLED) {
      // SIPRI 렌즈 OFF — 정적 축 관계망만
      return axisNetworkToPaths(hub, labelLanguage, axisViewerMode);
    }
    if (hubFocusMode === "regime") return [];
    // 허브 미선택(all)이어도 전체 축 스포크 표시 — ON인데 빈 화면 방지
    return axisNetworkToPaths(hub, labelLanguage, axisViewerMode);
  }, [
    showAxisNetwork,
    activeHubId,
    hubFocusMode,
    axisArmsPayload,
    isEconomyViewer,
    labelLanguage,
  ]);

  const briTradePaths = useMemo<TransportPath[]>(() => {
    if (!showBriTradeConnectivity) return [];
    return briTradePathsToTransport(labelLanguage);
  }, [showBriTradeConnectivity, labelLanguage]);

  const corridorLod = useMemo(
    () => getCorridorLod(layerViewState.altitude),
    [layerViewState.altitude],
  );

  const strategicCorridorPaths = useMemo<TransportPath[]>(() => {
    if (!showStrategicCorridors) return [];
    return strategicCorridorPathsForLod(corridorLod, {
      lat: layerViewState.lat,
      lng: layerViewState.lng,
    });
  }, [
    showStrategicCorridors,
    corridorLod,
    layerViewState.lat,
    layerViewState.lng,
  ]);

  /**
   * 동맹 물류 회랑(military-logistics) — showStrategicCorridors(전체 회랑, 기본 꺼짐)와
   * 별개로 기본 켜짐. "초기 화면 최소화"의 예외 — 대전략 이미지의 핵심 요소라서 무역/
   * 제재우회 회랑까지 다 켜지 않고 이 카테고리만 따로 뗐다.
   */
  const alliedLogisticsCorridorPaths = useMemo<TransportPath[]>(() => {
    if (!showAlliedLogisticsCorridors) return [];
    return strategicCorridorPathsForLod(
      corridorLod,
      { lat: layerViewState.lat, lng: layerViewState.lng },
      { categories: ["military-logistics"] },
    );
  }, [
    showAlliedLogisticsCorridors,
    corridorLod,
    layerViewState.lat,
    layerViewState.lng,
  ]);

  /** 제재 회피 회랑 — SES 지도 근거 (지정학 전용) */
  const sanctionsEvasionCorridorPaths = useMemo<TransportPath[]>(() => {
    if (isEconomyViewer || !showSanctionsEvasionCorridors) return [];
    return sanctionsEvasionCorridorPathsForLod(corridorLod, {
      lat: layerViewState.lat,
      lng: layerViewState.lng,
    });
  }, [
    isEconomyViewer,
    showSanctionsEvasionCorridors,
    corridorLod,
    layerViewState.lat,
    layerViewState.lng,
  ]);

  const usDfcSupplyPaths = useMemo<TransportPath[]>(() => {
    if (!showUsDfcSupplyChain) return [];
    return usDfcSupplyPathsToTransport(labelLanguage);
  }, [showUsDfcSupplyChain, labelLanguage]);

  const {
    paths: crinkInfraPaths,
    pathCountByCategory: crinkInfraPathCountByCategory,
    status: crinkInfraStatus,
    visibilityHint: crinkInfraVisibilityHint,
  } = useCrinkInfraLayers({
    layerPrefs,
    basemapMode,
    ultraLite,
    mapZoom,
    view: layerViewState,
    radiusDeg: globeLod.radiusDeg > 0 ? globeLod.radiusDeg : 8,
    lang: labelLanguage === "en" ? "en" : "ko",
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
      showShipMovesLayer && !isEconomyViewer
        ? shipMovementHtmlMarkers(shipMovesLayerObservations)
        : [],
    [isEconomyViewer, shipMovesLayerObservations, showShipMovesLayer],
  );

  const shipMovePulseRings = useMemo(
    () =>
      showShipMovesLayer && !isEconomyViewer
        ? shipMovementPulseRings(shipMovesLayerObservations)
        : [],
    [isEconomyViewer, shipMovesLayerObservations, showShipMovesLayer],
  );

  const shipMoveTrailPaths = useMemo(
    () =>
      showShipMovesLayer && !isEconomyViewer
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
    ],
    [
      armsEmbargoFramePaths,
      axisNetworkPaths,
      briTradePaths,
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

  const scoredEvents = useMemo(() => scoreEvents(gdeltEvents), [gdeltEvents]);

  const whereIsItPool = useMemo((): WhereIsItPoolItem[] => {
    const out: WhereIsItPoolItem[] = [];
    for (const e of gdeltEvents.slice(0, 80)) {
      if (Number.isFinite(e.lat) && Number.isFinite(e.lng)) {
        out.push({ lat: e.lat, lng: e.lng, source: "gdelt", id: e.id });
      }
    }
    for (const f of firmsFires.slice(0, 60)) {
      if (Number.isFinite(f.lat) && Number.isFinite(f.lng)) {
        out.push({ lat: f.lat, lng: f.lng, source: "firms", id: f.id });
      }
    }
    for (const v of aisVessels.slice(0, 40)) {
      if (Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
        out.push({ lat: v.lat, lng: v.lng, source: "ais", id: v.id });
      }
    }
    return out;
  }, [aisVessels, firmsFires, gdeltEvents]);

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

  const bottomAlertPanel = useMemo(
    () =>
      resolveBottomAlertPanel({
        showGdeltLayers,
        showDisputes: showAnyDisputeOverlay,
        gdeltError,
        gdeltLoading,
        gdeltAlertCount: gdeltMenuCoreAlerts.length,
        loadError,
        isLoading,
        localAlertCount: localDisputeAlerts.length,
        wantLocalPanel: showLocalAlertPanel,
        wantGdeltPanel: showGdeltAlertPanel,
      }),
    [
      showGdeltLayers,
      showAnyDisputeOverlay,
      gdeltError,
      gdeltLoading,
      gdeltMenuCoreAlerts.length,
      loadError,
      isLoading,
      localDisputeAlerts.length,
      showLocalAlertPanel,
      showGdeltAlertPanel,
    ],
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

  const gdeltTierPins = useMemo(() => {
    const pins = pickGdeltTierPins(scoredEvents, {
      showAlliance: showGdeltAlliance,
      showProtest: showGdeltProtests,
      view: layerViewState,
    });
    if (!ultraLite) return pins;
    const max = Math.max(4, Math.ceil(pins.length * ultraLiteGdeltPinScale()));
    return pins.slice(0, Math.min(50, max));
  }, [layerViewState, scoredEvents, showGdeltAlliance, showGdeltProtests, ultraLite]);

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

  const staticGlobePoints = useMemo<StaticGlobePoint[]>(() => {
    const focusNodeId = econNavSelection
      ? ECON_NAV_TO_CRITICAL_NODE[econNavSelection.id]
      : undefined;
    const focusIds = focusCriticalNodeIds(focusNodeId);
    const focusing = focusIds.size > 0;

    return visibleStaticPoints
      .filter((point) => {
        if (point.kind !== "critical-node" || !focusing) return true;
        const id = String(point.meta?.criticalNodeId ?? "");
        return focusIds.has(id);
      })
      .map((point) => {
        if (point.kind !== "critical-node" || !focusing) {
          return {
            ...point,
            markerId: `static-${point.id}`,
            displayKind: "static" as const,
          };
        }
        const id = String(point.meta?.criticalNodeId ?? "");
        const isPrimary = id === focusNodeId;
        return {
          ...point,
          markerId: `static-${point.id}`,
          displayKind: "static" as const,
          meta: {
            ...point.meta,
            focusRole: isPrimary ? "primary" : "cascade",
          },
        };
      });
  }, [econNavSelection, visibleStaticPoints]);

  const portWatchByChokeId = usePortWatchObservations();

  const chokeGlowColorById = useMemo(() => {
    if (!showLogisticsRisk || !showLogisticsStress) return undefined;
    const out: Record<string, string> = {};
    for (const p of LOGISTICS_RISK_POINTS) {
      if (p.kind !== "chokepoint") continue;
      const stress = stressForChokepoint(
        p,
        ukmtoIncidents,
        portWatchByChokeId[p.id] ?? null,
      );
      out[p.id] = chokeStressHex(stress.level);
    }
    return out;
  }, [showLogisticsRisk, showLogisticsStress, ukmtoIncidents, portWatchByChokeId]);

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
    () => buildAircraftSymbolModel(milDisplayPoints, civDisplayPoints),
    [milDisplayPoints, civDisplayPoints],
  );

  const visibleFirmsFires = useMemo(() => {
    if (!showFirmsFires) return [];
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const maxCount = FIRMS_FIRE_MAX_BY_TIER[globeLod.tier];
    // 전장 권역만 — 산불·농지 소각 등 전역 열점 제외
    return filterFirmsToTheaters(firmsFires)
      .filter((fire) => isCenterInView(fire, layerViewState, radiusDeg))
      .slice()
      .sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0))
      .slice(0, maxCount);
  }, [firmsFires, globeLod.tier, layerViewState, showFirmsFires]);

  const firmsCombatHotspots = useMemo(() => {
    // bomb 링·전투 분류는 FIRMS/전장 기하만 — GDELT war는 빨간 MapLibre 점으로만 표시
    return buildFirmsCombatHotspots({
      disputes: data.disputes,
      includeWarZones: showWarZones,
      conflictZones: visibleConflictZones,
      includeConflictZones: showConflictZones,
    });
  }, [data.disputes, showConflictZones, showWarZones, visibleConflictZones]);

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
    if (!showNewfeedsIranAttacks) return [];
    // NewFeeds = 이란 국영·공식 매체 → 빨간 구체
    return newfeedsAttacks.map((attack) => ({
      ...attack,
      markerId: `newfeeds-${attack.id}`,
      displayKind: "newfeeds-attack" as const,
    }));
  }, [newfeedsAttacks, showNewfeedsIranAttacks]);

  const chinaTheaterIncidentMarkers = useMemo<ChinaTheaterIncidentHtmlMarker[]>(() => {
    const enabled = new Set<ChinaTheaterDyad>();
    if (showChinaTaiwanIncidents) enabled.add("china-taiwan");
    if (showChinaJapanIncidents) enabled.add("china-japan");
    if (showChinaPhilippinesIncidents) enabled.add("china-philippines");
    if (showUsChinaIncidents) enabled.add("us-china");
    if (enabled.size === 0) return [];
    const staticItems = activateChinaTheaterIncidents(enabled, scoredEvents);
    const crossStraitItems = showChinaTaiwanIncidents
      ? (crossStraitSignal?.escalationIncidents ?? []).map((item) => ({
          ...item,
          provenance: provenanceFromActivation({
            id: item.id,
            hadSeedMatch: Boolean(item.sourceUrl),
            seedSourceUrl: item.sourceUrl ?? null,
            gdeltSourceUrl: null,
          }),
          gdeltSourceUrl: null,
        }))
      : [];
    return [...staticItems, ...crossStraitItems].map((item) => ({
        ...item,
        markerId: `china-incident-${item.id}`,
        displayKind: "china-theater-incident" as const,
      }));
  }, [
    crossStraitSignal?.escalationIncidents,
    scoredEvents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showChinaTaiwanIncidents,
    showUsChinaIncidents,
  ]);

  const koreaMissileIncidentMarkers = useMemo<KoreaMissileIncidentHtmlMarker[]>(() => {
    if (!showNorthKoreaMissileTests) return [];
    return activateKoreaMissileIncidents(scoredEvents).map((item) => ({
      ...item,
      markerId: `nk-missile-${item.id}`,
      displayKind: "korea-missile-incident" as const,
    }));
  }, [scoredEvents, showNorthKoreaMissileTests]);

  const russiaStrikeIncidentMarkers = useMemo<RussiaStrikeIncidentHtmlMarker[]>(() => {
    if (!showUkraineStrikesOnRussia) return [];
    return activateRussiaStrikeIncidents(scoredEvents).map((item) => ({
      ...item,
      markerId: `ua-strike-ru-${item.id}`,
      displayKind: "russia-strike-incident" as const,
    }));
  }, [scoredEvents, showUkraineStrikesOnRussia]);

  const europeDroneIncidentMarkers = useMemo<EuropeDroneIncidentHtmlMarker[]>(() => {
    if (!showEuropeDroneIncidents) return [];
    return activateEuropeDroneIncidents(scoredEvents).map((item) => ({
      ...item,
      markerId: `europe-drone-${item.id}`,
      displayKind: "europe-drone-incident" as const,
    }));
  }, [scoredEvents, showEuropeDroneIncidents]);

  const firmsCombatInView = firmsCombatFireIds.length > 0;

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
    if (isEconomyViewer || isCompactUi) return [];
    const payload = newsStreamPayload;
    if (!payload) return [];
    const pool: NewsStreamItem[] = [...payload.verified, ...payload.stateMedia];
    return buildNewsStreamMapTags(pool);
  }, [isCompactUi, isEconomyViewer, newsStreamPayload]);

  const newsInsightCalloutMarkers = useMemo<NewsInsightCalloutMarker[]>(() => {
    if (!newsInsightCallout || selected?.kind !== "news-insight") return [];
    return [newsInsightCallout];
  }, [newsInsightCallout, selected]);

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

  const labelPlaces = useMemo(() => {
    if (!showCityLabels) return [];
    const filtered = filterMajorCityLabels(data.places ?? [], layerViewState, layerViewState.altitude);
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

  const htmlOverlayMarkers = useMemo<HtmlOverlayMarker[]>(() => {
    const markers: HtmlOverlayMarker[] = [
      ...globePoints,
      ...airportPortHtmlMarkers,
      ...situationCalloutMarkers,
      ...visibleCasualtySkullMarkers,
      ...nuclearStockpileMarkers,
      ...ukraineSettlementHtmlMarkers,
      ...usCarrierHtmlMarkers,
      // 군용기·민항기·선박(AIS)은 여기 없다 — symbol 레이어(aircraftSymbols/aisSymbols)로 이전됨.
      // 되돌리면 최대 수백 개 DOM 마커가 프레임마다 되살아난다.
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
      ...reconSatelliteMarkers,
    ];
    // MapLibre는 htmlAltitude 미지원 — 사망자·콜아웃·뉴스네온이 한 좌표에 묶이지 않게 분리
    return deconflictTheaterHtmlOverlays(markers);
  }, [
      airportPortHtmlMarkers,
      chinaTheaterIncidentMarkers,
      koreaMissileIncidentMarkers,
      russiaStrikeIncidentMarkers,
      europeDroneIncidentMarkers,
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
  ]);

  /**
   * MapLibre 렌더러는 react-globe.gl 시절의 htmlElementVisibilityModifier를 호출하지 않는다.
   * 그래서 사상자·핵탄두 배지는 마운트 시점(대개 줌아웃된 초기 지구본, 스케일 하한 0.12)에
   * 만들어진 크기로 고정되어, 우크라이나·가자로 줌인해도 커지지 않아 사실상 안 보였다.
   * 고도(layerAltitude)나 마커 목록이 바뀔 때 DOM 배지를 직접 재스케일해 가시성을 회복한다.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rescale = () => {
      document
        .querySelectorAll<HTMLElement>(".casualty-skull-marker")
        .forEach((el) => {
          const span = Number(el.dataset.territorySpan || 10);
          const scale = getCasualtyOverlayScale(
            layerAltitude,
            Number.isFinite(span) ? span : 10,
          );
          applyCasualtyOverlayMetrics(el, scale, true);
        });
      document
        .querySelectorAll<HTMLElement>(".nuclear-icbm-marker")
        .forEach((el) => {
          applyNuclearOverlayScale(el, getNuclearOverlayScale(layerAltitude), true);
        });
    };
    // 마커 DOM은 커밋 직후 ref 콜백에서 붙으므로 한 프레임 뒤 재적용해 초기 크기까지 보정
    rescale();
    const raf = window.requestAnimationFrame(rescale);
    return () => window.cancelAnimationFrame(raf);
  }, [layerAltitude, casualtySkullMarkers, nuclearStockpileMarkers]);

  const [tensionHeatmaps, setTensionHeatmaps] = useState(rawTensionHeatmaps);
  const [globeLabels, setGlobeLabels] = useState(rawGlobeLabels);
  const [globePaths, setGlobePaths] = useState(rawGlobePaths);

  // DFC/BRI 토글 직후 throttle 게이트를 우회해 즉시 경로 반영
  useEffect(() => {
    if (
      !showBriTradeConnectivity &&
      !showUsDfcSupplyChain &&
      !showStrategicCorridors &&
      !showAlliedLogisticsCorridors &&
      !showSanctionsEvasionCorridors
    )
      return;
    setGlobePaths([...rawGlobePaths]);
  }, [
    showBriTradeConnectivity,
    showUsDfcSupplyChain,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    rawGlobePaths,
  ]);

  const dynamicGlobePaths = useMemo(() => rawGlobePaths, [rawGlobePaths]);

  const heatmapStabilityRef = useRef<{ signature: string; points: number; updatedAt: number }>({
    signature: "",
    points: 0,
    updatedAt: 0,
  });
  const labelStabilityRef = useRef<{ signature: string; count: number; updatedAt: number }>({
    signature: "",
    count: 0,
    updatedAt: 0,
  });
  const pathStabilityRef = useRef<{
    signature: string;
    count: number;
    oilCount: number;
    gasCount: number;
    subseaCount: number;
    cableCount: number;
    briCount: number;
    dfcCount: number;
    oilSig: string;
    gasSig: string;
    subseaSig: string;
    cableSig: string;
    briSig: string;
    dfcSig: string;
    updatedAt: number;
  }>({
    signature: "",
    count: 0,
    oilCount: 0,
    gasCount: 0,
    subseaCount: 0,
    cableCount: 0,
    briCount: 0,
    dfcCount: 0,
    oilSig: "",
    gasSig: "",
    subseaSig: "",
    cableSig: "",
    briSig: "",
    dfcSig: "",
    updatedAt: 0,
  });

  useEffect(() => {
    // 줌/팬 중 히트맵·라벨·경로 교체를 막아서 WebGL 부담과 흰 화면 유발 재할당을 줄임
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const points = rawTensionHeatmaps.reduce((sum, layer) => sum + layer.points.length, 0);
    const signature = rawTensionHeatmaps
      .map((layer) => `${layer.id}:${layer.points.length}:${layer.bandwidth.toFixed(2)}`)
      .join("|");
    const prev = heatmapStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(points - prev.points) >= HEATMAP_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= HEATMAP_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setTensionHeatmaps(rawTensionHeatmaps);
      heatmapStabilityRef.current = { signature, points, updatedAt: now };
    }
  }, [applyGeneration, immediateUntilRef, isCameraMoving, rawTensionHeatmaps]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const count = rawGlobeLabels.length;
    const signature = rawGlobeLabels
      .slice(0, 84)
      .map((item) => `p:${item.id}`)
      .join("|");
    const prev = labelStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= LABEL_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= LABEL_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setGlobeLabels(rawGlobeLabels);
      labelStabilityRef.current = { signature, count, updatedAt: now };
    }
  }, [applyGeneration, immediateUntilRef, isCameraMoving, rawGlobeLabels]);

  useEffect(() => {
    const now = Date.now();
    const count = dynamicGlobePaths.length;
    let oilCount = 0;
    let gasCount = 0;
    let subseaCount = 0;
    let cableCount = 0;
    let briCount = 0;
    let dfcCount = 0;
    let hatchCount = 0;
    const oilIds: string[] = [];
    const gasIds: string[] = [];
    const subseaIds: string[] = [];
    const cableIds: string[] = [];
    const briIds: string[] = [];
    const dfcIds: string[] = [];
    for (const item of dynamicGlobePaths) {
      if (item.kind === "oil-pipeline") {
        oilCount += 1;
        if (oilIds.length < 24) oilIds.push(item.id);
      } else if (item.kind === "gas-pipeline") {
        gasCount += 1;
        if (gasIds.length < 24) gasIds.push(item.id);
      } else if (item.kind === "subsea-pipeline") {
        subseaCount += 1;
        if (subseaIds.length < 24) subseaIds.push(item.id);
      } else if (item.kind === "submarine-cable") {
        cableCount += 1;
        if (cableIds.length < 24) cableIds.push(item.id);
      } else if (item.kind === "bri-trade") {
        briCount += 1;
        if (briIds.length < 24) briIds.push(item.id);
      } else if (item.kind === "us-dfc-supply") {
        dfcCount += 1;
        if (dfcIds.length < 24) dfcIds.push(item.id);
      } else if (
        item.kind === "dispute-hatch" ||
        item.kind === "conflict-hatch" ||
        item.kind === "dispute-zone"
      ) {
        hatchCount += 1;
      }
    }
    const oilSig = oilIds.join(",");
    const gasSig = gasIds.join(",");
    const subseaSig = subseaIds.join(",");
    const cableSig = cableIds.join(",");
    const briSig = briIds.join(",");
    const dfcSig = dfcIds.join(",");
    const prev = pathStabilityRef.current;
    const infraChanged =
      oilCount !== prev.oilCount ||
      gasCount !== prev.gasCount ||
      subseaCount !== prev.subseaCount ||
      cableCount !== prev.cableCount ||
      briCount !== prev.briCount ||
      dfcCount !== prev.dfcCount ||
      oilSig !== prev.oilSig ||
      gasSig !== prev.gasSig ||
      subseaSig !== prev.subseaSig ||
      cableSig !== prev.cableSig ||
      briSig !== prev.briSig ||
      dfcSig !== prev.dfcSig;
    // 자원 인프라는 카메라 이동 중에도 반영 — 팬 중 fetch 완료 후 영구 스킵 방지
    const bypass =
      Date.now() < immediateUntilRef.current || isVectorBaseMap || infraChanged;
    if (isCameraMoving && !bypass) return;
    // 앞 96개만 보면 해치에 밀려 인프라 id 교체가 안 잡힘 → fingerprint 포함
    const signature = `${count}|h${hatchCount}|o${oilCount}|g${gasCount}|s${subseaCount}|c${cableCount}|b${briCount}|d${dfcCount}|O:${oilSig}|G:${gasSig}|S:${subseaSig}|C:${cableSig}|B:${briSig}|D:${dfcSig}|${dynamicGlobePaths
      .slice(0, 96)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|")}`;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= PATH_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= PATH_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0 || infraChanged)
    ) {
      const nextPaths = dynamicGlobePaths;
      const commit = () => {
        pathStabilityRef.current = {
          signature,
          count,
          oilCount,
          gasCount,
          subseaCount,
          cableCount,
          briCount,
          dfcCount,
          oilSig,
          gasSig,
          subseaSig,
          cableSig,
          briSig,
          dfcSig,
          updatedAt: now,
        };
        setGlobePaths([...nextPaths]);
      };
      // 인프라 토글은 즉시 반영.
      // (예전: ref를 먼저 갱신 + RAF 예약 → cleanup에서 cancel되면
      //  signature는 이미 먹은 채 setGlobePaths는 스킵 → 체크 ON인데 안 보임)
      if (infraChanged || (count - prev.count < 40 && count < 120)) {
        commit();
        return;
      }
      let applied = false;
      const raf = window.requestAnimationFrame(() => {
        applied = true;
        startTransition(() => commit());
      });
      return () => {
        window.cancelAnimationFrame(raf);
        if (!applied) commit();
      };
    }
  }, [
    applyGeneration,
    dynamicGlobePaths,
    immediateUntilRef,
    isCameraMoving,
    isVectorBaseMap,
  ]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setGlobePaths((prev) => {
      const base = prev.filter(
        (path) =>
          path.kind !== "neptun-trail" &&
          path.kind !== "neptun-projection" &&
          path.kind !== "neptun-trail-archived" &&
          path.kind !== "recon-orbit",
      );
      const paths = [
        ...stableNeptunLivePaths,
        ...stableNeptunArchivedPaths,
        ...reconOrbitPaths,
      ];
      if (paths.length === 0) {
        const hadDynamic = prev.some(
          (path) => path.kind.startsWith("neptun-") || path.kind === "recon-orbit",
        );
        return hadDynamic ? base : prev;
      }
      return [...base, ...paths];
    });
  }, [
    immediateUntilRef,
    isCameraMoving,
    reconOrbitPaths,
    stableNeptunArchivedPaths,
    stableNeptunLivePaths,
  ]);

  const fuse = useMemo(
    () =>
      new Fuse(data.places, {
        keys: [
          { name: "name", weight: 0.45 },
          { name: "nameKo", weight: 0.4 },
          { name: "country", weight: 0.1 },
          { name: "type", weight: 0.05 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
        includeScore: true,
      }),
    [data.places],
  );

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return fuse.search(q).slice(0, 10).map((result) => result.item);
  }, [fuse, query]);

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

  const refreshAis = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setAisLoading(true);
    setAisError(null);

    try {
      const max = liveAisFetchMax();
      // 지정학: military 우선 요청하되, D1에 군함이 거의 없으면 서버가 all로 완화·데모 폴백
      const aisClass = isEconomyViewer ? "commercial" : "military";
      const response = await fetch(
        `/api/ais?seconds=8&max=${max}&class=${aisClass}&provider=auto`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        vessels?: AisVessel[];
        error?: string;
        waiting?: boolean;
        demo?: boolean;
      };

      if (!response.ok && !(payload.vessels && payload.vessels.length > 0)) {
        throw new Error(payload.error || `AIS 요청 실패: ${response.status}`);
      }

      let vessels = (payload.vessels || []).slice(0, max);
      // military만 비면 all로 한 번 더 (체크 ON 보장)
      if (!isEconomyViewer && vessels.length === 0) {
        const retry = await fetch(
          `/api/ais?seconds=8&max=${max}&class=all&provider=auto`,
          { cache: "no-store" },
        );
        const retryPayload = (await retry.json()) as { vessels?: AisVessel[] };
        vessels = (retryPayload.vessels || []).slice(0, max);
      }
      setAisVessels(vessels);
    } catch (error) {
      setAisError(error instanceof Error ? error.message : "AIS 로드 실패");
    } finally {
      setAisLoading(false);
    }
  }, [isEconomyViewer]);

  const refreshDisguisedVessels = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setDisguisedLoading(true);
    setDisguisedError(null);
    try {
      const response = await fetch("/api/ais-disguised", { cache: "no-store" });
      const payload = (await response.json()) as {
        vessels?: AisVessel[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `위장선박 요청 실패: ${response.status}`);
      }
      setDisguisedVessels(payload.vessels || []);
    } catch (error) {
      setDisguisedError(error instanceof Error ? error.message : "위장선박 로드 실패");
    } finally {
      setDisguisedLoading(false);
    }
  }, []);

  const refreshMilAircraft = useCallback(async () => {
    if (isEconomyViewer) {
      setMilAircraft([]);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setMilLoading(true);
    setMilError(null);

    try {
      const max = liveMilFetchMax();
      const response = await fetch(`/api/adsb-mil?max=${max}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        aircraft?: MilitaryAircraft[];
        error?: string;
      };

      if (!response.ok && !(payload.aircraft && payload.aircraft.length > 0)) {
        throw new Error(payload.error || `ADS-B mil 요청 실패: ${response.status}`);
      }

      setMilAircraft((payload.aircraft || []).slice(0, max));
    } catch (error) {
      setMilError(error instanceof Error ? error.message : "ADS-B mil 로드 실패");
    } finally {
      setMilLoading(false);
    }
  }, [isEconomyViewer]);

  const refreshCivAircraft = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setCivLoading(true);
    setCivError(null);

    try {
      const max = liveAirTrafficFetchMax();
      const dist = airTrafficDistNm(layerAltitude);
      const lat = Math.round(layerViewState.lat * 100) / 100;
      const lng = Math.round(layerViewState.lng * 100) / 100;
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        dist: String(dist),
        max: String(max),
      });
      const response = await fetch(`/api/adsb-traffic?${params}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        aircraft?: MilitaryAircraft[];
        error?: string;
      };

      if (!response.ok && !(payload.aircraft && payload.aircraft.length > 0)) {
        throw new Error(payload.error || `ADS-B traffic 요청 실패: ${response.status}`);
      }

      setCivAircraft((payload.aircraft || []).slice(0, max));
    } catch (error) {
      setCivError(error instanceof Error ? error.message : "민간 항적 로드 실패");
    } finally {
      setCivLoading(false);
    }
  }, [layerAltitude, layerViewState.lat, layerViewState.lng]);

  const refreshUsCarriers = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setUsCarriersLoading(true);
    try {
      let response: Response;
      if (isClientApiStubMode()) {
        response = await fetch(dataPath("us-carriers.json"), { cache: "no-store" });
      } else {
        response = await fetch("/api/us-carriers", { cache: "no-store" });
        if (!response.ok) {
          response = await fetch(dataPath("us-carriers.json"), { cache: "no-store" });
        }
      }
      const payload = (await response.json()) as {
        carriers?: UsCarrier[];
        updatedAt?: string;
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "항모 데이터 로드 실패");
      }
      setUsCarriers(payload.carriers || []);
    } catch {
      // 마지막 성공 스냅샷 유지
    } finally {
      setUsCarriersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showAis) return;
    void refreshAis();
    const timer = window.setInterval(() => {
      void refreshAis();
    }, liveAisPollMs());
    return () => window.clearInterval(timer);
  }, [refreshAis, showAis]);

  useEffect(() => {
    if (isEconomyViewer || !showDisguisedVessels) {
      setDisguisedVessels([]);
      return;
    }
    void refreshDisguisedVessels();
  }, [isEconomyViewer, refreshDisguisedVessels, showDisguisedVessels]);

  useEffect(() => {
    if (isEconomyViewer || !showMilitaryActivity) {
      if (isEconomyViewer) setMilAircraft([]);
      return;
    }
    void refreshMilAircraft();
    const timer = window.setInterval(() => {
      void refreshMilAircraft();
    }, liveMilPollMs());
    return () => window.clearInterval(timer);
  }, [isEconomyViewer, refreshMilAircraft, showMilitaryActivity]);

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

  useEffect(() => {
    if (!showAirTraffic) {
      setCivAircraft([]);
      return;
    }
    void refreshCivAircraft();
    const timer = window.setInterval(() => {
      void refreshCivAircraft();
    }, liveAirTrafficPollMs());
    return () => window.clearInterval(timer);
  }, [refreshCivAircraft, showAirTraffic]);

  useEffect(() => {
    // 지경학에서는 항모·항구 위치 레이어/폴링 비활성
    if (isEconomyViewer || !showUsCarriers) return;
    void refreshUsCarriers();
    const timer = window.setInterval(() => {
      void refreshUsCarriers();
    }, liveUsCarriersPollMs());
    return () => window.clearInterval(timer);
  }, [isEconomyViewer, refreshUsCarriers, showUsCarriers]);

  const refreshTelegramAlerts = useCallback(async () => {
    if (!viewerChromePreset.fetchTelegram) {
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      return;
    }
    if (!showTelegramOsint && !intelSheetOpen) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTelegramStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const [alertsRes, statusRes] = await Promise.all([
        fetch("/api/telegram-alerts", { cache: "no-store" }),
        fetch("/api/telegram-alerts/status", { cache: "no-store" }),
      ]);
      if (!alertsRes.ok) throw new Error(`HTTP ${alertsRes.status}`);
      const payload = (await alertsRes.json()) as TelegramAlertsPayload;
      setTelegramAlerts(payload.alerts ?? []);
      setTelegramLive(Boolean(payload.live) || (payload.alerts?.length ?? 0) > 0);
      if (statusRes.ok) {
        const status = (await statusRes.json()) as {
          needsAuth?: boolean;
          sessionExists?: boolean;
          embedMode?: boolean;
        };
        setTelegramEmbedMode(status.embedMode !== false);
        setTelegramNeedsAuth(Boolean(status.needsAuth));
        setTelegramSessionExists(Boolean(status.sessionExists));
      }
      setTelegramStatus(
        payload.stub ? "stub" : payload.waiting ? "waiting" : "ok",
      );
    } catch {
      setTelegramStatus("error");
    }
  }, [intelSheetOpen, showTelegramOsint, viewerChromePreset.fetchTelegram]);

  const syncTelegramEmbed = useCallback(async () => {
    if (!viewerChromePreset.fetchTelegram) {
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      return;
    }
    if (!showTelegramOsint && !intelSheetOpen) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTelegramStatus("loading");
    try {
      // 스크레이핑 트리거는 Cron 전용(POST /api/telegram-alerts/sync + 시크릿).
      // 브라우저는 이미 수집된 알림을 읽기만 한다.
      await refreshTelegramAlerts();
    } catch {
      // 공개 embed는 t.me 응답/타임아웃이 흔함. 캐시/대기 상태를 살리고 다음 폴링에서 재시도한다.
      await refreshTelegramAlerts();
      setTelegramStatus((prev) =>
        telegramEmbedMode && (prev === "idle" || prev === "loading" || prev === "error")
          ? "waiting"
          : prev === "error"
            ? "error"
            : prev,
      );
    }
  }, [
    intelSheetOpen,
    refreshTelegramAlerts,
    showTelegramOsint,
    telegramEmbedMode,
    viewerChromePreset.fetchTelegram,
  ]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) {
      if (!showTelegramOsint && !intelSheetOpen) {
        setTelegramAlerts([]);
        setTelegramLive(false);
        setTelegramStatus("idle");
      }
      return;
    }
    const cancel = runWhenIdle(() => {
      void syncTelegramEmbed();
    }, 3500);
    return cancel;
  }, [globeReady, intelSheetOpen, showTelegramOsint, syncTelegramEmbed]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) return;
    const timer = window.setInterval(() => {
      void syncTelegramEmbed();
    }, liveTelegramSyncPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, intelSheetOpen, showTelegramOsint, syncTelegramEmbed]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) return;
    const timer = window.setInterval(() => {
      void refreshTelegramAlerts();
    }, liveTelegramPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, intelSheetOpen, refreshTelegramAlerts, showTelegramOsint]);

  const refreshTzevaAdom = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTzevaAdomStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/tzeva-adom", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as TzevaAdomPayload;
      setTzevaAdomActive(payload.active ?? []);
      setTzevaAdomHistory(payload.history ?? []);
      setTzevaAdomLive(Boolean(payload.live));
      setTzevaAdomGeoRestricted(Boolean(payload.geoRestricted));
      setTzevaAdomError(payload.error ?? null);
      setTzevaAdomStatus(
        payload.stub ? "stub" : payload.geoRestricted ? "geo-blocked" : "ok",
      );
    } catch {
      setTzevaAdomStatus("error");
    }
  }, []);

  /** 이스라엘·이란 공습 — 레이어 OFF여도 백그라운드 폴링 (자동 ON/OFF용) */
  useEffect(() => {
    if (isEconomyViewer || !globeReady) return;
    void refreshTzevaAdom();
    const pollMs = liveTzevaPollMs();
    const timer = window.setInterval(() => {
      void refreshTzevaAdom();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [globeReady, isEconomyViewer, refreshTzevaAdom]);

  const refreshNewfeedsIran = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setNewfeedsStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const attacksRes = await fetch("/api/newfeeds-attacks?iran=1", { cache: "no-store" });
      if (!attacksRes.ok) throw new Error(`attacks HTTP ${attacksRes.status}`);
      const attacksPayload = (await attacksRes.json()) as NewfeedsAttacksPayload;
      setNewfeedsAttacks(attacksPayload.attacks ?? []);
      setNewfeedsThreatLabel(attacksPayload.threatLabel ?? null);
      setNewfeedsLive(Boolean(attacksPayload.live));
      setNewfeedsError(attacksPayload.error ?? null);
      setNewfeedsStatus("ok");
    } catch (err) {
      setNewfeedsStatus("error");
      setNewfeedsLive(false);
      setNewfeedsError(err instanceof Error ? err.message : "newfeeds fetch failed");
    }
  }, []);

  /** NewFeeds 이란 — 레이어 OFF여도 백그라운드 폴링 */
  useEffect(() => {
    if (isEconomyViewer || !globeReady) return;
    void refreshNewfeedsIran();
    const timer = window.setInterval(() => {
      void refreshNewfeedsIran();
    }, liveNewfeedsPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, isEconomyViewer, refreshNewfeedsIran]);

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
    showUkmtoIncidents,
    showNavareaWarnings,
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
    showUsDfcSupplyChain,
    usDfcSupplyPaths,
    setShowUsDfcSupplyChain,
    showBriTradeConnectivity,
    briTradePaths,
    setShowBriTradeConnectivity,
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


  useEffect(() => {
    categorySnapshotRef.current = null;
    setFrozenPanelCategories(null);
  }, [labelLanguage]);

  useEffect(() => {
    if (!showLeftPanel) {
      categorySnapshotRef.current = null;
      panelDraftPatchRef.current = {};
      setFrozenPanelCategories(null);
      return;
    }
    if (
      layerPanelReady &&
      frozenPanelCategories === null &&
      layerCategories !== EMPTY_LAYER_CATEGORIES
    ) {
      categorySnapshotRef.current = layerCategories;
      setFrozenPanelCategories(layerCategories);
    }
  }, [frozenPanelCategories, layerCategories, layerPanelReady, showLeftPanel]);

  const dismissLayerPanel = useCallback(
    (closePanel = true) => {
      // soft-apply 중인 초안이 있으면 닫을 때 커밋(버리기 → 체크했는데 안 보임 방지)
      if (layerPanelDirty) {
        deferLayerMapApplyRef.current = false;
        applyLayerPrefs(draftPrefs);
        panelDraftPatchRef.current = {};
        setLayerPanelDirty(false);
      }
      deferLayerMapApplyRef.current = false;
      if (closePanel) {
        setShowLeftPanel(false);
      }
      const flush = () => {
        categorySnapshotRef.current = null;
        setFrozenPanelCategories(null);
      };
      if (closePanel && typeof window !== "undefined") {
        window.requestAnimationFrame(flush);
      } else {
        flush();
      }
    },
    [applyLayerPrefs, draftPrefs, layerPanelDirty],
  );

  const toggleLeftPanel = useCallback(() => {
    if (showLeftPanel) {
      dismissLayerPanel(true);
      return;
    }
    setIntelSheetOpen(false);
    if (!historyImmersionRef.current) setRegionNavSelection(null);
    setEconNavSelection(null);
    setShowLeftPanel(true);
  }, [dismissLayerPanel, showLeftPanel]);

  const closeLeftPanel = useCallback(() => {
    dismissLayerPanel(true);
  }, [dismissLayerPanel]);

  const handleResetCheckboxSettings = useCallback(() => {
    const next: LayerPrefs = ultraLiteRef.current
      ? applyUltraLiteToLayerPrefs({
          ...DEFAULT_LAYER_PREFS,
          labelLanguage: layerPrefs.labelLanguage,
        })
      : {
          ...DEFAULT_LAYER_PREFS,
          labelLanguage: layerPrefs.labelLanguage,
        };
    panelDraftPatchRef.current = {};
    deferLayerMapApplyRef.current = false;
    applyLayerPrefs(next);
    setLayerPanelDirty(false);

    const base = categorySnapshotRef.current ?? frozenPanelCategories;
    if (base) {
      const updated = base.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          const key = LAYER_ITEM_PREF_KEYS[item.id];
          if (!key || typeof next[key] !== "boolean") return item;
          return { ...item, checked: next[key] as boolean };
        }),
      }));
      categorySnapshotRef.current = updated;
      setFrozenPanelCategories(updated);
    }
    layerPanelSessionRef.current += 1;
  }, [applyLayerPrefs, frozenPanelCategories, layerPrefs.labelLanguage]);

  const selectFrictionStage = useCallback(
    (stage: FrictionTimelineStage) => {
      setFrictionActiveStageId(stage.id);
      flyTo(stage.coordinates[1], stage.coordinates[0], 0.72, 900, { pitch: 48, bearing: -8 });
    },
    [flyTo],
  );

  const selectTerritorialStage = useCallback(
    (stage: FrictionTimelineStage) => {
      setTerritorialActiveStageId(stage.id);
      setTerritorialRevealedStageIds((prev) =>
        prev.includes(stage.id) ? prev : [...prev, stage.id],
      );
      flyTo(stage.coordinates[1], stage.coordinates[0], 0.72, 900, {
        pitch: 48,
        bearing: -8,
      });
    },
    [flyTo],
  );

  const beginTerritorialEpisode = useCallback(
    (episode: TerritorialDisputeEpisode) => {
      clearTerritorialSequence();
      clearFrictionEpisodeTimer();
      setRegimeSelectedEpisodeId(null);
      setFrictionEpisodeBrief(null);
      setFrictionActiveStageId(null);
      setDisputeEpisodeSelectedId(episode.id);
      setTerritorialEpisodeBrief(null);
      setTerritorialActiveStageId(null);
      setTerritorialRevealedStageIds([]);

      flyTo(
        territorialEpisodeLat(episode),
        territorialEpisodeLng(episode),
        altitudeFromTerritorialZoom(episode.zoom),
        1100,
        { pitch: 48, bearing: -6 },
      );

      const deep = territorialDeepDoc(episode.id);
      const stages = [...(deep?.stages ?? [])].sort((a, b) => a.order - b.order);
      stages.forEach((stage, index) => {
        const timer = window.setTimeout(() => {
          setTerritorialRevealedStageIds((prev) =>
            prev.includes(stage.id) ? prev : [...prev, stage.id],
          );
          setTerritorialActiveStageId(stage.id);
          flyTo(stage.coordinates[1], stage.coordinates[0], 0.7, 850, {
            pitch: 50,
            bearing: -10 + index * 4,
          });
        }, 650 + index * 900);
        territorialSequenceRef.current.push(timer);
      });

      const parchmentTimer = window.setTimeout(
        () => {
          setTerritorialEpisodeBrief(episode);
        },
        650 + stages.length * 900 + 700,
      );
      territorialSequenceRef.current.push(parchmentTimer);
    },
    [clearFrictionEpisodeTimer, clearTerritorialSequence, flyTo],
  );

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

  /** 귀중한 속보 — S/고충격만 양피지 타전 · 전선별 후보 병행 · 전장 fly-to
   *  등불(사진 데스크) 점화가 끝난 뒤에만 — 속보가 등불을 가로채지 않게. */
  useEffect(() => {
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceDone) return;
    if (!dailyLampSettled || !weeklyRecapSettled) return;
    if (periodicBriefing || airRaidBriefing || exerciseBriefing || weeklyExpanded) return;
    if (breakingFlash) return;
    const hero = pickNextBreakingFlashHero(newsStreamPayload, isEconomyViewer);
    if (!hero) return;

    let cancelled = false;
    void (async () => {
      const briefing = await buildBreakingFlashBriefingForLang(
        hero,
        labelLanguage,
        isEconomyViewer,
      );
      if (cancelled) return;
      if (!claimBreakingFlash(hero.id)) return;
      setBreakingFlash(briefing);
      if (briefing.theater && briefing.theater !== "global") {
        handleIntelFlyTo(flyTargetForTheater(briefing.theater));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    newsStreamPayload?.hero,
    newsStreamPayload?.flashHeroes,
    newsStreamPayload?.hero?.id,
    newsStreamPayload?.hero?.breakingRank,
    newsStreamPayload?.hero?.breakingGrade,
    newsStreamPayload?.hero?.title,
    newsStreamPayload?.hero?.summary,
    isEconomyViewer,
    labelLanguage,
    entryGate,
    showModePicker,
    langChoiceDone,
    dailyLampSettled,
    weeklyRecapSettled,
    periodicBriefing,
    airRaidBriefing,
    exerciseBriefing,
    weeklyExpanded,
    breakingFlash,
  ]);

  const { exerciseOffer, dismissExerciseOffer } = useExerciseAlertAuto({
    paused:
      isEconomyViewer ||
      entryGate !== null ||
      showModePicker ||
      issueUiPausedForLamp ||
      Boolean(airRaidBriefing) ||
      Boolean(airRaidOffer) ||
      Boolean(periodicBriefing) ||
      Boolean(breakingFlash),
    labelLanguage,
    exercises: displayMilitaryExercises,
    briefingBlocked:
      Boolean(periodicBriefing) || Boolean(airRaidBriefing) || Boolean(breakingFlash),
    exerciseBriefing,
    setExerciseBriefing,
    flyTo,
    patchLayerPrefsSoft,
    layerPrefsLiveRef,
  });

  /** 초크포인트 호버 → 물류 스트레스 관측 카드 (UKMTO A + PortWatch B) */
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
    );
    return { title, stress };
  }, [hoveredPoint, labelLanguage, ukmtoIncidents, portWatchByChokeId]);

  useLogisticsStressSiren({
    paused: entryGate !== null || showModePicker || issueUiPausedForLamp,
    ukmtoIncidents,
    aisByChokeId: portWatchByChokeId,
    flyTo,
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
  });

  /** NATO 동부 접경 UAV — 등불 pause 우회 · 지정학+Neptun만 */
  const { natoPerimeterAlert, dismissNatoPerimeterAlert } = useNatoPerimeterDroneAlert({
    enabled: !isEconomyViewer && showNeptun,
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
    hasMarketLink: Boolean(
      hotTheaterOffer?.theaterId || hotTheaterOffer?.chokeId,
    ),
    hotTheaterFocus: hotTheaterOffer,
    flyTo,
    mapElement: mapElForImpression,
    onApplyHotTheaterPatch: applyFirstImpressionPatch,
    onHotTheaterAutoConsumed: () => setHotTheaterOffer(null),
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
      Boolean(periodicBriefing),
    labelLanguage,
    showNavareaWarnings,
    showUkmtoIncidents,
    navareaFeatures,
    ukmtoIncidents,
    flyTo,
    patchLayerPrefsSoft,
    layerPrefsLiveRef,
    skipNextGlobeClickRef,
  });


  function openIntelSheet(options?: {
    theater?: IntelTheaterFilter;
    tab?: "news" | "video" | "telegram" | "viina";
    economyTab?: "news" | "video" | "markets" | "majors" | "shipping-choke" | "aviation";
    lat?: number;
    lng?: number;
    altitude?: number;
  }) {
    setSelected(null);
    if (!historyImmersionRef.current) setRegionNavSelection(null);
    setBottomDockMode("news");
    writeBottomDockMode("news");
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

  // 하단 독 「뉴스」→ 시트 즉시 오픈 (모드만 바꾸면 CompactBar만 뜨고 창은 안 열림)
  bottomDockModeChangeRef.current = (mode) => {
    if (mode === "history") {
      setBottomDockMode("history");
      writeBottomDockMode("history");
      setIntelSheetOpen(false);
      return;
    }
    openIntelSheet({ theater: "all", tab: "news" });
  };

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
    setBottomDockMode("news");
    writeBottomDockMode("news");
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

  useEffect(() => {
    if (!initialViewConfig?.ui.openLayerPanel || isCompactUi) return;
    const timer = window.setTimeout(() => setShowLeftPanel(true), 0);
    return () => window.clearTimeout(timer);
  }, [initialViewConfig?.ui.openLayerPanel, isCompactUi]);

  function applyMergedViewConfig(
    merged: MergedViewConfig,
    packages: ViewPackageId[],
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = merged.economyHub ?? "auto",
  ) {
    if (domainThenDetailTimerRef.current != null) {
      window.clearTimeout(domainThenDetailTimerRef.current);
      domainThenDetailTimerRef.current = null;
    }
    dismissLayerPanel(true);

    // 모드·패키지는 동기 적용 — startTransition에 넣으면 entryGate가 먼저 풀리며
    // 한 프레임(또는 더 길게) 지정학으로 남아 등불·전장 이펙트가 잘못 점화됨.
    applyLayerPrefs(merged.layers);
    setViewUi({ ...merged.ui, autoOpenIntelSheet: false });
    setViewTheater(theater);
    setViewEconomyHub(economyHub);
    setViewPackages(packages.filter((id) => id !== "custom"));
    setIntelTheaterFilter(theater !== "auto" ? theater : "all");
    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setEntryGate(null);
    markWelcomeGateDone();

    startTransition(() => {
      if (merged.ui.openLayerPanel && !isCompactUi) {
        setShowLeftPanel(true);
      }
    });
  }

  function handleModeApply(
    mode: ViewerMode,
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = "auto",
  ) {
    if (historyStoryLockedRef.current) return;
    setIntelSheetOpen(false);
    clearRegionNavSelection();
    setEconNavSelection(null);
    closeEconInsight();
    clearEconInsightTimer();
    setEconNewsPanelReveal(false);
    setSelected(null);
    packageTheaterFocusPlayedRef.current = false;
    packageEconFocusPlayedRef.current = false;
    // 세부 확정 직후에도 우크라/NEPTUN 강제 줌은 잠시 막고, autoEnter 전장/허브 fly만 허용
    suppressAutoRegionZoomRef.current = true;
    ukraineZoomPendingRef.current = false;
    neptunZoomPendingRef.current = false;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    const effectiveTheater = mode === "conflict" ? theater : "auto";
    const effectiveHub = mode === "economy" ? economyHub : "auto";
    const { merged, packages } = applyViewerMode(mode, effectiveTheater, effectiveHub);
    applyMergedViewConfig(merged, packages, effectiveTheater, effectiveHub);
    if (mode === "conflict" && effectiveTheater !== "auto") {
      rememberConflictTheater(effectiveTheater);
    } else if (mode === "economy" && effectiveHub !== "auto") {
      rememberEconomyHub(effectiveHub, String(effectiveHub), String(effectiveHub));
    }
    if (mode === "economy") {
      setUkraineFrontLegendEngaged(false);
      setShowDisputeLegendPanel(false);
      setGdeltEvents([]);
      setGdeltFetchedAt(null);
      setGdeltError(null);
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
    }
    // 지정학 + 자동 전장: 전역 궤도 하드코딩 (우크라·핫알림 자동 fly 금지)
    if (mode === "conflict" && effectiveTheater === "auto") {
      packageTheaterFocusPlayedRef.current = true;
      setViewUi((prev) => ({
        ...prev,
        autoEnterTheaterNavId: null,
        autoOpenIntelSheet: false,
      }));
      const orbit = entryOrbitCamera(size);
      layerCenterRef.current = {
        lat: orbit.lat,
        lng: orbit.lng,
      };
      layerAltitudeRef.current = orbit.altitude;
      layerLodTierRef.current = getGlobeLod(orbit.altitude).tier;
      setFilterCenter({
        lat: orbit.lat,
        lng: orbit.lng,
      });
      setLayerAltitude(orbit.altitude);
      flyTo(
        orbit.lat,
        orbit.lng,
        orbit.altitude,
        ENTRY_GATE.zoomOutFlyMs,
        { pitch: orbit.pitch },
      );
    }
    window.setTimeout(() => {
      ukraineZoomPendingRef.current = false;
      neptunZoomPendingRef.current = false;
      suppressAutoRegionZoomRef.current = false;
    }, 1600);
  }

  function handleCustomLayerApply() {
    const merged = applyViewPackages(["custom"], "auto");
    applyMergedViewConfig(merged, ["custom"], "auto");
  }

  function handleViewerModeChange(mode: ViewerMode) {
    if (historyStoryLockedRef.current) return;
    if (viewerMode === mode) return;
    trackModeSwitch(mode);
    recordInterestMode(mode);
    prepareLampForModeSwitch(mode);
    handleModeApply(
      mode,
      mode === "conflict" ? viewTheater : "auto",
      mode === "economy" ? viewEconomyHub : "auto",
    );
  }

  useEffect(() => {
    if (isLoading || loadError || !globeReady || introPlayedRef.current) return;
    if (entryGate !== null || showModePicker) return;
    if (viewUi.autoEnterTheaterNavId ?? initialViewConfig?.ui.autoEnterTheaterNavId) return;
    if (viewUi.autoEnterEconNavId ?? initialViewConfig?.ui.autoEnterEconNavId) return;

    if (typeof window !== "undefined" && sessionStorage.getItem(INTRO_SESSION_KEY)) {
      introPlayedRef.current = true;
      return;
    }

    introPlayedRef.current = true;

    // 전역 궤도만 유지 — 핫 지역 자동 fly 금지 (선택창에서만 이동)
    if (showUkraineControl) {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      return;
    }

    const startTimer = window.setTimeout(() => {
      setShowIntroHint(true);
      const orbit = entryOrbitCamera(size);
      flyTo(
        orbit.lat,
        orbit.lng,
        orbit.altitude,
        INTRO_CAMERA_DURATION_MS,
        { pitch: orbit.pitch },
      );
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }, INTRO_CAMERA_DELAY_MS);

    const hintTimer = window.setTimeout(() => {
      setShowIntroHint(false);
    }, INTRO_CAMERA_DELAY_MS + INTRO_CAMERA_DURATION_MS + 600);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(hintTimer);
    };
  }, [
    entryGate,
    flyTo,
    globeReady,
    initialViewConfig?.ui.autoEnterEconNavId,
    initialViewConfig?.ui.autoEnterTheaterNavId,
    isLoading,
    loadError,
    showModePicker,
    showUkraineControl,
    viewUi.autoEnterEconNavId,
    viewUi.autoEnterTheaterNavId,
  ]);

  useEffect(() => {
    if (isLoading || !globeReady || loadError) return;
    if (entryGate !== null || showModePicker) return;
    if (hasPendingScene()) return; // 딥링크 진입은 게이트 생략
    // 한글/영문 미확정이면 LanguageGate만 — 지정학·지경학 창보다 먼저
    if (!readLangChoiceDone()) return;
    if (!readSourcesGateDone()) {
      setEntryGate(readWelcomeGateDone() ? "sources" : "caution");
      return;
    }
    if (readWelcomeGateDone()) return;
    setEntryGate("domain");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryGate, globeReady, isLoading, loadError, showModePicker, langChoiceDone]);

  useEffect(() => {
    return () => {
      if (domainThenDetailTimerRef.current != null) {
        window.clearTimeout(domainThenDetailTimerRef.current);
        domainThenDetailTimerRef.current = null;
      }
    };
  }, []);

  function openModePickerManual() {
    if (historyStoryLockedRef.current) return;
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setShowModePicker(true);
  }

  function handleDomainSelect(mode: ViewerMode, ultraLiteOn: boolean) {
    if (historyStoryLockedRef.current) return;
    trackDomainSelect(mode, ultraLiteOn);
    ultraLiteRef.current = ultraLiteOn;
    setUltraLite(ultraLiteOn);
    savePerfPrefs({ ultraLite: ultraLiteOn });
    unpinUserLayers();

    suppressAutoRegionZoomRef.current = true;
    ukraineZoomPendingRef.current = false;
    neptunZoomPendingRef.current = false;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }

    const overviewPrefs = buildDomainOverviewPrefs(mode, {
      labelLanguage: layerPrefsLiveRef.current.labelLanguage,
      ultraLite: ultraLiteOn,
    });

    // 패키지·크롬을 먼저 확정한 뒤 히어로 레이어로 덮음 (게이트 해제와 같은 틱에 지경학 반영)
    handleModeApply(mode, "auto", "auto");
    applyLayerPrefs(overviewPrefs);

    // 첫 화면은 전역 궤도 유지 — 핫 지역 줌인은 선택창 수락 후에만
    const entryLook = entryOrbitCamera(size);

    layerCenterRef.current = {
      lat: entryLook.lat,
      lng: entryLook.lng,
    };
    layerAltitudeRef.current = entryLook.altitude;
    layerLodTierRef.current = getGlobeLod(entryLook.altitude).tier;
    setFilterCenter({
      lat: entryLook.lat,
      lng: entryLook.lng,
    });
    setLayerAltitude(entryLook.altitude);
    flyTo(
      entryLook.lat,
      entryLook.lng,
      entryLook.altitude,
      ENTRY_GATE.zoomOutFlyMs,
      { pitch: entryLook.pitch },
    );

    // 도메인 직후는 광역 히어로만 — 전장/허브 자동 fly·양피지 금지
    packageTheaterFocusPlayedRef.current = true;
    packageEconFocusPlayedRef.current = true;
    setViewUi((prev) => ({
      ...prev,
      autoEnterTheaterNavId: null,
      autoEnterEconNavId: null,
      autoOpenIntelSheet: false,
    }));
    setHubBriefOpen(false);
    clearHubBriefTimer();
    setRegionNavSelection(null);
    setEconNavSelection(null);
    setFrictionEpisodeBrief(null);
    setRegimeSelectedEpisodeId(null);
    clearFrictionEpisodeTimer();
    closeEconInsight();
    clearEconInsightTimer();
    setEconNewsPanelReveal(false);

    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setEntryGate(null);
    markWelcomeGateDone();
    // 첫 진입 연쇄 축소: 모드 인트로·퀵스타트는 자동으로 띄우지 않음
    markViewerIntroDone(mode);
    markQuickStartDone(mode);
    setShowViewerIntro(false);
    setShowQuickStart(false);
    if (domainThenDetailTimerRef.current != null) {
      window.clearTimeout(domainThenDetailTimerRef.current);
      domainThenDetailTimerRef.current = null;
    }
    // 크롬 코치는 일일 등불 양피지 이후 — 등불 effect / dismiss에서 점화
  }

  function handleModePickerCancel() {
    if (domainThenDetailTimerRef.current != null) {
      window.clearTimeout(domainThenDetailTimerRef.current);
      domainThenDetailTimerRef.current = null;
    }
    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    if ((entryGate === "mode" || entryGate === "overview") && !readWelcomeGateDone()) {
      setEntryGate("domain");
    } else {
      setEntryGate(null);
    }
  }

  /** 공습경보 칩에 처음 다가갈 때만 1회 설명 (투어는 기능 안내에서 수동) */
  const maybeOfferAirRaidCoach = useCallback(() => {
    if (isEconomyViewer) return;
    if (issueUiPausedForLamp) return;
    if (!firstImpression.onboardingReady) return;
    if (entryGate !== null || showModePicker || chromeCoachStep || showFirstVisitTour) return;
    if (!shouldOfferAirRaidCoach()) return;
    if (showAirRaidCoach) return;
    setShowAirRaidCoach(true);
  }, [
    chromeCoachStep,
    entryGate,
    firstImpression.onboardingReady,
    isEconomyViewer,
    issueUiPausedForLamp,
    showAirRaidCoach,
    showFirstVisitTour,
    showModePicker,
  ]);

  /** 화면 투어 — 자동 점화 없음. 기능 안내에서만 시작 */

  /** 월요일 주간 회고 — 등불보다 먼저 settle */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceChecked || !langChoiceDone) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    if (hubBriefOpen || frictionEpisodeBrief || econInsightOpen) return;
    // 인가 칩과 병렬 — 칩 dismiss 대기로 주간·등불이 영구 정지되지 않게

    const offer = resolveMondayWeeklyRecap();
    if (!offer) {
      if (!weeklyRecapSettled) setWeeklyRecapSettled(true);
      if (weeklyRecap) setWeeklyRecap(null);
      return;
    }

    const storageKey = weeklyRecapStorageKey(offer.weekKey, viewerMode);
    if (weeklyRecap?.key === storageKey) {
      if (!weeklyRecapSettled) setWeeklyRecapSettled(true);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const langQs = labelLanguage === "en" ? "en" : "ko";
        const lampMode = viewerMode === "economy" ? "economy" : "conflict";
        let featuredNews: PeriodicBriefing["featuredNews"] = [];
        try {
          const res = await fetch(
            `/api/lamp-news?mode=${lampMode}&lang=${langQs}&window=prev-week`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const payload = (await res.json()) as {
              featuredNews?: PeriodicBriefing["featuredNews"];
            };
            featuredNews = ensureLampFeaturedNews(payload.featuredNews ?? []);
          }
        } catch {
          /* empty shell */
        }
        const focusHint =
          watchFocusLine ??
          (labelLanguage === "en"
            ? "Monday photo desk — last week's hottest stories"
            : "월요일 사진 데스크 — 전주 뜨거웠던 소식");
        let content: PeriodicBriefing = {
          tier: "weekly",
          key: storageKey,
          title: weeklyRecapTitle(viewerMode, labelLanguage, focusHint),
          paragraphs: [],
          featuredNews,
        };
        content = await localizePeriodicBriefing(content, labelLanguage);
        if (!cancelled) {
          const startCollapsed = hasFoldedWeeklyRecap(storageKey);
          setWeeklyRecapCollapsed(startCollapsed);
          if (featuredNews.length > 0) {
            setWeeklyRecap(content);
          } else {
            setWeeklyRecap(null);
          }
          setWeeklyRecapSettled(true);
        }
      })();
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    calendarDayKey,
    chromeCoachStep,
    econInsightOpen,
    entryGate,
    frictionEpisodeBrief,
    globeReady,
    hubBriefOpen,
    isLoading,
    labelLanguage,
    langChoiceChecked,
    langChoiceDone,
    loadError,
    showAirRaidCoach,
    showModePicker,
    viewerMode,
    watchFocusLine,
    weeklyRecap,
    weeklyRecapSettled,
  ]);

  /**
   * 등불 — 지정학·지경학 각각 6시간 슬롯당 1회 자동 점화(대표 뉴스·큰 사진).
   * 닫으면 우측 「등불」탭으로 접힘. 다음 슬롯이 되면 다시 자동 펼침.
   * SLA: 게이트 해제 후 /api/lamp-news 응답까지 대기 — 카드 없으면 등불 생략.
   * /api/lamp-news — 양 패키지 + og:image 추가 보강 후 기사에 붙은 사진이 있는 핫뉴스만.
   * market-lamp / briefing-stats는 점화 후 보강만 (데드라인 블로킹 금지).
   */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceChecked || !langChoiceDone) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    const forceModeSwitchLamp = lampModeSwitchPendingRef.current;
    // 모드 전환 직후 — 주간 회고 대기 없이 바로 등불 (지정학↔지경학 뙇!)
    if (!forceModeSwitchLamp && (!weeklyRecapSettled || weeklyExpanded)) return;
    // 인가 칩이 안 닫혀도 등불·지도는 막지 않음 — 칩은 병렬 표시
    // (예전엔 clearanceChipSettled 대기로 dailyLampSettled가 영구 false → 오버레이 고착)

    // 다른 양피지 점유 중 — 모드 전환 등불만 예외, 나머지는 지도 잠금만 풀고 닫히면 재점화
    if (
      !forceModeSwitchLamp &&
      (hubBriefOpen || frictionEpisodeBrief || econInsightOpen)
    ) {
      setDailyLampSettled(true);
      return;
    }

    const { tier, contentSlot } = resolveLampPeriod();
    const slot = lampContentSlot.startsWith("daily-") ? lampContentSlot : contentSlot;
    const lampKey = lampSeenKey(slot, viewerMode);

    if (periodicBriefing?.key === lampKey) return;
    if (!forceModeSwitchLamp && foldedPeriodicBriefing?.key === lampKey) {
      setDailyLampSettled(true);
      return;
    }
    /** 유저가 「접기」한 슬롯 — 모드 전환 시에는 무시하고 자동 펼침 */
    const lampWasFolded = forceModeSwitchLamp ? false : hasFoldedLamp(lampKey);

    /** 등불 og 보강 + 선정 — 서버에서 최대 ~24s */
    const LAMP_NEWS_BUDGET_MS = 24_000;
    const MACRO_ENRICH_MS = 2_500;

    const fetchWithTimeout = async (url: string, ms: number): Promise<Response | null> => {
      const ctrl = new AbortController();
      const abortTimer = window.setTimeout(() => ctrl.abort(), ms);
      try {
        return await fetch(url, { cache: "no-store", signal: ctrl.signal });
      } catch {
        return null;
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    let cancelled = false;

    const settleWithoutLamp = () => {
      if (cancelled) return;
      if (forceModeSwitchLamp) {
        lampModeSwitchPendingRef.current = false;
      }
      setDailyLampSettled(true);
    };

    const ignite = (content: PeriodicBriefing) => {
      if (cancelled) return;
      if (forceModeSwitchLamp) {
        lampModeSwitchPendingRef.current = false;
      }
      if (lampWasFolded) {
        setFoldedPeriodicBriefing(content);
      } else {
        setPeriodicBriefing(content);
      }
      setDailyLampSettled(true);
    };

      void (async () => {
            const langQs = labelLanguage === "en" ? "en" : "ko";
      const isEconomy = viewerMode === "economy";

      const kicker = isEconomy
        ? labelLanguage === "en"
                ? tier === "monthly"
                  ? "This month's market lamp"
                  : tier === "weekly"
                    ? "This week's market lamp"
                    : "Today's market lamp"
                : tier === "monthly"
                  ? "이번 달 시장 등불"
                  : tier === "weekly"
                    ? "이번 주 시장 등불"
              : "오늘의 시장 등불"
        : labelLanguage === "en"
                ? tier === "monthly"
                  ? "This month's geopolitics lamp"
                  : tier === "weekly"
                    ? "This week's geopolitics lamp"
                    : "Today's geopolitics lamp"
                : tier === "monthly"
                  ? "이번 달 지정학 등불"
                  : tier === "weekly"
                    ? "이번 주 지정학 등불"
                    : "오늘의 지정학 등불";

      let focusTitle = isEconomy
        ? labelLanguage === "en"
          ? "Markets in focus"
          : "시장이 주목하는 뉴스"
        : labelLanguage === "en"
          ? "Global regional deep desk"
          : "전 세계 지역별 심층 데스크";

      let macroTable = buildLampMacroTable([], labelLanguage);
      let featuredNews: PeriodicBriefing["featuredNews"] = [];

      // 등불 — og:image 추가 보강 후 기사에 붙은 사진이 있는 핫뉴스만 (전쟁·자연재해·시장 충격)
      try {
        const lampMode = isEconomy ? "economy" : "conflict";
        const lampRes = await fetchWithTimeout(
          `/api/lamp-news?mode=${lampMode}&lang=${langQs}`,
          LAMP_NEWS_BUDGET_MS,
        );
        if (lampRes?.ok) {
          const lampPayload = (await lampRes.json()) as {
            featuredNews?: PeriodicBriefing["featuredNews"];
          };
          featuredNews = ensureLampFeaturedNews(lampPayload.featuredNews ?? []);
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      if (isEconomy) {
        try {
          const dayKeyForApi = calendarDayKey.startsWith("daily-")
            ? calendarDayKey
            : slot.replace(/-s[0-3]$/, "");
          const lampRes = await fetchWithTimeout(
            `/api/world-stats/market-lamp?dayKey=${encodeURIComponent(dayKeyForApi)}&lang=${langQs}`,
            MACRO_ENRICH_MS,
          );
          if (lampRes?.ok && !cancelled) {
            const lamp = (await lampRes.json()) as {
              disabled?: boolean;
              focusTitle?: string;
              macros?: Array<{
                name?: string | null;
                id?: string | null;
                inflationPct?: number | null;
                gdpGrowthPct?: number | null;
                unemploymentPct?: number | null;
                gdpPerCapitaUsd?: number | null;
                gdpUsd?: number | null;
              }>;
            };
            if (!lamp.disabled) {
              if (lamp.focusTitle) focusTitle = lamp.focusTitle;
              if (lamp.macros && lamp.macros.length > 0) {
                macroTable = buildLampMacroTable(lamp.macros, labelLanguage);
              }
            }
          }
        } catch {
          /* ignore macro fetch */
        }
      }

      if (cancelled) return;

      const hasLampContent = featuredNews.length > 0 || macroTable.length > 0;
      if (hasLampContent) {
        let content: PeriodicBriefing = {
          tier,
          key: lampKey,
          contentSlot: slot,
          title: `${kicker}\n${focusTitle}`,
          paragraphs: [],
          macroTable,
          featuredNews,
        };
        // 한글 UI — 서버 누락·영문 캐시 잔여분을 점화 직전 재번역
        content = await localizePeriodicBriefing(content, labelLanguage);
        if (cancelled) return;
        ignite(content);
      } else {
        settleWithoutLamp();
      }
      })();

    return () => {
      cancelled = true;
    };
  }, [
    calendarDayKey,
    chromeCoachStep,
    econInsightOpen,
    entryGate,
    frictionEpisodeBrief,
    foldedPeriodicBriefing,
    globeReady,
    hubBriefOpen,
    isLoading,
    labelLanguage,
    lampContentSlot,
    langChoiceChecked,
    langChoiceDone,
    loadError,
    periodicBriefing,
    showAirRaidCoach,
    showModePicker,
    viewerMode,
    weeklyExpanded,
    weeklyRecapSettled,
  ]);

  // 오늘의 WTI — 사운드 강도·등불 기축 (등불보다 먼저 확보) · asOf 스크럽 시 해당일
  // 단일 소스 캐시(worldTensionStore)를 거친다 — 화면마다 따로 fetch하면
  // cron 갱신 타이밍에 따라 같은 순간에도 서로 다른 GTI 숫자가 보일 수 있다
  // (2026-08-30 리포트: 상단 칩 59 vs 좌측 패널 56). DailyRankSharePanel도
  // 같은 스토어를 구독한다.
  useEffect(() => {
    const dateParam = isHistoricalView ? effectiveAsOf : null;
    const current = getWorldTensionEntry(dateParam);
    setWtiSnapshot(current.snapshot);
    setWtiFetchedAt(current.fetchedAt);
    const unsubscribe = subscribeWorldTension(dateParam, (entry) => {
      setWtiSnapshot(entry.snapshot);
      setWtiFetchedAt(entry.fetchedAt);
    });
    void refreshWorldTension(dateParam);
    return unsubscribe;
  }, [calendarDayKey, effectiveAsOf, isHistoricalView]);

  // 스크러버용 가용 날짜
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/daily-ranks/dates?limit=120", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { dates?: string[] };
        if (!cancelled && Array.isArray(data.dates)) {
          setRankAvailableDates(data.dates);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarDayKey]);

  // 히스토리 모드 — 라이브 레이어 OFF (가짜 과거 점 금지). 오늘로 복귀 시 복원.
  useEffect(() => {
    if (isHistoricalView) {
      if (!livePrefsBeforeHistoryRef.current) {
        const snap: Partial<Record<string, boolean>> = {};
        const patch: Record<string, boolean> = {};
        const live = layerPrefsLiveRef.current as Record<string, unknown>;
        for (const key of HISTORICAL_MODE_LIVE_PREF_KEYS) {
          if (typeof live[key] === "boolean") {
            snap[key] = live[key] as boolean;
            if (live[key] === true) patch[key] = false;
          }
        }
        livePrefsBeforeHistoryRef.current = snap;
        if (Object.keys(patch).length > 0) {
          patchLayerPrefsSoft(patch as Parameters<typeof patchLayerPrefsSoft>[0]);
        }
      }
      return;
    }
    const snap = livePrefsBeforeHistoryRef.current;
    if (snap) {
      livePrefsBeforeHistoryRef.current = null;
      const restore: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(snap)) {
        if (typeof value === "boolean") restore[key] = value;
      }
      if (Object.keys(restore).length > 0) {
        patchLayerPrefsSoft(restore as Parameters<typeof patchLayerPrefsSoft>[0]);
      }
    }
  }, [isHistoricalView, patchLayerPrefsSoft, layerPrefsLiveRef]);

  // 세션 1회: daily-ranks 핫 전장·초크 → 선택창 (수락 시에만 레이어·카메라)
  useEffect(() => {
    if (!globeReady || isLoading || entryGate !== null || showModePicker) return;
    if (hotTheaterSessionConsumed()) return;
    if (hotTheaterOffer) return;
    let cancelled = false;
    const delay = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/daily-ranks?limit=3", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as DailyRanksPayload;
          const focus = resolveHotTheaterFocus(data);
          if (!focus || cancelled) return;
          setHotTheaterOffer(focus);
        } catch {
          /* ranks 없으면 선택창 생략 */
        }
      })();
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(delay);
    };
  }, [
    entryGate,
    globeReady,
    hotTheaterOffer,
    isLoading,
    showModePicker,
  ]);

  const acceptHotTheaterOffer = useCallback(() => {
    const focus = hotTheaterOffer;
    setHotTheaterOffer(null);
    if (!focus) return;
    markHotTheaterSessionApplied();
    if (isEconomyViewer) {
      patchLayerPrefsSoft({
        showShippingLanes: true,
        showLogisticsRisk: true,
        showPorts: true,
        showGasPipelines: true,
        showLngTerminals: true,
        showResources: true,
        showAis: true,
        showNewfeedsIranAttacks: focus.theaterId === "middle-east",
      });
    } else {
      patchLayerPrefsSoft(focus.patch);
      const softZone =
        focus.theaterId === "middle-east" ||
        focus.chokeId === "choke-bab-el-mandeb" ||
        focus.chokeId === "choke-hormuz" ||
        focus.chokeId === "choke-suez"
          ? "middle-east"
          : focus.theaterId === "ukraine" || focus.theaterId === "russia-ukraine"
            ? "ukraine"
            : focus.theaterId === "taiwan" || focus.theaterId === "china-taiwan"
              ? "taiwan"
              : focus.theaterId === "korea"
                ? "korea"
                : null;
      if (softZone) {
        battlefieldSoftZoneRef.current = softZone;
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      }
    }
    if (focus.fly) {
      flyTo(focus.fly.lat, focus.fly.lng, focus.fly.altitude);
    }
  }, [flyTo, hotTheaterOffer, isEconomyViewer, patchLayerPrefsSoft]);

  const dismissHotTheaterOffer = useCallback(() => {
    setHotTheaterOffer(null);
    markHotTheaterSessionApplied();
  }, []);

  // 핫 전장·초크 긴장 스파이크 → 렌즈 컷 오퍼
  const { tensionSpike, dismissTensionSpike } = useTensionSpikeCut({
    enabled: !isEconomyViewer,
    blocked: entryGate !== null || showModePicker || Boolean(airRaidBriefing) || issueUiPausedForLamp,
    calendarDayKey,
  });

  const onTensionSpikeJump = useCallback(
    (destination: TensionCutDestination) => {
      if (!tensionSpike) {
        dismissTensionSpike();
        return;
      }
      const target = resolveTensionCutNav(tensionSpike.entityId, destination);
      const selection =
        (target.economyNavId ? econNavSelectionFromId(target.economyNavId) : null) ??
        (target.conflictNavId ? navSelectionFromId(target.conflictNavId) : null);
      if (selection) {
        flyToBounds(selection, 1100, "overview");
      }
      dismissTensionSpike();
      markHotTheaterSessionApplied();
    },
    [dismissTensionSpike, flyToBounds, tensionSpike],
  );

  // 일 1회: 관심 프로필 soft 레이어 ON만 (끄기 없음 · 프리셋 픽커 없음)
  useEffect(() => {
    if (!globeReady || isLoading || entryGate !== null || showModePicker) return;
    const resolved = resolveInterestSoftApply(isEconomyViewer ? "economy" : "conflict");
    if (!resolved) return;
    markInterestSoftApplyToday();
    patchLayerPrefsSoft(resolved.patch);
  }, [
    entryGate,
    globeReady,
    isEconomyViewer,
    isLoading,
    patchLayerPrefsSoft,
    showModePicker,
    calendarDayKey,
  ]);

  // 양피지·인텔시트 등 대형 패널이 열리면 관점 패널 닫기 (겹침 방지)
  useEffect(() => {
    if (
      periodicBriefing ||
      weeklyExpanded ||
      intelSheetOpen ||
      hubBriefOpen ||
      frictionEpisodeBrief ||
      econInsightOpen ||
      airRaidBriefing ||
      exerciseBriefing
    ) {
      setNewsPerspectives(null);
    }
  }, [
    airRaidBriefing,
    econInsightOpen,
    exerciseBriefing,
    frictionEpisodeBrief,
    hubBriefOpen,
    intelSheetOpen,
    periodicBriefing,
    weeklyExpanded,
  ]);

  useEffect(() => {
    const pins = loadWatchPins();
    if (pins.length === 0) {
      setWatchFocusLine(null);
      return;
    }
    const langKey = labelLanguage === "en" ? "en" : "ko";
    let cancelled = false;
    void (async () => {
      const ranksByEntity: Record<string, { rank: number; prevRank: number | null }> = {};
      const needsRanks = pins.some((p) => p.rankEntityId);
      if (needsRanks) {
        try {
          const res = await fetch("/api/daily-ranks?limit=10", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const data = (await res.json()) as DailyRanksPayload;
            for (const p of pins) {
              if (!p.rankEntityId) continue;
              const list =
                p.rankKind === "chokepoint" ? data.chokepoint ?? [] : data.theater ?? [];
              const hit = list.find((r) => r.entityId === p.rankEntityId);
              if (hit) ranksByEntity[p.rankEntityId] = { rank: hit.rank, prevRank: hit.prevRank };
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setWatchFocusLine(formatWatchPinsLine(pins, langKey, ranksByEntity));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    calendarDayKey,
    labelLanguage,
    regionNavSelection?.id,
    econNavSelection?.id,
    viewTheater,
    viewEconomyHub,
  ]);

  // 등불 양피지가 뜨면 진행 중이던 공습 배너·코치 즉시 중단
  useEffect(() => {
    if (!periodicBriefing && !weeklyRecap) return;
    clearAirRaidOffer();
    setShowAirRaidCoach(false);
  }, [periodicBriefing, weeklyRecap, clearAirRaidOffer]);

  // 모드·일자 전환 시 공습 오퍼도 리셋 (clearAirRaidOffer 선언 이후)
  useEffect(() => {
    clearAirRaidOffer();
  }, [viewerMode, calendarDayKey, clearAirRaidOffer]);

  // SENTINEL — 지정학=전장/초크, 지경학=초크·경제 중심지 (전장 제외)
  useEffect(() => {
    if (!sentinelActive) return;
    let cancelled = false;
    let timer: number | null = null;

    const runStop = (targets: SentinelFlyTarget[]) => {
      if (cancelled || targets.length === 0) return;
      setSentinelTour(targets);
      let i = 0;
      const tick = () => {
        if (cancelled) return;
        const t = targets[i % targets.length];
        if (t) {
          setSentinelIndex(i % targets.length);
          flyTo(t.lat, t.lng, t.altitude, 1600, { pitch: 38, bearing: (i * 37) % 360 });
        }
        i += 1;
        timer = window.setTimeout(tick, SENTINEL_CYCLE_MS);
      };
      tick();
    };

    void (async () => {
      const tour = await fetchSentinelTour(isEconomyViewer ? "economy" : "conflict");
      if (cancelled) return;
      if (tour.length === 0) {
        setSentinelActive(false);
        return;
      }
      runStop(tour);
    })();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [sentinelActive, flyTo, isEconomyViewer]);

  const layerDebugPrevRef = useRef<{
    labels: number;
    heatmaps: number;
    polygons: number;
    paths: number;
    labelKey: string;
    heatmapKey: string;
    polygonKey: string;
    pathKey: string;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const labelKey = globeLabels
      .slice(0, 24)
      .map((item) => `p:${item.id}`)
      .join("|");
    const heatmapKey = rawTensionHeatmaps
      .map((layer) => `${layer.id}:${layer.points.length}:${layer.bandwidth.toFixed(2)}`)
      .join("|");
    const polygonKey = polygonData
      .slice(0, 24)
      .map((item) => `${item.polygonLayer}:${item.id}`)
      .join("|");
    const pathKey = rawGlobePaths
      .slice(0, 24)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|");

    const next = {
      labels: globeLabels.length,
      heatmaps: rawTensionHeatmaps.reduce((sum, layer) => sum + layer.points.length, 0),
      polygons: polygonData.length,
      paths: rawGlobePaths.length,
      labelKey,
      heatmapKey,
      polygonKey,
      pathKey,
    };

    const prev = layerDebugPrevRef.current;
    if (prev) {
      const churned =
        prev.labelKey !== next.labelKey ||
        prev.heatmapKey !== next.heatmapKey ||
        prev.polygonKey !== next.polygonKey ||
        prev.pathKey !== next.pathKey;
      if (churned) {
        console.debug("[globe-layer-churn]", {
          viewAltitude: Number(viewState.altitude.toFixed(3)),
          layerAltitude: Number(layerViewState.altitude.toFixed(3)),
          lodTier: layerLodTierRef.current,
          labels: `${prev.labels} -> ${next.labels}`,
          heatmapPoints: `${prev.heatmaps} -> ${next.heatmaps}`,
          polygons: `${prev.polygons} -> ${next.polygons}`,
          paths: `${prev.paths} -> ${next.paths}`,
        });
      }
    }
    layerDebugPrevRef.current = next;
  }, [
    globeLabels,
    rawGlobePaths,
    layerViewState.altitude,
    polygonData,
    rawTensionHeatmaps,
    viewState.altitude,
  ]);

  const handleAskLayersApply = useCallback(
    (payload: AskLayersApplyPayload) => {
      if (payload.patch && Object.keys(payload.patch).length > 0) {
        pinUserLayers();
        const patch = isEconomyViewer
          ? stripEconomyGeopoliticsPatch(payload.patch)
          : payload.patch;
        patchLayerPrefsSoft(patch);
      }
      const intent = payload.intent;
      if (intent === "middle-east" || intent === "red-sea-houthi" || intent === "today-hot") {
        battlefieldSoftZoneRef.current = "middle-east";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      } else if (intent === "ukraine") {
        battlefieldSoftZoneRef.current = "ukraine";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      } else if (intent === "china-taiwan") {
        battlefieldSoftZoneRef.current = "taiwan";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      } else if (intent === "korea") {
        battlefieldSoftZoneRef.current = "korea";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      }
      if (payload.fly) {
        interruptFlySnap();
        flyTo(payload.fly.lat, payload.fly.lng, payload.fly.altitude);
      }
    },
    [flyTo, interruptFlySnap, isEconomyViewer, patchLayerPrefsSoft, pinUserLayers],
  );

  const handleOpenNewsInsight = useCallback(
    (article: NewsStreamItem) => {
      setIntelSheetOpen(false);
      setNewsPerspectives(null);
      setNewsInsightCallout(null);
      setEconNavSelection(null);
      setEconNewsPanelReveal(false);
      // 표시 제목/요약은 NewsInsightPanel이 localizedTitle·Summary로 맞춤 (영문 고착 방지)
      setSelected({
        kind: "news-insight",
        item: { article },
      });
    },
    [],
  );

  const handleNewsInsightApplyMap = useCallback(
    (payload: NewsInsightApplyPayload) => {
      const mode: NewsInsightMode = isEconomyViewer ? "economy" : "conflict";
      const ids = [...payload.layerIds];
      if (payload.bundleId) ids.push(payload.bundleId);
      const rawPatch = patchFromNewsInsightIds(ids, mode);
      if (Object.keys(rawPatch).length > 0) {
        pinUserLayers();
        const patch = isEconomyViewer
          ? stripEconomyGeopoliticsPatch(rawPatch)
          : rawPatch;
        patchLayerPrefsSoft(patch);
      }

      const hint = resolveFlyHint(payload.layerIds, payload.bundleId, mode);
      const article =
        selected?.kind === "news-insight" ? selected.item.article : null;
      const theaterFly = article ? THEATER_FLY_TO[article.theater] : null;
      const lat =
        payload.center?.lat ?? hint?.lat ?? theaterFly?.lat ?? filterCenter.lat;
      const lng =
        payload.center?.lng ?? hint?.lng ?? theaterFly?.lng ?? filterCenter.lng;
      const altitude =
        payload.altitude ?? hint?.altitude ?? theaterFly?.altitude ?? 1.85;

      interruptFlySnap();
      flyTo(lat, lng, altitude);

      if (selected?.kind === "news-insight") {
        setNewsInsightCallout({
          markerId: `news-insight-callout-${article?.id ?? "x"}`,
          displayKind: "news-insight-callout",
          id: article?.id ?? "news-insight",
          lat,
          lng,
          title: payload.calloutTitle,
          link: article?.link,
          article: article ?? undefined,
        });
      }
    },
    [
      filterCenter.lat,
      filterCenter.lng,
      flyTo,
      interruptFlySnap,
      isEconomyViewer,
      patchLayerPrefsSoft,
      pinUserLayers,
      selected,
    ],
  );

  useEffect(() => {
    if (selected?.kind !== "news-insight") {
      setNewsInsightCallout(null);
    }
  }, [selected]);

  function handleNavNavigate(selection: NavSelection) {
    if (isEconomyViewer) {
      enterEconomyRegionFocus(selection);
    } else {
      enterTheaterFocus(selection);
    }
  }

  function handleExplorationSelect(preset: (typeof EXPLORATION_PRESETS)[number]) {
    if (historyStoryLockedRef.current) return;
    const zone = battlefieldZoneFromExplorationId(preset.id);
    if (zone) {
      unpinUserLayers();
      battlefieldManualUntilRef.current = Date.now() + 12_000;
      battlefieldSoftZoneRef.current = zone;
      applyLayerPrefs(applyBattlefieldPreset(zone, layerPrefsLiveRef.current));
      setChromeCoachStep(null);
    }
    handleNavNavigate(toNavSelection(preset.navItem, preset.groupId));
    if (
      !isEconomyViewer &&
      (preset.id === "taiwan" ||
        preset.id === "taiwan-strait" ||
        preset.navItem?.id === "taiwan" ||
        preset.navItem?.id === "taiwan-strait")
    ) {
      setLivingTaiwanOpen(true);
    }
  }

  useEffect(() => {
    if (isEconomyViewer || entryGate !== null || showModePicker) return;
    if (historyStoryLockedRef.current) return;
    // 유저가 직접 켠/끈 레이어는 전장 프리셋이 allShowOff로 지우지 않는다
    if (userLayerPinRef.current) return;
    // 레이어 패널·퀵 드롭다운을 여는 동안에도 soft-apply 금지
    if (showLeftPanel || layerDropdownOpen || layerPanelDirty) return;
    if (Date.now() < battlefieldManualUntilRef.current) return;

    // 드래그 idle 직후 전장 bbox 경계에서 zone이 흔들리면 프리셋이 연속 적용되며
    // 화면이 튕기듯 재구성된다 — 짧게 디바운스해 확정 zone만 반영
    const timer = window.setTimeout(() => {
      if (userLayerPinRef.current) return;
      if (Date.now() < battlefieldManualUntilRef.current) return;
      const zone = detectBattlefieldZone(
        layerViewState.lat,
        layerViewState.lng,
        layerViewState.altitude,
      );
      // 전역으로 다시 빠지면 ADS-B·AIS 등 상세 레이어를 끄고 히어로 3종만 유지
      if (!zone) {
        if (battlefieldSoftZoneRef.current == null) return;
        battlefieldSoftZoneRef.current = null;
        applyLayerPrefs(
          buildDomainOverviewPrefs("conflict", {
            labelLanguage: layerPrefsLiveRef.current.labelLanguage,
            ultraLite: ultraLiteRef.current,
          }),
        );
        return;
      }
      if (battlefieldSoftZoneRef.current === zone) return;
      battlefieldSoftZoneRef.current = zone;
      applyLayerPrefs(applyBattlefieldPreset(zone, layerPrefsLiveRef.current));
    }, 360);

    return () => window.clearTimeout(timer);
  }, [
    applyLayerPrefs,
    entryGate,
    isEconomyViewer,
    layerDropdownOpen,
    layerPanelDirty,
    layerViewState.altitude,
    layerViewState.lat,
    layerViewState.lng,
    showLeftPanel,
    showModePicker,
  ]);

  function handleRegionEventSelect(event: ScoredEvent) {
    flyTo(event.lat, event.lng, 0.72);
    openSelection({ kind: "event", item: event });
  }

  const handleNeptunThreatSelect = useCallback(
    (threat: NeptunLiveThreat) => {
      dismissLayerPanel(true);
      clearRegionNavSelection();
      setIntelSheetOpen(false);
      if (!isEconomyViewer) {
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
    if (!isEconomyViewer) setShowDisputeLegendPanel(true);
    flyTo(alert.center.lat, alert.center.lng, 0.88);
    openSelection({ kind: "dispute", item: alert });
  }

  function handleGdeltAlertSelect(alert: MenuCoreAlert) {
    clearRegionNavSelection();
    setIntelSheetOpen(false);
    flyTo(alert.lat, alert.lng, 0.88);
    openSelection({ kind: "event", item: alert });
  }

  const handleAirRaidFocus = useCallback(
    (
      target: AirRaidFocusTarget,
      kind: AirRaidSirenKind,
      options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
    ) => {
      flyTo(target.lat, target.lng, AIR_RAID_FLY_ALTITUDE, AIR_RAID_FLY_MS);
      // 공습경보 레이어 OFF면 사이렌 없음 (시각 포커스·빗금만)
      // 자동 fly: 도착 직후 재생 (delay ≈ fly duration)
      if (!options?.skipSiren) {
        const sirenDelay = options?.deferSirenUntilArrive
          ? AIR_RAID_FLY_MS
          : AIR_RAID_SIREN_DELAY_MS;
        playAirRaidSirenAfterFly(kind, sirenDelay, () => {
          // 자동 개입: 레이어 OFF여도 도착 직후 사이렌 (newfeeds 제외)
          if (options?.deferSirenUntilArrive) return kind !== "newfeeds";
          const prefs = layerPrefsLiveRef.current;
          if (kind === "tzeva") return prefs.showTzevaAdom;
          if (kind === "neptun") return prefs.showNeptun;
          return false;
        });
      }
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
        airRaidFocusClearRef.current = null;
      }
      const box = buildAirRaidFocusBox(target.lat, target.lng, kind);
      setAirRaidFocusBox(box);
      setAirRaidFocusPaths(
        buildAirRaidFocusHatchPaths(target.lat, target.lng, kind, target.label),
      );
      airRaidFocusClearRef.current = window.setTimeout(() => {
        setAirRaidFocusPaths([]);
        setAirRaidFocusBox(null);
        airRaidFocusClearRef.current = null;
      }, AIR_RAID_FOCUS_HATCH_MS);
    },
    [flyTo],
  );

  /**
   * 이스라엘·이란 신규 공습 자동 ON·배너 — useAirRaidAutoLayer 훅으로 추출 (분리 3단계).
   * src/components/globe/hooks/useAirRaidAutoLayer.ts
   */
  handleAirRaidFocusRef.current = handleAirRaidFocus;

  useEffect(() => {
    return () => {
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
      }
    };
  }, []);

  const openSelection = useCallback((next: Selection) => {
    dismissLayerPanel(true);
    setNewsPerspectives(null);
    setIntelSheetOpen(false);
    setEconNavSelection(null);
    setEconNewsPanelReveal(false);
    closeEconInsight();
    // 우측 분석 패널과 관점/양피지 동시 오픈 금지
    setHubBriefOpen(false);
    setFrictionEpisodeBrief(null);
    setLivingTaiwanOpen(false);
    if (!historyImmersionRef.current) {
      clearRegionNavSelection();
    }
    setSelected(next);
    recordInterestFromSelection(next);
  }, [clearRegionNavSelection, closeEconInsight, dismissLayerPanel]);

  function handlePointClick(event: ConflictEvent) {
    openIntelFromCoords(event.lat, event.lng, 0.92);
  }

  const handleCarrierSelect = useCallback((carrier: UsCarrier) => {
    emitLayerClickSounds(CARRIER_CLICK_CUES, { altitude: layerAltitude });
    openSelection({ kind: "us-carrier", item: carrier });
    flyTo(carrier.lat, carrier.lng, 0.75);
  }, [flyTo, layerAltitude, openSelection]);

  const handleMilAircraftSelect = useCallback((aircraft: MilitaryAircraft) => {
    emitLayerClickSounds(cuesForAircraft("military"), { altitude: layerAltitude });
    openSelection({ kind: "mil", item: aircraft, traffic: "military" });
    flyTo(aircraft.lat, aircraft.lng, 0.55);
  }, [flyTo, layerAltitude, openSelection]);

  const handleCivAircraftSelect = useCallback((aircraft: MilitaryAircraft) => {
    emitLayerClickSounds(cuesForAircraft("civil"), { altitude: layerAltitude });
    openSelection({ kind: "mil", item: aircraft, traffic: "civil" });
    flyTo(aircraft.lat, aircraft.lng, 0.55);
  }, [flyTo, layerAltitude, openSelection]);

  /**
   * 선박(AIS) — DOM Marker에서 symbol 레이어로 이전 (aisVesselSymbols.ts).
   * handleGlobePointClick의 "ais" 분기(저줌 map-points용)와 동일 로직 —
   * 여기는 고줌 symbol 레이어 클릭용.
   */
  const handleAisSymbolSelect = useCallback((vessel: AisVessel) => {
    skipNextGlobeClickRef.current = true;
    emitLayerClickSounds(
      cuesForAisVessel({
        disguised: Boolean(vessel.disguised),
        militaryKind: vessel.militaryKind,
      }),
      { altitude: layerAltitude },
    );
    openSelection({ kind: "ais", item: vessel });
    flyTo(vessel.lat, vessel.lng, 0.45);
  }, [flyTo, layerAltitude, openSelection, skipNextGlobeClickRef]);

  const handleAisSymbolHover = useCallback(
    (vessel: AisVessel | null) => {
      handleHtmlMarkerHover(vessel as unknown as GlobeDisplayPoint | null);
    },
    [handleHtmlMarkerHover],
  );

  const handleInfraStaticClick = useCallback(
    (point: { kind: string; lat: number; lng: number; id?: string; name?: string; meta?: Record<string, string | number | null> }) => {
      emitLayerClickSounds(cuesForStaticKind(point.kind), { altitude: layerAltitude });
      if (point.kind === "chokepoint") {
        openSelection({ kind: "chokepoint", item: point as StaticPoint });
      } else if (point.kind === "airport" || point.kind === "port") {
        openSelection({ kind: "static-infra", item: point as StaticPoint });
      }
      flyTo(point.lat, point.lng, point.kind === "airport" ? 0.55 : 0.72);
    },
    [flyTo, layerAltitude, openSelection],
  );

  const createHtmlOverlayElement = useCallback(
    (point: object) =>
      createDashboardHtmlOverlayElement(point, {
        layerAltitudeRef,
        layerAltitude,
        labelLanguage,
        isEconomyViewer,
        showLogisticsStress,
        chokeGlowColorById,
        usCarrierLabelOffsets,
        displayMilitaryExercises,
        combinedShipMovesMap,
        activeFrictionEpisode,
        activeTerritorialEpisode,
        skipNextGlobeClickRef,
        handleHtmlMarkerHover,
        openIntelFromCoords,
        openSelection,
        flyTo,
        handleAirRaidFocus,
        handleCarrierSelect,
        handleMilAircraftSelect,
        handleCivAircraftSelect,
        handleInfraStaticClick,
        handleNeptunThreatSelect,
        selectFrictionStage,
        selectTerritorialStage,
        clearRegionNavSelection,
        closeEconInsight,
        setHoveredCarrier,
        setHoveredMilAircraft,
        setHoveredNeptunThreat,
        setSelected,
        setEconNavSelection,
        setEconNewsPanelReveal,
        setIntelSheetOpen,
        setNewsPerspectives,
        setEconomyAttackReaction,
        setExerciseBriefing,
        setShipMovesSelectedId,
        setShipMovesFocusGroupKey,
      }),
    [
      activeFrictionEpisode,
      activeTerritorialEpisode,
      combinedShipMovesMap,
      displayMilitaryExercises,
      flyTo,
      handleAirRaidFocus,
      handleCarrierSelect,
      handleCivAircraftSelect,
      handleHtmlMarkerHover,
      handleInfraStaticClick,
      handleMilAircraftSelect,
      handleNeptunThreatSelect,
      labelLanguage,
      isEconomyViewer,
      showLogisticsStress,
      chokeGlowColorById,
      openIntelFromCoords,
      openSelection,
      clearRegionNavSelection,
      closeEconInsight,
      selectFrictionStage,
      selectTerritorialStage,
      usCarrierLabelOffsets,
      layerAltitude,
      setShipMovesFocusGroupKey,
    ],
  );

  function handleGlobePointClick(point: GlobeDisplayPoint) {
    if (
      point.displayKind === "static" ||
      point.displayKind === "mil" ||
      point.displayKind === "ais" ||
      point.displayKind === "firms-fire" ||
      point.displayKind === "conflict-cluster"
    ) {
      if (point.displayKind === "mil") {
        skipNextGlobeClickRef.current = true;
        emitLayerClickSounds(cuesForAircraft("military"), { altitude: layerAltitude });
        openSelection({ kind: "mil", item: point, traffic: "military" });
        flyTo(point.lat, point.lng, 0.55);
        return;
      }
      if (point.displayKind === "ais") {
        skipNextGlobeClickRef.current = true;
        emitLayerClickSounds(
          cuesForAisVessel({
            disguised: Boolean((point as AisVessel & { disguised?: boolean }).disguised),
            militaryKind: (point as AisVessel).militaryKind,
          }),
          { altitude: layerAltitude },
        );
        openSelection({ kind: "ais", item: point });
        flyTo(point.lat, point.lng, 0.45);
        return;
      }
      if (point.displayKind === "conflict-cluster") {
        skipNextGlobeClickRef.current = true;
        openIntelFromCoords(point.lat, point.lng, 0.85);
        return;
      }
      if (point.displayKind === "firms-fire") {
        flyTo(point.lat, point.lng, 0.65);
        return;
      }
      if (
        point.displayKind === "static" &&
        point.kind === "critical-node"
      ) {
        skipNextGlobeClickRef.current = true;
        const nodeId = String(point.meta?.criticalNodeId ?? "");
        if (nodeId) {
          flyTo(point.lat, point.lng, 0.72, 900, { pitch: 55, bearing: -20 });
          openCriticalNodeInsight(nodeId, !isEconomyViewer);
        }
        return;
      }
      if (point.displayKind === "static") {
        skipNextGlobeClickRef.current = true;
        handleInfraStaticClick(point);
        return;
      }
      return;
    }
    if (point.displayKind === "tzeva-adom") {
      handleAirRaidFocus(
        {
          lat: point.lat,
          lng: point.lng,
          label: point.region || point.title,
        },
        "tzeva",
      );
      return;
    }
    if (point.displayKind === "newfeeds-attack") {
      handleAirRaidFocus(
        {
          lat: point.lat,
          lng: point.lng,
          label:
            localizeNewfeedsLocation(point.location, labelLanguage) ||
            localizeNewfeedsTitle(point.title, labelLanguage),
        },
        "newfeeds",
      );
      if (isEconomyViewer) {
        const pub = point.publishedAt ? Date.parse(point.publishedAt) : NaN;
        const ageMinutes = Number.isFinite(pub)
          ? Math.max(0, Math.round((Date.now() - pub) / 60_000))
          : 60;
        setEconomyAttackReaction({
          ageMinutes,
          title: localizeNewfeedsTitle(point.title, labelLanguage) || point.title,
        });
      }
      return;
    }
    if (point.displayKind === "event") {
      handlePointClick(point);
    }
  }

  function handlePathClick(path: TransportPath) {
    const pathCues = cuesForPathKind(path.kind);
    if (pathCues) {
      emitLayerClickSounds(pathCues, { altitude: layerAltitude });
    }

    if (path.kind === "axis-link") {
      const link = selectedAxisLinkFromPath(path);
      if (!link) return;
      skipNextGlobeClickRef.current = true;
      setSelectedCorridor(null);
      setSelectedAxisLink(link);
      setArmsHighlightPair({ a: link.from, b: link.to });
      trackEvent("axis_link_click", {
        pathId: link.pathId,
        kind: link.relationKind ?? link.mode,
        from: link.from,
        to: link.to,
      });
      flyTo(link.midLat, link.midLng, 1.35);
      return;
    }

    if (path.kind === "crink-infra") {
      const category = String(path.meta?.crinkCategory ?? "");
      // 철도·도로 망 제외 — 공항·항만 등 고정 인프라만 선택 패널
      if (category !== "aeroway" && category !== "harbour") return;
      const mid = path.points[Math.floor(path.points.length / 2)] ?? path.points[0];
      if (!mid) return;
      skipNextGlobeClickRef.current = true;
      const kind = category === "aeroway" ? "airport" : "port";
      openSelection({
        kind: "static-infra",
        item: {
          id: path.id,
          kind,
          name: path.name || (kind === "airport" ? "Airport" : "Port"),
          lat: mid.lat,
          lng: mid.lng,
          tier: 1,
          meta: {
            crinkCategory: category,
            region: path.meta?.region ?? null,
            osmId: path.meta?.osmId ?? null,
          },
        },
      });
      flyTo(mid.lat, mid.lng, kind === "airport" ? 0.55 : 0.72);
      return;
    }

    if (path.kind === "strategic-corridor") {
      const corridor = selectedCorridorFromPath(path);
      if (!corridor) return;
      skipNextGlobeClickRef.current = true;
      setSelectedAxisLink(null);
      setSelectedCorridor(corridor);
      trackEvent("strategic_corridor_click", {
        corridorId: corridor.corridorId,
        gaugeBreak: corridor.gaugeBreak,
        euRailGateway: corridor.euRailGateway,
      });
      flyTo(corridor.midLat, corridor.midLng, corridor.gaugeBreak ? 0.55 : 1.1);
      return;
    }

    if (path.kind === "dispute-zone" || path.kind === "conflict-hatch") {
      const incident = findUkmtoIncident(ukmtoIncidents, path);
      if (incident) {
        openUkmtoBrief(incident);
        return;
      }
      const navarea = findNavareaFeature(navareaFeatures, path);
      if (navarea) {
        openNavareaBrief(navarea);
        return;
      }
      const exercise = findMilitaryExercise(displayMilitaryExercises, path);
      if (exercise) {
        const brief = buildExerciseBriefingContent(
          exercise,
          labelLanguage === "en" ? "en" : "ko",
        );
        if (brief) setExerciseBriefing(brief);
        return;
      }
    }

    const dispute =
      path.kind === "dispute-zone" || path.kind === "dispute-hatch"
        ? disputeFromPath(path)
        : undefined;
    if (!dispute) return;

    skipNextGlobeClickRef.current = true;
    const center = resolveDisputeCenter(dispute);
    openIntelFromCoords(center.lat, center.lng, 0.88);
  }

  function handlePolygonClick(feature: PolygonLayerFeature) {
    if (feature.polygonLayer === "country") {
      openSelection({ kind: "country", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 1.05);
      return;
    }

    if (feature.polygonLayer === "military-base") {
      emitLayerClickSounds(MIL_BASE_CUES, { altitude: layerAltitude });
      flyTo(feature.center.lat, feature.center.lng, 0.55);
      return;
    }

    if (feature.polygonLayer === "resource-deposit") {
      skipNextGlobeClickRef.current = true;
      flyTo(feature.center.lat, feature.center.lng, 0.7);
      return;
    }

    if (feature.polygonLayer === "missile-silo-field") {
      skipNextGlobeClickRef.current = true;
      emitLayerClickSounds(
        [{ eventId: "missile-silo", volumeScale: 0.55, durationMs: 5000 }],
        { altitude: layerAltitude },
      );
      flyTo(feature.center.lat, feature.center.lng, 0.55);
      return;
    }

    if (feature.polygonLayer === "missile-belt") {
      skipNextGlobeClickRef.current = true;
      flyTo(feature.center.lat, feature.center.lng, 0.72);
      return;
    }

    if (feature.polygonLayer === "conflict-zone") {
      openIntelFromCoords(feature.center.lat, feature.center.lng, 0.85);
      return;
    }

    if (
      feature.polygonLayer === "ukraine-ru" ||
      feature.polygonLayer === "ukraine-ua" ||
      feature.polygonLayer === "ukraine-contested"
    ) {
      openSelection({ kind: "ukraine-control", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 0.72);
      return;
    }

    if (feature.polygonLayer === "gps-jam") {
      skipNextGlobeClickRef.current = true;
      flyTo(feature.center.lat, feature.center.lng, 1.15);
    }
  }

  function handleGlobeClick(coords: { lat: number; lng: number }) {
    if (skipNextGlobeClickRef.current) {
      skipNextGlobeClickRef.current = false;
      return;
    }

    // 빈 영역 클릭 시 이전 선택/호버 정보를 정리해 잔상 툴팁을 제거
    setSelected(null);
    setHoveredPoint(null);
    setHoveredCarrier(null);
    setHoveredMilAircraft(null);
    setHoveredPolygon(null);
    setHoveredPath(null);
    setSelectedAxisLink(null);
    setSelectedCorridor(null);
    setArmsHighlightPair(null);

    const now = Date.now();
    if (now - lastGlobeClickAt.current < 320) {
      flyTo(coords.lat, coords.lng, 0.12);
    }
    lastGlobeClickAt.current = now;
  }

  function handleSearchSelect(place: SearchPlace) {
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
    axisHubCountriesGeoJson,
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

      <DashboardTopChrome
        intelSheetOpen={intelSheetOpen}
        entryGate={entryGate}
        showModePicker={showModePicker}
        viewerMode={viewerMode}
        labelLanguage={labelLanguage}
        wtiSnapshot={wtiSnapshot}
        wtiFetchedAt={wtiFetchedAt}
        showGscpiGauge={showGscpiGauge}
        showSesChip={showSesChip && !isEconomyViewer}
        handleNavNavigate={handleNavNavigate}
        liveUpdatedAt={liveUpdatedAt}
        dataGeneratedAt={data.generatedAt}
        liveStatus={liveStatus}
        query={query}
        setQuery={setQuery}
        searchResults={searchResults}
        handleSearchSelect={handleSearchSelect}
        isCompactUi={isCompactUi}
        isTabletUi={isTabletUi}
        setAskLayersOpen={setAskLayersOpen}
        handleViewerModeChange={handleViewerModeChange}
        basemapMode={basemapMode}
        handleBasemapModeChange={handleBasemapModeChange}
        layerCategories={layerCategories}
        layerDropdownOpen={layerDropdownOpen}
        setLayerDropdownOpen={setLayerDropdownOpen}
        showLeftPanel={showLeftPanel}
        econNavSelection={econNavSelection}
        isEconomyViewer={isEconomyViewer}
        regionNavSelection={regionNavSelection}
        handleExplorationSelect={handleExplorationSelect}
        showUsDfcSupplyChain={showUsDfcSupplyChain}
        showBriTradeConnectivity={showBriTradeConnectivity}
        setShowUsDfcSupplyChain={setShowUsDfcSupplyChain}
        setShowBriTradeConnectivity={setShowBriTradeConnectivity}
        usDfcSupplyPaths={usDfcSupplyPaths}
        briTradePaths={briTradePaths}
        showGpsInterference={showGpsInterference}
        setShowGpsInterference={setShowGpsInterference}
        gpsJamStatus={gpsJamStatus}
        gpsJamPolygons={gpsJamPolygons}
        gpsJamDate={gpsJamDate}
        showUsCarriers={showUsCarriers}
        setShowUsCarriers={setShowUsCarriers}
        usCarriers={usCarriers}
        deployedCarrierCount={deployedCarrierCount}
        compactChipId={compactChipId}
        handleCompactChipSelect={handleCompactChipSelect}
        scenarioPresetId={scenarioPresetId}
        handleScenarioPresetSelect={handleScenarioPresetSelect}
        globeRef={globeRef}
        getSceneForShare={getSceneForShare}
        setChromeCoachStep={setChromeCoachStep}
        setShowFeatureGuide={setShowFeatureGuide}
      />

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
        westpacPulseOpen={westpacPulseActive}
        shipMovesLoading={shipMovesLoading}
        shipMovesTimeline={shipMovesTimeline}
        shipMovesDisclaimer={shipMovesDisclaimer}
        shipMovesSelectedId={shipMovesSelectedId}
        shipMovesTrailMode={shipMovesTrailMode}
        shipMovesFocusGroupKey={shipMovesFocusGroupKey}
        westpacNewsPool={[
          ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
          ...(newsStreamPayload?.verified ?? []),
          ...(newsStreamPayload?.stateMedia ?? []),
        ]}
        onShipMoveSelect={(obs) => {
          setShipMovesSelectedId(obs.id);
          setShipMovesFocusGroupKey(groupKeyForObservation(obs));
          openSelection({ kind: "ship-movement", item: obs });
          if (isMapDisplayableShipObservation(obs)) {
            flyTo(
              obs.lat!,
              obs.lng!,
              obs.locationStatus === "broad" ? 1.15 : 0.85,
            );
          }
        }}
        onShipTrailModeChange={(mode) => {
          setShipMovesTrailMode(mode);
          if (mode === "fleet") {
            setShipMovesFocusGroupKey(null);
          }
        }}
        onShipVesselSelect={(groupKey, track) => {
          setShipMovesTrailMode("vessel");
          setShipMovesFocusGroupKey(groupKey);
          const latest = track[track.length - 1] ?? track[0] ?? null;
          if (latest) {
            setShipMovesSelectedId(latest.id);
            openSelection({ kind: "ship-movement", item: latest });
          }
          const fly = vesselTrackFlyTarget(track);
          if (fly) flyTo(fly.lat, fly.lng, fly.altitude);
          setShipMovesBriefTrack(track);
          setShipMovesBriefFocusId(latest?.id ?? null);
        }}
        onShipMoveBrief={(track, focusId) => {
          setShipMovesBriefTrack(track);
          setShipMovesBriefFocusId(focusId ?? null);
          if (track[0]) {
            setShipMovesFocusGroupKey(groupKeyForObservation(track[0]));
          }
        }}
        onWestpacPulseClose={() => {
          setShipMovesSelectedId(null);
          setShipMovesFocusGroupKey(null);
          setShipMovesTrailMode("fleet");
          setShipMovesBriefTrack(null);
          setShipMovesBriefFocusId(null);
          setRegionNavSelection(null);
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
        onDisputesOverviewClose={() => {
          clearTerritorialSequence();
          setDisputeHotspotSelectedId(null);
          setDisputeEpisodeSelectedId(null);
          setTerritorialEpisodeBrief(null);
          setTerritorialActiveStageId(null);
          setTerritorialRevealedStageIds([]);
          setRegimeSelectedEpisodeId(null);
          setFrictionEpisodeBrief(null);
          setRegionNavSelection(null);
        }}
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
          {...mapGlobeProps}
        />

        {/* 마우스·트랙패드 없이도 조절 가능한 확대/축소 버튼 — 숨김 상태는 자체 저장 */}
        <MapZoomControl globeRef={globeRef} isCompactUi={isCompactUi} />

        {/* 지구본 뷰(데스크톱·태블릿)에 상시 노출되는 출처 크레딧 — 폰은 MobileHomeView가 담당 */}
        {!isPhoneUi ? (
          <MapAttributionBar
            lang={labelLanguage}
            layerPrefs={layerPrefs}
            basemapMode={basemapMode}
            onOpenSources={() => setShowSourcesPanel(true)}
            onOpenParchment={() => setShowDataSourceParchment(true)}
            onOpenTrust={() => setShowTrustPanel(true)}
          />
        ) : null}

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
          /** 모바일 우크라 전선: 스택은 접고 📰 FAB만 유지 (지도 가독성 + Intel 진입) */
          const ukraineHidesFullStack = isUkraineTheaterFocus && !isCompactUi;
          const fabOnly = Boolean(isCompactUi && isUkraineTheaterFocus);
          const stackVisible =
            !intelSheetOpen && !showLeftPanel && !selected && !ukraineHidesFullStack;
          if (bottomDockMode !== "news") return null;
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
          showTelegram={!isEconomyViewer}
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
          showGdelt={!isEconomyViewer && isCompactUi}
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
        showNeptun={showNeptun}
        neptunAlertCount={neptunAlertCount}
        showTzevaAdom={showTzevaAdom}
        showNewfeedsIranAttacks={showNewfeedsIranAttacks}
        neptunAlerts={neptunAlerts}
        neptunLive={neptunLive}
        neptunStatus={neptunStatus}
        neptunError={neptunError}
        tzevaAdomActive={tzevaAdomActive}
        tzevaAdomHistory={tzevaAdomHistory}
        tzevaAdomLive={tzevaAdomLive}
        tzevaAdomStatus={tzevaAdomStatus}
        tzevaAdomGeoRestricted={tzevaAdomGeoRestricted}
        tzevaAdomError={tzevaAdomError}
        newfeedsAttacks={newfeedsAttacks}
        newfeedsThreatLabel={newfeedsThreatLabel}
        newfeedsLive={newfeedsLive}
        newfeedsStatus={newfeedsStatus}
        newfeedsError={newfeedsError}
        tourScenes={tourScenes}
        showFeatureGuide={showFeatureGuide}
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
        showAirRaidCoach={showAirRaidCoach}
        watchFocusLine={watchFocusLine}
        clearanceStatus={clearanceStatus}
        calendarDayKey={calendarDayKey}
        weeklyRecap={weeklyRecap}
        weeklyRecapCollapsed={weeklyRecapCollapsed}
        showLampPreparing={showLampPreparing}
        showLanguageGate={showLanguageGate}
        showDailyRankPanel={showDailyRankPanel}
        showTourInvite={showTourInvite}
        airRaidOffer={airRaidOffer}
        airRaidBriefing={airRaidBriefing}
        breakingFlash={breakingFlash}
        onDismissBreakingFlash={() => setBreakingFlash(null)}
        escalationOffer={escalationOffer}
        onDismissEscalationOffer={dismissEscalationOffer}
        adsbEmergencyOffer={adsbEmergencyOffer}
        natoPerimeterAlert={natoPerimeterAlert}
        onDismissNatoPerimeterAlert={dismissNatoPerimeterAlert}
        exerciseOffer={exerciseOffer}
        exerciseBriefing={exerciseBriefing}
        maritimeOffer={maritimeOffer}
        ukmtoBriefing={ukmtoBriefing}
        navareaBriefing={navareaBriefing}
        tensionSpike={tensionSpike}
        onDismissTensionSpike={() => {
          dismissTensionSpike();
          markHotTheaterSessionApplied();
        }}
        onTensionSpikeJump={onTensionSpikeJump}
        hotTheaterOffer={
          tensionSpike || firstImpression.suppressHotTheaterOffer
            ? null
            : hotTheaterOffer
        }
        onAcceptHotTheaterOffer={acceptHotTheaterOffer}
        onDismissHotTheaterOffer={dismissHotTheaterOffer}
        ultraLiteOfferVisible={ultraLiteAutoOffer.visible}
        ultraLiteOfferProbe={ultraLiteAutoOffer.probe}
        onAcceptUltraLiteOffer={ultraLiteAutoOffer.accept}
        onDismissUltraLiteOffer={ultraLiteAutoOffer.dismiss}
        gtiHeroSnapshot={wtiSnapshot}
        gtiHeroVisible={firstImpression.gtiHeroVisible}
        timeScrubber={{
          asOf: effectiveAsOf,
          today: todayUtc,
          availableDates: rankAvailableDates,
          onChange: (date) => setViewAsOf(date === todayUtc ? null : date),
          onGoToday: () => setViewAsOf(null),
        }}
        bottomDockMode={bottomDockMode}
        onBottomDockModeChange={handleBottomDockModeChange}
        soundUnmuteReady={firstImpression.onboardingReady}
        globeRef={globeRef}
        intelStackRef={intelStackRef}
        onCloseLeftPanel={closeLeftPanel}
        onToggleLeftPanel={toggleLeftPanel}
        onSetShowUsCarriers={setShowUsCarriers}
        onSetShowGpsInterference={setShowGpsInterference}
        onSetShowUsDfcSupplyChain={setShowUsDfcSupplyChain}
        onSetShowBriTradeConnectivity={setShowBriTradeConnectivity}
        onSetShowQuickStart={setShowQuickStart}
        onSetShowViewerIntro={setShowViewerIntro}
        onSetShowTrustPanel={setShowTrustPanel}
        onSetShowSourcesPanel={setShowSourcesPanel}
        onSetShowFeatureGuide={setShowFeatureGuide}
        onSetAskLayersOpen={setAskLayersOpen}
        onSetShowMobileAlertFeed={setShowMobileAlertFeed}
        onMaybeOfferAirRaidCoach={maybeOfferAirRaidCoach}
        onAirRaidFocus={handleAirRaidFocus}
        onAskLayersApply={handleAskLayersApply}
        onSetShowFirstVisitTour={setShowFirstVisitTour}
        onSetTourActive={setTourActive}
        getSceneForShare={getSceneForShare}
        onSetSentinelActive={setSentinelActive}
        onSetPlayOverlay={setPlayOverlay}
        onSetShowCityLabels={setShowCityLabels}
        onEndLiveBriefing={endLiveBriefing}
        flyTo={flyTo}
        onSetWhatsNewUpdate={setWhatsNewUpdate}
        onLabelLanguageChange={setLabelLanguage}
        onConfirmLabelLanguage={confirmLabelLanguage}
        onLangChoiceConfirmed={() => setLangChoiceDone(true)}
        onSetEntryGate={setEntryGate}
        onDomainSelect={handleDomainSelect}
        onModeApply={handleModeApply}
        onCustomLayerApply={handleCustomLayerApply}
        onModePickerCancel={handleModePickerCancel}
        onSetChromeCoachStep={setChromeCoachStep}
        onSetIntelSheetOpen={setIntelSheetOpen}
        onFrictionCoachStepChange={handleFrictionCoachStepChange}
        onSetShowAirRaidCoach={setShowAirRaidCoach}
        onOpenClearanceRecovery={openClearanceRecovery}
        onSetClearanceChipSettled={setClearanceChipSettled}
        onSetWeeklyRecapCollapsed={setWeeklyRecapCollapsed}
        onSetShowTourInvite={setShowTourInvite}
        onSetPeriodicBriefing={setPeriodicBriefing}
        onSetFoldedPeriodicBriefing={setFoldedPeriodicBriefing}
        onSetTomorrowTensionPrompt={setTomorrowTensionPrompt}
        onSetClearanceStatus={setClearanceStatus}
        onToggleDailyRankPanel={toggleDailyRankPanel}
        onDismissAirRaidOffer={dismissAirRaidOffer}
        onDismissAdsbEmergencyOffer={dismissAdsbEmergencyOffer}
        onDismissExerciseOffer={dismissExerciseOffer}
        onSetExerciseBriefing={setExerciseBriefing}
        onAcceptMaritimeOffer={acceptMaritimeOffer}
        onDismissMaritimeOffer={dismissMaritimeOffer}
        onCloseUkmtoBriefing={closeUkmtoBriefing}
        onCloseNavareaBriefing={closeNavareaBriefing}
        onReleaseAirRaidAutoBusy={releaseAirRaidAutoBusy}
        onBeginLiveBriefing={beginLiveBriefing}
        onSetAirRaidBriefing={setAirRaidBriefing}
      />

      {showLeftPanel ? (
        <LayerPanelHost
          isCompactUi={isCompactUi}
          isTabletUi={isTabletUi}
          isDesktopWideUi={isDesktopWideUi}
          labelLanguage={labelLanguage}
          layerPanelDirty={layerPanelDirty}
          onConfirmDraft={confirmLayerPanelDraft}
          onCancelDraft={cancelLayerPanelDraft}
          navHeaderLabel={viewerChromePreset.navHeaderLabel}
          layerPanelTitle={viewerChromePreset.layerPanelTitle}
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

      {selected && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseInfoPanel", labelLanguage)}
            className="absolute inset-0 z-[500] bg-black/20 lg:bg-black/10"
            onClick={() => setSelected(null)}
          />
          <aside className="intel-panel intel-sidebar-right z-[600] flex flex-col overflow-hidden p-4">
            {selected.kind === "neptun-threat" ? (
              <div className="intel-scroll-y min-h-0 flex-1">
                <NeptunThreatDetailPanel
                  threat={selected.item}
                  lang={labelLanguage}
                  onClose={() => setSelected(null)}
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
                    onClick={() => setSelected(null)}
                    className="mb-3 shrink-0 text-xs text-amber-200/80 transition hover:text-amber-100"
                  >
                    ← {regionNavSelection.label} 뉴스 목록
                  </button>
                )}
                <div className="intel-scroll-y min-h-0 flex-1">
                  <AnalysisPanel
                    selection={selected}
                    onClose={() => setSelected(null)}
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
                </div>
              </>
            )}
          </aside>
        </>
      )}
      <GeoeconomicsChrome
        labelLanguage={labelLanguage}
        isEconomyViewer={isEconomyViewer}
        hasAnalysisSelection={selected != null}
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

