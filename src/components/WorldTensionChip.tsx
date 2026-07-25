"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import { wtiBand, wtiBandLabel, type WtiBand } from "@/lib/wti";

type WorldTensionChipProps = {
  /** WTI 전 지구 긴장도 점수 (0~100) */
  score: number | null;
  /** 전일 대비 델타 (WTI 스코어 스케일) */
  deltaScore?: number | null;
  /** 이 점수를 가져온 시각 (ISO) — 상황판 "기준 시각" 표시용 */
  asOf?: string | null;
  lang: LabelLanguage;
  className?: string;
};

const RING_RADIUS = 13;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function bandColor(band: WtiBand): string {
  switch (band) {
    case "critical":
      return "#f87171";
    case "high":
      return "#fb923c";
    case "elevated":
      return "#fbbf24";
    default:
      return "#34d399";
  }
}

function formatAsOfTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
}

/**
 * 지정학 뷰 우상단 — 전 세계 긴장도를 "67/100 · 고조"처럼 점수로 보여주는 배지.
 * 링 게이지가 곧 점수 비율이라 별도 설명 없이도 읽힌다.
 */
export function WorldTensionChip({
  score,
  deltaScore,
  asOf,
  lang,
  className,
}: WorldTensionChipProps) {
  // 점수가 아직 없으면 사라지지 않고 "집계 중"으로 자리를 지킨다
  if (score == null || !Number.isFinite(score)) {
    return (
      <div
        className={`flex items-center gap-2 rounded-full border border-slate-400/25 bg-black/55 px-2.5 py-1.5 ${className ?? ""}`}
        title={t("worldTensionHint", lang)}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300/85">
          {t("worldTensionTitle", lang)}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-slate-400/70">
          {lang === "en" ? "computing…" : "집계 중…"}
        </span>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = wtiBand(clamped);
  const color = bandColor(band);
  const urgent = band === "critical";
  const asOfLabel = formatAsOfTime(asOf);

  const delta = deltaScore != null && Number.isFinite(deltaScore) ? Math.round(deltaScore) : null;
  const deltaLabel =
    delta != null && delta !== 0
      ? delta > 0
        ? t("worldTensionDeltaUp", lang).replace("{n}", String(delta))
        : t("worldTensionDeltaDown", lang).replace("{n}", String(Math.abs(delta)))
      : null;

  const bandLabel = wtiBandLabel(band, lang !== "en");

  return (
    <div
      className={`flex items-center gap-2 rounded-full border bg-black/55 px-2.5 py-1.5 transition-colors ${
        urgent ? "animate-pulse" : ""
      } ${className ?? ""}`}
      style={{ borderColor: `${color}59` }}
      title={t("worldTensionHint", lang)}
      role="img"
      aria-label={`${t("worldTensionTitle", lang)} — ${clamped}/100 ${bandLabel}`}
    >
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r={RING_RADIUS}
          fill="rgba(6,10,18,0.85)"
          stroke="rgba(148,163,184,0.28)"
          strokeWidth="3"
        />
        <circle
          cx="16"
          cy="16"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          transform="rotate(-90 16 16)"
        />
        <text
          x="16"
          y="16"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="700"
          fill={color}
        >
          {clamped}
        </text>
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300/85">
          {t("worldTensionTitle", lang)}
        </span>
        <span className="text-[11px] font-medium tabular-nums" style={{ color }}>
          {clamped}
          <span className="opacity-60">/100</span> · {bandLabel}
        </span>
        {deltaLabel ? <span className="text-[9px] text-slate-400/70">{deltaLabel}</span> : null}
        {asOfLabel ? (
          <span className="text-[9px] tabular-nums text-slate-400/45">
            {lang === "en" ? "as of" : "기준"} {asOfLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
