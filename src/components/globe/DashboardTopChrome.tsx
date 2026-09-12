"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { HoverNav } from "@/components/HoverNav";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { UtilityChromeMenu } from "@/components/UtilityChromeMenu";
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
}

/**
 * Nullschool식 상단 크롬:
 * - 좌상단 햄버거
 * - 상단 중앙 지정학/지경학 토글
 * - 상단 호버 시 HoverNav reveal
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
}: DashboardTopChromeProps) {
  if (intelSheetOpen) return null;

  const chromeVisible = entryGate === null && !showModePicker;
  if (!chromeVisible) return null;

  return (
    <>
      {/* 좌상단 햄버거 */}
      <div className="pointer-events-auto fixed left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.55rem,env(safe-area-inset-top))] z-[260]">
        <UtilityChromeMenu
          lang={labelLanguage}
          showProTip={false}
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
      </div>

      {/* 상단 중앙 — 지정학/지경학 + 히스토리/뉴스 */}
      <div className="pointer-events-auto fixed left-1/2 top-[max(0.55rem,env(safe-area-inset-top))] z-[255] -translate-x-1/2">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <ViewModeSwitcher mode={viewerMode} onChange={handleViewerModeChange} />
            <BottomDockModeToggle
              lang={labelLanguage}
              mode={bottomDockMode}
              onChange={onBottomDockModeChange}
              compact={isCompactUi}
            />
          </div>
          <button
            type="button"
            onClick={onSceneStart}
            className="rounded-full border border-sky-300/30 bg-[#0a1428]/75 px-3 py-1 text-meta font-medium tracking-wide text-sky-100/90 shadow-md backdrop-blur-md hover:border-sky-200/50 hover:bg-sky-500/15"
          >
            {t("sceneMissionStart", labelLanguage)}
          </button>
        </div>
      </div>

      {/* 호버 시만 nav — 검색·전장 메뉴 */}
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
        showDesktopToolsSlot={false}
        hoverReveal
        onAskLayersOpen={() => setAskLayersOpen(true)}
        askLayersLabel={t("askLayersButton", labelLanguage)}
        labelLanguage={labelLanguage}
      />
    </>
  );
}
