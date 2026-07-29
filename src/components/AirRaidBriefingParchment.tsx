"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";

export type AirRaidBriefingContent = {
  kind: AirRaidSirenKind;
  title: string;
  paragraphs: string[];
};

type AirRaidBriefingParchmentProps = {
  briefing: AirRaidBriefingContent;
  lang: LabelLanguage;
  onDismiss: () => void;
};

/**
 * 공습경보 순간 브리핑 — 전보음 + 전문 즉시 표시(타이핑 없음).
 */
export function AirRaidBriefingParchment({
  briefing,
  lang,
  onDismiss,
}: AirRaidBriefingParchmentProps) {
  return (
    <ParchmentLetter
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      ctaLabel={lang === "en" ? "Understood" : "확인"}
      onContinue={onDismiss}
      playBreakingDispatch
      typewriter={false}
      titleId="air-raid-briefing-title"
      zIndexClass="z-[900]"
    />
  );
}
