"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  EXERCISE_ACTOR_LABEL,
  EXERCISE_CONFIDENCE_LABEL,
  type MilitaryExercise,
} from "@/lib/militaryExercises";

export type ExerciseBriefingContent = {
  exerciseId: string;
  title: string;
  paragraphs: string[];
  lat: number;
  lng: number;
};

export function buildExerciseBriefingContent(
  ex: MilitaryExercise,
  lang: LabelLanguage,
): ExerciseBriefingContent | null {
  const lat = ex.lat;
  const lng = ex.lng;
  if (lat == null || lng == null) return null;

  const en = lang === "en";
  const conf = EXERCISE_CONFIDENCE_LABEL[ex.confidence];
  const actors = ex.actors
    .map((a) => (en ? EXERCISE_ACTOR_LABEL[a].en : EXERCISE_ACTOR_LABEL[a].ko))
    .join(en ? ", " : "·");
  const sources = ex.sources.map((s) => s.name).filter(Boolean).join(" · ") || (en ? "—" : "—");

  const paragraphs = [
    en
      ? `How sure: ${conf.en}. This is not a perfect live track of hostile forces.`
      : `얼마나 확실한가: ${conf.ko}. 적성국을 실시간으로 완벽히 추적한다는 뜻이 아닙니다.`,
    en
      ? `Who: ${actors || "unknown"}${ex.coalition ? ` (${ex.coalition})` : ""}.`
      : `누가: ${actors || "미상"}${ex.coalition ? ` (${ex.coalition})` : ""}.`,
    ex.summary
      ? ex.summary.slice(0, 900)
      : en
        ? "Official or open-source summary unavailable."
        : "공시나 공개 요약이 없습니다.",
    en ? `Sources: ${sources}` : `출처: ${sources}`,
    ex.rfGapNote ||
      (en
        ? "North Korea, China, Russia, and Iran often hide radio tracks — treat any track as a bonus signal only."
        : "북한·중국·러시아·이란은 항적 신호를 자주 숨깁니다. 항적이 있어도 참고만 하십시오."),
  ];

  return {
    exerciseId: ex.id,
    title: en ? `Military exercise · ${ex.title}` : `군사 훈련 · ${ex.title}`,
    paragraphs,
    lat,
    lng,
  };
}

type Props = {
  briefing: ExerciseBriefingContent;
  lang: LabelLanguage;
  onDismiss: () => void;
};

/** 훈련 경보 양피지 — 전보음 + 즉시 전문 (공습과 동일 패턴, 사이렌 없음) */
export function ExerciseBriefingParchment({ briefing, lang, onDismiss }: Props) {
  return (
    <ParchmentLetter
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      ctaLabel={lang === "en" ? "Understood" : "확인"}
      onContinue={onDismiss}
      playBreakingDispatch
      typewriter={false}
      titleId="exercise-briefing-title"
      zIndexClass="z-[900]"
    />
  );
}
