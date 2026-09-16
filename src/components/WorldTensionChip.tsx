"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import {
  displayGtiDelta,
  displayGtiScore,
  gtiDefcon,
  gtiDefconColor,
  gtiDefconLabel,
} from "@/lib/gti";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type WorldTensionChipProps = {
  /** GTI 전 지구 긴장도 점수 (0~100 · GTS) — DEFCON 매핑 원천 */
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

function formatAsOfTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
}

/**
 * 지정학 상단 — GTS를 DEFCON 1–5 단계로 보여 주는 배지.
 * (공식 군사 DEFCON 선언이 아니라 서비스 긴장점수의 UI 매핑)
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
  const ko = lang !== "en";

  if (score == null || !Number.isFinite(score)) {
    return (
      <div
        className={`world-tension-chip tone-chip flex items-center gap-2.5 rounded-xl border border-slate-400/25 bg-black/55 px-3 py-2 ${className ?? ""}`}
        title={t("worldTensionHint", lang)}
      >
        <span
          className={`text-micro font-semibold uppercase tracking-[0.14em] ${
            light ? "text-slate-700" : "text-slate-300/85"
          }`}
        >
          DEFCON
        </span>
        <span
          className={`text-meta font-medium tabular-nums ${
            light ? "text-slate-600" : "text-slate-400/70"
          }`}
        >
          {ko ? "집계 중…" : "computing…"}
        </span>
      </div>
    );
  }

  const clamped = displayGtiScore(score);
  if (clamped == null) return null;
  const level = gtiDefcon(score);
  const color = gtiDefconColor(level, light);
  const urgent = level <= 2;
  const asOfLabel = formatAsOfTime(asOf);
  const stageLabel = gtiDefconLabel(level, ko);

  const delta = displayGtiDelta(deltaScore);
  const deltaLabel =
    delta != null
      ? delta > 0
        ? t("worldTensionDeltaUp", lang).replace("{n}", String(delta))
        : t("worldTensionDeltaDown", lang).replace("{n}", String(Math.abs(delta)))
      : null;

  return (
    <div
      className={`world-tension-chip tone-chip flex items-center gap-2.5 rounded-xl border bg-black/55 px-3 py-2 transition-colors ${
        urgent ? "animate-pulse" : ""
      } ${className ?? ""}`}
      style={{ borderColor: `${color}66` }}
      title={t("worldTensionHint", lang)}
      role="img"
      aria-label={`DEFCON ${level} — ${stageLabel} · GTS ${clamped}`}
    >
      <div className="flex flex-col items-center leading-none">
        <span
          className={`text-[0.58rem] font-semibold uppercase tracking-[0.16em] ${
            light ? "text-slate-600" : "text-slate-400/80"
          }`}
        >
          DEFCON
        </span>
        <span className="text-2xl font-black tabular-nums" style={{ color }}>
          {level}
        </span>
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-meta font-semibold" style={{ color }}>
          {stageLabel}
        </span>
        <span
          className={`text-micro tabular-nums ${light ? "text-slate-600" : "text-slate-400/75"}`}
        >
          GTS {clamped}
          <span className="opacity-55">/100</span>
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
              ko
                ? "잠정치 — 공식 집계 전 수치라 정식 값과 다를 수 있습니다."
                : "Provisional — official smoothed figure not in yet, may differ."
            }
          >
            {ko ? "잠정치" : "provisional"}
          </span>
        ) : null}
        {asOfLabel ? (
          <span
            className={`text-micro tabular-nums ${light ? "text-slate-500" : "text-slate-400/45"}`}
          >
            {ko ? "기준" : "as of"} {asOfLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
