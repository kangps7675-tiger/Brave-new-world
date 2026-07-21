/**
 * nav 상단 공지 배너 — WhatsNewModal(양피지 모달)과 별개로, 짧은 한 줄 공지용.
 * 배포마다 CURRENT만 갈아끼우면 됨. id 바뀌면 닫았던 유저에게도 다시 뜸.
 *
 * currentAmountUsd는 자동 집계가 아니라 수동 갱신값이다 — 결제 자동화(Stripe 등)가
 * 아직 없어서 QR 후원이 얼마 들어왔는지 시스템이 알 방법이 없다. 후원 확인할 때마다
 * 개발자가 이 숫자만 손으로 올리면 된다. currentAmountUsd >= goalAmountUsd가 되면
 * 배너가 자동으로 "목표 달성" 문구로 바뀐다.
 */

export type NavAnnouncement = {
  id: string;
  labelKo: string;
  labelEn: string;
  bodyKo: string;
  bodyEn: string;
  /** 목표 금액(USD/월) — 이걸 채우면 해당 유료 데이터가 켜지는 구조 */
  goalAmountUsd: number;
  /** 수동 갱신 — 후원 확인할 때마다 개발자가 직접 반영 */
  currentAmountUsd: number;
  goalReachedKo: string;
  goalReachedEn: string;
};

export const CURRENT_NAV_ANNOUNCEMENT: NavAnnouncement = {
  id: "2026-07-21-ais-funding-goal-v2",
  labelKo: "다음 타깃 · 물류 스트레스",
  labelEn: "Next target · Logistics stress",
  bodyKo:
    "실시간 함선 위치(AIS) API를 붙이면 '진짜 막힌 항구'와 '원래 붐비는 곳'을 구분할 근거가 생깁니다. 다만 이 데이터가 월 $199 — 아직 감당이 안 돼서 후원으로 채우려 합니다. 이번 달 목표에 얹었으니 관심 있으시면 도와주세요.",
  bodyEn:
    "A real-time vessel position (AIS) API would let us tell a truly-jammed port from a normally-busy one. It costs $199/mo, which we can't cover yet — folding it into this month's funding goal. If you'd like to help, it's much appreciated.",
  goalAmountUsd: 199,
  currentAmountUsd: 0,
  goalReachedKo: "목표 달성 — AIS 실시간 위치 데이터, 곧 켜집니다. 후원해주신 분들 감사합니다.",
  goalReachedEn: "Goal reached — real-time AIS vessel data is coming online soon. Thank you to everyone who chipped in.",
};

const STORAGE_KEY = "cv-nav-announcement-seen";

export function readDismissedNavAnnouncementId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function dismissNavAnnouncement(id: string = CURRENT_NAV_ANNOUNCEMENT.id): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
