import { LAB_UI } from "@/lib/labFlag";
import type { CesiumSatelliteGlobeProps } from "@/components/globe/CesiumSatelliteGlobe";

/**
 * 세슘(위성) 화면은 "사건 현장을 위성사진으로 보는 곳"이다. 지도(MapLibre)와 같은 레이어를 또 그리면
 * GPU가 무거워지므로, 기본에서는 세슘에 레이어를 그리지 않고 사건 콜아웃(eventCallout)만 남긴다.
 * 코드는 지우지 않는다 — NEXT_PUBLIC_LAB=1(실험실)이면 예전처럼 전부 그린다. (2026-10-21 필성 확정)
 */
export const SATELLITE_DRAWS_LAYERS = LAB_UI;

/** 세슘에 넘기는 레이어 데이터·표시 플래그 — 이 값들만 비운다. 카메라·콜아웃·핸들러는 건드리지 않는다. */
export const CESIUM_LAYERS_OFF: Partial<CesiumSatelliteGlobeProps> = {
  aisVessels: undefined,
  disguisedVessels: undefined,
  milAircraft: undefined,
  civAircraft: undefined,
  showAis: false,
  showAisMilitary: false,
  showAisCommercial: false,
  showDisguisedVessels: false,
  showMilitaryActivity: false,
  showAirTraffic: false,
  usCarriers: undefined,
  showUsCarriers: false,
  neptunThreats: undefined,
  showNeptun: false,
  alertPins: undefined,
  ukmtoIncidents: undefined,
  navareaFeatures: undefined,
  chokeRings: undefined,
  straitOverlaySegments: undefined,
  straitLabels: undefined,
  straitPorts: undefined,
  liveuaPins: undefined,
  deskFocus: undefined,
  liveuaStrikes: undefined,
  hybridPins: undefined,
  liveuaGround: undefined,
  controlGeoJson: undefined,
  firmsFires: undefined,
  showFirmsFires: false,
  missileLaunches: undefined,
  showMissileLaunches: false,
  neptunAlerts: undefined,
  showAirRaidZones: false,
  placeLabels: undefined,
  showPlaceLabels: false,
  conflictEvents: undefined,
  showConflictEvents: false,
};

/** 실험실이 아니면 레이어 props 를 비운다. 나머지(eventCallout·카메라 제어 등)는 그대로 통과. */
export function cesiumLayerProps<T extends Partial<CesiumSatelliteGlobeProps>>(
  props: T,
  draw: boolean = SATELLITE_DRAWS_LAYERS,
): T {
  return draw ? props : { ...props, ...CESIUM_LAYERS_OFF };
}
