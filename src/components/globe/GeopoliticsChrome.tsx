"use client";

import { DisputeZoneLegend } from "@/components/DisputeZoneLegend";
import { UkraineFrontLegend } from "@/components/UkraineFrontLegend";
import { LegendReopenButton } from "@/components/MapOverlayLegendPanel";
import { GdeltAlertPanel } from "@/components/GdeltAlertPanel";
import { TelegramOsintPanel } from "@/components/TelegramOsintPanel";
import { LocalAlertPanel } from "@/components/LocalAlertPanel";
import { TheaterIntelSidebar } from "@/components/TheaterIntelSidebar";
import { TheaterDetailCta } from "@/components/TheaterDetailCta";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import { AxisArmsPanel } from "@/components/AxisArmsPanel";
import { AxisRegimePanel } from "@/components/AxisRegimePanel";
import { DisputeHotspotPanel } from "@/components/DisputeHotspotPanel";
import type { DisputeHotspotEntry } from "@/lib/disputeHotspots";
import { FrictionHistoryChrome } from "@/components/FrictionHistoryChrome";
import { LivingConflictPanel } from "@/components/LivingConflictPanel";
import { WeeklyShipMovesPanel } from "@/components/WeeklyShipMovesPanel";
import type { HubBriefDoc } from "@/data/hubBriefs";
import type { AxisHubId } from "@/data/axisNetwork";
import type { NavSelection } from "@/data/navRegions";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { ScoredEvent } from "@/data/eventTiers";
import type { Selection } from "@/components/globe/types";
import { frictionParchmentParagraphs } from "@/data/frictionEpisodeDeep";
import type { FrictionTimelineStage } from "@/data/frictionEpisodeDeep";
import { filterArmsForHub, type AxisArmsPayload } from "@/lib/axisArmsPaths";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import type { TheaterFocusConfig, TheaterSidebarTab } from "@/lib/theaterFocus";
import type { BottomAlertPanel } from "@/lib/localOverlayPolicy";
import type { MenuCoreAlert } from "@/lib/regionFilter";
import type { DisputeAlert } from "@/lib/disputeAlerts";
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
  isEconomyViewer: boolean;
  livingTaiwanOpen: boolean;
  onLivingTaiwanClose: () => void;
  onLivingTaiwanFlyToMap: (lat: number, lng: number, altitude: number) => void;
  westpacPulseOpen: boolean;
  shipMovesLoading: boolean;
  shipMovesTimeline: PublicShipObservation[];
  shipMovesDisclaimer: string | null;
  shipMovesSelectedId: string | null;
  onShipMoveSelect: (obs: PublicShipObservation) => void;
  onWestpacPulseClose: () => void;
  disputesOverviewOpen: boolean;
  disputeHotspots: DisputeHotspotEntry[];
  disputeHotspotSelectedId: string | null;
  onSelectDisputeHotspot: (hotspot: DisputeHotspotEntry) => void;
  onDisputesOverviewClose: () => void;
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
  isEconomyViewer,
  livingTaiwanOpen,
  onLivingTaiwanClose,
  onLivingTaiwanFlyToMap,
  westpacPulseOpen,
  shipMovesLoading,
  shipMovesTimeline,
  shipMovesDisclaimer,
  shipMovesSelectedId,
  onShipMoveSelect,
  onWestpacPulseClose,
  disputesOverviewOpen,
  disputeHotspots,
  disputeHotspotSelectedId,
  onSelectDisputeHotspot,
  onDisputesOverviewClose,
}: GeopoliticsHubChromeProps) {
  return (
    <>
      {activeHubId && hubFocusMode === "arms" && axisArmsPayload && !hubBriefOpen ? (
        <AxisArmsPanel
          hubId={activeHubId}
          deals={filterArmsForHub(axisArmsPayload, activeHubId).deals}
          citation={axisArmsPayload.citation}
          lang={labelLanguage}
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

      {disputesOverviewOpen && !hubBriefOpen ? (
        <DisputeHotspotPanel
          hotspots={disputeHotspots}
          selectedId={disputeHotspotSelectedId}
          lang={labelLanguage}
          onSelect={onSelectDisputeHotspot}
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

      {!isEconomyViewer ? (
        <LivingConflictPanel
          lang={labelLanguage}
          open={livingTaiwanOpen}
          onClose={onLivingTaiwanClose}
          onFlyToMap={onLivingTaiwanFlyToMap}
        />
      ) : null}

      {!isEconomyViewer ? (
        <WeeklyShipMovesPanel
          open={westpacPulseOpen}
          lang={labelLanguage}
          loading={shipMovesLoading}
          observations={shipMovesTimeline}
          disclaimer={shipMovesDisclaimer}
          selectedId={shipMovesSelectedId}
          onSelect={onShipMoveSelect}
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
          viinaLodMode === "hidden"
            ? "줌인 필요"
            : viinaLodMode === "overview"
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
        onClose={onCloseDisputeLegend}
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
                onClick={onReopenDisputeLegend}
              />
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
  if (
    !regionNavSelection ||
    regionNavSelection.hubId ||
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
        className="absolute inset-0 z-20 bg-black/20 lg:bg-black/10"
        onClick={onClearRegionNav}
      />
      <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-30 flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-800/80 p-4 shadow-2xl">
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
};

export function GeopoliticsParchmentChrome({
  labelLanguage,
  hubBriefDoc,
  onCloseHubBrief,
  frictionEpisodeBrief,
  onCloseFrictionBrief,
}: GeopoliticsParchmentChromeProps) {
  return (
    <>
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
          onContinue={onCloseFrictionBrief}
          playBreakingDispatch
          typewriter
          historyHandFont
          titleId="friction-episode-letter-title"
          zIndexClass="z-[9990]"
        />
      ) : null}
    </>
  );
}
