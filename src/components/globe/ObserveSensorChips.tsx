"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";

type ChipId = "tracks" | "frontline" | "hazards" | "neptun";

type Props = {
  lang: LabelLanguage;
  tracksOn: boolean;
  frontlineOn: boolean;
  hazardsOn: boolean;
  neptunOn: boolean;
  onToggle: (id: ChipId, next: boolean) => void;
};

/**
 * 관측(Cesium) 전용 센서 묶음 — MapLibre 레이어판 복제 금지.
 * 기존 LayerPrefs 토글만 묶는다.
 */
export function ObserveSensorChips({
  lang,
  tracksOn,
  frontlineOn,
  hazardsOn,
  neptunOn,
  onToggle,
}: Props) {
  const en = lang === "en";
  const chips: Array<{ id: ChipId; on: boolean; label: string }> = [
    {
      id: "tracks",
      on: tracksOn,
      label: en ? "Tracks" : "항적",
    },
    {
      id: "frontline",
      on: frontlineOn,
      label: en ? "Fronts" : "전선",
    },
    {
      id: "hazards",
      on: hazardsOn,
      label: en ? "Fire·missile" : "화재·미사일",
    },
    {
      id: "neptun",
      on: neptunOn,
      label: en ? "Air threats" : "공중 위협",
    },
  ];

  return (
    <div
      className="pointer-events-auto flex w-[min(520px,94vw)] flex-wrap items-center gap-1.5"
      role="group"
      aria-label={en ? "Observatory sensors" : "관측 센서"}
    >
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={c.on}
          onClick={() => onToggle(c.id, !c.on)}
          className={`rounded border px-2 py-0.5 text-micro font-semibold tracking-wide transition ${
            c.on
              ? "border-teal-400/55 bg-teal-500/25 text-teal-50"
              : "border-white/15 bg-[#041018]/75 text-teal-100/55 hover:bg-white/5"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
