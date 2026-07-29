"use client";

import { useMemo } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { TerritorialDisputeEpisode } from "@/data/territorialDisputeEpisodes";
import {
  territorialDeepDoc,
} from "@/data/territorialDisputeDeep";
import type { FrictionTimelineStage } from "@/data/frictionEpisodeDeep";

type TerritorialHistoryChromeProps = {
  episode: TerritorialDisputeEpisode;
  lang: LabelLanguage;
  activeStageId: string | null;
  revealedStageIds: string[];
  onSelectStage: (stage: FrictionTimelineStage) => void;
  onExitHistory: () => void;
  onOpenBrief: () => void;
  onBackToList?: () => void;
};

/**
 * 영토분쟁 역사 모드 — FrictionHistoryChrome과 동일 UX (통합 아카이브의 border 렌즈).
 * 스테이지를 순서대로 찍어 맵 콜아웃과 연동.
 */
export function TerritorialHistoryChrome({
  episode,
  lang,
  activeStageId,
  revealedStageIds,
  onSelectStage,
  onExitHistory,
  onOpenBrief,
  onBackToList,
}: TerritorialHistoryChromeProps) {
  const deep = useMemo(() => territorialDeepDoc(episode.id), [episode.id]);
  const stages = deep?.stages ?? [];
  const ko = lang !== "en";
  const yearLabel = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;

  return (
    <aside
      id="territorial-history-chrome"
      className="pointer-events-auto absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 z-[600] flex max-h-[min(52vh,420px)] w-[min(94vw,340px)] flex-col overflow-hidden rounded-2xl border border-rose-300/25 bg-[#160d10]/94 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 border-b border-rose-200/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-[0.2em] text-rose-200/55">
            {ko ? "영토분쟁사 · 역사 모드" : "Territorial history · locked"}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-medium text-rose-50">
            {ko ? episode.title : episode.titleEn}
          </h2>
          <p className="mt-1 text-micro leading-4 text-rose-100/50">
            {ko
              ? `${yearLabel} · 콜아웃이 순서대로 지도에 찍힙니다. 나가기 전까지 잠금.`
              : `${yearLabel} · Callouts draw in order on the map. Locked until Exit.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onExitHistory}
          className="tap-target shrink-0 rounded-lg border border-rose-300/25 px-2 py-1 text-micro text-rose-100/70 transition hover:border-rose-200/40 hover:text-rose-50"
        >
          {ko ? "역사 나가기" : "Exit history"}
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-rose-200/10 px-3 py-2">
        {onBackToList ? (
          <button
            type="button"
            onClick={onBackToList}
            className="tap-target min-h-[44px] shrink-0 rounded-lg border border-rose-300/25 px-2 text-meta text-rose-100/75 transition hover:border-rose-200/40 hover:text-rose-50"
          >
            {ko ? "목록" : "List"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenBrief}
          className="tap-target min-h-[44px] flex-1 rounded-lg border border-amber-300/25 bg-amber-500/10 px-2 text-meta font-medium text-amber-50 transition hover:border-amber-200/40"
        >
          {ko ? "양피지 다시 읽기" : "Reopen parchment"}
        </button>
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {stages.map((stage) => {
          const revealed = revealedStageIds.includes(stage.id);
          const active = stage.id === activeStageId;
          return (
            <li key={stage.id}>
              <button
                type="button"
                disabled={!revealed}
                onClick={() => onSelectStage(stage)}
                className={`w-full rounded-xl border px-2.5 py-2 text-left transition ${
                  !revealed
                    ? "border-rose-200/5 bg-rose-500/[0.03] text-rose-100/30"
                    : active
                      ? "border-rose-300/45 bg-rose-500/20 text-rose-50"
                      : "border-rose-200/10 bg-rose-500/5 text-rose-100/80 hover:border-rose-300/25"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-micro font-semibold text-rose-200/70">
                    {stage.order}. {stage.yearLabel}
                    {!revealed ? (ko ? " · 대기" : " · pending") : ""}
                  </span>
                </div>
                <p className="mt-0.5 text-caption font-medium">
                  {ko ? stage.titleKo : stage.titleEn}
                </p>
                {revealed ? (
                  <p className="mt-0.5 line-clamp-2 text-micro leading-4 text-rose-100/55">
                    {ko ? stage.bodyKo : stage.bodyEn}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
