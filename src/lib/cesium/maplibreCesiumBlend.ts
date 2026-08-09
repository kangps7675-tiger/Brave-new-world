/**
 * MapLibre zoom/pitch → Cesium underlay reveal (방법 B fade).
 */

export const CESIUM_ZOOM_BLEND_START = 6.5;
export const CESIUM_ZOOM_BLEND_END = 10.0;
export const CESIUM_PITCH_BLEND_START = 12;
export const CESIUM_PITCH_BLEND_END = 40;

/** Below this reveal, Cesium may stay dormant (requestRenderMode). */
export const CESIUM_REVEAL_ACTIVE = 0.05;

/** MapLibre canvas opacity when fully revealed (keep overlays readable). */
export const MAPLIBRE_OPACITY_AT_FULL_REVEAL = 0.28;

/** Start mounting Cesium slightly before visible fade. */
export const CESIUM_LAZY_MOUNT_REVEAL = 0.02;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Hermite smoothstep */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export type CesiumBlendInput = {
  zoom: number;
  pitch: number;
};

export type CesiumBlendResult = {
  zoomFactor: number;
  pitchFactor: number;
  /** 0 = MapLibre only, 1 = max Cesium reveal */
  cesiumReveal: number;
  mapLibreOpacity: number;
  /** Cesium should request renders */
  cesiumActive: boolean;
  /** Lazy-load Cesium viewer */
  shouldMountCesium: boolean;
};

export function computeCesiumBlend(input: CesiumBlendInput): CesiumBlendResult {
  const zoom = Number.isFinite(input.zoom) ? input.zoom : 0;
  const pitch = Number.isFinite(input.pitch) ? Math.max(0, input.pitch) : 0;

  const zoomFactor = smoothstep(CESIUM_ZOOM_BLEND_START, CESIUM_ZOOM_BLEND_END, zoom);
  const pitchFactor = smoothstep(CESIUM_PITCH_BLEND_START, CESIUM_PITCH_BLEND_END, pitch);
  const cesiumReveal = clamp01(0.55 * zoomFactor + 0.45 * pitchFactor);
  const mapLibreOpacity = lerp(1, MAPLIBRE_OPACITY_AT_FULL_REVEAL, cesiumReveal);

  return {
    zoomFactor,
    pitchFactor,
    cesiumReveal,
    mapLibreOpacity,
    cesiumActive: cesiumReveal >= CESIUM_REVEAL_ACTIVE,
    shouldMountCesium: cesiumReveal >= CESIUM_LAZY_MOUNT_REVEAL,
  };
}
