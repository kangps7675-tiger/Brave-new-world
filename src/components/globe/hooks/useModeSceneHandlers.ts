"use client";

import { useCallback, useEffect, startTransition, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import { shouldOfferAirRaidCoach } from "@/components/AirRaidOnboardingCoach";
import { markQuickStartDone } from "@/components/QuickStartCoach";
import { markViewerIntroDone } from "@/components/ViewerIntroOverlay";
import type { LayerPanelTab } from "@/components/globe/LayerPanelHost";
import { INTRO_SESSION_KEY, INTRO_CAMERA_DURATION_MS, INTRO_CAMERA_DELAY_MS } from "@/components/globe/constants";
import { markWelcomeGateDone, markPurposeJobDone, readLangChoiceDone } from "@/components/globe/formatters";
import type { GlobeSize, EntryGate, Selection } from "@/components/globe/types";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { ConflictEvent } from "@/data/geoTypes";
import type { NavSelection } from "@/data/navRegions";
import type { FirstImpressionController } from "@/hooks/useFirstImpressionController";
import { trackModeSwitch, trackDomainSelect } from "@/lib/analyticsEvents";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import type { BattlefieldZone } from "@/lib/battlefieldPresets";
import { entryOrbitCamera, ENTRY_GATE, buildDomainOverviewPrefs } from "@/lib/entryOverview";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import { markHotTheaterSessionApplied, type HotTheaterFocus } from "@/lib/hotTheaterLayers";
import type { DeskFocus } from "@/lib/intelContract";
import { recordInterestMode } from "@/lib/interest/recordInterest";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";
import type { IntelTheaterFilter } from "@/lib/news/theaterMap";
import { canMountFullObserve, markObserveUnlocked } from "@/lib/observeAccess";
import { type SceneMissionId, sceneMissionApply, asLayerPatch, softZoneForMission } from "@/lib/sceneMissions";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import { savePerfPrefs } from "@/lib/ultraLiteMode";
import { type MergedViewConfig, type ViewPackageId, type ViewTheaterChoice, type ViewerMode, applyViewPackages, type ViewPackageUi } from "@/lib/viewPackages";
import { applyViewerMode } from "@/lib/viewerChrome";
import { rememberConflictTheater, rememberEconomyHub } from "@/lib/watchFocus";

export type UseModeSceneHandlersOptions = {
  initialViewConfig: MergedViewConfig | null;
  introPlayedRef: MutableRefObject<boolean>;
  packageTheaterFocusPlayedRef: MutableRefObject<boolean>;
  packageEconFocusPlayedRef: MutableRefObject<boolean>;
  size: GlobeSize;
  setShowLeftPanel: Dispatch<SetStateAction<boolean>>;
  setLeftPanelTab: Dispatch<SetStateAction<LayerPanelTab>>;
  setIntelSheetOpen: Dispatch<SetStateAction<boolean>>;
  setIntelTheaterFilter: Dispatch<SetStateAction<IntelTheaterFilter>>;
  viewUi: ViewPackageUi;
  setViewUi: Dispatch<SetStateAction<ViewPackageUi>>;
  viewTheater: ViewTheaterChoice;
  setViewTheater: Dispatch<SetStateAction<ViewTheaterChoice>>;
  viewEconomyHub: string;
  setViewEconomyHub: Dispatch<SetStateAction<string>>;
  setViewPackages: Dispatch<SetStateAction<ViewPackageId[]>>;
  viewerMode: ViewerMode;
  setViewerMode: Dispatch<SetStateAction<ViewerMode>>;
  isEconomyViewer: boolean;
  isCompactUi: boolean;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  showModePicker: boolean;
  setShowModePicker: Dispatch<SetStateAction<boolean>>;
  setModePickerLockMode: Dispatch<SetStateAction<boolean>>;
  setModePickerInitialMode: Dispatch<SetStateAction<ViewerMode | null>>;
  entryGate: EntryGate;
  setEntryGate: Dispatch<SetStateAction<EntryGate>>;
  langChoiceDone: boolean;
  purposeJobDone: boolean;
  setPurposeJobDone: Dispatch<SetStateAction<boolean>>;
  setPurposeJobForced: Dispatch<SetStateAction<boolean>>;
  observeUnlocked: boolean;
  setObserveUnlocked: Dispatch<SetStateAction<boolean>>;
  startObservePreview: () => void;
  endObservePreview: () => void;
  domainThenDetailTimerRef: MutableRefObject<number | null>;
  chromeCoachStep: "nav" | null;
  showFirstVisitTour: boolean;
  showAirRaidCoach: boolean;
  setShowAirRaidCoach: Dispatch<SetStateAction<boolean>>;
  hotTheaterOffer: HotTheaterFocus | null;
  setShowSceneMissionPicker: Dispatch<SetStateAction<boolean>>;
  setSceneMissionActive: Dispatch<SetStateAction<boolean>>;
  quietOverviewAppliedRef: MutableRefObject<boolean>;
  pendingQuietOverviewRef: MutableRefObject<boolean>;
  setHubBriefOpen: Dispatch<SetStateAction<boolean>>;
  setFrictionEpisodeBrief: Dispatch<SetStateAction<FrictionEpisode | null>>;
  battlefieldSoftZoneRef: MutableRefObject<BattlefieldZone | null>;
  battlefieldManualUntilRef: MutableRefObject<number>;
  unpinUserLayers: () => void;
  setShowViewerIntro: Dispatch<SetStateAction<boolean>>;
  setAskLayersOpen: Dispatch<SetStateAction<boolean>>;
  setShowQuickStart: Dispatch<SetStateAction<boolean>>;
  setShowDisputeLegendPanel: Dispatch<SetStateAction<boolean>>;
  setSelected: Dispatch<SetStateAction<Selection | null>>;
  isLoading: boolean;
  globeReady: boolean;
  setShowIntroHint: Dispatch<SetStateAction<boolean>>;
  loadError: string | null;
  setGdeltEvents: Dispatch<SetStateAction<ConflictEvent[]>>;
  setGdeltError: Dispatch<SetStateAction<string | null>>;
  setGdeltFetchedAt: Dispatch<SetStateAction<string | null>>;
  setTelegramAlerts: Dispatch<SetStateAction<TelegramAlert[]>>;
  setDeskFocus: Dispatch<SetStateAction<DeskFocus | null>>;
  setTelegramLive: Dispatch<SetStateAction<boolean>>;
  setTelegramStatus: Dispatch<SetStateAction<"idle" | "loading" | "ok" | "error" | "stub" | "waiting">>;
  ukraineZoomPendingRef: MutableRefObject<boolean>;
  neptunZoomPendingRef: MutableRefObject<boolean>;
  suppressAutoRegionZoomRef: MutableRefObject<boolean>;
  ultraLiteRef: MutableRefObject<boolean>;
  setUltraLite: Dispatch<SetStateAction<boolean>>;
  applyLayerPrefs: (next: LayerPrefs) => void;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  setPeriodicBriefing: Dispatch<SetStateAction<PeriodicBriefing | null>>;
  setFoldedPeriodicBriefing: Dispatch<SetStateAction<PeriodicBriefing | null>>;
  setDailyLampSettled: Dispatch<SetStateAction<boolean>>;
  lampModeSwitchPendingRef: MutableRefObject<boolean>;
  issueUiPausedForLamp: boolean;
  prepareLampForModeSwitch: () => void;
  clearBreakingFlash: () => void;
  hasPendingScene: () => boolean;
  showUkraineControl: boolean;
  setRegionNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setUkraineFrontLegendEngaged: Dispatch<SetStateAction<boolean>>;
  setEconNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setEconNewsPanelReveal: Dispatch<SetStateAction<boolean>>;
  setRegimeSelectedEpisodeId: Dispatch<SetStateAction<string | null>>;
  historyStoryLockedRef: MutableRefObject<boolean>;
  layerCenterRef: MutableRefObject<{ lat: number; lng: number; }>;
  layerAltitudeRef: MutableRefObject<number>;
  layerLodTierRef: MutableRefObject<GlobeLodTier>;
  setFilterCenter: Dispatch<SetStateAction<{ lat: number; lng: number; }>>;
  setLayerAltitude: Dispatch<SetStateAction<number>>;
  flyTo: (lat: number, lng: number, altitude?: number | undefined, durationMs?: number | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  pendingObserveFlyRef: MutableRefObject<{ lat: number; lng: number; altitude?: number | undefined; durationMs?: number | undefined; camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined; subtitle: string; title: string; selection?: Selection | undefined; } | null>;
  flushPendingCesiumFly: () => boolean;
  clearHubBriefTimer: () => void;
  clearFrictionEpisodeTimer: () => void;
  clearRegionNavSelection: () => void;
  clearEconInsightTimer: () => void;
  closeEconInsight: () => void;
  dismissLayerPanel: (closePanel?: boolean) => void;
  firstImpression: FirstImpressionController;
};

/**
 * 뷰 모드·장면 미션·도메인 선택 핸들러 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useModeSceneHandlers(opts: UseModeSceneHandlersOptions) {
  const {
    initialViewConfig,
    introPlayedRef,
    packageTheaterFocusPlayedRef,
    packageEconFocusPlayedRef,
    size,
    setShowLeftPanel,
    setLeftPanelTab,
    setIntelSheetOpen,
    setIntelTheaterFilter,
    viewUi,
    setViewUi,
    viewTheater,
    setViewTheater,
    viewEconomyHub,
    setViewEconomyHub,
    setViewPackages,
    viewerMode,
    setViewerMode,
    isEconomyViewer,
    isCompactUi,
    layerPrefsLiveRef,
    showModePicker,
    setShowModePicker,
    setModePickerLockMode,
    setModePickerInitialMode,
    entryGate,
    setEntryGate,
    langChoiceDone,
    purposeJobDone,
    setPurposeJobDone,
    setPurposeJobForced,
    observeUnlocked,
    setObserveUnlocked,
    startObservePreview,
    endObservePreview,
    domainThenDetailTimerRef,
    chromeCoachStep,
    showFirstVisitTour,
    showAirRaidCoach,
    setShowAirRaidCoach,
    hotTheaterOffer,
    setShowSceneMissionPicker,
    setSceneMissionActive,
    quietOverviewAppliedRef,
    pendingQuietOverviewRef,
    setHubBriefOpen,
    setFrictionEpisodeBrief,
    battlefieldSoftZoneRef,
    battlefieldManualUntilRef,
    unpinUserLayers,
    setShowViewerIntro,
    setAskLayersOpen,
    setShowQuickStart,
    setShowDisputeLegendPanel,
    setSelected,
    isLoading,
    globeReady,
    setShowIntroHint,
    loadError,
    setGdeltEvents,
    setGdeltError,
    setGdeltFetchedAt,
    setTelegramAlerts,
    setDeskFocus,
    setTelegramLive,
    setTelegramStatus,
    ukraineZoomPendingRef,
    neptunZoomPendingRef,
    suppressAutoRegionZoomRef,
    ultraLiteRef,
    setUltraLite,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    setPeriodicBriefing,
    setFoldedPeriodicBriefing,
    setDailyLampSettled,
    lampModeSwitchPendingRef,
    issueUiPausedForLamp,
    prepareLampForModeSwitch,
    clearBreakingFlash,
    hasPendingScene,
    showUkraineControl,
    setRegionNavSelection,
    setUkraineFrontLegendEngaged,
    setEconNavSelection,
    setEconNewsPanelReveal,
    setRegimeSelectedEpisodeId,
    historyStoryLockedRef,
    layerCenterRef,
    layerAltitudeRef,
    layerLodTierRef,
    setFilterCenter,
    setLayerAltitude,
    flyTo,
    pendingObserveFlyRef,
    flushPendingCesiumFly,
    clearHubBriefTimer,
    clearFrictionEpisodeTimer,
    clearRegionNavSelection,
    clearEconInsightTimer,
    closeEconInsight,
    dismissLayerPanel,
    firstImpression,
  } = opts;

  function applyMergedViewConfig(
    merged: MergedViewConfig,
    packages: ViewPackageId[],
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = merged.economyHub ?? "auto",
  ) {
    if (domainThenDetailTimerRef.current != null) {
      window.clearTimeout(domainThenDetailTimerRef.current);
      domainThenDetailTimerRef.current = null;
    }
    dismissLayerPanel(true);

    // 모드·패키지는 동기 적용 — startTransition에 넣으면 entryGate가 먼저 풀리며
    // 한 프레임(또는 더 길게) 지정학으로 남아 등불·전장 이펙트가 잘못 점화됨.
    applyLayerPrefs(merged.layers);
    setViewUi({ ...merged.ui, autoOpenIntelSheet: false });
    setViewTheater(theater);
    setViewEconomyHub(economyHub);
    setViewPackages(packages.filter((id) => id !== "custom"));
    setIntelTheaterFilter(theater !== "auto" ? theater : "all");
    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setEntryGate(null);
    markWelcomeGateDone();

    startTransition(() => {
      if (merged.ui.openLayerPanel && !isCompactUi) {
        setLeftPanelTab("layers");
        setShowLeftPanel(true);
      }
    });
  }

  function handleModeApply(
    mode: ViewerMode,
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = "auto",
  ) {
    if (historyStoryLockedRef.current) return;
    setIntelSheetOpen(false);
    clearRegionNavSelection();
    setEconNavSelection(null);
    closeEconInsight();
    clearEconInsightTimer();
    setEconNewsPanelReveal(false);
    setSelected(null);
    packageTheaterFocusPlayedRef.current = false;
    packageEconFocusPlayedRef.current = false;
    // 세부 확정 직후에도 우크라/NEPTUN 강제 줌은 잠시 막고, autoEnter 전장/허브 fly만 허용
    suppressAutoRegionZoomRef.current = true;
    ukraineZoomPendingRef.current = false;
    neptunZoomPendingRef.current = false;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    const effectiveTheater =
      mode === "conflict" || mode === "history" ? theater : "auto";
    const effectiveHub = mode === "economy" ? economyHub : "auto";
    const { merged, packages } = applyViewerMode(mode, effectiveTheater, effectiveHub);
    setViewerMode(mode);
    applyMergedViewConfig(merged, packages, effectiveTheater, effectiveHub);
    if ((mode === "conflict" || mode === "history") && effectiveTheater !== "auto") {
      rememberConflictTheater(effectiveTheater);
    } else if (mode === "economy" && effectiveHub !== "auto") {
      rememberEconomyHub(effectiveHub, String(effectiveHub), String(effectiveHub));
    }
    if (mode === "history") {
      setPeriodicBriefing(null);
      setFoldedPeriodicBriefing(null);
      clearBreakingFlash();
      setDailyLampSettled(true);
      lampModeSwitchPendingRef.current = false;
    }
    if (mode === "economy") {
      setUkraineFrontLegendEngaged(false);
      setShowDisputeLegendPanel(false);
      setGdeltEvents([]);
      setGdeltFetchedAt(null);
      setGdeltError(null);
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
    }
    if (mode === "satellite") {
      setUkraineFrontLegendEngaged(false);
      setShowDisputeLegendPanel(false);
      setShowLeftPanel(false);
      setGdeltEvents([]);
      setGdeltFetchedAt(null);
      setGdeltError(null);
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      packageTheaterFocusPlayedRef.current = true;
      packageEconFocusPlayedRef.current = true;
      setViewUi((prev) => ({
        ...prev,
        autoEnterTheaterNavId: null,
        autoEnterEconNavId: null,
        autoOpenIntelSheet: false,
        openLayerPanel: false,
      }));
    }
    if (mode === "live") {
      setUkraineFrontLegendEngaged(false);
      setShowDisputeLegendPanel(false);
      setGdeltEvents([]);
      setGdeltFetchedAt(null);
      setGdeltError(null);
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      packageTheaterFocusPlayedRef.current = true;
      packageEconFocusPlayedRef.current = true;
      setViewUi((prev) => ({
        ...prev,
        autoEnterTheaterNavId: null,
        autoEnterEconNavId: null,
        autoOpenIntelSheet: false,
        openLayerPanel: true,
      }));
      if (!isCompactUi) {
        setLeftPanelTab("layers");
        setShowLeftPanel(true);
      }
    }
    // 지정학 + 자동 전장: 전역 궤도 하드코딩 (우크라·핫알림 자동 fly 금지)
    if ((mode === "conflict" || mode === "history") && effectiveTheater === "auto") {
      packageTheaterFocusPlayedRef.current = true;
      setViewUi((prev) => ({
        ...prev,
        autoEnterTheaterNavId: null,
        autoOpenIntelSheet: false,
      }));
      const orbit = entryOrbitCamera(size);
      layerCenterRef.current = {
        lat: orbit.lat,
        lng: orbit.lng,
      };
      layerAltitudeRef.current = orbit.altitude;
      layerLodTierRef.current = getGlobeLod(orbit.altitude).tier;
      setFilterCenter({
        lat: orbit.lat,
        lng: orbit.lng,
      });
      setLayerAltitude(orbit.altitude);
      flyTo(
        orbit.lat,
        orbit.lng,
        orbit.altitude,
        ENTRY_GATE.zoomOutFlyMs,
        { pitch: orbit.pitch },
      );
    }
    // 지경학 + 허브 auto: 전역 궤도 (호르무즈 등 핫 허브 자동 fly 금지)
    if (mode === "economy" && effectiveHub === "auto") {
      packageEconFocusPlayedRef.current = true;
      setViewUi((prev) => ({
        ...prev,
        autoEnterEconNavId: null,
        autoOpenIntelSheet: false,
      }));
      const orbit = entryOrbitCamera(size);
      layerCenterRef.current = {
        lat: orbit.lat,
        lng: orbit.lng,
      };
      layerAltitudeRef.current = orbit.altitude;
      layerLodTierRef.current = getGlobeLod(orbit.altitude).tier;
      setFilterCenter({
        lat: orbit.lat,
        lng: orbit.lng,
      });
      setLayerAltitude(orbit.altitude);
      flyTo(
        orbit.lat,
        orbit.lng,
        orbit.altitude,
        ENTRY_GATE.zoomOutFlyMs,
        { pitch: orbit.pitch },
      );
    }
    window.setTimeout(() => {
      ukraineZoomPendingRef.current = false;
      neptunZoomPendingRef.current = false;
      suppressAutoRegionZoomRef.current = false;
    }, 1600);
  }

  function handleCustomLayerApply() {
    const merged = applyViewPackages(["custom"], "auto");
    applyMergedViewConfig(merged, ["custom"], "auto");
  }

  function handleViewerModeChange(mode: ViewerMode) {
    if (historyStoryLockedRef.current) return;
    if (viewerMode === mode) return;
    trackModeSwitch(mode);
    recordInterestMode(mode);
    prepareLampForModeSwitch();
    if (mode === "satellite") {
      if (!canMountFullObserve(observeUnlocked)) {
        startObservePreview();
      } else {
        endObservePreview();
      }
    } else {
      endObservePreview();
      setDeskFocus(null);
    }
    handleModeApply(
      mode,
      mode === "conflict" || mode === "history" ? viewTheater : "auto",
      mode === "economy" ? viewEconomyHub : "auto",
    );
  }

  function confirmPurposeJob(job: import("@/components/PurposeJobOverlay").PurposeJobId) {
    markPurposeJobDone();
    setPurposeJobDone(true);
    setPurposeJobForced(false);
    const orbit = entryOrbitCamera(size);
    if (job === "conflict" || job === "economy") {
      handleViewerModeChange(job);
      // 관측(Cesium)에서 넘어오면 MapLibre 는 이 클릭 직후 마운트된다.
      // 같은 틱의 flyTo 는 아직 없는 지도에 버려지므로 한 프레임 뒤에 보낸다.
      window.setTimeout(() => {
        flyTo(orbit.lat, orbit.lng, orbit.altitude, ENTRY_GATE.zoomOutFlyMs, {
          pitch: orbit.pitch,
        });
      }, 0);
      return;
    }
    if (job === "satellite") {
      pendingObserveFlyRef.current = {
        lat: orbit.lat,
        lng: orbit.lng,
        altitude: orbit.altitude,
        durationMs: ENTRY_GATE.zoomOutFlyMs,
        camera: { pitch: orbit.pitch },
        subtitle: "",
        title: "",
      };
      if (viewerMode !== "satellite") {
        handleViewerModeChange("satellite");
        return;
      }
      flushPendingCesiumFly();
      return;
    }
    if (job === "ask") {
      setAskLayersOpen(true);
    }
  }

  const handleObserveUnlock = useCallback(() => {
    markObserveUnlocked();
    setObserveUnlocked(true);
    endObservePreview();
  }, [endObservePreview]);

  const handleObservePaywallDismiss = useCallback(() => {
    endObservePreview();
    if (viewerMode === "satellite" && !canMountFullObserve(observeUnlocked)) {
      handleModeApply("conflict", viewTheater, "auto");
    }
  }, [endObservePreview, viewerMode, observeUnlocked, viewTheater]);

  useEffect(() => {
    if (isLoading || loadError || !globeReady || introPlayedRef.current) return;
    if (entryGate !== null || showModePicker) return;
    if (viewUi.autoEnterTheaterNavId ?? initialViewConfig?.ui.autoEnterTheaterNavId) return;
    if (viewUi.autoEnterEconNavId ?? initialViewConfig?.ui.autoEnterEconNavId) return;

    if (typeof window !== "undefined" && sessionStorage.getItem(INTRO_SESSION_KEY)) {
      introPlayedRef.current = true;
      return;
    }

    introPlayedRef.current = true;

    // 전역 궤도만 유지 — 핫 지역 자동 fly 금지 (선택창에서만 이동)
    // 관측(Cesium)은 해협 클로즈업이 기본 — 전역 인트로로 덮어쓰지 않음
    if (showUkraineControl || viewerMode === "satellite") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      return;
    }

    const startTimer = window.setTimeout(() => {
      setShowIntroHint(true);
      const orbit = entryOrbitCamera(size);
      flyTo(
        orbit.lat,
        orbit.lng,
        orbit.altitude,
        INTRO_CAMERA_DURATION_MS,
        { pitch: orbit.pitch },
      );
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }, INTRO_CAMERA_DELAY_MS);

    const hintTimer = window.setTimeout(() => {
      setShowIntroHint(false);
    }, INTRO_CAMERA_DELAY_MS + INTRO_CAMERA_DURATION_MS + 600);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(hintTimer);
    };
  }, [
    entryGate,
    flyTo,
    globeReady,
    initialViewConfig?.ui.autoEnterEconNavId,
    initialViewConfig?.ui.autoEnterTheaterNavId,
    isLoading,
    loadError,
    showModePicker,
    showUkraineControl,
    viewerMode,
    viewUi.autoEnterEconNavId,
    viewUi.autoEnterTheaterNavId,
  ]);

  useEffect(() => {
    if (isLoading || !globeReady || loadError) return;
    if (entryGate !== null || showModePicker) return;
    if (hasPendingScene()) return; // 딥링크 진입은 게이트 생략
    // 언어만 필수 — caution/welcome/sources/domain 부트 체인 제거
    if (!readLangChoiceDone()) return;
    // no-op: 전역뷰 유지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryGate, globeReady, isLoading, loadError, showModePicker, langChoiceDone]);

  /** 언어·목적 카드 직후 1회 — 얇은 전역 히어로 + 궤도 (재방문 prefs 유지) */
  useEffect(() => {
    if (!langChoiceDone || !purposeJobDone || !globeReady || isLoading || loadError) return;
    if (entryGate !== null || showModePicker) return;
    if (hasPendingScene()) return;
    if (!pendingQuietOverviewRef.current || quietOverviewAppliedRef.current) return;
    pendingQuietOverviewRef.current = false;
    quietOverviewAppliedRef.current = true;
    const overviewPrefs = buildDomainOverviewPrefs(viewerMode, {
      labelLanguage: layerPrefsLiveRef.current.labelLanguage,
      ultraLite: ultraLiteRef.current,
    });
    applyLayerPrefs(overviewPrefs);
    const entryLook = entryOrbitCamera(size);
    layerCenterRef.current = { lat: entryLook.lat, lng: entryLook.lng };
    layerAltitudeRef.current = entryLook.altitude;
    setFilterCenter({ lat: entryLook.lat, lng: entryLook.lng });
    setLayerAltitude(entryLook.altitude);
    flyTo(entryLook.lat, entryLook.lng, entryLook.altitude, ENTRY_GATE.zoomOutFlyMs, {
      pitch: entryLook.pitch,
    });
    setViewUi((prev) => ({
      ...prev,
      autoEnterTheaterNavId: null,
      autoEnterEconNavId: null,
      autoOpenIntelSheet: false,
    }));
  }, [
    applyLayerPrefs,
    entryGate,
    flyTo,
    globeReady,
    isLoading,
    loadError,
    langChoiceDone,
    purposeJobDone,
    showModePicker,
    size,
    viewerMode,
  ]);

  useEffect(() => {
    return () => {
      if (domainThenDetailTimerRef.current != null) {
        window.clearTimeout(domainThenDetailTimerRef.current);
        domainThenDetailTimerRef.current = null;
      }
    };
  }, []);

  function openModePickerManual() {
    if (historyStoryLockedRef.current) return;
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setShowModePicker(true);
  }

  function openSceneMissionPicker() {
    if (historyStoryLockedRef.current) return;
    if (entryGate !== null || showModePicker) return;
    setShowSceneMissionPicker(true);
  }

  const returnToEntryOrbit = useCallback(() => {
    const overviewPrefs = buildDomainOverviewPrefs(viewerMode, {
      labelLanguage: layerPrefsLiveRef.current.labelLanguage,
      ultraLite: ultraLiteRef.current,
    });
    applyLayerPrefs(overviewPrefs);
    const entryLook = entryOrbitCamera(size);
    layerCenterRef.current = { lat: entryLook.lat, lng: entryLook.lng };
    layerAltitudeRef.current = entryLook.altitude;
    setFilterCenter({ lat: entryLook.lat, lng: entryLook.lng });
    setLayerAltitude(entryLook.altitude);
    flyTo(entryLook.lat, entryLook.lng, entryLook.altitude, ENTRY_GATE.zoomOutFlyMs, {
      pitch: entryLook.pitch,
    });
    setSceneMissionActive(false);
    setRegionNavSelection(null);
    setEconNavSelection(null);
  }, [
    applyLayerPrefs,
    flyTo,
    setFilterCenter,
    setLayerAltitude,
    size,
    viewerMode,
  ]);

  function applySceneMission(id: SceneMissionId) {
    setShowSceneMissionPicker(false);
    const apply = sceneMissionApply(id, hotTheaterOffer);
    if (id === "stay-global") {
      markHotTheaterSessionApplied();
      return;
    }
    markHotTheaterSessionApplied();
    if (apply.viewerMode && apply.viewerMode !== viewerMode) {
      handleModeApply(apply.viewerMode, "auto", "auto");
    }
    const patch = asLayerPatch(apply.patch);
    if (Object.keys(patch).length > 0) {
      patchLayerPrefsSoft(patch);
    }
    const soft = softZoneForMission(apply, hotTheaterOffer);
    if (soft) {
      battlefieldSoftZoneRef.current = soft;
      battlefieldManualUntilRef.current = Date.now() + 24_000;
    }
    if (apply.fly) {
      flyTo(apply.fly.lat, apply.fly.lng, apply.fly.altitude);
    }
    setSceneMissionActive(true);
  }

  function handleDomainSelect(mode: ViewerMode, ultraLiteOn: boolean) {
    if (historyStoryLockedRef.current) return;
    trackDomainSelect(mode, ultraLiteOn);
    ultraLiteRef.current = ultraLiteOn;
    setUltraLite(ultraLiteOn);
    savePerfPrefs({ ultraLite: ultraLiteOn });
    unpinUserLayers();

    suppressAutoRegionZoomRef.current = true;
    ukraineZoomPendingRef.current = false;
    neptunZoomPendingRef.current = false;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }

    const overviewPrefs = buildDomainOverviewPrefs(mode, {
      labelLanguage: layerPrefsLiveRef.current.labelLanguage,
      ultraLite: ultraLiteOn,
    });

    // 패키지·크롬을 먼저 확정한 뒤 히어로 레이어로 덮음 (게이트 해제와 같은 틱에 지경학 반영)
    handleModeApply(mode, "auto", "auto");
    applyLayerPrefs(overviewPrefs);

    // 첫 화면은 전역 궤도 유지 — 핫 지역 줌인은 선택창 수락 후에만
    const entryLook = entryOrbitCamera(size);

    layerCenterRef.current = {
      lat: entryLook.lat,
      lng: entryLook.lng,
    };
    layerAltitudeRef.current = entryLook.altitude;
    layerLodTierRef.current = getGlobeLod(entryLook.altitude).tier;
    setFilterCenter({
      lat: entryLook.lat,
      lng: entryLook.lng,
    });
    setLayerAltitude(entryLook.altitude);
    flyTo(
      entryLook.lat,
      entryLook.lng,
      entryLook.altitude,
      ENTRY_GATE.zoomOutFlyMs,
      { pitch: entryLook.pitch },
    );

    // 도메인 직후는 광역 히어로만 — 전장/허브 자동 fly·양피지 금지
    packageTheaterFocusPlayedRef.current = true;
    packageEconFocusPlayedRef.current = true;
    setViewUi((prev) => ({
      ...prev,
      autoEnterTheaterNavId: null,
      autoEnterEconNavId: null,
      autoOpenIntelSheet: false,
    }));
    setHubBriefOpen(false);
    clearHubBriefTimer();
    setRegionNavSelection(null);
    setEconNavSelection(null);
    setFrictionEpisodeBrief(null);
    setRegimeSelectedEpisodeId(null);
    clearFrictionEpisodeTimer();
    closeEconInsight();
    clearEconInsightTimer();
    setEconNewsPanelReveal(false);

    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setEntryGate(null);
    markWelcomeGateDone();
    // 첫 진입 연쇄 축소: 모드 인트로·퀵스타트는 자동으로 띄우지 않음
    markViewerIntroDone(mode);
    markQuickStartDone(mode);
    setShowViewerIntro(false);
    setShowQuickStart(false);
    if (domainThenDetailTimerRef.current != null) {
      window.clearTimeout(domainThenDetailTimerRef.current);
      domainThenDetailTimerRef.current = null;
    }
    // 크롬 코치는 일일 등불 양피지 이후 — 등불 effect / dismiss에서 점화
  }

  function handleModePickerCancel() {
    if (domainThenDetailTimerRef.current != null) {
      window.clearTimeout(domainThenDetailTimerRef.current);
      domainThenDetailTimerRef.current = null;
    }
    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setEntryGate(null);
  }

  /** 공습경보 칩에 처음 다가갈 때만 1회 설명 (투어는 기능 안내에서 수동) */
  const maybeOfferAirRaidCoach = useCallback(() => {
    if (isEconomyViewer) return;
    if (issueUiPausedForLamp) return;
    if (!firstImpression.onboardingReady) return;
    if (entryGate !== null || showModePicker || chromeCoachStep || showFirstVisitTour) return;
    if (!shouldOfferAirRaidCoach()) return;
    if (showAirRaidCoach) return;
    setShowAirRaidCoach(true);
  }, [
    chromeCoachStep,
    entryGate,
    firstImpression.onboardingReady,
    isEconomyViewer,
    issueUiPausedForLamp,
    showAirRaidCoach,
    showFirstVisitTour,
    showModePicker,
  ]);

  return {
    handleModeApply,
    handleCustomLayerApply,
    handleViewerModeChange,
    confirmPurposeJob,
    handleObserveUnlock,
    handleObservePaywallDismiss,
    openModePickerManual,
    openSceneMissionPicker,
    returnToEntryOrbit,
    applySceneMission,
    handleDomainSelect,
    handleModePickerCancel,
    maybeOfferAirRaidCoach,
  };
}
