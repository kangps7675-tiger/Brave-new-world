"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";

type BreakingFlashParchmentProps = {
  briefing: BreakingFlashBriefing;
  lang: LabelLanguage;
  onDismiss: () => void;
};

/**
 * 귀중한 속보 타전 양피지 — 펼침 소리 + 등불과 동일한 타전음.
 */
export function BreakingFlashParchment({
  briefing,
  lang,
  onDismiss,
}: BreakingFlashParchmentProps) {
  return (
    <ParchmentLetter
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      signOff={
        lang === "en"
          ? "Breaking desk · Globe Observatory"
          : "속보 데스크 · 지구본 관측대"
      }
      ctaLabel={lang === "en" ? "Understood" : "확인"}
      onContinue={onDismiss}
      playUnfoldSound
      playBreakingDispatch
      typewriter={false}
      blackInk
      titleId="breaking-flash-title"
      zIndexClass="z-[10042]"
    />
  );
}
