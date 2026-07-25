"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  formatSigma,
  gscpiDisclaimer,
  gscpiLevelColor,
  gscpiLevelLabel,
  gscpiScore100,
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
 * 전 세계 물류 혼잡도 게이지 — GSCPI를 0~100 점수로 풀어서 보여준다.
 * PortWatch(초크포인트별)와 짝을 이루는 "전 세계 종합" 지표.
 */
export function GscpiGauge({ reading, lang, compact = false, className = "" }: GscpiGaugeProps) {
  const en = lang === "en";
  // 데이터 로딩 전에도 칩 자리를 지킨다 (조용히 사라지면 지표가 없는 것처럼 보임)
  if (!reading) {
    if (!compact) return null;
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-[#0a1f18]/85 px-2.5 py-1 text-[11px] font-medium text-emerald-100/70 ${className}`}
        title={gscpiDisclaimer(lang)}
      >
        <span className="opacity-80">{en ? "Shipping congestion" : "물류 혼잡도"}</span>
        <span className="tabular-nums opacity-60">{en ? "loading…" : "불러오는 중…"}</span>
      </div>
    );
  }

  const color = gscpiLevelColor(reading.level);
  const score = gscpiScore100(reading.value);
  const title = en ? "Shipping congestion" : "물류 혼잡도";
  const deltaText =
    reading.deltaFromPrev != null && reading.deltaFromPrev !== 0
      ? `${reading.deltaFromPrev > 0 ? "지난달보다 나빠짐" : "지난달보다 나아짐"}`
      : null;
  const deltaTextEn =
    reading.deltaFromPrev != null && reading.deltaFromPrev !== 0
      ? `${reading.deltaFromPrev > 0 ? "worse" : "better"} than last month`
      : null;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}
        style={{
          borderColor: `${color}55`,
          color,
          background: "rgba(10, 31, 24, 0.85)",
        }}
        title={gscpiDisclaimer(lang)}
      >
        <span className="opacity-80">{title}</span>
        <span className="font-bold tabular-nums">
          {score}
          <span className="font-medium opacity-60">/100</span>
        </span>
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
          {en ? "Global shipping congestion" : "전 세계 물류 혼잡도"}
        </p>
        <span className="text-[10px] text-slate-500">{reading.date}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
          <span className="text-[13px] font-medium opacity-60">/100</span>
        </span>
        <span className="text-[12px] font-medium" style={{ color }}>
          {gscpiLevelLabel(reading.level, lang)}
        </span>
        {deltaText ? (
          <span className="text-[11px] text-slate-400">{en ? deltaTextEn : deltaText}</span>
        ) : null}
      </div>

      <div className="mt-2.5 h-2 rounded-full bg-slate-700/50">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-slate-600">
        <span>{en ? "0 · smooth" : "0 · 원활"}</span>
        <span>{en ? "100 · severe" : "100 · 매우 혼잡"}</span>
      </div>

      <p className="mt-2.5 border-t border-slate-600/20 pt-2 text-[9px] leading-4 text-slate-500">
        {gscpiDisclaimer(lang)} (GSCPI {formatSigma(reading.value)})
      </p>
    </div>
  );
}
