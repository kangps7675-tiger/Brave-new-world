"use client";

import { useMemo } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { usePortWatchObservations } from "@/hooks/usePortWatchObservations";
import { summarizePortWatchStress } from "@/lib/portWatchHudSummary";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type Props = {
  lang: LabelLanguage;
  className?: string;
};

/**
 * PortWatch elevated+ 초크 건수 / worst level — 합산 점수 없음.
 */
export function PortWatchStressChip({ lang, className = "" }: Props) {
  const ko = lang !== "en";
  const byChoke = usePortWatchObservations();
  const summary = useMemo(() => summarizePortWatchStress(byChoke), [byChoke]);

  const bandLabel =
    summary.band === "critical"
      ? ko
        ? "긴장"
        : "critical"
      : summary.band === "friction"
        ? ko
          ? "마찰"
          : "friction"
        : ko
          ? "정상"
          : "normal";

  const light = useBasemapTone() === "light";
  const bandTone =
    summary.band === "critical"
      ? light
        ? "text-rose-700 border-rose-600/45"
        : "text-rose-300 border-rose-400/35"
      : summary.band === "friction"
        ? light
          ? "text-amber-800 border-amber-600/45"
          : "text-amber-300 border-amber-400/35"
        : light
          ? "text-emerald-700 border-emerald-600/40"
          : "text-emerald-300/90 border-emerald-400/30";

  return (
    <div
      className={`portwatch-stress-chip tone-chip rounded-lg border border-violet-400/25 bg-[#0a0f1f]/88 px-2.5 py-1.5 shadow-lg backdrop-blur-md ${className}`}
      title={ko ? "IMF PortWatch · elevated 초크 수" : "IMF PortWatch · elevated chokes"}
    >
      <p
        className={`text-[9px] font-semibold uppercase tracking-wider ${
          light ? "text-violet-800" : "text-violet-200/80"
        }`}
      >
        PortWatch
      </p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          className={`font-mono text-[12px] font-semibold tabular-nums ${
            light ? "text-slate-800" : "text-slate-100"
          }`}
        >
          {summary.elevatedPlus}
          <span className={`text-[10px] font-normal ${light ? "text-slate-600" : "text-slate-500"}`}>
            /{summary.totalChokes}
          </span>
        </span>
        <span className={`rounded border px-1 py-px text-[9px] font-semibold ${bandTone}`}>
          {bandLabel}
        </span>
      </div>
    </div>
  );
}
