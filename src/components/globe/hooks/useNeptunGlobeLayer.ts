"use client";

import { useMemo, type MutableRefObject } from "react";
import { useNeptunStream } from "@/hooks/useNeptunStream";
import { useNeptunPaths } from "@/components/globe/hooks/useNeptunPaths";
import {
  filterNeptunThreatsForViewport,
  filterNeptunThreatsInOpsBox,
  getNeptunRenderMode,
  NEPTUN_ARCHIVED_MAX_BY_TIER,
  NEPTUN_THREAT_MAX_BY_TIER,
  neptunShowsMarkers,
  neptunShowsPaths,
  isNeptunTheaterInView,
} from "@/lib/neptunLod";
import type { NeptunHtmlMarker, NeptunImpactHtmlMarker } from "@/components/globe/types";
import type { GlobeLodTier } from "@/lib/globeLod";
import { isCenterInView, VIEWPORT_RADIUS_BY_TIER } from "@/lib/viewportCull";

type ViewState = { lat: number; lng: number; altitude: number };

type UseNeptunGlobeLayerOptions = {
  showNeptun: boolean;
  showNeptunPreviousTrails: boolean;
  showUkraineControl: boolean;
  /** 관측(Cesium) — 전선 OFF여도 우크라 ops-box 위협을 전역에서 샘플 표시 */
  forceNeptunTheater?: boolean;
  /**
   * MapLibre 경로·HTML 배지. 기본 false — 드론/미사일/폭탄은 Cesium 공중 빌보드만.
   * (지정학 글로브에서는 숨기고, 관측 모드 entity로만 본다)
   */
  maplibreNeptunVisuals?: boolean;
  layerViewState: ViewState;
  globeTier: GlobeLodTier;
  isCameraMoving: boolean;
  immediateUntilRef: MutableRefObject<number>;
};

/**
 * NEPTUN 스트림·뷰포트 필터·궤적·HTML 마커 — GlobeDashboard에서 추출.
 */
export function useNeptunGlobeLayer({
  showNeptun,
  showNeptunPreviousTrails,
  showUkraineControl,
  forceNeptunTheater = false,
  maplibreNeptunVisuals = false,
  layerViewState,
  globeTier,
  isCameraMoving,
  immediateUntilRef,
}: UseNeptunGlobeLayerOptions) {
  /** 공습경보 배너용 — 카메라·레이어와 무관하게 상시 수신 (글로브 마커는 별도 게이트) */
  const neptunFetchEnabled = true;
  const {
    threats: neptunThreats,
    archivedThreats: neptunArchivedThreats,
    alerts: neptunAlerts,
    live: neptunLive,
    status: neptunStatus,
    error: neptunError,
    serverTime: neptunServerTime,
    alertCount: neptunAlertCount,
    impactFlashes: neptunImpactFlashes,
  } = useNeptunStream(neptunFetchEnabled, { pausePublish: isCameraMoving });

  const theaterGate = showUkraineControl || forceNeptunTheater;

  const neptunInTheater = useMemo(
    () => theaterGate || isNeptunTheaterInView(layerViewState, globeTier),
    [globeTier, layerViewState, theaterGate],
  );

  const neptunRenderMode = useMemo(
    () => getNeptunRenderMode(globeTier, neptunInTheater, showNeptun, theaterGate),
    [globeTier, neptunInTheater, showNeptun, theaterGate],
  );

  const visibleNeptunThreats = useMemo(() => {
    if (!showNeptun || !neptunShowsMarkers(neptunRenderMode)) return [];
    const max = NEPTUN_THREAT_MAX_BY_TIER[globeTier];
    if (
      theaterGate &&
      (globeTier === "global" || globeTier === "continent")
    ) {
      return filterNeptunThreatsInOpsBox(neptunThreats, max);
    }
    return filterNeptunThreatsForViewport(neptunThreats, layerViewState, globeTier, max);
  }, [
    globeTier,
    layerViewState,
    neptunRenderMode,
    neptunThreats,
    showNeptun,
    theaterGate,
  ]);

  const visibleNeptunArchived = useMemo(() => {
    if (!showNeptun || !showNeptunPreviousTrails || !neptunShowsPaths(neptunRenderMode)) {
      return [];
    }
    const max = NEPTUN_ARCHIVED_MAX_BY_TIER[globeTier];
    if (
      theaterGate &&
      (globeTier === "global" || globeTier === "continent")
    ) {
      return filterNeptunThreatsInOpsBox(neptunArchivedThreats, max);
    }
    return filterNeptunThreatsForViewport(
      neptunArchivedThreats,
      layerViewState,
      globeTier,
      max,
    );
  }, [
    globeTier,
    layerViewState,
    neptunArchivedThreats,
    neptunRenderMode,
    showNeptun,
    showNeptunPreviousTrails,
    theaterGate,
  ]);

  const maplibreShowNeptun = showNeptun && maplibreNeptunVisuals;

  const { neptunPathElevation, stableNeptunLivePaths, stableNeptunArchivedPaths } = useNeptunPaths({
    neptunRenderMode,
    showNeptun: maplibreShowNeptun,
    showNeptunPreviousTrails,
    visibleNeptunThreats,
    visibleNeptunArchived,
    isCameraMoving,
    immediateUntilRef,
  });

  const neptunHtmlMarkers = useMemo<NeptunHtmlMarker[]>(() => {
    if (!maplibreShowNeptun || !neptunShowsMarkers(neptunRenderMode)) return [];
    return visibleNeptunThreats.map((threat) => ({
      ...threat,
      lat: threat.predictedLat,
      lng: threat.predictedLon,
      markerId: `neptun-html-${threat.id}`,
      displayKind: "neptun-html" as const,
    }));
  }, [maplibreShowNeptun, neptunRenderMode, visibleNeptunThreats]);

  const neptunImpactHtmlMarkers = useMemo<NeptunImpactHtmlMarker[]>(
    () =>
      maplibreShowNeptun
        ? neptunImpactFlashes.map((flash) => ({
            ...flash,
            lat: flash.lat,
            lng: flash.lng,
            markerId: flash.id,
            displayKind: "neptun-impact" as const,
          }))
        : [],
    [maplibreShowNeptun, neptunImpactFlashes],
  );

  const neptunImpactInView = useMemo(() => {
    if (!showNeptun || neptunImpactFlashes.length === 0) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeTier];
    return neptunImpactFlashes.some((flash) =>
      isCenterInView(flash, layerViewState, radiusDeg),
    );
  }, [globeTier, layerViewState, neptunImpactFlashes, showNeptun]);

  return {
    neptunFetchEnabled,
    neptunThreats,
    neptunArchivedThreats,
    neptunAlerts,
    neptunLive,
    neptunStatus,
    neptunError,
    neptunServerTime,
    neptunAlertCount,
    neptunImpactFlashes,
    neptunInTheater,
    neptunRenderMode,
    visibleNeptunThreats,
    visibleNeptunArchived,
    neptunPathElevation,
    stableNeptunLivePaths,
    stableNeptunArchivedPaths,
    neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
    neptunImpactInView,
  };
}
