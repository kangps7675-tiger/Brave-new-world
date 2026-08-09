"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { isCesiumHybridEnabled } from "@/lib/cesium/hybridFlags";
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
 *  MapLibre 앞에 Cesium underlay(방법 B)를 깔아 줌·피치 시 페이드 전환. */
export function GlobeMapCanvas({
  containerRef,
  globeRef,
  isPhoneUi,
  isCompactUi,
  loadError,
  containerBackgroundColor,
  onMapReadyForHybrid,
  ...mapGlobeProps
}: GlobeMapCanvasProps) {
  const hybridOn = !isPhoneUi && isCesiumHybridEnabled();
  const [mapLibreMap, setMapLibreMap] = useState<MapLibreMap | null>(null);
  const [mapLibreOpacity, setMapLibreOpacity] = useState(1);
  const [hybridForceOff, setHybridForceOff] = useState(false);

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
  }, []);

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
      {hybridOn ? (
        <CesiumUnderlay
          map={mapLibreMap}
          enabled={hybridOn}
          forceOff={hybridForceOff}
          onMapLibreOpacity={setMapLibreOpacity}
        />
      ) : null}

      <div
        className="absolute inset-0 z-10"
        style={{
          opacity: hybridOn ? mapLibreOpacity : 1,
          transition: "opacity 180ms ease-out",
          // 투명 배경으로 Cesium이 MapLibre 글로브 틈으로 비침
          backgroundColor: hybridOn ? "transparent" : undefined,
        }}
      >
        {!isPhoneUi ? (
          <PausedMapGlobeView
            ref={globeRef}
            {...mapGlobeProps}
            backgroundColor={
              hybridOn ? "transparent" : mapGlobeProps.backgroundColor
            }
            onMapReadyForHybrid={hybridOn ? handleMapReady : onMapReadyFromParent}
            onWebglContextLost={hybridOn ? handleContextLost : undefined}
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
