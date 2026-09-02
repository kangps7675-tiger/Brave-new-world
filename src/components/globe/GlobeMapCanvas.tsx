"use client";

import type { RefObject } from "react";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { PausedMapGlobeView, type PausedMapGlobeProps } from "@/components/globe/PausedMapGlobeView";

export type GlobeMapCanvasProps = Omit<PausedMapGlobeProps, "ref"> & {
  containerRef: RefObject<HTMLDivElement>;
  globeRef: RefObject<MapGlobeMethods>;
  isPhoneUi: boolean;
  isCompactUi: boolean;
  loadError: string | null;
  /** globeTextures.backgroundColor 그대로 — PausedMapGlobeView 자체의 backgroundColor prop과는
   *  별개로 컨테이너 div 배경에도 동일 값을 적용하기 위해 명시적으로 전달받음. */
  containerBackgroundColor: string;
};

/**
 * GlobeDashboard의 지도 캔버스 영역(컨테이너 · PausedMapGlobeView · 로드 에러 배너).
 * 인텔·지형 모두 MapLibre 단일 WebGL — 벡터 베이스(+ 지형 고줌 시 Esri 위성 래스터 underlay).
 * 지형 모드 3D 건물은 Cesium OSM Buildings(3D Tiles, deck.gl) — 세슘 뷰어 없음.
 * Ion 토큰이 없으면 OpenFreeMap fill-extrusion 폴백.
 */
export function GlobeMapCanvas({
  containerRef,
  globeRef,
  isPhoneUi,
  isCompactUi,
  loadError,
  containerBackgroundColor,
  ultraLite,
  basemapMode,
  ...mapGlobeProps
}: GlobeMapCanvasProps) {
  return (
    <div
      ref={containerRef}
      className="globe-shell relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: containerBackgroundColor,
        transform: isCompactUi
          ? undefined
          : "translateY(var(--hover-nav-base-height, 0px))",
        transition: isCompactUi ? undefined : "transform 180ms ease",
      }}
    >
      <div className="absolute inset-0 z-10">
        {!isPhoneUi ? (
          <PausedMapGlobeView
            {...mapGlobeProps}
            basemapMode={basemapMode}
            ultraLite={ultraLite}
            ref={globeRef}
          />
        ) : null}
        {loadError && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex justify-center sm:inset-x-auto sm:bottom-6 sm:max-w-md">
            <LoadErrorBanner message={loadError} compact />
          </div>
        )}
      </div>
    </div>
  );
}
