"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  vesselsOn: boolean;
  aircraftOn: boolean;
  onVesselsChange: (next: boolean) => void;
  onAircraftChange: (next: boolean) => void;
};

/** 지정학 지도 우상단 — 선박(AIS)·항공기(ADS-B) 위치 추적 켜고 끄기. */
export function TrackingToggles({
  lang,
  vesselsOn,
  aircraftOn,
  onVesselsChange,
  onAircraftChange,
}: Props) {
  const en = lang === "en";
  const row =
    "pointer-events-auto flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1 text-meta font-medium text-white/85 transition hover:text-white sm:text-xs";
  const box = "h-3.5 w-3.5 cursor-pointer accent-sky-400";
  return (
    <div
      className="pointer-events-auto flex w-fit flex-col self-end rounded-lg border border-white/15 bg-black/35 p-0.5 backdrop-blur-sm"
      role="group"
      aria-label={en ? "Position tracking" : "위치 추적"}
    >
      <label className={row}>
        <input
          type="checkbox"
          className={box}
          checked={vesselsOn}
          onChange={(e) => onVesselsChange(e.target.checked)}
        />
        {en ? "Track vessels" : "선박 위치 추적"}
      </label>
      <label className={row}>
        <input
          type="checkbox"
          className={box}
          checked={aircraftOn}
          onChange={(e) => onAircraftChange(e.target.checked)}
        />
        {en ? "Track aircraft" : "항공기 위치 추적"}
      </label>
    </div>
  );
}
