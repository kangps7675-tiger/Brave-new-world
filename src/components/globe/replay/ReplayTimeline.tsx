"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { sr } from "@/lib/straitReplay/i18n";

type Props = {
  lang: LabelLanguage;
  eventOn: string;
  series: Array<{ date: string; vesselCount: number }>;
  overlaySeries?: Array<{ date: string; vesselCount: number }>;
};

export function ReplayTimeline({
  lang,
  eventOn,
  series,
  overlaySeries = [],
}: Props) {
  const dates = useMemo(() => series.map((s) => s.date), [series]);
  const eventIdx = Math.max(0, dates.indexOf(eventOn));
  const [idx, setIdx] = useState(eventIdx < 0 ? 0 : eventIdx);

  const current = series[idx];
  const overlay = overlaySeries.find((o) => o.date === current?.date);
  const max = Math.max(
    1,
    ...series.map((s) => s.vesselCount),
    ...overlaySeries.map((s) => s.vesselCount),
  );

  if (series.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5" aria-label={sr("timelineAria", lang)}>
      <div className="flex h-16 items-end gap-0.5">
        {series.map((s, i) => {
          const h = Math.round((s.vesselCount / max) * 100);
          const oh = overlaySeries.find((o) => o.date === s.date);
          const ohPct = oh ? Math.round((oh.vesselCount / max) * 100) : 0;
          const isEvent = s.date === eventOn;
          const isCursor = i === idx;
          return (
            <button
              key={s.date}
              type="button"
              title={s.date}
              onClick={() => setIdx(i)}
              className="relative flex h-full flex-1 flex-col justify-end"
            >
              {oh ? (
                <span
                  className="absolute bottom-0 left-0 right-0 bg-teal-400/25"
                  style={{ height: `${ohPct}%` }}
                />
              ) : null}
              <span
                className={`w-full ${
                  isEvent
                    ? "bg-amber-300"
                    : isCursor
                      ? "bg-teal-200"
                      : "bg-teal-500/55"
                }`}
                style={{ height: `${h}%` }}
              />
            </button>
          );
        })}
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, series.length - 1)}
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        className="w-full accent-teal-300"
        aria-valuetext={current?.date}
      />
      <p className="text-micro text-teal-100/70">
        {current?.date}
        {current ? ` · ${Math.round(current.vesselCount)}` : ""}
        {overlay ? ` / overlay ${Math.round(overlay.vesselCount)}` : ""}
      </p>
    </div>
  );
}
