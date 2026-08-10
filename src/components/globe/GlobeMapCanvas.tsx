"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { shouldMountCesiumHybrid } from "@/lib/cesium/hybridFlags";
import { PausedMapGlobeView, type PausedMapGlobeProps } from "@/components/globe/PausedMapGlobeView";

const CesiumUnderlay = dynamic(
  () =>
    import("@/components/globe/CesiumUnderlay").then((m) => m.CesiumUnderlay),
  { ssr: false },
);

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

/** GlobeDashboard의 지도 캔버스 영역(컨테이너 · PausedMapGlobeView · 로드 에러 배너)을 그대로 감싼 뷰.
 *  MapLibre 앞에 Cesium underlay(방법 B)를 깔아 줌·피치 시 페이드 전환.
 *  저사양 GPU에서는 Cesium을 올리지 않아 MapLibre 바탕이 보이도록 한다. */
export function GlobeMapCanvas({
  containerRef,
  globeRef,
  isPhoneUi,
  isCompactUi,
  loadError,
  containerBackgroundColor,
  onMapReadyForHybrid,
  ultraLite,
  ...mapGlobeProps
}: GlobeMapCanvasProps) {
  /** SSR/첫 페인트는 MapLibre만 — 클라에서 하드웨어 OK일 때만 Cesium 장착 */
  const [hybridOn, setHybridOn] = useState(false);
  const [mapLibreMap, setMapLibreMap] = useState<MapLibreMap | null>(null);
  const [mapLibreOpacity, setMapLibreOpacity] = useState(1);
  const [hybridForceOff, setHybridForceOff] = useState(false);

  useEffect(() => {
    setHybridOn(
      shouldMountCesiumHybrid({
        isPhoneUi,
        ultraLite: Boolean(ultraLite),
      }),
    );
  }, [isPhoneUi, ultraLite]);

  useEffect(() => {
    if (!hybridOn) setMapLibreOpacity(1);
  }, [hybridOn]);

  const onMapReadyFromParent =
    typeof onMapReadyForHybrid === "function"
      ? (onMapReadyForHybrid as (map: MapLibreMap) => void)
      : undefined;

  const handleMapReady = useCallback(
    (map: MapLibreMap) => {
      setMapLibreMap(map);
      onMapReadyFromParent?.(map);
    },
    [onMapReadyFromParent],
  );

  const handleContextLost = useCallback(() => {
    setHybridForceOff(true);
    setHybridOn(false);
    setMapLibreOpacity(1);
  }, []);

  const hybridActive = hybridOn && !hybridForceOff;

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
      {hybridActive ? (
        <CesiumUnderlay
          map={mapLibreMap}
          enabled={hybridActive}
          forceOff={hybridForceOff}
          onMapLibreOpacity={setMapLibreOpacity}
        />
      ) : null}

      <div
        className="absolute inset-0 z-10"
        style={{
          opacity: hybridActive ? mapLibreOpacity : 1,
          transition: "opacity 180ms ease-out",
          backgroundColor: hybridActive ? "transparent" : undefined,
        }}
      >
        {!isPhoneUi ? (
          <PausedMapGlobeView
            ref={globeRef}
            {...mapGlobeProps}
            ultraLite={ultraLite}
            backgroundColor={
              hybridActive ? "transparent" : mapGlobeProps.backgroundColor
            }
            onMapReadyForHybrid={hybridActive ? handleMapReady : onMapReadyFromParent}
            onWebglContextLost={hybridActive ? handleContextLost : undefined}
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
