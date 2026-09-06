"use client";

import type { LayerInfoHoverContent } from "@/lib/layerInfoHover";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  content: LayerInfoHoverContent;
  lang: LabelLanguage;
  className?: string;
};

/** 레이어 목록·지도 호버 공통 데이터/출처 카드 */
export function LayerInfoHoverPanel({ content, lang, className }: Props) {
  const sourceLabel = lang === "en" ? "Open source" : "출처 열기";
  return (
    <div
      className={
        className ??
        "rounded-xl border border-sky-300/25 bg-[#0a1830]/94 px-3 py-2.5 text-xs shadow-xl backdrop-blur-md"
      }
      role="note"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="font-medium text-sky-100">{content.title}</p>
        {content.statusLabel ? (
          <span className="rounded-full border border-slate-500/40 bg-slate-800/50 px-1.5 py-px text-micro text-slate-300">
            {content.statusLabel}
          </span>
        ) : null}
      </div>
      {content.badge ? (
        <p className="mt-1">
          <span className="inline-flex rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-micro font-medium text-orange-100">
            {content.badge}
          </span>
        </p>
      ) : null}
      {content.detail ? (
        <p className="mt-1.5 text-sky-100/85">{content.detail}</p>
      ) : null}
      {content.body ? (
        <p className="mt-1.5 text-meta leading-4 text-sky-100/70">{content.body}</p>
      ) : null}
      {content.meta ? (
        <p className="mt-1 text-micro text-sky-200/55">{content.meta}</p>
      ) : null}
      {content.hint ? (
        <p className="mt-1 text-micro text-sky-200/45">{content.hint}</p>
      ) : null}
      {content.sourceUrl ? (
        <a
          href={content.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto mt-2 inline-block text-micro text-sky-300/80 underline decoration-sky-400/35 underline-offset-2 hover:text-sky-100"
          onClick={(e) => e.stopPropagation()}
        >
          {sourceLabel}
        </a>
      ) : null}
    </div>
  );
}
