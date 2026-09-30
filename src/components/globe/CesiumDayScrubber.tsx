"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  /** 0–24 UTC 시각 (하루 리플레이) */
  hourUtc: number;
  onChangeHour: (hour: number) => void;
  onResetLive: () => void;
  playing: boolean;
  onTogglePlay: () => void;
};

/**
 * Cesium 관측 — 하루(낮/밤) 타임 스크럽·리플레이.
 * 항적 히스토리 재생이 아니라 태양/야경 시계만 돌린다.
 */
export function CesiumDayScrubber({
  lang,
  hourUtc,
  onChangeHour,
  onResetLive,
  playing,
  onTogglePlay,
}: Props) {
  const en = lang === "en";
  const label = useMemo(() => {
    const h = Math.floor(hourUtc) % 24;
    const m = Math.round((hourUtc % 1) * 60) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} UTC`;
  }, [hourUtc]);

  return (
    <div
      role="region"
      aria-label={en ? "Day / night scrubber" : "낮·밤 시간 스크럽"}
      className="pointer-events-auto flex w-[min(420px,92vw)] flex-col gap-1.5 rounded-md border border-teal-500/35 bg-[#041018]/90 px-3 py-2 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2 text-meta text-teal-100/90">
        <span className="font-medium tracking-wide">
          {en ? "Day cycle" : "하루 리플레이"}
        </span>
        <span className="tabular-nums text-teal-200/80">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={24}
        step={0.25}
        value={hourUtc}
        onChange={(e) => onChangeHour(Number(e.target.value))}
        className="w-full accent-teal-400"
        aria-valuetext={label}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded border border-teal-400/40 bg-teal-500/15 px-2 py-0.5 text-micro font-semibold text-teal-50 hover:bg-teal-500/25"
        >
          {playing
            ? en
              ? "Pause"
              : "일시정지"
            : en
              ? "Play day"
              : "하루 재생"}
        </button>
        <button
          type="button"
          onClick={onResetLive}
          className="rounded border border-white/15 px-2 py-0.5 text-micro text-teal-100/80 hover:bg-white/5"
        >
          {en ? "Live now" : "지금 시각"}
        </button>
        <p className="text-micro leading-snug text-teal-200/50">
          {en
            ? "Sun & city lights only — tracks stay live"
            : "태양·야경만 · 항적은 실시간 유지"}
        </p>
      </div>
    </div>
  );
}

/** 부모에서 초기 시각을 “지금 UTC 시각”으로 맞출 때 */
export function utcHourNow(): number {
  const d = new Date();
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

export function useCesiumDayScrubState() {
  const [hourUtc, setHourUtc] = useState(utcHourNow);
  const [playing, setPlaying] = useState(false);
  return { hourUtc, setHourUtc, playing, setPlaying };
}
