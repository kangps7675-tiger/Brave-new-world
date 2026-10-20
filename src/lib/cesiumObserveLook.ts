/**
 * Observe 카메라 고도 → atmosphere / Google SSE / 구름 알파 권장값.
 * Cinema는 orbit rim·구름만 한 단계 올리고 near 실사는 보호한다.
 */

export const OBSERVE_ATMO_ORBIT = {
  light: 22,
  sat: -0.04,
  bright: 0.04,
} as const;

export const OBSERVE_ATMO_NEAR = {
  light: 14,
  sat: -0.02,
  bright: 0.02,
} as const;

/** heightM 경계 */
export const OBSERVE_LOOK_ORBIT_M = 200_000;
export const OBSERVE_LOOK_NEAR_M = 15_000;

/** Lite 구름 알파 상한 (GIBS 기본과 정합) */
export const OBSERVE_CLOUD_ALPHA_LITE = 0.34;
/** Cinema 구름 — 땅 가리지 않는 선에서만 상향 */
export const OBSERVE_CLOUD_ALPHA_CINEMA = 0.42;
/** Cinema orbit rim 배율 */
export const OBSERVE_CINEMA_ORBIT_LIGHT_SCALE = 1.22;

export type ObserveLookProfile = {
  atmosphereLightIntensity: number;
  saturationShift: number;
  brightnessShift: number;
  /** google tileset에 가산할 SSE 바이어스 (양수=더 거칠게) */
  sseBias: number;
  /** GIBS 구름 껍질 권장 알파 */
  cloudAlpha: number;
};

export type ObserveLookOpts = {
  /** Cinema 프리셋 — orbit rim/구름만 강화 */
  cinema?: boolean;
};

/**
 * 궤도에서는 rim을 살리고, 저고도에서는 실사 텍스처를 위해 atmosphere를 낮춘다.
 */
export function observeLookForHeightM(
  heightM: number,
  opts?: ObserveLookOpts,
): ObserveLookProfile {
  const cinema = Boolean(opts?.cinema);
  const h = Number.isFinite(heightM) ? Math.max(0, heightM) : OBSERVE_LOOK_ORBIT_M;

  let base: Omit<ObserveLookProfile, "cloudAlpha">;
  let orbitWeight: number;

  if (h >= OBSERVE_LOOK_ORBIT_M) {
    base = {
      atmosphereLightIntensity: OBSERVE_ATMO_ORBIT.light,
      saturationShift: OBSERVE_ATMO_ORBIT.sat,
      brightnessShift: OBSERVE_ATMO_ORBIT.bright,
      sseBias: 2,
    };
    orbitWeight = 1;
  } else if (h <= OBSERVE_LOOK_NEAR_M) {
    base = {
      atmosphereLightIntensity: OBSERVE_ATMO_NEAR.light,
      saturationShift: OBSERVE_ATMO_NEAR.sat,
      brightnessShift: OBSERVE_ATMO_NEAR.bright,
      sseBias: 0,
    };
    orbitWeight = 0;
  } else {
    const t =
      (h - OBSERVE_LOOK_NEAR_M) / (OBSERVE_LOOK_ORBIT_M - OBSERVE_LOOK_NEAR_M);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    base = {
      atmosphereLightIntensity: lerp(
        OBSERVE_ATMO_NEAR.light,
        OBSERVE_ATMO_ORBIT.light,
      ),
      saturationShift: lerp(OBSERVE_ATMO_NEAR.sat, OBSERVE_ATMO_ORBIT.sat),
      brightnessShift: lerp(OBSERVE_ATMO_NEAR.bright, OBSERVE_ATMO_ORBIT.bright),
      sseBias: lerp(0, 2),
    };
    orbitWeight = t;
  }

  const lightScale = cinema
    ? 1 + (OBSERVE_CINEMA_ORBIT_LIGHT_SCALE - 1) * orbitWeight
    : 1;
  const cloudAlpha = cinema
    ? OBSERVE_CLOUD_ALPHA_LITE +
      (OBSERVE_CLOUD_ALPHA_CINEMA - OBSERVE_CLOUD_ALPHA_LITE) * orbitWeight
    : OBSERVE_CLOUD_ALPHA_LITE;

  return {
    ...base,
    atmosphereLightIntensity: base.atmosphereLightIntensity * lightScale,
    cloudAlpha,
  };
}

export function applyObserveLookToViewer(
  viewer: {
    isDestroyed: () => boolean;
    scene: {
      skyAtmosphere?: {
        atmosphereLightIntensity?: number;
        saturationShift?: number;
        brightnessShift?: number;
      } | null;
    };
  },
  profile: ObserveLookProfile,
): void {
  if (viewer.isDestroyed()) return;
  const atmo = viewer.scene.skyAtmosphere;
  if (!atmo) return;
  if (typeof atmo.atmosphereLightIntensity === "number") {
    atmo.atmosphereLightIntensity = profile.atmosphereLightIntensity;
  }
  if (typeof atmo.saturationShift === "number") {
    atmo.saturationShift = profile.saturationShift;
  }
  if (typeof atmo.brightnessShift === "number") {
    atmo.brightnessShift = profile.brightnessShift;
  }
}
