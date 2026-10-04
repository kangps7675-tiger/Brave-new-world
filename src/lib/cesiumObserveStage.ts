/**
 * Pretty Globe Stage — Cinema pref / boot intro / idle spin.
 * Content(AIS·LiveUA·증시)와 분리. continuous hold 금지 → interval + requestRender.
 * Content 계약: `@/lib/cesiumObserveContent` — Stage 공개면은 camera/settle/governor/cinemaPref만.
 */

import {
  holdObserveRender,
  observeRequestRender,
  releaseObserveRender,
} from "@/lib/cesiumObserveRenderGovernor";
import { OBSERVE_LOOK_ORBIT_M } from "@/lib/cesiumObserveLook";
import {
  resolveCinematicCamera,
  resolveCinematicDurationMs,
} from "@/lib/globeCamera";

export const OBSERVE_CINEMA_SESSION_KEY = "cesium-observe-cinema";

/** 유휴 스핀 — 궤도 밴드 이상에서만 */
export const OBSERVE_IDLE_SPIN_MIN_HEIGHT_M = OBSERVE_LOOK_ORBIT_M;
/** rad/tick — 매우 느린 자전감 */
export const OBSERVE_IDLE_SPIN_RAD = 0.00055;
export const OBSERVE_IDLE_SPIN_INTERVAL_MS = 200;
/** 인트로 착지 고도(m) — 포스터 궤도 */
export const OBSERVE_BOOT_INTRO_HEIGHT_M = 9_200_000;
export const OBSERVE_BOOT_INTRO_DURATION_MS = 3_400;

export function readObserveCinemaPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(OBSERVE_CINEMA_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeObserveCinemaPref(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OBSERVE_CINEMA_SESSION_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export type ObserveIdleSpinGate = {
  cinemaOn: boolean;
  tracked: boolean;
  pointerActive: boolean;
  visibilityVisible: boolean;
  heightM: number;
  orbitMinM?: number;
};

/** idle spin 게이트 — 추적/드래그/저고도/숨김이면 false */
export function observeIdleSpinShouldRun(gate: ObserveIdleSpinGate): boolean {
  if (!gate.cinemaOn) return false;
  if (gate.tracked) return false;
  if (gate.pointerActive) return false;
  if (!gate.visibilityVisible) return false;
  const minH = gate.orbitMinM ?? OBSERVE_IDLE_SPIN_MIN_HEIGHT_M;
  const h = Number.isFinite(gate.heightM) ? gate.heightM : 0;
  return h >= minH;
}

type BootIntroOpts = {
  beginProgrammatic?: () => void;
  endProgrammatic?: () => void;
  done?: () => void;
  heightM?: number;
  durationMs?: number;
};

/**
 * Cinema 부팅 인트로 — 현재 위치 기준 고궤도 + 시네마틱 pitch로 settle.
 */
export function startObserveBootIntro(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  opts?: BootIntroOpts,
): () => void {
  if (viewer.isDestroyed()) {
    opts?.done?.();
    return () => undefined;
  }

  let cancelled = false;
  const heightM = opts?.heightM ?? OBSERVE_BOOT_INTRO_HEIGHT_M;
  const durationSec =
    resolveCinematicDurationMs(opts?.durationMs ?? OBSERVE_BOOT_INTRO_DURATION_MS) /
    1000;
  const cam = resolveCinematicCamera();
  const carto = viewer.camera.positionCartographic;
  const lon = carto?.longitude ?? 0;
  const lat = carto?.latitude ?? 0;

  holdObserveRender("boot-intro");
  opts?.beginProgrammatic?.();

  const finish = () => {
    releaseObserveRender("boot-intro");
    opts?.endProgrammatic?.();
    if (!cancelled) opts?.done?.();
  };

  const destination = Cesium.Cartesian3.fromRadians(lon, lat, heightM);
  const orientation = {
    heading: Cesium.Math.toRadians(cam.bearing),
    pitch: Cesium.Math.toRadians(cam.pitch - 90),
    roll: 0,
  };

  viewer.camera.flyTo({
    destination,
    orientation,
    duration: durationSec,
    maximumHeight: Math.max(heightM * 1.35, heightM + 1_500_000),
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    complete: finish,
    cancel: finish,
  });

  return () => {
    cancelled = true;
    try {
      if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
    } catch {
      /* ignore */
    }
    releaseObserveRender("boot-intro");
    opts?.endProgrammatic?.();
  };
}

type IdleSpinOpts = {
  shouldRun: () => boolean;
  radPerTick?: number;
  intervalMs?: number;
};

/**
 * Cinema 유휴 스핀 — interval + requestRender only (continuous hold 없음).
 */
export function attachObserveIdleSpin(
  viewer: import("cesium").Viewer,
  opts: IdleSpinOpts,
): () => void {
  const rad = opts.radPerTick ?? OBSERVE_IDLE_SPIN_RAD;
  const intervalMs = opts.intervalMs ?? OBSERVE_IDLE_SPIN_INTERVAL_MS;

  const timer = window.setInterval(() => {
    if (viewer.isDestroyed()) return;
    if (!opts.shouldRun()) return;
    try {
      viewer.camera.rotateRight(rad);
      observeRequestRender();
    } catch {
      /* ignore */
    }
  }, intervalMs);

  return () => {
    window.clearInterval(timer);
  };
}
