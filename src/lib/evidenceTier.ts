/**
 * 증거 종류 축 — 매체 Tier(T1–3)와 별개.
 * UI 배지·레이어 신뢰도 레지스트리가 공유.
 *
 * 이 축은 "얼마나 진실인가"가 아니라 **"어떤 종류의 앎인가"** 를 말한다.
 * 관측과 주장은 서로 더 참인 관계가 아니라, 다른 종류다.
 *
 * 2026-07-31 감사 후 2단계 추가:
 *   - `claimed`   교전 당사자(정부·군)의 발표. ArmyInform·러 국방부 등.
 *                 관측과 시각적으로 구분되지 않으면 제품의 인식론이 무너진다.
 *   - `synthetic` 데모·플레이스홀더. 프로덕션 빌드에서 자동 제외된다.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export type EvidenceTier =
  | "observed"
  | "reported"
  | "claimed"
  | "unverified"
  | "model"
  | "synthetic";

export const EVIDENCE_TIERS: readonly EvidenceTier[] = [
  "observed",
  "reported",
  "claimed",
  "unverified",
  "model",
  "synthetic",
] as const;

const TIER_LABEL: Record<EvidenceTier, { ko: string; en: string }> = {
  observed: { ko: "관측", en: "Observed" },
  reported: { ko: "보도", en: "Reported" },
  claimed: { ko: "당사자 주장", en: "Claimed" },
  unverified: { ko: "미확인", en: "Unverified" },
  model: { ko: "추정", en: "Estimate" },
  synthetic: { ko: "합성", en: "Synthetic" },
};

const TIER_HINT: Record<EvidenceTier, { ko: string; en: string }> = {
  observed: {
    ko: "위성·항적처럼 기계가 잡아낸 신호",
    en: "Machine-sensed signal (satellite, tracks, etc.)",
  },
  reported: {
    ko: "매체가 전하고 교차로 잡힌 내용",
    en: "Cross-checked media reporting",
  },
  claimed: {
    ko: "교전 당사국이 발표한 내용 · 독립 검증 없음",
    en: "Announced by a party to the conflict — not independently verified",
  },
  unverified: {
    ko: "한 경로만의 전언 · 아직 확인되지 않음",
    en: "Single-source claim · not yet confirmed",
  },
  model: {
    ko: "우리가 계산한 점수 · 관측 원본이 아님",
    en: "Our computed score · not a raw observation",
  },
  synthetic: {
    ko: "실제 관측이 아닌 데모·플레이스홀더 데이터",
    en: "Demo / placeholder data — not a real observation",
  },
};

/**
 * 렌더 스타일 힌트 — 관측은 실선, 주장은 점선.
 * 마커·폴리곤 컴포넌트가 이 값을 읽어 시각적으로 구분한다.
 */
const TIER_STROKE: Record<EvidenceTier, "solid" | "dashed" | "dotted"> = {
  observed: "solid",
  reported: "solid",
  claimed: "dashed",
  unverified: "dotted",
  model: "dashed",
  synthetic: "dotted",
};

/** 불투명도 배수 — 확신이 낮을수록 흐리게. */
const TIER_OPACITY: Record<EvidenceTier, number> = {
  observed: 1,
  reported: 0.95,
  claimed: 0.75,
  unverified: 0.6,
  model: 0.8,
  synthetic: 0.4,
};

/**
 * 프로덕션 빌드에서 제외할 tier.
 * `synthetic` 은 데모 데이터이므로 사용자에게 절대 노출되면 안 된다.
 */
const PRODUCTION_EXCLUDED: ReadonlySet<EvidenceTier> = new Set<EvidenceTier>(["synthetic"]);

export function evidenceTierLabel(tier: EvidenceTier, lang: LabelLanguage): string {
  return TIER_LABEL[tier][lang];
}

export function evidenceTierHint(tier: EvidenceTier, lang: LabelLanguage): string {
  return TIER_HINT[tier][lang];
}

export function evidenceTierStroke(tier: EvidenceTier): "solid" | "dashed" | "dotted" {
  return TIER_STROKE[tier];
}

export function evidenceTierOpacity(tier: EvidenceTier): number {
  return TIER_OPACITY[tier];
}

/** 프로덕션에서 이 tier 의 레이어를 노출해도 되는가. */
export function isEvidenceTierShippable(tier: EvidenceTier): boolean {
  return !PRODUCTION_EXCLUDED.has(tier);
}

/**
 * 교차 검증으로 tier 를 승격한다.
 *
 * 예: ArmyInform 타격 주장(`claimed`) 이 NASA FIRMS 위성 열점과
 *     반경·시간 창 안에서 일치하면 `reported` 로 올린다.
 *
 * ⚠️ 반대 방향(강등)은 하지 않는다. 위성은 야간·구름·소규모 타격을 놓친다.
 *    "확인되지 않음"은 "일어나지 않음"이 아니다.
 */
export function promoteEvidenceTier(
  base: EvidenceTier,
  corroborated: boolean,
): EvidenceTier {
  if (!corroborated) return base;
  if (base === "claimed" || base === "unverified") return "reported";
  return base;
}
