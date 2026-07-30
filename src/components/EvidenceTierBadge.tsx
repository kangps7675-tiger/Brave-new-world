"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  evidenceTierHint,
  evidenceTierLabel,
  type EvidenceTier,
} from "@/lib/evidenceTier";

export type { EvidenceTier };
export { evidenceTierLabel, evidenceTierHint };

/**
 * 데이터 신뢰도 계층 — TrustBadgeChip(매체 신뢰도 T1/T2/T3)과는 다른 축.
 * "이 정보가 애초에 어떤 종류인가"를 표시한다:
 *   observed   — 위성·AIS·ADS-B 등 센서 신호
 *   reported   — 매체 보도·교차 확인
 *   unverified — 텔레그램 등 미확인 전언
 *   model      — WTI처럼 우리가 만든 점수
 */

const TIER_STYLE_DARK: Record<EvidenceTier, { bg: string; border: string; text: string }> = {
  observed: { bg: "bg-emerald-500/15", border: "border-emerald-400/40", text: "text-emerald-200" },
  reported: { bg: "bg-sky-500/15", border: "border-sky-400/40", text: "text-sky-200" },
  unverified: { bg: "bg-slate-500/20", border: "border-slate-400/40", text: "text-slate-300" },
  model: { bg: "bg-violet-500/15", border: "border-violet-400/40", text: "text-violet-200" },
};

/** 양피지(밝은) 배경용 — 텍스트를 진하게, 배경은 옅게 */
const TIER_STYLE_LIGHT: Record<EvidenceTier, { bg: string; border: string; text: string }> = {
  observed: { bg: "bg-emerald-600/10", border: "border-emerald-700/35", text: "text-emerald-900" },
  reported: { bg: "bg-sky-600/10", border: "border-sky-700/35", text: "text-sky-900" },
  unverified: { bg: "bg-slate-600/10", border: "border-slate-700/35", text: "text-slate-800" },
  model: { bg: "bg-violet-600/10", border: "border-violet-700/35", text: "text-violet-900" },
};

export function EvidenceTierBadge({
  tier,
  lang,
  surface = "dark",
  className,
}: {
  tier: EvidenceTier;
  lang: LabelLanguage;
  /** dark=단말기/패널(기본), light=양피지 편지류 */
  surface?: "dark" | "light";
  className?: string;
}) {
  const style = surface === "light" ? TIER_STYLE_LIGHT[tier] : TIER_STYLE_DARK[tier];
  return (
    <span
      title={evidenceTierHint(tier, lang)}
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] ${style.bg} ${style.border} ${style.text} ${className ?? ""}`}
    >
      {evidenceTierLabel(tier, lang)}
    </span>
  );
}
