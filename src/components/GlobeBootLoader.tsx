"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import type { ViinaRenderMeta } from "@/data/geoTypes";
import type { RuntimeConfig } from "@/lib/runtimeConfig.types";
import { initRuntimeConfig } from "@/lib/runtimeConfig.client";
import {
  BUNDLE_PROGRESS_CAP,
  combineBootProgress,
} from "@/lib/bootLoadingProgress";
import { GlobeLoadingScreen } from "@/components/GlobeLoadingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { prefetchUkraineControl } from "@/lib/viinaPrefetch";
import { prefetchDisputeHatchPaths } from "@/lib/disputeHatchPrefetch";
import { prefetchNeptun } from "@/lib/neptunPrefetch";
import { ModePickerOverlay } from "@/components/ModePickerOverlay";
import type { GlobeDashboardProps } from "@/components/GlobeDashboard";
import { applyViewerMode } from "@/lib/viewerChrome";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import {
  applyViewPackages,
  resolveMergedViewConfig,
  shouldShowModePicker,
  type MergedViewConfig,
  type ViewerMode,
  type ViewTheaterChoice,
} from "@/lib/viewPackages";

type DashboardComponent = ComponentType<GlobeDashboardProps>;

const PICKER_LOADING_FINISH_MS = 1400;
const LOADING_FADE_MS = 720;
/** onBootReady 미수신 시 로딩 강제 해제 */
const DASHBOARD_BOOT_TIMEOUT_MS = 45_000;

export function GlobeBootLoader({
  viinaMeta,
  runtimeConfig,
}: {
  viinaMeta: ViinaRenderMeta;
  runtimeConfig: RuntimeConfig;
}) {
  initRuntimeConfig(runtimeConfig);

  useEffect(() => {
    if (viinaMeta.available) {
      void prefetchUkraineControl();
    }
    void prefetchDisputeHatchPaths("overview");
    void prefetchDisputeHatchPaths("detail");
    void prefetchNeptun();
  }, [viinaMeta.available]);

  const needsPickerRef = useRef(shouldShowModePicker());

  const [Dashboard, setDashboard] = useState<DashboardComponent | null>(null);
  const [bundleProgress, setBundleProgress] = useState(0);
  const [dashboardProgress, setDashboardProgress] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [pickerDone, setPickerDone] = useState(() => !needsPickerRef.current);
  /** 패키지 선택 화면 표시 가능 (초기 로딩 페이드 완료 후) */
  const [loadingDismissed, setLoadingDismissed] = useState(() => !needsPickerRef.current);
  const [pickerLoadingProgress, setPickerLoadingProgress] = useState(0);
  const [pickerLoadingAnimating, setPickerLoadingAnimating] = useState(false);
  const [viewConfig, setViewConfig] = useState<MergedViewConfig>(() => resolveMergedViewConfig());

  const prePickerOverlayDoneRef = useRef(!needsPickerRef.current);
  const dashboardOverlayDoneRef = useRef(false);
  const bootReadyRef = useRef(false);
  const pickerLoadingStartedRef = useRef(false);
  const dashboardBootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/components/GlobeDashboard").then((mod) => {
      if (!cancelled) setDashboard(() => mod.GlobeDashboard);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Dashboard) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 9000);
      setBundleProgress(Math.min(BUNDLE_PROGRESS_CAP, t * BUNDLE_PROGRESS_CAP + 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [Dashboard]);

  const dismissLoadingOverlay = useCallback((onHidden?: () => void) => {
    setFading(true);
    window.setTimeout(() => {
      setOverlayVisible(false);
      setFading(false);
      onHidden?.();
    }, LOADING_FADE_MS);
  }, []);

  /** 패키지 선택 전 초기 로딩 종료 — dashboard 부트와 별도 */
  const finishPrePickerLoading = useCallback(() => {
    if (prePickerOverlayDoneRef.current) return;
    prePickerOverlayDoneRef.current = true;
    dismissLoadingOverlay(() => setLoadingDismissed(true));
  }, [dismissLoadingOverlay]);

  /** 대시보드 데이터·지구본 준비 완료 후 최종 로딩 종료 */
  const finishDashboardLoading = useCallback(() => {
    if (dashboardOverlayDoneRef.current) return;
    dashboardOverlayDoneRef.current = true;
    if (dashboardBootTimerRef.current != null) {
      clearTimeout(dashboardBootTimerRef.current);
      dashboardBootTimerRef.current = null;
    }
    dismissLoadingOverlay();
  }, [dismissLoadingOverlay]);

  const handleBootReady = useCallback(() => {
    bootReadyRef.current = true;
    finishDashboardLoading();
  }, [finishDashboardLoading]);

  const beginDashboardLoading = useCallback(() => {
    dashboardOverlayDoneRef.current = false;
    bootReadyRef.current = false;
    setDashboardProgress(0);
    setOverlayVisible(true);
    setFading(false);

    if (dashboardBootTimerRef.current != null) {
      clearTimeout(dashboardBootTimerRef.current);
    }
    dashboardBootTimerRef.current = setTimeout(() => {
      finishDashboardLoading();
    }, DASHBOARD_BOOT_TIMEOUT_MS);
  }, [finishDashboardLoading]);

  useEffect(() => {
    return () => {
      if (dashboardBootTimerRef.current != null) {
        clearTimeout(dashboardBootTimerRef.current);
      }
    };
  }, []);

  /** 신규 유저: 번들 로드 후 로딩 100% → 페이드 → 패키지 선택 */
  useEffect(() => {
    if (!Dashboard || pickerDone || loadingDismissed || pickerLoadingStartedRef.current) return;
    pickerLoadingStartedRef.current = true;
    setPickerLoadingAnimating(true);

    const startPct = combineBootProgress(BUNDLE_PROGRESS_CAP, 0, true);
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / PICKER_LOADING_FINISH_MS);
      const eased = 1 - (1 - t) ** 2;
      setPickerLoadingProgress(Math.round(startPct + (100 - startPct) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      finishPrePickerLoading();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [Dashboard, finishPrePickerLoading, loadingDismissed, pickerDone]);

  const handlePickerConfirm = useCallback(
    (mode: ViewerMode, theater: ViewTheaterChoice, economyHub: EconomyHubChoice) => {
      const { merged } = applyViewerMode(mode, theater, economyHub);
      setViewConfig(merged);
      setPickerDone(true);
      beginDashboardLoading();
    },
    [beginDashboardLoading],
  );

  const handlePickerCustom = useCallback(() => {
    const merged = applyViewPackages(["custom"], "auto");
    setViewConfig(merged);
    setPickerDone(true);
    beginDashboardLoading();
  }, [beginDashboardLoading]);

  const returningUserProgress = combineBootProgress(
    bundleProgress,
    dashboardProgress,
    Dashboard !== null,
  );

  const displayProgress =
    !pickerDone && !loadingDismissed
      ? pickerLoadingAnimating
        ? pickerLoadingProgress
        : returningUserProgress
      : returningUserProgress;

  const showPicker = !pickerDone && loadingDismissed;
  const showLoadingOverlay = overlayVisible;
  /** 패키지 완료(또는 기존 유저) 후 대시보드 마운트 — 로딩 뒤 상호작용 */
  const mountDashboard = pickerDone && Dashboard !== null;

  /**
   * 모드 피커가 꺼진 기본 경로에서는 beginDashboardLoading()이 호출되지 않아
   * 45초 failsafe가 안 걸렸고, globeReady/isLoading이 안 풀리면 스플래시가 영구 고착됐다.
   * 대시보드 마운트 시 타이머가 없으면 여기서 보강한다.
   */
  useEffect(() => {
    if (!mountDashboard) return;
    if (dashboardOverlayDoneRef.current) return;
    if (dashboardBootTimerRef.current != null) return;
    dashboardBootTimerRef.current = setTimeout(() => {
      finishDashboardLoading();
    }, DASHBOARD_BOOT_TIMEOUT_MS);
  }, [finishDashboardLoading, mountDashboard]);

  return (
    <ErrorBoundary name="globe-boot">
      {mountDashboard ? (
        <Dashboard
          viinaMeta={viinaMeta}
          initialViewConfig={viewConfig}
          onBootProgress={setDashboardProgress}
          onBootReady={handleBootReady}
        />
      ) : null}
      {showPicker ? (
        <ModePickerOverlay onConfirm={handlePickerConfirm} onCustom={handlePickerCustom} />
      ) : null}
      {showLoadingOverlay ? (
        <GlobeLoadingScreen progress={displayProgress} fading={fading} />
      ) : null}
    </ErrorBoundary>
  );
}
