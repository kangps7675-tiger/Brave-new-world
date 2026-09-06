"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  METRIC_EXPLAIN,
  type MetricExplainId,
} from "@/lib/metricExplainCopy";

type Props = {
  metricId: MetricExplainId;
  lang: LabelLanguage;
  onClose: () => void;
};

/** 지구본 지표 칩 클릭 시 — 계산·설계를 알아먹기 쉬운 줄글로 풀어 주는 패널 */
export function MetricExplainPanel({ metricId, lang, onClose }: Props) {
  const ko = lang !== "en";
  const copy = METRIC_EXPLAIN[metricId];
  const title = ko ? copy.titleKo : copy.titleEn;
  const hook = ko ? copy.hookKo : copy.hookEn;
  const paragraphs = ko ? copy.paragraphsKo : copy.paragraphsEn;

  return (
    <div
      className="pointer-events-auto flex max-h-[min(58vh,32rem)] flex-col overflow-hidden rounded-xl border border-sky-400/25 bg-[#071018]/95 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label={title}
      data-globe-keys="off"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="min-w-0 truncate text-meta font-semibold text-sky-100">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={ko ? "설명 닫기" : "Close explanation"}
          className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500/60 bg-slate-950/90 text-sm text-slate-200 transition hover:border-slate-300 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="intel-scroll-y min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-2.5">
        <p className="text-body font-medium leading-relaxed text-sky-100/95">{hook}</p>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-meta leading-relaxed text-slate-300/90">
            {p}
          </p>
        ))}
        <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-micro text-slate-400">
          {ko
            ? "관측·공개 자료 기반 설명입니다. 투자·군사 행동의 지시가 아닙니다."
            : "Observation from public sources—not investment or military advice."}
        </p>
      </div>
    </div>
  );
}
