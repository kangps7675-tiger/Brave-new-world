/**
 * MapLibre view state → Cesium Camera.lookAt params.
 *
 * Pitch: MapLibre 0 = nadir → Cesium pitch = mapPitch - 90 (°).
 * Range: ground resolution (m/px) matched via Web-Mercator circumference.
 */

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const TILE_SIZE = 512;

export type MapLibreViewForCesium = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  /** Viewport height in CSS/layout pixels (fallback 800) */
  viewportHeightPx?: number;
};

export type CesiumLookAtParams = {
  longitude: number;
  latitude: number;
  /** Height above ellipsoid at look target (m) — 0 = ground */
  height: number;
  /** Camera.lookAt range (m) */
  range: number;
  /** Cesium heading (radians), from MapLibre bearing */
  headingRad: number;
  /** Cesium pitch (radians), nadir = -π/2 */
  pitchRad: number;
};

export function mapLibrePitchToCesiumPitchDeg(mapPitchDeg: number): number {
  const p = Number.isFinite(mapPitchDeg) ? mapPitchDeg : 0;
  return Math.max(-90, Math.min(0, p - 90));
}

/** Meters per pixel at equator-corrected latitude for MapLibre zoom. */
export function metersPerPixelAt(latitudeDeg: number, zoom: number): number {
  const lat = Number.isFinite(latitudeDeg) ? latitudeDeg : 0;
  const z = Number.isFinite(zoom) ? zoom : 0;
  const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  return (EARTH_CIRCUMFERENCE_M * cos) / (TILE_SIZE * 2 ** z);
}

/**
 * Camera range so that on-screen ground scale roughly matches MapLibre.
 * At nadir, range ≈ mpp * (viewportHeight / 2) / tan(fov/2); we use a
 * stable empirical scale that tracks zoom across typical dashboard FOVs.
 */
export function mapLibreZoomToCesiumRange(
  latitudeDeg: number,
  zoom: number,
  viewportHeightPx = 800,
): number {
  const mpp = metersPerPixelAt(latitudeDeg, zoom);
  const h = Math.max(240, viewportHeightPx || 800);
  // ~45° vertical FOV → height/2 covers tan(22.5°) of range; factor ≈ 1.2 for feel
  const range = mpp * (h / 2) * 1.2;
  return Math.max(80, Math.min(2.5e7, range));
}

export function mapLibreViewToCesiumLookAt(view: MapLibreViewForCesium): CesiumLookAtParams {
  const longitude = Number.isFinite(view.longitude) ? view.longitude : 0;
  const latitude = Number.isFinite(view.latitude) ? view.latitude : 0;
  const pitchDeg = mapLibrePitchToCesiumPitchDeg(view.pitch);
  const bearing = Number.isFinite(view.bearing) ? view.bearing : 0;
  const range = mapLibreZoomToCesiumRange(
    latitude,
    view.zoom,
    view.viewportHeightPx,
  );

  return {
    longitude,
    latitude,
    height: 0,
    range,
    headingRad: (bearing * Math.PI) / 180,
    pitchRad: (pitchDeg * Math.PI) / 180,
  };
}

/** Approximate inverse for tests — range → zoom at given lat/viewport. */
export function cesiumRangeToApproxMapLibreZoom(
  latitudeDeg: number,
  rangeM: number,
  viewportHeightPx = 800,
): number {
  const h = Math.max(240, viewportHeightPx);
  const mpp = rangeM / ((h / 2) * 1.2);
  const lat = Number.isFinite(latitudeDeg) ? latitudeDeg : 0;
  const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const zoom = Math.log2(EARTH_CIRCUMFERENCE_M * cos / (TILE_SIZE * mpp));
  return Math.max(0, Math.min(22, zoom));
}
