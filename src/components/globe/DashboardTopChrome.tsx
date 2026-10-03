"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useState } from "react";
import { HoverNav } from "@/components/HoverNav";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { UtilityChromeMenu } from "@/components/UtilityChromeMenu";
import { ModeGlobalIndexChip } from "@/components/ModeGlobalIndexChip";
import { HoverSideDrawer } from "@/components/HoverSideDrawer";
import type { NavSelection } from "@/data/navRegions";
import type { ChromeKeywordSuggestion, ChromeSearchHit } from "@/lib/chromeSearch";
import type { EntryGate } from "@/components/globe/types";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { ChromeCoachStep } from "@/components/ChromeOnboardingCoach";
import { t } from "@/lib/uiStrings";
import { brandName } from "@/lib/brand";
import { zc } from "@/lib/uiStack";
import { ImmersionDigitalClock } from "@/components/ImmersionDigitalClock";

export interface DashboardTopChromeProps {
  intelSheetOpen: boolean;
  entryGate: EntryGate;
  showModePicker: boolean;
  viewerMode: ViewerMode;
  labelLanguage: LabelLanguage;
  handleNavNavigate: (selection: NavSelection) => void;
  liveUpdatedAt: string | null;
  dataGeneratedAt: string | null;
  liveStatus: "idle" | "loading" | "ok" | "error";
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  searchResults: ChromeSearchHit[];
  searchKeywordSuggestions?: ChromeKeywordSuggestion[];
  handleSearchSelect: (hit: ChromeSearchHit) => void;
  isCompactUi: boolean;
  isTabletUi?: boolean;
  setAskLayersOpen: Dispatch<SetStateAction<boolean>>;
  handleViewerModeChange: (mode: ViewerMode) => void;
  globeRef: RefObject<MapGlobeMethods>;
  getSceneForShare: () => {
    mode: ViewerMode;
    lat: number;
    lng: number;
    altitude: number;
    prefs: LayerPrefs;
    asOf?: string | null;
  } | null;
  setChromeCoachStep: Dispatch<SetStateAction<ChromeCoachStep | null>>;
  setShowFeatureGuide: Dispatch<SetStateAction<boolean>>;
  onSceneStart: () => void;
  onOpenSources?: () => void;
  onOpenPurposeJob?: () => void;
  onOpenLayers?: () => void;
  onOpenSettings?: () => void;
  onOpenData?: () => void;
  onOpenControlsGuide?: () => void;
  /** 위성(Cesium) 모드 — MapLibre globeRef 대신 이 캡처 사용 */
  captureFrameOverride?: () => Promise<HTMLCanvasElement | null>;
  recordClip?: () => Promise<void>;
  recordClipBusy?: boolean;
  /** 가운데~우상단 고정 — DEFCON / 공급망 압력 + 시계 */
  wtiScore?: number | null;
  wtiDelta?: number | null;
  wtiAsOf?: string | null;
  wtiIsEstimate?: boolean | null;
  showSesChip?: boolean;
  showGscpi?: boolean;
  /** 좌측 레일 슬롯 — OverlayHost가 포털하거나 children 대신 비움 */
  leftRailSlotId?: string;
  /** 거시 요약본 창 토글 */
  macroBriefingOpen?: boolean;
  onToggleMacroBriefing?: () => void;
  /** 관측대 soft unlock — ViewModeSwitcher 잠금 표시 */
  observeUnlocked?: boolean;
}

/**
 * 상단 크롬 + 좌·우 서랍 — LTR 읽기 순서.
 * 1) 좌: 메뉴 peep (+레일)
 * 2) 상단 스트립: 렌즈(Job) → 보조 도구 → 시계(상태)
 * 3) 검색 행: 찾기 → 묻기 → 아카이브(영토·역사·허브)
 * 4) 우: 지표 칩 (데스크톱 상시 / 모바일 peep)
 */
export function DashboardTopChrome({
  intelSheetOpen,
  entryGate,
  showModePicker,
  viewerMode,
  labelLanguage,
  handleNavNavigate,
  liveUpdatedAt,
  dataGeneratedAt,
  liveStatus,
  query,
  setQuery,
  searchResults,
  handleSearchSelect,
  searchKeywordSuggestions = [],
  isCompactUi,
  isTabletUi = false,
  setAskLayersOpen,
  handleViewerModeChange,
  globeRef,
  getSceneForShare,
  setChromeCoachStep,
  setShowFeatureGuide,
  onSceneStart,
  onOpenSources,
  onOpenPurposeJob,
  onOpenLayers,
  onOpenSettings,
  onOpenData,
  onOpenControlsGuide,
  captureFrameOverride,
  recordClip,
  recordClipBusy = false,
  wtiScore = null,
  wtiDelta = null,
  wtiAsOf = null,
  wtiIsEstimate = null,
  showSesChip = true,
  showGscpi = true,
  leftRailSlotId = "chrome-left-rail-slot",
  macroBriefingOpen = false,
  onToggleMacroBriefing,
  observeUnlocked = false,
}: DashboardTopChromeProps) {
  const [rightMetricsPinned, setRightMetricsPinned] = useState(false);
  if (intelSheetOpen) return null;

  const chromeVisible = entryGate === null && !showModePicker;
  if (!chromeVisible) return null;

  /** 데스크톱: 지정학·지경학 우측 지표를 호버 없이 상시 공개. 모바일은 peep 유지. */
  const rightMetricsAlwaysOpen = !isCompactUi;
  const showShippingRail =
    viewerMode === "economy" && !isCompactUi && !isTabletUi;

  const stripBtn =
    "rounded-full border border-sky-200/30 bg-transparent px-2.5 py-0.5 text-meta font-medium tracking-wide text-sky-50/90 shadow-none backdrop-blur-none transition hover:border-sky-100/50 hover:bg-sky-400/10";

  const showBriefing =
    Boolean(onToggleMacroBriefing) &&
    viewerMode !== "history" &&
    viewerMode !== "satellite";

  return (
    <>
      {/* 좌측 호버 서랍 — 열리면 nav·드롭다운 위를 덮음 (panel z) */}
      <HoverSideDrawer
        side="left"
        peepLabel={labelLanguage === "en" ? "Menu" : "메뉴"}
        peepId="chrome-menu-peep"
        zIndexClass={zc("nav")}
      >
        <UtilityChromeMenu
          lang={labelLanguage}
          showProTip={false}
          menuAlign="left"
          captureFrame={
            captureFrameOverride ??
            (async () => (await globeRef.current?.captureFrame()) ?? null)
          }
          recordClip={recordClip}
          recordClipBusy={recordClipBusy}
          getScene={getSceneForShare}
          onTour={() => setChromeCoachStep("nav")}
          onHelp={() => setShowFeatureGuide(true)}
          onSceneStart={onSceneStart}
          onOpenSources={onOpenSources}
          onOpenPurposeJob={onOpenPurposeJob}
          onOpenLayers={onOpenLayers}
          onOpenSettings={onOpenSettings}
          onOpenData={onOpenData}
          onOpenControlsGuide={onOpenControlsGuide}
          siteName={brandName(labelLanguage)}
        />
        <div
          id={leftRailSlotId}
          className="cv-desktop-only flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-start gap-2"
        />
      </HoverSideDrawer>

      {/* 우측 지표 — 열리면 nav 위. 역사·3D 라이브에서는 숨김 */}
      {viewerMode !== "history" && viewerMode !== "satellite" ? (
      <HoverSideDrawer
        side="right"
        peepLabel={
          rightMetricsAlwaysOpen
            ? undefined
            : labelLanguage === "en"
              ? "Metrics"
              : "지표"
        }
        zIndexClass={zc("nav")}
        forceOpen={rightMetricsAlwaysOpen || rightMetricsPinned}
      >
        <ModeGlobalIndexChip
          viewerMode={viewerMode}
          lang={labelLanguage}
          wtiScore={wtiScore}
          wtiDelta={wtiDelta}
          wtiAsOf={wtiAsOf}
          wtiIsEstimate={wtiIsEstimate}
          showSesChip={showSesChip}
          showGscpi={showGscpi}
          dense={isCompactUi || isTabletUi}
          showShippingRail={showShippingRail}
          embedded
          onPanelOpenChange={setRightMetricsPinned}
        />
      </HoverSideDrawer>
      ) : null}

      <HoverNav
        viewerMode={viewerMode}
        onNavigate={handleNavNavigate}
        lastUpdated={liveUpdatedAt || dataGeneratedAt || null}
        liveStatus={liveStatus}
        query={query}
        onQueryChange={setQuery}
        searchResults={searchResults}
        keywordSuggestions={searchKeywordSuggestions}
        onSearchSelect={handleSearchSelect}
        onKeywordSelect={setQuery}
        compact={isCompactUi}
        showDesktopToolsSlot={!isCompactUi}
        onAskLayersOpen={() => setAskLayersOpen(true)}
        askLayersLabel={t("askLayersButton", labelLanguage)}
        labelLanguage={labelLanguage}
        onHistoryMapOpen={() => handleViewerModeChange("history")}
        leadingSlot={
          <ViewModeSwitcher
            mode={viewerMode}
            onChange={handleViewerModeChange}
            observeUnlocked={observeUnlocked}
          />
        }
        aboveNav={
          <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 bg-transparent py-0">
            {/* LTR: 보조 도구(좌) → 시계(우, 지표 옆) */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-1.5">
              {showBriefing ? (
                <button
                  type="button"
                  id="macro-briefing-toggle"
                  onClick={onToggleMacroBriefing}
                  className={`${stripBtn} ${
                    macroBriefingOpen
                      ? "border-sky-100/60 bg-sky-400/15 text-sky-50"
                      : ""
                  }`}
                  aria-pressed={macroBriefingOpen}
                  aria-haspopup="dialog"
                  aria-label={
                    labelLanguage === "en"
                      ? "Toggle today’s overview"
                      : "오늘 한눈에 창 토글"
                  }
                >
                  {labelLanguage === "en" ? "Overview" : "오늘 한눈에"}
                </button>
              ) : null}
              {onOpenLayers ? (
                <button
                  type="button"
                  id="layer-panel-toggle"
                  onClick={onOpenLayers}
                  className={stripBtn}
                  aria-haspopup="dialog"
                  aria-label={
                    labelLanguage === "en"
                      ? "Choose what to show on the map"
                      : "지도에 올릴 것 고르기"
                  }
                >
                  {labelLanguage === "en" ? "Show" : "올릴 것"}
                </button>
              ) : null}
              <button
                type="button"
                id="scene-mission-start"
                onClick={onSceneStart}
                className={stripBtn}
              >
                {t("sceneMissionStart", labelLanguage)}
              </button>
            </div>
            <div className="shrink-0">
              <ImmersionDigitalClock lang={labelLanguage} variant="top" />
            </div>
          </div>
        }
      />
    </>
  );
}
