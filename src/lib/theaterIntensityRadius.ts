import { severityColor, type NewfeedsSeverity } from "@/lib/newfeeds";

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

/** 우크라 전장 강도 원 — 이란 NewFeeds와 동일 빨간 팔레트 (전쟁소식 한 채널) */
export function ukraineTheaterIntensityColor(severity: NewfeedsSeverity | string): string {
  return severityColor(severity as NewfeedsSeverity);
}
