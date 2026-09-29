"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { t } from "@/lib/uiStrings";

type Props = {
  lang: LabelLanguage;
  events: LiveuamapEvent[];
  index: number;
  onIndexChange: (next: number) => void;
  onDismiss: () => void;
  onGoToLocation: (event: LiveuamapEvent) => void;
};

export function LiveuaFlashParchment({
  lang,
  events,
  index,
  onIndexChange,
  onDismiss,
  onGoToLocation,
}: Props) {
  const event = events[index];
  if (!event) return null;

  const en = lang === "en";
  const title = en ? event.title : event.titleKo?.trim() || event.title;
  const body = en ? event.body : event.bodyKo?.trim() || event.body;
  const desk = en
    ? "Frontline desk · Liveuamap · approximate geolocation"
    : "전선 데스크 · Liveuamap · 위치는 근사치";
  const signOff = [event.viaSource, event.sourceUrl, desk].filter(Boolean).join("\n");

  return (
    <div className="relative">
      <button
        type="button"
        className="absolute right-3 top-3 z-[910] flex h-8 w-8 items-center justify-center rounded-sm border border-[#6b4a22]/45 bg-[#f3e6c8]/95 text-lg leading-none text-[#3d2a12] shadow"
        aria-label={en ? "Close" : "닫기"}
        onClick={onDismiss}
      >
        ×
      </button>
      <ParchmentLetter
        lang={lang}
        title={title}
        paragraphs={[body]}
        signOff={signOff}
        ctaLabel={en ? "Close" : "닫기"}
        onContinue={onDismiss}
        playUnfoldSound
        playBreakingDispatch
        typewriter={false}
        newsFlashFont
        blackInk
        titleId="liveua-flash-title"
        zIndexClass="z-[900]"
        leadImageUrl={event.imageUrl}
        leadVideoUrl={event.videoUrl}
        secondaryCtaLabel={t("breakingFlashGoToLocation", lang)}
        onSecondaryCta={() => onGoToLocation(event)}
      />
      <div className="pointer-events-auto absolute bottom-16 left-1/2 z-[910] flex -translate-x-1/2 gap-2">
        <button
          type="button"
          className="rounded-sm border border-[#6b4a22]/40 bg-[#f3e6c8]/95 px-3 py-1 text-micro text-[#3d2a12] disabled:opacity-40"
          disabled={index <= 0}
          onClick={() => onIndexChange(index - 1)}
        >
          {en ? "Previous" : "이전"}
        </button>
        <button
          type="button"
          className="rounded-sm border border-[#6b4a22]/40 bg-[#f3e6c8]/95 px-3 py-1 text-micro text-[#3d2a12]"
          onClick={() => onGoToLocation(event)}
        >
          {en ? "Go to location" : "위치로 가기"}
        </button>
        <button
          type="button"
          className="rounded-sm border border-[#6b4a22]/40 bg-[#f3e6c8]/95 px-3 py-1 text-micro text-[#3d2a12] disabled:opacity-40"
          disabled={index >= events.length - 1}
          onClick={() => onIndexChange(index + 1)}
        >
          {en ? "Next" : "다음"}
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-8 left-1/2 z-[910] -translate-x-1/2 text-micro text-[#5c4020]/80">
        {index + 1} / {events.length}
      </p>
    </div>
  );
}
