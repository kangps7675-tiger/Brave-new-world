"use client";

import { useSyncExternalStore } from "react";

/**
 * `prefers-reduced-motion: reduce` 단일 출처.
 *
 * 왜 훅으로 모으는가:
 *  - 이전에는 `window.matchMedia("(prefers-reduced-motion: reduce)")`가 9곳에
 *    흩어져 있었고, 전부 **1회성 조회**라 사용자가 OS 설정을 바꿔도 반영되지 않았다.
 *  - 더 큰 문제는 커버리지였다. 사이렌 컷·플래시·스캔라인 같은
 *    **가장 위험한 연출들이 이 검사를 아예 하지 않았다.**
 *
 * 이 앱은 공습 사이렌 컷·전면 플래시·스캔라인을 쓴다. 전정 장애·편두통·광과민
 * 사용자에게 이건 취향 문제가 아니라 건강 문제다. 그래서 접근성 항목이 아니라
 * **안전 항목**으로 다룬다.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** SSR·미지원 환경에서는 false (모션 허용) */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  // Safari 13 이하는 addEventListener 미지원 → addListener 폴백
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onStoreChange);
    return () => mq.removeEventListener("change", onStoreChange);
  }
  mq.addListener(onStoreChange);
  return () => mq.removeListener(onStoreChange);
}

/**
 * 리액티브 버전 — OS 설정을 바꾸면 즉시 반영된다.
 * (일회성 조회가 필요한 비-React 코드는 `prefersReducedMotion()` 사용)
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

/**
 * 모션 시간 스케일 — fly·전환 duration에 곱한다.
 * reduce면 0을 반환해 **애니메이션이 아니라 컷 전환**이 되게 한다.
 *
 * 사용: `flyTo(lat, lng, alt, motionDuration(1200))`
 */
export function motionDuration(ms: number, reduced = prefersReducedMotion()): number {
  return reduced ? 0 : ms;
}
