/**
 * EvidenceTier → 마커 시각 스타일.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 시각 구분이 필요한가
 * ══════════════════════════════════════════════════════════════════════
 *
 * 지금 지도에서는 **위성이 잡은 열점과 텔레그램 전언이 똑같이 생겼다.**
 * 배지에 "관측"/"미확인"이 적혀 있어도, 호버하기 전까지는 구분이 안 된다.
 *
 * 그런데 이 제품의 논지는 "무엇을 아는가"가 아니라 **"어떻게 아는가"** 다.
 * 그 논지가 마커 모양에 반영되지 않으면 EvidenceTier 는 장식이 된다.
 *
 * ── ArmyInform 선행조건 ────────────────────────────────────────────
 *
 * 우크라이나 국방부 매체의 타격 좌표(`claimed`)를 FIRMS 위성 탐지(`observed`)와
 * **같은 모양으로** 그리면, 교전 당사자의 주장이 관측과 동급이 된다.
 * 그 순간 제품의 인식론이 무너진다.
 *
 * 그래서 ArmyInform 을 붙이기 **전에** 이 구분이 있어야 한다.
 *
 * ── 규칙 ───────────────────────────────────────────────────────────
 *
 *   실선 (solid)   관측·보도 — 기계가 잡았거나 교차 검증됨
 *   파선 (dashed)  주장·추정 — 당사자 발표이거나 우리가 계산한 값
 *   점선 (dotted)  미확인 — 단일 경로 전언
 *
 * 불투명도도 함께 낮춘다. **확신이 낮을수록 흐리게.**
 */

import {
  evidenceTierOpacity,
  evidenceTierStroke,
  type EvidenceTier,
} from "@/lib/evidenceTier";

export type MarkerStrokeStyle = "solid" | "dashed" | "dotted";

/** CSS `border-style` 값 — DOM 마커용 */
export function tierBorderStyle(tier: EvidenceTier): MarkerStrokeStyle {
  return evidenceTierStroke(tier);
}

/**
 * Canvas `setLineDash()` 인자.
 * 빈 배열이면 실선이다.
 */
export function tierLineDash(tier: EvidenceTier, scale = 1): number[] {
  switch (evidenceTierStroke(tier)) {
    case "dashed":
      return [4 * scale, 3 * scale];
    case "dotted":
      return [1.5 * scale, 3 * scale];
    case "solid":
    default:
      return [];
  }
}

/**
 * 마커 테두리 CSS 한 줄.
 *
 * @example
 *   border: ${tierBorderCss("claimed", 1.5, "rgba(255,160,60,0.9)")};
 *   // → "1.5px dashed rgba(255,160,60,0.9)"
 */
export function tierBorderCss(
  tier: EvidenceTier,
  widthPx: number,
  color: string,
): string {
  return `${widthPx}px ${tierBorderStyle(tier)} ${color}`;
}

/**
 * tier 별 불투명도 배수를 색에 적용한다.
 *
 * `rgba(r, g, b, a)` 형태만 처리한다. 다른 형식이면 원본을 그대로 돌려준다 —
 * **색을 깨뜨리느니 구분을 포기하는 게 낫다.**
 */
export function applyTierOpacity(rgba: string, tier: EvidenceTier): string {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
    rgba.trim(),
  );
  if (!m) return rgba;
  const base = m[4] != null ? Number(m[4]) : 1;
  if (!Number.isFinite(base)) return rgba;
  const next = Math.max(0, Math.min(1, base * evidenceTierOpacity(tier)));
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Number(next.toFixed(3))})`;
}

/**
 * 마커에 붙일 접근성 라벨.
 *
 * 시각 구분만으로는 색각·저시력 사용자에게 전달되지 않는다.
 * `aria-label` 이나 `title` 에 tier 를 명시해야 한다.
 */
export function tierAriaSuffix(tier: EvidenceTier, lang: "ko" | "en" = "ko"): string {
  const KO: Record<EvidenceTier, string> = {
    observed: "관측",
    reported: "보도",
    claimed: "당사자 주장",
    unverified: "미확인",
    model: "추정",
    synthetic: "합성",
  };
  const EN: Record<EvidenceTier, string> = {
    observed: "observed",
    reported: "reported",
    claimed: "claimed by a party",
    unverified: "unverified",
    model: "estimate",
    synthetic: "synthetic",
  };
  return lang === "ko" ? `(${KO[tier]})` : `(${EN[tier]})`;
}

/**
 * 범례 항목 — 사용자가 모양의 뜻을 알아야 구분이 작동한다.
 *
 * ⚠️ `synthetic` 은 프로덕션에 안 나가므로 범례에서도 뺀다.
 */
export const EVIDENCE_TIER_LEGEND: ReadonlyArray<{
  tier: EvidenceTier;
  style: MarkerStrokeStyle;
  ko: string;
  en: string;
}> = [
  { tier: "observed", style: "solid", ko: "관측 — 위성·항적", en: "Observed — satellite/tracks" },
  { tier: "reported", style: "solid", ko: "보도 — 교차 확인", en: "Reported — cross-checked" },
  { tier: "claimed", style: "dashed", ko: "당사자 주장 — 검증 없음", en: "Claimed — unverified" },
  { tier: "model", style: "dashed", ko: "추정 — 계산값", en: "Estimate — computed" },
  { tier: "unverified", style: "dotted", ko: "미확인 — 단일 전언", en: "Unverified — single source" },
];
