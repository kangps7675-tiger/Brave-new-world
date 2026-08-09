"use client";

import {
  scenarioPresetsForMode,
  type ScenarioPresetId,
} from "@/lib/scenarioPresets";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 시나리오 프리셋 칩 (P2-1) — **일반 모드**용.
 *
 * `CompactPresetChips`는 Ultra-Lite 전용이라 일반 모드에는 "무엇을 켤지"에
 * 대한 답이 없었다. 사용자는 88개 체크박스를 손으로 조합해야 했고
 * 매 클릭이 debounce만큼 쌓였다(Hick's Law + 도허티 임계 동시 위반).
 *
 * 칩 하나 = 레이어 세트 + 카메라 + 하단 Intel이 **한 번에** 바뀐다.
 */

type Props = {
  mode: ViewerMode;
  activeId: ScenarioPresetId | null;
  lang?: LabelLanguage;
  onSelect: (id: ScenarioPresetId) => void;
};

export function ScenarioPresetChips({ mode, activeId, lang = "ko", onSelect }: Props) {
  const presets = scenarioPresetsForMode(mode);
  const economy = mode === "economy";

  return (
    <div
      className="pointer-events-auto flex max-w-full flex-wrap justify-start gap-1.5"
      role="toolbar"
      aria-label={lang === "en" ? "Scenario presets" : "시나리오 프리셋"}
    >
      {presets.map((preset) => {
        const active = preset.id === activeId;
        const label = lang === "en" ? preset.labelEn : preset.labelKo;
        const hint = lang === "en" ? preset.hintEn : preset.hintKo;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            /* 칩 라벨만으로는 무엇이 켜지는지 알 수 없다 — 설명을 접근성 이름에 포함 */
            aria-label={`${label} — ${hint}`}
            title={hint}
            onClick={() => onSelect(preset.id)}
            className={`tap-target min-h-[var(--tap-target-min)] rounded-full border px-3 py-2 text-caption font-semibold tracking-tight shadow-lg backdrop-blur-md transition ${
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
