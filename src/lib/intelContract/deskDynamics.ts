/**
 * 데스크 동적 시각 — 시간 페이드·승격·반증 식힘 (순수 함수).
 */

import type { DisplayGrade } from "@/lib/intelContract/types";

/** 72h 창 안/밖 알파. 창 밖은 거의 꺼짐. */
export function timeWindowAlpha(
  occurredAtIso: string | null | undefined,
  windowHours: number,
  nowMs: number = Date.now(),
): number {
  if (!occurredAtIso) return 0.85;
  const t = Date.parse(occurredAtIso);
  if (!Number.isFinite(t)) return 0.85;
  const ageMs = nowMs - t;
  const windowMs = windowHours * 3600_000;
  if (ageMs < 0) return 1;
  if (ageMs <= windowMs) {
    // 창 안: 최신일수록 1, 창 끝으로 갈수록 ~0.55
    const u = ageMs / windowMs;
    return 1 - u * 0.45;
  }
  // 창 밖: 급격히 꺼짐
  const over = (ageMs - windowMs) / windowMs;
  return Math.max(0.08, 0.28 * Math.exp(-over * 1.8));
}

/** 반증 히트 시 색을 식힘 (채도↓, 회색 쪽으로) */
export function coolCssColor(hex: string, hitCount: number): string {
  if (hitCount <= 0) return hex;
  const n = hex.replace("#", "");
  if (n.length !== 6) return "#64748b";
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = Math.min(0.85, 0.35 + hitCount * 0.15);
  const nr = Math.round(r * (1 - mix) + 100 * mix);
  const ng = Math.round(g * (1 - mix) + 116 * mix);
  const nb = Math.round(b * (1 - mix) + 139 * mix);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

/** 반증 시 링 접힘 비율 (1 = 정상, 작을수록 접힘) */
export function disconfirmCollapseFactor(hitCount: number): number {
  if (hitCount <= 0) return 1;
  return Math.max(0.25, 1 - hitCount * 0.22);
}

export function isActiveGrade(grade: DisplayGrade): boolean {
  return grade === "high" || grade === "std" || grade === "low";
}

export function isHoldGrade(grade: DisplayGrade): boolean {
  return grade === "hold";
}

/** hold → active 승격 여부 */
export function isPromotion(
  prev: DisplayGrade | undefined,
  next: DisplayGrade,
): boolean {
  return prev === "hold" && isActiveGrade(next);
}

/** 신규 관측 펄스 지속 */
export const NEW_OBS_PULSE_MS = 2400;
