"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { ModeGlobalIndexChip } from "@/components/ModeGlobalIndexChip";
import { GlobeSpinToggle } from "@/components/GlobeSpinToggle";
import { HoverNav } from "@/components/HoverNav";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { BasemapModeToggle } from "@/components/BasemapModeToggle";
import { LayerQuickDropdown } from "@/components/LayerQuickDropdown";
import { ExplorationTabs } from "@/components/ExplorationTabs";
import { EconomySupplyChainFixedToggle } from "@/components/EconomySupplyChainFixedToggle";
import { FinintTicker } from "@/components/FinintTicker";
import { GpsJamFixedToggle } from "@/components/GpsJamFixedToggle";
import { UsCarrierFixedToggle } from "@/components/UsCarrierFixedToggle";
import { CompactPresetChips } from "@/components/CompactPresetChips";
import { ScenarioPresetChips } from "@/components/ScenarioPresetChips";
import type { ScenarioPresetId } from "@/lib/scenarioPresets";
import { UtilityChromeMenu } from "@/components/UtilityChromeMenu";
import { EXPLORATION_PRESETS, type ExplorationPreset, type NavSelection } from "@/data/navRegions";
import { ECON_EXPLORATION_PRESETS } from "@/data/econNavRegions";
import { BRI_TRADE_LINK_COUNT } from "@/lib/briTradePaths";
import { US_DFC_LINK_COUNT } from "@/lib/usDfcSupplyPaths";
import type { TransportPath, UsCarrier, SearchPlace } from "@/data/geoTypes";
import type { GpsJamPolygonFeature } from "@/hooks/useGpsJamLayer";
import type { EntryGate } from "@/components/globe/types";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { BasemapMode } from "@/lib/basemapMode";
import type { CompactChipId } from "@/lib/compactViewPreset";
import type { LayerCategory } from "@/components/LayerCategoryPanel";
import type { WorldTensionSnapshot } from "@/lib/dailyRanks";
import type { ChromeCoachStep } from "@/components/ChromeOnboardingCoach";
import { t } from "@/lib/uiStrings";

export interface DashboardTopChromeProps {
  intelSheetOpen: boolean;
  entryGate: EntryGate;
  showModePicker: boolean;
  viewerMode: ViewerMode;
  labelLanguage: LabelLanguage;
  wtiSnapshot: WorldTensionSnapshot | null;
  wtiFetchedAt: string | null;
  showGscpiGauge: boolean;
  globeSpinEnabled: boolean;
  setGlobeSpinEnabled: Dispatch<SetStateAction<boolean>>;
  /** 좌하단 텔레그램 OSINT 미니 패널 — 켜지면 자전 토글을 그 위로 밀어 올린다 */
  telegramMiniPanelVisible?: boolean;
  handleNavNavigate: (selection: NavSelection) => void;
  liveUpdatedAt: string | null;
  dataGeneratedAt: string | null;
  liveStatus: "idle" | "loading" | "ok" | "error";
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  searchResults: SearchPlace[];
  handleSearchSelect: (place: SearchPlace) => void;
  isCompactUi: boolean;
  /** 태블릿 — 우상단 칩 dense + 레일 밀도 */
  isTabletUi?: boolean;
  setAskLayersOpen: Dispatch<SetStateAction<boolean>>;
  handleViewerModeChange: (mode: ViewerMode) => void;
  basemapMode: BasemapMode;
  handleBasemapModeChange: (mode: BasemapMode) => void;
  layerCategories: LayerCategory[];
  layerDropdownOpen: boolean;
  setLayerDropdownOpen: Dispatch<SetStateAction<boolean>>;
  showLeftPanel: boolean;
  econNavSelection: NavSelection | null;
  isEconomyViewer: boolean;
  regionNavSelection: NavSelection | null;
  handleExplorationSelect: (preset: ExplorationPreset) => void;
  showUsDfcSupplyChain: boolean;
  showBriTradeConnectivity: boolean;
  setShowUsDfcSupplyChain: (v: boolean) => void;
  setShowBriTradeConnectivity: (v: boolean) => void;
  usDfcSupplyPaths: TransportPath[];
  briTradePaths: TransportPath[];
  showGpsInterference: boolean;
  setShowGpsInterference: (v: boolean) => void;
  gpsJamStatus: "idle" | "loading" | "ok" | "error";
  gpsJamPolygons: GpsJamPolygonFeature[];
  gpsJamDate: string | null;
  showUsCarriers: boolean;
  setShowUsCarriers: (v: boolean) => void;
  usCarriers: UsCarrier[];
  deployedCarrierCount: number;
  compactChipId: CompactChipId;
  handleCompactChipSelect: (chipId: CompactChipId) => void;
  /** 일반 모드 시나리오 프리셋 (P2-1) */
  scenarioPresetId: ScenarioPresetId | null;
  handleScenarioPresetSelect: (id: ScenarioPresetId) => void;
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
}

/** GlobeDashboard 상단 크롬 — ModeGlobalIndexChip · GlobeSpinToggle · HoverNav(compactMenuExtra 포함).
 *  동작 변경 없이 JSX만 이동 — intelSheetOpen/entryGate/showModePicker 조건부 래핑은 그대로 유지됨. */
export function DashboardTopChrome({
  intelSheetOpen,
  entryGate,
  showModePicker,
  viewerMode,
  labelLanguage,
  wtiSnapshot,
  wtiFetchedAt,
  showGscpiGauge,
  globeSpinEnabled,
  setGlobeSpinEnabled,
  telegramMiniPanelVisible = false,
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
  basemapMode,
  handleBasemapModeChange,
  layerCategories,
  layerDropdownOpen,
  setLayerDropdownOpen,
  showLeftPanel,
  econNavSelection,
  isEconomyViewer,
  regionNavSelection,
  handleExplorationSelect,
  showUsDfcSupplyChain,
  showBriTradeConnectivity,
  setShowUsDfcSupplyChain,
  setShowBriTradeConnectivity,
  usDfcSupplyPaths,
  briTradePaths,
  showGpsInterference,
  setShowGpsInterference,
  gpsJamStatus,
  gpsJamPolygons,
  gpsJamDate,
  showUsCarriers,
  setShowUsCarriers,
  usCarriers,
  deployedCarrierCount,
  compactChipId,
  handleCompactChipSelect,
  scenarioPresetId,
  handleScenarioPresetSelect,
  globeRef,
  getSceneForShare,
  setChromeCoachStep,
  setShowFeatureGuide,
}: DashboardTopChromeProps) {
  if (intelSheetOpen) return null;

  /**
   * 게이트 조합 파생 (P2-1 8단계).
   * 아래에서 `entryGate === null && !showModePicker`가 세 번 반복됐다.
   * 하나만 빠뜨려도 게이트 위로 크롬이 새어 나온다 — 한 번만 계산한다.
   *
   * 이 컴포넌트는 `intelSheetOpen`일 때 이미 위에서 return하므로
   * `screen.canShowChrome`과 동치다. `useScreenState`를 직접 쓰지 않는 이유는
   * 여기가 props만 받는 순수 프레젠테이션 컴포넌트이기 때문 —
   * 상위에서 `screen`을 내려주게 되면 이 지역 파생은 지운다.
   */
  const chromeVisible = entryGate === null && !showModePicker;

  return (
    <>
      {chromeVisible ? (
        <ModeGlobalIndexChip
          viewerMode={viewerMode}
          lang={labelLanguage}
          wtiScore={wtiSnapshot?.score ?? null}
          wtiDelta={wtiSnapshot?.deltaScore ?? null}
          wtiAsOf={wtiFetchedAt}
          showGscpi={showGscpiGauge}
          dense={isCompactUi || isTabletUi}
        />
      ) : null}
      {chromeVisible && !intelSheetOpen ? (
        <div
          className={`pointer-events-none fixed left-3 sm:left-4 ${
            telegramMiniPanelVisible ? "z-[600]" : "z-[200]"
          }`}
          style={{
            // 텔레그램 미니 패널(bottom 1.25rem · 리스트 max min(52vh,480px) · 헤더/푸터) 위로
            bottom: telegramMiniPanelVisible
              ? "calc(min(52vh, 480px) + 8.5rem + env(safe-area-inset-bottom, 0px))"
              : "calc(var(--bottom-intel-stack-clearance, 3.25rem) + 0.85rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <GlobeSpinToggle
            spinning={globeSpinEnabled}
            onToggle={() => setGlobeSpinEnabled((v) => !v)}
            lang={labelLanguage}
          />
        </div>
      ) : null}
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
        onAskLayersOpen={() => setAskLayersOpen(true)}
        askLayersLabel={t("askLayersButton", labelLanguage)}
        labelLanguage={labelLanguage}
        belowNav={
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ViewModeSwitcher mode={viewerMode} onChange={handleViewerModeChange} />
              <BasemapModeToggle mode={basemapMode} onChange={handleBasemapModeChange} />
              {!isCompactUi ? (
                <LayerQuickDropdown
                  categories={layerCategories}
                  lang={labelLanguage}
                  open={layerDropdownOpen}
                  onOpenChange={setLayerDropdownOpen}
                />
              ) : null}
            </div>
            {/**
             * P2-1: 일반 모드 시나리오 프리셋 — 가로 칩 대신 「주요전장/허브」 드롭다운.
             * Compact/Ultra-Lite에는 CompactPresetChips가 있으므로 중복 노출하지 않는다.
             * 레이어 패널이 열려 있으면 사용자가 직접 구성 중이라 숨긴다.
             */}
            {!isCompactUi && !showLeftPanel ? (
              <ScenarioPresetChips
                mode={viewerMode}
                activeId={scenarioPresetId}
                lang={labelLanguage}
                onSelect={handleScenarioPresetSelect}
              />
            ) : null}
          </div>
        }
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
                <>
                  <EconomySupplyChainFixedToggle
                    showUsDfc={showUsDfcSupplyChain}
                    showChinaBri={showBriTradeConnectivity}
                    onUsDfcChange={setShowUsDfcSupplyChain}
                    onChinaBriChange={setShowBriTradeConnectivity}
                    usLinkCount={usDfcSupplyPaths.length || US_DFC_LINK_COUNT}
                    chinaLinkCount={briTradePaths.length || BRI_TRADE_LINK_COUNT}
                  />
                  <FinintTicker />
                </>
              ) : (
                /* 지정학 — GPSJam 솔로 + 미 항모 (상단 우측 대신 드롭다운) */
                <div className="flex flex-wrap items-center gap-2">
                  <GpsJamFixedToggle
                    checked={showGpsInterference}
                    onChange={setShowGpsInterference}
                    status={gpsJamStatus}
                    cellCount={gpsJamPolygons.length}
                    date={gpsJamDate}
                    compact
                  />
                  {!showGpsInterference ? (
                    <UsCarrierFixedToggle
                      checked={showUsCarriers}
                      onChange={setShowUsCarriers}
                      carrierCount={usCarriers.length}
                      deployedCount={deployedCarrierCount}
                      compact
                    />
                  ) : null}
                </div>
              )}
              {!showLeftPanel ? (
                <CompactPresetChips
                  mode={viewerMode}
                  activeId={compactChipId}
                  lang={labelLanguage}
                  onSelect={handleCompactChipSelect}
                />
              ) : null}
              <div className="flex items-center gap-2">
                <UtilityChromeMenu
                  lang={labelLanguage}
                  showProTip={chromeVisible}
                  captureFrame={async () =>
                    (await globeRef.current?.captureFrame()) ?? null
                  }
                  getScene={getSceneForShare}
                  onTour={() => setChromeCoachStep("nav")}
                  onHelp={() => setShowFeatureGuide(true)}
                />
              </div>
            </>
          ) : null
        }
      />
    </>
  );
}
