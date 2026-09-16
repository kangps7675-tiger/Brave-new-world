"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  formatSigma,
  gscpiDisclaimer,
  gscpiLevelColor,
  gscpiLevelLabel,
  gscpiPressureColor,
  gscpiPressureLabel,
  gscpiPressureLevel,
  gscpiScore100,
  type GscpiReading,
} from "@/lib/gscpi";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type GscpiGaugeProps = {
  reading: GscpiReading | null;
  lang: LabelLanguage;
  /** 컴팩트(칩) 모드 */
  compact?: boolean;
  className?: string;
};

/**
 * 지경학 상단 — GSCPI를 「공급망 압력」 1–5 단계로 보여 주는 게이지.
 * PortWatch(초크포인트별)와 짝을 이루는 전 세계 종합 지표.
 */
export function GscpiGauge({ reading, lang, compact = false, className = "" }: GscpiGaugeProps) {
  const en = lang === "en";
  const light = useBasemapTone() === "light";
  const title = en ? "Supply pressure" : "공급망 압력";

  if (!reading) {
    if (!compact) return null;
    return (
      <div
        className={`gscpi-gauge tone-chip flex items-center gap-2.5 rounded-xl border border-emerald-200/20 bg-[#0a1f18]/85 px-3 py-2 ${
          light ? "text-slate-700" : "text-emerald-100/70"
        } ${className}`}
        title={gscpiDisclaimer(lang)}
      >
        <span className="text-micro font-semibold uppercase tracking-[0.12em] opacity-80">
          {en ? "SCP" : "압력"}
        </span>
        <span className="text-meta tabular-nums opacity-60">
          {en ? "loading…" : "불러오는 중…"}
        </span>
      </div>
    );
  }

  const pressure = gscpiPressureLevel(reading.value);
  const color = gscpiPressureColor(pressure, light);
  const score = gscpiScore100(reading.value);
  const stageLabel = gscpiPressureLabel(pressure, lang);
  const deltaText =
    reading.deltaFromPrev != null && reading.deltaFromPrev !== 0
      ? reading.deltaFromPrev > 0
        ? en
          ? "worse than last month"
          : "지난달보다 나빠짐"
        : en
          ? "better than last month"
          : "지난달보다 나아짐"
      : null;

  if (compact) {
    return (
      <div
        className={`gscpi-gauge tone-chip flex items-center gap-2.5 rounded-xl border px-3 py-2 ${className}`}
        style={{
          borderColor: `${color}66`,
          background: light ? "rgba(255, 252, 248, 0.97)" : "rgba(10, 31, 24, 0.85)",
        }}
        title={gscpiDisclaimer(lang)}
        role="img"
        aria-label={`${title} ${pressure} — ${stageLabel}`}
      >
        <div className="flex flex-col items-center leading-none">
          <span
            className={`text-[0.58rem] font-semibold uppercase tracking-[0.14em] ${
              light ? "text-slate-600" : "text-slate-400/80"
            }`}
          >
            {en ? "SCP" : "압력"}
          </span>
          <span className="text-2xl font-black tabular-nums" style={{ color }}>
            {pressure}
          </span>
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-meta font-semibold" style={{ color }}>
            {stageLabel}
          </span>
          <span
            className={`text-micro tabular-nums ${light ? "text-slate-600" : "text-slate-400/75"}`}
          >
            {title}
            <span className="opacity-55"> · GSCPI</span>
          </span>
          {deltaText ? (
            <span className={`text-micro ${light ? "text-slate-600" : "text-slate-400/70"}`}>
              {deltaText}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const legacyColor = gscpiLevelColor(reading.level);
  return (
    <div
      className={`gscpi-gauge tone-chip min-w-0 overflow-hidden rounded-2xl border border-slate-600/30 bg-[#0b1020]/90 px-3 py-3 shadow-lg backdrop-blur-md sm:px-4 ${className}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-meta font-semibold tracking-wide text-slate-300">
          {en ? "Supply-chain pressure" : "공급망 압력"}
        </p>
        <span className="shrink-0 text-micro text-slate-500">{reading.date}</span>
      </div>

      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-2xl font-bold" style={{ color }}>
          {pressure}
          <span className="text-body font-medium opacity-60">/5</span>
        </span>
        <span className="text-caption font-medium" style={{ color }}>
          {stageLabel}
        </span>
        <span className="text-meta text-slate-400">
          {score}/100 · {gscpiLevelLabel(reading.level, lang)}
        </span>
        {deltaText ? <span className="text-meta text-slate-400">{deltaText}</span> : null}
      </div>

      <div className="mt-2.5 h-2 rounded-full bg-slate-700/50">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${(pressure / 5) * 100}%`, background: color || legacyColor }}
        />
      </div>
      <div className="mt-1 flex justify-between text-micro text-slate-600">
        <span>{en ? "1 · smooth" : "1 · 원활"}</span>
        <span>{en ? "5 · severe" : "5 · 심각"}</span>
      </div>

      <p className="mt-2.5 break-words border-t border-slate-600/20 pt-2 text-micro leading-4 text-slate-500">
        {gscpiDisclaimer(lang)} (GSCPI {formatSigma(reading.value)})
      </p>
    </div>
  );
}
