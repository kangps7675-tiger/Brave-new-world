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
  /** globeTextures.backgroundColor — 컨테이너 div 배경 */
  containerBackgroundColor: string;
  /** 위성 모드는 막혀 있다(`SATELLITE_ENABLED=false`). 항상 false여야 한다. */
  satelliteMode?: boolean;
};

/**
 * GlobeDashboard 지도 캔버스 — MapLibre 지구본만 그린다(위성/세슘 뷰어는 제거됨).
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
  satelliteMode = false,
  ...mapGlobeProps
}: GlobeMapCanvasProps) {
  return (
    <div
      ref={containerRef}
      className="globe-shell relative z-0 isolate h-full w-full overflow-hidden"
      style={{
        backgroundColor: satelliteMode ? "#02040a" : containerBackgroundColor,
        transform: isCompactUi
          ? undefined
          : "translateY(var(--hover-nav-base-height, 0px))",
        transition: isCompactUi ? undefined : "transform 180ms ease",
      }}
    >
      <div className="absolute inset-0 z-0">
        {!isPhoneUi && !satelliteMode ? (
          <PausedMapGlobeView
            {...mapGlobeProps}
            basemapMode={basemapMode}
            ultraLite={ultraLite}
            ref={globeRef}
          />
        ) : null}
        {loadError && !satelliteMode ? (
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex justify-center sm:inset-x-auto sm:bottom-6 sm:max-w-md">
            <LoadErrorBanner message={loadError} compact />
          </div>
        ) : null}
      </div>
    </div>
  );
}
