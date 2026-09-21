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
  onOpenLayers?: () => void;
  onOpenSettings?: () => void;
  onOpenData?: () => void;
  /** 가운데~우상단 고정 — DEFCON / 공급망 압력 + 시계 */
  wtiScore?: number | null;
  wtiDelta?: number | null;
  wtiAsOf?: string | null;
  wtiIsEstimate?: boolean | null;
  showSesChip?: boolean;
  showGscpi?: boolean;
  /** 좌측 레일 슬롯 — OverlayHost가 포털하거나 children 대신 비움 */
  leftRailSlotId?: string;
}

/**
 * 상단 크롬 + 좌·우 서랍.
 * - 검색창 상시 고정 · 호버 시 탐색 메뉴 · 바로 아래 지정학/지경학(메뉴와 함께 이동)
 * - 좌: 메뉴(+레일 슬롯) 호버 peep
 * - 우: 지표 칩 — 데스크톱 상시 공개, 모바일 peep (지경학은 해운·초크 보드 포함)
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
  onOpenLayers,
  onOpenSettings,
  onOpenData,
  wtiScore = null,
  wtiDelta = null,
  wtiAsOf = null,
  wtiIsEstimate = null,
  showSesChip = true,
  showGscpi = true,
  leftRailSlotId = "chrome-left-rail-slot",
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

  return (
    <>
      {/* 좌측 호버 서랍 — 메뉴 + 레일 슬롯 */}
      <HoverSideDrawer
        side="left"
        peepLabel={labelLanguage === "en" ? "Menu" : "메뉴"}
        zIndexClass={zc("nav")}
      >
        <UtilityChromeMenu
          lang={labelLanguage}
          showProTip={false}
          menuAlign="left"
          captureFrame={async () => (await globeRef.current?.captureFrame()) ?? null}
          getScene={getSceneForShare}
          onTour={() => setChromeCoachStep("nav")}
          onHelp={() => setShowFeatureGuide(true)}
          onSceneStart={onSceneStart}
          onOpenSources={onOpenSources}
          onOpenLayers={onOpenLayers}
          onOpenSettings={onOpenSettings}
          onOpenData={onOpenData}
          siteName={brandName(labelLanguage)}
        />
        <div
          id={leftRailSlotId}
          className="cv-desktop-only flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-start gap-2"
        />
      </HoverSideDrawer>

      {/* 우측 지표 — 데스크톱 상시 공개 / 모바일 peep (역사 지도에서는 숨김) */}
      {viewerMode !== "history" ? (
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
        hoverReveal
        onAskLayersOpen={() => setAskLayersOpen(true)}
        askLayersLabel={t("askLayersButton", labelLanguage)}
        labelLanguage={labelLanguage}
        onHistoryMapOpen={() => handleViewerModeChange("history")}
        aboveNav={
          <div className="flex w-full flex-col items-center gap-0.5 bg-transparent py-0">
            <ImmersionDigitalClock lang={labelLanguage} variant="top" />
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <div className="flex justify-end" />
              <div className="flex justify-center">
                {onOpenLayers ? (
                  <button
                    type="button"
                    id="layer-panel-toggle"
                    onClick={onOpenLayers}
                    className={`${stripBtn} min-w-[7.5rem] text-center`}
                    aria-haspopup="dialog"
                    aria-label={
                      labelLanguage === "en" ? "Open layer panel" : "레이어 패널 열기"
                    }
                  >
                    {labelLanguage === "en" ? "Layers" : "레이어"}
                  </button>
                ) : (
                  <span className="min-w-[7.5rem]" aria-hidden />
                )}
              </div>
              <div className="flex justify-start">
                <button type="button" onClick={onSceneStart} className={stripBtn}>
                  {t("sceneMissionStart", labelLanguage)}
                </button>
              </div>
            </div>
          </div>
        }
        belowNav={
          <div className="flex w-full flex-col items-center gap-1.5">
            <ViewModeSwitcher mode={viewerMode} onChange={handleViewerModeChange} />
          </div>
        }
      />
    </>
  );
}
