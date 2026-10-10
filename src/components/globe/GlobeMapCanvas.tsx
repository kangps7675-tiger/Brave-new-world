"use client";

import type { Ref, RefObject } from "react";
import dynamic from "next/dynamic";
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { PausedMapGlobeView, type PausedMapGlobeProps } from "@/components/globe/PausedMapGlobeView";
import { importWithChunkRetry } from "@/lib/importWithChunkRetry";
import type { CesiumEntitySelection, CesiumGlobeHandle } from "@/components/globe/CesiumSatelliteGlobe";
import type { CesiumAlertItem } from "@/lib/cesiumAlerts";

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
  /** NEPTUN — 관측(Cesium) 모드 UAV·미사일 */
  neptunThreats?: import("@/lib/neptun").NeptunLiveThreat[];
  showNeptun?: boolean;
  /** Cesium 카메라 제어(flyTo) — 관측 모드에서만 유효, GlobeDashboard가 보관 */
  cesiumRef?: Ref<CesiumGlobeHandle>;
  /** Cesium viewer가 flyTo를 받을 수 있게 된 시점 */
  onCesiumReady?: () => void;
  /** Cesium 카메라 idle — OpenSky densify용 중심·고도 */
  onCesiumCameraIdle?: (view: {
    lat: number;
    lng: number;
    altitude: number;
    heightM: number;
  }) => void;
  /** 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용 */
  onSelectCesiumEntity?: (selection: CesiumEntitySelection) => void;
  /** 유저 드래그로 추적 카메라 해제 */
  onCesiumUserBreakFollow?: () => void;
  /** 세슘 알림 핀 */
  alertPins?: CesiumAlertItem[];
  /** 속보 공간 — 휠 줌아웃 상한(m). 없으면 제한 없음 */
  cameraCeilingM?: number | null;
  onSelectCesiumAlert?: (item: CesiumAlertItem) => void;
  /** 관측 모드 — 지정학과 동일 UKMTO/NAVAREA 빗금 + 초크 링 */
  ukmtoIncidents?: import("@/lib/ukmtoHatch").UkmtoIncidentPoint[];
  navareaFeatures?: import("@/lib/navareaHatch").NavareaFeaturePoint[];
  chokeRings?: import("@/lib/cesiumMaritimeOverlays").CesiumChokeRingInput[];
  straitOverlaySegments?: import("@/lib/cesiumMaritimeOverlays").MaritimeOverlaySegment[];
  straitLabels?: import("@/lib/cesiumStraitCallouts").StraitLabelEntity[];
  straitPorts?: import("@/lib/cesiumStraitOverlays").StraitPortMarker[];
  liveuaPins?: Array<{
    id: string;
    title: string;
    lat: number;
    lng: number;
    imageUrl?: string;
    publishedAt?: string | null;
  }>;
  focusedLiveuaId?: string | null;
  /** 워치보드 DeskFocus — 스포트라이트·등급 핀·PIR 슬롯 디밍 */
  deskFocus?: import("@/lib/intelContract/deskFocus").DeskFocus | null;
  liveuaStrikes?: import("@/lib/cesiumLiveuaStrikes").CesiumLiveuaStrikePoint[];
  liveuaGround?: import("@/lib/cesiumLiveuaGround").CesiumLiveuaGroundPoint[];
  onSelectLiveuaPin?: (id: string) => void;
  onPickGroundPoint?: (point: { lat: number; lng: number }) => void;
  controlGeoJson?: GeoJSON.FeatureCollection | null;
  firmsFires?: import("@/lib/cesiumFirmsFires").CesiumFirmsFirePoint[];
  showFirmsFires?: boolean;
  missileLaunches?: import("@/lib/cesiumMissileLaunches").CesiumMissileLaunchPoint[];
  showMissileLaunches?: boolean;
  neptunAlerts?: import("@/lib/neptun").NeptunAlerts | null;
  showAirRaidZones?: boolean;
  placeLabels?: import("@/lib/cesiumPlaceLabels").CesiumPlaceLabel[];
  placeLabelLang?: import("@/lib/layerPrefs").LabelLanguage;
  showPlaceLabels?: boolean;
  conflictEvents?: import("@/lib/cesiumConflictEvents").CesiumConflictEventPoint[];
  showConflictEvents?: boolean;
  onSelectConflictEvent?: (
    event: import("@/lib/cesiumConflictEvents").CesiumConflictEventPoint,
  ) => void;
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
  neptunThreats,
  showNeptun,
  cesiumRef,
  onCesiumReady,
  onCesiumCameraIdle,
  onSelectCesiumEntity,
  onCesiumUserBreakFollow,
  alertPins,
  cameraCeilingM,
  onSelectCesiumAlert,
  ukmtoIncidents,
  navareaFeatures,
  chokeRings,
  straitOverlaySegments,
  straitLabels,
  straitPorts,
  liveuaPins,
  focusedLiveuaId,
  deskFocus,
  liveuaStrikes,
  liveuaGround,
  onSelectLiveuaPin,
  onPickGroundPoint,
  controlGeoJson,
  firmsFires,
  showFirmsFires,
  missileLaunches,
  showMissileLaunches,
  neptunAlerts: cesiumNeptunAlerts,
  showAirRaidZones,
  placeLabels,
  placeLabelLang,
  showPlaceLabels,
  conflictEvents,
  showConflictEvents,
  onSelectConflictEvent,
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
        {!isPhoneUi && satelliteMode ? (
          <CesiumSatelliteGlobe
            ref={cesiumRef}
            handleRef={
              cesiumRef && typeof cesiumRef === "object" && "current" in cesiumRef
                ? cesiumRef
                : undefined
            }
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
            neptunThreats={neptunThreats}
            showNeptun={showNeptun}
            onReady={onCesiumReady}
            onCameraIdle={onCesiumCameraIdle}
            onSelectEntity={onSelectCesiumEntity}
            onUserBreakFollow={onCesiumUserBreakFollow}
            alertPins={alertPins}
            cameraCeilingM={cameraCeilingM}
            onSelectAlert={onSelectCesiumAlert}
            ukmtoIncidents={ukmtoIncidents}
            navareaFeatures={navareaFeatures}
            chokeRings={chokeRings}
            straitOverlaySegments={straitOverlaySegments}
            straitLabels={straitLabels}
            straitPorts={straitPorts}
            liveuaPins={liveuaPins}
            focusedLiveuaId={focusedLiveuaId}
            deskFocus={deskFocus}
            liveuaStrikes={liveuaStrikes}
            liveuaGround={liveuaGround}
            onSelectLiveuaPin={onSelectLiveuaPin}
            onPickGroundPoint={onPickGroundPoint}
            controlGeoJson={controlGeoJson}
            firmsFires={firmsFires}
            showFirmsFires={showFirmsFires}
            missileLaunches={missileLaunches}
            showMissileLaunches={showMissileLaunches}
            neptunAlerts={cesiumNeptunAlerts}
            showAirRaidZones={showAirRaidZones}
            placeLabels={placeLabels}
            placeLabelLang={placeLabelLang}
            showPlaceLabels={showPlaceLabels}
            conflictEvents={conflictEvents}
            showConflictEvents={showConflictEvents}
            onSelectConflictEvent={onSelectConflictEvent}
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
