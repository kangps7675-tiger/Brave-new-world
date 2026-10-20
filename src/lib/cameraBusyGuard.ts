/**
 * 카메라 tween(flyTo / easeTo) + 드래그 중 글로브·피드 갱신 올스톱 가드.
 * MapLibre easeTo는 onMove를 쏘지만, 프레임이 드문 구간에서도 busy 창을 강제 유지한다.
 */

import { CAMERA_IDLE_DEBOUNCE_MS } from "@/lib/globePerformance";

/** fly 종료 후 LOD flush·idle 정착 여유 */
export const CAMERA_FLY_SETTLE_MS = 80;

export function cameraFlyBusyMs(durationMs: number): number {
  return Math.max(0, durationMs) + CAMERA_FLY_SETTLE_MS;
}

/** idle clear가 tween 창보다 이르게 떨어지지 않게 */
export function cameraIdleClearBlocked(
  nowMs: number,
  tweenUntilMs: number,
): boolean {
  return nowMs < tweenUntilMs;
}

export function cameraBusyUntilAfterFly(durationMs: number, nowMs = Date.now()): number {
  return nowMs + cameraFlyBusyMs(durationMs);
}

/** fly 완료 후 moving 플래그 해제까지 (ease 잔여 + idle debounce) */
export function cameraFlyReleaseDelayMs(durationMs: number): number {
  return cameraFlyBusyMs(durationMs) + CAMERA_IDLE_DEBOUNCE_MS;
}
