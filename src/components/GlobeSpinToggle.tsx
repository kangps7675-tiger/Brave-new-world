"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type GlobeSpinToggleProps = {
  spinning: boolean;
  onToggle: () => void;
  lang: LabelLanguage;
  className?: string;
};

/**
 * 지구본 은은한 자전 ON/OFF.
 * 좌하단 — HoverNav·우상단 지표·하단 인텔 도크와 겹치지 않게 배치.
 * 텔레그램 OSINT 미니 패널이 열리면 DashboardTopChrome이 위로 밀어 올린다.
 */
export function GlobeSpinToggle({
  spinning,
  onToggle,
  lang,
  className = "",
}: GlobeSpinToggleProps) {
  const light = useBasemapTone() === "light";
  const label = spinning
    ? t("globeSpinPause", lang)
    : t("globeSpinResume", lang);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!spinning}
      aria-label={label}
      title={label}
      className={`map-chrome-control pointer-events-auto flex h-11 items-center gap-2 rounded-full border px-3.5 text-caption font-medium shadow-lg transition ${
        light
          ? spinning
            ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            : "border-amber-400/70 bg-white text-amber-950 hover:bg-amber-50"
          : spinning
            ? "border-sky-300/25 bg-[#0a1830]/80 text-sky-100 backdrop-blur-md hover:border-sky-200/40 hover:bg-[#0c2040]/90"
            : "border-amber-300/35 bg-[#1a1408]/85 text-amber-100 backdrop-blur-md hover:border-amber-200/50 hover:bg-[#241a0c]/92"
      } ${className}`}
    >
      <span className="text-[14px] leading-none" aria-hidden>
        {spinning ? "⏸" : "▶"}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
