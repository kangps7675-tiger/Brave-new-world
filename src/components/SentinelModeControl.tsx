"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { SentinelFlyTarget } from "@/lib/sentinelMode";

type Props = {
  lang: LabelLanguage;
  active: boolean;
  current: SentinelFlyTarget | null;
  /** 지경학이면 경제 중심지 카피 */
  economyMode?: boolean;
  onToggle: () => void;
};

/**
 * SENTINEL MODE 토글 — 상황실 스크린세이버 진입/탈출.
 */
export function SentinelModeButton({
  lang,
  active,
  current,
  economyMode = false,
  onToggle,
}: Props) {
  const ko = lang !== "en";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={
        economyMode
          ? ko
            ? "센티넬 — 물류·에너지·금융 중심지를 자동 순회"
            : "Sentinel — auto-tour geoeconomic hubs"
          : ko
            ? "센티넬 — 긴장 전장을 자동으로 순회"
            : "Sentinel — auto-tour hot theaters"
      }
      className={
        active
          ? economyMode
            ? "pointer-events-auto rounded-sm border border-amber-400/50 bg-amber-950/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100 shadow-lg"
            : "pointer-events-auto rounded-sm border border-rose-400/50 bg-rose-950/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-100 shadow-lg"
          : "pointer-events-auto rounded-sm border border-slate-500/40 bg-slate-950/75 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 shadow-sm transition hover:border-rose-400/40 hover:text-rose-100"
      }
    >
      {active ? "SENTINEL · ON" : "SENTINEL"}
      {active && current ? (
        <span
          className={`mt-0.5 block truncate text-[9px] font-normal normal-case tracking-normal ${
            economyMode ? "text-amber-200/80" : "text-rose-200/80"
          }`}
        >
          #{current.rank} {ko ? current.labelKo : current.labelEn}
        </span>
      ) : null}
    </button>
  );
}

/** 센티넬 ON일 때 상단 드라이 바 */
export function SentinelHud({
  lang,
  current,
  index,
  total,
  economyMode = false,
  onExit,
}: {
  lang: LabelLanguage;
  current: SentinelFlyTarget | null;
  index: number;
  total: number;
  economyMode?: boolean;
  onExit: () => void;
}) {
  const ko = lang !== "en";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10040] flex justify-center px-3 pt-3 sm:pt-4">
      <div
        className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-sm border bg-[#05080f]/92 px-3 py-2 shadow-2xl backdrop-blur-md ${
          economyMode ? "border-amber-500/30" : "border-rose-500/30"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              economyMode ? "text-amber-300/90" : "text-rose-300/90"
            }`}
          >
            {economyMode ? "SENTINEL · GEOECONOMICS" : "SENTINEL MODE"}
          </p>
          <p className="truncate text-[12px] text-slate-200">
            {current
              ? `${ko ? current.labelKo : current.labelEn} · #${current.rank}`
              : ko
                ? "순회 준비 중…"
                : "Arming tour…"}
            {total > 0 ? (
              <span className="ml-2 text-[10px] text-slate-500">
                {index + 1}/{total}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded border border-slate-600/70 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-slate-400 hover:text-white"
        >
          {ko ? "종료" : "Exit"}
        </button>
      </div>
    </div>
  );
}
