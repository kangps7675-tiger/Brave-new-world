"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import { t } from "@/lib/uiStrings";

type BreakingFlashParchmentProps = {
  briefing: BreakingFlashBriefing;
  lang: LabelLanguage;
  onDismiss: () => void;
  /** 수동 위치 이동 — 자동 fly 없음 */
  onGoToLocation?: () => void;
};

/**
 * 귀중한 속보 타전 양피지 — 펼침+타전음. 하단 출처 고정.
 * LIVEUA: 원문·사진·영상 + 「위치로 가기」.
 */
export function BreakingFlashParchment({
  briefing,
  lang,
  onDismiss,
  onGoToLocation,
}: BreakingFlashParchmentProps) {
  const desk =
    lang === "en" ? "Breaking desk · Globe Observatory" : "속보 데스크 · 지구본 관측대";
  const signOff = [briefing.sourceAttribution, desk].filter(Boolean).join("\n");
  const canFly =
    Boolean(onGoToLocation) &&
    (Boolean(briefing.coords) ||
      (briefing.theater && briefing.theater !== "global"));

  return (
    <ParchmentLetter
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      signOff={signOff}
      ctaLabel={lang === "en" ? "Understood" : "확인"}
      onContinue={onDismiss}
      playUnfoldSound
      playBreakingDispatch
      breakingDispatchBed={briefing.dispatchBed}
      typewriter={false}
      newsFlashFont
      blackInk
      titleId="breaking-flash-title"
      zIndexClass="z-[900]"
      leadImageUrl={briefing.imageUrl}
      leadVideoUrl={briefing.videoUrl}
      secondaryCtaLabel={canFly ? t("breakingFlashGoToLocation", lang) : undefined}
      onSecondaryCta={canFly ? onGoToLocation : undefined}
    />
  );
}
