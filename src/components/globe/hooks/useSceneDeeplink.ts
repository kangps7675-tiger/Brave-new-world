"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import {
  parseSceneFromSearch,
  clearSceneParamsFromUrl,
  type SceneLinkState,
} from "@/lib/sceneLink";
import { trackDeeplinkOpen, trackSceneOpen } from "@/lib/analyticsEvents";

type UseSceneDeeplinkOptions = {
  globeReady: boolean;
  isLoading: boolean;
  loadError: unknown;
  ultraLiteRef: MutableRefObject<boolean>;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  globeRef: RefObject<MapGlobeMethods>;
  applyLayerPrefs: (prefs: LayerPrefs) => void;
  /** 도메인 게이트와 동일 경로로 모드 확정 (handleDomainSelect) */
  selectDomain: (mode: ViewerMode, ultraLite: boolean) => void;
  /** asOf 등 장면 메타 적용 (랭크 스크럽) */
  onSceneApplied?: (scene: SceneLinkState) => void;
};

/**
 * 장면 딥링크(?scene=1&mode=…&lat=…&lng=…&alt=…&layers=…) 적용.
 * 게이트 생략 → 모드 확정 → (레이어 세트) → 카메라 fly 순서로 1회 실행.
 */
export function useSceneDeeplink({
  globeReady,
  isLoading,
  loadError,
  ultraLiteRef,
  layerPrefsLiveRef,
  globeRef,
  applyLayerPrefs,
  selectDomain,
  onSceneApplied,
}: UseSceneDeeplinkOptions): { hasPendingScene: () => boolean } {
  const pendingSceneRef = useRef<SceneLinkState | null>(
    typeof window !== "undefined" ? parseSceneFromSearch(window.location.search) : null,
  );

  const selectDomainRef = useRef(selectDomain);
  selectDomainRef.current = selectDomain;
  const applyLayerPrefsRef = useRef(applyLayerPrefs);
  applyLayerPrefsRef.current = applyLayerPrefs;
  const onSceneAppliedRef = useRef(onSceneApplied);
  onSceneAppliedRef.current = onSceneApplied;

  useEffect(() => {
    if (isLoading || !globeReady || loadError) return;
    const scene = pendingSceneRef.current;
    if (!scene) return;
    pendingSceneRef.current = null;
    clearSceneParamsFromUrl();
    trackDeeplinkOpen(scene.mode);
    /** 지도로 실제 재현된 경우 — 폰 카드(`surface: "card"`)와 구분해 센다 (P2-3) */
    trackSceneOpen("globe", scene.mode);

    selectDomainRef.current(scene.mode, ultraLiteRef.current);
    onSceneAppliedRef.current?.(scene);

    window.setTimeout(() => {
      if (scene.layers && scene.layers.length > 0) {
        const next = { ...layerPrefsLiveRef.current };
        for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
          if (typeof next[key] === "boolean") {
            (next as Record<string, boolean | string>)[key as string] = false;
          }
        }
        for (const key of scene.layers) {
          if (
            key in next &&
            typeof (next as Record<string, unknown>)[key] === "boolean"
          ) {
            (next as Record<string, boolean | string>)[key] = true;
          }
        }
        applyLayerPrefsRef.current(next);
      }
      globeRef.current?.pointOfView(
        { lat: scene.lat, lng: scene.lng, altitude: scene.altitude },
        1400,
      );
    }, 1600);
  }, [globeReady, isLoading, loadError, globeRef, layerPrefsLiveRef, ultraLiteRef]);

  return {
    hasPendingScene: () => pendingSceneRef.current != null,
  };
}
