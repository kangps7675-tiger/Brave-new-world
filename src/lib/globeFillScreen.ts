import { mapLibreZoomToAltitude, MAPLIBRE_GLOBE_MIN_ZOOM } from "@/lib/mapLibreBasemap";
import { GLOBAL_ORBIT_MAX_ALTITUDE } from "@/lib/globeCamera";

/**
 * MapLibre `TransformHelper._fovInRadians` 기본값 (≈ 36.87°).
 * tan(fov/2) = 1/3 이라 cameraToCenterDistance = 1.5 × height.
 */
const MAPLIBRE_FOV_RAD = 0.6435011087932844;
const TILE_SIZE = 512;
const CAMERA_TO_CENTER_OVER_HEIGHT = 0.5 / Math.tan(MAPLIBRE_FOV_RAD / 2);

/**
 * 전역 실루엣 직경 / 뷰포트 짧은 변.
 * 1 = 짧은 변에 지구가 딱 맞음 (16:9에선 좌우 여백, 구 전체 보임).
 */
export const GLOBE_FILL_VIEWPORT_FRACTION = 1;

function finitePositive(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** vertical-perspective: worldSize / (2π) / cos(lat) */
export function globeRadiusPixels(zoom: number, latitudeDeg = 0): number {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const cosLat = Math.max(0.2, Math.cos((latitudeDeg * Math.PI) / 180));
  return worldSize / (2 * Math.PI) / cosLat;
}

/**
 * pitch 0 에서 화면 중심 기준 지구 실루엣 반지름(px).
 * MapLibre 카메라는 지표면을 보고, FOV는 세로.
 */
export function globeProjectedRadiusPixels(
  zoom: number,
  width: number,
  height: number,
  latitudeDeg = 0,
): number {
  const h = finitePositive(height, 720);
  const radius = globeRadiusPixels(zoom, latitudeDeg);
  const cameraToCenter = CAMERA_TO_CENTER_OVER_HEIGHT * h;
  const denom = Math.sqrt(cameraToCenter * cameraToCenter + 2 * cameraToCenter * radius);
  if (!(denom > 0)) return 0;
  return (radius * cameraToCenter) / denom;
}

/**
 * 구 전체가 보이면서 짧은 변을 채우는 MapLibre zoom.
 * 로딩 셰이더가 min(w,h)로 구를 맞추는 것과 같은 프레이밍.
 */
export function globeFillScreenZoom(
  width: number,
  height: number,
  options?: { lat?: number; fraction?: number },
): number {
  const w = finitePositive(width, 1280);
  const h = finitePositive(height, 720);
  const fraction = options?.fraction ?? GLOBE_FILL_VIEWPORT_FRACTION;
  const lat = options?.lat ?? 0;
  const minDim = Math.min(w, h);
  const pixelRadius = (minDim * fraction) / 2;
  const cameraToCenter = CAMERA_TO_CENTER_OVER_HEIGHT * h;
  const r =
    (pixelRadius * pixelRadius +
      pixelRadius * Math.sqrt(pixelRadius * pixelRadius + cameraToCenter * cameraToCenter)) /
    cameraToCenter;
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const worldSize = r * 2 * Math.PI * cosLat;
  const zoom = Math.log2(worldSize / TILE_SIZE);
  if (!Number.isFinite(zoom)) return 3.2;
  return Math.max(MAPLIBRE_GLOBE_MIN_ZOOM, Math.min(8, zoom));
}

export function globeFillScreenAltitude(
  width: number,
  height: number,
  options?: { lat?: number; fraction?: number },
): number {
  return mapLibreZoomToAltitude(globeFillScreenZoom(width, height, options));
}

/** 줌아웃 상한 — 화면맞춤보다 조금 멀리, 절대 상한은 GLOBAL_ORBIT_MAX_ALTITUDE */
export function globeOrbitMaxAltitude(width: number, height: number): number {
  const fill = globeFillScreenAltitude(width, height);
  return Math.min(GLOBAL_ORBIT_MAX_ALTITUDE, fill * 1.2);
}

export function viewportGlobeSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1280, height: 720 };
  return {
    width: Math.max(320, window.innerWidth),
    height: Math.max(420, window.innerHeight),
  };
}

/** 전역 궤도 부트 고도 — 뷰포트가 없으면 데스크톱 기본 */
export function entryBootAltitude(size?: { width: number; height: number }): number {
  const { width, height } = size ?? viewportGlobeSize();
  return globeFillScreenAltitude(width, height);
}
