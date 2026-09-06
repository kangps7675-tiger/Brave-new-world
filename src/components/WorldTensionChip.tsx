"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import {
  displayGtiDelta,
  displayGtiScore,
  gtiBand,
  gtiBandLabel,
  type GtiBand,
} from "@/lib/gti";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type WorldTensionChipProps = {
  /** GTI 전 지구 긴장도 점수 (0~100 · GTS) */
  score: number | null;
  /** 전일 대비 델타 (GTI 스코어 스케일) */
  deltaScore?: number | null;
  /** 이 점수를 가져온 시각 (ISO) — 상황판 "기준 시각" 표시용 */
  asOf?: string | null;
  /** 공식 스냅샷이 아직 없어 전장 점수로 즉석 산출한 잠정치인지 — true면 배지 표시 */
  isEstimate?: boolean;
  lang: LabelLanguage;
  className?: string;
};

const RING_RADIUS = 13;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function bandColor(band: GtiBand, light: boolean): string {
  if (light) {
    switch (band) {
      case "critical":
        return "#be123c";
      case "high":
        return "#c2410c";
      case "elevated":
        return "#b45309";
      default:
        return "#047857";
    }
  }
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
 * 지정학 뷰 우상단 — 긴장지수(GTI)를 "67/100 · 고조"처럼 점수로 보여주는 배지.
 * 원유 티커(WTI)와 무관.
 */
export function WorldTensionChip({
  score,
  deltaScore,
  asOf,
  isEstimate,
  lang,
  className,
}: WorldTensionChipProps) {
  const light = useBasemapTone() === "light";
  // 점수가 아직 없으면 사라지지 않고 "집계 중"으로 자리를 지킨다
  if (score == null || !Number.isFinite(score)) {
    return (
      <div
        className={`world-tension-chip tone-chip flex items-center gap-2 rounded-full border border-slate-400/25 bg-black/55 px-2.5 py-1.5 ${className ?? ""}`}
        title={t("worldTensionHint", lang)}
      >
        <span
          className={`text-micro font-semibold uppercase tracking-[0.12em] ${
            light ? "text-slate-700" : "text-slate-300/85"
          }`}
        >
          {t("worldTensionTitle", lang)}
        </span>
        <span
          className={`text-meta font-medium tabular-nums ${
            light ? "text-slate-600" : "text-slate-400/70"
          }`}
        >
          {lang === "en" ? "computing…" : "집계 중…"}
        </span>
      </div>
    );
  }

  const clamped = displayGtiScore(score);
  if (clamped == null) return null;
  const band = gtiBand(score);
  const color = bandColor(band, light);
  const urgent = band === "critical";
  const asOfLabel = formatAsOfTime(asOf);

  const delta = displayGtiDelta(deltaScore);
  const deltaLabel =
    delta != null
      ? delta > 0
        ? t("worldTensionDeltaUp", lang).replace("{n}", String(delta))
        : t("worldTensionDeltaDown", lang).replace("{n}", String(Math.abs(delta)))
      : null;

  const bandLabel = gtiBandLabel(band, lang !== "en");

  return (
    <div
      className={`world-tension-chip tone-chip flex items-center gap-2 rounded-full border bg-black/55 px-2.5 py-1.5 transition-colors ${
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
          fill={light ? "rgba(255,252,248,0.95)" : "rgba(6,10,18,0.85)"}
          stroke={light ? "rgba(30,41,59,0.22)" : "rgba(148,163,184,0.28)"}
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
        <span
          className={`text-micro font-semibold uppercase tracking-[0.12em] ${
            light ? "text-slate-700" : "text-slate-300/85"
          }`}
        >
          {t("worldTensionTitle", lang)}
        </span>
        <span className="text-meta font-medium tabular-nums" style={{ color }}>
          {clamped}
          <span className="opacity-60">/100</span> · {bandLabel}
        </span>
        {deltaLabel ? (
          <span className={`text-micro ${light ? "text-slate-600" : "text-slate-400/70"}`}>
            {deltaLabel}
          </span>
        ) : null}
        {isEstimate ? (
          <span
            className={`text-micro font-medium ${light ? "text-amber-700" : "text-amber-300/80"}`}
            title={
              lang === "en"
                ? "Provisional — official smoothed figure not in yet, may differ."
                : "잠정치 — 공식 집계 전 수치라 정식 값과 다를 수 있습니다."
            }
          >
            {lang === "en" ? "provisional" : "잠정치"}
          </span>
        ) : null}
        {asOfLabel ? (
          <span
            className={`text-micro tabular-nums ${light ? "text-slate-500" : "text-slate-400/45"}`}
          >
            {lang === "en" ? "as of" : "기준"} {asOfLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
