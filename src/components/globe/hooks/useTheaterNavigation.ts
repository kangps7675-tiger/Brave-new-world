"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { NavSelection, RegionBBox } from "@/data/navRegions";
import type { UkraineControlZone, ViinaRenderMeta } from "@/data/geoTypes";
import type { Selection, EntryGate } from "@/components/globe/types";
import type { LiveBriefingSession } from "@/lib/eventBriefingSession";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { LayerPrefs, LabelLanguage } from "@/lib/layerPrefs";
import type { IntelTheaterFilter } from "@/lib/news/theaterMap";
import type { MergedViewConfig, ViewPackageUi } from "@/lib/viewPackages";
import type { ConceptLayerPatch } from "@/lib/conceptLayers";
import { conceptLayersForConflictNavId, conceptLayersForEconomyNavId } from "@/lib/conceptLayers";
import {
  navSelectionFromId,
  theaterFocusFromNav,
  isUkraineNavId,
  type TheaterFocusConfig,
  type TheaterSidebarTab,
} from "@/lib/theaterFocus";
import { econNavSelectionFromId } from "@/data/econNavRegions";
import { resolveHubBrief } from "@/data/hubBriefs";
import { resolveCriticalNodeBrief } from "@/data/resolveCriticalNodeBrief";
import { computeUkraineFrontFitBbox } from "@/lib/ukraineFrontPaths";
import { UKRAINE_SITUATION_PATHS } from "@/data/ukraineSituationSeed";
import { INTRO_SESSION_KEY } from "@/components/globe/constants";
import type { GlobeLod, GlobeLodTier } from "@/lib/globeLod";

export type UseTheaterNavigationOptions = {
  /** 카메라 */
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: { pitch?: number; bearing?: number },
  ) => void;
  flyToBounds: (
    selection: NavSelection,
    durationMs?: number,
    mode?: "overview" | "detail",
    camera?: { pitch?: number; bearing?: number },
  ) => void;
  computeRegionFitAltitude: (bbox: RegionBBox, fallbackAltitude: number) => number;

  /** 게이팅·라이프사이클 */
  globeReady: boolean;
  isLoading: boolean;
  loadError: unknown;
  entryGate: EntryGate;
  showModePicker: boolean;

  /** 뷰 설정 */
  viewUi: ViewPackageUi;
  initialViewConfig: MergedViewConfig | null | undefined;

  /** 레이어 prefs 헬퍼 */
  closeLeftPanel: () => void;
  applyLayerPrefs: (prefs: LayerPrefs) => void;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  toggleCategoryPrefs: (updates: ConceptLayerPatch) => void;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;

  /** region/econ/intel UI 상태 setter */
  setSelected: Dispatch<SetStateAction<Selection | null>>;
  setIntelSheetOpen: Dispatch<SetStateAction<boolean>>;
  setShowDisputeLegendPanel: Dispatch<SetStateAction<boolean>>;
  setShowLocalAlertPanel: Dispatch<SetStateAction<boolean>>;
  setEconNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setEconNewsPanelReveal: Dispatch<SetStateAction<boolean>>;
  setLiveBriefingSession: Dispatch<SetStateAction<LiveBriefingSession | null>>;
  setRegionNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setRegimeSelectedEpisodeId: Dispatch<SetStateAction<string | null>>;
  setFrictionEpisodeBrief: Dispatch<SetStateAction<FrictionEpisode | null>>;
  setTheaterSidebarTab: Dispatch<SetStateAction<TheaterSidebarTab>>;
  setIntelTheaterFilter: Dispatch<SetStateAction<IntelTheaterFilter>>;
  setShipMovesSelectedId: Dispatch<SetStateAction<string | null>>;

  /** 허브·경제 브리프 */
  scheduleHubBrief: (selection: NavSelection) => void;
  scheduleEconInsight: (opts: {
    navId?: string | null;
    criticalNodeId?: string | null;
    compact?: boolean;
  }) => void;
  closeEconInsight: () => void;
  clearEconInsightTimer: () => void;
  clearFrictionEpisodeTimer: () => void;
  rememberConflictNav: (selection: NavSelection) => void;
  rememberEconomyNav: (selection: NavSelection) => void;
  clearRegionNavSelection: () => void;

  /** 우크라이나 */
  ukraineControl: UkraineControlZone[];
  showUkraineControl: boolean;
  refreshUkraineControl: () => Promise<void> | void;
  viinaMeta: ViinaRenderMeta | null;
  setUkraineFrontLegendEngaged: Dispatch<SetStateAction<boolean>>;
  isUkraineTheaterFocus: boolean;

  /** NEPTUN */
  showNeptun: boolean;

  theaterFocusConfig: TheaterFocusConfig | null;
  labelLanguage: LabelLanguage;

  historyStoryLockedRef: MutableRefObject<boolean>;

  layerCenterRef: MutableRefObject<{ lat: number; lng: number }>;
  layerAltitudeRef: MutableRefObject<number>;
  layerLodTierRef: MutableRefObject<GlobeLodTier>;
  setFilterCenter: Dispatch<SetStateAction<{ lat: number; lng: number }>>;
  setLayerAltitude: Dispatch<SetStateAction<number>>;

  getGlobeLod: (altitude: number, lang?: "ko" | "en") => GlobeLod;

  /** 컴포넌트 전역에서 폭넓게 공유되는 ref — 이 훅이 소유하지 않고 그대로 전달받음 */
  ukraineZoomPendingRef: MutableRefObject<boolean>;
  neptunZoomPendingRef: MutableRefObject<boolean>;
  packageTheaterFocusPlayedRef: MutableRefObject<boolean>;
  packageEconFocusPlayedRef: MutableRefObject<boolean>;
  introPlayedRef: MutableRefObject<boolean>;
  immediateUntilRef: MutableRefObject<number>;
  suppressAutoRegionZoomRef: MutableRefObject<boolean>;
};

export type EnterTheaterFocusFn = (selection: NavSelection, tab?: TheaterSidebarTab) => void;
export type EnterEconomyRegionFocusFn = (
  selection: NavSelection,
  opts?: { openInsight?: boolean },
) => void;

export type UseTheaterNavigationResult = {
  enterTheaterFocus: EnterTheaterFocusFn;
  enterEconomyRegionFocus: EnterEconomyRegionFocusFn;
  flyToTheaterDetail: () => void;
  /** 이 훅이 소유 — 다른 위치(예: 우크라 스토리 자동 진입)에서 최신 클로저를 호출할 때 사용 */
  enterTheaterFocusRef: MutableRefObject<EnterTheaterFocusFn>;
  enterEconomyRegionFocusRef: MutableRefObject<EnterEconomyRegionFocusFn>;
};

/**
 * 전장(theater)·경제 허브(economy region) 포커스 진입 오케스트레이션.
 * GlobeDashboard.tsx의 enterEconomyRegionFocus / enterTheaterFocus / flyToTheaterDetail 및
 * 관련 패키지 autoEnter·우크라/NEPTUN 자동 줌 이펙트를 1:1로 추출.
 */
export function useTheaterNavigation(
  options: UseTheaterNavigationOptions,
): UseTheaterNavigationResult {
  const {
    flyTo,
    flyToBounds,
    computeRegionFitAltitude,
    globeReady,
    isLoading,
    loadError,
    entryGate,
    showModePicker,
    viewUi,
    initialViewConfig,
    closeLeftPanel,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    toggleCategoryPrefs,
    layerPrefsLiveRef,
    setSelected,
    setIntelSheetOpen,
    setShowDisputeLegendPanel,
    setShowLocalAlertPanel,
    setEconNavSelection,
    setEconNewsPanelReveal,
    setLiveBriefingSession,
    setRegionNavSelection,
    setRegimeSelectedEpisodeId,
    setFrictionEpisodeBrief,
    setTheaterSidebarTab,
    setIntelTheaterFilter,
    setShipMovesSelectedId,
    scheduleHubBrief,
    scheduleEconInsight,
    closeEconInsight,
    clearEconInsightTimer,
    clearFrictionEpisodeTimer,
    rememberConflictNav,
    rememberEconomyNav,
    clearRegionNavSelection,
    ukraineControl,
    showUkraineControl,
    refreshUkraineControl,
    viinaMeta,
    setUkraineFrontLegendEngaged,
    isUkraineTheaterFocus,
    showNeptun,
    theaterFocusConfig,
    labelLanguage,
    historyStoryLockedRef,
    layerCenterRef,
    layerAltitudeRef,
    layerLodTierRef,
    setFilterCenter,
    setLayerAltitude,
    getGlobeLod,
    ukraineZoomPendingRef,
    neptunZoomPendingRef,
    packageTheaterFocusPlayedRef,
    packageEconFocusPlayedRef,
    introPlayedRef,
    immediateUntilRef,
    suppressAutoRegionZoomRef,
  } = options;

  const enterTheaterFocusRef = useRef<EnterTheaterFocusFn>(() => {});
  const enterEconomyRegionFocusRef = useRef<EnterEconomyRegionFocusFn>(() => {});

  function enterEconomyRegionFocus(
    selection: NavSelection,
    opts?: { openInsight?: boolean },
  ) {
    if (historyStoryLockedRef.current) return;
    closeLeftPanel();
    setSelected(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
    clearRegionNavSelection();
    setEconNavSelection(selection);
    rememberEconomyNav(selection);
    setEconNewsPanelReveal(false);
    flyToBounds(selection, 1100, "overview", { pitch: 55, bearing: -20 });
    // 양피지는 nav/허브 직접 선택일 때만 (인트로·패키지 autoEnter는 카메라만)
    const openInsight = opts?.openInsight !== false;
    if (openInsight) {
      scheduleEconInsight({ navId: selection.id, compact: false });
    }
    // 양피지 있으면 닫은 뒤 중계 레이어 ON — 없을 때만 즉시 적용
    if (!openInsight || !resolveCriticalNodeBrief({ navId: selection.id })) {
      const conceptLayers = conceptLayersForEconomyNavId(selection.id);
      if (Object.keys(conceptLayers).length > 0) {
        requestAnimationFrame(() => {
          toggleCategoryPrefs(conceptLayers);
        });
      }
    }
  }

  function enterTheaterFocus(selection: NavSelection, tab: TheaterSidebarTab = "news") {
    if (historyStoryLockedRef.current) return;
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
    setLiveBriefingSession((prev) => {
      if (prev) applyLayerPrefs(prev.snapshot);
      return null;
    });
    setRegionNavSelection(selection);
    rememberConflictNav(selection);
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

    if (selection.focusMode === "westpac-pulse") {
      if (!layerPrefsLiveRef.current.showWeeklyShipMoves) {
        patchLayerPrefsSoft({ showWeeklyShipMoves: true });
      }
      setShipMovesSelectedId(null);
    }

    // 양피지(허브 브리프)가 뜨면 닫은 뒤 중계 레이어 — 분쟁사·브리프 없음은 즉시
    const willHubBrief =
      Boolean(selection.hubId && selection.focusMode) &&
      Boolean(resolveHubBrief(selection, labelLanguage));
    if (
      !willHubBrief &&
      selection.focusMode !== "regime" &&
      selection.focusMode !== "westpac-pulse"
    ) {
      const conceptLayers = conceptLayersForConflictNavId(selection.id);
      if (Object.keys(conceptLayers).length > 0) {
        requestAnimationFrame(() => {
          toggleCategoryPrefs(conceptLayers);
        });
      }
    }

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

  return {
    enterTheaterFocus,
    enterEconomyRegionFocus,
    flyToTheaterDetail,
    enterTheaterFocusRef,
    enterEconomyRegionFocusRef,
  };
}
