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

export function clampMapLibrePitch(pitch: number | undefined): number {
  if (pitch == null || !Number.isFinite(pitch)) return 0;
  return Math.max(0, Math.min(MAPLIBRE_PITCH_MAX, pitch));
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
  const zoom = altitudeToMapLibreZoom(alt);

  return {
    longitude: view.lng,
    latitude: view.lat,
    zoom,
    pitch: clampMapLibrePitch(view.pitch),
    bearing: view.bearing != null && Number.isFinite(view.bearing) ? view.bearing : 0,
  };
}

export function altitudeToMapLibreZoom(altitude: number): number {
  const alt = clampGlobeAltitude(altitude);
  return Math.max(0.85, Math.min(13.8, 9.25 - Math.log2(alt + 0.06) * 2.35));
}

/** MapLibre zoom → globe.gl altitude (globeViewToMapLibre 역변환) */
export function mapLibreZoomToAltitude(zoom: number): number {
  const z = Math.max(0.85, Math.min(13.8, zoom));
  return clampGlobeAltitude(2 ** ((9.25 - z) / 2.35) - 0.06);
}

export function getMapLibreStyleUrl(mode: BasemapMode = "intel"): string {
  return styleUrlForBasemapMode(mode);
}
