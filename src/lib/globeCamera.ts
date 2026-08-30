/**
 * globe.gl 고도: altitude = cameraDistance / 100 - 1
 * 너무 가까이 가면 지표면 클리핑·Z-fighting·텍스처 깨짐이 발생함
 */
export const MIN_GLOBE_ALTITUDE = 0.14;

/** 극저고도 — 이 아래에서는 지오메트리·bump를 추가로 줄임 */
export const EXTREME_ZOOM_ALTITUDE = 0.18;

/**
 * 첫 창·로딩·게이트 직후·지정학 인텔 초입 — 지구본 **구 전체**가 화면에 들어오는 고도.
 * MapLibre globe projection + pitch ~22° 기준 (zoom ≈ 1.0).
 * 예전 7.2는 대륙 개요(zoom≈2.5)라 구가 잘려 보였음.
 */
export const GLOBAL_BOOT_ALTITUDE = 11.5;

/** GLOBAL_BOOT_ALTITUDE 에 대응하는 로딩 셰이더 ray origin z (1 + altitude). */
export const GLOBAL_BOOT_SHADER_CAMERA_Z = 1 + GLOBAL_BOOT_ALTITUDE;

/**
 * 일반 모드 줌아웃 상한 — 부트 전역 실루엣보다 조금 여유.
 * (maxDistance = (altitude+1)*100 으로 변환)
 */
export const GLOBAL_ORBIT_MAX_ALTITUDE = 12.5;

/**
 * 궤도(ISS급) 개요 — 환영·도메인·세부 선택 후 첫 진입 카메라.
 * 중동 전역(걸프·레반트·이란)이 한 화면에 들어오는 원거리.
 */
export const ORBITAL_OVERVIEW_ALTITUDE = 1.78;

/**
 * 넓은 전장(중동·우크라 전역 등) overview 진입 시 이보다 가까이 붙지 않음.
 * 한반도·대만급(COMPACT_THEATER_MAX_SPAN_DEG 이하)에는 적용하지 않음.
 */
export const THEATER_ENTRY_MIN_ALTITUDE = 1.58;

/**
 * bbox 장축(도)이 이 이하면 지역 버튼이 궤도 하한 없이
 * 작성된 altitude/bbox fit으로 화면을 채움 (한반도·대만해협 프레임).
 */
export const COMPACT_THEATER_MAX_SPAN_DEG = 16;

export function clampGlobeAltitude(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : MIN_GLOBE_ALTITUDE;
  return Math.max(MIN_GLOBE_ALTITUDE, a);
}

export function globeDistanceForAltitude(altitude: number): number {
  return (clampGlobeAltitude(altitude) + 1) * 100;
}
