"use client";

import type { DisplayGrade, ObservationModality } from "@/lib/intelContract/types";
import { MODALITY_RING_COLOR } from "@/lib/intelContract/deskVerifySequence";
import { coolCssColor } from "@/lib/intelContract/deskDynamics";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  grade: DisplayGrade;
  independenceCount: number;
  modalities: ObservationModality[];
  disconfirmHitCount?: number;
  /** 승격 직후 짧게 들어 올림 */
  promoting?: boolean;
  className?: string;
};

/**
 * 등급을 글자 배지 대신 핀 구조로 — 1출처=점, 2+=이질색 링.
 */
export function DeskPinStructure({
  lang,
  grade,
  independenceCount,
  modalities,
  disconfirmHitCount = 0,
  promoting = false,
  className = "",
}: Props) {
  const en = lang === "en";
  const indep = Math.max(0, Math.min(4, independenceCount));
  const ringCount = indep >= 2 ? indep : 0;
  const mods =
    modalities.length > 0 ? modalities : (["media"] as ObservationModality[]);
  const cooled = disconfirmHitCount > 0;
  const coreColor = coolCssColor(
    grade === "high"
      ? "#5eead4"
      : grade === "std"
        ? "#2dd4bf"
        : grade === "low"
          ? "#94a3b8"
          : "#64748b",
    disconfirmHitCount,
  );
  const size = grade === "high" ? 22 : grade === "std" ? 18 : grade === "low" ? 14 : 11;

  return (
    <span
      className={`relative inline-flex items-center justify-center ${promoting ? "animate-bounce" : ""} ${className}`}
      style={{
        width: size + ringCount * 6,
        height: size + ringCount * 6,
        transform: promoting ? "translateY(-4px) scale(1.15)" : undefined,
        transition: "transform 480ms ease-out",
      }}
      role="img"
      aria-label={`${INTEL_UX.gradeBadgeAria[en ? "en" : "ko"]}: ×${indep}${
        cooled ? (en ? ", cooled" : ", 식힘") : ""
      }`}
      data-desk-pin-structure
      data-grade={grade}
      data-indep={indep}
      data-disconfirm={disconfirmHitCount}
    >
      {Array.from({ length: ringCount }, (_, i) => {
        const mod = mods[i % mods.length]!;
        const c = coolCssColor(
          MODALITY_RING_COLOR[mod] ?? "#2dd4bf",
          disconfirmHitCount,
        );
        const dim = size + (ringCount - i) * 6;
        return (
          <span
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              width: dim,
              height: dim,
              border: `1.5px solid ${c}`,
              opacity: cooled ? 0.35 : 0.85 - i * 0.12,
              boxShadow: cooled ? undefined : `0 0 6px ${c}55`,
            }}
            aria-hidden
          />
        );
      })}
      <span
        className="relative rounded-full"
        style={{
          width: Math.max(6, size * 0.42),
          height: Math.max(6, size * 0.42),
          backgroundColor: coreColor,
          opacity: grade === "hold" ? 0.4 : cooled ? 0.55 : 1,
          boxShadow: cooled
            ? undefined
            : `0 0 8px ${coreColor}`,
          border:
            grade === "hold"
              ? "1px dashed rgba(148,163,184,0.7)"
              : "1px solid rgba(2,6,23,0.7)",
        }}
        aria-hidden
      />
    </span>
  );
}
