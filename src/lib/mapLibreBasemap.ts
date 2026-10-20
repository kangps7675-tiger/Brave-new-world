import { clampGlobeAltitude } from "@/lib/globeCamera";
import {
  INTEL_VECTOR_STYLE_URL,
  styleUrlForBasemapMode,
  type BasemapMode,
} from "@/lib/basemapMode";

/** 인텔 기본 — Carto Dark Matter (레이어 가독용 다크 벡터) */
export const MAPLIBRE_STYLE_URL = INTEL_VECTOR_STYLE_URL;

export type MapLibreCamera = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

/** Globe projection에서 과도한 틸트 방지 (전망대 ~45–55°) */
export const MAPLIBRE_PITCH_MAX = 55;

/**
 * vertical-perspective 타일 커버링이 살아 있는 줌 하한.
 * 0.85까지 열면(고도 12) 구는 남고 벡터 타일이 0건이 되어 베이스맵만 빈다.
 * 예전 궤도 상한 7.2 ≈ zoom 2.53 이 실사용에서 안전했다.
 */
export const MAPLIBRE_GLOBE_MIN_ZOOM = 2.2;

export const MAPLIBRE_MAX_ZOOM = 13.8;

export function clampMapLibrePitch(pitch: number | undefined): number {
  if (pitch == null || !Number.isFinite(pitch)) return 0;
  return Math.max(0, Math.min(MAPLIBRE_PITCH_MAX, pitch));
}

function clampMapLibreZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 3.2;
  return Math.max(MAPLIBRE_GLOBE_MIN_ZOOM, Math.min(MAPLIBRE_MAX_ZOOM, zoom));
}

/** globe.gl altitude → MapLibre zoom (globe projection, 경험적 보정) */
export function globeViewToMapLibre(view: {
  lat: number;
  lng: number;
  altitude: number;
  pitch?: number;
  bearing?: number;
}): MapLibreCamera {
  const alt = clampGlobeAltitude(view.altitude);
  const lat = Number.isFinite(view.lat) ? view.lat : 0;
  const lng = Number.isFinite(view.lng) ? view.lng : 25;

  return {
    longitude: lng,
    latitude: lat,
    zoom: altitudeToMapLibreZoom(alt),
    pitch: clampMapLibrePitch(view.pitch),
    bearing: view.bearing != null && Number.isFinite(view.bearing) ? view.bearing : 0,
  };
}

export function altitudeToMapLibreZoom(altitude: number): number {
  const alt = clampGlobeAltitude(altitude);
  return clampMapLibreZoom(9.25 - Math.log2(alt + 0.06) * 2.35);
}

/** MapLibre zoom → globe.gl altitude (globeViewToMapLibre 역변환) */
export function mapLibreZoomToAltitude(zoom: number): number {
  const z = clampMapLibreZoom(zoom);
  return clampGlobeAltitude(2 ** ((9.25 - z) / 2.35) - 0.06);
}

export function getMapLibreStyleUrl(mode: BasemapMode = "intel"): string {
  return styleUrlForBasemapMode(mode);
}
