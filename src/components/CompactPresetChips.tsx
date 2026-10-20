"use client";

import {
  compactPresetsForMode,
  type CompactChipId,
} from "@/lib/compactViewPreset";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type CompactPresetChipsProps = {
  mode: ViewerMode;
  activeId: CompactChipId;
  lang?: LabelLanguage;
  onSelect: (id: CompactChipId) => void;
};

export function CompactPresetChips({
  mode,
  activeId,
  lang = "ko",
  onSelect,
}: CompactPresetChipsProps) {
  const presets = compactPresetsForMode(mode);
  const economy = mode === "economy";

  return (
    <div
      className="pointer-events-auto flex max-w-full flex-wrap justify-start gap-1.5"
      role="toolbar"
      aria-label={lang === "en" ? "Compact view presets" : "간이 보기 프리셋"}
    >
      {presets.map((chip) => {
        const active = chip.id === activeId;
        const label = lang === "en" ? chip.labelEn : chip.labelKo;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(chip.id)}
            className={`tap-target min-h-[44px] min-w-[4.5rem] rounded-full border px-3 py-2 text-caption font-semibold tracking-tight shadow-lg backdrop-blur-md transition ${
              active
                ? economy
                  ? "border-emerald-300/55 bg-emerald-500/25 text-emerald-50"
                  : "border-sky-300/55 bg-sky-500/25 text-sky-50"
                : economy
                  ? "border-emerald-400/20 bg-[#0a1a14]/75 text-emerald-100/80 hover:border-emerald-300/40"
                  : "border-sky-400/20 bg-[#0a1830]/75 text-sky-100/80 hover:border-sky-300/40"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
