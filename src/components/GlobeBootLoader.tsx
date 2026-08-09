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
import { UnsupportedBrowserNotice } from "@/components/UnsupportedBrowserNotice";
import { detectWebglSupport, type WebglSupport } from "@/lib/webglSupport";
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

/**
 * P1-2: 피커 진입 전 진행률 애니메이션의 **상한**.
 *
 * 예전에는 이 값이 고정 지속시간이었다 — 번들이 이미 로드된 뒤에도
 * 1.4초를 꽉 채워 애니메이션을 돌렸다. 준비가 끝났는데 기다리게 하는 건
 * 도허티 임계 관점에서 순수 손실이다. 이제 Dashboard가 준비되면 즉시
 * 종료하고, 아직이면 최대 이만큼만 기다린다.
 */
const PICKER_LOADING_MAX_MS = 1400;
/** 준비 완료 후 최소한의 시각적 연결감만 남긴 페이드 (720 → 250) */
const LOADING_FADE_MS = 250;
/** onBootReady 미수신 시 로딩 강제 해제 */
const DASHBOARD_BOOT_TIMEOUT_MS = 45_000;
/**
 * 부팅이 이 시간을 넘기면 침묵하지 않고 상태를 알린다.
 * 45초를 아무 말 없이 채우면 사용자는 고장으로 판단하고 떠난다.
 */
const SLOW_BOOT_NOTICE_MS = 8_000;

export function GlobeBootLoader({
  viinaMeta,
  runtimeConfig,
}: {
  viinaMeta: ViinaRenderMeta;
  runtimeConfig: RuntimeConfig;
}) {
  initRuntimeConfig(runtimeConfig);

  useEffect(() => {
    // 지도 렌더가 불가능하면 프리페치도 낭비다 — 판정 후에만 시작.
    if (typeof document !== "undefined" && detectWebglSupport() !== "webgl2") return;
    if (viinaMeta.available) {
      void prefetchUkraineControl();
    }
    void prefetchDisputeHatchPaths("overview");
    void prefetchDisputeHatchPaths("detail");
    void prefetchNeptun();
  }, [viinaMeta.available]);

  /**
   * WebGL2 감지 (P0-1) — 지도 엔진(maplibre-gl v5)의 하드 요구사항.
   * SSR/hydration 불일치를 피하려고 초기값은 null, 마운트 후 1회 판정한다.
   * 판정 전에는 기존 로딩 화면이 그대로 보이므로 깜빡임이 없다.
   */
  const [webglSupport, setWebglSupport] = useState<WebglSupport | null>(null);
  useEffect(() => {
    setWebglSupport(detectWebglSupport());
  }, []);
  const mapUnsupported = webglSupport != null && webglSupport !== "webgl2";

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
  /** 부팅이 8초를 넘겼는가 — 침묵 대신 상태 고지 (P1-2) */
  const [slowBoot, setSlowBoot] = useState(false);
  const [viewConfig, setViewConfig] = useState<MergedViewConfig>(() => resolveMergedViewConfig());

  const prePickerOverlayDoneRef = useRef(!needsPickerRef.current);
  const dashboardOverlayDoneRef = useRef(false);
  const bootReadyRef = useRef(false);
  const pickerLoadingStartedRef = useRef(false);
  const dashboardBootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 지도를 못 그리는 환경에서는 8천 줄짜리 대시보드 청크를 받을 이유가 없다.
    if (webglSupport == null || mapUnsupported) return;
    let cancelled = false;
    void import("@/components/GlobeDashboard").then((mod) => {
      if (!cancelled) setDashboard(() => mod.GlobeDashboard);
    });
    return () => {
      cancelled = true;
    };
  }, [mapUnsupported, webglSupport]);

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
    setDashboardProgress(100);
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

  /**
   * P1-2: 45초 failsafe까지 아무 말 없이 두지 않는다.
   * 오버레이가 사라지면 타이머도 멈춘다.
   */
  useEffect(() => {
    if (!overlayVisible) {
      setSlowBoot(false);
      return;
    }
    const id = window.setTimeout(() => setSlowBoot(true), SLOW_BOOT_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [overlayVisible]);

  /** 신규 유저: 번들 로드 후 로딩 100% → 페이드 → 패키지 선택 */
  useEffect(() => {
    if (!Dashboard || pickerDone || loadingDismissed || pickerLoadingStartedRef.current) return;
    pickerLoadingStartedRef.current = true;
    setPickerLoadingAnimating(true);

    const startPct = combineBootProgress(BUNDLE_PROGRESS_CAP, 0, true);
    const start = performance.now();
    let raf = 0;

    /**
     * P1-2: 이 이펙트는 Dashboard가 이미 준비된 뒤에 시작된다(가드 조건 참조).
     * 즉 여기서 기다리는 시간은 **전부 장식**이다. 100%까지 훑는 짧은 모션만
     * 남기고(진행률이 순간이동하면 오히려 어색하다) 상한을 넘기지 않는다.
     * 240ms면 눈이 변화를 따라가기에 충분하고 도허티 임계 안에 들어온다.
     */
    const durationMs = Math.min(PICKER_LOADING_MAX_MS, 240);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
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

  /**
   * WebGL2 없음 — 지도를 그릴 수 없다. 검은 화면 대신 이유·해결책·텍스트 브리핑.
   * 로딩 오버레이/피커보다 먼저 반환해 스플래시 고착을 원천 차단한다.
   */
  if (webglSupport != null && webglSupport !== "webgl2") {
    return (
      <ErrorBoundary name="globe-boot-unsupported">
        <UnsupportedBrowserNotice support={webglSupport} />
      </ErrorBoundary>
    );
  }

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
        <GlobeLoadingScreen progress={displayProgress} fading={fading} slow={slowBoot} />
      ) : null}
    </ErrorBoundary>
  );
}
