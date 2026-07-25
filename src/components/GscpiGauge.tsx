"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  formatSigma,
  gscpiDisclaimer,
  gscpiLevelColor,
  gscpiLevelLabel,
  type GscpiReading,
} from "@/lib/gscpi";

type GscpiGaugeProps = {
  reading: GscpiReading | null;
  lang: LabelLanguage;
  /** 컴팩트(칩) 모드 */
  compact?: boolean;
  className?: string;
};

/**
 * 글로벌 공급망 압력 게이지 — GSCPI 최신 z-score를 한눈에.
 * PortWatch(초크포인트별)와 짝을 이루는 "전 세계 종합" 지표.
 */
export function GscpiGauge({ reading, lang, compact = false, className = "" }: GscpiGaugeProps) {
  const en = lang === "en";
  if (!reading) return null;

  const color = gscpiLevelColor(reading.level);
  // -2σ ~ +4σ 범위를 0~100%로 (게이지 바 위치)
  const pct = Math.max(0, Math.min(100, ((reading.value + 2) / 6) * 100));
  const deltaText =
    reading.deltaFromPrev != null
      ? `${reading.deltaFromPrev > 0 ? "▲" : reading.deltaFromPrev < 0 ? "▼" : "·"} ${Math.abs(reading.deltaFromPrev).toFixed(2)}`
      : null;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}
        style={{ borderColor: `${color}55`, color }}
        title={gscpiDisclaimer(lang)}
      >
        <span className="opacity-80">{en ? "Supply-chain" : "공급망"}</span>
        <span className="font-bold">{formatSigma(reading.value)}</span>
        <span className="opacity-70">{gscpiLevelLabel(reading.level, lang)}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-slate-600/30 bg-[#0b1020]/90 px-4 py-3 shadow-lg backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wide text-slate-300">
          {en ? "Global Supply-Chain Pressure" : "글로벌 공급망 압력"}
        </p>
        <span className="text-[10px] text-slate-500">{reading.date}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {formatSigma(reading.value)}
        </span>
        <span className="text-[12px] font-medium" style={{ color }}>
          {gscpiLevelLabel(reading.level, lang)}
        </span>
        {deltaText ? (
          <span className="text-[11px] text-slate-400">
            {deltaText} {en ? "vs prev" : "전월비"}
          </span>
        ) : null}
      </div>

      {/* 게이지 바 (-2σ ~ +4σ) */}
      <div className="mt-2.5 h-2 rounded-full bg-slate-700/50">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-slate-600">
        <span>-2σ</span>
        <span>0</span>
        <span>+2σ</span>
        <span>+4σ</span>
      </div>

      <p className="mt-2.5 border-t border-slate-600/20 pt-2 text-[9px] leading-4 text-slate-500">
        {gscpiDisclaimer(lang)}
      </p>
    </div>
  );
}
