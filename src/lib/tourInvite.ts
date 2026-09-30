/**
 * 첫 방문 「둘러보기」권유 — localStorage가 끝냄 SSOT.
 */

import {
  readFirstVisitTourDone,
  TOUR_INVITE_KEY,
} from "@/lib/firstVisitTour";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";

export { TOUR_INVITE_KEY };

export function readTourInviteDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TOUR_INVITE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourInviteDismissed(): void {
  if (typeof window === "undefined") return;
  markNudgeShown("tourInvite");
}

/** 투어 미완료 + 권유 미거절 — tourInvite는 예산 면제(exempt). */
export function shouldOfferTourInvite(): boolean {
  if (typeof window === "undefined") return false;
  if (readFirstVisitTourDone()) return false;
  if (readTourInviteDismissed()) return false;
  return canShowNudge("tourInvite", true);
}
