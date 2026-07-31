import type { NewfeedsSeverity } from "@/lib/newfeeds";

/**
 * 전장 강도 원(이란 NewFeeds · 우크라 GDELT) — 공통 angular radius.
 * 예전 이란 원(0.16~0.32) 대비 **지름 1/4** (= 반경 ×0.25).
 */
export function theaterIntensityAngularRadius(severity: NewfeedsSeverity | string): number {
  if (severity === "major") return 0.08;
  if (severity === "high") return 0.07;
  if (severity === "medium") return 0.06;
  return 0.04;
}

/** GDELT 등급 → 강도 원 severity */
export function theaterIntensityFromGdeltGrade(
  importanceGrade: string | undefined,
  fresh: boolean,
): NewfeedsSeverity {
  if (importanceGrade === "S") return "major";
  if (importanceGrade === "A") return "high";
  if (fresh) return "medium";
  return "low";
}

/** 우크라 전장 강도 원 — 시안 계열 (이란 빨강과 구분) */
export function ukraineTheaterIntensityColor(severity: NewfeedsSeverity | string): string {
  if (severity === "major") return "rgba(14, 165, 233, 0.95)";
  if (severity === "high") return "rgba(56, 189, 248, 0.92)";
  if (severity === "medium") return "rgba(125, 211, 252, 0.88)";
  return "rgba(148, 163, 184, 0.72)";
}
