import { theaterAssetSymbols } from "@/lib/theaterAssets";
import { A_GRADE_MIN, shouldEmitBreakingSos } from "@/lib/news/breakingGrade";
import type { BreakingUiRank, HeroBreakingItem } from "@/lib/news/types";

/** @deprecated grade 체계로 대체 — A급(≥6) 이상이면 alert */
export const ALERT_URGENCY_THRESHOLD = A_GRADE_MIN * 10;

export const INTEL_STACK_CLEARANCE_CALM = "8.5rem";
export const INTEL_STACK_CLEARANCE_ALERT = "13.5rem";
export const INTEL_STACK_CLEARANCE_ECONOMY_CALM = "10rem";
export const INTEL_STACK_CLEARANCE_ECONOMY_ALERT = "14.5rem";
/** 속보·티커를 내린 뒤 — 지구본 전체화면에 가까운 여백 */
export const INTEL_STACK_CLEARANCE_COLLAPSED = "3.25rem";

const DOCK_COLLAPSED_KEY = "cv-intel-dock-collapsed";

export function readIntelDockCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DOCK_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeIntelDockCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (collapsed) sessionStorage.setItem(DOCK_COLLAPSED_KEY, "1");
    else sessionStorage.removeItem(DOCK_COLLAPSED_KEY);
  } catch {
    /* ignore */
  }
}

/** alert 하이라이트 티커 — 이 % 이상 변동 시 SPIKE 배지 */
export const TICKER_SPIKE_THRESHOLD_PERCENT = 1.25;

export type IntelStackMode = "calm" | "alert";

/**
 * A·S → alert(히어로 슬라이드업)
 * B → calm (시트만)
 */
export function resolveIntelStackMode(hero: HeroBreakingItem | null): IntelStackMode {
  if (!hero) return "calm";
  const rank: BreakingUiRank =
    hero.breakingRank ??
    (hero.breakingGrade >= 9 ? "S" : hero.breakingGrade >= A_GRADE_MIN ? "A" : "B");
  if (rank === "B") return "calm";
  return "alert";
}

/** S급만 SOS 모스 */
export function resolveBreakingSos(hero: HeroBreakingItem | null): boolean {
  if (!hero) return false;
  return shouldEmitBreakingSos(hero.breakingRank);
}

export function resolveIntelStackClearance(
  mode: IntelStackMode,
  viewerMode: "conflict" | "economy" = "conflict",
): string {
  if (viewerMode === "economy") {
    return mode === "alert"
      ? INTEL_STACK_CLEARANCE_ECONOMY_ALERT
      : INTEL_STACK_CLEARANCE_ECONOMY_CALM;
  }
  return mode === "alert" ? INTEL_STACK_CLEARANCE_ALERT : INTEL_STACK_CLEARANCE_CALM;
}

/** alert/calm 티커 하이라이트 — 전장 연관 심볼 (모드별) */
export function heroHighlightSymbols(
  hero: HeroBreakingItem | null,
  limit?: number,
  viewerMode: "conflict" | "economy" = "conflict",
): string[] {
  if (!hero) return [];
  const symbols = theaterAssetSymbols(hero.theater, viewerMode);
  if (limit == null || !Number.isFinite(limit) || limit < 0) return symbols;
  return symbols.slice(0, limit);
}
