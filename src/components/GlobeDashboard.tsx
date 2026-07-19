"use client";

import Fuse from "fuse.js";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { CursorHoverCard } from "@/components/CursorHoverCard";
import { DisputeZoneLegend } from "@/components/DisputeZoneLegend";
import { UkraineFrontLegend, UkraineFrontLegendContent } from "@/components/UkraineFrontLegend";
import { LegendReopenButton } from "@/components/MapOverlayLegendPanel";
import { FeatureGuideButton, FeatureGuidePanel } from "@/components/FeatureGuidePanel";
import { MethodologySourcesPanel, SourcesLinkButton } from "@/components/MethodologySourcesPanel";
import { NewsTrustTierPanel } from "@/components/NewsTrustTierPanel";
import { TrustBadgeChip } from "@/components/TrustBadgeChip";
import { ShareViewButton } from "@/components/ShareViewButton";
import { DailyRankSharePanel } from "@/components/DailyRankSharePanel";
import { TomorrowTensionModal } from "@/components/TomorrowTensionModal";
import {
  hasSeenTensionPrompt,
  markTensionPromptSeen,
  type DailyPrompt,
} from "@/lib/dailyPrompt";
import { nextUtcRankDate, type WorldTensionSnapshot } from "@/lib/dailyRanks";
import { formatWtiBriefingLead } from "@/lib/wti";
import { MobileAlertFeed } from "@/components/MobileAlertFeed";
import { GdeltAlertPanel } from "@/components/GdeltAlertPanel";
import { TelegramOsintPanel } from "@/components/TelegramOsintPanel";
import { type AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import { UnifiedAirRaidDropdown } from "@/components/UnifiedAirRaidDropdown";
import { NeptunLayerPanel } from "@/components/NeptunLayerPanel";
import { NeptunThreatDetailPanel } from "@/components/NeptunThreatDetailPanel";
import { LocalAlertPanel } from "@/components/LocalAlertPanel";
import { type LayerCategory, type LayerToggleItem } from "@/components/LayerCategoryPanel";
import { LayerCategoryDraftHost } from "@/components/LayerCategoryDraftHost";
import { LayerPanelLanguagePicker } from "@/components/LayerPanelLanguagePicker";
import { CompactPresetChips } from "@/components/CompactPresetChips";
import { HoverNav } from "@/components/HoverNav";
import { HoverHint } from "@/components/HoverHint";
import { ParchmentProTipChip } from "@/components/ParchmentProTipChip";
import { useCompactUi } from "@/hooks/useCompactUi";
import {
  buildCompactPrefs,
  compactPresetsForMode,
  defaultCompactChipId,
  type CompactChipId,
} from "@/lib/compactViewPreset";
import { TheaterIntelSidebar } from "@/components/TheaterIntelSidebar";
import { TheaterDetailCta } from "@/components/TheaterDetailCta";
import { ExplorationTabs } from "@/components/ExplorationTabs";
import { ModePickerOverlay } from "@/components/ModePickerOverlay";
import { WelcomeParchmentLetter } from "@/components/WelcomeParchmentLetter";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import {
  CriticalNodeInsightParchment,
  EconInsightParchment,
} from "@/components/EconInsightParchment";
import { emitBreakingDispatchSound } from "@/components/SoundEffectsBridge";
import { resolveHubBrief } from "@/data/hubBriefs";
import { resolveCriticalNodeBrief } from "@/data/resolveCriticalNodeBrief";
import {
  ECON_NAV_TO_CRITICAL_NODE,
  focusCriticalNodeIds,
} from "@/data/criticalNodes";
import type { EconInsightBrief } from "@/data/econInsightBriefs";
import {
  ChromeOnboardingCoach,
  shouldOfferChromeCoach,
  type ChromeCoachStep,
} from "@/components/ChromeOnboardingCoach";
import {
  FrictionOnboardingCoach,
  shouldOfferFrictionCoach,
  type FrictionCoachStep,
} from "@/components/FrictionOnboardingCoach";
import {
  AirRaidOnboardingCoach,
  shouldOfferAirRaidCoach,
} from "@/components/AirRaidOnboardingCoach";
import { PeriodicBriefingParchment } from "@/components/PeriodicBriefingParchment";
import {
  LampRoleTipBanner,
  shouldOfferLampRoleTip,
} from "@/components/LampRoleTipBanner";
import {
  AirRaidBriefingParchment,
  type AirRaidBriefingContent,
} from "@/components/AirRaidBriefingParchment";
import {
  AirRaidOfferBanner,
  type AirRaidOffer,
  markAirRaidFlyBriefDone,
  shouldOfferAirRaidFlyBrief,
} from "@/components/AirRaidOfferBanner";
import { matchCasualtyFrontIdsFromHover } from "@/lib/casualtyFrontHover";
import { geocodeUkraineAlertRegion } from "@/lib/ukraineAlertZones";
import {
  buildBriefingFromStats,
  buildLampMacroTable,
  buildPeriodicBriefing,
  hasSeenPeriod,
  lampSeenKey,
  markPeriodSeen,
  pickConflictLampNews,
  pickEconomyLampNews,
  resolveLampPeriod,
  shortenEconomyLampParagraphs,
  CONFLICT_LAMP_NEWS_MIN,
  ECONOMY_LAMP_NEWS_MIN,
  type PeriodicBriefing,
} from "@/lib/news/periodicBriefing";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";
import type { BriefingPeriodStats } from "@/lib/briefingPeriodStats";
import {
  recordInterestFromSelection,
  recordInterestMode,
  recordInterestNews,
  recordInterestTheme,
} from "@/lib/interest/recordInterest";
import { useLocalCalendarDayKey } from "@/hooks/useLocalCalendarDayKey";
import { EntryCautionOverlay } from "@/components/EntryCautionOverlay";
import { SoundMuteControl } from "@/components/SoundMuteControl";
import { DomainGateOverlay } from "@/components/DomainGateOverlay";
import { LocaleProvider } from "@/contexts/LocaleContext";
import {
  HOVER,
  carrierStatusLabel,
  disputeCategoryLabel,
  eventTierLabel,
  hatchStyleLabelLocalized,
  pathKindLabel,
  staticKindLabel,
  tensionLabel,
} from "@/lib/hoverLabels";
import { t } from "@/lib/uiStrings";
import { ViewerIntroOverlay, markViewerIntroDone } from "@/components/ViewerIntroOverlay";
import { EconomyRegionPanel } from "@/components/EconomyRegionPanel";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import { QuickStartCoach, markQuickStartDone } from "@/components/QuickStartCoach";
import type { NavSelection, RegionBBox } from "@/data/navRegions";
import { EXPLORATION_PRESETS, toNavSelection } from "@/data/navRegions";
import { ECON_EXPLORATION_PRESETS, econNavSelectionFromId } from "@/data/econNavRegions";
import {
  hottestConflictNavId,
  hottestEconomyNavId,
  type EconomyHubChoice,
} from "@/lib/autoFlyTarget";
import {
  conceptLayersForConflictNavId,
  conceptLayersForEconomyNavId,
} from "@/lib/conceptLayers";
import { gdeltLocationTagLabel, pickGdeltTensionTags, pickGdeltTierPins } from "@/lib/gdeltLocationTags";
import {
  createGdeltLocationTagBadge,
  type GdeltTagHtmlMarker,
} from "@/lib/gdeltLocationTagMarker";
import {
  createUkraineGdeltNeonBadge,
  isUkraineTheaterGdeltWar,
  nearestUkraineHapiTag,
  type UkraineGdeltNeonMarker,
} from "@/lib/ukraineGdeltNeonMarker";
import { gdeltNewsAlertLabel } from "@/lib/gdeltNewsAlert";
import {
  filterEventsByNavSelection,
  pickMenuCoreAlerts,
  type MenuCoreAlert,
} from "@/lib/regionFilter";
import {
  buildTensionHeatmaps,
  diplomaticHeatmapColor,
  warHeatmapColor,
} from "@/lib/tensionHeatmap";
import { getGlobeLod, globeLodFromTier, type GlobeLodTier } from "@/lib/globeLod";
import { getTransportLod } from "@/lib/transportLod";
import { expandPlaces } from "@/lib/compactData";
import { dataPath } from "@/lib/dataProfile";
import { fetchAppDataStream, fetchAppDataPlaces, type AppDataLoadProgress } from "@/lib/fetchAppDataStream";
import { useViewportPaths } from "@/hooks/useViewportPaths";
import { computeDashboardBootProgress } from "@/lib/bootLoadingProgress";
import { runWhenIdle } from "@/lib/deferIdle";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import {
  firmsLiveFetchMax,
  liveAisFetchMax,
  liveAisPollMs,
  liveFirmsPollMs,
  liveGdeltPollMs,
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
  NewFeedsIranPanel,
} from "@/components/NewFeedsIranPanel";
import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
  type TelegramAlertsPayload,
} from "@/lib/telegramAlerts";
import type { TzevaAdomAlert, TzevaAdomPayload } from "@/lib/tzevaAdom";
import {
  NEWFEEDS_ATTRIBUTION_SHORT,
  severityColor,
  severityHint,
  severityLabel,
  type NewfeedsAttackPoint,
  type NewfeedsAttacksPayload,
} from "@/lib/newfeeds";
import {
  UCDP_ATTRIBUTION,
  UCDP_ATTRIBUTION_SHORT,
  UCDP_SOURCE_URL,
} from "@/lib/ucdp";
import {
  formatNeptunLocation,
  getNeptunTypeLabel,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import { createNeptunImpactFlashElement } from "@/lib/neptunImpactFlash";
import { useNeptunStream } from "@/hooks/useNeptunStream";
import {
  buildArchivedNeptunTrackPaths,
  buildNeptunProjectionPaths,
  buildNeptunTrailPaths,
} from "@/lib/neptunTracks";
import type { NeptunPathElevationMode } from "@/lib/neptunFlightArc";
import {
  filterNeptunThreatsForViewport,
  filterNeptunThreatsInOpsBox,
  getNeptunRenderMode,
  NEPTUN_ARCHIVED_MAX_BY_TIER,
  NEPTUN_THREAT_MAX_BY_TIER,
  neptunElevationForMode,
  neptunShowsMarkers,
  neptunShowsPaths,
  neptunShowsProjection,
  neptunTrailPointBudget,
  neptunProjectionPointBudget,
  neptunArchivedPointBudget,
  neptunMaxGroundTrailVertices,
  isNeptunTheaterInView,
} from "@/lib/neptunLod";
import { createNeptunThreatBadge } from "@/lib/neptunTrackMarker";
import { SoundEffectsBridge } from "@/components/SoundEffectsBridge";
import {
  AIR_RAID_FLY_ALTITUDE,
  AIR_RAID_FLY_MS,
  AIR_RAID_FOCUS_HATCH_MS,
  AIR_RAID_SIREN_DELAY_MS,
  buildAirRaidFocusBox,
  buildAirRaidFocusHatchPaths,
  airRaidFocusBoxPolygon,
  isAirRaidFocusPath,
  playAirRaidSirenAfterFly,
  type AirRaidFocusBox,
  type AirRaidSirenKind,
} from "@/lib/airRaidFocus";
import {
  buildFirmsCombatHotspots,
  buildGdeltWarNewsHotspots,
  classifyFirmsFireForSound,
  firmsCauseBody,
  firmsCauseHint,
  firmsCauseTitle,
  firmsFireSoundLabel,
} from "@/lib/firmsSoundClassify";
import { filterFirmsToTheaters } from "@/lib/firmsTheaters";
import { useDataSync } from "@/hooks/useDataSync";
import { useGlobeStaticLayers } from "@/hooks/useGlobeStaticLayers";
import { GEM_RESOURCE_GROUPS, GEM_RESOURCE_LAYERS, gemLayerById } from "@/lib/gemResourceCatalog";
import { useLayerPrefsController } from "@/hooks/useLayerPrefsController";
import {
  applyViewPackages,
  DEFAULT_PACKAGE_SELECTION,
  resolveIntroFlyTarget,
  viewerModeFromPackages,
  type MergedViewConfig,
  type ViewPackageId,
  type ViewTheaterChoice,
  type ViewerMode,
} from "@/lib/viewPackages";
import { applyViewerMode, getViewerChrome } from "@/lib/viewerChrome";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";

import {
  anyDisputeOverlay,
  DEFAULT_LAYER_PREFS,
  loadLayerPrefs,
  type LabelLanguage,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import {
  translateOrefRegion,
  translateOrefTitle,
  tzevaUi,
} from "@/lib/tzevaAdomI18n";
import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";
import {
  activeLayerCap,
  countActiveLayers,
} from "@/lib/layerExclusiveCap";
import {
  applyNormalCapToLayerPrefs,
  applyUltraLiteToLayerPrefs,
  loadPerfPrefs,
  savePerfPrefs,
  ultraLiteGdeltPinScale,
} from "@/lib/ultraLiteMode";
import {
  buildDomainOverviewPrefs,
  ENTRY_GATE,
} from "@/lib/entryOverview";
import {
  applyBattlefieldPreset,
  battlefieldZoneFromExplorationId,
  detectBattlefieldZone,
  type BattlefieldZone,
} from "@/lib/battlefieldPresets";
import {
  eastAsiaAdizToPaths,
  isEastAsiaAdizVisibleAtAltitude,
} from "@/lib/eastAsiaAdiz";
import { axisNetworkToPaths } from "@/lib/axisNetworkPaths";
import { briTradePathsToTransport, briTradeStrokeWidth } from "@/lib/briTradePaths";
import {
  usDfcSupplyPathsToTransport,
  usDfcSupplyStrokeWidth,
} from "@/lib/usDfcSupplyPaths";
import { buildAxisHubCountriesGeoJson } from "@/lib/axisHubCountryPolygons";
import {
  armsPairsToPaths,
  filterArmsForHub,
  type AxisArmsPayload,
} from "@/lib/axisArmsPaths";
import { AXIS_HUB_META, type AxisHubId } from "@/data/axisNetwork";
import { hubById, type HubClaim } from "@/data/hubNav";
import { AxisArmsPanel } from "@/components/AxisArmsPanel";
import { AxisRegimePanel } from "@/components/AxisRegimePanel";
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
import { lookupOceanName } from "@/lib/oceanNames";
import { getGlobeTextures } from "@/lib/mapStyles";
import { getZoomOutScale } from "@/lib/zoomScale";
import {
  clampGlobeAltitude,
  EXTREME_ZOOM_ALTITUDE,
  globeDistanceForAltitude,
  MIN_GLOBE_ALTITUDE,
  COMPACT_THEATER_MAX_SPAN_DEG,
  ORBITAL_OVERVIEW_ALTITUDE,
  THEATER_ENTRY_MIN_ALTITUDE,
} from "@/lib/globeCamera";
import {
  STATIC_POINT_COLORS,
  staticPointRadius,
} from "@/lib/staticGlobe";
import { createInfraStaticBadge, isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import { chokeGlowRingSeed } from "@/data/logisticsRiskPoints";
import {
  aisCommercialPointColor,
  aisDisplayTypeLabel,
  aisMilitaryKindColor,
  isAisAspectHullMarker,
} from "@/lib/aisVesselClass";
import { COUNTRY_BORDER_PATH_COLOR, COUNTRY_FILL_ALTITUDE, COUNTRY_TEXTURE_MODE_FILL, POLYGON_NO_STROKE } from "@/lib/countryColors";
import { getPlaceLabelColor, getPlaceLabelDotRadius, getPlaceLabelSize, getPlaceLabelTier } from "@/lib/placeLabelColors";
import { filterMajorCityLabels } from "@/lib/placeLod";
import {
  resolveBottomAlertPanel,
  shouldClosePanelOnDataError,
  shouldCloseLocalForGdelt,
} from "@/lib/localOverlayPolicy";
import {
  CAMERA_IDLE_DEBOUNCE_MS,
  HEATMAP_UPDATE_CADENCE_MS,
  LABEL_UPDATE_CADENCE_MS,
  PATH_UPDATE_CADENCE_MS,
  SETTLEMENT_DETAIL_MIN_MAP_ZOOM,
} from "@/lib/globePerformance";
import {
  cameraBusyUntilAfterFly,
  cameraFlyBusyMs,
  cameraIdleClearBlocked,
} from "@/lib/cameraBusyGuard";
import { useCameraViewport } from "@/hooks/useCameraViewport";
import {
  COUNTRY_POLYGON_MAX_BY_TIER,
  DISPUTE_MAX_BY_TIER,
  FIRMS_FIRE_MAX_BY_TIER,
  VIEWPORT_RADIUS_BY_TIER,
  filterByViewportCenter,
  isBboxNearView,
  isCenterInView,
  viewToBbox,
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
  getConflictZoneHatchColor,
  getConflictZoneOutlineColor,
  getDisputeHatchColor,
  getDisputeHatchStyle,
  getDisputeOutlineColor,
  isCombatHazard,
  parseConflictHatchGrade,
  rankDisputesForDisplay,
  TENSION_GRADE_STYLES,
} from "@/lib/disputeHatch";
import { getCachedDisputeHatchPaths } from "@/lib/disputeHatchCache";
import { selectViinaPolygons } from "@/lib/viinaLod";
import {
  prefetchUkraineControl,
  readUkraineControlCache,
} from "@/lib/viinaPrefetch";
import { prefetchNeptun } from "@/lib/neptunPrefetch";
import { buildViinaFrontEvents, type ViinaFrontEvent } from "@/lib/viinaFrontEvents";
import { filterUkraineSettlementsForView } from "@/lib/ukraineSettlements";
import { computeUkraineFrontFitBbox } from "@/lib/ukraineFrontPaths";
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
  createUkraineSettlementLabelElement,
  getUkraineSettlementTier,
  isInUkraineTheater,
} from "@/lib/ukraineSettlementLabels";
import {
  UKRAINE_SITUATION_CALLOUTS_SHARED,
  UKRAINE_SITUATION_PATHS,
} from "@/data/ukraineSituationSeed";
import { MIDDLE_EAST_SITUATION_CALLOUTS } from "@/data/middleEastSituationSeed";
import {
  KOREA_SITUATION_CALLOUTS,
  TAIWAN_SITUATION_CALLOUTS,
} from "@/data/asiaSituationSeed";
import {
  CHINA_THEATER_DYAD_LABEL,
  CHINA_THEATER_SEA_LABEL,
  type ChinaTheaterDyad,
} from "@/data/chinaTheaterIncidentsSeed";
import { createChinaTheaterIncidentBadge } from "@/lib/chinaTheaterIncidentMarker";
import {
  KOREA_MISSILE_ANCHOR_LABEL,
  KOREA_MISSILE_KIND_LABEL,
} from "@/data/koreaMissileIncidentsSeed";
import { createKoreaMissileIncidentBadge } from "@/lib/koreaMissileIncidentMarker";
import {
  activateChinaTheaterIncidents,
  activateKoreaMissileIncidents,
  isFreshNewfeedsAttack,
} from "@/lib/neonIncidentActivation";
import {
  createIranNewsNeonBadge,
  nearestIranHapiTag,
  type IranNewsNeonAttack,
} from "@/lib/iranNewsNeonMarker";
import {
  type SituationCallout,
} from "@/data/situationCalloutTypes";
import {
  resolveActiveWarTheaterAt,
  resolveCombatTheaterAt,
} from "@/lib/theaterCombat";
import {
  ACLED_HOME_URL,
  HAPI_ATTRIBUTION,
  HAPI_ATTRIBUTION_SHORT,
  HAPI_CASUALTY_SEED,
  HAPI_SOURCE_LINE,
  type HapiConflictCasualtiesPayload,
} from "@/lib/hapiConflictCasualties";
import {
  applyCasualtyOverlayMetrics,
  CASUALTY_ELEGY_LINES,
  getCasualtyOverlayScale,
} from "@/lib/warCasualtyOverlay";
import {
  applyNuclearOverlayScale,
  getNuclearOverlayScale,
  NUCLEAR_STOCKPILE_SEEDS,
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
  TransportPath,
  UkraineControlData,
  UkraineControlZone,
  UkraineSettlement,
  UsCarrier,
} from "@/data/geoTypes";
import {
  isFreshEvent,
  scoreEvents,
  TIER_LABELS,
  type ScoredEvent,
} from "@/data/eventTiers";
import { createEventPinElement, createFrictionPinElement, createFrictionStageCalloutElement } from "@/lib/locationPinMarker";
import { FrictionHistoryChrome } from "@/components/FrictionHistoryChrome";
import {
  frictionDeepDoc,
  frictionParchmentParagraphs,
  type FrictionTimelineStage,
} from "@/data/frictionEpisodeDeep";
import {
  NewsStreamProvider,
  IntelCompactBar,
  IntelNewsSheet,
  type BottomIntelStackHandle,
} from "@/components/BottomIntelStack";
import {
  navSelectionFromId,
  theaterFocusFromNav,
  isUkraineNavId,
  type TheaterSidebarTab,
} from "@/lib/theaterFocus";
import {
  flyTargetForTheater,
  newsTheaterFromCoords,
  THEATER_FLY_TO,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";
import { ServerDonateChip } from "@/components/ServerDonateChip";
import { UsCarrierFixedToggle } from "@/components/UsCarrierFixedToggle";
import { EconomySupplyChainFixedToggle } from "@/components/EconomySupplyChainFixedToggle";
import { carrierLabelOffsets, createUsCarrierBadge, CARRIER_MARKER_ROOT_CLASS, filterVisibleCarriers, isOperationalCarrier } from "@/lib/usCarrierMarkers";
import { mergeCarriersWithAisPositions } from "@/lib/aisCarrierMatch";
import { classifyMilAircraft, milAircraftRoleLabel } from "@/lib/milAircraftKind";
import { createMilAircraftBadge, milAircraftMarkerRotationDeg } from "@/lib/milAircraftMarkers";
import {
  aisVesselHeadingDeg,
  createAisVesselBadge,
} from "@/lib/aisVesselMarkers";

import { AnalysisPanel } from "@/components/globe/AnalysisPanel";
import type {
  AisGlobePoint,
  AisHtmlMarker,
  CasualtySkullHtmlMarker,
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
  HoverCard,
  HtmlOverlayMarker,
  KoreaMissileIncidentHtmlMarker,
  MilGlobePoint,
  MilHtmlMarker,
  NeptunHtmlMarker,
  NeptunImpactHtmlMarker,
  NewfeedsAttackGlobePoint,
  NuclearStockpileHtmlMarker,
  PolygonLayerFeature,
  PulseRingPoint,
  SituationCalloutMarker,
  StaticGlobePoint,
  TzevaAdomGlobePoint,
  UkraineSettlementHtmlMarker,
  UsCarrierHtmlMarker,
  ViewState,
  Selection,
} from "@/components/globe/types";
import {
  ARMS_EMBARGO_STROKE,
  ARMS_EMBARGO_STROKE_WIDTH,
  CONFLICT_ZONE_ALTITUDE,
  EMPTY_LAYER_CATEGORIES,
  EMPTY_OVERLAY_POLYGONS,
  FLOW_PATH_KINDS,
  HEATMAP_MEANINGFUL_DELTA,
  HISTORY_IMMERSION_MAX_ALTITUDE,
  INFRA_COLORS,
  INFRA_HTML_MARKER_CAP,
  INFRA_STROKE,
  INTEL_MISSILE_ARC,
  INTEL_NASA_FIRE,
  INTRO_CAMERA_DELAY_MS,
  INTRO_CAMERA_DURATION_MS,
  INTRO_SESSION_KEY,
  LABEL_MEANINGFUL_DELTA,
  LAYER_ALTITUDE_SYNC_MIN_DELTA,
  MOVING_IDLE_DELAY_MS,
  PATH_LAYER_COLORS,
  PATH_MEANINGFUL_DELTA,
  REGION_FIT_PADDING,
  REGION_MAX_ALTITUDE,
  REGION_MIN_ALTITUDE,
  REGION_MIN_SPAN_DEG,
  STATIC_KIND_LABELS,
  TZEVA_ADOM_MARKER,
  US_BASE_ALTITUDE,
  US_BASE_FILL,
  US_BASE_STROKE,
  UKRAINE_COMBAT_ZONE_LINE,
  UKRAINE_CONTESTED_FILL,
  UKRAINE_CONTESTED_STROKE,
  UKRAINE_CONTROL_ALTITUDE,
  UKRAINE_RU_CLAIM_LINE,
  UKRAINE_RU_FILL,
  UKRAINE_RU_FRONT_LINE,
  UKRAINE_RU_OCCUPIED_LINE,
  UKRAINE_RU_STROKE,
  UKRAINE_UA_CLAIM_LINE,
  UKRAINE_UA_FILL,
  UKRAINE_UA_FRONT_LINE,
  UKRAINE_UA_GAIN_LINE,
  UKRAINE_UA_OCCUPIED_LINE,
  UKRAINE_UA_STROKE,
  emptyData,
} from "@/components/globe/constants";
import { geometryToBorderPaths } from "@/components/globe/geometryToBorderPaths";
import {
  isUkraineViinaPolygonLayer,
  neptunPathsGeometryEqual,
  overlayPolygonsEqual,
  ukraineCombatZoneStroke,
  ukraineHatchStroke,
  ukraineThinOutlineStroke,
} from "@/components/globe/overlayPolygons";
import {
  clamp,
  escapeHtml,
  formatDateTime,
  getSafePlaceLabel,
  hostFromUrl,
  longitudeDistance,
  markWelcomeGateDone,
  normalizeLabelText,
  readWelcomeGateDone,
  truncateOverview,
} from "@/components/globe/formatters";
import {
  applyHtmlOverlayPointerEvents,
  getStableLodTier,
} from "@/components/globe/htmlOverlayPointerEvents";
import {
  createAirportPortBadge,
  createCasualtySkullBadge,
  createNuclearStockpileBadge,
  createSituationCalloutBadge,
} from "@/components/globe/markers/htmlMarkerFactories";
import { PausedMapGlobeView } from "@/components/globe/PausedMapGlobeView";
import { HamburgerIcon } from "@/components/globe/HamburgerIcon";
import { Metric } from "@/components/globe/Metric";

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
  const lastGlobeClickAt = useRef(0);
  const skipNextGlobeClickRef = useRef(false);
  const configuredGlobe = useRef(false);
  const introPlayedRef = useRef(false);
  const packageTheaterFocusPlayedRef = useRef(false);
  const packageEconFocusPlayedRef = useRef(false);
  const lastViewUpdateAt = useRef(0);
  const lastFilterCenterUpdateAt = useRef(0);
  const layerCenterRef = useRef<{ lat: number; lng: number }>({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
  });
  const layerAltitudeRef: { current: number } = useRef(ENTRY_GATE.bootAltitude);
  const layerLodTierRef = useRef<GlobeLodTier>("global");
  const moveIdleTimerRef = useRef<number | null>(null);
  const renderStabilizeIdleRef = useRef<number | null>(null);
  const isCameraMovingRef = useRef(false);
  /** flyTo tween 강제 busy 창 — idle debounce가 중간에 moving을 끄지 못하게 */
  const cameraTweenUntilRef = useRef(0);
  const flyBusyTimerRef = useRef<number | null>(null);
  const [size, setSize] = useState<GlobeSize>({ width: 960, height: 720 });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AppData>(emptyData);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const deferLayerMapApplyRef = useRef(false);
  const panelDraftPatchRef = useRef<Partial<LayerPrefs>>({});
  const categorySnapshotRef = useRef<LayerCategory[] | null>(null);
  const layerPanelSessionRef = useRef(0);
  const prevShowLeftPanelRef = useRef(false);
  const [intelSheetOpen, setIntelSheetOpen] = useState(false);
  const [layerPanelReady, setLayerPanelReady] = useState(false);
  const [frozenPanelCategories, setFrozenPanelCategories] = useState<LayerCategory[] | null>(null);

  useEffect(() => {
    if (showLeftPanel && !prevShowLeftPanelRef.current) {
      layerPanelSessionRef.current += 1;
    }
    prevShowLeftPanelRef.current = showLeftPanel;
    // 패널이 열려 있어도 체크는 지도에 반영 — draft-only defer 끄기
    deferLayerMapApplyRef.current = false;
  }, [showLeftPanel]);

  useEffect(() => {
    if (!showLeftPanel) {
      setLayerPanelReady(false);
      return;
    }
    const id = requestAnimationFrame(() => setLayerPanelReady(true));
    return () => cancelAnimationFrame(id);
  }, [showLeftPanel]);

  const [intelTheaterFilter, setIntelTheaterFilter] = useState<IntelTheaterFilter>(() => {
    const theater = initialViewConfig?.theater;
    if (theater && theater !== "auto") return theater;
    return "all";
  });
  const [viewUi, setViewUi] = useState(() => initialViewConfig?.ui ?? { showTicker: true, defaultIntelTab: "news" as const, autoOpenIntelSheet: false, openLayerPanel: false });
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
  const [compactChipId, setCompactChipId] = useState<CompactChipId>("frontline");
  const desktopSnapshotRef = useRef<{ layers: LayerPrefs; ultraLite: boolean } | null>(null);
  const compactWasActiveRef = useRef(false);
  const layerPrefsLiveRef = useRef<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const [showModePicker, setShowModePicker] = useState(false);
  const [modePickerLockMode, setModePickerLockMode] = useState(false);
  const [modePickerInitialMode, setModePickerInitialMode] = useState<ViewerMode | null>(null);
  const [entryGate, setEntryGate] = useState<EntryGate>(null);
  const domainThenDetailTimerRef = useRef<number | null>(null);
  const [chromeCoachStep, setChromeCoachStep] = useState<ChromeCoachStep | null>(null);
  const [frictionCoachStep, setFrictionCoachStep] = useState<FrictionCoachStep | null>(null);
  const frictionCoachAwaitHistoryRef = useRef(false);
  const frictionCoachListAckRef = useRef(false);
  const [showAirRaidCoach, setShowAirRaidCoach] = useState(false);
  const [periodicBriefing, setPeriodicBriefing] = useState<PeriodicBriefing | null>(null);
  /** 오늘 등불 파이프라인 종료 여부(표시·스킵·이미 봄). false면 공습/이슈 UI 보류 */
  const [dailyLampSettled, setDailyLampSettled] = useState(false);
  const [tomorrowTensionPrompt, setTomorrowTensionPrompt] = useState<DailyPrompt | null>(null);
  /** 오늘의 WTI — 사운드·등불·예측 기축 */
  const [wtiSnapshot, setWtiSnapshot] = useState<WorldTensionSnapshot | null>(null);
  const [showLampRoleTip, setShowLampRoleTip] = useState(false);
  const [airRaidBriefing, setAirRaidBriefing] = useState<AirRaidBriefingContent | null>(null);
  const [airRaidOffer, setAirRaidOffer] = useState<AirRaidOffer | null>(null);
  /** 로컬 자정에 바뀜 — 매일 등불 재점화 트리거 */
  const calendarDayKey = useLocalCalendarDayKey();
  /** 등불 양피지가 떠 있거나 아직 오늘 등불이 끝나지 않으면 공습·이슈 UI 정지 */
  const issueUiPausedForLamp = Boolean(periodicBriefing) || !dailyLampSettled;
  const battlefieldSoftZoneRef = useRef<BattlefieldZone | null>(null);
  const battlefieldManualUntilRef = useRef(0);
  const [showViewerIntro, setShowViewerIntro] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showTrustPanel, setShowTrustPanel] = useState(false);
  /** 모바일 전용 — 지구본을 가리지 않는 속보+반응 바텀시트 (지구본과 동시에 볼 수 있음) */
  const [showMobileAlertFeed, setShowMobileAlertFeed] = useState(false);
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
  const [gdeltEvents, setGdeltEvents] = useState<ConflictEvent[]>([]);
  const [gdeltLoading, setGdeltLoading] = useState(false);
  const [gdeltError, setGdeltError] = useState<string | null>(null);
  const [gdeltFetchedAt, setGdeltFetchedAt] = useState<string | null>(null);
  const [telegramAlerts, setTelegramAlerts] = useState<TelegramAlert[]>([]);
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
  /** 공습사이렌 포커스 — 사각 틀 없이 해당 지역 빗금만 */
  const [airRaidFocusPaths, setAirRaidFocusPaths] = useState<TransportPath[]>([]);
  const [airRaidFocusBox, setAirRaidFocusBox] = useState<AirRaidFocusBox | null>(null);
  const airRaidFocusClearRef = useRef<number | null>(null);
  /** 첫 스냅샷은 seen만 채우고 자동 fly 금지 */
  const seenAirRaidKeysRef = useRef<Set<string> | null>(null);
  const airRaidAutoBusyRef = useRef(false);
  const airRaidAutoSeqRef = useRef(0);

  const parseEastAsiaAdiz = useCallback(
    (raw: unknown) => raw as FeatureCollection,
    [],
  );
  const { data: eastAsiaAdizFc } = useLazyJsonObject<FeatureCollection>(
    "east-asia-adiz.geojson",
    !isEconomyViewer,
    parseEastAsiaAdiz,
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
  const { syncInfo, syncGeneration, forceSync } = useDataSync({
    mode: "default",
    enabled: !isClientApiStubMode(),
    cameraMovingRef: isCameraMovingRef,
  });
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
  const [hapiCasualties, setHapiCasualties] =
    useState<HapiConflictCasualtiesPayload>(HAPI_CASUALTY_SEED);
  const ukraineSettlementsLoadedRef = useRef(false);
  const ukraineSettlementsSourceRef = useRef<UkraineSettlement[]>([]);
  const ukraineFetchStartedRef = useRef(false);
  const ukraineZoomPendingRef = useRef(false);
  const neptunZoomPendingRef = useRef(false);
  /** 도메인 선택~세부 확정 전: 우크라/NEPTUN/인트로 자동 줌 억제 */
  const suppressAutoRegionZoomRef = useRef(false);
  const [aisVessels, setAisVessels] = useState<AisVessel[]>([]);
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
  const mapSectionRef = useRef<HTMLElement>(null);
  const enterTheaterFocusRef = useRef<
    (selection: NavSelection, tab?: TheaterSidebarTab) => void
  >(() => {});
  const enterEconomyRegionFocusRef = useRef<
    (selection: NavSelection, opts?: { openInsight?: boolean }) => void
  >(() => {});
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
  const {
    layerPrefs,
    draftPrefs,
    togglePref,
    toggleCategoryPrefs,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    flushPendingPrefs,
    batchPending,
    applyGeneration,
    immediateUntilRef,
  } = useLayerPrefsController(deferLayerMapApplyRef, { ultraLiteRef });

  useEffect(() => {
    const perf = loadPerfPrefs();
    ultraLiteRef.current = perf.ultraLite;
    setUltraLite(perf.ultraLite);
    if (perf.ultraLite) {
      applyLayerPrefs(applyUltraLiteToLayerPrefs(loadLayerPrefs()));
    }
  }, [applyLayerPrefs]);

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

  const handlePanelDraftPatch = useCallback(
    (patch: Partial<LayerPrefs>) => {
      panelDraftPatchRef.current = { ...panelDraftPatchRef.current, ...patch };
      // 체크는 켜지되, soft batch로 지구본 멈춤(immediate 전체 재계산)을 피함
      patchLayerPrefsSoft(patch);
    },
    [patchLayerPrefsSoft],
  );

  const handlePanelLangDraft = useCallback(
    (lang: LabelLanguage) => {
      panelDraftPatchRef.current = {
        ...panelDraftPatchRef.current,
        labelLanguage: lang,
      };
      patchLayerPrefsSoft({ labelLanguage: lang });
    },
    [patchLayerPrefsSoft],
  );

  const {
    showWarZones,
    showDiplomaticTension,
    showCityLabels,
    showRailGlow,
    showAis,
    showShippingLanes,
    showSubmarineCables,
    showSubmarineTunnels,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
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
    showCriticalNodes,
    showMilitaryBases,
    showResources,
    showNuclearSites,
    showInternetExchanges,
    showRefugeeCamps,
    showUcdpEvents,
    showMilitaryActivity,
    showAirTraffic,
    showUsCarriers,
    showSpaceLaunches,
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
    showChinaTaiwanIncidents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showUsChinaIncidents,
    showNorthKoreaMissileTests,
    showNeptun,
    showNeptunPreviousTrails,
    showEastAsiaAdiz,
    showIslandChains,
    showAxisNetwork,
    showBriTradeConnectivity,
    showUsDfcSupplyChain,
    labelLanguage,
  } = layerPrefs;

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
        regionNavSelection?.id === "ukraine" ||
        regionNavSelection?.id.startsWith("ukraine-")
      ) {
      setRegionNavSelection(null);
      }
      togglePref("showUkraineControl", v);
      return;
    }
    const ukraineSel = navSelectionFromId("ukraine");
    if (ukraineSel) {
      enterTheaterFocusRef.current?.(ukraineSel);
      return;
    }
    togglePref("showUkraineControl", v);
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
  const setShowShippingLanes = (v: boolean) => togglePref("showShippingLanes", v);
  const setShowSubmarineCables = (v: boolean) => togglePref("showSubmarineCables", v);
  const setShowSubmarineTunnels = (v: boolean) => togglePref("showSubmarineTunnels", v);
  const setShowOilPipelines = (v: boolean) => togglePref("showOilPipelines", v);
  const setShowGasPipelines = (v: boolean) => togglePref("showGasPipelines", v);
  const setShowLngTerminals = (v: boolean) => togglePref("showLngTerminals", v);
  const setShowAirports = (v: boolean) => togglePref("showAirports", v);
  const setShowPorts = (v: boolean) => togglePref("showPorts", v);
  const setShowLogisticsRisk = (v: boolean) => togglePref("showLogisticsRisk", v);
  const setShowCriticalNodes = (v: boolean) => togglePref("showCriticalNodes", v);
  const setShowMilitaryBases = (v: boolean) => togglePref("showMilitaryBases", v);
  const setShowResources = (v: boolean) => togglePref("showResources", v);
  const setShowNuclearSites = (v: boolean) => togglePref("showNuclearSites", v);
  const setShowInternetExchanges = (v: boolean) => togglePref("showInternetExchanges", v);
  const setShowRefugeeCamps = (v: boolean) => togglePref("showRefugeeCamps", v);
  const setShowUcdpEvents = (v: boolean) => togglePref("showUcdpEvents", v);
  const setShowMilitaryActivity = (v: boolean) => togglePref("showMilitaryActivity", v);
  const setShowAirTraffic = (v: boolean) => togglePref("showAirTraffic", v);
  const setShowUsCarriers = (v: boolean) => togglePref("showUsCarriers", v);
  const setShowSpaceLaunches = (v: boolean) => togglePref("showSpaceLaunches", v);
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
  const setShowChinaTaiwanIncidents = (v: boolean) => togglePref("showChinaTaiwanIncidents", v);
  const setShowChinaJapanIncidents = (v: boolean) => togglePref("showChinaJapanIncidents", v);
  const setShowChinaPhilippinesIncidents = (v: boolean) =>
    togglePref("showChinaPhilippinesIncidents", v);
  const setShowUsChinaIncidents = (v: boolean) => togglePref("showUsChinaIncidents", v);
  const setShowNorthKoreaMissileTests = (v: boolean) =>
    togglePref("showNorthKoreaMissileTests", v);

  const setShowNeptun = (v: boolean) => {
    if (v) {
      neptunZoomPendingRef.current = true;
      immediateUntilRef.current = Date.now() + 1500;
      setRegionNavSelection(null);
      setSelected(null);
      togglePref("showNeptun", true);
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

  const [regionNavSelection, setRegionNavSelection] = useState<NavSelection | null>(null);
  const [hubBriefOpen, setHubBriefOpen] = useState(false);
  const hubBriefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ukraineFrontLegendEngaged, setUkraineFrontLegendEngaged] = useState(false);
  const [econNavSelection, setEconNavSelection] = useState<NavSelection | null>(null);
  const [econInsightOpen, setEconInsightOpen] = useState(false);
  const [econInsightBrief, setEconInsightBrief] = useState<EconInsightBrief | null>(null);
  const [econInsightCompact, setEconInsightCompact] = useState(false);
  const [econNewsPanelReveal, setEconNewsPanelReveal] = useState(false);
  const econInsightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theaterSidebarTab, setTheaterSidebarTab] = useState<TheaterSidebarTab>("news");
  const [regimeSelectedEpisodeId, setRegimeSelectedEpisodeId] = useState<string | null>(null);
  const [frictionEpisodeBrief, setFrictionEpisodeBrief] = useState<FrictionEpisode | null>(null);
  const [frictionActiveStageId, setFrictionActiveStageId] = useState<string | null>(null);
  const frictionEpisodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyImmersionRef = useRef(false);

  const activeHubId = regionNavSelection?.hubId ?? null;
  const hubFocusMode = regionNavSelection?.focusMode ?? null;
  const historyImmersionActive = hubFocusMode === "regime";
  historyImmersionRef.current = historyImmersionActive;
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

  const exitHistoryImmersion = useCallback(() => {
    clearFrictionEpisodeTimer();
    clearHubBriefTimer();
    setFrictionEpisodeBrief(null);
    setRegimeSelectedEpisodeId(null);
    setFrictionActiveStageId(null);
    setHubBriefOpen(false);
    setRegionNavSelection(null);
    setFrictionCoachStep(null);
    frictionCoachAwaitHistoryRef.current = false;
    frictionCoachListAckRef.current = false;
    const controls = globeRef.current?.controls();
    if (controls) controls.maxDistance = 720;
  }, [clearFrictionEpisodeTimer, clearHubBriefTimer]);

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
  }, []);

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

  const clearEconInsightTimer = useCallback(() => {
    if (econInsightTimerRef.current != null) {
      clearTimeout(econInsightTimerRef.current);
      econInsightTimerRef.current = null;
    }
  }, []);

  const closeEconInsight = useCallback(() => {
    setEconInsightOpen(false);
    setEconInsightBrief(null);
    setEconInsightCompact(false);
  }, []);

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
    Boolean(activeHubId && hubFocusMode === "arms"),
    parseAxisArms,
  );
  const [viewState, setViewState] = useState<ViewState>({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
    altitude: ENTRY_GATE.bootAltitude,
  });
  const [filterCenter, setFilterCenter] = useState<{ lat: number; lng: number }>({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
  });
  const [layerAltitude, setLayerAltitude] = useState<number>(ENTRY_GATE.bootAltitude);
  const [isCameraMoving, setIsCameraMoving] = useState(false);

  const { layerViewState, mapZoom } = useCameraViewport(filterCenter, layerAltitude);

  useEffect(() => {
    return () => {
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
        moveIdleTimerRef.current = null;
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
        renderStabilizeIdleRef.current = null;
      }
    };
  }, []);

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
        newsTheaterFromCoords(layerCenterRef.current.lat, layerCenterRef.current.lng),
      );
      setIntelSheetOpen(true);
    };

    mapEl.addEventListener("mousedown", openNewsFromMiddleClick, true);
    return () => {
      mapEl.removeEventListener("mousedown", openNewsFromMiddleClick, true);
    };
  }, [showLeftPanel, selected, regionNavSelection]);

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

    let cancelPlaces: (() => void) | undefined;
    void loadData().then((cancel) => {
      cancelPlaces = cancel;
    });
    return () => {
      mounted = false;
      cancelPlaces?.();
    };
  }, [syncGeneration]);

  const bootReadyRef = useRef(false);
  useEffect(() => {
    const progress = computeDashboardBootProgress({
      globeReady,
      isLoading,
      appDataLoadProgress,
    });
    onBootProgress?.(progress);

    if (
      !bootReadyRef.current &&
      progress >= 100 &&
      globeReady &&
      !isLoading
    ) {
      bootReadyRef.current = true;
      onBootReady?.();
    }
  }, [
    appDataLoadProgress,
    globeReady,
    isLoading,
    onBootProgress,
    onBootReady,
  ]);

  useEffect(() => {
    if (isEconomyViewer) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/hapi-conflict-casualties", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as HapiConflictCasualtiesPayload;
        if (cancelled || !payload?.fronts) return;
        // 라이브가 비면 시드 유지 — 빈 배열로 덮어 사망 숫자가 사라지지 않게
        if (payload.fronts.length === 0) return;
        setHapiCasualties({ ...HAPI_CASUALTY_SEED, ...payload });
      } catch {
        /* seed 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEconomyViewer]);

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
    if (!showUkraineControl || !viinaMeta?.available) return;
    if (ukraineControl.length > 0 || ukraineControlStatus === "loading") return;
      void refreshUkraineControl();
  }, [
    refreshUkraineControl,
    showUkraineControl,
    ukraineControl.length,
    ukraineControlStatus,
    viinaMeta?.available,
  ]);

  useEffect(() => {
    if (!showNeptun && !showNeptunPreviousTrails) return;
    void prefetchNeptun();
  }, [showNeptun, showNeptunPreviousTrails]);

  useEffect(() => {
    if (suppressAutoRegionZoomRef.current) return;
    if (!showUkraineControl || !viinaMeta?.available) return;
    ukraineZoomPendingRef.current = true;
    if (showNeptun) neptunZoomPendingRef.current = true;
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
    return globeLodFromTier(nextTier);
  }, [layerAltitude]);

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

  const viinaFrontEvents = useMemo(() => {
    if (!showUkraineControl) return [];
    return buildViinaFrontEvents([...viinaDisplay.contestedZones, ...viinaDisplay.ruZones]).slice(
      0,
      200,
    );
  }, [showUkraineControl, viinaDisplay.contestedZones, viinaDisplay.ruZones]);

  /** 공습경보 배너용 — 카메라·레이어와 무관하게 NEPTUN 상시 수신 (글로브 마커는 별도 게이트) */
  const neptunFetchEnabled = true;
  const {
    threats: neptunThreats,
    archivedThreats: neptunArchivedThreats,
    alerts: neptunAlerts,
    live: neptunLive,
    status: neptunStatus,
    error: neptunError,
    serverTime: neptunServerTime,
    alertCount: neptunAlertCount,
    impactFlashes: neptunImpactFlashes,
  } = useNeptunStream(neptunFetchEnabled, { pausePublish: isCameraMoving });

  const neptunInTheater = useMemo(
    () =>
      showUkraineControl || isNeptunTheaterInView(layerViewState, globeLod.tier),
    [globeLod.tier, layerViewState, showUkraineControl],
  );
  const neptunRenderMode = useMemo(
    () => getNeptunRenderMode(globeLod.tier, neptunInTheater, showNeptun, showUkraineControl),
    [globeLod.tier, neptunInTheater, showNeptun, showUkraineControl],
  );

  const visibleNeptunThreats = useMemo(() => {
    if (!showNeptun || !neptunShowsMarkers(neptunRenderMode)) return [];
    const max = NEPTUN_THREAT_MAX_BY_TIER[globeLod.tier];
    if (
      showUkraineControl &&
      (globeLod.tier === "global" || globeLod.tier === "continent")
    ) {
      return filterNeptunThreatsInOpsBox(neptunThreats, max);
    }
    return filterNeptunThreatsForViewport(neptunThreats, layerViewState, globeLod.tier, max);
  }, [
    globeLod.tier,
    layerViewState,
    neptunRenderMode,
    neptunThreats,
    showNeptun,
    showUkraineControl,
  ]);

  const visibleNeptunArchived = useMemo(() => {
    if (!showNeptun || !showNeptunPreviousTrails || !neptunShowsPaths(neptunRenderMode)) {
      return [];
    }
    const max = NEPTUN_ARCHIVED_MAX_BY_TIER[globeLod.tier];
    if (
      showUkraineControl &&
      (globeLod.tier === "global" || globeLod.tier === "continent")
    ) {
      return filterNeptunThreatsInOpsBox(neptunArchivedThreats, max);
    }
    return filterNeptunThreatsForViewport(
      neptunArchivedThreats,
      layerViewState,
      globeLod.tier,
      max,
    );
  }, [
    globeLod.tier,
    layerViewState,
    neptunArchivedThreats,
    neptunRenderMode,
    showNeptun,
    showNeptunPreviousTrails,
    showUkraineControl,
  ]);

  const neptunTrailBudget = useMemo(
    () => neptunTrailPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunProjectionBudget = useMemo(
    () => neptunProjectionPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunArchivedBudget = useMemo(
    () => neptunArchivedPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunGroundTrailBudget = useMemo(
    () => neptunMaxGroundTrailVertices(neptunRenderMode),
    [neptunRenderMode],
  );

  /** 전선 레이어 ON 또는 우크라이나 극동부를 확대해 볼 때 하단 UI 전환 */
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

  const globeTextures = useMemo(() => getGlobeTextures(), []);
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

  const pathRadiusDeg =
    globeLod.radiusDeg > 0 ? globeLod.radiusDeg : globeLod.tier === "global" ? 40 : 28;

  const staticLayers = useGlobeStaticLayers({
    viewState: layerViewState,
    globeTier: globeLod.tier,
    radiusDeg: pathRadiusDeg,
    showDisputeBoundaries: showAnyDisputeOverlay && globeReady,
    showShippingLanes,
    showSubmarineCables,
    showSubmarineTunnels,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
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
    visibleShipping,
    visibleCables,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleStaticPoints,
    visibleMilitaryBaseAreas,
    visibleConflictZones,
    visibleArmsEmbargoZones,
    disputeOverviews,
    counts: staticCounts,
  } = staticLayers;

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
    if (!showAnyDisputeOverlay) return;
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
  }, [disputeHatchLod, showAnyDisputeOverlay]);

  const overlayPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    const layers: PolygonLayerFeature[] = [];

    // 우크라이나 점령·주장: MapLibre macro/micro GeoJSON — deck.gl overlay 면 없음

    if (showMilitaryBases && visibleMilitaryBaseAreas.length > 0) {
      layers.push(
        ...visibleMilitaryBaseAreas.map((area) => ({
          ...area,
          polygonLayer: "military-base" as const,
        })),
      );
    }

    return layers.length > 0 ? layers : EMPTY_OVERLAY_POLYGONS;
  }, [showMilitaryBases, visibleMilitaryBaseAreas]);

  const disputeZonePaths = useMemo<TransportPath[]>(() => {
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
    if (!showUkraineControl || viinaDisplay.lod.mode === "hidden") {
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
    showUkraineControl,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
    viinaDisplay.uaZones,
  ]);

  const ukraineMicroGeoJson = useMemo(() => {
    if (!showUkraineControl || viinaDisplay.lod.mode === "hidden") {
      return emptyUkraineFrontGeoJson();
    }
    if (viinaDisplay.ruZones.length > 0 || viinaDisplay.contestedZones.length > 0) {
      return buildUkraineMicroGeoJson(viinaDisplay.ruZones, viinaDisplay.contestedZones);
    }
    return buildUkraineMicroSeedGeoJson();
  }, [
    showUkraineControl,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
  ]);

  const polygonDataWithUkraine = polygonData;

  const axisHubCountriesGeoJson = useMemo(() => {
    // 지정학 전용 — 지경학 창에서는 축 허브 국경 채움 표시 안 함
    if (isEconomyViewer) {
      return buildAxisHubCountriesGeoJson(undefined);
    }
    return buildAxisHubCountriesGeoJson(data.countries, {
      activeIso: activeHubId ?? null,
    });
  }, [activeHubId, data.countries, isEconomyViewer]);

  const eastAsiaAdizPaths = useMemo<TransportPath[]>(() => {
    if (!showEastAsiaAdiz) return [];
    if (!isEastAsiaAdizVisibleAtAltitude(layerViewState.altitude)) return [];
    return eastAsiaAdizToPaths(eastAsiaAdizFc);
  }, [eastAsiaAdizFc, layerViewState.altitude, showEastAsiaAdiz]);

  const axisNetworkPaths = useMemo<TransportPath[]>(() => {
    if (!showAxisNetwork) return [];
    const hub = (activeHubId ?? "all") as AxisHubId | "all";
    if (hubFocusMode === "arms" && activeHubId && axisArmsPayload) {
      const { pairs } = filterArmsForHub(axisArmsPayload, activeHubId);
      return armsPairsToPaths(pairs, labelLanguage);
    }
    if (hubFocusMode === "regime") return [];
    if (hub === "all") return [];
    return axisNetworkToPaths(hub, labelLanguage);
  }, [
    showAxisNetwork,
    activeHubId,
    hubFocusMode,
    axisArmsPayload,
    labelLanguage,
  ]);

  const briTradePaths = useMemo<TransportPath[]>(() => {
    if (!showBriTradeConnectivity) return [];
    return briTradePathsToTransport(labelLanguage);
  }, [showBriTradeConnectivity, labelLanguage]);

  const usDfcSupplyPaths = useMemo<TransportPath[]>(() => {
    if (!showUsDfcSupplyChain) return [];
    return usDfcSupplyPathsToTransport(labelLanguage);
  }, [showUsDfcSupplyChain, labelLanguage]);

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
    if (hubFocusMode !== "regime") return [];
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
    if (hubFocusMode !== "regime") return null;
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
    if (!activeFrictionEpisode || hubFocusMode !== "regime") return [];
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

  const rawGlobePaths = useMemo<TransportPath[]>(
    () => [
      ...visibleDisputeBoundaries,
      ...disputeZonePaths,
      ...frictionWarZonePaths,
      ...eastAsiaAdizPaths,
      ...axisNetworkPaths,
      ...briTradePaths,
      ...usDfcSupplyPaths,
      ...visibleShipping,
      ...visibleCables,
      ...visibleOilPipelines,
      ...visibleGasPipelines,
      ...railPaths,
      ...armsEmbargoFramePaths,
    ],
    [
      armsEmbargoFramePaths,
      axisNetworkPaths,
      briTradePaths,
      usDfcSupplyPaths,
      disputeZonePaths,
      eastAsiaAdizPaths,
      frictionWarZonePaths,
      railPaths,
      visibleCables,
      visibleDisputeBoundaries,
      visibleGasPipelines,
      visibleOilPipelines,
      visibleShipping,
    ],
  );

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

  /** 인프라 HTML 실루엣 마커 (공항·항구·DC·핵·초크 등) — DOM 비용 때문에 강하게 캡 */
  const airportPortHtmlMarkers = useMemo(() => {
    const html = staticGlobePoints.filter((point) => isHtmlStaticKind(point.kind));
    if (html.length <= INFRA_HTML_MARKER_CAP) return html;
    return html.slice(0, INFRA_HTML_MARKER_CAP);
  }, [staticGlobePoints]);

  const chokeGlowRings = useMemo<PulseRingPoint[]>(() => {
    if (!showLogisticsRisk) return [];
    return chokeGlowRingSeed().map((p) => ({
      pulseKind: "choke-glow" as const,
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      glow: p.glow,
      radiusScale: p.radiusScale,
      markerId: `choke-glow-${p.id}`,
    }));
  }, [showLogisticsRisk]);

  const carrierAisMerge = useMemo(
    () => mergeCarriersWithAisPositions(usCarriers, aisVessels),
    [aisVessels, usCarriers],
  );

  const visibleUsCarriers = useMemo(
    () =>
      isEconomyViewer
        ? []
        : filterVisibleCarriers(carrierAisMerge.carriers, showUsCarriers),
    [carrierAisMerge.carriers, isEconomyViewer, showUsCarriers],
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
      showMilitaryActivity
        ? milAircraft
            .filter((aircraft) =>
              isCenterInView(aircraft, layerViewState, VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 4),
            )
            .slice(0, liveMilFetchMax())
            .map((aircraft) => ({
              ...aircraft,
              markerId: `mil-${aircraft.hex || aircraft.id}`,
              displayKind: "mil" as const,
            }))
        : [],
    [globeLod.tier, layerViewState, milAircraft, showMilitaryActivity],
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
        ? civAircraft
            .filter((aircraft) =>
              isCenterInView(aircraft, layerViewState, VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 4),
            )
            .slice(0, liveAirTrafficFetchMax())
        : [],
    [civAircraft, globeLod.tier, layerViewState, showAirTraffic],
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

  const aisDisplayPoints = useMemo<AisGlobePoint[]>(
    () =>
      showAis
        ? aisVessels
            .filter((vessel) => !carrierAisMerge.matchedMmsi.has(vessel.mmsi))
            .filter((vessel) =>
              isCenterInView(vessel, layerViewState, VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 6),
            )
            .slice(0, liveAisFetchMax())
            .map((vessel) => ({
              ...vessel,
              markerId: `ais-${vessel.mmsi}`,
              displayKind: "ais" as const,
            }))
        : [],
    [aisVessels, carrierAisMerge.matchedMmsi, globeLod.tier, layerViewState, showAis],
  );

  const aisHtmlMarkers = useMemo<AisHtmlMarker[]>(
    () =>
      aisDisplayPoints.map((vessel) => ({
        ...vessel,
        markerId: `ais-html-${vessel.mmsi}`,
        displayKind: "ais-html" as const,
      })),
    [aisDisplayPoints],
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
    const base = buildFirmsCombatHotspots({
      disputes: data.disputes,
      includeWarZones: showWarZones,
      conflictZones: visibleConflictZones,
      includeConflictZones: showConflictZones,
    });
    // 전쟁뉴스 근처 화재경보 — 전쟁구역 빗금 없이도 GDELT war 좌표로 교차
    if (showGdeltWar || showFirmsFires) {
      const warEvents = scoredEvents.filter((event) => event.eventTier === "war");
      return [...base, ...buildGdeltWarNewsHotspots(warEvents)];
    }
    return base;
  }, [
    data.disputes,
    scoredEvents,
    showConflictZones,
    showFirmsFires,
    showGdeltWar,
    showWarZones,
    visibleConflictZones,
  ]);

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
    const iranFronts = (hapiCasualties.fronts ?? []).filter((f) => f.locationCode === "IRN");
    return newfeedsAttacks
      .filter((attack) => isFreshNewfeedsAttack(attack))
      .map((attack) => ({
        ...attack,
        markerId: `newfeeds-${attack.id}`,
        displayKind: "newfeeds-attack" as const,
        hapiTag: nearestIranHapiTag(attack.lat, attack.lng, iranFronts),
      }));
  }, [hapiCasualties.fronts, newfeedsAttacks, showNewfeedsIranAttacks]);

  const chinaTheaterIncidentMarkers = useMemo<ChinaTheaterIncidentHtmlMarker[]>(() => {
    const enabled = new Set<ChinaTheaterDyad>();
    if (showChinaTaiwanIncidents) enabled.add("china-taiwan");
    if (showChinaJapanIncidents) enabled.add("china-japan");
    if (showChinaPhilippinesIncidents) enabled.add("china-philippines");
    if (showUsChinaIncidents) enabled.add("us-china");
    if (enabled.size === 0) return [];
    return activateChinaTheaterIncidents(enabled, scoredEvents).map((item) => ({
      ...item,
      markerId: `china-incident-${item.id}`,
      displayKind: "china-theater-incident" as const,
    }));
  }, [
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

  const neptunHtmlMarkers = useMemo<NeptunHtmlMarker[]>(() => {
    if (!showNeptun || !neptunShowsMarkers(neptunRenderMode)) return [];
    return visibleNeptunThreats.map((threat) => ({
      ...threat,
      lat: threat.predictedLat,
      lng: threat.predictedLon,
      markerId: `neptun-html-${threat.id}`,
      displayKind: "neptun-html" as const,
    }));
  }, [neptunRenderMode, showNeptun, visibleNeptunThreats]);

  const neptunImpactHtmlMarkers = useMemo<NeptunImpactHtmlMarker[]>(
    () =>
      showNeptun
        ? neptunImpactFlashes.map((flash) => ({
            ...flash,
            lat: flash.lat,
            lng: flash.lng,
            markerId: flash.id,
            displayKind: "neptun-impact" as const,
          }))
        : [],
    [neptunImpactFlashes, showNeptun],
  );

  const neptunImpactInView = useMemo(() => {
    if (!showNeptun || neptunImpactFlashes.length === 0) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    return neptunImpactFlashes.some((flash) =>
      isCenterInView(flash, layerViewState, radiusDeg),
    );
  }, [globeLod.tier, layerViewState, neptunImpactFlashes, showNeptun]);

  const firmsCombatInView = firmsCombatFireIds.length > 0;

  /** 실제 교전(우크라·중동/이란) 위 regional 이하 → 전장 사운드. 대만·한반도 제외 */
  const soundFrontlineAmbient = useMemo(() => {
    if (isEconomyViewer) return false;
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return false;
    if (showUkraineControl) return true;
    /** 분쟁 외교사 선택 구역 — 체크박스 없이 해당 좌표에서만 교전음 */
    if (activeFrictionEpisode) {
      const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 2.5;
      if (
        isCenterInView(
          { lat: episodeLat(activeFrictionEpisode), lng: episodeLng(activeFrictionEpisode) },
          layerViewState,
          radiusDeg,
        )
      ) {
        return true;
      }
    }
    return resolveActiveWarTheaterAt(filterCenter.lat, filterCenter.lng) != null;
  }, [
    activeFrictionEpisode,
    filterCenter.lat,
    filterCenter.lng,
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showUkraineControl,
  ]);

  /** 대만해협 — 시계 틱 긴장 앰비언트 */
  const soundTaiwanTensionAmbient = useMemo(() => {
    if (isEconomyViewer || soundFrontlineAmbient) return false;
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return false;
    return resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng) === "china-taiwan";
  }, [filterCenter.lat, filterCenter.lng, globeLod.tier, isEconomyViewer, soundFrontlineAmbient]);

  /** 긴장 rumble: 한반도 박스, 또는 고긴장 분쟁 구역 (대만·전장음 제외) */
  const soundTensionAmbient = useMemo(() => {
    if (isEconomyViewer || soundFrontlineAmbient || soundTaiwanTensionAmbient) return false;
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return false;

    const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
    if (theater === "korea") return true;

    if (!showAnyDisputeOverlay) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 2;
    return (data.disputes ?? []).some((dispute) => {
      if (!disputeMatchesWarDiplomaticLayers(dispute, showWarZones, showDiplomaticTension)) {
        return false;
      }
      if (!(isCombatHazard(dispute) || dispute.tension === "high")) return false;
      return isCenterInView(resolveDisputeCenter(dispute), layerViewState, radiusDeg);
    });
  }, [
    data.disputes,
    filterCenter.lat,
    filterCenter.lng,
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showAnyDisputeOverlay,
    showDiplomaticTension,
    showWarZones,
    soundFrontlineAmbient,
    soundTaiwanTensionAmbient,
  ]);

  /** 미 항모가 뷰에 있으면 갑판 앰비언스 */
  const soundCarrierAmbient = useMemo(() => {
    if (
      isEconomyViewer ||
      soundFrontlineAmbient ||
      soundTaiwanTensionAmbient ||
      soundTensionAmbient ||
      !showUsCarriers
    ) {
      return false;
    }
    if (visibleUsCarriers.length === 0) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 4;
    return visibleUsCarriers.some((carrier) =>
      isCenterInView({ lat: carrier.lat, lng: carrier.lng }, layerViewState, radiusDeg),
    );
  }, [
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showUsCarriers,
    soundFrontlineAmbient,
    soundTaiwanTensionAmbient,
    soundTensionAmbient,
    visibleUsCarriers,
  ]);

  const soundConflictAmbient = useMemo(():
    | "frontline"
    | "taiwan-tension"
    | "tension"
    | "carrier"
    | null => {
    if (soundFrontlineAmbient) return "frontline";
    if (soundTaiwanTensionAmbient) return "taiwan-tension";
    if (soundTensionAmbient) return "tension";
    if (soundCarrierAmbient) return "carrier";
    return null;
  }, [
    soundCarrierAmbient,
    soundFrontlineAmbient,
    soundTaiwanTensionAmbient,
    soundTensionAmbient,
  ]);

  const soundEconomyAmbient = useMemo((): "port" | "construction" | "datacenter" | "pipeline" | null => {
    if (!isEconomyViewer) return null;
    if (showOilPipelines || showGasPipelines) return "pipeline";
    if (showAiDataCenters || showInternetExchanges) return "datacenter";
    if (showPorts || showShippingLanes || showLngTerminals) return "port";
    if (showEconomicCenters) return "construction";
    return null;
  }, [
    isEconomyViewer,
    showAiDataCenters,
    showEconomicCenters,
    showGasPipelines,
    showInternetExchanges,
    showLngTerminals,
    showOilPipelines,
    showPorts,
    showShippingLanes,
  ]);

  const neptunPathElevation = useMemo<NeptunPathElevationMode>(
    () => neptunElevationForMode(neptunRenderMode),
    [neptunRenderMode],
  );

  const neptunTrailPaths = useMemo(() => {
    if (!showNeptun || !neptunShowsPaths(neptunRenderMode)) return [];
    return buildNeptunTrailPaths(
      visibleNeptunThreats,
      neptunPathElevation,
      neptunTrailBudget,
      neptunGroundTrailBudget,
    );
  }, [
    neptunGroundTrailBudget,
    neptunPathElevation,
    neptunRenderMode,
    neptunTrailBudget,
    showNeptun,
    visibleNeptunThreats,
  ]);

  const neptunProjectionPaths = useMemo(() => {
    if (!showNeptun || !neptunShowsProjection(neptunRenderMode)) return [];
    return buildNeptunProjectionPaths(
      visibleNeptunThreats,
      neptunPathElevation,
      neptunProjectionBudget,
    );
  }, [
    neptunPathElevation,
    neptunProjectionBudget,
    neptunRenderMode,
    showNeptun,
    visibleNeptunThreats,
  ]);

  const neptunArchivedTrackPathsRaw = useMemo(() => {
    if (!showNeptun || !showNeptunPreviousTrails || !neptunShowsPaths(neptunRenderMode)) {
      return [];
    }
    const archivedGroundBudget = Math.max(6, Math.floor(neptunGroundTrailBudget * 0.75));
    return buildArchivedNeptunTrackPaths(
      visibleNeptunArchived,
      neptunPathElevation,
      neptunArchivedBudget,
      archivedGroundBudget,
    );
  }, [
    neptunArchivedBudget,
    neptunGroundTrailBudget,
    neptunPathElevation,
    neptunRenderMode,
    showNeptun,
    showNeptunPreviousTrails,
    visibleNeptunArchived,
  ]);

  const neptunLivePathsPending = useMemo(
    () => [...neptunTrailPaths, ...neptunProjectionPaths],
    [neptunProjectionPaths, neptunTrailPaths],
  );

  const [stableNeptunLivePaths, setStableNeptunLivePaths] = useState<TransportPath[]>([]);
  const [stableNeptunArchivedPaths, setStableNeptunArchivedPaths] = useState<TransportPath[]>([]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setStableNeptunLivePaths((prev) =>
      neptunPathsGeometryEqual(prev, neptunLivePathsPending) ? prev : neptunLivePathsPending,
    );
  }, [immediateUntilRef, isCameraMoving, neptunLivePathsPending]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setStableNeptunArchivedPaths((prev) =>
      neptunPathsGeometryEqual(prev, neptunArchivedTrackPathsRaw) ? prev : neptunArchivedTrackPathsRaw,
    );
  }, [immediateUntilRef, isCameraMoving, neptunArchivedTrackPathsRaw]);

  /** 정적 포인트 + AI 전쟁지역 (FIRMS는 전용 불꽃 레이어) */
  /** 정적 포인트 + AI 전쟁지역 (FIRMS·이란 뉴스는 전용 레이어) */
  const globeDisplayPoints = useMemo<GlobeDisplayPoint[]>(() => {
    const points: GlobeDisplayPoint[] = [
      ...staticGlobePoints.filter((point) => !isHtmlStaticKind(point.kind)),
      ...conflictClusterPoints,
      ...tzevaAdomDisplayPoints,
    ];
    return points;
  }, [conflictClusterPoints, staticGlobePoints, tzevaAdomDisplayPoints]);

  const conflictClusterRings = useMemo<PulseRingPoint[]>(
    () => [
      ...conflictClusterPoints.map((point) => ({ ...point, pulseKind: "ai-zone" as const })),
      ...firmsBombRingPoints,
      ...claimRingPoints,
      ...frictionRingPoints,
      ...chokeGlowRings,
    ],
    [
      claimRingPoints,
      chokeGlowRings,
      conflictClusterPoints,
      firmsBombRingPoints,
      frictionRingPoints,
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

  const gdeltTagHtmlMarkers = useMemo<GdeltTagHtmlMarker[]>(
    () =>
      gdeltTensionTags
        .filter((event) => !isUkraineTheaterGdeltWar(event))
        .map((event) => ({
          ...event,
          markerId: `gdelt-tag-${event.id}`,
          displayKind: "gdelt-tag-html" as const,
        })),
    [gdeltTensionTags],
  );

  const ukraineGdeltNeonMarkers = useMemo<UkraineGdeltNeonMarker[]>(() => {
    if (!showGdeltWar) return [];
    const ukrFronts = (hapiCasualties.fronts ?? []).filter((f) => f.locationCode === "UKR");
    return gdeltTensionTags
      .filter((event) => isUkraineTheaterGdeltWar(event) && isFreshEvent(event))
      .map((event) => ({
        ...event,
        markerId: `ua-gdelt-neon-${event.id}`,
        displayKind: "ukraine-gdelt-neon" as const,
        hapiTag: nearestUkraineHapiTag(event.lat, event.lng, ukrFronts),
      }));
  }, [gdeltTensionTags, hapiCasualties.fronts, showGdeltWar]);

  const situationCalloutMarkers = useMemo<SituationCalloutMarker[]>(() => {
    if (isEconomyViewer) return [];
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return [];

    const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
    const seeds: SituationCallout[] = [];

    // 우크라: 전선 레이어 ON 또는 전장 박스 안
    if (showUkraineControl || theater === "russia-ukraine") {
      seeds.push(...UKRAINE_SITUATION_CALLOUTS_SHARED);
    }
    // 중동·이란: 전쟁구역/긴장/공습경보 또는 중동 박스
    if (
      theater === "middle-east" ||
      showWarZones ||
      showDiplomaticTension ||
      showTzevaAdom ||
      showNewfeedsIranAttacks
    ) {
      if (theater === "middle-east" || showWarZones || showTzevaAdom || showNewfeedsIranAttacks) {
        seeds.push(...MIDDLE_EAST_SITUATION_CALLOUTS);
      }
    }
    // 대만·한반도: 해당 전장 위 + 전쟁구역/긴장
    if (theater === "china-taiwan" && (showWarZones || showDiplomaticTension)) {
      seeds.push(...TAIWAN_SITUATION_CALLOUTS);
    }
    if (theater === "korea" && (showWarZones || showDiplomaticTension || showMilitaryActivity)) {
      seeds.push(...KOREA_SITUATION_CALLOUTS);
    }

    // 카메라가 해당 전장에 있을 때만 그 전장 콜아웃 표시 (혼선 방지)
    const visible =
      theater == null
        ? seeds.filter((c) => c.theater === "russia-ukraine" && showUkraineControl)
        : seeds.filter((c) => c.theater === theater);

    return visible.map((callout) => ({
      ...callout,
      markerId: `sit-callout-${callout.theater}-${callout.id}`,
      displayKind: "situation-callout" as const,
    }));
  }, [
    filterCenter.lat,
    filterCenter.lng,
    globeLod.tier,
    isEconomyViewer,
    showDiplomaticTension,
    showMilitaryActivity,
    showNewfeedsIranAttacks,
    showTzevaAdom,
    showUkraineControl,
    showWarZones,
  ]);

  /** HDX HAPI · ACLED — 열린 전선(admin1) + 중국·대만·이란 긴장 집계 */
  const casualtySkullMarkers = useMemo<CasualtySkullHtmlMarker[]>(() => {
    if (isEconomyViewer || isCompactUi) return [];
    const en = labelLanguage === "en";
    const fronts = hapiCasualties.fronts ?? [];
    if (fronts.length === 0) return [];

    return fronts.map((front) => {
      const isChinaTaiwan = front.theaterId === "china-taiwan";
      const isIran = front.locationCode === "IRN";
      const useEvents =
        (isChinaTaiwan || isIran) && front.killed <= 0 && front.events > 0;
      return {
        markerId: `casualty-skull-${front.id}`,
        displayKind: "casualty-skull" as const,
        id: front.id,
        theaterId: front.theaterId,
        locationCode: front.locationCode,
        lat: front.lat,
        lng: front.lng,
        killed: useEvents ? front.events : front.killed,
        wounded: 0,
        killedLabel: useEvents
          ? en
            ? isIran
              ? "Iran political violence events"
              : "Political violence events"
            : isIran
              ? "이란 정치폭력 사건"
              : "정치폭력 사건"
          : en
            ? "Today's fatalities"
            : "오늘의 사망자",
        woundedLabel: en ? "WIA" : "부상",
        asOf: front.periodEnd || hapiCasualties.windowEnd || "",
        sourceHint: en
          ? `${HAPI_ATTRIBUTION_SHORT} · ${front.admin1Name} · ${front.periodStart}–${front.periodEnd} · ${ACLED_HOME_URL}`
          : `${HAPI_ATTRIBUTION_SHORT} · ${front.admin1Name} · ${front.periodStart}–${front.periodEnd} · ${ACLED_HOME_URL}`,
        elegyLines: en ? CASUALTY_ELEGY_LINES.en : CASUALTY_ELEGY_LINES.ko,
        hideWounded: true,
        territorySpanDeg: front.territorySpanDeg,
        sourceAttribution: HAPI_SOURCE_LINE,
        admin1Name: front.admin1Name,
      };
    });
  }, [hapiCasualties, isCompactUi, isEconomyViewer, labelLanguage]);

  /** 평소 숨김 — 전선(VIINA adm1 / conflict-zone) 호버 시에만 표시 */
  const visibleCasualtySkullMarkers = useMemo(() => {
    if (casualtySkullMarkers.length === 0) return [];

    let hover:
      | {
          kind: "ukraine-adm1" | "conflict-zone" | "near-point";
          adm1?: string | null;
          name?: string | null;
          lat?: number;
          lng?: number;
        }
      | null = null;

    if (hoveredPolygon) {
      if (isUkraineViinaPolygonLayer(hoveredPolygon.polygonLayer)) {
        const zone = hoveredPolygon as UkraineControlZone & {
          polygonLayer: "ukraine-ru" | "ukraine-ua" | "ukraine-contested";
        };
        hover = {
          kind: "ukraine-adm1",
          adm1: zone.adm1 || zone.name || zone.nameLong,
        };
      } else if (hoveredPolygon.polygonLayer === "conflict-zone") {
        hover = {
          kind: "conflict-zone",
          name: hoveredPolygon.name,
          lat: hoveredPolygon.center.lat,
          lng: hoveredPolygon.center.lng,
        };
      }
    } else if (
      hoveredPath &&
      (hoveredPath.kind === "ukraine-ru-front" ||
        hoveredPath.kind === "ukraine-ua-front" ||
        hoveredPath.kind === "ukraine-contested-front" ||
        hoveredPath.kind === "ukraine-combat-zone" ||
        hoveredPath.kind === "dispute-zone" ||
        hoveredPath.kind === "dispute-hatch")
    ) {
      const pts = hoveredPath.points;
      if (pts.length > 0) {
        const mid = pts[Math.floor(pts.length / 2)];
        hover = {
          kind: "near-point",
          name: hoveredPath.name,
          lat: mid.lat,
          lng: mid.lng,
        };
      }
    }

    const ids = new Set(
      matchCasualtyFrontIdsFromHover(
        casualtySkullMarkers.map((m) => ({
          id: m.id,
          admin1Name: m.admin1Name,
          lat: m.lat,
          lng: m.lng,
        })),
        hover,
      ),
    );
    // 중국·대만: VIINA 전선 폴리곤이 없어 상시 노출
    // 이란: NewFeeds 레이어 ON이거나 중동 박스일 때 HAPI IRN 상시 노출
    for (const m of casualtySkullMarkers) {
      if (m.theaterId === "china-taiwan") ids.add(m.id);
      if (
        m.locationCode === "IRN" &&
        (showNewfeedsIranAttacks ||
          resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng) === "middle-east")
      ) {
        ids.add(m.id);
      }
    }
    if (ids.size === 0) return [];
    return casualtySkullMarkers.filter((m) => ids.has(m.id));
  }, [
    casualtySkullMarkers,
    filterCenter.lat,
    filterCenter.lng,
    hoveredPath,
    hoveredPolygon,
    showNewfeedsIranAttacks,
  ]);

  /**
   * OWID 핵탄두 보유량 — 각국 좌표 위 ICBM 아이콘 + 탄두 수 (지정학 뷰 자동 표시).
   * 전장 사상자 마커와 좌표가 겹치면(예: 이스라엘 ↔ 가자·남레바논) 사상자 군집에서
   * 밀어내 표기 위치가 겹치지 않게 함.
   */
  const nuclearStockpileMarkers = useMemo<NuclearStockpileHtmlMarker[]>(() => {
    if (isEconomyViewer) return [];
    const casualtyPts = casualtySkullMarkers.map((m) => ({ lat: m.lat, lng: m.lng }));
    const MIN_SEP_DEG = 2.1; // 마커 간 최소 간격(°)
    const MAX_SHIFT_DEG = 4.0; // 국가에서 벗어나는 최대 이동량 상한

    return NUCLEAR_STOCKPILE_SEEDS.map((seed) => {
      let lat = seed.lat;
      let lng = seed.lng;

      if (casualtyPts.length > 0) {
        for (let iter = 0; iter < 8; iter += 1) {
          let ax = 0;
          let ay = 0;
          let hits = 0;
          for (const p of casualtyPts) {
            const dLat = lat - p.lat;
            const dLng = lng - p.lng;
            const dist = Math.hypot(dLat, dLng);
            if (dist < MIN_SEP_DEG) {
              const need = MIN_SEP_DEG - dist + 0.15;
              if (dist < 1e-3) {
                ay -= need; // 완전히 겹치면 남쪽으로 기본 회피
              } else {
                ax += (dLng / dist) * need;
                ay += (dLat / dist) * need;
              }
              hits += 1;
            }
          }
          if (hits === 0) break;
          lat += ay / hits;
          lng += ax / hits;
        }

        // 국가에서 너무 멀어지지 않게 총 이동량 제한
        const totLat = lat - seed.lat;
        const totLng = lng - seed.lng;
        const tot = Math.hypot(totLat, totLng);
        if (tot > MAX_SHIFT_DEG) {
          const k = MAX_SHIFT_DEG / tot;
          lat = seed.lat + totLat * k;
          lng = seed.lng + totLng * k;
        }
        lat = Math.max(-85, Math.min(85, lat));
      }

      return {
        markerId: `nuclear-icbm-${seed.code}`,
        displayKind: "nuclear-icbm" as const,
        code: seed.code,
        nameKo: seed.nameKo,
        nameEn: seed.nameEn,
        lat,
        lng,
        warheads: seed.warheads,
        year: seed.year,
      };
    });
  }, [casualtySkullMarkers, isEconomyViewer]);

  const ukraineSettlementHtmlMarkers = useMemo<UkraineSettlementHtmlMarker[]>(() => {
    if (!showUkraineControl) return [];
    if (mapZoom <= SETTLEMENT_DETAIL_MIN_MAP_ZOOM) return [];
    if (ukraineSettlements.length === 0 && viinaDisplay.zones.length === 0) return [];
    return filterUkraineSettlementsForView(
      ukraineSettlements,
      viinaDisplay.ruFillZones.length > 0 ? viinaDisplay.ruFillZones : viinaDisplay.zones,
      layerViewState,
      layerViewState.altitude,
    ).map((settlement) => ({
      ...settlement,
      markerId: `ua-settle-${settlement.geonameId}`,
      displayKind: "ua-settlement-html" as const,
      tier: getUkraineSettlementTier(settlement.population),
    }));
  }, [layerViewState, mapZoom, showUkraineControl, ukraineSettlements, viinaDisplay.ruFillZones, viinaDisplay.zones]);

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
      ...milHtmlMarkers,
      ...civHtmlMarkers,
      ...aisHtmlMarkers,
      ...gdeltTagHtmlMarkers,
      ...ukraineGdeltNeonMarkers,
      ...neptunHtmlMarkers,
      ...neptunImpactHtmlMarkers,
      ...frictionPinMarkers,
      ...frictionStageMarkers,
      ...chinaTheaterIncidentMarkers,
      ...koreaMissileIncidentMarkers,
      ...newfeedsAttackDisplayPoints,
    ];
    return markers;
  }, [
      aisHtmlMarkers,
      airportPortHtmlMarkers,
      chinaTheaterIncidentMarkers,
      koreaMissileIncidentMarkers,
      visibleCasualtySkullMarkers,
      frictionPinMarkers,
      frictionStageMarkers,
      gdeltTagHtmlMarkers,
      ukraineGdeltNeonMarkers,
      globePoints,
      milHtmlMarkers,
      civHtmlMarkers,
      neptunHtmlMarkers,
      neptunImpactHtmlMarkers,
      newfeedsAttackDisplayPoints,
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
  const pathStabilityRef = useRef<{ signature: string; count: number; updatedAt: number }>({
    signature: "",
    count: 0,
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
    const bypass = Date.now() < immediateUntilRef.current || isVectorBaseMap;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const count = dynamicGlobePaths.length;
    const hatchCount = dynamicGlobePaths.reduce(
      (sum, item) =>
        item.kind === "dispute-hatch" ||
        item.kind === "conflict-hatch" ||
        item.kind === "dispute-zone"
          ? sum + 1
          : sum,
      0,
    );
    const signature = `${hatchCount}|${dynamicGlobePaths
      .slice(0, 96)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|")}`;
    const prev = pathStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= PATH_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= PATH_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      const nextPaths = dynamicGlobePaths;
      pathStabilityRef.current = { signature, count, updatedAt: now };
      // 대량 경로 주입은 다음 프레임으로 미뤄 체크 UI 정지를 피함
      if (count - prev.count >= 40 || count >= 120) {
        const raf = window.requestAnimationFrame(() => {
          startTransition(() => setGlobePaths([...nextPaths]));
        });
        return () => window.cancelAnimationFrame(raf);
      }
      setGlobePaths([...nextPaths]);
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
          path.kind !== "neptun-trail-archived",
      );
      const paths = [...stableNeptunLivePaths, ...stableNeptunArchivedPaths];
      if (paths.length === 0) {
        const hadNeptun = prev.some((path) => path.kind.startsWith("neptun-"));
        return hadNeptun ? base : prev;
      }
      const prevNeptun = prev.filter((path) => path.kind.startsWith("neptun-"));
      if (neptunPathsGeometryEqual(prevNeptun, paths)) return prev;
      return [...base, ...paths];
    });
  }, [
    immediateUntilRef,
    isCameraMoving,
    stableNeptunArchivedPaths,
    stableNeptunLivePaths,
  ]);

  const fuse = useMemo(
    () =>
      new Fuse(data.places, {
        keys: ["name", "country", "type"],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [data.places],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map((result) => result.item);
  }, [fuse, query]);

  const hoverCard = useMemo<HoverCard>(() => {
    const lang = labelLanguage;
    if (hoveredCarrier) {
      const operational = hoveredCarrier.status === "deployed";
      return {
        kind: "static",
        title: hoveredCarrier.name,
        detail: HOVER.usCarrierDetail(carrierStatusLabel(hoveredCarrier.status, lang), lang),
        badge: operational ? HOVER.operational(lang) : undefined,
        meta: `${hoveredCarrier.hull} · ${hoveredCarrier.location}`,
      };
    }
    if (hoveredMilAircraft) {
      const kind = classifyMilAircraft(hoveredMilAircraft);
      const isCiv = civAircraft.some(
        (a) => a.id === hoveredMilAircraft.id || a.hex === hoveredMilAircraft.hex,
      );
      return {
        kind: "event",
        title: hoveredMilAircraft.callsign || hoveredMilAircraft.hex.toUpperCase(),
        detail: `${milAircraftRoleLabel(kind, lang)} · ${
          isCiv ? HOVER.civAircraft(lang) : HOVER.milAircraft(lang)
        }`,
        meta: [
          hoveredMilAircraft.type,
          hoveredMilAircraft.altitude != null ? `${hoveredMilAircraft.altitude} ft` : null,
          hoveredMilAircraft.groundSpeed != null ? `${hoveredMilAircraft.groundSpeed} kn` : null,
          hoveredMilAircraft.track != null ? `${Math.round(hoveredMilAircraft.track)}°` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
        hint: HOVER.hintDetail(lang),
      };
    }
    if (hoveredNeptunThreat) {
      return {
        kind: "event",
        title: getNeptunTypeLabel(hoveredNeptunThreat.type, lang),
        detail: HOVER.neptunTrack(lang),
        meta: [
          formatNeptunLocation(hoveredNeptunThreat),
          hoveredNeptunThreat.confidenceLevel,
          hoveredNeptunThreat.velocity?.speedKmh
            ? `${Math.round(hoveredNeptunThreat.velocity.speedKmh)} km/h`
            : null,
          hoveredNeptunThreat.predictedHeading != null
            ? HOVER.heading(Math.round(hoveredNeptunThreat.predictedHeading), lang)
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
        body: hoveredNeptunThreat.explanationShort || undefined,
      };
    }
    if (hoveredPoint) {
      if (hoveredPoint.displayKind === "static") {
        if (
          hoveredPoint.kind === "chokepoint" ||
          hoveredPoint.kind === "logistics-hub" ||
          hoveredPoint.kind === "submarine-tunnel"
        ) {
          const riskNote = hoveredPoint.meta?.riskNote;
          const relatedTickers = hoveredPoint.meta?.relatedTickers;
          const throughput = hoveredPoint.meta?.throughput;
          return {
            kind: "static",
            title: hoveredPoint.name,
            detail: staticKindLabel(hoveredPoint.kind, lang),
            body: typeof riskNote === "string" ? riskNote : undefined,
            meta:
              [
                typeof throughput === "string" ? throughput : null,
                typeof relatedTickers === "string"
                  ? HOVER.relatedTickers(relatedTickers, lang)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
            hint: HOVER.hintFlyZone(lang),
          };
        }
        if (hoveredPoint.kind === "ucdp-event") {
          const m = hoveredPoint.meta ?? {};
          const deaths =
            typeof m.fatalities_best === "number"
              ? m.fatalities_best
              : typeof m.deaths === "number"
                ? m.deaths
                : null;
          const year = typeof m.year === "number" ? m.year : null;
          const vType =
            typeof m.violenceType === "string"
              ? m.violenceType
              : typeof m.type === "string"
                ? m.type
                : null;
          const country = typeof m.country === "string" ? m.country : null;
          const date = typeof m.date === "string" ? m.date : null;
          const version =
            typeof m.sourceDatasetVersion === "string" ? m.sourceDatasetVersion : null;
          return {
            kind: "static",
            title: hoveredPoint.name,
            detail: staticKindLabel(hoveredPoint.kind, lang),
            body:
              [
                country,
                date || (year != null ? String(year) : null),
                vType,
                deaths != null
                  ? lang === "en"
                    ? `fatalities (best) ${deaths}`
                    : `사망(추정) ${deaths}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
            meta: `${UCDP_ATTRIBUTION_SHORT}${version ? ` ${version}` : ""} · ${UCDP_ATTRIBUTION}`,
            hint: lang === "en" ? `Source: ${UCDP_SOURCE_URL}` : `출처: ${UCDP_SOURCE_URL}`,
          };
        }
        const firstMeta = hoveredPoint.meta
          ? Object.entries(hoveredPoint.meta).find(([, value]) => value != null && value !== "")
          : null;
        return {
          kind: "static",
          title: hoveredPoint.name,
          detail:
            hoveredPoint.kind === "military-base"
              ? HOVER.militaryBase(lang)
              : staticKindLabel(hoveredPoint.kind, lang),
          meta:
            hoveredPoint.kind === "military-base"
              ? [
                  hoveredPoint.meta?.branch,
                  hoveredPoint.meta?.hostCountry || hoveredPoint.meta?.state,
                  hoveredPoint.meta?.hostCountry ? "USA" : hoveredPoint.meta?.country,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              : firstMeta
                ? `${firstMeta[0]}: ${firstMeta[1]}`
                : undefined,
        };
      }
      if (hoveredPoint.displayKind === "mil") {
        return {
          kind: "event",
          title: hoveredPoint.callsign || hoveredPoint.hex || "Military aircraft",
          detail: HOVER.milAircraft(lang),
          meta: [
            hoveredPoint.type,
            hoveredPoint.registration,
            hoveredPoint.altitude != null ? `${hoveredPoint.altitude} ft` : null,
            hoveredPoint.groundSpeed != null ? `${hoveredPoint.groundSpeed} kn` : null,
            hoveredPoint.squawk ? `SQK ${hoveredPoint.squawk}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          hint: HOVER.hintDetail(lang),
        };
      }
      if (hoveredPoint.displayKind === "ais") {
        const kind =
          hoveredPoint.category === "military"
            ? "군용 함정"
            : hoveredPoint.category === "commercial"
              ? "민간 선박"
              : "선박";
        const typeLabel = aisDisplayTypeLabel(hoveredPoint, lang);
        return {
          kind: "static",
          title: hoveredPoint.shipName || `MMSI ${hoveredPoint.mmsi}`,
          detail: `AIS · ${kind}`,
          meta: [
            typeLabel,
            hoveredPoint.speedOverGround != null ? `${hoveredPoint.speedOverGround} kn` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          hint: HOVER.hintDetail(lang),
        };
      }
      if (hoveredPoint.displayKind === "firms-fire") {
        const soundKind = hoveredPoint.soundKind;
        const acq =
          [hoveredPoint.acqDate, hoveredPoint.acqTime].filter(Boolean).join(" ") || null;
        return {
          kind: "static",
          title: firmsCauseTitle(soundKind, lang),
          detail: firmsCauseBody(soundKind, lang),
          badge: `NASA FIRMS · ${firmsFireSoundLabel(soundKind, lang)}`,
          meta: [
            hoveredPoint.frp != null ? `FRP ${hoveredPoint.frp} MW` : null,
            hoveredPoint.confidence ? `신뢰도 ${hoveredPoint.confidence}` : null,
            hoveredPoint.satellite ? `위성 ${hoveredPoint.satellite}` : null,
            hoveredPoint.daynight === "N"
              ? lang === "en"
                ? "Night"
                : "야간"
              : hoveredPoint.daynight === "D"
                ? lang === "en"
                  ? "Day"
                  : "주간"
                : null,
            acq,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          hint: firmsCauseHint(soundKind, lang),
        };
      }
      if (hoveredPoint.displayKind === "conflict-cluster") {
        return {
          kind: "polygon",
          title: hoveredPoint.name,
          detail: HOVER.aiWarZone(tensionLabel(hoveredPoint.tension, lang), lang),
          meta: HOVER.countSuffix(hoveredPoint.eventCount, lang),
          hint: HOVER.hintDetail(lang),
        };
      }
      if (hoveredPoint.displayKind === "tzeva-adom") {
        return {
          kind: "event",
          title: translateOrefTitle(hoveredPoint.title || hoveredPoint.region, labelLanguage),
          detail: tzevaUi("brand", labelLanguage),
          meta: hoveredPoint.active ? HOVER.active(lang) : hoveredPoint.alertDate,
        };
      }
      if (hoveredPoint.displayKind === "newfeeds-attack") {
        const sev = hoveredPoint.severity;
        return {
          kind: "event",
          badge: severityLabel(sev, lang),
          title: hoveredPoint.title,
          detail: [
            severityHint(sev, lang),
            hoveredPoint.category,
            hoveredPoint.location,
            hoveredPoint.hapiTag
              ? lang === "en"
                ? `HAPI · ${hoveredPoint.hapiTag}`
                : `HAPI · ${hoveredPoint.hapiTag}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          body: hoveredPoint.summary?.trim() || undefined,
          meta: `${hoveredPoint.sourceName} · ${NEWFEEDS_ATTRIBUTION_SHORT}`,
          hint: lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동",
        };
      }
      if (hoveredPoint.displayKind === "china-theater-incident") {
        const dyad = CHINA_THEATER_DYAD_LABEL[hoveredPoint.dyad][lang];
        const sea = CHINA_THEATER_SEA_LABEL[hoveredPoint.sea][lang];
        return {
          kind: "event",
          badge: dyad,
          title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
          detail: sea,
          body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
          meta: "IRONSIGHT dens · SCS / ECS / WestPac",
          hint: lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동",
        };
      }
      if (hoveredPoint.displayKind === "korea-missile-incident") {
        const kind = KOREA_MISSILE_KIND_LABEL[hoveredPoint.kind][lang];
        const anchor = KOREA_MISSILE_ANCHOR_LABEL[hoveredPoint.anchor][lang];
        return {
          kind: "event",
          badge: kind,
          title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
          detail: anchor,
          body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
          meta:
            lang === "en"
              ? "DPRK launch / event dens (no confirmed splash)"
              : "북한 발사·실험 발생지 (탄착 미확정)",
          hint: lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동",
        };
      }
      if (hoveredPoint.displayKind === "casualty-skull") {
        const place = hoveredPoint.admin1Name || hoveredPoint.id;
        return {
          kind: "static",
          title: lang === "en" ? `Active front · ${place}` : `열린 전선 · ${place}`,
          detail: HAPI_ATTRIBUTION,
          body: hoveredPoint.sourceHint,
          meta: HAPI_SOURCE_LINE,
          hint: lang === "en" ? `Cite ACLED · ${ACLED_HOME_URL}` : `출처 ACLED · ${ACLED_HOME_URL}`,
        };
      }
      if (hoveredPoint.displayKind === "ukraine-gdelt-neon") {
        return {
          kind: "event",
          badge: gdeltNewsAlertLabel(lang),
          title: hoveredPoint.title || hoveredPoint.category || HOVER.gdeltNews(lang),
          detail: [
            gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
            hoveredPoint.hapiTag ? `HAPI · ${hoveredPoint.hapiTag}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" · ") || undefined,
          hint: HOVER.hintView(lang),
        };
      }
      if (hoveredPoint.displayKind === "gdelt-tag-html") {
        return {
          kind: "event",
          badge: gdeltNewsAlertLabel(lang),
          title: hoveredPoint.title || hoveredPoint.category || HOVER.gdeltNews(lang),
          detail: gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
          meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" · ") || undefined,
          hint: HOVER.hintView(lang),
        };
      }

      return {
        kind: "event",
        badge: gdeltNewsAlertLabel(lang),
        title: hoveredPoint.title || `Event ${hoveredPoint.globalEventId}`,
        detail: `${eventTierLabel(hoveredPoint.eventTier, lang)}${
          isFreshEvent(hoveredPoint) ? HOVER.freshBreaking(lang) : ""
        }`,
        meta: hoveredPoint.country || hoveredPoint.category,
      };
    }

    if (hoveredPolygon) {
      if (hoveredPolygon.polygonLayer === "country") {
        return {
          kind: "polygon",
          title: hoveredPolygon.name,
          detail: hoveredPolygon.nameLong || HOVER.country(lang),
          meta: [hoveredPolygon.isoA3, hoveredPolygon.continent].filter(Boolean).join(" · ") || undefined,
        };
      }
      if (hoveredPolygon.polygonLayer === "military-base") {
        return {
          kind: "polygon",
          title: hoveredPolygon.name,
          detail: HOVER.militaryBase(lang),
          meta: [hoveredPolygon.component, hoveredPolygon.state, hoveredPolygon.country]
            .filter(Boolean)
            .join(" · ") || undefined,
        };
      }
      if (hoveredPolygon.polygonLayer === "conflict-zone") {
        return {
          kind: "polygon",
          title: hoveredPolygon.name,
          detail: HOVER.aiWarZone(tensionLabel(hoveredPolygon.tension, lang), lang),
          meta: HOVER.countSuffix(hoveredPolygon.eventCount, lang),
        };
      }
      if (isUkraineViinaPolygonLayer(hoveredPolygon.polygonLayer)) {
        const status =
          hoveredPolygon.polygonLayer === "ukraine-ru"
            ? HOVER.uaRu(lang)
            : hoveredPolygon.polygonLayer === "ukraine-ua"
              ? HOVER.uaUa(lang)
              : HOVER.uaContested(lang);
        return {
          kind: "polygon",
          title: hoveredPolygon.name || status,
          detail: HOVER.ukraineFront(status, lang),
          meta: hoveredPolygon.adm1 || hoveredPolygon.nameLong || undefined,
          hint: HOVER.hintView(lang),
        };
      }
    }

    if (hoveredPath) {
      const dispute =
        hoveredPath.kind === "dispute-zone" || hoveredPath.kind === "dispute-hatch"
          ? disputeFromPath(hoveredPath)
          : undefined;
      if (dispute) {
        const overview = disputeOverviews.get(dispute.id);
        const overviewText = overview?.overviewKo
          ? truncateOverview(overview.overviewKo)
          : dispute.note || undefined;
        return {
          kind: "path",
          title: dispute.name,
          detail: HOVER.disputeBorder(
            hatchStyleLabelLocalized(getDisputeHatchStyle(dispute), lang, Boolean(dispute && isCombatHazard(dispute))),
            lang,
          ),
          body: overviewText,
          meta: `${isCombatHazard(dispute) ? HOVER.combatPrefix(lang) : ""}${HOVER.tensionPrefix(
            tensionLabel(dispute.tension, lang),
            lang,
          )}${
            dispute.categories.length ? ` · ${dispute.categories.map((category) => disputeCategoryLabel(category, lang)).join(" · ")}` : ""
          }${overview?.parties?.length ? ` · ${overview.parties.join(" · ")}` : ""}`,
          hint: HOVER.hintDetail(lang),
        };
      }
      const detail = pathKindLabel(hoveredPath.kind, lang);
      const distanceMeta =
        hoveredPath.lengthKm && Number.isFinite(hoveredPath.lengthKm)
          ? HOVER.pathLength(hoveredPath.lengthKm.toLocaleString(), lang)
          : undefined;
      if (
        hoveredPath.kind === "neptun-trail" ||
        hoveredPath.kind === "neptun-projection" ||
        hoveredPath.kind === "neptun-trail-archived"
      ) {
        return {
          kind: "path",
          title: hoveredPath.name || detail,
          detail,
          meta: distanceMeta,
          body:
            hoveredPath.kind === "neptun-projection"
              ? HOVER.neptunProjection(lang)
              : HOVER.neptunTrailBody(lang),
        };
      }
      return {
        kind: "path",
        title: hoveredPath.name || detail,
        detail,
        meta: distanceMeta,
      };
    }

    if (hoverGlobeCoords) {
      const ocean = lookupOceanName(
        hoverGlobeCoords.lat,
        hoverGlobeCoords.lng,
        labelLanguage,
      );
      return {
        kind: "ocean",
        title: ocean.title,
        detail: ocean.detail,
      };
    }

    return {
      kind: "ocean",
      title: HOVER.ocean(lang),
      detail: HOVER.oceanDetail(lang),
    };
  }, [
    disputeFromPath,
    disputeOverviews,
    hoveredCarrier,
    hoveredMilAircraft,
    civAircraft,
    hoverGlobeCoords,
    hoveredNeptunThreat,
    hoveredPath,
    hoveredPoint,
    hoveredPolygon,
    labelLanguage,
  ]);

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
      const aisClass = isEconomyViewer ? "commercial" : "military";
      const response = await fetch(
        `/api/ais?seconds=8&max=${max}&class=${aisClass}&provider=auto`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        vessels?: AisVessel[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `AIS 요청 실패: ${response.status}`);
      }

      setAisVessels((payload.vessels || []).slice(0, max));
    } catch (error) {
      setAisError(error instanceof Error ? error.message : "AIS 로드 실패");
    } finally {
      setAisLoading(false);
    }
  }, [isEconomyViewer]);

  const refreshMilAircraft = useCallback(async () => {
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

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `ADS-B mil 요청 실패: ${response.status}`);
      }

      setMilAircraft((payload.aircraft || []).slice(0, max));
    } catch (error) {
      setMilError(error instanceof Error ? error.message : "ADS-B mil 로드 실패");
    } finally {
      setMilLoading(false);
    }
  }, []);

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

      if (!response.ok || payload.error) {
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

  const refreshCyberEvents = useCallback(async () => {
    if (isClientApiStubMode()) {
      setCyberEvents([]);
      return;
    }
    try {
      const response = await fetch("/api/gdelt?theme=cyber", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `사이버 이벤트 요청 실패: ${response.status}`);
      }
      setCyberEvents(payload.events || []);
    } catch {
      setCyberEvents([]);
    }
  }, []);

  const refreshElectionEvents = useCallback(async () => {
    if (isClientApiStubMode()) {
      setElectionEvents([]);
      return;
    }
    try {
      const response = await fetch("/api/gdelt?theme=election", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `선거 이벤트 요청 실패: ${response.status}`);
      }
      setElectionEvents(payload.events || []);
    } catch {
      setElectionEvents([]);
    }
  }, []);

  const refreshGdeltEvents = useCallback(async () => {
    if (!viewerChromePreset.fetchGdelt || !shouldFetchGdeltFeed) {
      setGdeltLoading(false);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setGdeltLoading(true);
    setGdeltError(null);
    try {
      let response: Response;
      if (isClientApiStubMode()) {
        response = await fetch(dataPath("gdelt-events.json"), { cache: "no-store" });
      } else {
        response = await fetch("/api/gdelt", { cache: "no-store" });
        if (!response.ok) {
          response = await fetch(dataPath("gdelt-events.json"), { cache: "no-store" });
        }
      }
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        fetchedAt?: string;
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `GDELT 요청 실패: ${response.status}`);
      }
      const next = payload.events || [];
      // 빈 성공 응답으로 기존 핀을 지우지 않음 — 폴링 공백·캐시 미스를 견딤
      if (next.length > 0) {
        setGdeltEvents(next);
        setGdeltFetchedAt(payload.fetchedAt || new Date().toISOString());
      } else if (payload.fetchedAt) {
        setGdeltFetchedAt(payload.fetchedAt);
      }
    } catch (error) {
      setGdeltError(error instanceof Error ? error.message : "GDELT 로드 실패");
      // 마지막 성공 스냅샷 유지 — 빈 배열로 지우지 않음
    } finally {
      setGdeltLoading(false);
    }
  }, [shouldFetchGdeltFeed, viewerChromePreset.fetchGdelt]);

  const refreshFirmsFires = useCallback(async () => {
    if (!showFirmsFires) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    if (firmsFetchBusyRef.current) return;
    firmsFetchBusyRef.current = true;
    setFirmsLoading(true);
    setFirmsError(null);

    try {
      const lod = getGlobeLod(layerAltitude);
      const radiusDeg = VIEWPORT_RADIUS_BY_TIER[lod.tier];
      const bbox = viewToBbox(layerViewState, radiusDeg);
      const maxParam = firmsLiveFetchMax(lod.tier);
      const params = new URLSearchParams({
        west: String(bbox.west),
        south: String(bbox.south),
        east: String(bbox.east),
        north: String(bbox.north),
        days: lod.tier === "near" || lod.tier === "village" ? "2" : "1",
        max: String(maxParam),
      });
      const response = await fetch(`/api/firms-fires?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        fires?: FirmsFire[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `FIRMS 요청 실패: ${response.status}`);
      }

      const fires = filterFirmsToTheaters(payload.fires || []).slice(0, maxParam);
      startTransition(() => {
        setFirmsFires(fires);
      });
    } catch (error) {
      setFirmsError(error instanceof Error ? error.message : "FIRMS 로드 실패");
      // 실패 시 빈 배열로 지우지 않음 — 재시도 루프/깜빡임 방지
    } finally {
      firmsFetchBusyRef.current = false;
      setFirmsLoading(false);
    }
  }, [layerAltitude, layerViewState, showFirmsFires]);

  useEffect(() => {
    if (!showAis) return;
    void refreshAis();
    const timer = window.setInterval(() => {
      void refreshAis();
    }, liveAisPollMs());
    return () => window.clearInterval(timer);
  }, [refreshAis, showAis]);

  useEffect(() => {
    if (!showMilitaryActivity) return;
    void refreshMilAircraft();
    const timer = window.setInterval(() => {
      void refreshMilAircraft();
    }, liveMilPollMs());
    return () => window.clearInterval(timer);
  }, [refreshMilAircraft, showMilitaryActivity]);

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

  useEffect(() => {
    if (!showCyberIncidents) return;
    void refreshCyberEvents();
  }, [refreshCyberEvents, showCyberIncidents]);

  useEffect(() => {
    if (!showElectionEvents) return;
    void refreshElectionEvents();
  }, [refreshElectionEvents, showElectionEvents]);

  useEffect(() => {
    if (!shouldFetchGdeltFeed || !globeReady) {
      // 레이어가 캡·토글로 잠깐 꺼져도 스냅샷은 유지 (다시 켜면 바로 표시)
      return;
    }
    const cancel = runWhenIdle(() => {
      void refreshGdeltEvents();
    });
    return cancel;
  }, [globeReady, refreshGdeltEvents, shouldFetchGdeltFeed]);

  useEffect(() => {
    if (!shouldFetchGdeltFeed || !globeReady) return;
    const timer = window.setInterval(() => {
      void refreshGdeltEvents();
    }, liveGdeltPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, refreshGdeltEvents, shouldFetchGdeltFeed]);

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
      const res = await fetch("/api/telegram-alerts/sync", { method: "POST" });
      if (!res.ok) throw new Error(`sync HTTP ${res.status}`);
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

  /** 이스라엘 공습경보 레이어 ON일 때만 폴링 (배너·마커 공통) */
  useEffect(() => {
    if (!showTzevaAdom) {
      setTzevaAdomActive([]);
      setTzevaAdomHistory([]);
      setTzevaAdomLive(false);
      setTzevaAdomGeoRestricted(false);
      setTzevaAdomError(null);
      setTzevaAdomStatus("idle");
      return;
    }
    void refreshTzevaAdom();
    const pollMs = liveTzevaPollMs();
    const timer = window.setInterval(() => {
      void refreshTzevaAdom();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [refreshTzevaAdom, showTzevaAdom]);

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

  /** NewFeeds 이란 지도 공격 — 레이어 ON일 때만 폴링 (국영뉴스는 하단 뉴스 스트림) */
  useEffect(() => {
    if (!showNewfeedsIranAttacks) {
      setNewfeedsAttacks([]);
      setNewfeedsThreatLabel(null);
      setNewfeedsLive(false);
      setNewfeedsError(null);
      setNewfeedsStatus("idle");
      return;
    }
    void refreshNewfeedsIran();
    const timer = window.setInterval(() => {
      void refreshNewfeedsIran();
    }, liveNewfeedsPollMs());
    return () => window.clearInterval(timer);
  }, [refreshNewfeedsIran, showNewfeedsIranAttacks]);

  useEffect(() => {
    if (!showFirmsFires) {
      setFirmsFires([]);
      firmsBboxRef.current = "";
      return;
    }
    void refreshFirmsFires();
  }, [refreshFirmsFires, showFirmsFires]);

  useEffect(() => {
    if (!showFirmsFires || (isCameraMoving && Date.now() >= immediateUntilRef.current)) return;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const bbox = viewToBbox(layerViewState, radiusDeg);
    const signature = `${bbox.west.toFixed(1)},${bbox.south.toFixed(1)},${bbox.east.toFixed(1)},${bbox.north.toFixed(1)}:${globeLod.tier}`;
    if (signature === firmsBboxRef.current) return;
    firmsBboxRef.current = signature;
    void refreshFirmsFires();
  }, [applyGeneration, globeLod.tier, immediateUntilRef, isCameraMoving, layerViewState, refreshFirmsFires, showFirmsFires]);

  useEffect(() => {
    if (!showFirmsFires) return;
    const timer = window.setInterval(() => {
      void refreshFirmsFires();
    }, liveFirmsPollMs());
    return () => window.clearInterval(timer);
  }, [refreshFirmsFires, showFirmsFires]);

  const layerPanelActive = showLeftPanel;
  /** 패널 닫힘 시 deps 고정 — GDELT·카메라 등과 layerCategories 재계산 분리 */
  const lpg = <T,>(active: T, idle: T): T => (layerPanelActive ? active : idle);

  const layerPanelGdeltCounts = useMemo(
    () => ({
      war: gdeltTensionTags.filter((e) => e.eventTier === "war").length,
      diplomatic: gdeltTensionTags.filter((e) => e.eventTier === "diplomatic").length,
      alliance: gdeltTierPins.filter((e) => e.eventTier === "alliance").length,
      protest: gdeltTensionTags.filter((e) => e.eventTier === "protest").length,
    }),
    [gdeltTensionTags, gdeltTierPins],
  );

  const layerCategories = useMemo<LayerCategory[]>(() => {
    if (!showLeftPanel || !layerPanelReady) {
      return EMPTY_LAYER_CATEGORIES;
    }
    if (categorySnapshotRef.current !== null) {
      return categorySnapshotRef.current;
    }
    const off = (count?: number) =>
      count && count > 0 ? `${count.toLocaleString()}곳 · 꺼짐` : "꺼짐";
    const zoom = globeLod.label;

    const allCategories: LayerCategory[] = [
      {
        id: "map",
        title: "지도 · 지명",
        hint: "도시명 · 철도 (국경선·해안선은 항상 표시)",
        items: [
          {
            id: "city-labels",
            label: "도시명",
            detail: showCityLabels
              ? `${labelPlaces.length.toLocaleString()}개 · 주요 도시 · WebGL · ${zoom}`
              : "꺼짐",
            checked: layerPrefs.showCityLabels,
            onChange: setShowCityLabels,
          },
          {
            id: "rail",
            label: "철도",
            detail: showRailGlow
              ? `노선 ${railPaths.length.toLocaleString()}개`
              : "꺼짐",
            checked: layerPrefs.showRailGlow,
            onChange: setShowRailGlow,
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showCityLabels: enabled,
            showRailGlow: enabled,
          }),
      },
      {
        id: "conflict",
        title: "분쟁 · 영토",
        hint: "전선 · 공중위협 · 대치 지점 · 긴장 구역 · 중동 · 뉴스",
        items: [
          {
            id: "ukraine",
            label: "우크라이나 전선·점령",
            detail:
              ukraineControlStatus === "loading"
                ? "불러오는 중…"
                : showUkraineControl &&
                    (ukraineMacroGeoJson.features.length > 0 ||
                      ukraineMicroGeoJson.features.length > 0)
                  ? `전선 구역 ${ukraineMacroGeoJson.features.length} · 상세 ${ukraineMicroGeoJson.features.length}`
                  : showUkraineControl
                    ? viinaMeta?.available
                      ? ukraineControlStatus === "ok"
                        ? "켜짐"
                        : "로드 실패"
                      : "데이터 빌드 필요"
                    : "꺼짐 · 점령·주장 경계",
            checked: layerPrefs.showUkraineControl,
            onChange: setShowUkraineControl,
            accent: "red",
          },
          {
            id: "neptun",
            label: "우크라이나 공중위협 (실시간)",
            detail: showNeptun
              ? !neptunFetchEnabled
                ? "우크라이나 근처로 이동 시 로드"
                : neptunRenderMode === "hidden"
                  ? `${globeLod.label} · 우크라이나 근처로 이동`
                  : neptunRenderMode === "flat"
                    ? `드론·미사일 ${visibleNeptunThreats.length.toLocaleString()}건 · 개요`
                    : neptunRenderMode === "low"
                      ? `실시간 ${visibleNeptunThreats.length.toLocaleString()}건 · 예상 항로 포함`
                      : neptunAlertCount > 0
                    ? `공습 경보 ${neptunAlertCount.toLocaleString()} · 추적 ${visibleNeptunThreats.length.toLocaleString()}건`
                    : neptunLive
                      ? `실시간 ${visibleNeptunThreats.length.toLocaleString()}건 · ${globeLod.label}`
                      : neptunStatus === "stub"
                        ? "데모 궤적"
                        : neptunStatus === "error"
                          ? "연결 오류"
                          : "연결 중"
              : "드론·순항·탄도 위치와 궤적 · 탄착 표시",
            checked: layerPrefs.showNeptun,
            onChange: setShowNeptun,
            accent: "orange",
          },
          {
            id: "east-asia-neon",
            label: "동아시아 대치·발사 지점",
            detail:
              [
                showChinaTaiwanIncidents && "대만",
                showChinaJapanIncidents && "일본",
                showChinaPhilippinesIncidents && "필리핀",
                showUsChinaIncidents && "미·중",
                showNorthKoreaMissileTests && "북한",
              ]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · 대치·발사 위치 (탄착은 미표시)",
            checked:
              showChinaTaiwanIncidents ||
              showChinaJapanIncidents ||
              showChinaPhilippinesIncidents ||
              showUsChinaIncidents ||
              showNorthKoreaMissileTests,
            onChange: (enabled) => {
              setShowChinaTaiwanIncidents(enabled);
              setShowChinaJapanIncidents(enabled);
              setShowChinaPhilippinesIncidents(enabled);
              setShowUsChinaIncidents(enabled);
              setShowNorthKoreaMissileTests(enabled);
            },
            accent: "red",
            presentation: "dropdown",
            options: [
              {
                id: "china-taiwan-incidents",
                label: "중국–대만 대치",
                detail: showChinaTaiwanIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "china-taiwan").length}곳`
                  : "꺼짐 · 대만해협·남중국해",
                checked: layerPrefs.showChinaTaiwanIncidents,
                onChange: setShowChinaTaiwanIncidents,
                accent: "red",
              },
              {
                id: "china-japan-incidents",
                label: "중국–일본 대치",
                detail: showChinaJapanIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "china-japan").length}곳`
                  : "꺼짐 · 동중국해·센카쿠",
                checked: layerPrefs.showChinaJapanIncidents,
                onChange: setShowChinaJapanIncidents,
                accent: "red",
              },
              {
                id: "china-philippines-incidents",
                label: "중국–필리핀 해상 충돌",
                detail: showChinaPhilippinesIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "china-philippines").length}곳`
                  : "꺼짐 · 남중국해",
                checked: layerPrefs.showChinaPhilippinesIncidents,
                onChange: setShowChinaPhilippinesIncidents,
                accent: "red",
              },
              {
                id: "us-china-incidents",
                label: "미국–중국 군사 마찰",
                detail: showUsChinaIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "us-china").length}곳`
                  : "꺼짐 · 서태평양",
                checked: layerPrefs.showUsChinaIncidents,
                onChange: setShowUsChinaIncidents,
                accent: "red",
              },
              {
                id: "nk-missile-tests",
                label: "북한 미사일·무기 시험",
                detail: showNorthKoreaMissileTests
                  ? `발사·시험지 ${koreaMissileIncidentMarkers.length}곳`
                  : "꺼짐 · 발사·실험 위치만",
                checked: layerPrefs.showNorthKoreaMissileTests,
                onChange: setShowNorthKoreaMissileTests,
                accent: "orange",
              },
            ],
          },
          {
            id: "war-zones",
            label: "전쟁·교전 구역",
            detail: showWarZones
              ? `구역 ${disputeZoneOutlineCount.toLocaleString()}곳 · 빨간 빗금`
              : "꺼짐 · 실전투·폭격급 긴장",
            checked: layerPrefs.showWarZones,
            onChange: setShowWarZones,
            accent: "red",
          },
          {
            id: "diplomatic-tension",
            label: "외교 긴장 구역",
            detail: showDiplomaticTension
              ? `구역 ${disputeZoneOutlineCount.toLocaleString()}곳 · 주황 빗금`
              : "꺼짐 · 외교·영토 긴장",
            checked: layerPrefs.showDiplomaticTension,
            onChange: setShowDiplomaticTension,
            accent: "orange",
          },
          {
            id: "east-asia-adiz",
            label: "방공식별구역 (ADIZ)",
            detail: showEastAsiaAdiz
              ? "한·일·대만·북한·중국 ADIZ"
              : "꺼짐 · 동아시아 방공 식별망",
            checked: layerPrefs.showEastAsiaAdiz,
            onChange: setShowEastAsiaAdiz,
            accent: "blue",
          },
          {
            id: "island-chains",
            label: "도련선 · 미군 방어선",
            detail: showIslandChains
              ? "중국 도련(적) · 미 전방/심도(청) · 대만 펄스"
              : "꺼짐 · 인도·태평양 전략선",
            checked: layerPrefs.showIslandChains,
            onChange: setShowIslandChains,
            accent: "red",
          },
          {
            id: "newfeeds-iran",
            label: "이란·중동 공격 소식",
            detail: showNewfeedsIranAttacks
              ? newfeedsStatus === "loading"
                ? "불러오는 중…"
                : newfeedsStatus === "error"
                  ? "피드 오류"
                  : newfeedsThreatLabel
                    ? `${newfeedsThreatLabel} · ${newfeedsAttacks.length}건`
                    : `공격 지점 ${newfeedsAttacks.length}건`
              : "꺼짐 · 중동 지역 보도 집계",
            checked: layerPrefs.showNewfeedsIranAttacks,
            onChange: setShowNewfeedsIranAttacks,
            accent: "orange",
          },
          {
            id: "tzeva-adom",
            label: "이스라엘 로켓·공습 경보",
            detail: showTzevaAdom
              ? tzevaAdomActive.length > 0
                ? `지금 경보 ${tzevaAdomActive.length.toLocaleString()}건`
                : tzevaAdomLive
                  ? `감시 중 · 이력 ${tzevaAdomHistory.length.toLocaleString()}건`
                  : tzevaAdomStatus === "geo-blocked"
                    ? "지역 제한"
                    : tzevaAdomHistory.length > 0
                      ? `이력 ${tzevaAdomHistory.length.toLocaleString()}건`
                      : "대기 중"
              : "꺼짐 · 이스라엘 민방위(Oref)",
            checked: layerPrefs.showTzevaAdom,
            onChange: setShowTzevaAdom,
            accent: "red",
          },
          {
            id: "axis-network",
            label: "이란·중국·러시아·북한 관계망",
            detail: showAxisNetwork
              ? `연결 ${axisNetworkPaths.length.toLocaleString()} · 외교·군수·하이브리드`
              : "꺼짐 · 외교·군수 연계",
            checked: layerPrefs.showAxisNetwork,
            onChange: setShowAxisNetwork,
            accent: "emerald",
          },
          {
            id: "conflict-zones",
            label: "추정 전쟁지역 (데모)",
            detail: showConflictZones
              ? `${visibleConflictZones.length.toLocaleString()}곳 · ${zoom}`
              : "꺼짐 · 참고용 휴리스틱",
            checked: layerPrefs.showConflictZones,
            onChange: setShowConflictZones,
            accent: "red",
          },
          {
            id: "arms-embargo",
            label: "무기 금수 국가",
            detail: showArmsEmbargo
              ? `구역 ${armsEmbargoFramePaths.length.toLocaleString()}곳`
              : "꺼짐 · 유엔 등 금수",
            checked: layerPrefs.showArmsEmbargo,
            onChange: setShowArmsEmbargo,
            accent: "fuchsia",
          },
          {
            id: "ucdp",
            label: "분쟁 사건 기록",
            detail: showUcdpEvents
              ? `세계 분쟁·전쟁 기록 · ${UCDP_ATTRIBUTION_SHORT}`
              : "꺼짐 · UCDP 세계 분쟁 DB",
            checked: layerPrefs.showUcdpEvents,
            onChange: setShowUcdpEvents,
            accent: "red",
          },
          {
            id: "gdelt-war",
            label: "뉴스 · 전투·충돌",
            detail: showGdeltWar
              ? gdeltLoading
                ? "불러오는 중…"
                : ukraineGdeltNeonMarkers.length > 0
                  ? `${layerPanelGdeltCounts.war.toLocaleString()}건 · 우크라 ${ukraineGdeltNeonMarkers.length}`
                  : `${layerPanelGdeltCounts.war.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltWar,
            onChange: setShowGdeltWar,
            accent: "cyan",
            presentation: "tag",
          },
          {
            id: "gdelt-diplomatic",
            label: "뉴스 · 외교 긴장",
            detail: showGdeltDiplomatic
              ? gdeltLoading
                ? "불러오는 중…"
                : `${layerPanelGdeltCounts.diplomatic.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltDiplomatic,
            onChange: setShowGdeltDiplomatic,
            accent: "orange",
            presentation: "tag",
          },
          {
            id: "gdelt-ocean",
            label: "뉴스 · 대양 경쟁",
            detail: showGdeltOceanCompetition
              ? gdeltLoading
                ? "불러오는 중…"
                : "태평양 · 대서양 · 북극"
              : "꺼짐 · 대양 지정학",
            checked: layerPrefs.showGdeltOceanCompetition,
            onChange: setShowGdeltOceanCompetition,
            accent: "blue",
            presentation: "tag",
          },
          {
            id: "gdelt-alliance",
            label: "뉴스 · 동맹 갈등",
            detail: showGdeltAlliance
              ? `${layerPanelGdeltCounts.alliance.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltAlliance,
            onChange: setShowGdeltAlliance,
            accent: "emerald",
          },
          {
            id: "gdelt-protest",
            label: "뉴스 · 시위",
            detail: showGdeltProtests
              ? `${layerPanelGdeltCounts.protest.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltProtests,
            onChange: setShowGdeltProtests,
            accent: "blue",
            presentation: "tag",
          },
          {
            id: "telegram-osint",
            label: "텔레그램 전장 소식",
            detail: showTelegramOsint
              ? telegramStatus === "loading"
                ? `불러오는 중 · ${TELEGRAM_CHANNEL_COUNT}채널`
                : telegramLive
                  ? `소식 ${telegramAlerts.length.toLocaleString()}건`
                  : telegramStatus === "waiting"
                    ? telegramEmbedMode
                      ? "연결 대기"
                      : "수집기 필요"
                    : telegramAlerts.length > 0
                      ? `${telegramAlerts.length.toLocaleString()}건`
                      : telegramEmbedMode
                        ? `공개 ${TELEGRAM_CHANNEL_COUNT}채널`
                        : "대기 중"
              : "꺼짐 · 공개 채널",
            checked: layerPrefs.showTelegramOsint,
            onChange: setShowTelegramOsint,
            accent: "blue",
          },
        ],
        footer: (
          <>
            {showUkraineControl ? (
              <div className="mb-2 rounded-lg border border-red-300/15 bg-red-950/20 px-2.5 py-2.5">
                <UkraineFrontLegendContent
                  compact
                  controlDate={ukraineControlDate}
                  lodLabel={
                    viinaDisplay.lod.mode === "hidden"
                      ? "줌인 필요"
                      : viinaDisplay.lod.mode === "overview"
                        ? "개요"
                        : "상세"
                  }
                />
              </div>
            ) : null}
            {showGdeltLayers ? (
              <>
                <button
                  type="button"
                  onClick={() => startTransition(() => void refreshGdeltEvents())}
                  disabled={gdeltLoading}
                  className="w-full rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs text-orange-100 transition hover:border-orange-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {gdeltLoading ? "뉴스 불러오는 중…" : "뉴스 새로고침"}
                </button>
                {gdeltError ? <p className="mt-2 text-xs leading-5 text-red-200">{gdeltError}</p> : null}
                {gdeltFetchedAt ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    뉴스 갱신: {formatDateTime(gdeltFetchedAt)}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ),
        onToggleAll: (enabled) => {
          setShowDisputeLegendPanel(enabled);
          toggleCategoryPrefs({
            showUkraineControl: enabled,
            showNeptun: enabled,
            showWarZones: enabled,
            showDiplomaticTension: enabled,
            showEastAsiaAdiz: enabled,
            showIslandChains: enabled,
            showChinaTaiwanIncidents: enabled,
            showChinaJapanIncidents: enabled,
            showChinaPhilippinesIncidents: enabled,
            showUsChinaIncidents: enabled,
            showNorthKoreaMissileTests: enabled,
            showNewfeedsIranAttacks: enabled,
            showTzevaAdom: enabled,
            showAxisNetwork: enabled,
            showConflictZones: enabled,
            showArmsEmbargo: enabled,
            showUcdpEvents: enabled,
            showGdeltWar: enabled,
            showGdeltDiplomatic: enabled,
            showGdeltAlliance: enabled,
            showGdeltProtests: enabled,
            showNeptunPreviousTrails: false,
          });
        },
      },
      {
        id: "energy",
        title: "에너지·자원",
        hint: "원유·가스 수송 · 발전·채굴 · 광물",
        items: [
          {
            id: "energy-pipelines",
            label: "원유·가스 수송망",
            detail:
              [
                showOilPipelines && "송유관",
                showGasPipelines && "가스관",
                showLngTerminals && "LNG",
              ]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · 파이프라인·터미널",
            checked: showOilPipelines || showGasPipelines || showLngTerminals,
            onChange: (enabled) => {
              setShowOilPipelines(enabled);
              setShowGasPipelines(enabled);
              setShowLngTerminals(enabled);
            },
            accent: "orange",
            presentation: "dropdown",
            options: [
              {
                id: "oil-pipelines",
                label: "송유관",
                detail: showOilPipelines
                  ? `${visibleOilPipelines.length.toLocaleString()}개`
                  : off(staticCounts.oilPipelines),
                checked: layerPrefs.showOilPipelines,
                onChange: setShowOilPipelines,
                accent: "orange",
              },
              {
                id: "gas-pipelines",
                label: "가스관",
                detail: showGasPipelines
                  ? `${visibleGasPipelines.length.toLocaleString()}개`
                  : off(staticCounts.gasPipelines),
                checked: layerPrefs.showGasPipelines,
                onChange: setShowGasPipelines,
                accent: "green",
              },
              {
                id: "lng-terminals",
                label: "LNG(액화가스) 터미널",
                detail: showLngTerminals
                  ? `${visibleStaticPoints.filter((p) => p.kind === "lng-terminal").length.toLocaleString()}곳`
                  : off(staticCounts.lngTerminals),
                checked: layerPrefs.showLngTerminals,
                onChange: setShowLngTerminals,
                accent: "orange",
              },
            ],
          },
          {
            id: "gem-resources",
            label: "발전·채굴·산업 시설",
            detail: (() => {
              const on = GEM_RESOURCE_LAYERS.filter((l) => Boolean(layerPrefs[l.prefKey])).length;
              return on > 0
                ? `${on}/${GEM_RESOURCE_LAYERS.length} 켜짐 · GEM`
                : "꺼짐 · 석탄·재생·석유가스·산업 (GEM)";
            })(),
            checked: GEM_RESOURCE_LAYERS.some((l) => Boolean(layerPrefs[l.prefKey])),
            onChange: (enabled) => {
              for (const layer of GEM_RESOURCE_LAYERS) {
                togglePref(layer.prefKey, enabled);
              }
            },
            accent: "amber",
            presentation: "dropdown",
            options: GEM_RESOURCE_GROUPS.map((group) => {
              const layers = group.layerIds
                .map((id) => gemLayerById(id))
                .filter((l): l is NonNullable<typeof l> => Boolean(l));
              const onCount = layers.filter((l) => Boolean(layerPrefs[l.prefKey])).length;
              return {
                id: group.id,
                label: group.labelKo,
                detail:
                  onCount > 0
                    ? `${onCount}/${layers.length} 켜짐`
                    : `꺼짐 · ${layers.map((l) => l.labelKo).join(" · ")}`,
                checked: onCount > 0,
                onChange: (enabled: boolean) => {
                  for (const layer of layers) togglePref(layer.prefKey, enabled);
                },
                accent: "orange" as const,
                presentation: "dropdown" as const,
                options: layers.map((layer) => {
                  const checked = Boolean(layerPrefs[layer.prefKey]);
                  const total = staticCounts.gemResources?.[layer.id] ?? 0;
                  const visible = visibleStaticPoints.filter((p) => p.kind === layer.kind).length;
                  return {
                    id: layer.id,
                    label: layer.labelKo,
                    detail: checked ? `${visible.toLocaleString()}곳` : off(total),
                    checked,
                    onChange: (v: boolean) => togglePref(layer.prefKey, v),
                    accent: "orange" as const,
                  };
                }),
              };
            }),
          },
          {
            id: "energy-other",
            label: "광물 매장지·원자력 시설",
            detail:
              [showResources && "광물", showNuclearSites && "원자력"]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · 매장지·원전·연구시설",
            checked: showResources || showNuclearSites,
            onChange: (enabled) => {
              setShowResources(enabled);
              setShowNuclearSites(enabled);
            },
            accent: "orange",
            presentation: "dropdown",
            options: [
              {
                id: "resources",
                label: "광물·자원 매장지",
                detail: showResources ? "광물·자원 매장지" : off(staticCounts.resources),
                checked: layerPrefs.showResources,
                onChange: setShowResources,
                accent: "orange",
              },
              {
                id: "nuclear",
                label: "원자력 시설",
                detail: showNuclearSites ? "발전소·연구시설" : "꺼짐",
                checked: layerPrefs.showNuclearSites,
                onChange: setShowNuclearSites,
                accent: "orange",
              },
            ],
          },
          {
            id: "newfeeds-iran",
            label: "이란·중동 공격 소식",
            detail: showNewfeedsIranAttacks
              ? newfeedsStatus === "loading"
                ? "불러오는 중…"
                : newfeedsStatus === "error"
                  ? "피드 오류"
                  : newfeedsThreatLabel
                    ? `${newfeedsThreatLabel} · ${newfeedsAttacks.length}건`
                    : `공격 지점 ${newfeedsAttacks.length}건 · 유가 민감`
              : "꺼짐 · 유가 민감 · 중동 보도 집계",
            checked: layerPrefs.showNewfeedsIranAttacks,
            onChange: setShowNewfeedsIranAttacks,
            accent: "orange",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showOilPipelines: enabled,
            showGasPipelines: enabled,
            showLngTerminals: enabled,
            showGemCoalPlants: enabled,
            showGemCoalMines: enabled,
            showGemCoalTerminals: enabled,
            showGemNuclear: enabled,
            showGemSolar: enabled,
            showGemWind: enabled,
            showGemHydro: enabled,
            showGemGeothermal: enabled,
            showGemBioenergy: enabled,
            showGemOilGasPlants: enabled,
            showGemOilGasExtraction: enabled,
            showGemIronOre: enabled,
            showGemCement: enabled,
            showGemSteel: enabled,
            showGemChemicals: enabled,
            showResources: enabled,
            showNuclearSites: enabled,
            showNewfeedsIranAttacks: enabled,
          }),
      },
      {
        id: "transport",
        title: "운송 · 통신",
        hint: "항로 · 해저 케이블 · 공항·항구 · 요충지",
        items: [
          {
            id: "shipping",
            label: "해상 항로",
            detail: showShippingLanes
              ? `${visibleShipping.length.toLocaleString()}개 · ${zoom}`
              : off(staticCounts.shipping),
            checked: layerPrefs.showShippingLanes,
            onChange: setShowShippingLanes,
            accent: "blue",
          },
          ...(isEconomyViewer
            ? ([
                {
                  id: "us-dfc-supply",
                  label: "미국 DFC 개발금융망",
                  detail: showUsDfcSupplyChain
                    ? `호 ${usDfcSupplyPaths.length.toLocaleString()} · DFC Active Projects`
                    : "꺼짐 · 미국 개발금융 투자 대상국",
                  checked: layerPrefs.showUsDfcSupplyChain,
                  onChange: setShowUsDfcSupplyChain,
                  accent: "blue",
                },
                {
                  id: "bri-trade",
                  label: "일대일로 무역 연결",
                  detail: showBriTradeConnectivity
                    ? `호 ${briTradePaths.length.toLocaleString()} · World Bank BRI`
                    : "꺼짐 · 중국→참여국 운송시간 절감",
                  checked: layerPrefs.showBriTradeConnectivity,
                  onChange: setShowBriTradeConnectivity,
                  accent: "amber",
                },
              ] satisfies LayerToggleItem[])
            : []),
          {
            id: "cables",
            label: "해저 케이블",
            detail: showSubmarineCables
              ? `${visibleCables.length.toLocaleString()}개 · ${zoom}`
              : off(staticCounts.cables),
            checked: layerPrefs.showSubmarineCables,
            onChange: setShowSubmarineCables,
            accent: "blue",
          },
          {
            id: "tunnels",
            label: "해저터널",
            detail: showSubmarineTunnels
              ? `${visibleStaticPoints.filter((p) => p.kind === "submarine-tunnel").length.toLocaleString()}곳`
              : "꺼짐",
            checked: layerPrefs.showSubmarineTunnels,
            onChange: setShowSubmarineTunnels,
            accent: "blue",
          },
          {
            id: "airports",
            label: "공항",
            detail: showAirports
              ? `${visibleStaticPoints.filter((p) => p.kind === "airport").length.toLocaleString()}곳 · ${zoom}`
              : off(staticCounts.airports),
            checked: layerPrefs.showAirports,
            onChange: setShowAirports,
          },
          {
            id: "ports",
            label: "항구",
            detail: showPorts
              ? `${visibleStaticPoints.filter((p) => p.kind === "port").length.toLocaleString()}곳 · ${zoom}`
              : off(staticCounts.ports),
            checked: layerPrefs.showPorts,
            onChange: setShowPorts,
          },
          {
            id: "ixp",
            label: "인터넷 교환점",
            detail: showInternetExchanges ? "인터넷 거점" : "꺼짐",
            checked: layerPrefs.showInternetExchanges,
            onChange: setShowInternetExchanges,
            accent: "blue",
          },
          {
            id: "logistics-risk",
            label: "해상 요충·물류 거점",
            detail: showLogisticsRisk
              ? `${visibleStaticPoints.filter((p) => p.kind === "chokepoint" || p.kind === "logistics-hub").length.toLocaleString()}곳 · 해협·운하 등`
              : off(staticCounts.logisticsRisk),
            checked: layerPrefs.showLogisticsRisk,
            onChange: setShowLogisticsRisk,
            accent: "orange",
          },
          {
            id: "critical-nodes",
            label: "핵심 인프라 노드",
            detail: showCriticalNodes
              ? `${visibleStaticPoints.filter((p) => p.kind === "critical-node").length.toLocaleString()}곳 · 전략 인프라`
              : off(staticCounts.criticalNodes ?? 31),
            checked: layerPrefs.showCriticalNodes,
            onChange: setShowCriticalNodes,
            accent: "orange",
          },
          {
            id: "ais",
            label: isEconomyViewer ? "민간 선박 (AIS)" : "군용 함정 (AIS)",
            detail: showAis
              ? `${isEconomyViewer ? "민간" : "군용"} ${aisVessels.length.toLocaleString()}척`
              : "꺼짐",
            checked: layerPrefs.showAis,
            onChange: setShowAis,
            accent: "blue",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showShippingLanes: enabled,
            ...(isEconomyViewer
              ? {
                  showBriTradeConnectivity: enabled,
                  showUsDfcSupplyChain: enabled,
                }
              : {}),
            showSubmarineCables: enabled,
            showSubmarineTunnels: enabled,
            showAirports: enabled,
            showPorts: enabled,
            showInternetExchanges: enabled,
            showLogisticsRisk: enabled,
            showCriticalNodes: enabled,
            showAis: enabled,
          }),
      },
      {
        id: "military",
        title: "군사 · 안보",
        hint: "기지, 항공, 난민",
        items: [
          {
            id: "military-bases",
            label: "미군 기지",
            detail: showMilitaryBases
              ? `구역 ${visibleMilitaryBaseAreas.length.toLocaleString()} · 시설 ${
                  visibleStaticPoints.filter((p) => p.kind === "military-base").length
                }`
              : off(staticCounts.militaryBases),
            checked: layerPrefs.showMilitaryBases,
            onChange: setShowMilitaryBases,
            accent: "blue",
          },
          {
            id: "military-air",
            label: "군사 항공기",
            detail: showMilitaryActivity
              ? `비행기 ${milAircraft.length.toLocaleString()}대 · 실시간 항적`
              : "꺼짐",
            checked: layerPrefs.showMilitaryActivity,
            onChange: setShowMilitaryActivity,
            accent: "red",
          },
          {
            id: "intel",
            label: "정보 수집 거점",
            detail: showIntelHotspots ? "정찰·감시 거점" : "꺼짐",
            checked: layerPrefs.showIntelHotspots,
            onChange: setShowIntelHotspots,
            accent: "orange",
          },
          {
            id: "refugee",
            label: "난민 캠프",
            detail: showRefugeeCamps ? "난민 수용 시설" : "꺼짐",
            checked: layerPrefs.showRefugeeCamps,
            onChange: setShowRefugeeCamps,
            accent: "orange",
          },
        ],
        footer: (
          <>
            <button
              type="button"
              onClick={() => startTransition(() => void refreshMilAircraft())}
              disabled={milLoading || !showMilitaryActivity}
              className="w-full rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-xs text-red-100 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {milLoading ? "군사 항공기 불러오는 중…" : "군사 항공기 새로고침"}
            </button>
            {milError ? <p className="mt-2 text-xs leading-5 text-red-200">{milError}</p> : null}
          </>
        ),
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showMilitaryBases: enabled,
            showMilitaryActivity: enabled,
            showIntelHotspots: enabled,
            showRefugeeCamps: enabled,
          }),
      },
      {
        id: "live",
        title: "실시간 · 사건",
        hint: "화재, 사이버, 선거, 우주",
        items: [
          {
            id: "firms",
            label: "위성 화재 (NASA FIRMS)",
            detail: showFirmsFires
              ? `전장 열감지 ${visibleFirmsFires.length.toLocaleString()} · 폭격추정 ${firmsCombatFireIds.length.toLocaleString()}`
              : firmsError || "꺼짐 · 전장 권역만",
            checked: layerPrefs.showFirmsFires,
            onChange: setShowFirmsFires,
            accent: "orange",
          },
          {
            id: "cyber",
            label: "사이버 공격",
            detail: showCyberIncidents
              ? `${cyberEvents.length.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showCyberIncidents,
            onChange: setShowCyberIncidents,
            accent: "fuchsia",
          },
          {
            id: "election",
            label: "선거 사건",
            detail: showElectionEvents
              ? `${electionEvents.length.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showElectionEvents,
            onChange: setShowElectionEvents,
            accent: "blue",
          },
          {
            id: "space",
            label: "우주 발사",
            detail: showSpaceLaunches ? "로켓·위성 발사 기록" : "꺼짐",
            checked: layerPrefs.showSpaceLaunches,
            onChange: setShowSpaceLaunches,
            accent: "blue",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showFirmsFires: enabled,
            showCyberIncidents: enabled,
            showElectionEvents: enabled,
            showSpaceLaunches: enabled,
          }),
      },
      {
        id: "economy",
        title: "경제 · 제재",
        hint: "허브, 데이터센터, 제재",
        items: [
          {
            id: "air-traffic",
            label: "항공기 운항",
            detail: showAirTraffic
              ? `민항 ${civAircraft.length.toLocaleString()}대 · 군용 제외`
              : "꺼짐",
            checked: layerPrefs.showAirTraffic,
            onChange: setShowAirTraffic,
            accent: "blue",
          },
          {
            id: "economic",
            label: "경제 중심지",
            detail: showEconomicCenters ? "금융·무역 허브" : "꺼짐",
            checked: layerPrefs.showEconomicCenters,
            onChange: setShowEconomicCenters,
            accent: "emerald",
          },
          {
            id: "ai-dc",
            label: "AI 데이터센터",
            detail: showAiDataCenters ? "데이터센터 시설" : "꺼짐",
            checked: layerPrefs.showAiDataCenters,
            onChange: setShowAiDataCenters,
            accent: "blue",
          },
          {
            id: "sanctions",
            label: "제재 대상",
            detail: showSanctionsEntities ? "제재 국가·기업" : "꺼짐",
            checked: layerPrefs.showSanctionsEntities,
            onChange: setShowSanctionsEntities,
            accent: "fuchsia",
          },
        ],
        footer: (
          <>
            <button
              type="button"
              onClick={() => startTransition(() => void refreshCivAircraft())}
              disabled={civLoading || !showAirTraffic}
              className="w-full rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs text-sky-100 transition hover:border-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {civLoading ? "민간 항적 불러오는 중…" : "민간 항적 새로고침"}
            </button>
            {civError ? <p className="mt-2 text-xs leading-5 text-red-200">{civError}</p> : null}
          </>
        ),
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showAirTraffic: enabled,
            showEconomicCenters: enabled,
            showAiDataCenters: enabled,
            showSanctionsEntities: enabled,
          }),
      },
    ];
    const allowed = new Set(viewerChromePreset.layerCategoryIds);
    const filtered = allCategories.filter((cat) =>
      allowed.has(cat.id as (typeof viewerChromePreset.layerCategoryIds)[number]),
    );
    return filtered;
    /* eslint-disable react-hooks/exhaustive-deps -- lpg() freezes deps when panel closed; setShow* use togglePref */
  }, [
    layerPanelActive,
    layerPanelReady,
    lpg(layerPanelGdeltCounts.alliance, 0),
    lpg(layerPanelGdeltCounts.diplomatic, 0),
    lpg(layerPanelGdeltCounts.protest, 0),
    lpg(layerPanelGdeltCounts.war, 0),
    lpg(ukraineGdeltNeonMarkers.length, 0),
    lpg(aisVessels.length, 0),
    lpg(armsEmbargoFramePaths.length, 0),
    lpg(cyberEvents.length, 0),
    lpg(disputeZoneOutlineCount, 0),
    lpg(electionEvents.length, 0),
    lpg(firmsError, null),
    lpg(gdeltError, null),
    lpg(gdeltFetchedAt, null),
    lpg(gdeltLoading, false),
    lpg(refreshGdeltEvents, null),
    lpg(showGdeltAlliance, false),
    lpg(showGdeltDiplomatic, false),
    lpg(showGdeltOceanCompetition, false),
    lpg(showGdeltLayers, false),
    lpg(showGdeltProtests, false),
    lpg(showGdeltWar, false),
    lpg(labelPlaces.length, 0),
    lpg(globeLod.label, ""),
    lpg(milAircraft.length, 0),
    lpg(milError, null),
    lpg(milLoading, false),
    lpg(civAircraft.length, 0),
    lpg(civError, null),
    lpg(civLoading, false),
    lpg(showAirTraffic, false),
    lpg(railPaths.length, 0),
    lpg(refreshMilAircraft, null),
    lpg(refreshUsCarriers, null),
    lpg(showUsCarriers, false),
    lpg(usCarriers.length, 0),
    lpg(usCarriersLoading, false),
    lpg(showAis, false),
    lpg(showAiDataCenters, false),
    lpg(showArmsEmbargo, false),
    lpg(showCityLabels, false),
    lpg(showConflictZones, false),
    lpg(showCyberIncidents, false),
    lpg(showDiplomaticTension, false),
    lpg(showEastAsiaAdiz, false),
    lpg(showIslandChains, false),
    lpg(showChinaTaiwanIncidents, false),
    lpg(showChinaJapanIncidents, false),
    lpg(showChinaPhilippinesIncidents, false),
    lpg(showUsChinaIncidents, false),
    lpg(showNorthKoreaMissileTests, false),
    lpg(chinaTheaterIncidentMarkers.length, 0),
    lpg(koreaMissileIncidentMarkers.length, 0),
    lpg(showAxisNetwork, false),
    lpg(showBriTradeConnectivity, false),
    lpg(showUsDfcSupplyChain, false),
    lpg(showWarZones, false),
    lpg(showEconomicCenters, false),
    lpg(showElectionEvents, false),
    lpg(showFirmsFires, false),
    lpg(showGasPipelines, false),
    lpg(showIntelHotspots, false),
    lpg(showInternetExchanges, false),
    lpg(showLngTerminals, false),
    lpg(showMilitaryActivity, false),
    lpg(showMilitaryBases, false),
    lpg(showNuclearSites, false),
    lpg(showOilPipelines, false),
    lpg(showPorts, false),
    lpg(showLogisticsRisk, false),
    lpg(showCriticalNodes, false),
    lpg(showRailGlow, false),
    lpg(showRefugeeCamps, false),
    lpg(showResources, false),
    lpg(showSanctionsEntities, false),
    lpg(showShippingLanes, false),
    lpg(showSpaceLaunches, false),
    lpg(showSubmarineCables, false),
    lpg(showSubmarineTunnels, false),
    lpg(showTelegramOsint, false),
    lpg(showTzevaAdom, false),
    lpg(showNewfeedsIranAttacks, false),
    lpg(showNeptun, false),
    lpg(showNeptunPreviousTrails, false),
    lpg(showUcdpEvents, false),
    lpg(showUkraineControl, false),
    lpg(ukraineControlDate, null),
    lpg(ukraineControlStatus, "idle"),
    lpg(ukraineRuCellCount, 0),
    lpg(viinaDisplay.lod.mode, "hidden"),
    lpg(ukraineMacroGeoJson.features.length, 0),
    lpg(viinaMeta?.featureCount, 0),
    lpg(telegramAlerts.length, 0),
    lpg(telegramLive, false),
    lpg(telegramStatus, "idle"),
    lpg(tzevaAdomActive.length, 0),
    lpg(tzevaAdomHistory.length, 0),
    lpg(tzevaAdomLive, false),
    lpg(tzevaAdomStatus, "idle"),
    lpg(newfeedsAttacks.length, 0),
    lpg(newfeedsLive, false),
    lpg(newfeedsStatus, "idle"),
    lpg(newfeedsThreatLabel, null),
    lpg(neptunThreats.length, 0),
    lpg(neptunArchivedThreats.length, 0),
    lpg(neptunAlertCount, 0),
    lpg(neptunFetchEnabled, false),
    lpg(neptunLive, false),
    lpg(neptunRenderMode, "hidden"),
    lpg(neptunStatus, "idle"),
    lpg(visibleNeptunArchived.length, 0),
    lpg(visibleNeptunThreats.length, 0),
    lpg(showAirports, false),
    lpg(staticCounts, null),
    lpg(toggleCategoryPrefs, null),
    lpg(visibleCables.length, 0),
    lpg(visibleConflictZones.length, 0),
    lpg(visibleFirmsFires.length, 0),
    lpg(visibleGasPipelines.length, 0),
    lpg(visibleMilitaryBaseAreas.length, 0),
    lpg(visibleOilPipelines.length, 0),
    lpg(visibleShipping.length, 0),
    lpg(visibleStaticPoints.length, 0),
    lpg(viewerChromePreset, null),
    lpg(telegramEmbedMode, false),
    lpg(viinaMeta?.available, false),
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const applyPanelDraft = useCallback(() => {
    // soft batch가 대기 중이면 한 번만 flush (immediate 전체 재적용 금지)
    flushPendingPrefs();
    panelDraftPatchRef.current = {};
    categorySnapshotRef.current = null;
    setFrozenPanelCategories(null);
  }, [flushPendingPrefs]);

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
      deferLayerMapApplyRef.current = false;
      // 패널을 먼저 내려 UI가 막히지 않게 함 — draft flush는 그 다음 프레임
      if (closePanel) {
        setShowLeftPanel(false);
      }
      const flush = () => applyPanelDraft();
      if (closePanel && typeof window !== "undefined") {
        window.requestAnimationFrame(flush);
      } else {
        flush();
      }
    },
    [applyPanelDraft],
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

  function configureGlobe() {
    if (configuredGlobe.current) return;
    const globe = globeRef.current;
    if (!globe) return;

    configuredGlobe.current = true;
    // 로딩 시점부터 줌아웃된 궤도 (ENTRY_GATE 하드코딩)
    globe.pointOfView(
      {
        lat: ENTRY_GATE.bootLookAt.lat,
        lng: ENTRY_GATE.bootLookAt.lng,
        altitude: ENTRY_GATE.bootAltitude,
      },
      0,
    );
    setGlobeReady(true);

    const controls = globe.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = globeDistanceForAltitude(MIN_GLOBE_ALTITUDE);
    controls.maxDistance = 720;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.18;

    const syncViewState = () => {
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      if (!isCameraMovingRef.current) {
        isCameraMovingRef.current = true;
        setIsCameraMoving(true);
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
      }
      renderStabilizeIdleRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
      }, MOVING_IDLE_DELAY_MS);

      const pov = globe.pointOfView();

      if (pov.altitude < MIN_GLOBE_ALTITUDE) {
        globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: MIN_GLOBE_ALTITUDE }, 0);
      } else if (
        historyImmersionRef.current &&
        pov.altitude > HISTORY_IMMERSION_MAX_ALTITUDE
      ) {
        globe.pointOfView(
          { lat: pov.lat, lng: pov.lng, altitude: HISTORY_IMMERSION_MAX_ALTITUDE },
          0,
        );
      }

      // 드래그 중 setViewState 금지 — 대시보드 전체 리렌더가 프레임을 갉아먹음 (idle에서만 반영)
      lastViewUpdateAt.current = Date.now();

      moveIdleTimerRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        const idlePov = globe.pointOfView();
        // 티어는 히스테리시스로만 안정화. 고도는 실제 카메라값 유지(앵커 스냅 금지).
        // 티어가 바뀔 때는 delta가 작아도 altitude를 동기화해 레이어가 한 박자 늦게 남는 걸 막음.
        const nextTier = getStableLodTier(layerLodTierRef.current, idlePov.altitude);
        const tierChanged = nextTier !== layerLodTierRef.current;
        layerLodTierRef.current = nextTier;

        if (
          tierChanged ||
          Math.abs(idlePov.altitude - layerAltitudeRef.current) >= LAYER_ALTITUDE_SYNC_MIN_DELTA
        ) {
          layerAltitudeRef.current = idlePov.altitude;
          setLayerAltitude(idlePov.altitude);
        }

        const nextCenter = { lat: idlePov.lat, lng: idlePov.lng };
        lastFilterCenterUpdateAt.current = Date.now();
        layerCenterRef.current = nextCenter;
        setFilterCenter(nextCenter);

        setViewState({
          lat: idlePov.lat,
          lng: idlePov.lng,
          altitude: idlePov.altitude,
        });
      }, MOVING_IDLE_DELAY_MS);
    };

    controls.addEventListener("change", syncViewState);
    syncViewState();
  }

  const flyTo = useCallback(
    (
      lat: number,
      lng: number,
      altitude = 1.18,
      durationMs = 850,
      camera?: { pitch?: number; bearing?: number },
    ) => {
    const clampedAlt = clampGlobeAltitude(altitude);
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = false;

    const busyMs = cameraFlyBusyMs(durationMs);
    cameraTweenUntilRef.current = cameraBusyUntilAfterFly(durationMs);
    isCameraMovingRef.current = true;
    setIsCameraMoving(true);

    if (flyBusyTimerRef.current != null) {
      window.clearTimeout(flyBusyTimerRef.current);
    }
    if (renderStabilizeIdleRef.current != null) {
      window.clearTimeout(renderStabilizeIdleRef.current);
      renderStabilizeIdleRef.current = null;
    }

    globeRef.current?.pointOfView(
      {
        lat,
        lng,
        altitude: clampedAlt,
        pitch: camera?.pitch,
        bearing: camera?.bearing,
      },
      durationMs,
    );

    flyBusyTimerRef.current = window.setTimeout(() => {
      flyBusyTimerRef.current = null;
      cameraTweenUntilRef.current = 0;
      const pov = globeRef.current?.pointOfView();
      if (!pov) {
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
        return;
      }
      const nextAlt = clampGlobeAltitude(pov.altitude);
      // fly 완료 시 한 번에 LOD·뷰 반영 (tween 중 프레임 업데이트 없음)
      setViewState({
        lat: pov.lat,
        lng: pov.lng,
        altitude: nextAlt,
      });
      layerCenterRef.current = { lat: pov.lat, lng: pov.lng };
      layerAltitudeRef.current = nextAlt;
      layerLodTierRef.current = getGlobeLod(nextAlt).tier;
      setLayerAltitude(nextAlt);
      setFilterCenter({ lat: pov.lat, lng: pov.lng });
      renderStabilizeIdleRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
      }, CAMERA_IDLE_DEBOUNCE_MS);
    }, busyMs);
  },
  []);

  const selectFrictionStage = useCallback(
    (stage: FrictionTimelineStage) => {
      setFrictionActiveStageId(stage.id);
      flyTo(stage.coordinates[1], stage.coordinates[0], 0.72, 900, { pitch: 48, bearing: -8 });
    },
    [flyTo],
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;
    const controls = globe.controls();
    if (!controls) return;
    if (historyImmersionActive) {
      controls.maxDistance = globeDistanceForAltitude(HISTORY_IMMERSION_MAX_ALTITUDE);
      const pov = globe.pointOfView();
      if (pov.altitude > HISTORY_IMMERSION_MAX_ALTITUDE) {
        globe.pointOfView(
          { lat: pov.lat, lng: pov.lng, altitude: HISTORY_IMMERSION_MAX_ALTITUDE },
          400,
        );
      }
    } else {
      controls.maxDistance = 720;
    }
  }, [globeReady, historyImmersionActive]);

  function openIntelSheet(options?: {
    theater?: IntelTheaterFilter;
    tab?: "news" | "video" | "telegram" | "viina";
    lat?: number;
    lng?: number;
    altitude?: number;
  }) {
    setSelected(null);
    if (!historyImmersionRef.current) setRegionNavSelection(null);
    setIntelTheaterFilter(options?.theater ?? "all");
    setIntelSheetOpen(true);
    intelStackRef.current?.openNewsPanel(options?.theater ?? "all", options?.tab ?? "news");
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
    setRegionNavSelection(null);
    setIntelTheaterFilter(newsTheaterFromCoords(lat, lng));
    setIntelSheetOpen(true);
    intelStackRef.current?.openNewsPanel(newsTheaterFromCoords(lat, lng), "news");
    flyTo(lat, lng, altitude);
  }, [flyTo]);

  function handleIntelFlyTo(target: MapFlyTarget) {
    if (target.kind === "coords") {
      flyTo(target.lat, target.lng, target.altitude ?? 0.92);
      return;
    }
    const center = THEATER_FLY_TO[target.theater];
    flyTo(center.lat, center.lng, center.altitude);
  }

  const computeRegionFitAltitude = useCallback((bbox: RegionBBox, fallbackAltitude: number) => {
    const latSpan = Math.max(REGION_MIN_SPAN_DEG, (bbox.maxLat - bbox.minLat) * REGION_FIT_PADDING);
    const lngSpan = Math.max(REGION_MIN_SPAN_DEG, longitudeDistance(bbox.minLng, bbox.maxLng) * REGION_FIT_PADDING);
    const aspect = Math.max(0.75, size.width / Math.max(1, size.height));
    const dominantSpan = Math.max(latSpan, lngSpan / aspect);
    // 넓은 전장(중동급)일수록 ISS급 원거리에 가깝게 — 타이트 줌인 방지
    const fittedAltitude =
      dominantSpan <= 8
        ? 0.72 + dominantSpan * 0.08
        : dominantSpan <= 24
          ? 1.35 + (dominantSpan - 8) * 0.028
          : Math.min(ORBITAL_OVERVIEW_ALTITUDE + 0.15, 1.55 + (dominantSpan - 24) * 0.012);
    const seededAltitude = fittedAltitude * 0.72 + fallbackAltitude * 0.28;
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    const minAltitude =
      isInUkraineTheater(centerLat, centerLng) ? MIN_GLOBE_ALTITUDE : REGION_MIN_ALTITUDE;
    return clamp(seededAltitude, minAltitude, REGION_MAX_ALTITUDE);
  }, [size.height, size.width]);

  const flyToBounds = useCallback(
    (
      selection: NavSelection,
      durationMs = 850,
      mode: "overview" | "detail" = "overview",
      camera?: { pitch?: number; bearing?: number },
    ) => {
      const targetLat = (selection.bbox.minLat + selection.bbox.maxLat) / 2;
      const targetLng = (selection.bbox.minLng + selection.bbox.maxLng) / 2;
      const fittedAltitude = computeRegionFitAltitude(selection.bbox, selection.altitude);
      const latSpan = Math.max(0.1, selection.bbox.maxLat - selection.bbox.minLat);
      const lngSpan = Math.max(0.1, longitudeDistance(selection.bbox.minLng, selection.bbox.maxLng));
      const spanDeg = Math.max(latSpan, lngSpan);
      const isCompactTheater = spanDeg <= COMPACT_THEATER_MAX_SPAN_DEG;

      let targetAltitude: number;
      if (mode === "detail") {
        targetAltitude = fittedAltitude;
      } else if (isCompactTheater) {
        // 한반도·대만급: 궤도 하한 없이 작성 고도 위주로 화면을 채움
        targetAltitude = clamp(
          selection.altitude * 0.82 + fittedAltitude * 0.18,
          REGION_MIN_ALTITUDE,
          1.2,
        );
      } else {
        // 중동·우크라 전역 등 넓은 전장만 ISS급 하한 유지
        targetAltitude = Math.max(
          fittedAltitude,
          selection.altitude,
          THEATER_ENTRY_MIN_ALTITUDE,
          ORBITAL_OVERVIEW_ALTITUDE * 0.92,
        );
      }
      flyTo(targetLat, targetLng, targetAltitude, durationMs, camera);
    },
    [computeRegionFitAltitude, flyTo],
  );

  function enterEconomyRegionFocus(
    selection: NavSelection,
    opts?: { openInsight?: boolean },
  ) {
    closeLeftPanel();
    setSelected(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
    setRegionNavSelection(null);
    setEconNavSelection(selection);
    setEconNewsPanelReveal(false);
    flyToBounds(selection, 1100, "overview", { pitch: 55, bearing: -20 });
    // 양피지는 nav/허브 직접 선택일 때만 (인트로·패키지 autoEnter는 카메라만)
    if (opts?.openInsight !== false) {
      scheduleEconInsight({ navId: selection.id, compact: false });
    }

    const conceptLayers = conceptLayersForEconomyNavId(selection.id);
    if (Object.keys(conceptLayers).length > 0) {
      requestAnimationFrame(() => {
        toggleCategoryPrefs(conceptLayers);
      });
    }
  }

  function enterTheaterFocus(selection: NavSelection, tab: TheaterSidebarTab = "news") {
    const config = theaterFocusFromNav(selection);
    if (isUkraineNavId(selection.id)) {
      setUkraineFrontLegendEngaged(true);
    } else {
      setUkraineFrontLegendEngaged(false);
    }
    closeLeftPanel();
    setSelected(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
    setEconNavSelection(null);
    closeEconInsight();
    clearEconInsightTimer();
    setEconNewsPanelReveal(false);
    setRegionNavSelection(selection);
    setRegimeSelectedEpisodeId(null);
    setFrictionEpisodeBrief(null);
    clearFrictionEpisodeTimer();
    setTheaterSidebarTab(tab);
    setIntelTheaterFilter(config.newsTheater);
    immediateUntilRef.current = Date.now() + 1800;
    ukraineZoomPendingRef.current = false;
    neptunZoomPendingRef.current = false;
    flyToBounds(selection, 1100, "overview");
    scheduleHubBrief(selection);

    const conceptLayers = conceptLayersForConflictNavId(selection.id);
    requestAnimationFrame(() => {
      toggleCategoryPrefs(conceptLayers);
    });

    if (config.enableUkraineLayers) {
      if (ukraineControl.length === 0 && viinaMeta?.available) {
        void refreshUkraineControl();
      }
    }
  }

  enterTheaterFocusRef.current = enterTheaterFocus;
  enterEconomyRegionFocusRef.current = enterEconomyRegionFocus;

  useEffect(() => {
    if (entryGate !== null || showModePicker) return;
    if (packageTheaterFocusPlayedRef.current || !globeReady || isLoading || loadError) return;
    const navId =
      viewUi.autoEnterTheaterNavId ?? initialViewConfig?.ui.autoEnterTheaterNavId ?? null;
    if (!navId) return;
    // 허브 렌즈·양피지 경로는 유저가 nav를 직접 열 때만 — 패키지 autoEnter는 구 전장 id만
    if (navId.startsWith("hub-") || navId.startsWith("claim-") || navId.startsWith("ally-")) {
      packageTheaterFocusPlayedRef.current = true;
      return;
    }
    const sel = navSelectionFromId(navId);
    if (!sel) return;
    packageTheaterFocusPlayedRef.current = true;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    enterTheaterFocusRef.current(sel);
  }, [
    entryGate,
    globeReady,
    initialViewConfig?.ui.autoEnterTheaterNavId,
    isLoading,
    loadError,
    showModePicker,
    viewUi.autoEnterTheaterNavId,
  ]);

  useEffect(() => {
    if (entryGate !== null || showModePicker) return;
    if (packageEconFocusPlayedRef.current || !globeReady || isLoading || loadError) return;
    const navId = viewUi.autoEnterEconNavId ?? initialViewConfig?.ui.autoEnterEconNavId ?? null;
    if (!navId) return;
    const sel = econNavSelectionFromId(navId);
    if (!sel) return;
    packageEconFocusPlayedRef.current = true;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    // 모드 피커에서 허브를 골라도 양피지는 열지 않음 — nav로 다시 눌러야 양피지
    enterEconomyRegionFocusRef.current(sel, { openInsight: false });
  }, [
    entryGate,
    globeReady,
    initialViewConfig?.ui.autoEnterEconNavId,
    isLoading,
    loadError,
    showModePicker,
    viewUi.autoEnterEconNavId,
  ]);

  function flyToTheaterDetail() {
    if (!theaterFocusConfig) return;
    if (theaterFocusConfig.enableUkraineLayers) {
      setUkraineFrontLegendEngaged(true);
    }
    const detail = theaterFocusConfig.detailSelection;
    if (theaterFocusConfig.enableUkraineLayers) {
      ukraineZoomPendingRef.current = true;
      if (showUkraineControl && globeReady) {
        flyToBounds(detail, 1100, "detail");
      }
      return;
    }
    flyToBounds(detail, 1100, "detail");
  }

  useEffect(() => {
    if (suppressAutoRegionZoomRef.current) return;
    if (!showUkraineControl || !globeReady || !ukraineZoomPendingRef.current) return;
    if (ukraineControl.length === 0) return;

    ukraineZoomPendingRef.current = false;
    const extraPoints = UKRAINE_SITUATION_PATHS.flatMap((path) => path.points);
    const bbox = computeUkraineFrontFitBbox(ukraineControl, extraPoints);
    const targetLat = (bbox.minLat + bbox.maxLat) / 2;
    const targetLng = (bbox.minLng + bbox.maxLng) / 2;
    const targetAltitude = computeRegionFitAltitude(bbox, 0.22);
    layerCenterRef.current = { lat: targetLat, lng: targetLng };
    layerAltitudeRef.current = targetAltitude;
    layerLodTierRef.current = getGlobeLod(targetAltitude).tier;
    setFilterCenter({ lat: targetLat, lng: targetLng });
    setLayerAltitude(targetAltitude);
    flyTo(targetLat, targetLng, targetAltitude, 1100);
  }, [computeRegionFitAltitude, flyTo, globeReady, showUkraineControl, ukraineControl]);

  useEffect(() => {
    if (!isUkraineTheaterFocus) return;
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
  }, [isUkraineTheaterFocus]);

  useEffect(() => {
    if (suppressAutoRegionZoomRef.current) return;
    if (!showNeptun || !globeReady || !neptunZoomPendingRef.current) return;
    neptunZoomPendingRef.current = false;
    const targetLat = 49;
    const targetLng = 32;
    const targetAltitude = 0.72;
    layerCenterRef.current = { lat: targetLat, lng: targetLng };
    layerAltitudeRef.current = targetAltitude;
    layerLodTierRef.current = getGlobeLod(targetAltitude).tier;
    setFilterCenter({ lat: targetLat, lng: targetLng });
    setLayerAltitude(targetAltitude);
    flyTo(targetLat, targetLng, targetAltitude, 1100);
  }, [flyTo, globeReady, showNeptun]);

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
    startTransition(() => {
      applyLayerPrefs(merged.layers);
      setViewUi(merged.ui);
      setViewTheater(theater);
      setViewEconomyHub(economyHub);
      setViewPackages(packages.filter((id) => id !== "custom"));
      setIntelTheaterFilter(theater !== "auto" ? theater : "all");
      setShowModePicker(false);
      setModePickerLockMode(false);
      setModePickerInitialMode(null);
      setEntryGate(null);
      markWelcomeGateDone();
      if (merged.ui.openLayerPanel && !isCompactUi) {
        setShowLeftPanel(true);
      }
      if (merged.ui.autoOpenIntelSheet) {
        openIntelSheet({
          theater: theater !== "auto" ? theater : "all",
          tab: merged.ui.defaultIntelTab,
        });
      }
    });
  }

  function handleModeApply(
    mode: ViewerMode,
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = "auto",
  ) {
    setIntelSheetOpen(false);
    setRegionNavSelection(null);
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
    if (viewerMode === mode) return;
    recordInterestMode(mode);
    startTransition(() => {
      handleModeApply(
        mode,
        mode === "conflict" ? viewTheater : "auto",
        mode === "economy" ? viewEconomyHub : "auto",
      );
    });
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

    // 지정학 기본 레이어에 우크라가 있어도 인트로로 우크라 강제 진입하지 않음
    if (showUkraineControl) {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      return;
    }

    const topAlert = localDisputeAlerts[0];
    const introTarget = resolveIntroFlyTarget({
      viewerMode,
      theater: viewTheater,
      economyHub: viewEconomyHub,
      topAlert: topAlert ? { lat: topAlert.center.lat, lng: topAlert.center.lng } : null,
      conflictNavId: hottestConflictNavId(localDisputeAlerts),
      economyNavId: hottestEconomyNavId(localDisputeAlerts),
    });

    const startTimer = window.setTimeout(() => {
      setShowIntroHint(true);
      if (introTarget?.kind === "coords") {
        flyTo(
          introTarget.lat,
          introTarget.lng,
          introTarget.altitude ?? ORBITAL_OVERVIEW_ALTITUDE,
          INTRO_CAMERA_DURATION_MS,
        );
      } else if (introTarget?.kind === "exploration") {
        if (isEconomyViewer) {
          const sel = econNavSelectionFromId(introTarget.presetId);
          if (sel) {
            // 인트로: 핫 허브로 카메라만 — 양피지/강제 패널 포커스 금지
            flyToBounds(sel, INTRO_CAMERA_DURATION_MS, "overview", {
              pitch: 55,
              bearing: -20,
            });
          }
        } else {
          const preset = EXPLORATION_PRESETS.find((item) => item.id === introTarget.presetId);
          if (preset) {
            enterTheaterFocusRef.current(toNavSelection(preset.navItem, preset.groupId));
          }
        }
      }
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
    flyToBounds,
    globeReady,
    initialViewConfig?.ui.autoEnterEconNavId,
    initialViewConfig?.ui.autoEnterTheaterNavId,
    isEconomyViewer,
    isLoading,
    loadError,
    localDisputeAlerts,
    showModePicker,
    showUkraineControl,
    viewEconomyHub,
    viewTheater,
    viewerMode,
    viewUi.autoEnterEconNavId,
    viewUi.autoEnterTheaterNavId,
  ]);

  useEffect(() => {
    if (isLoading || !globeReady || loadError) return;
    if (entryGate !== null || showModePicker) return;
    if (readWelcomeGateDone()) return;
    setEntryGate("caution");
  }, [entryGate, globeReady, isLoading, loadError, showModePicker]);

  useEffect(() => {
    return () => {
      if (domainThenDetailTimerRef.current != null) {
        window.clearTimeout(domainThenDetailTimerRef.current);
        domainThenDetailTimerRef.current = null;
      }
    };
  }, []);

  function openModePickerManual() {
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setShowModePicker(true);
  }

  function handleDomainSelect(mode: ViewerMode, ultraLiteOn: boolean) {
    ultraLiteRef.current = ultraLiteOn;
    setUltraLite(ultraLiteOn);
    savePerfPrefs({ ultraLite: ultraLiteOn });

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

    // 모드 크롬·패키지 적용 후 히어로 레이어로 덮어씀 (세부 ModePicker 없음)
    handleModeApply(mode, "auto", "auto");
    applyLayerPrefs(overviewPrefs);

    layerCenterRef.current = {
      lat: ENTRY_GATE.bootLookAt.lat,
      lng: ENTRY_GATE.bootLookAt.lng,
    };
    layerAltitudeRef.current = ENTRY_GATE.bootAltitude;
    layerLodTierRef.current = getGlobeLod(ENTRY_GATE.bootAltitude).tier;
    setFilterCenter({
      lat: ENTRY_GATE.bootLookAt.lat,
      lng: ENTRY_GATE.bootLookAt.lng,
    });
    setLayerAltitude(ENTRY_GATE.bootAltitude);
    flyTo(
      ENTRY_GATE.bootLookAt.lat,
      ENTRY_GATE.bootLookAt.lng,
      ENTRY_GATE.bootAltitude,
      ENTRY_GATE.zoomOutFlyMs,
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

  /** 공습경보 칩에 처음 다가갈 때만 1회 설명 */
  const maybeOfferAirRaidCoach = useCallback(() => {
    if (isEconomyViewer) return;
    if (issueUiPausedForLamp) return;
    if (entryGate !== null || showModePicker || chromeCoachStep) return;
    if (shouldOfferChromeCoach()) return;
    if (!shouldOfferAirRaidCoach()) return;
    if (showAirRaidCoach) return;
    setShowAirRaidCoach(true);
  }, [
    chromeCoachStep,
    entryGate,
    isEconomyViewer,
    issueUiPausedForLamp,
    showAirRaidCoach,
    showModePicker,
  ]);

  /**
   * 매일 등불 브리핑 — 지정학·지경학 각각 하루 1회.
   * 첫 방문: 입장 인트로(경고→편지→도메인)가 끝난 뒤에만.
   * 재방문: 당일 해당 모드 미시청이면 점화. 코치/공습 안내보다 우선.
   */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    if (hubBriefOpen || frictionEpisodeBrief || econInsightOpen) return;

    const { dayKey, tier } = resolveLampPeriod();
    const dayPart = calendarDayKey.startsWith("daily-") ? calendarDayKey : dayKey;
    const lampKey = lampSeenKey(dayPart, viewerMode);

    if (periodicBriefing?.key === lampKey) return;
    if (hasSeenPeriod(lampKey)) {
      setDailyLampSettled(true);
      // 오늘 등불 이미 봄 → 첫 방문 크롬 코치만 이어서
      if (shouldOfferChromeCoach() && !chromeCoachStep) {
        const coachTimer = window.setTimeout(() => setChromeCoachStep("nav"), 900);
        return () => window.clearTimeout(coachTimer);
      }
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        let content: PeriodicBriefing | null = null;
        if (viewerMode === "economy") {
          try {
            const langQs = labelLanguage === "en" ? "en" : "ko";
            const [lampRes, newsRes] = await Promise.all([
              fetch(
                `/api/world-stats/market-lamp?dayKey=${encodeURIComponent(dayPart)}&lang=${langQs}`,
                { cache: "no-store" },
              ),
              fetch(`/api/news-stream?packages=geo-trader&lang=${langQs}`, { cache: "no-store" }),
            ]);

            const kicker =
              labelLanguage === "en"
                ? tier === "monthly"
                  ? "This month's market lamp"
                  : tier === "weekly"
                    ? "This week's market lamp"
                    : "Today's market lamp"
                : tier === "monthly"
                  ? "이번 달 시장 등불"
                  : tier === "weekly"
                    ? "이번 주 시장 등불"
                    : "오늘의 시장 등불";

            let focusTitle =
              labelLanguage === "en" ? "Markets in focus" : "시장이 주목하는 뉴스";
            let paragraphs: string[] = [];
            let macroTable = buildLampMacroTable([], labelLanguage);

            if (lampRes.ok) {
              const lamp = (await lampRes.json()) as {
                disabled?: boolean;
                focusTitle?: string;
                paragraphs?: string[];
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
                paragraphs = shortenEconomyLampParagraphs(lamp.paragraphs ?? [], 1);
                if (lamp.macros && lamp.macros.length > 0) {
                  macroTable = buildLampMacroTable(lamp.macros, labelLanguage);
                }
              }
            }

            let featuredNews = pickEconomyLampNews([], ECONOMY_LAMP_NEWS_MIN, langQs);
            if (newsRes.ok) {
              const newsPayload = (await newsRes.json()) as NewsStreamPayload;
              const pool: NewsStreamItem[] = [
                ...(newsPayload.hero ? [newsPayload.hero] : []),
                ...(newsPayload.verified ?? []),
                ...(newsPayload.stateMedia ?? []),
              ];
              featuredNews = pickEconomyLampNews(pool, ECONOMY_LAMP_NEWS_MIN, langQs);
            }

            if (macroTable.length > 0 || featuredNews.length > 0 || paragraphs.length > 0) {
              content = {
                tier,
                key: lampKey,
                title: `${kicker}\n${focusTitle}`,
                // 지경학은 표·뉴스가 본문 — 긴 서술 브리핑은 쓰지 않음
                paragraphs: [],
                macroTable,
                featuredNews,
              };
            }
          } catch {
            // fall through
          }
        } else {
          // 지정학 — 전장 사진 뉴스 등불 (브리핑 서술 대신)
          try {
            const langQs = labelLanguage === "en" ? "en" : "ko";
            const newsRes = await fetch(
              `/api/news-stream?packages=conflict-watch&lang=${langQs}`,
              { cache: "no-store" },
            );
            const kicker =
              labelLanguage === "en"
                ? tier === "monthly"
                  ? "This month's theater lamp"
                  : tier === "weekly"
                    ? "This week's theater lamp"
                    : "Today's theater lamp"
                : tier === "monthly"
                  ? "이번 달 전장 등불"
                  : tier === "weekly"
                    ? "이번 주 전장 등불"
                    : "오늘의 전장 등불";
            const focusTitle =
              labelLanguage === "en"
                ? "High-trust photo desk"
                : "고신뢰 사진 데스크";

            let featuredNews = pickConflictLampNews([], CONFLICT_LAMP_NEWS_MIN, langQs);
            if (newsRes.ok) {
              const newsPayload = (await newsRes.json()) as NewsStreamPayload;
              const pool: NewsStreamItem[] = [
                ...(newsPayload.hero ? [newsPayload.hero] : []),
                ...(newsPayload.verified ?? []),
                ...(newsPayload.stateMedia ?? []),
              ];
              featuredNews = pickConflictLampNews(pool, CONFLICT_LAMP_NEWS_MIN, langQs);
            }

            if (featuredNews.length > 0) {
              content = {
                tier,
                key: lampKey,
                title: `${kicker}\n${focusTitle}`,
                paragraphs: [],
                featuredNews,
              };
            }
          } catch {
            // fall through
          }
        }
        if (!content) {
          try {
            const res = await fetch(
              `/api/briefing-stats?tier=${tier}&lang=${labelLanguage === "en" ? "en" : "ko"}&viewerMode=${viewerMode}`,
              { cache: "no-store" },
            );
            if (res.ok) {
              const payload = (await res.json()) as {
                stats?: BriefingPeriodStats | null;
                briefing?: PeriodicBriefing | null;
              };
              content =
                payload.briefing ??
                buildBriefingFromStats(
                  payload.stats ?? null,
                  tier,
                  dayPart,
                  labelLanguage,
                  viewerMode,
                );
              if (content) content = { ...content, key: lampKey };
            }
          } catch {
            // fall through to curated
          }
        }
        if (!content) {
          content = buildPeriodicBriefing(viewerMode, labelLanguage);
          if (content) content = { ...content, key: lampKey };
        }
        // 사진 뉴스 폴백 — 모드별 picker
        if (content) {
          const langQs = labelLanguage === "en" ? "en" : "ko";
          const needNews = !content.featuredNews || content.featuredNews.length === 0;
          if (viewerMode === "economy") {
            if (needNews) {
              try {
                const newsRes = await fetch(
                  `/api/news-stream?packages=geo-trader&lang=${langQs}`,
                  { cache: "no-store" },
                );
                if (newsRes.ok) {
                  const newsPayload = (await newsRes.json()) as NewsStreamPayload;
                  const pool: NewsStreamItem[] = [
                    ...(newsPayload.hero ? [newsPayload.hero] : []),
                    ...(newsPayload.verified ?? []),
                    ...(newsPayload.stateMedia ?? []),
                  ];
                  content = {
                    ...content,
                    paragraphs: [],
                    featuredNews: pickEconomyLampNews(pool, ECONOMY_LAMP_NEWS_MIN, langQs),
                  };
                }
              } catch {
                /* keep content */
              }
            } else {
              content = { ...content, paragraphs: [] };
            }
          } else if (needNews) {
            try {
              const newsRes = await fetch(
                `/api/news-stream?packages=conflict-watch&lang=${langQs}`,
                { cache: "no-store" },
              );
              if (newsRes.ok) {
                const newsPayload = (await newsRes.json()) as NewsStreamPayload;
                const pool: NewsStreamItem[] = [
                  ...(newsPayload.hero ? [newsPayload.hero] : []),
                  ...(newsPayload.verified ?? []),
                  ...(newsPayload.stateMedia ?? []),
                ];
                content = {
                  ...content,
                  paragraphs: [],
                  featuredNews: pickConflictLampNews(pool, CONFLICT_LAMP_NEWS_MIN, langQs),
                };
              }
            } catch {
              /* keep content */
            }
          } else if (content.featuredNews && content.featuredNews.length > 0) {
            content = { ...content, paragraphs: [] };
          }
        }
        if (!cancelled) {
          if (content && viewerMode === "conflict") {
            try {
              const ranksRes = await fetch("/api/daily-ranks?limit=1", {
                cache: "no-store",
                headers: { Accept: "application/json" },
              });
              if (ranksRes.ok) {
                const ranks = (await ranksRes.json()) as {
                  worldTension?: WorldTensionSnapshot | null;
                };
                const wt = ranks.worldTension;
                if (wt && Number.isFinite(wt.score)) {
                  setWtiSnapshot(wt);
                  const langKey = labelLanguage === "en" ? "en" : "ko";
                  content = {
                    ...content,
                    wti: {
                      score: wt.score,
                      deltaScore: wt.deltaScore,
                      lead: formatWtiBriefingLead(wt, langKey),
                    },
                  };
                }
              }
            } catch {
              /* keep content without WTI */
            }
          }
          if (content) setPeriodicBriefing(content);
          setDailyLampSettled(true);
        }
      })();
    }, 1400);

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
    loadError,
    periodicBriefing,
    showAirRaidCoach,
    showModePicker,
    viewerMode,
  ]);

  // 오늘의 WTI — 사운드 강도·등불 기축 (등불보다 먼저 확보)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/daily-ranks?limit=1", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          worldTension?: WorldTensionSnapshot | null;
        };
        if (!cancelled && data.worldTension) setWtiSnapshot(data.worldTension);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarDayKey]);

  // 등불 종료 후 · 하루 1회 WTI UP/DOWN
  useEffect(() => {
    if (!dailyLampSettled || periodicBriefing || entryGate || showModePicker) return;
    if (hasSeenTensionPrompt(calendarDayKey)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/daily-prompt?date=${encodeURIComponent(nextUtcRankDate())}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { prompt?: DailyPrompt | null };
        if (!cancelled && data.prompt) setTomorrowTensionPrompt(data.prompt);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    calendarDayKey,
    dailyLampSettled,
    entryGate,
    periodicBriefing,
    showModePicker,
  ]);

  // 모드·일자 전환 시 등불 게이트 재시작 (공습·이슈 UI는 settled 전까지 보류)
  useEffect(() => {
    setPeriodicBriefing(null);
    setDailyLampSettled(false);
    setTomorrowTensionPrompt(null);
    setAirRaidOffer(null);
    setShowAirRaidCoach(false);
  }, [viewerMode, calendarDayKey]);

  // 등불 양피지가 뜨면 진행 중이던 공습 배너·코치 즉시 중단
  useEffect(() => {
    if (!periodicBriefing) return;
    setAirRaidOffer(null);
    setShowAirRaidCoach(false);
  }, [periodicBriefing]);

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

  function handleNavNavigate(selection: NavSelection) {
    if (isEconomyViewer) {
      enterEconomyRegionFocus(selection);
    } else {
      enterTheaterFocus(selection);
    }
  }

  function handleExplorationSelect(preset: (typeof EXPLORATION_PRESETS)[number]) {
    const zone = battlefieldZoneFromExplorationId(preset.id);
    if (zone) {
      battlefieldManualUntilRef.current = Date.now() + 12_000;
      battlefieldSoftZoneRef.current = zone;
      applyLayerPrefs(applyBattlefieldPreset(zone, layerPrefsLiveRef.current));
      setChromeCoachStep(null);
    }
    handleNavNavigate(toNavSelection(preset.navItem, preset.groupId));
  }

  useEffect(() => {
    if (isEconomyViewer || entryGate !== null || showModePicker) return;
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
  }, [
    applyLayerPrefs,
    entryGate,
    isEconomyViewer,
    layerViewState.altitude,
    layerViewState.lat,
    layerViewState.lng,
    showModePicker,
  ]);

  function handleRegionEventSelect(event: ScoredEvent) {
    flyTo(event.lat, event.lng, 0.72);
    openSelection({ kind: "event", item: event });
  }

  const handleNeptunThreatSelect = useCallback(
    (threat: NeptunLiveThreat) => {
      dismissLayerPanel(true);
    setRegionNavSelection(null);
    setIntelSheetOpen(false);
      setUkraineFrontLegendEngaged(true);
      if (!showUkraineControl) togglePref("showUkraineControl", true);
      if (!showNeptun) togglePref("showNeptun", true);
      requestAnimationFrame(() => {
    flyTo(threat.predictedLat, threat.predictedLon, 0.58);
        setSelected({ kind: "neptun-threat", item: threat });
      });
    },
    [dismissLayerPanel, flyTo, showNeptun, showUkraineControl, togglePref],
  );

  function handleAlertSelect(alert: DisputeAlert) {
    setRegionNavSelection(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(true);
    flyTo(alert.center.lat, alert.center.lng, 0.88);
    openSelection({ kind: "dispute", item: alert });
  }

  function handleGdeltAlertSelect(alert: MenuCoreAlert) {
    setRegionNavSelection(null);
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

  /** 신규 공습경보 — 최초 1회만 선택 배너 (이후 칩으로만 이동). 등불 닫힌 뒤에만 */
  useEffect(() => {
    if (isEconomyViewer || entryGate !== null || showModePicker) {
      return;
    }
    if (issueUiPausedForLamp) {
      return;
    }
    if (!shouldOfferAirRaidFlyBrief()) {
      return;
    }

    const keys: string[] = [];
    const candidates: AirRaidOffer[] = [];

    for (const alert of tzevaAdomActive) {
      const key = `tzeva:${alert.id}`;
      keys.push(key);
      candidates.push({
        key,
        kind: "tzeva",
        target: {
          lat: alert.lat,
          lng: alert.lng,
          label: translateOrefRegion(alert.region || "", labelLanguage) || alert.region,
        },
        title: translateOrefTitle(alert.title || "", labelLanguage) || alert.title,
        since: alert.alertDate,
        activeCount: tzevaAdomActive.length,
      });
    }

    for (const region of neptunAlerts?.raions ?? []) {
      const key = `neptun:r:${region.key}`;
      keys.push(key);
      const coords = geocodeUkraineAlertRegion(region.name, region.oblast, region.key);
      candidates.push({
        key,
        kind: "neptun",
        target: {
          lat: coords.lat,
          lng: coords.lng,
          label: region.name || region.oblast || region.key,
        },
        title: region.oblast,
        since: region.since,
        activeCount:
          (neptunAlerts?.raions?.length ?? 0) + (neptunAlerts?.oblasts?.length ?? 0),
      });
    }
    for (const region of neptunAlerts?.oblasts ?? []) {
      const key = `neptun:o:${region.key}`;
      keys.push(key);
      const coords = geocodeUkraineAlertRegion(region.name, region.oblast, region.key);
      candidates.push({
        key,
        kind: "neptun",
        target: {
          lat: coords.lat,
          lng: coords.lng,
          label: region.name || region.oblast || region.key,
        },
        title: region.oblast,
        since: region.since,
        activeCount:
          (neptunAlerts?.raions?.length ?? 0) + (neptunAlerts?.oblasts?.length ?? 0),
      });
    }

    if (seenAirRaidKeysRef.current === null) {
      seenAirRaidKeysRef.current = new Set(keys);
      return;
    }

    const seen = seenAirRaidKeysRef.current;
    const fresh = candidates.find((c) => !seen.has(c.key));
    for (const k of keys) seen.add(k);
    if (
      !fresh ||
      airRaidAutoBusyRef.current ||
      airRaidOffer ||
      airRaidBriefing ||
      periodicBriefing
    ) {
      return;
    }

    setAirRaidOffer(fresh);
  }, [
    airRaidBriefing,
    airRaidOffer,
    entryGate,
    isEconomyViewer,
    issueUiPausedForLamp,
    labelLanguage,
    neptunAlerts,
    periodicBriefing,
    showModePicker,
    tzevaAdomActive,
  ]);

  /** 폴링 데이터가 해제이면 배너·빗금 포커스도 즉시 끔 */
  useEffect(() => {
    const tzevaOn = tzevaAdomActive.length > 0;
    const neptunOn =
      (neptunAlerts?.raions?.length ?? 0) + (neptunAlerts?.oblasts?.length ?? 0) > 0;

    if (airRaidOffer) {
      if (airRaidOffer.kind === "tzeva" && !tzevaOn) setAirRaidOffer(null);
      else if (airRaidOffer.kind === "neptun" && !neptunOn) setAirRaidOffer(null);
    }

    if (!tzevaOn && !neptunOn) {
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
        airRaidFocusClearRef.current = null;
      }
      setAirRaidFocusPaths([]);
      setAirRaidFocusBox(null);
    }
  }, [airRaidOffer, neptunAlerts, tzevaAdomActive]);

  const acceptAirRaidOffer = useCallback(() => {
    const offer = airRaidOffer;
    if (!offer || airRaidAutoBusyRef.current) return;

    markAirRaidFlyBriefDone();
    airRaidAutoBusyRef.current = true;
    setAirRaidOffer(null);
    const seq = ++airRaidAutoSeqRef.current;
    const lang = labelLanguage === "en" ? "en" : "ko";
    const regionLabel = offer.target.label || (lang === "en" ? "Alert zone" : "경보 구역");

    handleAirRaidFocus(offer.target, offer.kind, { deferSirenUntilArrive: true });

    void (async () => {
      try {
        const res = await fetch("/api/air-raid-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: offer.kind,
            lang,
            region: regionLabel,
            title: offer.title,
            lat: offer.target.lat,
            lng: offer.target.lng,
            since: offer.since,
            activeCount: offer.activeCount,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          title?: string;
          paragraphs?: string[];
        } | null;
        if (seq !== airRaidAutoSeqRef.current) return;
        const title =
          data?.title?.trim() ||
          (lang === "en" ? `Air-raid alert · ${regionLabel}` : `공습경보 · ${regionLabel}`);
        const paragraphs =
          Array.isArray(data?.paragraphs) && data.paragraphs.length > 0
            ? data.paragraphs
            : lang === "en"
              ? [
                  `An air-raid alert was received for ${regionLabel}.`,
                  "Attacker and munition type are not confirmed by this alert feed alone.",
                ]
              : [
                  `${regionLabel} 일대에 공습경보가 수신되었습니다.`,
                  "공격 주체·무기 유형은 이 경보 피드만으로 확정할 수 없습니다.",
                ];

        window.setTimeout(() => {
          if (seq !== airRaidAutoSeqRef.current) return;
          setAirRaidBriefing({
            kind: offer.kind,
            title,
            paragraphs,
          });
        }, AIR_RAID_FLY_MS);
      } catch {
        if (seq !== airRaidAutoSeqRef.current) return;
        window.setTimeout(() => {
          if (seq !== airRaidAutoSeqRef.current) return;
          setAirRaidBriefing({
            kind: offer.kind,
            title: lang === "en" ? `Air-raid alert · ${regionLabel}` : `공습경보 · ${regionLabel}`,
            paragraphs:
              lang === "en"
                ? [
                    `An air-raid alert was received for ${regionLabel}.`,
                    "Further details are unverified.",
                  ]
                : [
                    `${regionLabel} 일대에 공습경보가 수신되었습니다.`,
                    "추가 전언은 미확인으로 취급합니다.",
                  ],
          });
        }, AIR_RAID_FLY_MS);
      }
    })();
  }, [airRaidOffer, handleAirRaidFocus, labelLanguage]);

  const dismissAirRaidOffer = useCallback(() => {
    markAirRaidFlyBriefDone();
    setAirRaidOffer(null);
    airRaidAutoBusyRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
      }
    };
  }, []);

  const openSelection = useCallback((next: Selection) => {
    dismissLayerPanel(true);
    setSelected(next);
    recordInterestFromSelection(next);
  }, [dismissLayerPanel]);

  function handlePointClick(event: ConflictEvent) {
    openIntelFromCoords(event.lat, event.lng, 0.92);
  }

  const handleCarrierSelect = useCallback((carrier: UsCarrier) => {
    openSelection({ kind: "us-carrier", item: carrier });
    flyTo(carrier.lat, carrier.lng, 0.75);
  }, [flyTo, openSelection]);

  const handleMilAircraftSelect = useCallback((aircraft: MilitaryAircraft) => {
    openSelection({ kind: "mil", item: aircraft, traffic: "military" });
    flyTo(aircraft.lat, aircraft.lng, 0.55);
  }, [flyTo, openSelection]);

  const handleCivAircraftSelect = useCallback((aircraft: MilitaryAircraft) => {
    openSelection({ kind: "mil", item: aircraft, traffic: "civil" });
    flyTo(aircraft.lat, aircraft.lng, 0.55);
  }, [flyTo, openSelection]);

  const createHtmlOverlayElement = useCallback(
    (point: object) => {
      const item = point as HtmlOverlayMarker;
      const alt = layerAltitudeRef.current;
      if (item.displayKind === "event") {
        return createEventPinElement(
          item,
          alt,
          {
            onHover: handleHtmlMarkerHover,
            onClick: (eventPoint) => {
              openIntelFromCoords(eventPoint.lat, eventPoint.lng, 0.92);
            },
          },
          { newsAlert: true },
        );
      }
      if (item.displayKind === "us-carrier-html") {
        return createUsCarrierBadge(
          item,
          {
            onHover: setHoveredCarrier,
            onClick: handleCarrierSelect,
          },
          { labelOffsetY: usCarrierLabelOffsets.get(item.id) ?? 0 },
        );
      }
      if (item.displayKind === "mil-html" || item.displayKind === "civ-html") {
        const isCiv = item.displayKind === "civ-html";
        return createMilAircraftBadge(
          item,
          {
            onHover: setHoveredMilAircraft,
            onClick: isCiv ? handleCivAircraftSelect : handleMilAircraftSelect,
          },
          {
            lang: labelLanguage,
            palette: isCiv ? "civil" : "military",
          },
        );
      }
      if (item.displayKind === "ais-html") {
        const mapBearingDeg =
          typeof (item as { mapBearingDeg?: number }).mapBearingDeg === "number"
            ? ((item as unknown as { mapBearingDeg: number }).mapBearingDeg)
            : 0;
        return createAisVesselBadge(
          item,
          {
            onHover: (vessel) => {
              if (!vessel) {
                handleHtmlMarkerHover(null);
                return;
              }
              handleHtmlMarkerHover({
                ...vessel,
                markerId: item.markerId,
                displayKind: "ais",
              });
            },
            onClick: (vessel) => {
              skipNextGlobeClickRef.current = true;
              openSelection({ kind: "ais", item: vessel });
              flyTo(vessel.lat, vessel.lng, 0.45);
            },
          },
          { lang: labelLanguage, mapBearingDeg },
        );
      }
      if (item.displayKind === "gdelt-tag-html") {
        return createGdeltLocationTagBadge(
          item,
          alt,
          {
            onHover: handleHtmlMarkerHover,
            onClick: (event) => {
              openIntelFromCoords(event.lat, event.lng, 0.92);
            },
          },
        );
      }
      if (item.displayKind === "ukraine-gdelt-neon") {
        return createUkraineGdeltNeonBadge(
          item,
          labelLanguage === "en" ? "en" : "ko",
          {
            onHover: (ev) => {
              if (!ev) {
                handleHtmlMarkerHover(null);
                return;
              }
              handleHtmlMarkerHover(ev);
            },
            onClick: (event) => {
              skipNextGlobeClickRef.current = true;
              openIntelFromCoords(event.lat, event.lng, 0.92);
            },
          },
        );
      }
      if (item.displayKind === "situation-callout") {
        return createSituationCalloutBadge(item);
      }
      if (item.displayKind === "casualty-skull") {
        return createCasualtySkullBadge(item, alt);
      }
      if (item.displayKind === "china-theater-incident") {
        return createChinaTheaterIncidentBadge(
          item,
          labelLanguage === "en" ? "en" : "ko",
          {
            onHover: (inc) => {
              if (!inc) {
                handleHtmlMarkerHover(null);
                return;
              }
              handleHtmlMarkerHover(inc as unknown as GlobeDisplayPoint);
            },
            onClick: (inc) => {
              skipNextGlobeClickRef.current = true;
              flyTo(inc.lat, inc.lng, 0.72);
              openIntelFromCoords(inc.lat, inc.lng, 0.92);
            },
          },
        );
      }
      if (item.displayKind === "korea-missile-incident") {
        return createKoreaMissileIncidentBadge(
          item,
          labelLanguage === "en" ? "en" : "ko",
          {
            onHover: (inc) => {
              if (!inc) {
                handleHtmlMarkerHover(null);
                return;
              }
              handleHtmlMarkerHover(inc as unknown as GlobeDisplayPoint);
            },
            onClick: (inc) => {
              skipNextGlobeClickRef.current = true;
              flyTo(inc.lat, inc.lng, 0.72);
              openIntelFromCoords(inc.lat, inc.lng, 0.92);
            },
          },
        );
      }
      if (item.displayKind === "newfeeds-attack") {
        return createIranNewsNeonBadge(
          item as IranNewsNeonAttack,
          labelLanguage === "en" ? "en" : "ko",
          {
            onHover: (atk) => {
              if (!atk) {
                handleHtmlMarkerHover(null);
                return;
              }
              handleHtmlMarkerHover(atk as unknown as GlobeDisplayPoint);
            },
            onClick: (atk) => {
              skipNextGlobeClickRef.current = true;
              handleAirRaidFocus(
                {
                  lat: atk.lat,
                  lng: atk.lng,
                  label: atk.location || atk.title,
                },
                "newfeeds",
              );
            },
          },
        );
      }
      if (item.displayKind === "nuclear-icbm") {
        return createNuclearStockpileBadge(
          item,
          labelLanguage === "en" ? "en" : "ko",
          alt,
        );
      }
      if (item.displayKind === "ua-settlement-html") {
        return createUkraineSettlementLabelElement(
          normalizeLabelText(item.name) || "마을",
          item.tier,
        );
      }
      if (item.displayKind === "neptun-html") {
        return createNeptunThreatBadge(item, {
          onHover: setHoveredNeptunThreat,
          onClick: handleNeptunThreatSelect,
        });
      }
      if (item.displayKind === "neptun-impact") {
        return createNeptunImpactFlashElement(item);
      }
      if (item.displayKind === "friction-pin") {
        return createFrictionPinElement(item.color, item.label);
      }
      if (item.displayKind === "friction-stage") {
        return createFrictionStageCalloutElement(item.order, item.label, item.active, () => {
          const deep = frictionDeepDoc(activeFrictionEpisode?.id ?? "");
          const stage = deep?.stages.find((st) => st.id === item.id);
          if (stage) selectFrictionStage(stage);
        });
      }
      if (item.displayKind === "static" && isHtmlStaticKind(item.kind)) {
        return createInfraStaticBadge(
          item,
          {
            onHover: (p) => handleHtmlMarkerHover(p as GlobeDisplayPoint | null),
          },
          { lang: labelLanguage },
        );
      }
      return createAirportPortBadge(item as StaticGlobePoint, handleHtmlMarkerHover, alt);
    },
    [
      activeFrictionEpisode?.id,
      flyTo,
      handleAirRaidFocus,
      handleCarrierSelect,
      handleCivAircraftSelect,
      handleHtmlMarkerHover,
      handleMilAircraftSelect,
      handleNeptunThreatSelect,
      labelLanguage,
      openIntelFromCoords,
      openSelection,
      selectFrictionStage,
      usCarrierLabelOffsets,
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
        openSelection({ kind: "mil", item: point, traffic: "military" });
        flyTo(point.lat, point.lng, 0.55);
        return;
      }
      if (point.displayKind === "ais") {
        skipNextGlobeClickRef.current = true;
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
      if (
        point.displayKind === "static" &&
        (point.kind === "chokepoint" ||
          point.kind === "logistics-hub" ||
          point.kind === "submarine-tunnel")
      ) {
        flyTo(point.lat, point.lng, 0.72);
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
        { lat: point.lat, lng: point.lng, label: point.location || point.title },
        "newfeeds",
      );
      return;
    }
    if (point.displayKind === "event") {
      handlePointClick(point);
    }
  }

  function handlePathClick(path: TransportPath) {
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
      flyTo(feature.center.lat, feature.center.lng, 0.55);
      return;
    }

    if (feature.polygonLayer === "conflict-zone") {
      openIntelFromCoords(feature.center.lat, feature.center.lng, 0.85);
      return;
    }

    if (isUkraineViinaPolygonLayer(feature.polygonLayer)) {
      openSelection({ kind: "ukraine-control", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 0.72);
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
        cameraAltitude={layerAltitude}
        globeLodTier={globeLod.tier}
        wtiScore={wtiSnapshot?.score ?? null}
      />

      {!intelSheetOpen ? (
      <HoverNav
        viewerMode={viewerMode}
        onNavigate={handleNavNavigate}
        lastUpdated={liveUpdatedAt || data.generatedAt || null}
        liveStatus={liveStatus}
        query={query}
        onQueryChange={setQuery}
        searchResults={searchResults}
        onSearchSelect={handleSearchSelect}
        compact={isCompactUi}
        belowNav={<ViewModeSwitcher mode={viewerMode} onChange={handleViewerModeChange} />}
        compactMenuExtra={
          isCompactUi ? (
            <>
              {!showLeftPanel && !econNavSelection ? (
                <ExplorationTabs
                  presets={isEconomyViewer ? ECON_EXPLORATION_PRESETS : EXPLORATION_PRESETS}
                  activeId={regionNavSelection?.id ?? null}
                  onSelect={handleExplorationSelect}
                  variant={isEconomyViewer ? "hubs" : "fronts"}
                  align="stretch"
                  label={t(
                    isEconomyViewer ? "hoverExplorationHubs" : "hoverExplorationFronts",
                    labelLanguage,
                  )}
                  hint={t(
                    isEconomyViewer ? "hoverExplorationHubsHint" : "hoverExplorationFrontsHint",
                    labelLanguage,
                  )}
                />
              ) : null}
              {isEconomyViewer ? (
                <EconomySupplyChainFixedToggle
                  showUsDfc={showUsDfcSupplyChain}
                  showChinaBri={showBriTradeConnectivity}
                  onUsDfcChange={setShowUsDfcSupplyChain}
                  onChinaBriChange={setShowBriTradeConnectivity}
                  usLinkCount={usDfcSupplyPaths.length}
                  chinaLinkCount={briTradePaths.length}
                />
              ) : null}
              {!showLeftPanel ? (
                <CompactPresetChips
                  mode={viewerMode}
                  activeId={compactChipId}
                  lang={labelLanguage}
                  onSelect={handleCompactChipSelect}
                />
              ) : null}
              <div className="flex items-center gap-2">
                <ShareViewButton getCanvas={() => globeRef.current?.renderer().domElement ?? null} />
              </div>
            </>
          ) : null
        }
      />
      ) : null}

      {activeHubId && hubFocusMode === "arms" && axisArmsPayload && !hubBriefOpen ? (
        <AxisArmsPanel
          hubId={activeHubId}
          deals={filterArmsForHub(axisArmsPayload, activeHubId).deals}
          citation={axisArmsPayload.citation}
          lang={labelLanguage}
          onClose={() => {
            clearHubBriefTimer();
            setHubBriefOpen(false);
            setRegionNavSelection(null);
          }}
        />
      ) : null}

      {hubFocusMode === "regime" && !hubBriefOpen && !regimeSelectedEpisodeId ? (
        <AxisRegimePanel
          hubId={activeHubId}
          selectedEpisodeId={regimeSelectedEpisodeId}
          onSelectEpisode={(episode) => {
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
          onClose={exitHistoryImmersion}
        />
      ) : null}

      {historyImmersionActive && activeFrictionEpisode && !hubBriefOpen ? (
        <FrictionHistoryChrome
          episode={activeFrictionEpisode}
          lang={labelLanguage}
          activeStageId={frictionActiveStageId}
          onSelectStage={selectFrictionStage}
          onExitHistory={exitHistoryImmersion}
          onOpenBrief={() => setFrictionEpisodeBrief(activeFrictionEpisode)}
          onBackToList={() => {
            setFrictionEpisodeBrief(null);
            setRegimeSelectedEpisodeId(null);
            setFrictionActiveStageId(null);
          }}
        />
      ) : null}

      <NewsStreamProvider
        visible={
          !showLeftPanel &&
          (intelSheetOpen ||
            regionNavSelection != null ||
            econNavSelection != null ||
            (!selected && !isUkraineTheaterFocus))
        }
        theaterFilter={intelTheaterFilter}
        onTheaterFilterChange={setIntelTheaterFilter}
        viewPackages={viewPackages}
        labelLanguage={labelLanguage}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
      <section
        ref={mapSectionRef}
        className="relative min-h-0 flex-1 w-full"
        onMouseMove={handleMapPointerMove}
        onMouseLeave={handleMapPointerLeave}
      >
        <div
          ref={containerRef}
          className="relative h-full w-full"
          style={{ backgroundColor: globeTextures.backgroundColor }}
        >
          <div className="absolute inset-0 z-10">
          <PausedMapGlobeView
              interactionPaused={showLeftPanel}
              ref={globeRef}
              mapStyleUrl={globeTextures.mapStyleUrl}
              backgroundColor={globeTextures.backgroundColor}
              interactiveLayerIds={mapInteractiveLayerIds}
              showIslandChains={showIslandChains}
              onGlobeReady={configureGlobe}
              onGlobeMouseMove={handleGlobeMouseMove}
              heatmapsData={tensionHeatmaps}
              heatmapPoints={(layer: { points: { lat: number; lng: number; weight: number }[] }) =>
                layer.points
              }
              heatmapPointLat={(point: { lat: number }) => point.lat}
              heatmapPointLng={(point: { lng: number }) => point.lng}
              heatmapPointWeight={(point: { weight: number }) => point.weight}
              heatmapBandwidth={(layer: { bandwidth: number }) => layer.bandwidth}
              heatmapColorSaturation={(layer: { colorSaturation: number }) =>
                isCameraMoving
                  ? Math.max(0.45, layer.colorSaturation * 0.7)
                  : layer.colorSaturation
              }
              heatmapColorFn={(layer: { tier: "war" | "diplomatic" }) =>
                layer.tier === "war" ? warHeatmapColor : diplomaticHeatmapColor
              }
              heatmapBaseAltitude={() => 0.003}
              heatmapTopAltitude={() => (isCameraMoving ? 0.0048 : 0.006)}
              heatmapsTransitionDuration={0}
              pointsData={globeDisplayPoints}
              firmsFiresData={firmsDisplayPoints}
              firmsLat={(fire: FirmsFireGlobePoint) => fire.lat}
              firmsLng={(fire: FirmsFireGlobePoint) => fire.lng}
              firmsCause={(fire: FirmsFireGlobePoint) => fire.soundKind}
              firmsFrp={(fire: FirmsFireGlobePoint) => fire.frp}
              firmsAngularRadius={(fire: FirmsFireGlobePoint) => {
                const frp = fire.frp ?? 0;
                const base = frp >= 50 ? 0.28 : frp >= 20 ? 0.22 : 0.17;
                return base * getZoomOutScale(viewState.altitude);
              }}
              pointLat={(point: GlobeDisplayPoint) => point.lat}
              pointLng={(point: GlobeDisplayPoint) => point.lng}
              pointColor={(point: GlobeDisplayPoint) => {
                if (point.displayKind === "static") {
                  if (point.kind === "critical-node") {
                    const risk = String(point.meta?.risk ?? "");
                    const role = String(point.meta?.focusRole ?? "");
                    if (role === "primary") return "rgba(250, 204, 21, 0.98)";
                    if (role === "cascade") return "rgba(52, 211, 153, 0.95)";
                    if (risk === "critical") return "rgba(251, 113, 133, 0.95)";
                    if (risk === "high") return "rgba(251, 191, 36, 0.92)";
                    return "rgba(110, 231, 183, 0.88)";
                  }
                  return STATIC_POINT_COLORS[point.kind];
                }
                if (point.displayKind === "mil") return "rgba(248, 113, 113, 0.92)";
                if (point.displayKind === "ais") {
                  if (point.category === "military") {
                    const hex = aisMilitaryKindColor(point.militaryKind);
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, 0.92)`;
                  }
                  return aisCommercialPointColor(point.shipType);
                }
                if (point.displayKind === "firms-fire") {
                  return INTEL_NASA_FIRE;
                }
                if (point.displayKind === "tzeva-adom") {
                  return TZEVA_ADOM_MARKER;
                }
                if (point.displayKind === "newfeeds-attack") {
                  return severityColor(point.severity);
                }
                if (point.displayKind === "conflict-cluster") {
                  if (point.tension === "high") return "rgba(239, 68, 68, 0.92)";
                  if (point.tension === "medium") return "rgba(249, 115, 22, 0.9)";
                  return "rgba(250, 204, 21, 0.88)";
                }

                return "rgba(148, 163, 184, 0.8)";
              }}
              pointRadius={(point: GlobeDisplayPoint) => {
                const alt = viewState.altitude;
                if (point.displayKind === "static") return staticPointRadius(point.kind, alt);
                if (point.displayKind === "mil") return 0.22 * getZoomOutScale(alt);
                if (point.displayKind === "ais") {
                  return (point.category === "military" ? 0.2 : 0.14) * getZoomOutScale(alt);
                }
                if (point.displayKind === "firms-fire") {
                  const frp = point.frp ?? 0;
                  const base = frp >= 50 ? 0.28 : frp >= 20 ? 0.22 : 0.17;
                  return base * getZoomOutScale(alt);
                }
                if (point.displayKind === "tzeva-adom") {
                  return (point.active ? 0.42 : 0.28) * getZoomOutScale(alt);
                }
                if (point.displayKind === "newfeeds-attack") {
                  const base =
                    point.severity === "major"
                      ? 0.18
                      : point.severity === "high"
                        ? 0.15
                        : point.severity === "medium"
                          ? 0.12
                          : 0.1;
                  return base * getZoomOutScale(alt);
                }
                if (point.displayKind === "conflict-cluster") {
                  const base = point.tension === "high" ? 0.55 : point.tension === "medium" ? 0.42 : 0.32;
                  return (
                    Math.min(0.7, base + Math.log10(Math.max(10, point.eventCount)) * 0.08) *
                    getZoomOutScale(alt)
                  );
                }

                return 0.15 * getZoomOutScale(alt);
              }}
              pointAltitude={() => 0.004}
              pointResolution={
                viewState.altitude < EXTREME_ZOOM_ALTITUDE ? 6 : isCameraMoving ? 8 : 14
              }
              pointsMerge={false}
              pointLabel={(point: GlobeDisplayPoint) => {
                if (point.displayKind === "static") {
                  const metaLines = point.meta
                    ? Object.entries(point.meta)
                        .filter(([, value]) => value != null && value !== "")
                        .slice(0, 3)
                        .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(String(value))}`)
                        .join("<br/>")
                    : "";
                  return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(STATIC_KIND_LABELS[point.kind])}</strong><br/>
                    ${escapeHtml(point.name)}
                    ${metaLines ? `<br/>${metaLines}` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "mil") {
                  return `
                  <div style="max-width: 280px">
                    <strong>군사 항공기 (ADS-B)</strong><br/>
                    ${escapeHtml(point.callsign || point.hex)}
                    ${point.type ? `<br/>기종 ${escapeHtml(point.type)}` : ""}
                    ${point.registration ? `<br/>등록 ${escapeHtml(point.registration)}` : ""}
                    ${point.altitude != null ? `<br/>고도 ${escapeHtml(String(point.altitude))} ft` : ""}
                    ${point.groundSpeed != null ? `<br/>속도 ${escapeHtml(String(point.groundSpeed))} kn` : ""}
                    ${point.track != null ? `<br/>침로 ${escapeHtml(String(Math.round(point.track)))}°` : ""}
                    ${point.squawk ? `<br/>스쿼크 ${escapeHtml(point.squawk)}` : ""}
                    ${point.emergency ? `<br/>비상 ${escapeHtml(point.emergency)}` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "ais") {
                  const kind =
                    point.category === "military"
                      ? "군용 함정"
                      : point.category === "commercial"
                        ? "민간 선박"
                        : "선박";
                  const typeLabel = aisDisplayTypeLabel(point, labelLanguage);
                  return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(kind)} (AIS)</strong><br/>
                    ${escapeHtml(point.shipName || `MMSI ${point.mmsi}`)}
                    ${typeLabel ? `<br/>유형 ${escapeHtml(typeLabel)}` : ""}
                    ${point.speedOverGround != null ? `<br/>속력 ${escapeHtml(String(point.speedOverGround))} kn` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "firms-fire") {
                  const isBomb = firmsCombatFireIds.includes(point.id);
                  return `
                  <div style="max-width: 280px">
                    <strong>${isBomb ? "폭격·화재 추정 (NASA FIRMS)" : "위성 화재 탐지 (NASA FIRMS)"}</strong><br/>
                    ${isBomb ? "전쟁 뉴스 인근 열감지<br/>" : ""}
                    ${point.acqDate ? `관측 ${escapeHtml(point.acqDate)}` : "관측 시각 미상"}
                    ${point.acqTime ? ` ${escapeHtml(point.acqTime)} UTC` : ""}
                    ${point.frp != null ? `<br/>FRP ${escapeHtml(String(point.frp))} MW` : ""}
                    ${point.confidence ? `<br/>신뢰도 ${escapeHtml(point.confidence)}` : ""}
                    ${point.satellite ? `<br/>${escapeHtml(point.satellite)}` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "conflict-cluster") {
                  return `
                  <div style="max-width: 280px">
                    <strong>AI 전쟁지역 (데모)</strong><br/>
                    ${escapeHtml(point.name)}<br/>
                    이벤트 ${point.eventCount.toLocaleString()} · 긴장도 ${escapeHtml(point.tension)}
                  </div>
                `;
                }
                if (point.displayKind === "tzeva-adom") {
                  const regionKo = translateOrefRegion(point.region || "", labelLanguage);
                  const titleKo = translateOrefTitle(point.title || point.region || "", labelLanguage);
                  return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(tzevaUi("brand", labelLanguage))}</strong><br/>
                    ${escapeHtml(titleKo)}
                    ${regionKo ? `<br/>${escapeHtml(regionKo)}` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "newfeeds-attack") {
                  const sevLabel = severityLabel(point.severity, labelLanguage);
                  const sevHint = severityHint(point.severity, labelLanguage);
                  return `
                  <div style="max-width: 300px">
                    <strong>${escapeHtml(NEWFEEDS_ATTRIBUTION_SHORT)} · Iran</strong><br/>
                    <span style="opacity:.9">${escapeHtml(sevLabel)}</span>
                    <span style="opacity:.65"> — ${escapeHtml(sevHint)}</span><br/>
                    ${escapeHtml(point.title)}
                    ${point.summary ? `<br/><span style="opacity:.8">${escapeHtml(point.summary.slice(0, 160))}${point.summary.length > 160 ? "…" : ""}</span>` : ""}
                    ${point.location ? `<br/>${escapeHtml(point.location)}` : ""}
                    ${point.category ? `<br/>${escapeHtml(point.category)}` : ""}
                    <br/><span style="opacity:.75">${escapeHtml(point.sourceName)} · ${escapeHtml(NEWFEEDS_ATTRIBUTION_SHORT)}</span>
                  </div>
                `;
                }
                if (point.displayKind !== "event") return "";

                const tier = point.eventTier ?? "war";
                return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(TIER_LABELS[tier])}</strong>
                    ${isFreshEvent(point) ? " · <span style='color:#facc15'>최신 속보</span>" : ""}<br/>
                    ${escapeHtml(point.category)}${point.eventDate ? ` · ${escapeHtml(point.eventDate)}` : ""}<br/>
                    ${point.actor1Country || point.actor2Country ? `행위자 ${escapeHtml(point.actor1Country || "?")} ↔ ${escapeHtml(point.actor2Country || "?")}<br/>` : ""}
                    ${escapeHtml(hostFromUrl(point.sourceUrl))}
                  </div>
                `;
              }}
              onPointHover={(point: GlobeDisplayPoint | null) => {
                setHoveredPoint(point);
              }}
              onPointClick={(point: GlobeDisplayPoint) => handleGlobePointClick(point)}
              ringsData={conflictClusterRings}
              ringLat={(point: PulseRingPoint) => point.lat}
              ringLng={(point: PulseRingPoint) => point.lng}
              ringAltitude={() => 0.005}
              ringColor={(point: PulseRingPoint) => {
                if (point.pulseKind === "choke-glow") {
                  return `rgba(251, 146, 60, ${0.22 + point.glow * 0.28})`;
                }
                if (point.pulseKind === "claim" || point.pulseKind === "friction") {
                  return point.color;
                }
                if (point.pulseKind === "firms-bomb") {
                  const frp = point.frp ?? 0;
                  if (frp >= 50) return "rgba(255, 69, 0, 0.7)";
                  if (frp >= 20) return "rgba(239, 68, 68, 0.62)";
                  return "rgba(251, 146, 60, 0.55)";
                }
                if (point.tension === "high") return "rgba(239,68,68,0.55)";
                if (point.tension === "medium") return "rgba(249,115,22,0.5)";
                return "rgba(250,204,21,0.45)";
              }}
              ringMaxRadius={(point: PulseRingPoint) => {
                const scale = getZoomOutScale(viewState.altitude);
                if (point.pulseKind === "choke-glow") {
                  return (2.4 + point.glow * 2.2) * scale;
                }
                if (point.pulseKind === "claim" || point.pulseKind === "friction") {
                  return point.radiusScale * scale;
                }
                if (point.pulseKind === "firms-bomb") {
                  const frp = point.frp ?? 0;
                  const base = frp >= 50 ? 2.4 : frp >= 20 ? 1.9 : 1.45;
                  return base * scale;
                }
                const base =
                  point.tension === "high" ? 1.8 : point.tension === "medium" ? 1.35 : 1.0;
                return base * scale;
              }}
              ringPropagationSpeed={(point: PulseRingPoint) => {
                if (point.pulseKind === "choke-glow") return 0.55;
                if (point.pulseKind === "claim" || point.pulseKind === "friction") return 0.85;
                return 2.2;
              }}
              htmlElementsData={htmlOverlayMarkers}
              htmlLat={(point: HtmlOverlayMarker) => point.lat}
              htmlLng={(point: HtmlOverlayMarker) => point.lng}
              htmlAltitude={(point: HtmlOverlayMarker) =>
                point.displayKind === "casualty-skull" ? 0.0008 : 0.004
              }
              htmlElement={createHtmlOverlayElement}
              htmlRotation={(point: HtmlOverlayMarker) => {
                if (point.displayKind === "mil-html" || point.displayKind === "civ-html") {
                  return milAircraftMarkerRotationDeg(point);
                }
                if (point.displayKind === "ais-html") {
                  // 수상전투함·잠수함: 8방위 실루엣이 진행 방향을 담음 → Marker 회전 없음
                  if (isAisAspectHullMarker(point.militaryKind)) return 0;
                  return aisVesselHeadingDeg(point) ?? 0;
                }
                return 0;
              }}
              htmlRotationAlignment={(point: HtmlOverlayMarker) => {
                if (point.displayKind === "mil-html" || point.displayKind === "civ-html") {
                  return "map";
                }
                if (point.displayKind === "ais-html") {
                  if (isAisAspectHullMarker(point.militaryKind)) return "viewport";
                  return "map";
                }
                return "viewport";
              }}
              htmlElementVisibilityModifier={(el: HTMLElement, isVisible: boolean) => {
                el.style.opacity = isVisible ? "1" : "0";
                applyHtmlOverlayPointerEvents(el, isVisible);
                if (el.classList.contains(CARRIER_MARKER_ROOT_CLASS)) {
                  const stackY = Number(el.dataset.stackOffsetY || 0);
                  el.style.transform = isVisible
                    ? `translate(-50%, calc(-50% + ${stackY}px)) scale(1)`
                    : `translate(-50%, calc(-50% + ${stackY}px)) scale(0.86)`;
                  return;
                }
                if (el.classList.contains("casualty-skull-marker")) {
                  const span = Number(el.dataset.territorySpan || 10);
                  const scale = getCasualtyOverlayScale(
                    layerAltitudeRef.current,
                    Number.isFinite(span) ? span : 10,
                  );
                  applyCasualtyOverlayMetrics(el, scale, isVisible);
                  el.style.pointerEvents = isVisible ? "auto" : "none";
                  return;
                }
                if (el.classList.contains("nuclear-icbm-marker")) {
                  const scale = getNuclearOverlayScale(layerAltitudeRef.current);
                  applyNuclearOverlayScale(el, scale, isVisible);
                  el.style.pointerEvents = isVisible ? "auto" : "none";
                  return;
                }
                if (el.classList.contains("gdelt-news-alert-marker")) {
                  el.style.transform = isVisible
                    ? "translate(-50%, -100%) scale(1)"
                    : "translate(-50%, -100%) scale(0.86)";
                  return;
                }
                if (el.classList.contains("friction-episode-pin") || el.classList.contains("friction-stage-callout")) {
                  el.style.transform = isVisible
                    ? "translate(-50%, -100%) scale(1)"
                    : "translate(-50%, -100%) scale(0.86)";
                  return;
                }
                el.style.transform = isVisible
                  ? "translate(-50%, -50%) scale(1)"
                  : "translate(-50%, -50%) scale(0.86)";
              }}
              htmlTransitionDuration={isViinaCloseZoom && showUkraineControl ? 0 : 280}
              labelsData={globeLabels}
              labelLat={(item: GlobeLabel) => item.lat}
              labelLng={(item: GlobeLabel) => item.lng}
              labelText={(item: GlobeLabel) => getSafePlaceLabel(item, labelLanguage)}
              labelSize={(item: GlobeLabel) =>
                getPlaceLabelSize(
                  getPlaceLabelTier(item.population, item.type, item.scalerank),
                  viewState.altitude,
                )
              }
              labelIncludeDot={() => true}
              labelDotRadius={(item: GlobeLabel) =>
                getPlaceLabelDotRadius(
                  getPlaceLabelTier(item.population, item.type, item.scalerank),
                  viewState.altitude,
                )
              }
              labelColor={(item: GlobeLabel) => {
                const tier = getPlaceLabelTier(item.population, item.type, item.scalerank);
                return getPlaceLabelColor(tier, showCityLabels);
              }}
              labelResolution={2}
              labelsTransitionDuration={0}
              labelAltitude={() => 0.006}
              polygonsData={polygonDataWithUkraine}
              polygonGeoJsonGeometry={(feature: PolygonLayerFeature) => feature.geometry}
              polygonCapColor={(feature: PolygonLayerFeature) => {
                if (feature.polygonLayer === "country") {
                  if (
                    hubHighlightIsos &&
                    feature.isoA3 &&
                    hubHighlightIsos.has(feature.isoA3) &&
                    activeHubId
                  ) {
                    const isHub = feature.isoA3 === hubById(activeHubId)?.iso;
                    return isHub
                      ? AXIS_HUB_META[activeHubId].color.replace(/,\s*[\d.]+\)$/, ", 0.28)")
                      : AXIS_HUB_META[activeHubId].color.replace(/,\s*[\d.]+\)$/, ", 0.14)");
                  }
                  return COUNTRY_TEXTURE_MODE_FILL;
                }
                if (feature.polygonLayer === "military-base") return US_BASE_FILL;
                if (feature.polygonLayer === "conflict-zone") {
                  return COUNTRY_TEXTURE_MODE_FILL;
                }
                if (feature.polygonLayer === "ukraine-ru") return UKRAINE_RU_FILL;
                if (feature.polygonLayer === "ukraine-ua") return UKRAINE_UA_FILL;
                if (feature.polygonLayer === "ukraine-contested") return UKRAINE_CONTESTED_FILL;
                return COUNTRY_TEXTURE_MODE_FILL;
              }}
              polygonFillOpacity={(feature: PolygonLayerFeature) => {
                if (isUkraineViinaPolygonLayer(feature.polygonLayer)) return 1;
                return 0.72;
              }}
              // sideColor 미설정 — falsy(undefined)는 polished 파서에서 런타임 오류 유발
              polygonStrokeColor={(feature: PolygonLayerFeature) => {
                if (feature.polygonLayer === "country") {
                  if (
                    hubHighlightIsos &&
                    feature.isoA3 &&
                    hubHighlightIsos.has(feature.isoA3) &&
                    activeHubId
                  ) {
                    return AXIS_HUB_META[activeHubId].color;
                  }
                  return POLYGON_NO_STROKE;
                }
                if (feature.polygonLayer === "military-base") return US_BASE_STROKE;
                if (feature.polygonLayer === "conflict-zone") return "rgba(248,113,113,0.7)";
                if (feature.polygonLayer === "ukraine-ru") return UKRAINE_RU_STROKE;
                if (feature.polygonLayer === "ukraine-ua") return UKRAINE_UA_STROKE;
                if (feature.polygonLayer === "ukraine-contested") return UKRAINE_CONTESTED_STROKE;
                return POLYGON_NO_STROKE;
              }}
              polygonAltitude={(feature: PolygonLayerFeature) => {
                if (feature.polygonLayer === "country") return COUNTRY_FILL_ALTITUDE;
                if (feature.polygonLayer === "military-base") return US_BASE_ALTITUDE;
                if (feature.polygonLayer === "conflict-zone") return CONFLICT_ZONE_ALTITUDE;
                if (isUkraineViinaPolygonLayer(feature.polygonLayer)) {
                  return UKRAINE_CONTROL_ALTITUDE;
                }
                return COUNTRY_FILL_ALTITUDE;
              }}
              polygonsTransitionDuration={0}
              polygonLabel={(feature: PolygonLayerFeature) => {
                if (isViinaCloseZoom && isUkraineViinaPolygonLayer(feature.polygonLayer)) {
                  return "";
                }
                if (feature.polygonLayer === "country") {
                  return `
                      <div style="max-width: 280px">
                        <strong>${escapeHtml(feature.name)}</strong><br/>
                        ${escapeHtml(feature.nameLong || feature.name)}
                        ${feature.isoA3 ? `<br/>${escapeHtml(feature.isoA3)}` : ""}
                        ${feature.continent ? ` · ${escapeHtml(feature.continent)}` : ""}
                      </div>
                    `;
                }

                if (feature.polygonLayer === "military-base") {
                  const meta = [
                    feature.component,
                    feature.jointBase,
                    feature.state,
                    feature.country,
                  ]
                    .filter(Boolean)
                    .map((value) => escapeHtml(String(value)))
                    .join(" · ");
                  return `
                      <div style="max-width: 300px">
                        <strong>미군기지</strong><br/>
                        ${escapeHtml(feature.name)}
                        ${meta ? `<br/>${meta}` : ""}
                      </div>
                    `;
                }

                if (feature.polygonLayer === "conflict-zone") {
                  const aiLine =
                    typeof feature.aiScore === "number"
                      ? `<br/>AI 신뢰도 ${feature.aiScore}%`
                      : "";
                  return `
                      <div style="max-width: 300px">
                        <strong>AI 전쟁지역 (데모)</strong><br/>
                        ${escapeHtml(feature.name)}<br/>
                        이벤트 ${feature.eventCount.toLocaleString()} · 긴장도 ${escapeHtml(feature.tension)}${aiLine}
                      </div>
                    `;
                }

                return "";
              }}
              onPolygonClick={(feature: PolygonLayerFeature) => handlePolygonClick(feature)}
              onPolygonHover={
                isCompactUi
                  ? undefined
                  : (feature: PolygonLayerFeature | null) => {
                      setHoveredPolygon(feature);
                    }
              }
              pathsData={globePaths}
              priorityPathsData={airRaidFocusPaths}
              focusFillGeoJson={
                airRaidFocusBox
                  ? {
                      type: "FeatureCollection",
                      features: [
                        {
                          type: "Feature",
                          properties: {
                            fill: "rgba(185, 28, 28, 0.34)",
                            fillOpacity: 0.34,
                          },
                          geometry: airRaidFocusBoxPolygon(airRaidFocusBox),
                        },
                      ],
                    }
                  : null
              }
              ukraineMacroGeoJson={ukraineMacroGeoJson}
              ukraineMicroGeoJson={ukraineMicroGeoJson}
              axisHubCountriesGeoJson={axisHubCountriesGeoJson}
              pathPoints={(path: TransportPath) => path.points}
              pathPointLat={(point: { lat: number; lng: number }) => point.lat}
              pathPointLng={(point: { lat: number; lng: number }) => point.lng}
              pathPointAlt={(point: { lat: number; lng: number; alt?: number }) => point.alt ?? 0}
              pathResolution={(path: TransportPath) =>
                path.kind === "neptun-trail" ||
                path.kind === "neptun-projection" ||
                path.kind === "neptun-trail-archived"
                  ? neptunPathElevation === "elevated"
                    ? 2.2
                    : neptunPathElevation === "low"
                      ? 1.8
                      : 1.4
                  : 2
              }
              pathsTransitionDuration={0}
              pathColor={(path: TransportPath) => {
                if (path.accentColor) return path.accentColor;
                if (path.kind === "coastline") return globeTextures.coastlineColor;
                if (path.kind === "country-border") {
                  return globeTextures.vectorBase ? globeTextures.borderColor : COUNTRY_BORDER_PATH_COLOR;
                }
                if (FLOW_PATH_KINDS.has(path.kind)) return INTEL_MISSILE_ARC;
                if (path.kind === "dispute-boundary") return "rgba(251, 191, 36, 0.92)";
                if (path.kind === "dispute-zone") {
                  const dispute = disputeFromPath(path);
                  if (dispute) return getDisputeOutlineColor(dispute);
                  const zone = conflictZoneFromPath(path);
                  if (zone) return getConflictZoneOutlineColor(zone);
                  return "rgba(251, 146, 60, 0.92)";
                }
                if (path.kind === "dispute-hatch") {
                  const dispute = disputeFromPath(path);
                  return dispute ? getDisputeHatchColor(dispute) : "rgba(251, 146, 60, 0.55)";
                }
                if (path.kind === "conflict-hatch") {
                  const grade = parseConflictHatchGrade(path.id);
                  if (grade) return TENSION_GRADE_STYLES[grade].hatch;
                  const zone = conflictZoneFromPath(path);
                  if (zone) return getConflictZoneHatchColor(zone);
                  return TENSION_GRADE_STYLES.medium.hatch;
                }
                if (path.kind === "shipping-lane") return PATH_LAYER_COLORS["shipping-lane"];
                if (path.kind === "submarine-cable") return PATH_LAYER_COLORS["submarine-cable"];
                if (path.kind === "oil-pipeline") return PATH_LAYER_COLORS["oil-pipeline"];
                if (path.kind === "gas-pipeline") return PATH_LAYER_COLORS["gas-pipeline"];
                if (path.kind === "arms-embargo") return ARMS_EMBARGO_STROKE;
                if (path.kind === "msr") return "rgba(250, 204, 21, 0.9)";
                if (
                  path.kind === "ukraine-ru-occupied" ||
                  path.kind === "ukraine-ru-occupied-hatch"
                ) {
                  return UKRAINE_RU_OCCUPIED_LINE;
                }
                if (
                  path.kind === "ukraine-ua-occupied" ||
                  path.kind === "ukraine-ua-occupied-hatch"
                ) {
                  return UKRAINE_UA_OCCUPIED_LINE;
                }
                if (
                  path.kind === "ukraine-ru-claim" ||
                  path.kind === "ukraine-ru-claim-hatch"
                ) {
                  return UKRAINE_RU_CLAIM_LINE;
                }
                if (
                  path.kind === "ukraine-ua-claim" ||
                  path.kind === "ukraine-ua-claim-hatch"
                ) {
                  return UKRAINE_UA_CLAIM_LINE;
                }
                if (path.kind === "ukraine-ua-front" || path.kind === "ukraine-ua-gain") {
                  return path.kind === "ukraine-ua-gain" ? UKRAINE_UA_GAIN_LINE : UKRAINE_UA_FRONT_LINE;
                }
                if (
                  path.kind === "ukraine-ru-front" ||
                  path.kind === "ukraine-contested-front"
                ) {
                  return UKRAINE_RU_FRONT_LINE;
                }
                if (path.kind === "ukraine-combat-zone") return UKRAINE_COMBAT_ZONE_LINE;
                if (path.kind === "ua-advance" || path.kind === "ua-axis") {
                  return UKRAINE_UA_FRONT_LINE;
                }
                if (path.kind === "ru-advance" || path.kind === "ru-axis") {
                  return UKRAINE_RU_FRONT_LINE;
                }
                return showRailGlow ? INFRA_COLORS.rail.glow : INFRA_COLORS.rail.dim;
              }}
              pathStroke={(path: TransportPath) => {
                if (isAirRaidFocusPath(path)) {
                  if (path.kind === "dispute-zone") return 4.2;
                  if (path.kind === "conflict-hatch") return 1.15;
                }
                if (path.kind === "neptun-trail") return 1.55;
                if (path.kind === "neptun-trail-archived") return 1.2;
                if (path.kind === "neptun-projection") return 1.05;
                if (path.kind === "axis-link") return 1.35;
                if (path.kind === "bri-trade") return briTradeStrokeWidth(path);
                if (path.kind === "us-dfc-supply") return usDfcSupplyStrokeWidth(path);
                if (path.kind === "coastline") return 0.38;
                if (path.kind === "country-border") {
                  return globeTextures.vectorBase
                    ? globeTextures.borderStrokeWidth
                    : 1.05;
                }
                if (path.kind === "dispute-boundary") return 0.52;
                if (path.kind === "dispute-zone") return 1.35;
                if (path.kind === "dispute-hatch") return 0.55;
                if (path.kind === "conflict-hatch") return 0.62;
                if (path.kind === "shipping-lane") return 0.48;
                // 해저 케이블·송유관·가스관: cableInverseLineWidth (줌아웃↑굵게 · 줌인→~0.1)
                if (
                  path.kind === "submarine-cable" ||
                  path.kind === "oil-pipeline" ||
                  path.kind === "gas-pipeline"
                ) {
                  return 0.1;
                }
                if (path.kind === "arms-embargo") return ARMS_EMBARGO_STROKE_WIDTH;
                if (path.kind === "msr") return 0.55;
                if (
                  path.kind === "ukraine-ru-occupied" ||
                  path.kind === "ukraine-ua-occupied" ||
                  path.kind === "ukraine-ru-claim" ||
                  path.kind === "ukraine-ua-claim"
                ) {
                  return ukraineThinOutlineStroke(globeLod.tier);
                }
                if (
                  path.kind === "ukraine-ru-occupied-hatch" ||
                  path.kind === "ukraine-ua-occupied-hatch" ||
                  path.kind === "ukraine-ru-claim-hatch" ||
                  path.kind === "ukraine-ua-claim-hatch"
                ) {
                  return ukraineHatchStroke(globeLod.tier);
                }
                if (path.kind === "ukraine-ua-gain") {
                  return ukraineThinOutlineStroke(globeLod.tier);
                }
                if (
                  path.kind === "ukraine-ru-front" ||
                  path.kind === "ukraine-contested-front" ||
                  path.kind === "ukraine-ua-front"
                ) {
                  return ukraineThinOutlineStroke(globeLod.tier);
                }
                if (path.kind === "ukraine-combat-zone") {
                  return ukraineCombatZoneStroke(globeLod.tier);
                }
                if (path.kind === "ua-advance" || path.kind === "ua-axis") {
                  return Math.max(0.85, ukraineThinOutlineStroke(globeLod.tier));
                }
                if (path.kind === "ru-advance" || path.kind === "ru-axis") {
                  return Math.max(0.85, ukraineThinOutlineStroke(globeLod.tier));
                }
                return showRailGlow ? INFRA_STROKE.rail.glow : INFRA_STROKE.rail.dim;
              }}
              pathDashLength={(path: TransportPath) => {
                if (path.kind === "neptun-projection") return 0.28;
                if (path.kind === "neptun-trail-archived") return 0.22;
                if (path.kind === "ua-advance" || path.kind === "ru-advance") return 0.42;
                if (path.kind === "ukraine-ru-claim" || path.kind === "ukraine-ua-claim") {
                  return 0.22;
                }
                return FLOW_PATH_KINDS.has(path.kind) ? 0.35 : 0;
              }}
              pathDashGap={(path: TransportPath) => {
                if (path.kind === "neptun-projection") return 0.16;
                if (path.kind === "neptun-trail-archived") return 0.14;
                if (path.kind === "ua-advance" || path.kind === "ru-advance") return 0.18;
                if (path.kind === "ukraine-ru-claim" || path.kind === "ukraine-ua-claim") {
                  return 0.14;
                }
                return FLOW_PATH_KINDS.has(path.kind) ? 0.12 : 0;
              }}
              pathDashAnimateTime={(path: TransportPath) => {
                if (
                  path.kind === "neptun-projection" ||
                  path.kind === "neptun-trail" ||
                  path.kind === "neptun-trail-archived"
                ) {
                  return 0;
                }
                return FLOW_PATH_KINDS.has(path.kind) ? 3500 : 0;
              }}
              pathLabel={(path: TransportPath) => {
                const lang = labelLanguage;
                const dispute =
                  path.kind === "dispute-zone" || path.kind === "dispute-hatch"
                    ? disputeFromPath(path)
                    : undefined;
                if (dispute) {
                  const overview = disputeOverviews.get(dispute.id);
                  const hatch = hatchStyleLabelLocalized(getDisputeHatchStyle(dispute), lang, Boolean(dispute && isCombatHazard(dispute)));
                  const combatLine = isCombatHazard(dispute)
                    ? `${escapeHtml(
                        lang === "en"
                          ? "Active combat · elevated risk"
                          : "실전투·폭격 · 피해가중",
                      )}<br/>`
                    : "";
                  const overviewLine = overview?.overviewKo
                    ? `<br/><span style="opacity:0.85">${escapeHtml(truncateOverview(overview.overviewKo, 180))}</span>`
                    : dispute.note
                      ? `<br/>${escapeHtml(dispute.note)}`
                      : "";
                  return `
                  <div style="max-width: 300px">
                    <strong>${escapeHtml(dispute.name)}</strong><br/>
                    ${escapeHtml(HOVER.disputeBorder(hatch, lang))}<br/>
                    ${combatLine}
                    ${escapeHtml(HOVER.tensionPrefix(tensionLabel(dispute.tension, lang), lang))}
                    ${overviewLine}
                    <br/><span style="opacity:0.6;font-size:10px">${escapeHtml(HOVER.hintDetail(lang))}</span>
                  </div>
                `;
                }
                const kindLabel = pathKindLabel(path.kind, lang);
                const lengthLabel =
                  path.lengthKm && Number.isFinite(path.lengthKm)
                    ? `<br/>${escapeHtml(HOVER.pathLength(path.lengthKm.toLocaleString(), lang))}`
                    : "";
                return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(path.name || kindLabel)}</strong><br/>
                    ${escapeHtml(kindLabel)}
                    ${lengthLabel}
                  </div>
                `;
              }}
              onPathHover={
                isCompactUi
                  ? undefined
                  : (path: TransportPath | null) => {
                      setHoveredPath(path);
                    }
              }
              onPathClick={(path: TransportPath) => handlePathClick(path)}
              onGlobeClick={(coords: { lat: number; lng: number }) => handleGlobeClick(coords)}
            />
          {loadError && (
            <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex justify-center sm:inset-x-auto sm:bottom-6 sm:max-w-md">
              <LoadErrorBanner message={loadError} compact />
            </div>
          )}
          {regionNavSelection &&
          !isEconomyViewer &&
          !selected &&
          !intelSheetOpen &&
          theaterFocusConfig ? (
            <TheaterDetailCta
              label={theaterFocusConfig.ctaLabel}
              onClick={flyToTheaterDetail}
            />
          ) : null}
          </div>
        </div>

        <UkraineFrontLegend
          visible={
            !isEconomyViewer &&
            ukraineFrontLegendEngaged &&
            showUkraineControl &&
            !intelSheetOpen &&
            !showLeftPanel &&
            (!selected || selected.kind === "neptun-threat")
          }
          dockLow={ukraineFrontLegendEngaged && showUkraineControl}
          controlDate={ukraineControlDate}
          lodLabel={
            viinaDisplay.lod.mode === "hidden"
              ? "줌인 필요"
              : viinaDisplay.lod.mode === "overview"
                ? "점령 개요"
                : "상세"
          }
        />
        <DisputeZoneLegend
          open={
            !isEconomyViewer &&
            showAnyDisputeOverlay &&
            showDisputeLegendPanel &&
            !isUkraineTheaterFocus &&
            !showLeftPanel &&
            !selected &&
            !regionNavSelection
          }
          onClose={() => setShowDisputeLegendPanel(false)}
        />
        {!isEconomyViewer &&
          !intelSheetOpen &&
          !showLeftPanel &&
          !selected &&
          !regionNavSelection &&
          !isUkraineTheaterFocus && (
          <div className="pointer-events-none absolute bottom-[calc(var(--bottom-intel-stack-clearance)+env(safe-area-inset-bottom,0px))] left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
            {showAnyDisputeOverlay && !showDisputeLegendPanel && (
              <LegendReopenButton
                label="전쟁·외교 긴장 범례"
                accent="orange"
                onClick={() => setShowDisputeLegendPanel(true)}
              />
            )}
          </div>
        )}
        {/* Telegram OSINT — Intel 시트 Telegram 탭과 중복 방지 (시트 닫힘 + 레이어 ON일 때만 미니 패널) */}
        {showTelegramOsint && !isEconomyViewer && !intelSheetOpen && !selected && !regionNavSelection && (
          <TelegramOsintPanel
            alerts={telegramAlerts}
            live={telegramLive}
            liveStatus={telegramStatus}
            needsAuth={telegramNeedsAuth}
            sessionExists={telegramSessionExists}
            embedMode={telegramEmbedMode}
            channelCount={TELEGRAM_CHANNEL_COUNT}
            onClose={closeTelegramOsintLayer}
            compactUi={isCompactUi}
          />
        )}
        {!isEconomyViewer && !isUkraineTheaterFocus && !selected && !regionNavSelection && bottomAlertPanel === "gdelt" && (
          <GdeltAlertPanel
            alerts={gdeltMenuCoreAlerts}
            liveStatus={gdeltLoading ? "loading" : gdeltError ? "error" : "ok"}
            errorMessage={gdeltError}
            onSelect={handleGdeltAlertSelect}
            onClose={() => setShowGdeltAlertPanel(false)}
          />
        )}
        {!isEconomyViewer && !isUkraineTheaterFocus && !selected && !regionNavSelection && bottomAlertPanel === "local" && (
          <LocalAlertPanel
            alerts={localDisputeAlerts}
            dataStatus={isLoading ? "loading" : loadError ? "error" : "ok"}
            errorMessage={loadError}
            onSelect={handleAlertSelect}
            onClose={() => setShowLocalAlertPanel(false)}
          />
        )}
        {!showLeftPanel && !selected && !regionNavSelection && !isCompactUi && hoverPointer && (
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
        )}
        {(() => {
          /** 모바일 우크라 전선: 스택은 접고 📰 FAB만 유지 (지도 가독성 + Intel 진입) */
          const ukraineHidesFullStack = isUkraineTheaterFocus && !isCompactUi;
          const fabOnly = Boolean(isCompactUi && isUkraineTheaterFocus);
          const stackVisible =
            !intelSheetOpen && !showLeftPanel && !selected && !ukraineHidesFullStack;
          return (
            <div
              className={stackVisible ? "contents" : "pointer-events-none invisible"}
              aria-hidden={!stackVisible}
            >
              <IntelCompactBar
                deployedCarrierCount={deployedCarrierCount}
                showAllCarriers={showUsCarriers}
                showTicker={viewUi.showTicker}
                viewerMode={viewerMode}
                pauseUpdates={isCameraMoving}
                fabOnly={fabOnly}
                onOpenSheet={(theater) => openIntelSheet({ theater: theater ?? "all" })}
                onFlyToTheater={(theater) => {
                  const target = flyTargetForTheater(theater);
                  if (target) handleIntelFlyTo(target);
                }}
                onEnableLayer={(layerKey) => {
                  const key = layerKey as keyof typeof layerPrefs;
                  if (typeof layerPrefs[key] !== "boolean") return;
                  applyLayerPrefs({ ...layerPrefs, [key]: true });
                  const themeByLayer: Record<string, string> = {
                    showAis: "ais",
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

        <IntelNewsSheet
          ref={intelStackRef}
          open={intelSheetOpen && !showLeftPanel && !selected}
          onClose={() => setIntelSheetOpen(false)}
          onOpen={() => setIntelSheetOpen(true)}
          onFlyToMap={handleIntelFlyTo}
          showTelegram={!isEconomyViewer && showTelegramOsint}
          telegramAlerts={telegramAlerts}
          telegramLive={telegramLive}
          telegramStatus={telegramStatus}
          telegramNeedsAuth={telegramNeedsAuth}
          telegramSessionExists={telegramSessionExists}
          telegramEmbedMode={telegramEmbedMode}
          telegramChannelCount={TELEGRAM_CHANNEL_COUNT}
          onCloseTelegramLayer={closeTelegramOsintLayer}
          showViina={!isEconomyViewer && showUkraineControl}
          viinaEvents={viinaFrontEvents}
          viinaControlDate={ukraineControlDate}
          viinaRuCellCount={ukraineRuCellCount}
          viinaLoading={ukraineControlStatus === "loading"}
          onViinaFlyTo={handleViinaEventFlyTo}
          initialIntelTab={viewUi.defaultIntelTab}
          autoOpenOnMount={!viewUi.autoEnterTheaterNavId && viewUi.autoOpenIntelSheet}
          onOpenTrust={() => setShowTrustPanel(true)}
        />

      {showIntroHint && !intelSheetOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-40 flex justify-center">
          <div className="rounded-full border border-sky-300/25 bg-[#0a1830]/80 px-4 py-2 text-sm text-sky-100/90 shadow-lg backdrop-blur-md">
            {showUkraineControl ? "우크라이나 전선으로 이동 중…" : "주요 분쟁 지역으로 이동 중…"}
          </div>
        </div>
      )}

      <QuickStartCoach
        visible={
          showQuickStart &&
          !chromeCoachStep &&
          !showViewerIntro &&
          !showLeftPanel &&
          !selected &&
          !regionNavSelection &&
          !econNavSelection &&
          !intelSheetOpen &&
          !showModePicker &&
          entryGate === null
        }
        viewerMode={viewerMode}
        onDismiss={() => setShowQuickStart(false)}
      />

      <ViewerIntroOverlay
        visible={
          showViewerIntro &&
          !showModePicker &&
          entryGate === null &&
          globeReady &&
          !isLoading
        }
        viewerMode={viewerMode}
        onDismiss={() => setShowViewerIntro(false)}
        onOpenTrust={() => setShowTrustPanel(true)}
        trustLang={labelLanguage === "en" ? "en" : "ko"}
      />

      {showLeftPanel ? (
        <button
          type="button"
          aria-label={t("ariaClosePanel", labelLanguage)}
          className="absolute inset-0 z-20 bg-[#0a1528]/40 backdrop-blur-[1px]"
          onClick={closeLeftPanel}
        />
      ) : null}

      {!intelSheetOpen ? (
      <div
        className="pointer-events-none absolute left-3 z-[60] flex flex-col items-start gap-2"
        style={{ top: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <HoverHint
            placement="bottom"
            title={
              showLeftPanel
                ? t("hoverLayerPanelClose", labelLanguage)
                : t("hoverLayerPanel", labelLanguage)
            }
            detail={t("hoverLayerPanelHint", labelLanguage)}
          >
            <button
              type="button"
              aria-label={
                showLeftPanel
                  ? t("hoverLayerPanelClose", labelLanguage)
                  : t("hoverLayerPanelOpenAria", labelLanguage)
              }
              onClick={() => toggleLeftPanel()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
            >
              <HamburgerIcon open={showLeftPanel} />
            </button>
          </HoverHint>
        </div>
        {!isCompactUi && !isEconomyViewer ? (
          <UsCarrierFixedToggle
            checked={showUsCarriers}
            onChange={setShowUsCarriers}
            carrierCount={usCarriers.length}
            deployedCount={deployedCarrierCount}
          />
        ) : null}
        {!isCompactUi && isEconomyViewer ? (
          <EconomySupplyChainFixedToggle
            showUsDfc={showUsDfcSupplyChain}
            showChinaBri={showBriTradeConnectivity}
            onUsDfcChange={setShowUsDfcSupplyChain}
            onChinaBriChange={setShowBriTradeConnectivity}
            usLinkCount={usDfcSupplyPaths.length}
            chinaLinkCount={briTradePaths.length}
          />
        ) : null}
        {!isCompactUi ? (
          <div className="cv-desktop-only pointer-events-auto">
            <ServerDonateChip lang={labelLanguage} />
          </div>
        ) : null}
        {isCompactUi ? (
          <div className="cv-compact-only pointer-events-auto">
            <ServerDonateChip lang={labelLanguage} />
          </div>
        ) : null}
      </div>
      ) : null}

      {/* 데스크톱: 우상단 공습·주요전장·도움말 / 모바일: 항모만 — 뉴스 시트 열리면 상단을 가리지 않도록 숨김 */}
      {!intelSheetOpen ? (
      <div
        className="pointer-events-none absolute right-3 z-[60] flex flex-col items-end gap-2"
        style={{ top: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        {isCompactUi && !isEconomyViewer ? (
          <UsCarrierFixedToggle
            compact
            checked={showUsCarriers}
            onChange={setShowUsCarriers}
            carrierCount={usCarriers.length}
            deployedCount={deployedCarrierCount}
          />
        ) : null}
        {!isCompactUi &&
        !issueUiPausedForLamp &&
        ((!isEconomyViewer &&
          (showNeptun || neptunAlertCount > 0 || showTzevaAdom || showNewfeedsIranAttacks)) ||
          (isEconomyViewer && showNewfeedsIranAttacks)) ? (
          <div
            id="air-raid-chrome"
            className="cv-desktop-only pointer-events-auto flex items-start gap-2"
            onPointerEnter={maybeOfferAirRaidCoach}
            onFocusCapture={maybeOfferAirRaidCoach}
          >
            {!isEconomyViewer &&
            (showNeptun || neptunAlertCount > 0 || showTzevaAdom) ? (
              <UnifiedAirRaidDropdown
                showUkraine={showNeptun || neptunAlertCount > 0}
                showIsrael={showTzevaAdom}
                neptunAlerts={neptunAlerts}
                neptunLive={neptunLive}
                neptunStatus={neptunStatus}
                neptunError={neptunError}
                tzevaActive={tzevaAdomActive}
                tzevaHistory={tzevaAdomHistory}
                tzevaLive={tzevaAdomLive}
                tzevaStatus={tzevaAdomStatus}
                tzevaGeoRestricted={tzevaAdomGeoRestricted}
                tzevaError={tzevaAdomError}
                lang={labelLanguage}
                onFocusUkraine={(target) => handleAirRaidFocus(target, "neptun")}
                onFocusIsrael={(target) => handleAirRaidFocus(target, "tzeva")}
              />
            ) : null}
            {showNewfeedsIranAttacks ? (
              <NewFeedsIranPanel
                attacks={newfeedsAttacks}
                threatLabel={newfeedsThreatLabel}
                live={newfeedsLive}
                liveStatus={newfeedsStatus}
                error={newfeedsError}
                lang={labelLanguage}
                onFocusAttack={(target) => handleAirRaidFocus(target, "newfeeds")}
              />
            ) : null}
          </div>
        ) : null}
        {!isCompactUi && !showLeftPanel && !econNavSelection ? (
          <ExplorationTabs
            presets={isEconomyViewer ? ECON_EXPLORATION_PRESETS : EXPLORATION_PRESETS}
            activeId={regionNavSelection?.id ?? null}
            onSelect={handleExplorationSelect}
            variant={isEconomyViewer ? "hubs" : "fronts"}
            label={t(
              isEconomyViewer ? "hoverExplorationHubs" : "hoverExplorationFronts",
              labelLanguage,
            )}
            hint={t(
              isEconomyViewer ? "hoverExplorationHubsHint" : "hoverExplorationFrontsHint",
              labelLanguage,
            )}
          />
        ) : null}
        {!isCompactUi ? (
          <div className="cv-desktop-only pointer-events-auto flex shrink-0 items-center gap-2">
            <TrustBadgeChip lang={labelLanguage} onClick={() => setShowTrustPanel(true)} />
            <SourcesLinkButton onClick={() => setShowSourcesPanel(true)} />
            {entryGate === null && !showModePicker ? (
              <ParchmentProTipChip lang={labelLanguage} />
            ) : null}
            <ShareViewButton getCanvas={() => globeRef.current?.renderer().domElement ?? null} />
            <FeatureGuideButton viewerMode={viewerMode} onClick={() => setShowFeatureGuide(true)} />
          </div>
        ) : (
          <div className="cv-compact-only pointer-events-auto flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setShowMobileAlertFeed((prev) => !prev)}
              aria-label={labelLanguage === "en" ? "Alerts" : "알림"}
              aria-pressed={showMobileAlertFeed}
              className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-slate-950/70 text-[15px] text-sky-100 shadow-sm transition hover:border-sky-200/45"
            >
              🔔
            </button>
            <TrustBadgeChip
              lang={labelLanguage}
              compact
              onClick={() => setShowTrustPanel(true)}
            />
          </div>
        )}
      </div>
      ) : null}

      {/* 모바일: 공습 경보는 하단 아이콘 — 상단 허브·주요전장 메뉴를 가리지 않음. 등불 중에는 숨김 */}
      {!intelSheetOpen &&
      isCompactUi &&
      !issueUiPausedForLamp &&
      ((!isEconomyViewer &&
        (showNeptun || neptunAlertCount > 0 || showTzevaAdom || showNewfeedsIranAttacks)) ||
        (isEconomyViewer && showNewfeedsIranAttacks)) ? (
        <div
          id="air-raid-chrome"
          className="cv-compact-only pointer-events-none absolute bottom-[calc(var(--bottom-intel-stack-clearance)+0.65rem+env(safe-area-inset-bottom,0px))] right-3 z-[55] flex flex-col items-end gap-2"
        >
          <div
            className="pointer-events-auto flex flex-col items-end gap-2"
            onPointerEnter={maybeOfferAirRaidCoach}
            onFocusCapture={maybeOfferAirRaidCoach}
          >
          {!isEconomyViewer &&
          (showNeptun || neptunAlertCount > 0 || showTzevaAdom) ? (
            <div>
              <UnifiedAirRaidDropdown
                showUkraine={showNeptun || neptunAlertCount > 0}
                showIsrael={showTzevaAdom}
                neptunAlerts={neptunAlerts}
                neptunLive={neptunLive}
                neptunStatus={neptunStatus}
                neptunError={neptunError}
                tzevaActive={tzevaAdomActive}
                tzevaHistory={tzevaAdomHistory}
                tzevaLive={tzevaAdomLive}
                tzevaStatus={tzevaAdomStatus}
                tzevaGeoRestricted={tzevaAdomGeoRestricted}
                tzevaError={tzevaAdomError}
                lang={labelLanguage}
                compact
                onFocusUkraine={(target) => handleAirRaidFocus(target, "neptun")}
                onFocusIsrael={(target) => handleAirRaidFocus(target, "tzeva")}
              />
            </div>
          ) : null}
          {showNewfeedsIranAttacks ? (
            <div>
              <NewFeedsIranPanel
                attacks={newfeedsAttacks}
                threatLabel={newfeedsThreatLabel}
                live={newfeedsLive}
                liveStatus={newfeedsStatus}
                error={newfeedsError}
                lang={labelLanguage}
                compact
                onFocusAttack={(target) => handleAirRaidFocus(target, "newfeeds")}
              />
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
      <FeatureGuidePanel
        open={showFeatureGuide}
        viewerMode={viewerMode}
        onClose={() => setShowFeatureGuide(false)}
      />
      <NewsTrustTierPanel
        open={showTrustPanel}
        lang={labelLanguage}
        onClose={() => setShowTrustPanel(false)}
      />
      <MethodologySourcesPanel
        open={showSourcesPanel}
        onClose={() => setShowSourcesPanel(false)}
        onOpenTrust={() => {
          setShowSourcesPanel(false);
          setShowTrustPanel(true);
        }}
      />

      {showLeftPanel ? (
        <aside
          className={`intel-panel pointer-events-auto absolute left-3 z-50 flex flex-col gap-4 overflow-y-auto rounded-2xl p-4 shadow-2xl ${
            isCompactUi
              ? "top-[4.75rem] max-h-[calc(100dvh-5.5rem)] w-[min(calc(100vw-1.5rem),360px)]"
              : "top-14 max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),384px)]"
          }`}
        >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-sky-200/70">
              {viewerChromePreset.navHeaderLabel}
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-sky-50">
              {viewerChromePreset.layerPanelTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={closeLeftPanel}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/50 hover:text-sky-50"
          >
            ✕
          </button>
        </div>

        <LayerPanelLanguagePicker
          initialLang={labelLanguage}
          onChange={handlePanelLangDraft}
        />

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">성능</p>
          <p className="mt-1 text-[11px] text-slate-600">
            저사양(내장 GPU·8GB)용 Ultra-Lite — 동시 레이어 {activeLayerCap(true)}개·핀 축소·무거운 레이어 강제 OFF
          </p>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-black/20 px-3 py-2.5">
            <span className="text-xs text-slate-200">Ultra-Lite 모드</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber-300"
              checked={ultraLite}
              onChange={(event) => handleUltraLiteToggle(event.target.checked)}
            />
          </label>
          <p className="mt-2 text-[11px] text-slate-500">
            일반 캡 {activeLayerCap(false)}개 · 현재 활성{" "}
            {countActiveLayers(showLeftPanel ? draftPrefs : layerPrefs)}/
            {activeLayerCap(ultraLite)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {t("viewSettings", labelLanguage)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {t("viewSettingsHint", labelLanguage)}
          </p>
            <button
              type="button"
            onClick={() => {
              closeLeftPanel();
              openModePickerManual();
            }}
            className="mt-3 w-full rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs text-orange-100 transition hover:border-orange-200"
          >
            {t("changeViewMode", labelLanguage)}
            </button>
            <button
              type="button"
            onClick={handleResetCheckboxSettings}
            className="mt-2 w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            {t("resetCheckboxSettings", labelLanguage)}
            </button>
            <SoundMuteControl lang={labelLanguage} variant="panel" />
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {t("layers", labelLanguage)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">켜진 레이어가 있는 주제는 자동으로 펼쳐집니다 · 체크하면 바로 지도에 반영됩니다</p>
          <div className="mt-3 text-sm">
            {frozenPanelCategories ? (
            <LayerCategoryDraftHost
              key={layerPanelSessionRef.current}
              categories={frozenPanelCategories}
              ultraLite={ultraLite}
              batchStatus={
                batchPending ? "레이어 일괄 적용 중… 잠시 후 지구본에 반영됩니다." : null
              }
              autoExpandCategoryId={isEconomyViewer ? "energy" : "conflict"}
              autoExpandWhen={showUkraineControl}
              expandActiveCategories
              onPatch={handlePanelDraftPatch}
            />
            ) : (
              <p className="rounded-lg border border-slate-800/90 bg-slate-950/30 px-3 py-4 text-xs text-slate-500">
                레이어 목록 준비 중…
              </p>
            )}
          </div>
          {showNeptun ? (
            <div className="mt-3">
              <NeptunLayerPanel
                threats={neptunThreats}
                alerts={neptunAlerts}
                live={neptunLive}
                liveStatus={neptunStatus}
                serverTime={neptunServerTime}
                error={neptunError}
                lang={labelLanguage}
                viewportHint={
                  !neptunFetchEnabled
                    ? "우크라이나 극동부로 이동하거나 전선 레이어를 켜면 데이터를 불러옵니다."
                    : neptunRenderMode === "hidden"
                      ? "우크라이나 극동부로 이동하면 궤적이 표시됩니다."
                      : neptunRenderMode === "flat"
                        ? "개요 모드: 가벼운 평면 궤적. 더 가까이 줌인하면 상세 궤적이 나타납니다."
                        : neptunRenderMode === "low"
                          ? "저고도 궤적. 더 가까이 줌인하면 예측 항로가 표시됩니다."
                          : null
                }
                onSelectThreat={handleNeptunThreatSelect}
              />
            </div>
          ) : null}
          <p className="mt-3 text-[10px] leading-4 text-slate-600">
            GEM · TeleGeography · OurAirports · NGA WPI · Natural Earth
          </p>
          {transportLoading && (
            <p className="mt-2 text-xs leading-5 text-slate-400">철도 데이터 로딩 중...</p>
          )}
            <p className="mt-2 text-xs leading-5 text-slate-500">
              현재 배율: {globeLod.label}
              {showUkraineControl && viinaDisplay.lod.mode === "overview"
                ? " · 점령 개요"
                : showUkraineControl && viinaDisplay.lod.mode === "hidden"
                  ? " · 점령(줌인 필요)"
                  : ""}{" "}
              · 이벤트 {globePoints.length.toLocaleString()}개
            </p>
          {transportError && <p className="mt-2 text-xs leading-5 text-red-200">{transportError}</p>}
          <button
            type="button"
            onClick={() => startTransition(() => void refreshAis())}
            disabled={aisLoading || !showAis}
            className="mt-3 w-full rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aisLoading ? "배 위치 불러오는 중…" : "배 위치 새로고침"}
          </button>
          {aisError && <p className="mt-2 text-xs leading-5 text-red-200">{aisError}</p>}
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
              setSyncBusy(true);
              void forceSync().finally(() => setSyncBusy(false));
              });
            }}
            disabled={syncBusy || syncInfo?.running === true}
            className="mt-3 w-full rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 transition hover:border-amber-200 disabled:cursor-wait disabled:opacity-60"
          >
            {syncBusy || syncInfo?.running
              ? "스냅샷 동기화 중…"
              : "스냅샷 데이터 동기화"}
          </button>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            정적 스냅샷은 약 6시간마다 자동 갱신됩니다. NASA FIRMS · ADS-B · MarineTraffic(AIS)은 Cron → D1 실시간 레이어입니다.
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            GDELT 실시간 이벤트는 꺼 두었습니다. 우측 경보 패널은 로컬 분쟁 데이터를 사용합니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">데이터 상태</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="GDELT" value={gdeltEvents.length.toLocaleString()} />
            <Metric label="로컬 분쟁" value={(data.disputes ?? []).length.toLocaleString()} />
            <Metric label="철도" value={railPaths.length.toLocaleString()} />
            <Metric label="MarineTraffic AIS" value={aisVessels.length.toLocaleString()} />
            <Metric label="ADS-B mil" value={milAircraft.length.toLocaleString()} />
            <Metric label="ADS-B civ" value={civAircraft.length.toLocaleString()} />
            <Metric label="NASA FIRMS" value={visibleFirmsFires.length.toLocaleString()} />
            <Metric label="국가" value={data.countries.length.toLocaleString()} />
            <Metric label="도시 라벨" value={labelPlaces.length.toLocaleString()} />
          </dl>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            생성 시각: {formatDateTime(data.generatedAt)}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-slate-600">
            AI 전쟁지역은 외부 AI API 없이 Natural Earth 분쟁 구역 + GDELT 전투 뉴스 밀도로 데모 탐지합니다.
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            점멸 체크 A: 국가 간 갈등 + 도시 이름 ON, 대륙/지역 경계 줌에서 회전
          </p>
          <p className="text-[11px] leading-5 text-slate-500">
            점멸 체크 B: 전투·군사 충돌 + 우크라이나 점령지 ON, 동유럽 근접 줌 팬/줌
          </p>
        </div>

        {loadError ? <LoadErrorBanner message={loadError} className="mt-3" /> : null}
      </aside>
      ) : null}

      {regionNavSelection &&
        !regionNavSelection.hubId &&
        !isEconomyViewer &&
        !selected &&
        !showLeftPanel && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseRegionNews", labelLanguage)}
            className="absolute inset-0 z-20 bg-black/15 lg:bg-transparent"
            onClick={() => setRegionNavSelection(null)}
          />
          <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-30 flex h-full flex-col overflow-hidden border-l border-slate-800/80 p-4 shadow-2xl">
            {theaterFocusConfig ? (
              <TheaterIntelSidebar
              selection={regionNavSelection}
                newsTheater={theaterFocusConfig.newsTheater}
                telegramRegion={theaterFocusConfig.telegramRegion}
                gdeltEvents={regionFilteredEvents}
                telegramAlerts={telegramAlerts}
                telegramLive={telegramLive}
                telegramStatus={telegramStatus}
                telegramNeedsAuth={telegramNeedsAuth}
                telegramSessionExists={telegramSessionExists}
                telegramEmbedMode={telegramEmbedMode}
                telegramChannelCount={TELEGRAM_CHANNEL_COUNT}
                initialTab={theaterSidebarTab}
              onClose={() => setRegionNavSelection(null)}
                onFlyToCoords={(lat, lng, altitude) => flyTo(lat, lng, altitude ?? 0.72)}
                onSelectGdeltEvent={handleRegionEventSelect}
            />
            ) : null}
          </aside>
        </>
      )}

      {selected && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseInfoPanel", labelLanguage)}
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => setSelected(null)}
          />
          <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-30 h-full overflow-y-auto border-l border-slate-800/80 p-4 shadow-2xl">
            {selected.kind === "neptun-threat" ? (
              <NeptunThreatDetailPanel
                threat={selected.item}
                lang={labelLanguage}
                onClose={() => setSelected(null)}
              />
            ) : (
              <>
            {regionNavSelection && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mb-3 text-xs text-amber-200/80 transition hover:text-amber-100"
              >
                ← {regionNavSelection.label} 뉴스 목록
              </button>
            )}
            <AnalysisPanel
              selection={selected}
              onClose={() => setSelected(null)}
              ukraineControlDate={ukraineControlDate}
              ukraineRuCellCount={ukraineRuCellCount}
              disputeOverview={
                selected.kind === "dispute" ? disputeOverviews.get(selected.item.id) ?? null : null
              }
            />
              </>
            )}
          </aside>
        </>
      )}
      {econNavSelection &&
        !selected &&
        !econInsightOpen &&
        (econNewsPanelReveal ||
          !resolveCriticalNodeBrief({ navId: econNavSelection.id })) && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseEconomyRegion", labelLanguage)}
            className="absolute inset-0 z-20 bg-black/15 lg:bg-transparent"
            onClick={() => {
              setEconNavSelection(null);
              setEconNewsPanelReveal(false);
            }}
          />
          <EconomyRegionPanel
            selection={econNavSelection}
            onClose={() => {
              setEconNavSelection(null);
              setEconNewsPanelReveal(false);
            }}
            onOpenIntel={() => {
              setEconNavSelection(null);
              setEconNewsPanelReveal(false);
              openIntelSheet({ theater: "all", tab: "news" });
            }}
            onFlyToMap={(target) => {
              setEconNavSelection(null);
              setEconNewsPanelReveal(false);
              handleIntelFlyTo(target);
            }}
          />
        </>
      )}

      {econInsightOpen && econInsightBrief ? (
        econInsightCompact ? (
          <CriticalNodeInsightParchment
            lang={labelLanguage}
            brief={econInsightBrief}
            onMapOnly={closeEconInsight}
            onOpenNews={() => {
              closeEconInsight();
              if (isEconomyViewer) {
                setEconNewsPanelReveal(true);
              } else {
                openIntelSheet({ theater: "all", tab: "news" });
              }
            }}
          />
        ) : (
          <EconInsightParchment
            lang={labelLanguage}
            brief={econInsightBrief}
            onMapOnly={closeEconInsight}
            onOpenNews={() => {
              closeEconInsight();
              setEconNewsPanelReveal(true);
            }}
          />
        )
      ) : null}

      {entryGate === "caution" ? (
        <EntryCautionOverlay
          lang={labelLanguage}
          onLangChange={setLabelLanguage}
          onContinue={() => setEntryGate("welcome")}
          onSkipToDomain={() => {
            markWelcomeGateDone();
            setEntryGate("domain");
          }}
        />
      ) : null}

      {entryGate === "welcome" ? (
        <WelcomeParchmentLetter
          lang={labelLanguage}
          onContinue={() => setEntryGate("domain")}
        />
      ) : null}

      {hubBriefDoc ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={hubBriefDoc.title}
          paragraphs={hubBriefDoc.paragraphs}
          signOff={hubBriefDoc.signOff}
          ctaLabel={t("hubBriefCta", labelLanguage)}
          onContinue={closeHubBrief}
          playBreakingDispatch={hubBriefDoc.playBreakingDispatch}
          typewriter={hubBriefDoc.playBreakingDispatch}
          titleId="hub-brief-letter-title"
          zIndexClass="z-[9990]"
        />
      ) : null}

      {frictionEpisodeBrief ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={frictionEpisodeBrief.title}
          paragraphs={frictionParchmentParagraphs(frictionEpisodeBrief, labelLanguage)}
          signOff={
            labelLanguage === "en"
              ? `${frictionEpisodeBrief.historicalYear}${
                  frictionEpisodeBrief.yearEnd ? `–${frictionEpisodeBrief.yearEnd}` : ""
                }\nGlobe Observatory · friction brief`
              : `${frictionEpisodeBrief.historicalYear}${
                  frictionEpisodeBrief.yearEnd ? `–${frictionEpisodeBrief.yearEnd}` : ""
                }\n지구본 관측대 · 분쟁 외교사`
          }
          ctaLabel={t("hubBriefCta", labelLanguage)}
          onContinue={() => setFrictionEpisodeBrief(null)}
          playBreakingDispatch
          typewriter
          historyHandFont
          titleId="friction-episode-letter-title"
          zIndexClass="z-[9990]"
        />
      ) : null}

      {entryGate === null && !showModePicker ? (
        <div className="pointer-events-none fixed bottom-5 right-4 z-[60] sm:bottom-6 sm:right-5">
          <SoundMuteControl lang={labelLanguage} variant="fab" />
        </div>
      ) : null}

      {entryGate === "domain" ? (
        <DomainGateOverlay onSelect={handleDomainSelect} />
      ) : null}

      {showModePicker ? (
        <ModePickerOverlay
          initialMode={modePickerInitialMode ?? viewerMode}
          initialTheater={viewTheater}
          initialEconomyHub={viewEconomyHub}
          lockMode={modePickerLockMode}
          onConfirm={handleModeApply}
          onCustom={handleCustomLayerApply}
          onCancel={handleModePickerCancel}
        />
      ) : null}

      {chromeCoachStep &&
      entryGate === null &&
      !showModePicker &&
      !hubBriefOpen &&
      !frictionEpisodeBrief &&
      !frictionCoachStep ? (
        <ChromeOnboardingCoach
          step={chromeCoachStep}
          viewerMode={viewerMode}
          lang={labelLanguage}
          onStepChange={setChromeCoachStep}
        />
      ) : null}

      {frictionCoachStep &&
      entryGate === null &&
      !showModePicker &&
      !chromeCoachStep &&
      !isEconomyViewer ? (
        <FrictionOnboardingCoach
          step={frictionCoachStep}
          lang={labelLanguage}
          onStepChange={handleFrictionCoachStepChange}
        />
      ) : null}

      {showAirRaidCoach &&
      !issueUiPausedForLamp &&
      entryGate === null &&
      !showModePicker &&
      !chromeCoachStep &&
      !frictionCoachStep &&
      !hubBriefOpen &&
      !frictionEpisodeBrief ? (
        <AirRaidOnboardingCoach
          open
          lang={labelLanguage}
          placement={isCompactUi ? "above" : "below"}
          onDismiss={() => setShowAirRaidCoach(false)}
        />
      ) : null}

      {isCompactUi && showMobileAlertFeed ? (
        <MobileAlertFeed onClose={() => setShowMobileAlertFeed(false)} />
      ) : null}

      {periodicBriefing ? (
        <PeriodicBriefingParchment
          briefing={periodicBriefing}
          lang={labelLanguage}
          onDismiss={() => {
            markPeriodSeen(periodicBriefing.key);
            recordInterestNews(
              periodicBriefing.key,
              periodicBriefing.title || periodicBriefing.key,
            );
            setPeriodicBriefing(null);
            if (shouldOfferLampRoleTip()) {
              window.setTimeout(() => setShowLampRoleTip(true), 450);
            } else if (shouldOfferChromeCoach()) {
              window.setTimeout(() => setChromeCoachStep("nav"), 500);
            }
          }}
        />
      ) : null}

      {tomorrowTensionPrompt && !periodicBriefing ? (
        <TomorrowTensionModal
          lang={labelLanguage}
          prompt={tomorrowTensionPrompt}
          onDismiss={() => {
            markTensionPromptSeen(calendarDayKey);
            setTomorrowTensionPrompt(null);
          }}
        />
      ) : null}

      {!isCompactUi &&
      entryGate === null &&
      !showModePicker &&
      !periodicBriefing &&
      !tomorrowTensionPrompt ? (
        <div
          className={`cv-desktop-only pointer-events-auto absolute bottom-24 left-3 z-[28] ${
            // 접었을 때 420px 폭을 유지하면 보이지 않는 영역이 지도 클릭을 막는다
            showDailyRankPanel ? "w-[min(420px,calc(100vw-1.5rem))]" : "w-fit"
          }`}
        >
          {showDailyRankPanel ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDailyRankPanel(false)}
                aria-label={labelLanguage === "en" ? "Collapse daily panel" : "일일 패널 접기"}
                title={labelLanguage === "en" ? "Collapse" : "접기"}
                className="absolute -top-2.5 right-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/60 bg-slate-950/90 text-[11px] text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
              <DailyRankSharePanel lang={labelLanguage} />
            </div>
          ) : (
            <LegendReopenButton
              label={labelLanguage === "en" ? "Daily · WTI" : "오늘의 지수 · 예측"}
              onClick={() => toggleDailyRankPanel(true)}
            />
          )}
        </div>
      ) : null}

      <LampRoleTipBanner
        lang={labelLanguage}
        open={showLampRoleTip}
        onDismiss={() => {
          setShowLampRoleTip(false);
          if (shouldOfferChromeCoach()) {
            window.setTimeout(() => setChromeCoachStep("nav"), 400);
          }
        }}
      />

      {airRaidOffer && !airRaidBriefing && !issueUiPausedForLamp ? (
        <AirRaidOfferBanner
          offer={airRaidOffer}
          lang={labelLanguage}
          onAccept={acceptAirRaidOffer}
          onDismiss={dismissAirRaidOffer}
        />
      ) : null}

      {airRaidBriefing ? (
        <AirRaidBriefingParchment
          briefing={airRaidBriefing}
          lang={labelLanguage}
          onDismiss={() => {
            setAirRaidBriefing(null);
            airRaidAutoBusyRef.current = false;
          }}
        />
      ) : null}
      </NewsStreamProvider>
    </main>
    </LocaleProvider>
  );
}

