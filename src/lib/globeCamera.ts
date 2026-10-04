/**
 * globe.gl 고도: altitude = cameraDistance / 100 - 1
 * 너무 가까이 가면 지표면 클리핑·Z-fighting·텍스처 깨짐이 발생함
 */
export const MIN_GLOBE_ALTITUDE = 0.14;

/** 극저고도 — 이 아래에서는 지오메트리·bump를 추가로 줄임 */
export const EXTREME_ZOOM_ALTITUDE = 0.18;

/**
 * 전역 궤도 폴백 (1920×1080 화면맞춤에 가깝다).
 * 실제 부트 고도는 `entryBootAltitude(size)` — 뷰포트 짧은 변에 구 전체를 맞춘다.
 */
export const GLOBAL_BOOT_ALTITUDE = 6.05;

/**
 * 로딩 셰이더 ray origin z. UV를 min(w,h)로 정규화하므로 화면맞춤과 별개.
 * 고도 폴백과 맞춰 로딩↔맵 전환 때 구 크기가 점프하지 않게 둔다.
 */
export const GLOBAL_BOOT_SHADER_CAMERA_Z = 1 + GLOBAL_BOOT_ALTITUDE;

/**
 * 줌아웃 상한. 12는 MapLibre minZoom≈0.85 가 되어 지구본 타일이 안 그려졌다.
 * 7.2 ≈ zoom 2.53 — 구 실루엣은 유지되고 벡터 베이스맵이 산다.
 */
export const GLOBAL_ORBIT_MAX_ALTITUDE = 7.2;

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

/**
 * 속보·핀·알림 등 「그 위치로」이동 — 눈치채기 전에 끝나지 않게,
 * 빠르면서도 감속하는 웅장한 대각선 진입.
 */
export const CINEMATIC_FLY = {
  durationMs: 2800,
  /** MapLibre/globe.gl pitch (0=직하, 클수록 비스듬) → Cesium에서는 pitch-90 */
  pitch: 52,
  /** 대각선 시선 (남서쪽에서 내려다보는 느낌) */
  bearing: -38,
} as const;

export type FlyCameraOpts = {
  pitch?: number;
  bearing?: number;
  /**
   * true면 lat/lng 를 「카메라 위치」가 아니라 「화면 중앙에 와야 할 지점」으로 해석한다
   * (MapLibre center 규약). 비스듬한 pitch 에서 대상이 화면 밖으로 빠지는 것을 막는다.
   * 기본값 false — 기존 호출부 동작 유지.
   */
  lookAt?: boolean;
};

/** 생략된 pitch/bearing을 대각선 시네마틱으로 채운다 */
export function resolveCinematicCamera(camera?: FlyCameraOpts): {
  pitch: number;
  bearing: number;
  lookAt?: boolean;
} {
  const out: { pitch: number; bearing: number; lookAt?: boolean } = {
    pitch: camera?.pitch ?? CINEMATIC_FLY.pitch,
    bearing: camera?.bearing ?? CINEMATIC_FLY.bearing,
  };
  if (camera?.lookAt) out.lookAt = true;
  return out;
}

const EARTH_RADIUS_M = 6_371_000;

/** 높이 h 에서 수평선이 수평 아래로 내려가 보이는 각(도). 이보다 덜 숙이면 중앙 시선이 우주를 향한다. */
export function horizonDipDeg(heightM: number): number {
  if (!Number.isFinite(heightM) || heightM <= 0) return 0;
  return (Math.acos(EARTH_RADIUS_M / (EARTH_RADIUS_M + heightM)) * 180) / Math.PI;
}

/**
 * Cesium pitch(도, 0=수평·−90=직하)를 「화면 중앙 시선이 지구에 닿는」 범위로 제한한다.
 * 고도가 높을수록 수평선이 아래로 내려가므로(9,200km 에서 약 66°) 같은 −38° 도
 * 우주만 보이게 된다. marginDeg 만큼 여유를 둔다.
 */
export function clampCesiumPitchToGlobeDeg(
  heightM: number,
  cesiumPitchDeg: number,
  marginDeg = 6,
): number {
  const minDown = Math.min(90, horizonDipDeg(heightM) + marginDeg);
  const down = Number.isFinite(cesiumPitchDeg) ? -cesiumPitchDeg : minDown;
  return -Math.min(90, Math.max(down, minDown));
}

/**
 * look-at 비행용: 카메라 고도 H, 시선 하향각 |pitch|(Cesium 기준, 수평=0) 일 때
 * 대상까지의 거리(range = H / sin|pitch|). 수직에 가까울수록 range→H.
 */
export function lookAtRangeForHeight(heightM: number, cesiumPitchDeg: number): number {
  const down = Math.min(89, Math.max(10, Math.abs(cesiumPitchDeg)));
  return heightM / Math.sin((down * Math.PI) / 180);
}

export function resolveCinematicDurationMs(durationMs?: number): number {
  return typeof durationMs === "number" && Number.isFinite(durationMs)
    ? durationMs
    : CINEMATIC_FLY.durationMs;
}
