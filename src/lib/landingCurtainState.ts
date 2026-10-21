import { useSyncExternalStore } from "react";

/**
 * 랜딩 막(LandingCurtain)이 지구본 위를 덮고 있는 동안 true.
 * 지구본은 막 아래에서 부팅하므로, 그 사이 속보 팝업(양피지·토스트)이 막 위로 뜨거나
 * 타전음을 내지 않게 막는 데 쓴다.
 */
let active = false;
const listeners = new Set<() => void>();

export function setLandingCurtainActive(next: boolean): void {
  if (active === next) return;
  active = next;
  listeners.forEach((l) => l());
}

export function isLandingCurtainActive(): boolean {
  return active;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLandingCurtainActive(): boolean {
  return useSyncExternalStore(subscribe, isLandingCurtainActive, () => false);
}
