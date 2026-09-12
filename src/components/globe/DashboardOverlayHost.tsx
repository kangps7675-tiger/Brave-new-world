"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { importWithChunkRetry } from "@/lib/importWithChunkRetry";
import { NewsTrustTierPanel } from "@/components/NewsTrustTierPanel";

/* ══ 지연 로드 오버레이 (P-perf) ═══════════════════════════════════════
 *
 * 아래는 전부 **닫힌 상태가 기본**인 모달·패널이다. 그런데 정적 import라
 * 대시보드 청크(1.9MB)에 통째로 들어가 있었다 — 사용자가 한 번도 열지
 * 않아도 지도 진입 시 파싱 비용을 낸다.
 *
 * `next/dynamic`으로 빼면 실제로 열 때만 청크를 받는다.
 * 합계 약 2,600줄 + 각자의 의존성이 초기 경로에서 빠진다.
 *
 * ssr:false — 전부 클라이언트 전용 오버레이이고 SEO 대상이 아니다.
 * loading 없음 — 모달이라 잠깐의 빈 화면이 자연스럽고, 스피너를 넣으면
 * 오히려 깜빡임이 생긴다.
 *
 * ⚠️ 주의: dynamic 컴포넌트는 **렌더되는 순간 청크를 받는다.**
 * 내부에서 `if (!open) return null` 하는 컴포넌트를 그냥 dynamic으로
 * 바꾸면 항상 렌더되므로 효과가 0이다. 그래서 아래 JSX에서는 open 조건을
 * **부모로 끌어올려** 삼항으로 감쌌다. 이 구조를 되돌리지 말 것.
 */
const FeatureGuidePanel = dynamic(
  importWithChunkRetry(() =>
    import("@/components/FeatureGuidePanel").then((m) => m.FeatureGuidePanel),
  ),
  { ssr: false },
);
const MethodologySourcesPanel = dynamic(
  importWithChunkRetry(() =>
    import("@/components/MethodologySourcesPanel").then(
      (m) => m.MethodologySourcesPanel,
    ),
  ),
  { ssr: false },
);
const DataSourceParchmentOverlay = dynamic(
  importWithChunkRetry(() =>
    import("@/components/DataSourceParchmentOverlay").then(
      (m) => m.DataSourceParchmentOverlay,
    ),
  ),
  { ssr: false },
);
const AskLayersOverlay = dynamic(
  importWithChunkRetry(() =>
    import("@/components/AskLayersOverlay").then((m) => m.AskLayersOverlay),
  ),
  { ssr: false },
);
const ViewerIntroOverlay = dynamic(
  importWithChunkRetry(() =>
    import("@/components/ViewerIntroOverlay").then((m) => m.ViewerIntroOverlay),
  ),
  { ssr: false },
);
const TomorrowTensionModal = dynamic(
  importWithChunkRetry(() =>
    import("@/components/TomorrowTensionModal").then((m) => m.TomorrowTensionModal),
  ),
  { ssr: false },
);
const ModePickerOverlay = dynamic(
  importWithChunkRetry(() =>
    import("@/components/ModePickerOverlay").then((m) => m.ModePickerOverlay),
  ),
  { ssr: false },
);
const WhereIsItGameOverlay = dynamic(
  importWithChunkRetry(() =>
    import("@/components/WhereIsItGameOverlay").then((m) => m.WhereIsItGameOverlay),
  ),
  { ssr: false },
);
const GeopoliticsSenseQuizModal = dynamic(
  importWithChunkRetry(() =>
    import("@/components/GeopoliticsSenseQuizModal").then(
      (m) => m.GeopoliticsSenseQuizModal,
    ),
  ),
  { ssr: false },
);
const DailyRankSharePanel = dynamic(
  importWithChunkRetry(() =>
    import("@/components/DailyRankSharePanel").then((m) => m.DailyRankSharePanel),
  ),
  { ssr: false },
);
const TopWatchPanel = dynamic(
  importWithChunkRetry(() =>
    import("@/components/TopWatchPanel").then((m) => m.TopWatchPanel),
  ),
  { ssr: false },
);
const DailyBriefingChrome = dynamic(
  importWithChunkRetry(() =>
    import("@/components/DailyBriefingChrome").then((m) => m.DailyBriefingChrome),
  ),
  { ssr: false },
);
import { TrustBadgeChip } from "@/components/TrustBadgeChip";
import { SourcesLinkButton, ParchmentLinkButton } from "@/components/MethodologySourcesPanel";
import { SitrepLog } from "@/components/SitrepLog";
import { MobileAlertFeed } from "@/components/MobileAlertFeed";
import { UnifiedAirRaidDropdown } from "@/components/UnifiedAirRaidDropdown";
import { type AskLayersApplyPayload } from "@/components/AskLayersOverlay";
import { HoverHint } from "@/components/HoverHint";
import { EntryGateHost } from "@/components/globe/EntryGateHost";
import { TourSequencer, type TourScene } from "@/components/globe/TourSequencer";
import { UtilityChromeMenu } from "@/components/UtilityChromeMenu";
import { markBriefingStep } from "@/lib/dailyBriefingProgress";
import { ParchmentProTipChip } from "@/components/ParchmentProTipChip";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import {
  ChromeOnboardingCoach,
  type ChromeCoachStep,
} from "@/components/ChromeOnboardingCoach";
import { FirstVisitTour } from "@/components/FirstVisitTour";
import { clearFirstVisitTourDone } from "@/lib/firstVisitTour";
import {
  TourInviteBanner,
  shouldOfferTourInvite,
} from "@/components/TourInviteBanner";
import {
  FrictionOnboardingCoach,
  type FrictionCoachStep,
} from "@/components/FrictionOnboardingCoach";
import { AirRaidOnboardingCoach } from "@/components/AirRaidOnboardingCoach";
import { HotTheaterOfferBanner } from "@/components/HotTheaterOfferBanner";
import { UltraLiteOfferBanner } from "@/components/UltraLiteOfferBanner";
import { LayerCapToast } from "@/components/LayerCapToast";
import { LayerCacheStaleBadge } from "@/components/LayerCacheStaleBadge";
import { TimeScrubberBar } from "@/components/TimeScrubberBar";
import {
  BottomDockModeToggle,
  type BottomDockMode,
} from "@/components/BottomDockModeToggle";
import { GtiHeroMoment } from "@/components/GtiHeroMoment";
import { SoundUnmuteNudge } from "@/components/SoundUnmuteNudge";
import type { PerfProbeResult } from "@/lib/perfProbe";
import type { HotTheaterFocus } from "@/lib/hotTheaterLayers";
import type { WorldTensionSnapshot } from "@/lib/dailyRanks";
import { PeriodicBriefingParchment } from "@/components/PeriodicBriefingParchment";
import { ClearanceThreatChip } from "@/components/ClearanceThreatChip";
import {
  resolveClearanceStatus,
  syncClearancePrefs,
  type ClearanceStatus,
} from "@/lib/analystClearance";
import {
  markAnalystActive,
  readDailyPredictPrefs,
  writeDailyPredictPrefs,
} from "@/lib/dailyPredictPrefs";
import {
  AirRaidBriefingParchment,
  type AirRaidBriefingContent,
} from "@/components/AirRaidBriefingParchment";
import { BreakingFlashParchment } from "@/components/BreakingFlashParchment";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import { AirRaidOfferBanner, type AirRaidOffer } from "@/components/AirRaidOfferBanner";
import { SpikeTelegraphBanner } from "@/components/SpikeTelegraphBanner";
import { useDatabentoSpikeOffer } from "@/hooks/useDatabentoSpikeOffer";
import { AdsbEmergencyBanner } from "@/components/AdsbEmergencyBanner";
import type { AdsbEmergencyOffer } from "@/components/globe/hooks/useAdsbEmergencyAlert";
import { NatoPerimeterAlertChip } from "@/components/NatoPerimeterAlertChip";
import { NatoPerimeterHalfParchment } from "@/components/NatoPerimeterHalfParchment";
import type { NatoPerimeterAlertState } from "@/components/globe/hooks/useNatoPerimeterDroneAlert";
import { EscalationSignalPanel } from "@/components/EscalationSignalPanel";
import type { EscalationOffer } from "@/components/globe/hooks/useEscalationSignals";
import { ExerciseOfferBanner, type ExerciseOffer } from "@/components/ExerciseOfferBanner";
import {
  ExerciseBriefingParchment,
  type ExerciseBriefingContent,
} from "@/components/ExerciseBriefingParchment";
import {
  MaritimeAlertOfferBanner,
  type MaritimeAlertOffer,
} from "@/components/MaritimeAlertOfferBanner";
import { TensionSpikeCutOverlay } from "@/components/TensionSpikeCutOverlay";
import type { TensionSpikeSnapshot } from "@/lib/tensionSpikeCut";
import { canShowOverlayBanner, buildOverlayBannerCandidates } from "@/lib/overlayQueue";
import {
  applyOverlayBudget,
  markOverlayDismissed,
  markOverlayShown,
} from "@/lib/overlayBudget";
import { LampPreparingOverlay } from "@/components/LampPreparingOverlay";
import { LanguageGateOverlay } from "@/components/LanguageGateOverlay";
import { markTensionPromptSeen, type DailyPrompt } from "@/lib/dailyPrompt";
import {
  clearWeeklyRecapFolded,
  markLampFolded,
  markPeriodSeen,
  markWeeklyRecapFolded,
  type PeriodicBriefing,
} from "@/lib/news/periodicBriefing";
import { recordInterestNews } from "@/lib/interest/recordInterest";
import { zc } from "@/lib/uiStack";
import { SoundMuteControl } from "@/components/SoundMuteControl";
import { PlayHubButton } from "@/components/PlayHubButton";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { SentinelHud, SentinelModeButton } from "@/components/SentinelModeControl";
import { type AppUpdate } from "@/lib/appUpdates";
import type { WhereIsItPoolItem } from "@/lib/whereIsItGame";
import { QuickStartCoach } from "@/components/QuickStartCoach";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import { trackEvent } from "@/lib/trackClient";
import { NewFeedsIranPanel } from "@/components/NewFeedsIranPanel";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { NeptunAlerts } from "@/lib/neptun";
import { ServerDonateChip } from "@/components/ServerDonateChip";
import { UsCarrierFixedToggle } from "@/components/UsCarrierFixedToggle";
import { GpsJamFixedToggle } from "@/components/GpsJamFixedToggle";
import { EconomySupplyChainFixedToggle } from "@/components/EconomySupplyChainFixedToggle";
import { FinintTicker } from "@/components/FinintTicker";
import { BRI_TRADE_LINK_COUNT } from "@/lib/briTradePaths";
import { US_DFC_LINK_COUNT } from "@/lib/usDfcSupplyPaths";
import { HamburgerIcon } from "@/components/globe/HamburgerIcon";
import { LegendReopenButton } from "@/components/MapOverlayLegendPanel";
import type { EntryGate, Selection } from "@/components/globe/types";
import type { NavSelection } from "@/data/navRegions";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode, ViewTheaterChoice } from "@/lib/viewPackages";
import type { TransportPath, UsCarrier } from "@/data/geoTypes";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import {
  airRaidBriefingLayers,
  applyLayerPatch,
  type LiveBriefingSession,
} from "@/lib/eventBriefingSession";
import type { UkmtoBriefingContent } from "@/lib/ukmtoHatch";
import type { NavareaBriefingContent } from "@/lib/navareaSecurity";
import type { BottomIntelStackHandle } from "@/components/BottomIntelStack";
import type { SentinelFlyTarget } from "@/lib/sentinelMode";
import type { NeptunStreamStatus } from "@/hooks/useNeptunStream";
import { t } from "@/lib/uiStrings";

type FlyToFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

type SceneShareSnapshot = {
  mode: ViewerMode;
  lat: number;
  lng: number;
  altitude: number;
  prefs: LayerPrefs;
  asOf?: string | null;
} | null;

type LayerPatch = Parameters<typeof applyLayerPatch>[1];

export type DashboardOverlayHostProps = {
  labelLanguage: LabelLanguage;
  isCompactUi: boolean;
  /** 태블릿 프로파일 — soft-compact 밀도 (1025–1366 등) */
  isTabletUi?: boolean;
  isEconomyViewer: boolean;
  viewerMode: ViewerMode;
  intelSheetOpen: boolean;
  showLeftPanel: boolean;
  showIntroHint: boolean;
  showUkraineControl: boolean;
  showQuickStart: boolean;
  chromeCoachStep: ChromeCoachStep | null;
  showViewerIntro: boolean;
  selected: Selection | null;
  regionNavSelection: NavSelection | null;
  econNavSelection: NavSelection | null;
  /** 우측 사이드·관점 패널이 떠 있으면 상단 유틸·탐색 탭 숨김 (겹침 방지) */
  rightDockOpen?: boolean;
  showModePicker: boolean;
  entryGate: EntryGate;
  globeReady: boolean;
  isLoading: boolean;
  showUsCarriers: boolean;
  usCarriers: UsCarrier[];
  deployedCarrierCount: number;
  showGpsInterference: boolean;
  gpsJamStatus: "idle" | "loading" | "ok" | "error";
  gpsJamCellCount: number;
  gpsJamDate: string | null;
  showUsDfcSupplyChain: boolean;
  showBriTradeConnectivity: boolean;
  usDfcSupplyPaths: TransportPath[];
  briTradePaths: TransportPath[];
  issueUiPausedForLamp: boolean;
  showNeptun: boolean;
  neptunAlertCount: number;
  showTzevaAdom: boolean;
  showNewfeedsIranAttacks: boolean;
  neptunAlerts: NeptunAlerts | null;
  neptunLive: boolean;
  neptunStatus: NeptunStreamStatus;
  neptunError: string | null;
  tzevaAdomActive: TzevaAdomAlert[];
  tzevaAdomHistory: TzevaAdomAlert[];
  tzevaAdomLive: boolean;
  tzevaAdomStatus: "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked";
  tzevaAdomGeoRestricted: boolean;
  tzevaAdomError: string | null;
  newfeedsAttacks: NewfeedsAttackPoint[];
  newfeedsThreatLabel: string | null;
  newfeedsLive: boolean;
  newfeedsStatus: "idle" | "loading" | "ok" | "error";
  newfeedsError: string | null;
  tourScenes: TourScene[];
  showFeatureGuide: boolean;
  askLayersOpen: boolean;
  showTrustPanel: boolean;
  showSourcesPanel: boolean;
  showDataSourceParchment: boolean;
  showMobileAlertFeed: boolean;
  playOverlay: "where" | "sense" | null;
  sentinelActive: boolean;
  sentinelTour: SentinelFlyTarget[];
  sentinelIndex: number;
  whereIsItPool: WhereIsItPoolItem[];
  liveBriefingSession: LiveBriefingSession | null;
  whatsNewUpdate: AppUpdate | null;
  tomorrowTensionPrompt: DailyPrompt | null;
  periodicBriefing: PeriodicBriefing | null;
  foldedPeriodicBriefing: PeriodicBriefing | null;
  weeklyExpanded: boolean;
  tourActive: boolean;
  modePickerInitialMode: ViewerMode | null;
  viewTheater: ViewTheaterChoice;
  viewEconomyHub: EconomyHubChoice;
  modePickerLockMode: boolean;
  showFirstVisitTour: boolean;
  hubBriefOpen: boolean;
  frictionEpisodeBrief: FrictionEpisode | null;
  frictionCoachStep: FrictionCoachStep | null;
  showAirRaidCoach: boolean;
  watchFocusLine: string | null;
  clearanceStatus: ClearanceStatus | null;
  calendarDayKey: string;
  weeklyRecap: PeriodicBriefing | null;
  weeklyRecapCollapsed: boolean;
  showLampPreparing: boolean;
  showLanguageGate: boolean;
  showDailyRankPanel: boolean;
  telegramMiniPanelVisible: boolean;
  showTourInvite: boolean;
  airRaidOffer: AirRaidOffer | null;
  airRaidBriefing: AirRaidBriefingContent | null;
  /** 귀중한 속보 타전 양피지 */
  breakingFlash: BreakingFlashBriefing | null;
  onDismissBreakingFlash: () => void;
  adsbEmergencyOffer: AdsbEmergencyOffer | null;
  /** NATO 동부 접경 UAV 1차 칩 / 2차 반쪽 양피지 */
  natoPerimeterAlert: NatoPerimeterAlertState;
  /** 확전 신호 — 임계선을 넘은 사건 보도 (useEscalationSignals) */
  escalationOffer: EscalationOffer | null;
  onDismissEscalationOffer: () => void;
  exerciseOffer: ExerciseOffer | null;
  exerciseBriefing: ExerciseBriefingContent | null;
  maritimeOffer: MaritimeAlertOffer | null;
  /** 대만 해협 긴장 컷 — 오버레이 큐 tensionCut */
  tensionSpike: TensionSpikeSnapshot | null;
  /** 오늘의 핫 전장 오퍼 — 오버레이 큐 hotTheater */
  hotTheaterOffer: HotTheaterFocus | null;
  /**
   * FPS 프로브 Ultra-Lite 제안 — 오버레이 큐 ultraLite.
   * 강제 적용 없음. LanguageGate·진입 게이트가 열린 동안은 후보에서 제외.
   */
  ultraLiteOfferVisible: boolean;
  ultraLiteOfferProbe: PerfProbeResult | null;
  /** 첫 90초 GTI 히어로 (gti 단계만) */
  gtiHeroSnapshot: WorldTensionSnapshot | null;
  gtiHeroVisible: boolean;
  /** 일별 랭크 시간 스크럽 */
  timeScrubber?: {
    asOf: string;
    today: string;
    availableDates: string[];
    onChange: (date: string) => void;
    onGoToday: () => void;
  } | null;
  /** 하단 독 · 히스토리(스크럽) / 뉴스(인텔 스택) */
  bottomDockMode?: BottomDockMode;
  onBottomDockModeChange?: (mode: BottomDockMode) => void;
  /** 첫 90초 종료 후 소리 언뮤트 유도 */
  soundUnmuteReady: boolean;
  ukmtoBriefing: UkmtoBriefingContent | null;
  navareaBriefing: NavareaBriefingContent | null;
  globeRef: RefObject<MapGlobeMethods | null>;
  intelStackRef: RefObject<BottomIntelStackHandle | null>;
  onCloseLeftPanel: () => void;
  onToggleLeftPanel: () => void;
  onSetShowUsCarriers: (v: boolean) => void;
  onSetShowGpsInterference: (v: boolean) => void;
  onSetShowUsDfcSupplyChain: (v: boolean) => void;
  onSetShowBriTradeConnectivity: (v: boolean) => void;
  onSetShowQuickStart: (v: boolean) => void;
  onSetShowViewerIntro: (v: boolean) => void;
  onSetShowTrustPanel: (v: boolean) => void;
  onSetShowSourcesPanel: (v: boolean) => void;
  onSetShowDataSourceParchment: (v: boolean) => void;
  onSetShowFeatureGuide: (v: boolean) => void;
  onSetAskLayersOpen: (v: boolean) => void;
  onSetShowMobileAlertFeed: Dispatch<SetStateAction<boolean>>;
  onMaybeOfferAirRaidCoach: () => void;
  onAirRaidFocus: (
    target: AirRaidFocusTarget,
    kind: AirRaidSirenKind,
    options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
  ) => void;
  onAskLayersApply: (payload: AskLayersApplyPayload) => void;
  onSetShowFirstVisitTour: (v: boolean) => void;
  onSetTourActive: (v: boolean) => void;
  getSceneForShare: () => SceneShareSnapshot;
  onSetSentinelActive: Dispatch<SetStateAction<boolean>>;
  onSetPlayOverlay: (v: "where" | "sense" | null) => void;
  onSetShowCityLabels: (v: boolean) => void;
  onEndLiveBriefing: () => void;
  flyTo: FlyToFn;
  onSetWhatsNewUpdate: (v: AppUpdate | null) => void;
  onLabelLanguageChange: (lang: LabelLanguage) => void;
  onConfirmLabelLanguage: (lang: LabelLanguage) => void;
  onLangChoiceConfirmed: () => void;
  onSetEntryGate: (gate: EntryGate) => void;
  onDomainSelect: (mode: ViewerMode, ultraLite: boolean) => void;
  onModeApply: (
    mode: ViewerMode,
    theater: ViewTheaterChoice,
    economyHub?: EconomyHubChoice,
  ) => void;
  onCustomLayerApply: () => void;
  onModePickerCancel: () => void;
  onSetChromeCoachStep: (step: ChromeCoachStep | null) => void;
  onSetIntelSheetOpen: (v: boolean) => void;
  onFrictionCoachStepChange: (next: FrictionCoachStep | null) => void;
  onSetShowAirRaidCoach: (v: boolean) => void;
  onOpenClearanceRecovery: () => void;
  onSetClearanceChipSettled: (v: boolean) => void;
  onSetWeeklyRecapCollapsed: (v: boolean) => void;
  onSetShowTourInvite: (v: boolean) => void;
  onSetPeriodicBriefing: (v: PeriodicBriefing | null) => void;
  onSetFoldedPeriodicBriefing: (v: PeriodicBriefing | null) => void;
  onSetTomorrowTensionPrompt: (v: DailyPrompt | null) => void;
  onSetClearanceStatus: (v: ClearanceStatus | null) => void;
  onToggleDailyRankPanel: (next: boolean) => void;
  onDismissAirRaidOffer: () => void;
  onDismissAdsbEmergencyOffer: () => void;
  onDismissNatoPerimeterAlert: () => void;
  onDismissExerciseOffer: () => void;
  onSetExerciseBriefing: (v: ExerciseBriefingContent | null) => void;
  onAcceptMaritimeOffer: () => void;
  onDismissMaritimeOffer: () => void;
  onDismissTensionSpike: () => void;
  onTensionSpikeJump: (destination: import("@/lib/tensionSpikeCut").TensionCutDestination) => void;
  onAcceptHotTheaterOffer: () => void;
  onDismissHotTheaterOffer: () => void;
  onAcceptUltraLiteOffer: () => void;
  onDismissUltraLiteOffer: () => void;
  onCloseUkmtoBriefing: () => void;
  onCloseNavareaBriefing: () => void;
  onReleaseAirRaidAutoBusy: () => void;
  onBeginLiveBriefing: (
    kind: LiveBriefingSession["kind"],
    patch: LayerPatch,
    placeLabel: string,
  ) => void;
  onSetAirRaidBriefing: (v: AirRaidBriefingContent | null) => void;
};

export function DashboardOverlayHost(props: DashboardOverlayHostProps) {
  const {
    labelLanguage,
    isCompactUi,
    isTabletUi = false,
    isEconomyViewer,
    viewerMode,
    intelSheetOpen,
    showLeftPanel,
    showIntroHint,
    showUkraineControl,
    showQuickStart,
    chromeCoachStep,
    showViewerIntro,
    selected,
    regionNavSelection,
    econNavSelection,
    rightDockOpen = false,
    showModePicker,
    entryGate,
    globeReady,
    isLoading,
    showUsCarriers,
    usCarriers,
    deployedCarrierCount,
    showGpsInterference,
    gpsJamStatus,
    gpsJamCellCount,
    gpsJamDate,
    showUsDfcSupplyChain,
    showBriTradeConnectivity,
    usDfcSupplyPaths,
    briTradePaths,
    issueUiPausedForLamp,
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
    tourScenes,
    showFeatureGuide,
    askLayersOpen,
    showTrustPanel,
    showSourcesPanel,
    showDataSourceParchment,
    showMobileAlertFeed,
    playOverlay,
    sentinelActive,
    sentinelTour,
    sentinelIndex,
    whereIsItPool,
    liveBriefingSession,
    whatsNewUpdate,
    tomorrowTensionPrompt,
    periodicBriefing,
    foldedPeriodicBriefing,
    weeklyExpanded,
    tourActive,
    modePickerInitialMode,
    viewTheater,
    viewEconomyHub,
    modePickerLockMode,
    showFirstVisitTour,
    hubBriefOpen,
    frictionEpisodeBrief,
    frictionCoachStep,
    showAirRaidCoach,
    watchFocusLine,
    clearanceStatus,
    calendarDayKey,
    weeklyRecap,
    weeklyRecapCollapsed,
    showLampPreparing,
    showLanguageGate,
    showDailyRankPanel,
    telegramMiniPanelVisible,
    showTourInvite,
    airRaidOffer,
    airRaidBriefing,
    breakingFlash,
    onDismissBreakingFlash,
    adsbEmergencyOffer,
    natoPerimeterAlert,
    onDismissNatoPerimeterAlert,
    escalationOffer,
    onDismissEscalationOffer,
    exerciseOffer,
    exerciseBriefing,
    maritimeOffer,
    tensionSpike,
    hotTheaterOffer,
    ultraLiteOfferVisible,
    ultraLiteOfferProbe,
    gtiHeroSnapshot,
    gtiHeroVisible,
    timeScrubber = null,
    bottomDockMode = "history",
    onBottomDockModeChange,
    soundUnmuteReady,
    ukmtoBriefing,
    navareaBriefing,
    globeRef,
    intelStackRef,
    onCloseLeftPanel,
    onToggleLeftPanel,
    onSetShowUsCarriers,
    onSetShowGpsInterference,
    onSetShowUsDfcSupplyChain,
    onSetShowBriTradeConnectivity,
    onSetShowQuickStart,
    onSetShowViewerIntro,
    onSetShowTrustPanel,
    onSetShowSourcesPanel,
    onSetShowDataSourceParchment,
    onSetShowFeatureGuide,
    onSetAskLayersOpen,
    onSetShowMobileAlertFeed,
    onMaybeOfferAirRaidCoach,
    onAirRaidFocus,
    onAskLayersApply,
    onSetShowFirstVisitTour,
    onSetTourActive,
    getSceneForShare,
    onSetSentinelActive,
    onSetPlayOverlay,
    onSetShowCityLabels,
    onEndLiveBriefing,
    flyTo,
    onSetWhatsNewUpdate,
    onLabelLanguageChange,
    onConfirmLabelLanguage,
    onLangChoiceConfirmed,
    onSetEntryGate,
    onDomainSelect,
    onModeApply,
    onCustomLayerApply,
    onModePickerCancel,
    onSetChromeCoachStep,
    onSetIntelSheetOpen,
    onFrictionCoachStepChange,
    onSetShowAirRaidCoach,
    onOpenClearanceRecovery,
    onSetClearanceChipSettled,
    onSetWeeklyRecapCollapsed,
    onSetShowTourInvite,
    onSetPeriodicBriefing,
    onSetFoldedPeriodicBriefing,
    onSetTomorrowTensionPrompt,
    onSetClearanceStatus,
    onToggleDailyRankPanel,
    onDismissAirRaidOffer,
    onDismissAdsbEmergencyOffer,
    onDismissExerciseOffer,
    onSetExerciseBriefing,
    onAcceptMaritimeOffer,
    onDismissMaritimeOffer,
    onDismissTensionSpike,
    onTensionSpikeJump,
    onAcceptHotTheaterOffer,
    onDismissHotTheaterOffer,
    onAcceptUltraLiteOffer,
    onDismissUltraLiteOffer,
    onCloseUkmtoBriefing,
    onCloseNavareaBriefing,
    onReleaseAirRaidAutoBusy,
    onBeginLiveBriefing,
    onSetAirRaidBriefing,
  } = props;

  const [navToolsEl, setNavToolsEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isCompactUi) {
      setNavToolsEl(null);
      return;
    }
    const sync = () => {
      setNavToolsEl(document.getElementById("hover-nav-desktop-tools"));
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [isCompactUi]);

  /** 우측 독 사이드바 제거 — 칩 inset 불필요 (하단 시트만 사용) */
  useEffect(() => {
    document.documentElement.style.setProperty("--chrome-right-dock-inset", "0px");
  }, []);

  const showFoldedLampTab =
    Boolean(foldedPeriodicBriefing) && !periodicBriefing && !weeklyExpanded;
  const showFoldedWeeklyTab = Boolean(
    weeklyRecap &&
      weeklyRecapCollapsed &&
      !periodicBriefing &&
      !foldedPeriodicBriefing,
  );
  const showFoldedBriefingTabs = showFoldedLampTab || showFoldedWeeklyTab;
  /** 우측 사이드바 없음 — 좌측 레일은 레이어 패널·시트만 피하면 됨 */
  const railVisible = !intelSheetOpen && !isCompactUi && !showLeftPanel;

  const foldedBriefingTabs = showFoldedBriefingTabs ? (
    <div className="pointer-events-auto flex flex-col items-start gap-1.5">
      {showFoldedLampTab && foldedPeriodicBriefing ? (
        <button
          type="button"
          onClick={() => {
            onSetPeriodicBriefing(foldedPeriodicBriefing);
            onSetFoldedPeriodicBriefing(null);
          }}
          className="group flex items-center gap-1.5 rounded-r-md border border-l-0 border-amber-700/60 bg-[#f0d99f]/95 py-2.5 pl-1.5 pr-2 text-[#34230f] shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[#f8e8bd] hover:pl-2.5"
          aria-label={
            labelLanguage === "en"
              ? "Reopen today's lamp news"
              : "오늘의 등불뉴스 다시 펼치기"
          }
          title={labelLanguage === "en" ? "Today's lamp news" : "오늘의 등불뉴스"}
        >
          <span
            className="text-micro font-semibold tracking-[0.14em]"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {labelLanguage === "en" ? "Lamp" : "등불"}
          </span>
          <span className="text-sm leading-none" aria-hidden>
            {"\uD83C\uDFEE"}
          </span>
        </button>
      ) : null}
      {showFoldedWeeklyTab && weeklyRecap ? (
        <button
          type="button"
          onClick={() => {
            clearWeeklyRecapFolded(weeklyRecap.key);
            onSetWeeklyRecapCollapsed(false);
          }}
          className="group flex items-center gap-1.5 rounded-r-md border border-l-0 border-[#6b4a22]/60 bg-[#e8d4a8]/95 py-2.5 pl-1.5 pr-2 text-[#3d2a18] shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[#f3e6c4] hover:pl-2.5"
          aria-label={
            labelLanguage === "en" ? "Reopen weekly recap" : "지난주 회고 다시 펼치기"
          }
          title={labelLanguage === "en" ? "Last week's recap" : "지난주 회고"}
        >
          <span
            className="text-micro font-semibold tracking-[0.14em]"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {labelLanguage === "en" ? "Recap" : "회고"}
          </span>
          <span className="text-sm leading-none" aria-hidden>
            {"\u2726"}
          </span>
        </button>
      ) : null}
    </div>
  ) : null;

  /**
   * 게이트 파생 (P2-1 8단계).
   *
   * 이 파일에서 `entryGate === null`이 13곳, 그중 `&& !showModePicker`까지
   * 붙는 조합이 6곳 반복됐다. 새 오버레이를 추가할 때마다 어느 조합을
   * 써야 하는지 매번 옆줄을 보고 베끼는 상태였다.
   *
   * `gateClear` = 게이트·모드피커가 모두 닫힘 = 오버레이를 띄워도 되는 상태.
   * (상위에서 `screen`을 prop으로 내려주게 되면 이 지역 파생은 지운다.)
   */
  const gateClosed = entryGate === null;
  const gateClear = gateClosed && !showModePicker;
  const { offer: tickerSpikeOffer, dismiss: dismissTickerSpike } = useDatabentoSpikeOffer(
    gateClear && !showLanguageGate,
  );

  useEffect(() => {
    if (showDailyRankPanel) markBriefingStep("gti");
  }, [showDailyRankPanel]);

  useEffect(() => {
    if (intelSheetOpen) markBriefingStep("intel");
  }, [intelSheetOpen]);

  return (
    <>
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
          gateClosed
        }
        viewerMode={viewerMode}
        onDismiss={() => onSetShowQuickStart(false)}
      />

      {showViewerIntro && gateClear && globeReady && !isLoading ? (
        <ViewerIntroOverlay
          visible
          viewerMode={viewerMode}
          onDismiss={() => onSetShowViewerIntro(false)}
          onOpenTrust={() => onSetShowTrustPanel(true)}
          trustLang={labelLanguage === "en" ? "en" : "ko"}
        />
      ) : null}

      {showLeftPanel ? (
        <button
          type="button"
          aria-label={t("ariaClosePanel", labelLanguage)}
          className="absolute inset-0 z-[500] bg-[#0a1528]/40 backdrop-blur-[1px]"
          onClick={onCloseLeftPanel}
        />
      ) : null}

      {!intelSheetOpen ? (
      <div
        className={`pointer-events-none absolute left-3 flex flex-col items-start gap-2 ${
          showDailyRankPanel ? zc("panel") : zc("mapControl")
        }`}
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
              id="layer-panel-toggle"
              aria-label={
                showLeftPanel
                  ? t("hoverLayerPanelClose", labelLanguage)
                  : t("hoverLayerPanelOpenAria", labelLanguage)
              }
              onClick={onToggleLeftPanel}
              className="map-chrome-control flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
            >
              <HamburgerIcon open={showLeftPanel} />
            </button>
          </HoverHint>
        </div>
        {/* 모바일: 후원만 좌측 유지. 데스크톱 항모·공급망·GSCPI·Watch는 우측 레일 */}
        {!showLeftPanel && isCompactUi ? (
          <div className="cv-compact-only pointer-events-auto shrink-0">
            <ServerDonateChip lang={labelLanguage} />
          </div>
        ) : null}
      </div>
      ) : null}

      {/* 데스크톱·태블릿 좌측 레일 — 우측은 칩만 (사이드바/우레일 이중 축 금지) */}
      {railVisible ? (
        <div
          className="cv-desktop-only cv-chrome-rail-left pointer-events-none absolute left-3 z-[200] flex flex-col items-start gap-2 overflow-y-auto overscroll-contain sm:left-4"
          style={{
            maxWidth: isTabletUi
              ? "min(16rem, calc(100vw - 1.5rem))"
              : "min(20rem, calc(100vw - 1.5rem))",
          }}
        >
          {!isEconomyViewer ? (
            <>
              <GpsJamFixedToggle
                checked={showGpsInterference}
                onChange={onSetShowGpsInterference}
                status={gpsJamStatus}
                cellCount={gpsJamCellCount}
                date={gpsJamDate}
                hintPlacement="right"
              />
              {!showGpsInterference ? (
                <UsCarrierFixedToggle
                  checked={showUsCarriers}
                  onChange={onSetShowUsCarriers}
                  carrierCount={usCarriers.length}
                  deployedCount={deployedCarrierCount}
                  hintPlacement="right"
                />
              ) : null}
            </>
          ) : (
            <>
              <EconomySupplyChainFixedToggle
                showUsDfc={showUsDfcSupplyChain}
                showChinaBri={showBriTradeConnectivity}
                onUsDfcChange={onSetShowUsDfcSupplyChain}
                onChinaBriChange={onSetShowBriTradeConnectivity}
                usLinkCount={usDfcSupplyPaths.length || US_DFC_LINK_COUNT}
                chinaLinkCount={briTradePaths.length || BRI_TRADE_LINK_COUNT}
                vertical
                align="start"
              />
              {gateClosed && !isTabletUi ? (
                <div className="pointer-events-auto w-full max-w-[min(20rem,calc(100vw-1.5rem))]">
                  <FinintTicker compact />
                </div>
              ) : null}
            </>
          )}
          <div className="pointer-events-auto shrink-0">
            <ServerDonateChip lang={labelLanguage} />
          </div>
          {!isEconomyViewer && gateClosed ? (
            <div className="flex w-full max-w-[min(18rem,calc(100vw-1.5rem))] flex-col items-start gap-2">
              <TopWatchPanel lang={labelLanguage} />
              <div className="cv-tablet-hide-sitrep w-full">
                <SitrepLog lang={labelLanguage} />
              </div>
            </div>
          ) : null}
          {foldedBriefingTabs}
        </div>
      ) : null}

      {/* 데스크톱 우상단 → HoverNav 포털. 모바일 compact만 우측 유지 */}
      {!intelSheetOpen && !isCompactUi && navToolsEl
        ? createPortal(
            <>
              {!issueUiPausedForLamp &&
              ((!isEconomyViewer &&
                (showNeptun || neptunAlertCount > 0 || showTzevaAdom || showNewfeedsIranAttacks)) ||
                (isEconomyViewer && showNewfeedsIranAttacks)) ? (
                <div
                  id="air-raid-chrome"
                  className="pointer-events-auto flex items-start gap-2"
                  onPointerEnter={onMaybeOfferAirRaidCoach}
                  onFocusCapture={onMaybeOfferAirRaidCoach}
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
                      onFocusUkraine={(target) => onAirRaidFocus(target, "neptun")}
                      onFocusIsrael={(target) => onAirRaidFocus(target, "tzeva")}
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
                      onFocusAttack={(target) => onAirRaidFocus(target, "newfeeds")}
                    />
                  ) : null}
                </div>
              ) : null}
              {/* 데스크톱 주요전장/허브는 TopChrome ScenarioPresetChips만 (여기 ExplorationTabs 중복 제거) */}
              <div className="pointer-events-auto flex shrink-0 items-center gap-3">
                {gateClear ? (
                  <div className="mx-1 shrink-0">
                    <ParchmentProTipChip lang={labelLanguage} />
                  </div>
                ) : null}
                <UtilityChromeMenu
                  lang={labelLanguage}
                  showProTip={false}
                  captureFrame={async () =>
                    (await globeRef.current?.captureFrame()) ?? null
                  }
                  getScene={getSceneForShare}
                  onTour={() => {
                    if (!isEconomyViewer && tourScenes.length > 0) {
                      trackEvent("tour_start", { scenes: tourScenes.length }, { lang: labelLanguage });
                      onSetTourActive(true);
                    }
                  }}
                  onHelp={() => onSetShowFeatureGuide(true)}
                  onOpenSources={() => onSetShowSourcesPanel(true)}
                  onOpenParchment={() => onSetShowDataSourceParchment(true)}
                />
                {gateClear ? (
                  <>
                    <SentinelModeButton
                      lang={labelLanguage}
                      active={sentinelActive}
                      current={sentinelTour[sentinelIndex] ?? null}
                      economyMode={isEconomyViewer}
                      onToggle={() => {
                        onSetSentinelActive((v) => !v);
                        if (!sentinelActive) {
                          onSetPlayOverlay(null);
                          onSetShowMobileAlertFeed(false);
                        }
                      }}
                    />
                    {!issueUiPausedForLamp && playOverlay === null && !sentinelActive ? (
                      <PlayHubButton
                        lang={labelLanguage}
                        onPick={(kind) => {
                          if (kind === "where" && whereIsItPool.length < 4) return;
                          onSetPlayOverlay(kind);
                          if (kind === "where") {
                            onSetShowCityLabels(false);
                          }
                        }}
                      />
                    ) : null}
                    <SoundMuteControl lang={labelLanguage} variant="fab" />
                  </>
                ) : null}
              </div>
            </>,
            navToolsEl,
          )
        : null}

      {!intelSheetOpen && isCompactUi ? (
        <div
          className="pointer-events-none absolute right-3 z-[200] flex flex-col items-end gap-2"
          style={{
            top: "calc(max(3.25rem, var(--mode-index-chip-bottom, 3.25rem)) + 0.35rem)",
          }}
        >
          <div className="cv-compact-only pointer-events-auto flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => onSetShowMobileAlertFeed((prev) => !prev)}
              aria-label={labelLanguage === "en" ? "Alerts" : "알림"}
              aria-pressed={showMobileAlertFeed}
              className="map-chrome-control tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-slate-950/70 text-[15px] text-sky-100 shadow-sm transition hover:border-sky-200/45"
            >
              🔔
            </button>
            <TrustBadgeChip
              lang={labelLanguage}
              compact
              onClick={() => onSetShowTrustPanel(true)}
            />
            <SourcesLinkButton onClick={() => onSetShowSourcesPanel(true)} />
            <ParchmentLinkButton onClick={() => onSetShowDataSourceParchment(true)} />
          </div>
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
          className="cv-compact-only pointer-events-none absolute bottom-[calc(var(--bottom-intel-stack-clearance)+0.65rem+env(safe-area-inset-bottom,0px))] right-3 z-[100] flex flex-col items-end gap-2"
        >
          <div
            className="pointer-events-auto flex flex-col items-end gap-2"
            onPointerEnter={onMaybeOfferAirRaidCoach}
            onFocusCapture={onMaybeOfferAirRaidCoach}
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
                onFocusUkraine={(target) => onAirRaidFocus(target, "neptun")}
                onFocusIsrael={(target) => onAirRaidFocus(target, "tzeva")}
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
                onFocusAttack={(target) => onAirRaidFocus(target, "newfeeds")}
              />
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
      {/* open 조건을 부모로 끌어올림 — dynamic 청크가 열릴 때만 로드되게 */}
      {showFeatureGuide ? (
        <FeatureGuidePanel
          open
          viewerMode={viewerMode}
          onClose={() => onSetShowFeatureGuide(false)}
          onOpenSources={() => {
            onSetShowFeatureGuide(false);
            onSetShowSourcesPanel(true);
          }}
          onOpenParchment={() => {
            onSetShowFeatureGuide(false);
            onSetShowDataSourceParchment(true);
          }}
          onRestartTour={() => {
            clearFirstVisitTourDone();
            onSetShowFirstVisitTour(true);
          }}
        />
      ) : null}
      {askLayersOpen ? (
        <AskLayersOverlay
          open
          lang={labelLanguage}
          viewerMode={viewerMode}
          onClose={() => onSetAskLayersOpen(false)}
          onApply={onAskLayersApply}
        />
      ) : null}
      <NewsTrustTierPanel
        open={showTrustPanel}
        lang={labelLanguage}
        onClose={() => onSetShowTrustPanel(false)}
      />
      {showSourcesPanel ? (
        <MethodologySourcesPanel
          open
          onClose={() => onSetShowSourcesPanel(false)}
          onOpenTrust={() => {
            onSetShowSourcesPanel(false);
            onSetShowTrustPanel(true);
          }}
          onOpenParchment={() => {
            onSetShowSourcesPanel(false);
            onSetShowDataSourceParchment(true);
          }}
        />
      ) : null}
      {showDataSourceParchment ? (
        <DataSourceParchmentOverlay
          lang={labelLanguage}
          variant="browse"
          onClose={() => onSetShowDataSourceParchment(false)}
        />
      ) : null}


      {/*
        음소거·세션 FAB — 데스크톱은 HoverNav 포털로 이관.
        모바일 compact만 우하단 유지. 실시간 중계 종료 칩은 양쪽.
      */}
      {gateClosed && (isCompactUi || liveBriefingSession) ? (
        <div
          className={`pointer-events-none fixed right-4 z-[900] flex flex-col items-end gap-2 sm:right-5 ${
            isCompactUi ? "cv-chrome-fab-bottom" : "bottom-5 sm:bottom-6"
          }`}
        >
          {isCompactUi && gateClear ? (
            <SentinelModeButton
              lang={labelLanguage}
              active={sentinelActive}
              current={sentinelTour[sentinelIndex] ?? null}
              economyMode={isEconomyViewer}
              onToggle={() => {
                onSetSentinelActive((v) => !v);
                if (!sentinelActive) {
                  onSetPlayOverlay(null);
                  onSetShowMobileAlertFeed(false);
                }
              }}
            />
          ) : null}
          {isCompactUi && !issueUiPausedForLamp && playOverlay === null && !sentinelActive ? (
            <PlayHubButton
              lang={labelLanguage}
              onPick={(kind) => {
                if (kind === "where" && whereIsItPool.length < 4) return;
                onSetPlayOverlay(kind);
                if (kind === "where") {
                  onSetShowCityLabels(false);
                }
              }}
            />
          ) : null}
          {liveBriefingSession ? (
            <button
              type="button"
              onClick={onEndLiveBriefing}
              className="pointer-events-auto group flex max-w-[min(72vw,15rem)] items-center gap-2 rounded-full border border-amber-400/45 bg-[rgba(12,10,6,0.92)] px-3 py-2 text-left shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-amber-300/70 hover:bg-[rgba(20,16,8,0.95)]"
              title={labelLanguage === "en" ? "End live briefing" : "실시간 중계 종료"}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/70 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-micro font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                  {labelLanguage === "en" ? "Live brief" : "실시간 중계"}
                </span>
                <span className="block truncate text-meta font-medium text-stone-100">
                  {labelLanguage === "en" ? liveBriefingSession.labelEn : liveBriefingSession.labelKo}
                </span>
                <span className="block text-micro text-stone-400 group-hover:text-amber-200/80">
                  {labelLanguage === "en" ? "Tap to end" : "탭해서 중계 종료"}
                </span>
              </span>
            </button>
          ) : null}
          {isCompactUi ? <SoundMuteControl lang={labelLanguage} variant="fab" /> : null}
        </div>
      ) : null}

      {playOverlay === "where" ? (
        <WhereIsItGameOverlay
          lang={labelLanguage}
          pool={whereIsItPool}
          onFlyTo={(lat, lng, altitude) => flyTo(lat, lng, altitude, 900, { pitch: 42, bearing: -12 })}
          onClose={() => onSetPlayOverlay(null)}
        />
      ) : null}

      {playOverlay === "sense" ? (
        <GeopoliticsSenseQuizModal lang={labelLanguage} onClose={() => onSetPlayOverlay(null)} />
      ) : null}

      {sentinelActive ? (
        <SentinelHud
          lang={labelLanguage}
          current={sentinelTour[sentinelIndex] ?? null}
          index={sentinelIndex}
          total={sentinelTour.length}
          economyMode={isEconomyViewer}
          onExit={() => onSetSentinelActive(false)}
        />
      ) : null}

      {whatsNewUpdate &&
      gateClear &&
      !playOverlay &&
      !tomorrowTensionPrompt &&
      !periodicBriefing &&
      !weeklyExpanded &&
      !sentinelActive ? (
        <WhatsNewModal
          lang={labelLanguage}
          update={whatsNewUpdate}
          onDismiss={() => onSetWhatsNewUpdate(null)}
          onCta={() => {
            onSetWhatsNewUpdate(null);
            if (whereIsItPool.length >= 4) {
              onSetPlayOverlay("where");
              onSetShowCityLabels(false);
            } else {
              onSetPlayOverlay("sense");
            }
          }}
        />
      ) : null}

      <TourSequencer
        scenes={tourScenes}
        active={tourActive}
        lang={labelLanguage}
        flyTo={(lat, lng, altitude, durationMs) => {
          globeRef.current?.pointOfView({ lat, lng, altitude }, durationMs);
        }}
        onStop={() => onSetTourActive(false)}
      />

      <EntryGateHost
        entryGate={entryGate}
        isCompactUi={isCompactUi}
        labelLanguage={labelLanguage}
        onLabelLanguageChange={onLabelLanguageChange}
        onLangChoiceConfirmed={onLangChoiceConfirmed}
        onSetGate={onSetEntryGate}
        onDomainSelect={onDomainSelect}
      />

      {showLanguageGate ? (
        <LanguageGateOverlay lang={labelLanguage} onSelect={onConfirmLabelLanguage} />
      ) : null}

      {showModePicker ? (
        <ModePickerOverlay
          initialMode={modePickerInitialMode ?? viewerMode}
          initialTheater={viewTheater}
          initialEconomyHub={viewEconomyHub}
          lockMode={modePickerLockMode}
          onConfirm={onModeApply}
          onCustom={onCustomLayerApply}
          onCancel={onModePickerCancel}
        />
      ) : null}

      {chromeCoachStep &&
      !showFirstVisitTour &&
      gateClear &&
      !hubBriefOpen &&
      !frictionEpisodeBrief &&
      !frictionCoachStep ? (
        <ChromeOnboardingCoach
          step={chromeCoachStep}
          viewerMode={viewerMode}
          lang={labelLanguage}
          onStepChange={onSetChromeCoachStep}
        />
      ) : null}

      {showFirstVisitTour &&
      gateClear &&
      !hubBriefOpen &&
      !frictionEpisodeBrief ? (
        <FirstVisitTour
          active
          lang={labelLanguage}
          viewerMode={viewerMode}
          onClose={() => onSetShowFirstVisitTour(false)}
          onOpenIntel={() => {
            onSetIntelSheetOpen(true);
            intelStackRef.current?.openNewsPanel("all", "news");
          }}
          onCloseIntel={() => {
            onSetIntelSheetOpen(false);
            intelStackRef.current?.closeNewsPanel();
          }}
        />
      ) : null}

      {frictionCoachStep &&
      gateClear &&
      !chromeCoachStep &&
      !showFirstVisitTour &&
      !isEconomyViewer ? (
        <FrictionOnboardingCoach
          step={frictionCoachStep}
          lang={labelLanguage}
          onStepChange={onFrictionCoachStepChange}
        />
      ) : null}

      {showAirRaidCoach &&
      !issueUiPausedForLamp &&
      gateClear &&
      !chromeCoachStep &&
      !showFirstVisitTour &&
      !frictionCoachStep &&
      !hubBriefOpen &&
      !frictionEpisodeBrief ? (
        <AirRaidOnboardingCoach
          open
          lang={labelLanguage}
          placement={isCompactUi ? "above" : "below"}
          onDismiss={() => onSetShowAirRaidCoach(false)}
        />
      ) : null}

      {isCompactUi && showMobileAlertFeed ? (
        <MobileAlertFeed
          onClose={() => onSetShowMobileAlertFeed(false)}
          viewerMode={viewerMode}
        />
      ) : null}

      {watchFocusLine &&
      gateClear &&
      !weeklyExpanded &&
      !periodicBriefing &&
      !sentinelActive ? (
        // 검색창(z≈200)과 같은 top에 두면 금색 테두리만 뒤로 비쳐 "빈 입력칸"처럼 보임.
        // compact에선 --hover-nav-base-height=0 이라 min으로 검색줄 높이만큼 확보.
        <div
          className="pointer-events-none absolute left-1/2 z-[100] w-[min(92vw,32rem)] -translate-x-1/2 px-2"
          style={{
            top: "calc(max(3.5rem, var(--hover-nav-base-height, 0px)) + 0.45rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <p className="rounded-full border border-amber-500/25 bg-[#0c1018]/88 px-3 py-1.5 text-center text-meta leading-snug tracking-[0.02em] text-amber-100/90 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:text-caption">
            {watchFocusLine}
          </p>
        </div>
      ) : null}

      {clearanceStatus &&
      clearanceStatus.kind !== "ok" &&
      gateClear &&
      !weeklyExpanded &&
      !periodicBriefing &&
      !tomorrowTensionPrompt &&
      !sentinelActive ? (
        <ClearanceThreatChip
          status={clearanceStatus}
          lang={labelLanguage}
          dayKey={calendarDayKey}
          onCta={() => {
            onSetClearanceChipSettled(true);
            onOpenClearanceRecovery();
          }}
          onDismiss={() => onSetClearanceChipSettled(true)}
        />
      ) : null}

      {weeklyRecap && !weeklyRecapCollapsed ? (
        <PeriodicBriefingParchment
          briefing={weeklyRecap}
          lang={labelLanguage}
          onDismiss={() => {
            markWeeklyRecapFolded(weeklyRecap.key);
            recordInterestNews(weeklyRecap.key, weeklyRecap.title || weeklyRecap.key);
            onSetWeeklyRecapCollapsed(true);
            if (shouldOfferTourInvite()) {
              window.setTimeout(() => onSetShowTourInvite(true), 450);
            }
          }}
        />
      ) : null}

      {/*
        접힌 등불·주간 회고 — 좌측 레일이 보일 때는 레일 flex 안.
        레일 숨김(레이어 패널 등)일 때만 좌측 가장자리 단독 앵커.
      */}
      {!railVisible && showFoldedBriefingTabs ? (
        <div
          className={`pointer-events-auto fixed left-0 ${zc("panel")}`}
          style={{
            top: "calc(var(--mode-index-chip-bottom, 4rem) + 0.75rem)",
          }}
        >
          {foldedBriefingTabs}
        </div>
      ) : null}

      <LampPreparingOverlay open={showLampPreparing} lang={labelLanguage} />

      {periodicBriefing && !weeklyExpanded && !sentinelActive ? (
        <PeriodicBriefingParchment
          briefing={periodicBriefing}
          lang={labelLanguage}
          onFlyToForgottenWarning={({ lat, lng, altitude }) => {
            flyTo(lat, lng, altitude ?? 1.45, 1400);
          }}
          onDismiss={() => {
            markPeriodSeen(periodicBriefing.key);
            markLampFolded(periodicBriefing.key);
            recordInterestNews(
              periodicBriefing.key,
              periodicBriefing.title || periodicBriefing.key,
            );
            markAnalystActive();
            const prefs = syncClearancePrefs(readDailyPredictPrefs());
            writeDailyPredictPrefs(prefs);
            onSetClearanceStatus(resolveClearanceStatus(prefs));
            onSetFoldedPeriodicBriefing(periodicBriefing);
            onSetPeriodicBriefing(null);
            if (shouldOfferTourInvite()) {
              window.setTimeout(() => onSetShowTourInvite(true), 450);
            }
          }}
        />
      ) : null}

      {tomorrowTensionPrompt && !periodicBriefing && !weeklyExpanded ? (
        <TomorrowTensionModal
          lang={labelLanguage}
          prompt={tomorrowTensionPrompt}
          onDismiss={() => {
            markTensionPromptSeen(calendarDayKey);
            onSetTomorrowTensionPrompt(null);
            const prefs = syncClearancePrefs(readDailyPredictPrefs());
            writeDailyPredictPrefs(prefs);
            onSetClearanceStatus(resolveClearanceStatus(prefs));
          }}
        />
      ) : null}

      {!isCompactUi &&
      gateClear &&
      !periodicBriefing &&
      !weeklyExpanded &&
      !tomorrowTensionPrompt &&
      !sentinelActive ? (
        <div
          className={`cv-desktop-only pointer-events-auto fixed left-3 z-[600] flex flex-col items-stretch gap-2 sm:left-4 cv-chrome-daily-bottom ${
            telegramMiniPanelVisible ? "cv-chrome-daily-bottom--telegram" : ""
          } ${showDailyRankPanel ? "cv-chrome-daily-open" : "w-fit"}`}
        >
          {gateClosed &&
          !showModePicker &&
          !showLeftPanel &&
          !showDailyRankPanel &&
          !telegramMiniPanelVisible ? (
            <DailyBriefingChrome
              lang={labelLanguage}
              layout="stack"
              suppressed={Boolean(weeklyExpanded || tomorrowTensionPrompt || sentinelActive)}
              onOpenDailyPanel={() => {
                markBriefingStep("share");
                onToggleDailyRankPanel(true);
              }}
            />
          ) : null}
          {showDailyRankPanel ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-sky-400/25 bg-[#071018]/94 shadow-2xl backdrop-blur-md">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <p className="min-w-0 truncate text-meta font-semibold text-sky-100">
                  {labelLanguage === "en" ? "Daily · GTS" : "오늘의 GTS"}
                </p>
                <button
                  type="button"
                  onClick={() => onToggleDailyRankPanel(false)}
                  aria-label={labelLanguage === "en" ? "Close daily panel" : "일일 패널 닫기"}
                  title={labelLanguage === "en" ? "Close" : "닫기"}
                  className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500/60 bg-slate-950/90 text-sm text-slate-200 transition hover:border-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="intel-scroll-y min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2.5 py-2">
                <DailyRankSharePanel lang={labelLanguage} />
              </div>
            </div>
          ) : (
            <LegendReopenButton
              label={labelLanguage === "en" ? "Daily · GTS" : "오늘의 GTS"}
              onClick={() => {
                markBriefingStep("gti");
                onToggleDailyRankPanel(true);
              }}
            />
          )}
        </div>
      ) : null}

      <TourInviteBanner
        lang={labelLanguage}
        open={showTourInvite && !showFirstVisitTour && !periodicBriefing && !weeklyExpanded}
        onAccept={() => {
          onSetShowTourInvite(false);
          clearFirstVisitTourDone();
          onSetShowFirstVisitTour(true);
        }}
        onDismiss={() => onSetShowTourInvite(false)}
      />

      {(() => {
        /** 배너 1개 정책: 공습 > ADS-B/훈련 > 해상 > 선물SPIKE > 긴장컷 > 핫전장 > 코치 > Ultra-Lite */
        const briefingBusy = Boolean(
          airRaidBriefing ||
            exerciseBriefing ||
            ukmtoBriefing ||
            navareaBriefing ||
            issueUiPausedForLamp,
        );
        const bannerCandidates = buildOverlayBannerCandidates({
          briefingBusy,
          airRaidOffer: Boolean(airRaidOffer),
          adsbEmergencyOffer: Boolean(adsbEmergencyOffer),
          escalationOffer: Boolean(escalationOffer),
          exerciseOffer: Boolean(exerciseOffer),
          maritimeOffer: Boolean(maritimeOffer),
          tickerSpikeOffer: Boolean(tickerSpikeOffer),
          tensionSpike: Boolean(tensionSpike),
          hotTheaterOffer: Boolean(hotTheaterOffer),
          coachActive: Boolean(
            chromeCoachStep ||
              showAirRaidCoach ||
              frictionCoachStep ||
              showFirstVisitTour,
          ),
          // 언어 게이트·양피지 준비 중엔 묻지 않는다 (첫 90초 주인공은 지도·속보)
          ultraLiteOffer: ultraLiteOfferVisible && !showLanguageGate && !showLampPreparing,
          isEconomyViewer,
          entryGateOpen: entryGate !== null,
          modePickerOpen: showModePicker,
        });
        /**
         * P2-3: 세션 예산을 **우선순위 계산 이전에** 적용한다.
         * 뒤에 적용하면 예산 초과 배너가 1위를 차지한 채 사라져
         * 그 아래 후보까지 같이 묻힌다.
         */
        const budgeted = applyOverlayBudget(bannerCandidates);
        const show = (kind: Parameters<typeof canShowOverlayBanner>[0]) => {
          const visible = canShowOverlayBanner(kind, budgeted);
          // 실제로 화면에 나가는 시점에만 예산을 쓴다.
          // markOverlayShown은 종류별로 멱등하므로 리렌더·StrictMode 이중 렌더에
          // 예산이 갉아먹히지 않는다.
          if (visible) markOverlayShown(kind);
          return visible;
        };

        return (
          <>
            {show("airRaid") && airRaidOffer ? (
              <AirRaidOfferBanner
                offer={airRaidOffer}
                lang={labelLanguage}
                onDismiss={onDismissAirRaidOffer}
              />
            ) : null}

            {show("adsbEmergency") && adsbEmergencyOffer ? (
              <AdsbEmergencyBanner
                offer={adsbEmergencyOffer}
                lang={labelLanguage}
                onDismiss={onDismissAdsbEmergencyOffer}
              />
            ) : null}

            {natoPerimeterAlert.phase === "tier1" &&
            natoPerimeterAlert.cross &&
            !natoPerimeterAlert.story ? (
              <NatoPerimeterAlertChip
                cross={natoPerimeterAlert.cross}
                lang={labelLanguage}
                onDismiss={onDismissNatoPerimeterAlert}
              />
            ) : null}

            {/*
              확전 신호 — 자동 fly-to 를 하지 않는다.
              공습경보와 달리 "지금 대피하라"가 아니라 "이걸 읽어보라"이므로
              사용자가 보던 화면을 뺏지 않는다.
            */}
            {show("escalation") && escalationOffer ? (
              <div
                className={`pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] ${zc("gate")} -translate-x-1/2`}
              >
                <EscalationSignalPanel
                  signal={escalationOffer.top.signal}
                  lang={labelLanguage}
                  title={escalationOffer.top.title}
                  link={escalationOffer.top.link}
                  sourceLabel={escalationOffer.top.publisher}
                  suppressedCount={escalationOffer.suppressed}
                  onDismiss={onDismissEscalationOffer}
                />
              </div>
            ) : null}

            {show("exercise") && exerciseOffer ? (
              <ExerciseOfferBanner
                offer={exerciseOffer}
                lang={labelLanguage}
                onDismiss={() => {
                  markOverlayDismissed("exercise");
                  onDismissExerciseOffer();
                }}
              />
            ) : null}

            {show("maritime") && maritimeOffer ? (
              <MaritimeAlertOfferBanner
                offer={maritimeOffer}
                lang={labelLanguage}
                onAccept={onAcceptMaritimeOffer}
                onDismiss={() => {
                  markOverlayDismissed("maritime");
                  onDismissMaritimeOffer();
                }}
              />
            ) : null}

            {show("tickerSpike") && tickerSpikeOffer ? (
              <SpikeTelegraphBanner
                offer={tickerSpikeOffer}
                lang={labelLanguage}
                onDismiss={dismissTickerSpike}
                onOpenMarkets={() => {
                  dismissTickerSpike();
                  if (isEconomyViewer) {
                    intelStackRef.current?.openNewsPanel("all", "news", "markets");
                  } else {
                    intelStackRef.current?.openNewsPanel("all");
                  }
                  onSetIntelSheetOpen(true);
                }}
              />
            ) : null}

            {show("tensionCut") && tensionSpike ? (
              <TensionSpikeCutOverlay
                spike={tensionSpike}
                lang={labelLanguage === "en" ? "en" : "ko"}
                onJump={onTensionSpikeJump}
                onDismiss={() => {
                  markOverlayDismissed("tensionCut");
                  onDismissTensionSpike();
                }}
              />
            ) : null}

            {show("hotTheater") && hotTheaterOffer ? (
              <HotTheaterOfferBanner
                focus={hotTheaterOffer}
                lang={labelLanguage}
                onAccept={onAcceptHotTheaterOffer}
                onDismiss={() => {
                  markOverlayDismissed("hotTheater");
                  onDismissHotTheaterOffer();
                }}
              />
            ) : null}

            {show("ultraLite") ? (
              <UltraLiteOfferBanner
                probe={ultraLiteOfferProbe}
                lang={labelLanguage}
                onAccept={onAcceptUltraLiteOffer}
                onDismiss={() => {
                  markOverlayDismissed("ultraLite");
                  onDismissUltraLiteOffer();
                }}
              />
            ) : null}
          </>
        );
      })()}

      {airRaidBriefing ? (
        <AirRaidBriefingParchment
          briefing={airRaidBriefing}
          lang={labelLanguage}
          onDismiss={() => {
            const kind = airRaidBriefing.kind;
            const place =
              labelLanguage === "en"
                ? airRaidBriefing.title.replace(/^Air-raid alert\s*·\s*/i, "").trim() ||
                  "Alert zone"
                : airRaidBriefing.title.replace(/^공습경보\s*·\s*/, "").trim() || "경보 구역";
            onSetAirRaidBriefing(null);
            onReleaseAirRaidAutoBusy();
            onBeginLiveBriefing("air-raid", airRaidBriefingLayers(kind), place);
          }}
        />
      ) : null}

      {breakingFlash && !airRaidBriefing && !periodicBriefing && !weeklyExpanded ? (
        <BreakingFlashParchment
          briefing={breakingFlash}
          lang={labelLanguage}
          onDismiss={onDismissBreakingFlash}
        />
      ) : null}

      {natoPerimeterAlert.phase === "tier2" &&
      natoPerimeterAlert.cross &&
      natoPerimeterAlert.story ? (
        <NatoPerimeterHalfParchment
          briefing={{
            cross: natoPerimeterAlert.cross,
            story: natoPerimeterAlert.story,
          }}
          lang={labelLanguage}
          onDismiss={onDismissNatoPerimeterAlert}
        />
      ) : null}

      {exerciseBriefing ? (
        <ExerciseBriefingParchment
          briefing={exerciseBriefing}
          lang={labelLanguage}
          onDismiss={() => onSetExerciseBriefing(null)}
        />
      ) : null}

      {ukmtoBriefing ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={ukmtoBriefing.title}
          paragraphs={ukmtoBriefing.paragraphs}
          signOff={
            labelLanguage === "en"
              ? "UKMTO · unofficial maritime advisory\nGlobe Observatory"
              : "UKMTO · 비공식 해상 경보\n지구본 관측대"
          }
          ctaLabel={labelLanguage === "en" ? "Understood" : "확인"}
          onContinue={onCloseUkmtoBriefing}
          playBreakingDispatch
          typewriter={false}
          titleId="ukmto-briefing-title"
          zIndexClass="z-[900]"
        />
      ) : null}

      {navareaBriefing ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={navareaBriefing.title}
          paragraphs={navareaBriefing.paragraphs}
          signOff={
            labelLanguage === "en"
              ? "NAVAREA · official navigational warning\nGlobe Observatory"
              : "NAVAREA · 공식 항행 경보\n지구본 관측대"
          }
          ctaLabel={labelLanguage === "en" ? "Understood" : "확인"}
          onContinue={onCloseNavareaBriefing}
          playBreakingDispatch
          typewriter={false}
          titleId="navarea-briefing-title"
          zIndexClass="z-[900]"
        />
      ) : null}

      {gtiHeroSnapshot ? (
        <GtiHeroMoment
          snapshot={gtiHeroSnapshot}
          lang={labelLanguage}
          visible={gtiHeroVisible}
        />
      ) : null}

      {!intelSheetOpen && (timeScrubber || onBottomDockModeChange) ? (
        <div
          className={`pointer-events-none flex flex-col items-center gap-2 ${
            bottomDockMode === "news"
              ? "cv-bottom-chrome-above-stack cv-bottom-chrome-above-stack--dock"
              : "cv-bottom-dock-floor"
          } ${
            isCompactUi
              ? "w-[min(96vw,28rem)]"
              : "w-[min(92vw,36rem)]"
          }`}
        >
          {onBottomDockModeChange ? (
            <BottomDockModeToggle
              lang={labelLanguage}
              mode={bottomDockMode}
              onChange={onBottomDockModeChange}
              compact={isCompactUi}
            />
          ) : null}
          {bottomDockMode === "history" && timeScrubber ? (
            <TimeScrubberBar
              lang={labelLanguage}
              asOf={timeScrubber.asOf}
              today={timeScrubber.today}
              availableDates={timeScrubber.availableDates}
              onChange={timeScrubber.onChange}
              onGoToday={timeScrubber.onGoToday}
              compact={isCompactUi}
            />
          ) : null}
        </div>
      ) : null}

      <SoundUnmuteNudge lang={labelLanguage} ready={soundUnmuteReady} />

      <LayerCapToast lang={labelLanguage} suppressed={showLeftPanel} />
      <LayerCacheStaleBadge lang={labelLanguage} />
    </>
  );
}
