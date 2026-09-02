"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import {
  displaySesDelta,
  displaySesScore,
  formatSesTitle,
  sesBand,
  sesBandLabel,
  type SesBand,
} from "@/lib/ses";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type SanctionsEvasionChipProps = {
  score: number | null;
  deltaScore?: number | null;
  asOf?: string | null;
  lang: LabelLanguage;
  className?: string;
  dense?: boolean;
  active?: boolean;
  onClick?: () => void;
};

const RING_RADIUS = 13;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function bandColor(band: SesBand, light: boolean): string {
  if (light) {
    switch (band) {
      case "high":
        return "#c2410c";
      case "elevated":
        return "#b45309";
      case "moderate":
        return "#a16207";
      default:
        return "#047857";
    }
  }
  switch (band) {
    case "high":
      return "#fb923c";
    case "elevated":
      return "#fbbf24";
    case "moderate":
      return "#fcd34d";
    default:
      return "#34d399";
  }
}

function formatAsOfDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return iso.slice(0, 10);
}

/**
 * 지정학 뷰 우상단 — 제재 회피 강도 배지. GTS 칩 아래에 쌓인다.
 */
export function SanctionsEvasionChip({
  score,
  deltaScore,
  asOf,
  lang,
  className = "",
  dense = false,
  active = false,
  onClick,
}: SanctionsEvasionChipProps) {
  const light = useBasemapTone() === "light";
  const title = t("sesHint", lang);

  if (score == null || !Number.isFinite(score)) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`ses-chip tone-chip flex items-center gap-2 rounded-full border border-amber-400/25 bg-black/55 px-2.5 py-1.5 ${className}`}
        title={title}
      >
        <span
          className={`text-micro font-semibold uppercase tracking-[0.12em] ${
            light ? "text-slate-700" : "text-amber-200/85"
          }`}
        >
          {formatSesTitle(lang !== "en")}
        </span>
        <span className={`text-meta ${light ? "text-slate-600" : "text-slate-400/70"}`}>
          {lang === "en" ? "computing…" : "집계 중…"}
        </span>
      </button>
    );
  }

  const clamped = displaySesScore(score);
  if (clamped == null) return null;
  const band = sesBand(score);
  const color = bandColor(band, light);
  const asOfLabel = formatAsOfDate(asOf);
  const delta = displaySesDelta(deltaScore);
  const deltaLabel =
    delta != null
      ? delta > 0
        ? t("sesDeltaUp", lang).replace("{n}", String(delta))
        : t("sesDeltaDown", lang).replace("{n}", String(Math.abs(delta)))
      : null;
  const bandLabel = sesBandLabel(band, lang !== "en");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`ses-chip tone-chip flex items-center gap-2 rounded-full border bg-black/55 px-2.5 py-1.5 transition-colors ${
        active ? "ring-1 ring-amber-300/40" : ""
      } ${className}`}
      style={{ borderColor: `${color}59` }}
      title={title}
    >
      <svg viewBox="0 0 32 32" width={dense ? 22 : 26} height={dense ? 22 : 26} aria-hidden>
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
      <div className="flex flex-col leading-tight text-left">
        <span
          className={`text-micro font-semibold uppercase tracking-[0.12em] ${
            light ? "text-slate-700" : "text-amber-100/85"
          }`}
        >
          {formatSesTitle(lang !== "en")}
        </span>
        {!dense ? (
          <>
            <span className="text-meta font-medium tabular-nums" style={{ color }}>
              {clamped}
              <span className="opacity-60">/100</span> · {bandLabel}
            </span>
            {deltaLabel ? (
              <span className={`text-micro ${light ? "text-slate-600" : "text-slate-400/70"}`}>
                {deltaLabel}
              </span>
            ) : null}
            {asOfLabel ? (
              <span
                className={`text-micro tabular-nums ${light ? "text-slate-500" : "text-slate-400/45"}`}
              >
                {lang === "en" ? "data" : "데이터"} {asOfLabel}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-meta font-medium tabular-nums" style={{ color }}>
            {bandLabel}
          </span>
        )}
      </div>
    </button>
  );
}
