"use client";

import { IntelGradeBadge } from "@/components/globe/IntelGradeBadge";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { DisplayGrade } from "@/lib/intelContract/types";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import { t } from "@/lib/uiStrings";
import {
  flashVerdictBasis,
  flashVerdictLabel,
  flashVerdictNote,
  type FlashVerdict,
} from "@/lib/news/flashVerdict";

const VERDICT_CHIP: Record<FlashVerdict, string> = {
  confirmed: "border-emerald-800/50 bg-emerald-700/10 text-emerald-950",
  likely: "border-sky-800/50 bg-sky-700/10 text-sky-950",
  nodata: "border-stone-700/50 bg-stone-600/10 text-stone-900",
};

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
      galleryImageUrls={
        briefing.imageUrls?.length ? briefing.imageUrls : briefing.imageUrl ? [briefing.imageUrl] : []
      }
      galleryCaption={
        briefing.imageUrls?.length || briefing.imageUrl
          ? briefing.flashSource === "liveuamap"
            ? lang === "en"
              ? "Photos are from the original posts cited by Liveuamap; rights belong to their owners. Click for the original."
              : "사진은 Liveuamap이 인용한 원 게시물(텔레그램·X 등)의 것으로, 권리는 원 소유자에게 있습니다. 누르면 원본이 열립니다."
            : lang === "en"
              ? "Photo attached to the news report; rights belong to the outlet. Click for the original."
              : "기사에 첨부된 사진으로, 권리는 해당 매체에 있습니다. 누르면 원본이 열립니다."
          : undefined
      }
      leadVideoUrl={briefing.videoUrl}
      exitToDock={exitToDock}
      secondaryCtaLabel={canFly ? t("breakingFlashGoObserve", lang) : undefined}
      onSecondaryCta={canFly ? onGoToLocation : undefined}
      bodyExtra={
        displayGrade || onDrill || briefing.verdict ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {briefing.verdict ? (
              <>
                <span
                  className={`rounded-sm border px-2 py-0.5 text-micro font-semibold ${VERDICT_CHIP[briefing.verdict.verdict]}`}
                  title={flashVerdictNote(lang === "en" ? "en" : "ko")}
                >
                  {flashVerdictLabel(briefing.verdict.verdict, lang === "en" ? "en" : "ko")}
                </span>
                <span className="text-micro text-[#5c4020]/85">
                  {flashVerdictBasis(briefing.verdict, lang === "en" ? "en" : "ko")}
                </span>
              </>
            ) : null}
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
