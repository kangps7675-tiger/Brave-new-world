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
    "pointer-events-auto flex cursor-pointer select-none items-center gap-1.5 px-2 py-1 font-mono text-micro uppercase tracking-wider text-amber-100/80 transition hover:text-amber-50 has-[:checked]:text-amber-50";
  const box = "h-3 w-3 cursor-pointer accent-amber-400";
  return (
    <div
      className="pointer-events-auto flex w-fit flex-col divide-y divide-amber-600/20 self-end overflow-hidden rounded-[3px] border border-amber-600/30 bg-[#0d0a06]/94 backdrop-blur-md"
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
        {en ? "Vessels" : "선박 AIS"}
      </label>
      <label className={row}>
        <input
          type="checkbox"
          className={box}
          checked={aircraftOn}
          onChange={(e) => onAircraftChange(e.target.checked)}
        />
        {en ? "Aircraft" : "항공기"}
      </label>
    </div>
  );
}
