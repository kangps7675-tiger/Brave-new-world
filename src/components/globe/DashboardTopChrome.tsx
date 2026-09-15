"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useState } from "react";
import { HoverNav } from "@/components/HoverNav";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { UtilityChromeMenu } from "@/components/UtilityChromeMenu";
import { ModeGlobalIndexChip } from "@/components/ModeGlobalIndexChip";
import { HoverSideDrawer } from "@/components/HoverSideDrawer";
import {
  BottomDockModeToggle,
  type BottomDockMode,
} from "@/components/BottomDockModeToggle";
import type { NavSelection } from "@/data/navRegions";
import type { SearchPlace } from "@/data/geoTypes";
import type { EntryGate } from "@/components/globe/types";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { ChromeCoachStep } from "@/components/ChromeOnboardingCoach";
import { t } from "@/lib/uiStrings";
import { brandName } from "@/lib/brand";

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
  searchResults: SearchPlace[];
  handleSearchSelect: (place: SearchPlace) => void;
  isCompactUi: boolean;
  isTabletUi?: boolean;
  setAskLayersOpen: Dispatch<SetStateAction<boolean>>;
  handleViewerModeChange: (mode: ViewerMode) => void;
  /** 히스토리 / 뉴스 — 지정학·지경학과 같은 1급 토글 */
  bottomDockMode: BottomDockMode;
  onBottomDockModeChange: (mode: BottomDockMode) => void;
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
  /** 우상단 GTI / 시계 스택 */
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
 * Nullschool식 상단 크롬 + 좌·우 호버 서랍.
 * - 상단: 투명 스트립 · 호버 시 검색→지정학/지경학
 * - 좌: 메뉴(+레일 슬롯) 호버 서랍
 * - 우: 시계·GTI 호버 서랍
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
  isCompactUi,
  isTabletUi = false,
  setAskLayersOpen,
  handleViewerModeChange,
  bottomDockMode,
  onBottomDockModeChange,
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
  const [rightPinned, setRightPinned] = useState(false);

  if (intelSheetOpen) return null;

  const chromeVisible = entryGate === null && !showModePicker;
  if (!chromeVisible) return null;

  const stripBtn =
    "rounded-full border border-sky-200/30 bg-transparent px-3 py-1 text-meta font-medium tracking-wide text-sky-50/90 shadow-none backdrop-blur-none transition hover:border-sky-100/50 hover:bg-sky-400/10";

  return (
    <>
      {/* 좌측 호버 서랍 — 메뉴 + 레일 슬롯 */}
      <HoverSideDrawer
        side="left"
        peepLabel={labelLanguage === "en" ? "Menu" : "메뉴"}
        zIndexClass="z-[320]"
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

      {/* 우측 호버 서랍 — 시계 · GTI */}
      <HoverSideDrawer
        side="right"
        peepLabel={viewerMode === "economy" ? "GSCPI" : "GTI"}
        forceOpen={rightPinned}
        zIndexClass="z-[300]"
      >
        <div
          onFocusCapture={() => setRightPinned(true)}
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
            embedded
            onPanelOpenChange={setRightPinned}
          />
        </div>
      </HoverSideDrawer>

      <HoverNav
        viewerMode={viewerMode}
        onNavigate={handleNavNavigate}
        lastUpdated={liveUpdatedAt || dataGeneratedAt || null}
        liveStatus={liveStatus}
        query={query}
        onQueryChange={setQuery}
        searchResults={searchResults}
        onSearchSelect={handleSearchSelect}
        compact={isCompactUi}
        showDesktopToolsSlot={!isCompactUi}
        hoverReveal
        onAskLayersOpen={() => setAskLayersOpen(true)}
        askLayersLabel={t("askLayersButton", labelLanguage)}
        labelLanguage={labelLanguage}
        aboveNav={
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 bg-transparent py-0.5">
            <div className="flex justify-end">
              <BottomDockModeToggle
                lang={labelLanguage}
                mode={bottomDockMode}
                onChange={onBottomDockModeChange}
                compact={isCompactUi}
                transparent
              />
            </div>
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
        }
        belowNav={
          <ViewModeSwitcher mode={viewerMode} onChange={handleViewerModeChange} />
        }
      />
    </>
  );
}
