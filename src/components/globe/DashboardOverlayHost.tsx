"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { FeatureGuideButton, FeatureGuidePanel } from "@/components/FeatureGuidePanel";
import { MethodologySourcesPanel, SourcesLinkButton } from "@/components/MethodologySourcesPanel";
import { NewsTrustTierPanel } from "@/components/NewsTrustTierPanel";
import { TrustBadgeChip } from "@/components/TrustBadgeChip";
import { ShareViewButton } from "@/components/ShareViewButton";
import { DailyRankSharePanel } from "@/components/DailyRankSharePanel";
import { TomorrowTensionModal } from "@/components/TomorrowTensionModal";
import { TopWatchPanel } from "@/components/TopWatchPanel";
import { SitrepLog } from "@/components/SitrepLog";
import { MobileAlertFeed } from "@/components/MobileAlertFeed";
import { UnifiedAirRaidDropdown } from "@/components/UnifiedAirRaidDropdown";
import {
  AskLayersOverlay,
  type AskLayersApplyPayload,
} from "@/components/AskLayersOverlay";
import { HoverHint } from "@/components/HoverHint";
import { ParchmentProTipChip } from "@/components/ParchmentProTipChip";
import { ExplorationTabs } from "@/components/ExplorationTabs";
import { ModePickerOverlay } from "@/components/ModePickerOverlay";
import { SceneLinkButton } from "@/components/SceneLinkButton";
import { EntryGateHost } from "@/components/globe/EntryGateHost";
import { TourSequencer, type TourScene } from "@/components/globe/TourSequencer";
import { DiscordLinkButton } from "@/components/DiscordLinkButton";
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
import { AirRaidOfferBanner, type AirRaidOffer } from "@/components/AirRaidOfferBanner";
import { ExerciseOfferBanner, type ExerciseOffer } from "@/components/ExerciseOfferBanner";
import {
  ExerciseBriefingParchment,
  type ExerciseBriefingContent,
} from "@/components/ExerciseBriefingParchment";
import {
  MaritimeAlertOfferBanner,
  type MaritimeAlertOffer,
} from "@/components/MaritimeAlertOfferBanner";
import { LampPreparingOverlay } from "@/components/LampPreparingOverlay";
import { markTensionPromptSeen, type DailyPrompt } from "@/lib/dailyPrompt";
import {
  clearWeeklyRecapFolded,
  markPeriodSeen,
  markWeeklyRecapFolded,
  type PeriodicBriefing,
} from "@/lib/news/periodicBriefing";
import { recordInterestNews } from "@/lib/interest/recordInterest";
import { SoundMuteControl } from "@/components/SoundMuteControl";
import { PlayHubButton } from "@/components/PlayHubButton";
import { WhereIsItGameOverlay } from "@/components/WhereIsItGameOverlay";
import { GeopoliticsSenseQuizModal } from "@/components/GeopoliticsSenseQuizModal";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { SentinelHud, SentinelModeButton } from "@/components/SentinelModeControl";
import { type AppUpdate } from "@/lib/appUpdates";
import type { WhereIsItPoolItem } from "@/lib/whereIsItGame";
import { ViewerIntroOverlay } from "@/components/ViewerIntroOverlay";
import { QuickStartCoach } from "@/components/QuickStartCoach";
import { EXPLORATION_PRESETS } from "@/data/navRegions";
import { ECON_EXPLORATION_PRESETS } from "@/data/econNavRegions";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import { trackEvent } from "@/lib/trackClient";
import { NewFeedsIranPanel } from "@/components/NewFeedsIranPanel";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { NeptunAlerts } from "@/lib/neptun";
import { ServerDonateChip } from "@/components/ServerDonateChip";
import { UsCarrierFixedToggle } from "@/components/UsCarrierFixedToggle";
import { EconomySupplyChainFixedToggle } from "@/components/EconomySupplyChainFixedToggle";
import { HamburgerIcon } from "@/components/globe/HamburgerIcon";
import { LegendReopenButton } from "@/components/MapOverlayLegendPanel";
import type { EntryGate, Selection } from "@/components/globe/types";
import type { NavSelection, ExplorationPreset } from "@/data/navRegions";
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
} | null;

type LayerPatch = Parameters<typeof applyLayerPatch>[1];

export type DashboardOverlayHostProps = {
  labelLanguage: LabelLanguage;
  isCompactUi: boolean;
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
  showModePicker: boolean;
  entryGate: EntryGate;
  globeReady: boolean;
  isLoading: boolean;
  showUsCarriers: boolean;
  usCarriers: UsCarrier[];
  deployedCarrierCount: number;
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
  showMobileAlertFeed: boolean;
  showFoldedParchmentChip: boolean;
  playOverlay: "where" | "sense" | null;
  sentinelActive: boolean;
  sentinelTour: SentinelFlyTarget[];
  sentinelIndex: number;
  whereIsItPool: WhereIsItPoolItem[];
  liveBriefingSession: LiveBriefingSession | null;
  whatsNewUpdate: AppUpdate | null;
  tomorrowTensionPrompt: DailyPrompt | null;
  periodicBriefing: PeriodicBriefing | null;
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
  showDailyRankPanel: boolean;
  telegramMiniPanelVisible: boolean;
  showTourInvite: boolean;
  airRaidOffer: AirRaidOffer | null;
  airRaidBriefing: AirRaidBriefingContent | null;
  exerciseOffer: ExerciseOffer | null;
  exerciseBriefing: ExerciseBriefingContent | null;
  maritimeOffer: MaritimeAlertOffer | null;
  ukmtoBriefing: UkmtoBriefingContent | null;
  navareaBriefing: NavareaBriefingContent | null;
  globeRef: RefObject<MapGlobeMethods | null>;
  intelStackRef: RefObject<BottomIntelStackHandle | null>;
  onCloseLeftPanel: () => void;
  onToggleLeftPanel: () => void;
  onSetShowUsCarriers: (v: boolean) => void;
  onSetShowUsDfcSupplyChain: (v: boolean) => void;
  onSetShowBriTradeConnectivity: (v: boolean) => void;
  onSetShowQuickStart: (v: boolean) => void;
  onSetShowViewerIntro: (v: boolean) => void;
  onSetShowTrustPanel: (v: boolean) => void;
  onSetShowSourcesPanel: (v: boolean) => void;
  onSetShowFeatureGuide: (v: boolean) => void;
  onSetAskLayersOpen: (v: boolean) => void;
  onSetShowMobileAlertFeed: Dispatch<SetStateAction<boolean>>;
  onMaybeOfferAirRaidCoach: () => void;
  onAirRaidFocus: (
    target: AirRaidFocusTarget,
    kind: AirRaidSirenKind,
    options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
  ) => void;
  onExplorationSelect: (preset: ExplorationPreset) => void;
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
  onSetTomorrowTensionPrompt: (v: DailyPrompt | null) => void;
  onSetClearanceStatus: (v: ClearanceStatus | null) => void;
  onToggleDailyRankPanel: (next: boolean) => void;
  onDismissAirRaidOffer: () => void;
  onDismissExerciseOffer: () => void;
  onSetExerciseBriefing: (v: ExerciseBriefingContent | null) => void;
  onAcceptMaritimeOffer: () => void;
  onDismissMaritimeOffer: () => void;
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
    showModePicker,
    entryGate,
    globeReady,
    isLoading,
    showUsCarriers,
    usCarriers,
    deployedCarrierCount,
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
    showMobileAlertFeed,
    showFoldedParchmentChip,
    playOverlay,
    sentinelActive,
    sentinelTour,
    sentinelIndex,
    whereIsItPool,
    liveBriefingSession,
    whatsNewUpdate,
    tomorrowTensionPrompt,
    periodicBriefing,
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
    showDailyRankPanel,
    telegramMiniPanelVisible,
    showTourInvite,
    airRaidOffer,
    airRaidBriefing,
    exerciseOffer,
    exerciseBriefing,
    maritimeOffer,
    ukmtoBriefing,
    navareaBriefing,
    globeRef,
    intelStackRef,
    onCloseLeftPanel,
    onToggleLeftPanel,
    onSetShowUsCarriers,
    onSetShowUsDfcSupplyChain,
    onSetShowBriTradeConnectivity,
    onSetShowQuickStart,
    onSetShowViewerIntro,
    onSetShowTrustPanel,
    onSetShowSourcesPanel,
    onSetShowFeatureGuide,
    onSetAskLayersOpen,
    onSetShowMobileAlertFeed,
    onMaybeOfferAirRaidCoach,
    onAirRaidFocus,
    onExplorationSelect,
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
    onSetTomorrowTensionPrompt,
    onSetClearanceStatus,
    onToggleDailyRankPanel,
    onDismissAirRaidOffer,
    onDismissExerciseOffer,
    onSetExerciseBriefing,
    onAcceptMaritimeOffer,
    onDismissMaritimeOffer,
    onCloseUkmtoBriefing,
    onCloseNavareaBriefing,
    onReleaseAirRaidAutoBusy,
    onBeginLiveBriefing,
    onSetAirRaidBriefing,
  } = props;

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
          entryGate === null
        }
        viewerMode={viewerMode}
        onDismiss={() => onSetShowQuickStart(false)}
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
        onDismiss={() => onSetShowViewerIntro(false)}
        onOpenTrust={() => onSetShowTrustPanel(true)}
        trustLang={labelLanguage === "en" ? "en" : "ko"}
      />

      {showLeftPanel ? (
        <button
          type="button"
          aria-label={t("ariaClosePanel", labelLanguage)}
          className="absolute inset-0 z-20 bg-[#0a1528]/40 backdrop-blur-[1px]"
          onClick={onCloseLeftPanel}
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
              id="layer-panel-toggle"
              aria-label={
                showLeftPanel
                  ? t("hoverLayerPanelClose", labelLanguage)
                  : t("hoverLayerPanelOpenAria", labelLanguage)
              }
              onClick={onToggleLeftPanel}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
            >
              <HamburgerIcon open={showLeftPanel} />
            </button>
          </HoverHint>
        </div>
        {/* 레이어 패널이 열리면 항모·후원이 패널을 가리지 않도록 숨김 */}
        {!showLeftPanel ? (
          <>
            {!isCompactUi && !isEconomyViewer ? (
              <UsCarrierFixedToggle
                checked={showUsCarriers}
                onChange={onSetShowUsCarriers}
                carrierCount={usCarriers.length}
                deployedCount={deployedCarrierCount}
              />
            ) : null}
            {!isCompactUi && isEconomyViewer ? (
              <EconomySupplyChainFixedToggle
                showUsDfc={showUsDfcSupplyChain}
                showChinaBri={showBriTradeConnectivity}
                onUsDfcChange={onSetShowUsDfcSupplyChain}
                onChinaBriChange={onSetShowBriTradeConnectivity}
                usLinkCount={usDfcSupplyPaths.length}
                chinaLinkCount={briTradePaths.length}
              />
            ) : null}
            {!isCompactUi ? (
              <div className="cv-desktop-only pointer-events-auto shrink-0">
                <ServerDonateChip lang={labelLanguage} />
              </div>
            ) : null}
            {isCompactUi ? (
              <div className="cv-compact-only pointer-events-auto shrink-0">
                <ServerDonateChip lang={labelLanguage} />
              </div>
            ) : null}
            {/* 긴장 상승 / 상황 변화 — 항모·후원 아래. 높이 제한으로 좌하단 일일 패널과 겹치지 않게 */}
            {!isEconomyViewer && !isCompactUi && entryGate === null ? (
              <div className="flex max-h-[min(46vh,calc(100dvh-16rem))] w-full flex-col gap-2 overflow-y-auto overscroll-contain">
                <TopWatchPanel lang={labelLanguage} />
                <SitrepLog lang={labelLanguage} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      ) : null}

      {/* 데스크톱: 우상단 공습·주요전장·도움말 — 뉴스 시트 열리면 상단을 가리지 않도록 숨김 */}
      {!intelSheetOpen ? (
      <div
        className="pointer-events-none absolute right-3 z-[60] flex flex-col items-end gap-2"
        style={{ top: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        {/* 모바일 항모 토글은 검색창 아래 드롭다운(compactMenuExtra)으로 이동 — 상단 혼잡 완화 */}
        {!isCompactUi &&
        !issueUiPausedForLamp &&
        ((!isEconomyViewer &&
          (showNeptun || neptunAlertCount > 0 || showTzevaAdom || showNewfeedsIranAttacks)) ||
          (isEconomyViewer && showNewfeedsIranAttacks)) ? (
          <div
            id="air-raid-chrome"
            className="cv-desktop-only pointer-events-auto flex items-start gap-2"
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
        {!isCompactUi && !showLeftPanel && !econNavSelection ? (
          <ExplorationTabs
            presets={isEconomyViewer ? ECON_EXPLORATION_PRESETS : EXPLORATION_PRESETS}
            activeId={regionNavSelection?.id ?? null}
            onSelect={onExplorationSelect}
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
            <TrustBadgeChip lang={labelLanguage} onClick={() => onSetShowTrustPanel(true)} />
            <SourcesLinkButton onClick={() => onSetShowSourcesPanel(true)} />
            {entryGate === null && !showModePicker ? (
              <ParchmentProTipChip lang={labelLanguage} />
            ) : null}
            {!isEconomyViewer && tourScenes.length > 0 ? (
              <button
                type="button"
                aria-label={labelLanguage === "en" ? "Play today's tour" : "오늘의 투어 재생"}
                onClick={() => {
                  trackEvent("tour_start", { scenes: tourScenes.length }, { lang: labelLanguage });
                  onSetTourActive(true);
                }}
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-200/20 bg-[#4a3a1e]/55 px-2.5 text-[11px] font-medium text-amber-50/90 shadow-lg backdrop-blur-md transition hover:border-amber-200/40 hover:bg-[#5d4a26]/65"
              >
                <span aria-hidden>🎬</span>
                <span>{labelLanguage === "en" ? "Tour" : "투어"}</span>
              </button>
            ) : null}
            <DiscordLinkButton lang={labelLanguage} />
            <SceneLinkButton getScene={getSceneForShare} />
            <ShareViewButton getCanvas={() => globeRef.current?.renderer().domElement ?? null} />
            <FeatureGuideButton viewerMode={viewerMode} onClick={() => onSetShowFeatureGuide(true)} />
          </div>
        ) : (
          <div className="cv-compact-only pointer-events-auto flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => onSetShowMobileAlertFeed((prev) => !prev)}
              aria-label={labelLanguage === "en" ? "Alerts" : "알림"}
              aria-pressed={showMobileAlertFeed}
              className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-slate-950/70 text-[15px] text-sky-100 shadow-sm transition hover:border-sky-200/45"
            >
              🔔
            </button>
            <TrustBadgeChip
              lang={labelLanguage}
              compact
              onClick={() => onSetShowTrustPanel(true)}
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
      <FeatureGuidePanel
        open={showFeatureGuide}
        viewerMode={viewerMode}
        onClose={() => onSetShowFeatureGuide(false)}
        onRestartTour={() => {
          clearFirstVisitTourDone();
          onSetShowFirstVisitTour(true);
        }}
      />
      <AskLayersOverlay
        open={askLayersOpen}
        lang={labelLanguage}
        viewerMode={viewerMode}
        onClose={() => onSetAskLayersOpen(false)}
        onApply={onAskLayersApply}
      />
      <NewsTrustTierPanel
        open={showTrustPanel}
        lang={labelLanguage}
        onClose={() => onSetShowTrustPanel(false)}
      />
      <MethodologySourcesPanel
        open={showSourcesPanel}
        onClose={() => onSetShowSourcesPanel(false)}
        onOpenTrust={() => {
          onSetShowSourcesPanel(false);
          onSetShowTrustPanel(true);
        }}
      />


      {/*
        음소거 FAB — 첫 진입부터 항상 우측 하단 고정.
        모바일에서 소리가 갑자기 나올 때 즉시 끌 수 있어야 하므로, 모드 선택·양피지
        (z≤10040) 위에도 뜨도록 z-[10050]. 단 입장 주의 오버레이(entryGate)는
        자체 인라인 음소거 토글을 이미 크게 노출하고 있어 중복·겹침을 피해 제외.
        접힌 등불 칩(bottom-24/28 right)이 있으면 스택을 그 위로 올린다.
      */}
      {entryGate === null ? (
        <div
          className={`pointer-events-none fixed right-4 z-[10050] flex flex-col items-end gap-2 sm:right-5 ${
            showFoldedParchmentChip
              ? "bottom-[10.25rem] sm:bottom-[11.25rem]"
              : "bottom-5 sm:bottom-6"
          }`}
        >
          {entryGate === null && !showModePicker ? (
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
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                  {labelLanguage === "en" ? "Live brief" : "실시간 중계"}
                </span>
                <span className="block truncate text-[11px] font-medium text-stone-100">
                  {labelLanguage === "en" ? liveBriefingSession.labelEn : liveBriefingSession.labelKo}
                </span>
                <span className="block text-[9px] text-stone-400 group-hover:text-amber-200/80">
                  {labelLanguage === "en" ? "Tap to end" : "탭해서 중계 종료"}
                </span>
              </span>
            </button>
          ) : null}
          <SoundMuteControl lang={labelLanguage} variant="fab" />
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
      entryGate === null &&
      !showModePicker &&
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
        onSetGate={onSetEntryGate}
        onDomainSelect={onDomainSelect}
      />

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
      entryGate === null &&
      !showModePicker &&
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
      entryGate === null &&
      !showModePicker &&
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
      entryGate === null &&
      !showModePicker &&
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
      entryGate === null &&
      !showModePicker &&
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
      entryGate === null &&
      !showModePicker &&
      !weeklyExpanded &&
      !periodicBriefing &&
      !sentinelActive ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[42] w-[min(92vw,28rem)] -translate-x-1/2 px-2 sm:top-4">
          <p className="rounded-sm border border-amber-500/25 bg-[#0c1018]/88 px-3 py-1.5 text-center text-[11px] leading-snug tracking-[0.02em] text-amber-100/90 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:text-[12px]">
            {watchFocusLine}
          </p>
        </div>
      ) : null}

      {clearanceStatus &&
      clearanceStatus.kind !== "ok" &&
      entryGate === null &&
      !showModePicker &&
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

      {weeklyRecap && weeklyRecapCollapsed && !periodicBriefing ? (
        <button
          type="button"
          onClick={() => {
            clearWeeklyRecapFolded(weeklyRecap.key);
            onSetWeeklyRecapCollapsed(false);
          }}
          className="pointer-events-auto absolute bottom-24 right-3 z-[46] flex max-w-[min(16rem,calc(100vw-1.5rem))] items-center gap-2 rounded-sm border border-[#6b4a22]/55 bg-[#e8d4a8]/95 px-3 py-2.5 text-left text-[13px] text-[#3d2a18] shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[#f3e6c4] sm:bottom-28 sm:right-4"
          aria-label={
            labelLanguage === "en"
              ? "Reopen weekly recap"
              : "지난주 회고 다시 펼치기"
          }
        >
          <span className="text-base leading-none" aria-hidden>
            {"\u2726"}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium tracking-[0.04em]">
              {labelLanguage === "en" ? "Last week's recap" : "지난주 회고"}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-[#6b4a22]/75">
              {labelLanguage === "en" ? "Monday rhythm" : "매주 월요일"}
            </span>
          </span>
        </button>
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
            recordInterestNews(
              periodicBriefing.key,
              periodicBriefing.title || periodicBriefing.key,
            );
            markAnalystActive();
            const prefs = syncClearancePrefs(readDailyPredictPrefs());
            writeDailyPredictPrefs(prefs);
            onSetClearanceStatus(resolveClearanceStatus(prefs));
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
      entryGate === null &&
      !showModePicker &&
      !periodicBriefing &&
      !weeklyExpanded &&
      !tomorrowTensionPrompt &&
      !sentinelActive ? (
        <div
          className={`cv-desktop-only pointer-events-auto absolute left-3 z-[45] ${
            // 텔레그램 OSINT 미니 패널(좌하단, 본문 최대 42vh/320px)이 떠 있으면 그 위로 비켜준다
            telegramMiniPanelVisible ? "bottom-[27rem]" : "bottom-24"
          } ${
            // 접었을 때 420px 폭을 유지하면 보이지 않는 영역이 지도 클릭을 막는다
            showDailyRankPanel ? "w-[min(420px,calc(100vw-1.5rem))]" : "w-fit"
          }`}
        >
          {showDailyRankPanel ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => onToggleDailyRankPanel(false)}
                aria-label={labelLanguage === "en" ? "Collapse daily panel" : "일일 패널 접기"}
                title={labelLanguage === "en" ? "Collapse" : "접기"}
                className="absolute -top-2.5 right-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/60 bg-slate-950/90 text-[11px] text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
              {/* 위로 올라간 만큼 화면 위로 넘치지 않게 — 넘치면 내부 스크롤 */}
              <div
                className={`overflow-y-auto overscroll-contain ${
                  telegramMiniPanelVisible
                    ? "max-h-[calc(100vh-29rem)]"
                    : "max-h-[calc(100vh-9rem)]"
                }`}
              >
                <DailyRankSharePanel lang={labelLanguage} />
              </div>
            </div>
          ) : (
            <LegendReopenButton
              label={labelLanguage === "en" ? "Daily · WTI" : "오늘의 지수 · 예측"}
              onClick={() => onToggleDailyRankPanel(true)}
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

      {airRaidOffer && !airRaidBriefing && !exerciseBriefing && !issueUiPausedForLamp ? (
        <AirRaidOfferBanner
          offer={airRaidOffer}
          lang={labelLanguage}
          onDismiss={onDismissAirRaidOffer}
        />
      ) : null}

      {exerciseOffer &&
      !exerciseBriefing &&
      !airRaidBriefing &&
      !airRaidOffer &&
      !issueUiPausedForLamp ? (
        <ExerciseOfferBanner
          offer={exerciseOffer}
          lang={labelLanguage}
          onDismiss={onDismissExerciseOffer}
        />
      ) : null}

      {maritimeOffer &&
      !airRaidBriefing &&
      !airRaidOffer &&
      !exerciseBriefing &&
      !exerciseOffer &&
      !ukmtoBriefing &&
      !navareaBriefing &&
      !issueUiPausedForLamp ? (
        <MaritimeAlertOfferBanner
          offer={maritimeOffer}
          lang={labelLanguage}
          onAccept={onAcceptMaritimeOffer}
          onDismiss={onDismissMaritimeOffer}
        />
      ) : null}

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
          zIndexClass="z-[10040]"
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
          zIndexClass="z-[10040]"
        />
      ) : null}
    </>
  );
}
