"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  OBSERVE_STRAIT_PRESETS,
  type ObserveStraitId,
} from "@/lib/cesiumStraitScene";

type Props = {
  lang: LabelLanguage;
  activeId: ObserveStraitId;
  touring: boolean;
  onSelect: (id: ObserveStraitId) => void;
  onToggleTour: () => void;
};

/** 해협 3곳 프리셋 + 자동 순회 토글 — MapLibre 레이어판 아님 */
export function ObserveStraitTourChips({
  lang,
  activeId,
  touring,
  onSelect,
  onToggleTour,
}: Props) {
  const en = lang === "en";
  return (
    <div
      className="pointer-events-auto flex w-[min(520px,94vw)] flex-wrap items-center gap-1.5"
      role="group"
      aria-label={en ? "Strait scene tour" : "해협 씬 순회"}
    >
      {OBSERVE_STRAIT_PRESETS.map((p) => {
        const on = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(p.id)}
            className={`rounded border px-2 py-0.5 text-micro font-semibold tracking-wide transition ${
              on
                ? "border-sky-400/60 bg-sky-500/25 text-sky-50"
                : "border-white/15 bg-[#041018]/75 text-teal-100/55 hover:bg-white/5"
            }`}
          >
            {en ? p.nameEn : p.nameKo}
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={touring}
        onClick={onToggleTour}
        className={`rounded border px-2 py-0.5 text-micro font-semibold tracking-wide transition ${
          touring
            ? "border-amber-400/55 bg-amber-500/20 text-amber-50"
            : "border-white/15 bg-[#041018]/75 text-teal-100/55 hover:bg-white/5"
        }`}
      >
        {touring
          ? en
            ? "Auto tour · on"
            : "자동 순회 · 켜짐"
          : en
            ? "Auto tour · off"
            : "자동 순회 · 꺼짐"}
      </button>
    </div>
  );
}
