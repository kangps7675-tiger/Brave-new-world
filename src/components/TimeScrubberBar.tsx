"use client";

import { useMemo } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type TimeScrubberBarProps = {
  lang: LabelLanguage;
  /** 현재 기준일 YYYY-MM-DD (UTC) */
  asOf: string;
  today: string;
  /** 최신→과거 정렬된 가용 날짜 */
  availableDates: string[];
  onChange: (date: string) => void;
  onGoToday: () => void;
  compact?: boolean;
};

/**
 * 일별 랭크/시그널 시간 스크럽.
 * asOf !== today 이면 히스토리 모드 배너 + 「오늘로」.
 * 라이브 점(AIS/FIRMS 등) 재생이 아님 — 그 고지를 문구에 명시.
 */
export function TimeScrubberBar({
  lang,
  asOf,
  today,
  availableDates,
  onChange,
  onGoToday,
  compact = false,
}: TimeScrubberBarProps) {
  const historical = asOf !== today;
  const ordered = useMemo(() => {
    const set = new Set(availableDates);
    if (!set.has(today)) set.add(today);
    if (!set.has(asOf)) set.add(asOf);
    return [...set].sort();
  }, [availableDates, asOf, today]);

  const index = Math.max(0, ordered.indexOf(asOf));
  const max = Math.max(0, ordered.length - 1);

  return (
    <div
      role="region"
      aria-label={t("timeScrubberAria", lang)}
      className={`pointer-events-auto rounded-2xl border shadow-xl backdrop-blur-md ${
        historical
          ? "border-amber-400/40 bg-[#1a1208]/92"
          : "border-sky-200/20 bg-[#0c1528]/90"
      } ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}
    >
      {historical ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-meta font-semibold text-amber-100">
            {t("timeScrubberHistorical", lang).replace("{date}", asOf)}
          </p>
          <button
            type="button"
            onClick={onGoToday}
            className="rounded-lg border border-amber-300/45 bg-amber-500/20 px-2.5 py-1 text-caption font-semibold text-amber-50 hover:bg-amber-500/35"
          >
            {t("timeScrubberGoToday", lang)}
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-micro uppercase tracking-[0.12em] text-sky-200/55">
          {t("timeScrubberLabel", lang)}
        </span>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={index}
          disabled={max === 0}
          aria-valuetext={asOf}
          onChange={(e) => {
            const next = ordered[Number(e.target.value)];
            if (next) onChange(next);
          }}
          className="h-1.5 w-full min-w-[8rem] accent-sky-400"
        />
        <span className="shrink-0 font-data-mono text-caption tabular-nums text-sky-50/90">
          {asOf}
        </span>
      </div>
      <p className="mt-1.5 text-micro leading-4 text-sky-100/45">
        {t("timeScrubberHint", lang)}
      </p>
    </div>
  );
}
