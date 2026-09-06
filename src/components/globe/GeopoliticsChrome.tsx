"use client";

import dynamic from "next/dynamic";
import { DisputeZoneLegend } from "@/components/DisputeZoneLegend";
import { MapLegend } from "@/components/MapLegend";
import { LegendReopenButton } from "@/components/MapOverlayLegendPanel";
import { UkraineFrontLegend } from "@/components/UkraineFrontLegend";
import { GdeltAlertPanel } from "@/components/GdeltAlertPanel";
import { LocalAlertPanel } from "@/components/LocalAlertPanel";
import { TheaterIntelSidebar } from "@/components/TheaterIntelSidebar";
import { TheaterDetailCta } from "@/components/TheaterDetailCta";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import { HubMonitorRail } from "@/components/HubMonitorRail";
import { AxisLinkChip } from "@/components/AxisLinkChip";
import { CorridorRailChip } from "@/components/CorridorRailChip";
import type { DisputeHotspotEntry } from "@/lib/disputeHotspots";
import type { SelectedAxisLink } from "@/lib/axisLinkSelection";
import type { SelectedCorridor } from "@/lib/corridorSelection";
import type { TerritorialDisputeEpisode } from "@/data/territorialDisputeEpisodes";
import type { NewsStreamItem } from "@/lib/news/types";
import type { HubBriefDoc } from "@/data/hubBriefs";
import type { AxisHubId } from "@/data/axisNetwork";
import type { NavSelection } from "@/data/navRegions";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { ScoredEvent } from "@/data/eventTiers";
import type { Selection } from "@/components/globe/types";
import {
  frictionParchmentParagraphs,
  type FrictionTimelineStage,
} from "@/data/frictionEpisodeDeep";
import { territorialParchmentParagraphs } from "@/data/territorialDisputeDeep";
import { filterArmsForHub, type AxisArmsPayload } from "@/lib/axisArmsPaths";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import {
  shipMovementParchmentParagraphs,
  type ShipTrailMode,
} from "@/lib/shipMovements/shipMovementBrief";
import type { TheaterFocusConfig, TheaterSidebarTab } from "@/lib/theaterFocus";
import type { BottomAlertPanel } from "@/lib/localOverlayPolicy";
import type { MenuCoreAlert } from "@/lib/regionFilter";
import type { DisputeAlert } from "@/lib/disputeAlerts";

/** P3-1: on-demand 패널 — 열릴 때만 청크 로드 */
const AxisArmsPanel = dynamic(
  () => import("@/components/AxisArmsPanel").then((m) => m.AxisArmsPanel),
  { ssr: false },
);
const AxisRegimePanel = dynamic(
  () => import("@/components/AxisRegimePanel").then((m) => m.AxisRegimePanel),
  { ssr: false },
);
const DisputeHotspotPanel = dynamic(
  () => import("@/components/DisputeHotspotPanel").then((m) => m.DisputeHotspotPanel),
  { ssr: false },
);
const FrictionHistoryChrome = dynamic(
  () =>
    import("@/components/FrictionHistoryChrome").then((m) => m.FrictionHistoryChrome),
  { ssr: false },
);
const TerritorialHistoryChrome = dynamic(
  () =>
    import("@/components/TerritorialHistoryChrome").then(
      (m) => m.TerritorialHistoryChrome,
    ),
  { ssr: false },
);
const LivingConflictPanel = dynamic(
  () =>
    import("@/components/LivingConflictPanel").then((m) => m.LivingConflictPanel),
  { ssr: false },
);
const WeeklyShipMovesPanel = dynamic(
  () =>
    import("@/components/WeeklyShipMovesPanel").then((m) => m.WeeklyShipMovesPanel),
  { ssr: false },
);
const TelegramOsintPanel = dynamic(
  () => import("@/components/TelegramOsintPanel").then((m) => m.TelegramOsintPanel),
  { ssr: false },
);
import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
} from "@/lib/telegramAlerts";
import type { TelegramFlyPlace } from "@/components/TelegramIntelFeed";
import type { ViinaLod } from "@/lib/viinaLod";
import { t } from "@/lib/uiStrings";

export type GeopoliticsHubChromeProps = {
  activeHubId: AxisHubId | null;
  hubFocusMode: NavSelection["focusMode"] | null;
  axisArmsPayload: AxisArmsPayload | null;
  hubBriefOpen: boolean;
  labelLanguage: LabelLanguage;
  onArmsClose: () => void;
  regimeSelectedEpisodeId: string | null;
  onRegimeSelectEpisode: (episode: FrictionEpisode) => void;
  onExitHistoryImmersion: () => void;
  historyImmersionActive: boolean;
  activeFrictionEpisode: FrictionEpisode | null;
  frictionActiveStageId: string | null;
  onSelectFrictionStage: (stage: FrictionTimelineStage) => void;
  onOpenFrictionBrief: () => void;
  onBackToFrictionList: () => void;
  activeTerritorialEpisode?: TerritorialDisputeEpisode | null;
  territorialActiveStageId?: string | null;
  territorialRevealedStageIds?: string[];
  onSelectTerritorialStage?: (stage: FrictionTimelineStage) => void;
  onOpenTerritorialBrief?: () => void;
  onBackToTerritorialList?: () => void;
  isEconomyViewer: boolean;
  livingTaiwanOpen: boolean;
  onLivingTaiwanClose: () => void;
  onLivingTaiwanFlyToMap: (lat: number, lng: number, altitude: number) => void;
  westpacPulseOpen: boolean;
  shipMovesLoading: boolean;
  shipMovesTimeline: PublicShipObservation[];
  shipMovesDisclaimer: string | null;
  shipMovesSelectedId: string | null;
  shipMovesTrailMode: ShipTrailMode;
  shipMovesFocusGroupKey: string | null;
  westpacNewsPool?: NewsStreamItem[];
  onShipMoveSelect: (obs: PublicShipObservation) => void;
  onShipTrailModeChange: (mode: ShipTrailMode) => void;
  onShipVesselSelect: (groupKey: string, observations: PublicShipObservation[]) => void;
  onShipMoveBrief: (observations: PublicShipObservation[], focusId?: string | null) => void;
  onWestpacPulseClose: () => void;
  disputesOverviewOpen: boolean;
  disputeHotspots: DisputeHotspotEntry[];
  disputeHotspotSelectedId: string | null;
  disputeEpisodeSelectedId?: string | null;
  disputeFrictionSelectedId?: string | null;
  onSelectDisputeHotspot: (hotspot: DisputeHotspotEntry) => void;
  onSelectDisputeEpisode?: (episode: TerritorialDisputeEpisode) => void;
  onSelectDisputeFriction?: (episode: FrictionEpisode) => void;
  onDisputesOverviewClose: () => void;
  selectedAxisLink?: SelectedAxisLink | null;
  onAxisLinkDismiss?: () => void;
  onAxisLinkHubBrief?: () => void;
  onAxisLinkArms?: () => void;
  onAxisLinkNews?: () => void;
  onAxisLinkHighlightArms?: () => void;
  armsHighlightPair?: { a: string; b: string } | null;
  selectedCorridor?: SelectedCorridor | null;
  onCorridorDismiss?: () => void;
};

export function GeopoliticsHubChrome({
  activeHubId,
  hubFocusMode,
  axisArmsPayload,
  hubBriefOpen,
  labelLanguage,
  onArmsClose,
  regimeSelectedEpisodeId,
  onRegimeSelectEpisode,
  onExitHistoryImmersion,
  historyImmersionActive,
  activeFrictionEpisode,
  frictionActiveStageId,
  onSelectFrictionStage,
  onOpenFrictionBrief,
  onBackToFrictionList,
  activeTerritorialEpisode = null,
  territorialActiveStageId = null,
  territorialRevealedStageIds = [],
  onSelectTerritorialStage,
  onOpenTerritorialBrief,
  onBackToTerritorialList,
  isEconomyViewer,
  livingTaiwanOpen,
  onLivingTaiwanClose,
  onLivingTaiwanFlyToMap,
  westpacPulseOpen,
  shipMovesLoading,
  shipMovesTimeline,
  shipMovesDisclaimer,
  shipMovesSelectedId,
  shipMovesTrailMode,
  shipMovesFocusGroupKey,
  westpacNewsPool = [],
  onShipMoveSelect,
  onShipTrailModeChange,
  onShipVesselSelect,
  onShipMoveBrief,
  onWestpacPulseClose,
  disputesOverviewOpen,
  disputeHotspots,
  disputeHotspotSelectedId,
  disputeEpisodeSelectedId = null,
  disputeFrictionSelectedId = null,
  onSelectDisputeHotspot,
  onSelectDisputeEpisode,
  onSelectDisputeFriction,
  onDisputesOverviewClose,
  selectedAxisLink = null,
  onAxisLinkDismiss,
  onAxisLinkHubBrief,
  onAxisLinkArms,
  onAxisLinkNews,
  onAxisLinkHighlightArms,
  armsHighlightPair = null,
  selectedCorridor = null,
  onCorridorDismiss,
}: GeopoliticsHubChromeProps) {
  return (
    <>
      {selectedCorridor &&
      !selectedAxisLink &&
      !hubBriefOpen &&
      hubFocusMode !== "regime" &&
      hubFocusMode !== "arms" &&
      !historyImmersionActive ? (
        <CorridorRailChip
          corridor={selectedCorridor}
          lang={labelLanguage}
          onDismiss={() => onCorridorDismiss?.()}
        />
      ) : null}

      {selectedAxisLink &&
      !hubBriefOpen &&
      hubFocusMode !== "regime" &&
      hubFocusMode !== "arms" &&
      !historyImmersionActive ? (
        <AxisLinkChip
          link={selectedAxisLink}
          lang={labelLanguage}
          onDismiss={() => onAxisLinkDismiss?.()}
          onHubBrief={() => onAxisLinkHubBrief?.()}
          onArms={() => onAxisLinkArms?.()}
          onNews={() => onAxisLinkNews?.()}
          onHighlightArmsDeals={() => onAxisLinkHighlightArms?.()}
        />
      ) : null}

      {SIPRI_ARMS_LENS_ENABLED &&
      activeHubId &&
      hubFocusMode === "arms" &&
      axisArmsPayload &&
      !hubBriefOpen ? (
        <AxisArmsPanel
          hubId={activeHubId}
          deals={filterArmsForHub(axisArmsPayload, activeHubId).deals}
          citation={axisArmsPayload.citation}
          lang={labelLanguage}
          highlightPair={armsHighlightPair}
          onClose={onArmsClose}
        />
      ) : null}

      {hubFocusMode === "regime" && !hubBriefOpen && !regimeSelectedEpisodeId ? (
        <AxisRegimePanel
          hubId={activeHubId}
          selectedEpisodeId={regimeSelectedEpisodeId}
          lang={labelLanguage}
          onSelectEpisode={onRegimeSelectEpisode}
          onClose={onExitHistoryImmersion}
        />
      ) : null}

      {disputesOverviewOpen &&
      !hubBriefOpen &&
      !disputeEpisodeSelectedId &&
      !disputeFrictionSelectedId ? (
        <DisputeHotspotPanel
          hotspots={disputeHotspots}
          selectedId={disputeHotspotSelectedId}
          selectedEpisodeId={disputeEpisodeSelectedId}
          selectedFrictionId={disputeFrictionSelectedId}
          lang={labelLanguage}
          onSelect={onSelectDisputeHotspot}
          onSelectEpisode={onSelectDisputeEpisode}
          onSelectFriction={onSelectDisputeFriction}
          onClose={onDisputesOverviewClose}
        />
      ) : null}

      {historyImmersionActive && activeFrictionEpisode && !hubBriefOpen ? (
        <FrictionHistoryChrome
          episode={activeFrictionEpisode}
          lang={labelLanguage}
          activeStageId={frictionActiveStageId}
          onSelectStage={onSelectFrictionStage}
          onExitHistory={onExitHistoryImmersion}
          onOpenBrief={onOpenFrictionBrief}
          onBackToList={onBackToFrictionList}
        />
      ) : null}

      {disputesOverviewOpen &&
      activeTerritorialEpisode &&
      !hubBriefOpen &&
      !activeFrictionEpisode ? (
        <TerritorialHistoryChrome
          episode={activeTerritorialEpisode}
          lang={labelLanguage}
          activeStageId={territorialActiveStageId}
          revealedStageIds={territorialRevealedStageIds}
          onSelectStage={(stage) => onSelectTerritorialStage?.(stage)}
          onExitHistory={onExitHistoryImmersion}
          onOpenBrief={() => onOpenTerritorialBrief?.()}
          onBackToList={onBackToTerritorialList}
        />
      ) : null}

      {!isEconomyViewer && livingTaiwanOpen ? (
        <LivingConflictPanel
          lang={labelLanguage}
          open={livingTaiwanOpen}
          onClose={onLivingTaiwanClose}
          onFlyToMap={onLivingTaiwanFlyToMap}
        />
      ) : null}

      {!isEconomyViewer && westpacPulseOpen ? (
        <WeeklyShipMovesPanel
          open={westpacPulseOpen}
          lang={labelLanguage}
          loading={shipMovesLoading}
          observations={shipMovesTimeline}
          disclaimer={shipMovesDisclaimer}
          selectedId={shipMovesSelectedId}
          trailMode={shipMovesTrailMode}
          focusGroupKey={shipMovesFocusGroupKey}
          newsPool={westpacNewsPool}
          onTrailModeChange={onShipTrailModeChange}
          onSelect={onShipMoveSelect}
          onSelectVessel={onShipVesselSelect}
          onOpenBrief={onShipMoveBrief}
          onClose={onWestpacPulseClose}
        />
      ) : null}
    </>
  );
}

export type GeopoliticsMapChromeProps = {
  isEconomyViewer: boolean;
  regionNavSelection: NavSelection | null;
  selected: Selection | null;
  intelSheetOpen: boolean;
  showLeftPanel: boolean;
  theaterFocusConfig: TheaterFocusConfig | null;
  onTheaterDetailClick: () => void;
  ukraineFrontLegendEngaged: boolean;
  showUkraineControl: boolean;
  ukraineControlDate: string | null;
  viinaLodMode: ViinaLod["mode"];
  showAnyDisputeOverlay: boolean;
  showDisputeLegendPanel: boolean;
  isUkraineTheaterFocus: boolean;
  onCloseDisputeLegend: () => void;
  onReopenDisputeLegend: () => void;
  telegramMiniPanelVisible: boolean;
  telegramAlerts: TelegramAlert[];
  telegramLive: boolean;
  telegramStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  telegramNeedsAuth: boolean;
  telegramSessionExists: boolean;
  telegramEmbedMode: boolean;
  isCompactUi: boolean;
  onCloseTelegram: () => void;
  onTelegramFlyToPlace?: (place: TelegramFlyPlace) => void;
  bottomAlertPanel: BottomAlertPanel;
  gdeltMenuCoreAlerts: MenuCoreAlert[];
  gdeltLoading: boolean;
  gdeltError: string | null;
  onGdeltAlertSelect: (alert: MenuCoreAlert) => void;
  onCloseGdeltPanel: () => void;
  localDisputeAlerts: DisputeAlert[];
  isLoading: boolean;
  loadError: string | null;
  onLocalAlertSelect: (alert: DisputeAlert) => void;
  onCloseLocalPanel: () => void;
  labelLanguage: LabelLanguage;
  /** P3-6: 활성 레이어 범례 */
  showGdeltWar?: boolean;
  showGdeltDiplomatic?: boolean;
  showGdeltProtests?: boolean;
  showUsCarriers?: boolean;
  deployedCarrierCount?: number;
};

export function GeopoliticsMapChrome({
  isEconomyViewer,
  regionNavSelection,
  selected,
  intelSheetOpen,
  showLeftPanel,
  theaterFocusConfig,
  onTheaterDetailClick,
  ukraineFrontLegendEngaged,
  showUkraineControl,
  ukraineControlDate,
  viinaLodMode,
  showAnyDisputeOverlay,
  showDisputeLegendPanel,
  isUkraineTheaterFocus,
  onCloseDisputeLegend,
  onReopenDisputeLegend,
  telegramMiniPanelVisible,
  telegramAlerts,
  telegramLive,
  telegramStatus,
  telegramNeedsAuth,
  telegramSessionExists,
  telegramEmbedMode,
  isCompactUi,
  onCloseTelegram,
  onTelegramFlyToPlace,
  bottomAlertPanel,
  gdeltMenuCoreAlerts,
  gdeltLoading,
  gdeltError,
  onGdeltAlertSelect,
  onCloseGdeltPanel,
  localDisputeAlerts,
  isLoading,
  loadError,
  onLocalAlertSelect,
  onCloseLocalPanel,
  labelLanguage,
  showGdeltWar = false,
  showGdeltDiplomatic = false,
  showGdeltProtests = false,
  showUsCarriers = false,
  deployedCarrierCount = 0,
}: GeopoliticsMapChromeProps) {
  return (
    <>
      {regionNavSelection &&
      !isEconomyViewer &&
      !selected &&
      !intelSheetOpen &&
      theaterFocusConfig ? (
        <TheaterDetailCta
          label={theaterFocusConfig.ctaLabel}
          onClick={onTheaterDetailClick}
        />
      ) : null}

      {!isEconomyViewer ? (
        <UkraineFrontLegend
          visible={
            ukraineFrontLegendEngaged &&
            showUkraineControl &&
            !intelSheetOpen &&
            !showLeftPanel &&
            (!selected || selected.kind === "neptun-threat")
          }
          dockLow={ukraineFrontLegendEngaged && showUkraineControl}
          controlDate={ukraineControlDate}
          lodLabel={
            viinaLodMode === "hidden"
              ? "줌인 필요"
              : viinaLodMode === "overview"
                ? "점령 개요"
                : "상세"
          }
        />
      ) : null}
      {!isEconomyViewer ? (
        <DisputeZoneLegend
          open={
            showAnyDisputeOverlay &&
            showDisputeLegendPanel &&
            !isUkraineTheaterFocus &&
            !showLeftPanel &&
            !selected &&
            !regionNavSelection
          }
          onClose={onCloseDisputeLegend}
        />
      ) : null}
      {!intelSheetOpen &&
        !showLeftPanel &&
        !selected &&
        !regionNavSelection &&
        !isUkraineTheaterFocus && (
          <div className="pointer-events-none absolute bottom-[calc(var(--bottom-intel-stack-clearance)+env(safe-area-inset-bottom,0px))] left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
            {isEconomyViewer ? (
              <MapLegend variant="economy" defaultOpen={false} />
            ) : (
              <>
                <MapLegend
                  variant="conflict"
                  defaultOpen={false}
                  deployedCarrierCount={showUsCarriers ? deployedCarrierCount : 0}
                  visible={{
                    carriers: showUsCarriers && deployedCarrierCount > 0,
                    gdelt: showGdeltWar || showGdeltDiplomatic || showGdeltProtests,
                    war: showGdeltWar,
                    diplomatic: showGdeltDiplomatic,
                    protest: showGdeltProtests,
                    fresh: showGdeltWar || showGdeltDiplomatic || showGdeltProtests,
                  }}
                />
                {showAnyDisputeOverlay && !showDisputeLegendPanel && (
                  <LegendReopenButton
                    label="전쟁·외교 긴장 범례"
                    accent="orange"
                    onClick={onReopenDisputeLegend}
                  />
                )}
              </>
            )}
          </div>
        )}
      {telegramMiniPanelVisible && (
        <TelegramOsintPanel
          alerts={telegramAlerts}
          live={telegramLive}
          liveStatus={telegramStatus}
          needsAuth={telegramNeedsAuth}
          sessionExists={telegramSessionExists}
          embedMode={telegramEmbedMode}
          channelCount={TELEGRAM_CHANNEL_COUNT}
          onClose={onCloseTelegram}
          compactUi={isCompactUi}
          onFlyToPlace={onTelegramFlyToPlace}
        />
      )}
      {!isEconomyViewer &&
        !isUkraineTheaterFocus &&
        !selected &&
        !regionNavSelection &&
        !isCompactUi &&
        bottomAlertPanel === "gdelt" && (
          <GdeltAlertPanel
            alerts={gdeltMenuCoreAlerts}
            liveStatus={gdeltLoading ? "loading" : gdeltError ? "error" : "ok"}
            errorMessage={gdeltError}
            onSelect={onGdeltAlertSelect}
            onClose={onCloseGdeltPanel}
            lang={labelLanguage}
          />
        )}
      {!isEconomyViewer &&
        !isUkraineTheaterFocus &&
        !selected &&
        !regionNavSelection &&
        bottomAlertPanel === "local" && (
          <LocalAlertPanel
            alerts={localDisputeAlerts}
            dataStatus={isLoading ? "loading" : loadError ? "error" : "ok"}
            errorMessage={loadError}
            onSelect={onLocalAlertSelect}
            onClose={onCloseLocalPanel}
          />
        )}
    </>
  );
}

export type GeopoliticsSidebarChromeProps = {
  regionNavSelection: NavSelection | null;
  isEconomyViewer: boolean;
  selected: Selection | null;
  showLeftPanel: boolean;
  labelLanguage: LabelLanguage;
  theaterFocusConfig: TheaterFocusConfig | null;
  regionFilteredEvents: ScoredEvent[];
  telegramAlerts: TelegramAlert[];
  telegramLive: boolean;
  telegramStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  telegramNeedsAuth: boolean;
  telegramSessionExists: boolean;
  telegramEmbedMode: boolean;
  theaterSidebarTab: TheaterSidebarTab;
  onClearRegionNav: () => void;
  onFlyToCoords: (lat: number, lng: number, altitude?: number) => void;
  onSelectGdeltEvent: (event: ScoredEvent) => void;
};

export function GeopoliticsSidebarChrome({
  regionNavSelection,
  isEconomyViewer,
  selected,
  showLeftPanel,
  labelLanguage,
  theaterFocusConfig,
  regionFilteredEvents,
  telegramAlerts,
  telegramLive,
  telegramStatus,
  telegramNeedsAuth,
  telegramSessionExists,
  telegramEmbedMode,
  theaterSidebarTab,
  onClearRegionNav,
  onFlyToCoords,
  onSelectGdeltEvent,
}: GeopoliticsSidebarChromeProps) {
  // 서태평양·영토분쟁은 전용 패널이 관련 기사/에피소드를 담당 — 무관한 GDELT/RSS 사이드바 억제
  const focus = regionNavSelection?.focusMode;
  if (
    !regionNavSelection ||
    regionNavSelection.hubId ||
    focus === "westpac-pulse" ||
    focus === "disputes" ||
    isEconomyViewer ||
    selected ||
    showLeftPanel
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("ariaCloseRegionNews", labelLanguage)}
        className="absolute inset-0 z-[500] bg-black/20 lg:bg-black/10"
        onClick={onClearRegionNav}
      />
      <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-[600] flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-800/80 p-4 shadow-2xl">
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
            onClose={onClearRegionNav}
            onFlyToCoords={onFlyToCoords}
            onSelectGdeltEvent={onSelectGdeltEvent}
          />
        ) : null}
      </aside>
    </>
  );
}

export type GeopoliticsParchmentChromeProps = {
  labelLanguage: LabelLanguage;
  hubBriefDoc: HubBriefDoc | null;
  onCloseHubBrief: () => void;
  frictionEpisodeBrief: FrictionEpisode | null;
  onCloseFrictionBrief: () => void;
  territorialEpisodeBrief?: TerritorialDisputeEpisode | null;
  onCloseTerritorialBrief?: () => void;
  shipMovementBriefTrack?: PublicShipObservation[] | null;
  shipMovementBriefFocusId?: string | null;
  onCloseShipMovementBrief?: () => void;
  /** CRINK hub — 우레일 전문 소스 */
  activeHubId?: AxisHubId | null;
};

export function GeopoliticsParchmentChrome({
  labelLanguage,
  hubBriefDoc,
  onCloseHubBrief,
  frictionEpisodeBrief,
  onCloseFrictionBrief,
  territorialEpisodeBrief = null,
  onCloseTerritorialBrief,
  shipMovementBriefTrack = null,
  shipMovementBriefFocusId = null,
  onCloseShipMovementBrief,
  activeHubId = null,
}: GeopoliticsParchmentChromeProps) {
  const shipBrief =
    shipMovementBriefTrack && shipMovementBriefTrack.length > 0
      ? shipMovementParchmentParagraphs(
          shipMovementBriefTrack,
          labelLanguage === "en" ? "en" : "ko",
          shipMovementBriefFocusId,
        )
      : null;

  return (
    <>
      {activeHubId ? (
        <HubMonitorRail
          hubId={activeHubId}
          labelLanguage={labelLanguage}
          open
        />
      ) : null}

      {hubBriefDoc ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={hubBriefDoc.title}
          paragraphs={hubBriefDoc.paragraphs}
          signOff={hubBriefDoc.signOff}
          ctaLabel={t("hubBriefCta", labelLanguage)}
          onContinue={onCloseHubBrief}
          playBreakingDispatch={hubBriefDoc.playBreakingDispatch}
          typewriter={hubBriefDoc.playBreakingDispatch}
          titleId="hub-brief-letter-title"
          zIndexClass="z-[700]"
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
          onContinue={onCloseFrictionBrief}
          playBreakingDispatch
          typewriter
          historyHandFont
          titleId="friction-episode-letter-title"
          zIndexClass="z-[700]"
        />
      ) : null}

      {territorialEpisodeBrief ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={
            labelLanguage === "en"
              ? territorialEpisodeBrief.titleEn
              : territorialEpisodeBrief.title
          }
          paragraphs={territorialParchmentParagraphs(
            territorialEpisodeBrief,
            labelLanguage === "en" ? "en" : "ko",
          )}
          signOff={
            labelLanguage === "en"
              ? `${territorialEpisodeBrief.historicalYear}${
                  territorialEpisodeBrief.yearEnd
                    ? `–${territorialEpisodeBrief.yearEnd}`
                    : ""
                }\nGlobe Observatory · territorial brief`
              : `${territorialEpisodeBrief.historicalYear}${
                  territorialEpisodeBrief.yearEnd
                    ? `–${territorialEpisodeBrief.yearEnd}`
                    : ""
                }\n지구본 관측대 · 영토분쟁 브리프`
          }
          ctaLabel={t("hubBriefCta", labelLanguage)}
          onContinue={() => onCloseTerritorialBrief?.()}
          playBreakingDispatch
          typewriter
          historyHandFont
          titleId="territorial-episode-letter-title"
          zIndexClass="z-[700]"
        />
      ) : null}

      {shipBrief ? (
        <ParchmentLetter
          lang={labelLanguage}
          title={shipBrief.title}
          paragraphs={shipBrief.paragraphs}
          signOff={shipBrief.signOff}
          ctaLabel={t("hubBriefCta", labelLanguage)}
          onContinue={() => onCloseShipMovementBrief?.()}
          playBreakingDispatch
          typewriter
          historyHandFont
          titleId="ship-movement-brief-letter-title"
          zIndexClass="z-[700]"
        />
      ) : null}
    </>
  );
}
