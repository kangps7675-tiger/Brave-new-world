"use client";

import { IntelGradeBadge } from "@/components/globe/IntelGradeBadge";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { DisplayGrade } from "@/lib/intelContract/types";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import { t } from "@/lib/uiStrings";

type BreakingFlashParchmentProps = {
  briefing: BreakingFlashBriefing;
  lang: LabelLanguage;
  onDismiss: () => void;
  /** 수동 위치 이동 — 자동 fly 없음 */
  onGoToLocation?: () => void;
  displayGrade?: DisplayGrade;
  onDrill?: () => void;
  /** 관측대 — 접을 때 우측 상단 속보함으로 들어감 */
  exitToDock?: boolean;
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
  displayGrade,
  onDrill,
  exitToDock = false,
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
      exitToDock={exitToDock}
      secondaryCtaLabel={canFly ? t("breakingFlashGoObserve", lang) : undefined}
      onSecondaryCta={canFly ? onGoToLocation : undefined}
      bodyExtra={
        displayGrade || onDrill ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {displayGrade ? (
              <IntelGradeBadge grade={displayGrade} lang={lang} />
            ) : null}
            {onDrill ? (
              <button
                type="button"
                onClick={onDrill}
                className="rounded-sm border border-[#6b4a22]/45 px-2 py-0.5 text-micro text-[#5c4030]/90"
                title={
                  lang === "en"
                    ? "See sources and grade reasons"
                    : "출처와 등급 이유 보기"
                }
              >
                {INTEL_UX.drillButton[lang === "en" ? "en" : "ko"]}
              </button>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
