/**
 * 관측(Cesium) soft entitlement — 실결제 없는 1A 게이트.
 * localStorage로 데모·개발용 언락. 빌링 연동 전 placeholder.
 */

export const OBSERVE_PREVIEW_MS = 30_000;

const UNLOCK_KEY = "bnw-observe-unlocked";

export function readObserveUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function markObserveUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearObserveUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** 풀 관측(미리보기 제한 없음) 가능 여부 */
export function canMountFullObserve(unlocked = readObserveUnlocked()): boolean {
  return unlocked;
}
