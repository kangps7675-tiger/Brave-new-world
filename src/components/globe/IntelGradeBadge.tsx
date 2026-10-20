"use client";

import { gradeHint, INTEL_UX } from "@/lib/intelContract/uxCopy";
import { gradeLabel } from "@/lib/intelContract/publish";
import type { DisplayGrade } from "@/lib/intelContract/types";
import type { LabelLanguage } from "@/lib/layerPrefs";

const STYLE: Record<DisplayGrade, string> = {
  high: "border-emerald-500/50 bg-emerald-900/50 text-emerald-100",
  std: "border-sky-500/45 bg-sky-950/55 text-sky-100",
  low: "border-amber-500/40 bg-amber-950/50 text-amber-100",
  hold: "border-stone-500/40 bg-stone-900/60 text-stone-200",
  drop: "border-rose-700/40 bg-rose-950/50 text-rose-200",
};

export function IntelGradeBadge({
  grade,
  lang,
  className = "",
  showHint = true,
}: {
  grade: DisplayGrade;
  lang: LabelLanguage;
  className?: string;
  /** title 툴팁으로 등급 의미 설명 */
  showHint?: boolean;
}) {
  const en = lang === "en";
  const label = gradeLabel(grade, en ? "en" : "ko");
  const hint = showHint ? gradeHint(grade, lang) : undefined;
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-micro font-semibold tracking-wide ${STYLE[grade]} ${className}`}
      title={hint}
      aria-label={`${INTEL_UX.gradeBadgeAria[en ? "en" : "ko"]}: ${label}`}
    >
      {label}
    </span>
  );
}
