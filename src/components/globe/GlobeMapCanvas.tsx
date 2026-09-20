"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { PausedMapGlobeView, type PausedMapGlobeProps } from "@/components/globe/PausedMapGlobeView";

const CesiumSatelliteGlobe = dynamic(
  () =>
    import("@/components/globe/CesiumSatelliteGlobe").then((m) => m.CesiumSatelliteGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#02040a] text-sm text-sky-100/70">
        Loading Cesium…
      </div>
    ),
  },
);

export type GlobeMapCanvasProps = Omit<PausedMapGlobeProps, "ref"> & {
  containerRef: RefObject<HTMLDivElement>;
  globeRef: RefObject<MapGlobeMethods>;
  isPhoneUi: boolean;
  isCompactUi: boolean;
  loadError: string | null;
  /** globeTextures.backgroundColor — 컨테이너 div 배경 */
  containerBackgroundColor: string;
  /** 제3 위성 모드 — MapLibre 대신 Cesium (GEV식) */
  satelliteMode?: boolean;
};

/**
 * GlobeDashboard 지도 캔버스.
 * - 지정학/지경학: MapLibre
 * - 프리미엄: CesiumJS (Esri imagery · optional Ion photoreal)
 *   ADS-B/AIS/시세 prefs는 켜 두고, 글로브는 Cesium (항적 엔티티·LIVEUA/X는 후속)
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
      className="globe-shell relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: satelliteMode ? "#02040a" : containerBackgroundColor,
        transform: isCompactUi
          ? undefined
          : "translateY(var(--hover-nav-base-height, 0px))",
        transition: isCompactUi ? undefined : "transform 180ms ease",
      }}
    >
      <div className="absolute inset-0 z-10">
        {!isPhoneUi && satelliteMode ? <CesiumSatelliteGlobe /> : null}
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
