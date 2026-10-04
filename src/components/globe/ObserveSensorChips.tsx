"use client";

import { useSyncExternalStore } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  getStraitReplayEnabled,
  setStraitReplayEnabled,
  subscribeStraitReplayEnabled,
} from "@/lib/straitReplay/uiBridge";

type ChipId =
  | "tracks"
  | "frontline"
  | "hazards"
  | "neptun"
  | "events"
  | "strait-history";

type Props = {
  lang: LabelLanguage;
  tracksOn: boolean;
  frontlineOn: boolean;
  hazardsOn: boolean;
  neptunOn: boolean;
  eventsOn: boolean;
  onToggle: (id: Exclude<ChipId, "strait-history">, next: boolean) => void;
};

/**
 * 관측(Cesium) 전용 센서 묶음 — MapLibre 레이어판 복제 금지.
 * 기존 LayerPrefs 토글만 묶는다. 「해협 이력」만 리플레이 브리지로 분리.
 */
export function ObserveSensorChips({
  lang,
  tracksOn,
  frontlineOn,
  hazardsOn,
  neptunOn,
  eventsOn,
  onToggle,
}: Props) {
  const straitHistoryOn = useSyncExternalStore(
    subscribeStraitReplayEnabled,
    getStraitReplayEnabled,
    () => false,
  );
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
    {
      id: "events",
      on: eventsOn,
      label: en ? "Events" : "전장 사건",
    },
    {
      id: "strait-history",
      on: straitHistoryOn,
      label: en ? "Strait history" : "해협 이력",
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
          onClick={() => {
            if (c.id === "strait-history") {
              setStraitReplayEnabled(!c.on);
              return;
            }
            onToggle(c.id, !c.on);
          }}
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
