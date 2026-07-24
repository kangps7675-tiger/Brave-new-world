"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import {
  frictionDeepDoc,
  type FrictionTimelineStage,
} from "@/data/frictionEpisodeDeep";
import { OPENALEX_POLICY } from "@/lib/licensing/openAlexPolicy";
import { renderFrictionEpisodeCard } from "@/lib/frictionEpisodeCard";
import { shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { trackEvent } from "@/lib/trackClient";

type FrictionHistoryChromeProps = {
  episode: FrictionEpisode;
  lang: LabelLanguage;
  activeStageId: string | null;
  onSelectStage: (stage: FrictionTimelineStage) => void;
  onExitHistory: () => void;
  onOpenBrief: () => void;
  onBackToList?: () => void;
};

export function FrictionHistoryChrome({
  episode,
  lang,
  activeStageId,
  onSelectStage,
  onExitHistory,
  onOpenBrief,
  onBackToList,
}: FrictionHistoryChromeProps) {
  const deep = useMemo(() => frictionDeepDoc(episode.id), [episode.id]);
  const stages = deep?.stages ?? [];
  const ko = lang !== "en";
  const [cardBusy, setCardBusy] = useState(false);

  async function handleShareCard() {
    if (cardBusy) return;
    trackEvent("friction_card_share_click", { episodeId: episode.id }, { lang });
    setCardBusy(true);
    try {
      const blob = await renderFrictionEpisodeCard(episode, lang);
      if (!blob) return;
      const filename = `friction-${episode.id}.png`;
      await shareOrDownloadImageBlob(
        blob,
        filename,
        episode.title,
        ko ? `${episode.title} — 반서방 진영 충돌사` : `${episode.title} — anti-West bloc friction`,
      );
      trackEvent("friction_card_share_success", { episodeId: episode.id }, { lang });
    } finally {
      setCardBusy(false);
    }
  }

  return (
    <aside
      id="friction-history-chrome"
      className="pointer-events-auto absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 z-[48] flex max-h-[min(52vh,420px)] w-[min(94vw,340px)] flex-col overflow-hidden rounded-2xl border border-violet-300/25 bg-[#120e18]/94 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 border-b border-violet-200/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-200/55">
            {ko ? "역사 모드 · 잠금" : "History mode · locked"}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-medium text-violet-50">{episode.title}</h2>
          <p className="mt-1 text-[10px] leading-4 text-violet-100/50">
            {ko
              ? "나가기 버튼을 누르기 전까지 이 창을 떠날 수 없습니다. 줌·모드 전환으로 탈출되지 않습니다."
              : "You can’t leave until you press Exit. Zoom and mode switches won’t eject you."}
          </p>
        </div>
        <button
          type="button"
          onClick={onExitHistory}
          className="tap-target shrink-0 rounded-lg border border-violet-300/25 px-2 py-1 text-[10px] text-violet-100/70 transition hover:border-violet-200/40 hover:text-violet-50"
        >
          {ko ? "역사 나가기" : "Exit history"}
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-violet-200/10 px-3 py-2">
        {onBackToList ? (
          <button
            type="button"
            onClick={onBackToList}
            className="tap-target min-h-[44px] shrink-0 rounded-lg border border-violet-300/25 px-2 text-[11px] text-violet-100/75 transition hover:border-violet-200/40 hover:text-violet-50"
          >
            {ko ? "목록" : "List"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenBrief}
          className="tap-target min-h-[44px] flex-1 rounded-lg border border-amber-300/25 bg-amber-500/10 px-2 text-[11px] font-medium text-amber-50 transition hover:border-amber-200/40"
        >
          {ko ? "양피지 다시 읽기" : "Reopen parchment"}
        </button>
        <button
          type="button"
          onClick={handleShareCard}
          disabled={cardBusy}
          className="tap-target min-h-[44px] shrink-0 rounded-lg border border-sky-300/25 bg-sky-500/10 px-2 text-[11px] font-medium text-sky-50 transition hover:border-sky-200/40 disabled:opacity-60"
        >
          {cardBusy ? "…" : ko ? "카드 공유" : "Share card"}
        </button>
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {stages.map((stage) => {
          const active = stage.id === activeStageId;
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => onSelectStage(stage)}
                className={`w-full rounded-xl border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-violet-300/45 bg-violet-500/20 text-violet-50"
                    : "border-violet-200/10 bg-violet-500/5 text-violet-100/80 hover:border-violet-300/25"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-semibold text-violet-200/70">
                    {stage.order}. {stage.yearLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] font-medium">
                  {ko ? stage.titleKo : stage.titleEn}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-violet-100/55">
                  {ko ? stage.bodyKo : stage.bodyEn}
                </p>
              </button>
            </li>
          );
        })}
      </ol>

      {deep && deep.openAlex.length > 0 ? (
        <div className="border-t border-violet-200/10 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.18em] text-violet-200/45">
            {OPENALEX_POLICY.sourceName} · Works
          </p>
          <ul className="mt-1 space-y-1">
            {deep.openAlex.slice(0, 2).map((w) => (
              <li key={w.openAlexId} className="text-[10px] leading-4 text-violet-100/55">
                <a
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-violet-400/30 underline-offset-2 hover:text-violet-50"
                >
                  {w.title}
                </a>
                {w.year ? ` (${w.year})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
