/**
 * 재방문 카운트 — PWA / 푸시 옵트인 공통.
 * 한 세션에서 bump는 한 번만 (layout에 여러 프롬프트가 있어도 중복 증가 방지).
 */

export const VISIT_COUNT_KEY = "cv-visit-count";

const BUMPED_SESSION_KEY = "cv-visit-bumped-session";

export function getVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(localStorage.getItem(VISIT_COUNT_KEY) || "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** 방문 횟수 +1 (탭 세션당 1회). 현재 값 반환. */
export function bumpVisitCountOncePerSession(): number {
  if (typeof window === "undefined") return 0;
  try {
    if (sessionStorage.getItem(BUMPED_SESSION_KEY) === "1") {
      return getVisitCount();
    }
    sessionStorage.setItem(BUMPED_SESSION_KEY, "1");
    const next = getVisitCount() + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
    return next;
  } catch {
    return getVisitCount() || 1;
  }
}
