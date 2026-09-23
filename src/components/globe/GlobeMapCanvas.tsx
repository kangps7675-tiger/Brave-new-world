"use client";

import type { Ref, RefObject } from "react";
import dynamic from "next/dynamic";
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { PausedMapGlobeView, type PausedMapGlobeProps } from "@/components/globe/PausedMapGlobeView";
import { importWithChunkRetry } from "@/lib/importWithChunkRetry";
import type { CesiumEntitySelection, CesiumGlobeHandle } from "@/components/globe/CesiumSatelliteGlobe";

const CesiumSatelliteGlobe = dynamic(
  importWithChunkRetry(() =>
    import("@/components/globe/CesiumSatelliteGlobe").then((m) => m.CesiumSatelliteGlobe),
  ),
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
  /** 항적(AIS/ADS-B) — Cesium 위성 모드 전용, MapLibre 쪽엔 안 넘김 */
  aisVessels?: AisVessel[];
  disguisedVessels?: AisVessel[];
  milAircraft?: MilitaryAircraft[];
  civAircraft?: MilitaryAircraft[];
  showAis?: boolean;
  /** AIS 중 군함만 — showAis가 켜져 있을 때의 세부 필터 */
  showAisMilitary?: boolean;
  /** AIS 중 상선·민간만 — showAis가 켜져 있을 때의 세부 필터 */
  showAisCommercial?: boolean;
  showDisguisedVessels?: boolean;
  showMilitaryActivity?: boolean;
  showAirTraffic?: boolean;
  /** Cesium 카메라 제어(flyTo) — 관측 모드에서만 유효, GlobeDashboard가 보관 */
  cesiumRef?: Ref<CesiumGlobeHandle>;
  /** Cesium viewer가 flyTo를 받을 수 있게 된 시점 */
  onCesiumReady?: () => void;
  /** 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용 */
  onSelectCesiumEntity?: (selection: CesiumEntitySelection) => void;
};

/**
 * GlobeDashboard 지도 캔버스.
 * - 지정학/지경학/역사(MapLibre): AIS/ADS-B 없음 — 해당 레이어를 켜면 관측(Cesium)으로 전환.
 * - 관측(위성): CesiumJS. AIS/ADS-B는 전부 Cesium billboard (CesiumSatelliteGlobe.tsx).
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
  aisVessels,
  disguisedVessels,
  milAircraft,
  civAircraft,
  showAis,
  showAisMilitary,
  showAisCommercial,
  showDisguisedVessels,
  showMilitaryActivity,
  showAirTraffic,
  cesiumRef,
  onCesiumReady,
  onSelectCesiumEntity,
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
        {!isPhoneUi && satelliteMode ? (
          <CesiumSatelliteGlobe
            ref={cesiumRef}
            aisVessels={aisVessels}
            disguisedVessels={disguisedVessels}
            milAircraft={milAircraft}
            civAircraft={civAircraft}
            showAis={showAis}
            showAisMilitary={showAisMilitary}
            showAisCommercial={showAisCommercial}
            showDisguisedVessels={showDisguisedVessels}
            showMilitaryActivity={showMilitaryActivity}
            showAirTraffic={showAirTraffic}
            onReady={onCesiumReady}
            onSelectEntity={onSelectCesiumEntity}
          />
        ) : null}
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
