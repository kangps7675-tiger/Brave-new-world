"use client";

import { useEffect, useState } from "react";
import {
  emitBreakingDispatchSound,
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import type { NatoPerimeterCrossEvent } from "@/lib/natoEasternPerimeter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  normalizeLampImageUrl,
  hasLampPhoto,
} from "@/lib/news/lampThumbnail";
import type { NewsStreamItem } from "@/lib/news/types";
import { isArticleUrl } from "@/lib/news/articleLink";

export type NatoPerimeterTier2Briefing = {
  cross: NatoPerimeterCrossEvent;
  story: NewsStreamItem;
};

type Props = {
  briefing: NatoPerimeterTier2Briefing;
  lang: LabelLanguage;
  onDismiss: () => void;
};

/**
 * 2차 강화 — 반쪽(한쪽만) 양피지 + 오피셜 속보 사진.
 * 카메라 follow와 병행; 「오피셜 속보 · 접경 교차」.
 */
export function NatoPerimeterHalfParchment({ briefing, lang, onDismiss }: Props) {
  const ko = lang !== "en";
  const { cross, story } = briefing;
  const [exiting, setExiting] = useState(false);
  const photo = hasLampPhoto(story.imageUrl)
    ? normalizeLampImageUrl(story.imageUrl)
    : "";
  const country = ko ? cross.countryNameKo : cross.countryNameEn;
  const kicker = ko ? "오피셜 속보 · 접경 교차" : "Official flash · perimeter cross";
  const cta = ko ? "접기" : "Fold";
  const reduced = prefersReducedMotion();

  useEffect(() => {
    emitParchmentUnfoldSound();
    emitBreakingDispatchSound({ bed: "dark" });
  }, []);

  const handleDismiss = () => {
    if (exiting) return;
    emitParchmentFoldSound();
    if (reduced) {
      onDismiss();
      return;
    }
    setExiting(true);
    window.setTimeout(onDismiss, 480);
  };

  const linkOk = isArticleUrl(story.link);

  return (
    <div
      className={`pointer-events-none fixed inset-y-0 right-0 z-[910] flex w-[min(100vw,28rem)] items-stretch sm:w-[min(52vw,32rem)] ${
        exiting ? "animate-[natoHalfFold_0.45s_ease_forwards]" : "animate-[natoHalfIn_0.55s_ease]"
      }`}
      role="dialog"
      aria-labelledby="nato-perimeter-tier2-title"
    >
      <style>{`
        @keyframes natoHalfIn {
          from { transform: translateX(12%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes natoHalfFold {
          to { transform: translateX(18%); opacity: 0; }
        }
      `}</style>
      <div
        className="pointer-events-auto relative m-2 flex w-full flex-col overflow-hidden rounded-l-lg border border-[#c4a574]/55 bg-[#f3e6c8] shadow-[-18px_0_48px_rgba(20,10,0,0.45)] sm:m-3 sm:ml-0"
        style={{
          backgroundImage:
            "linear-gradient(105deg, rgba(243,230,200,0.97) 0%, rgba(232,210,160,0.98) 100%)",
          clipPath: exiting
            ? undefined
            : "polygon(0 0, 100% 0, 100% 100%, 4% 100%, 0 92%)",
        }}
      >
        {photo ? (
          <div className="relative h-[38%] min-h-[9rem] max-h-[14rem] w-full shrink-0 overflow-hidden bg-[#2a1a0a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1a1008]/85 to-transparent px-3 pb-2 pt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f5e6c8]/90">
                {kicker}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-b border-[#8b6914]/25 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c3d12]">
              {kicker}
            </p>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3 text-[#2a1a0a]">
          <p className="text-[11px] text-[#6b4a22]/85">
            {ko
              ? `${country} · 관측 교차 확인 보도`
              : `${country} · reporting confirms observed cross`}
          </p>
          <h2
            id="nato-perimeter-tier2-title"
            className="font-serif text-[1.15rem] font-semibold leading-snug text-[#1a1008]"
          >
            {story.title}
          </h2>
          {story.summary ? (
            <p className="text-[13px] leading-relaxed text-[#3a2814]/92">{story.summary}</p>
          ) : null}
          <p className="mt-auto pt-2 text-[11px] text-[#6b4a22]/80">
            {[story.publisher || story.source, story.pubDate]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-[#8b6914]/25 px-3 py-2">
          {linkOk ? (
            <a
              href={story.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-medium text-[#5c3d12] underline-offset-2 hover:underline"
            >
              {ko ? "원문" : "Source"}
            </a>
          ) : null}
          <button
            type="button"
            onClick={handleDismiss}
            className="ml-auto rounded border border-[#8b6914]/35 bg-[#efe0b8] px-3 py-1 text-[12px] font-medium text-[#3a2814] hover:bg-[#e8d4a0]"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}
