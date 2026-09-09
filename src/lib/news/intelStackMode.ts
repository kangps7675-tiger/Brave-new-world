import { theaterAssetSymbols } from "@/lib/theaterAssets";
import { A_GRADE_MIN, shouldEmitBreakingSos } from "@/lib/news/breakingGrade";
import type { BreakingUiRank, HeroBreakingItem } from "@/lib/news/types";

/** @deprecated grade 체계로 대체 — A급(≥6) 이상이면 alert */
export const ALERT_URGENCY_THRESHOLD = A_GRADE_MIN * 10;

/** 폴백·히스토리 독 — 화면 중하단으로 뜨지 않게 낮게 유지 */
export const INTEL_STACK_CLEARANCE_CALM = "5.5rem";
export const INTEL_STACK_CLEARANCE_ALERT = "7.5rem";
export const INTEL_STACK_CLEARANCE_ECONOMY_CALM = "6rem";
export const INTEL_STACK_CLEARANCE_ECONOMY_ALERT = "8rem";
/** 속보·티커를 내린 뒤 — 지구본 전체화면에 가까운 여백 */
export const INTEL_STACK_CLEARANCE_COLLAPSED = "3.25rem";
/** 히스토리 스크럽+토글 높이 (인텔 스택 언마운트 시) */
export const INTEL_STACK_CLEARANCE_HISTORY = "5.5rem";
export const INTEL_STACK_CLEARANCE_HISTORY_COMPACT = "5.25rem";
/** 뷰포트 대비 clearance 상한 — 중하단 부상 방지 */
export const INTEL_STACK_CLEARANCE_MAX_VH = 0.36;

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

/** 스택 실측 높이 → CSS px (뷰포트 비율 상한 적용) */
export function clampIntelStackClearancePx(
  heightPx: number,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): number {
  const pad = 10;
  const min = 52;
  const max = Math.max(min, Math.floor(viewportHeight * INTEL_STACK_CLEARANCE_MAX_VH));
  return Math.max(min, Math.min(Math.ceil(heightPx + pad), max));
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
