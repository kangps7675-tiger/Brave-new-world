"use client";

import type { MilitaryExercise } from "@/lib/militaryExercises";
import { EXERCISE_CONFIDENCE_LABEL } from "@/lib/militaryExercises";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type ExerciseOffer = {
  key: string;
  exercise: MilitaryExercise;
  title: string;
};

type Props = {
  offer: ExerciseOffer;
  lang: LabelLanguage;
  onDismiss: () => void;
};

export function ExerciseOfferBanner({ offer, lang, onDismiss }: Props) {
  const en = lang === "en";
  const conf = EXERCISE_CONFIDENCE_LABEL[offer.exercise.confidence];

  return (
    <div
      role="status"
      className="pointer-events-auto fixed left-1/2 top-[4.6rem] z-[10020] flex w-[min(92vw,420px)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-cyan-400/35 bg-[#041016]/92 px-3.5 py-2.5 shadow-xl backdrop-blur-md"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
          {en ? "Military exercise" : "군사 훈련 경보"}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-50">{offer.title}</p>
        <p className="mt-0.5 text-[11px] text-cyan-100/70">{en ? conf.en : conf.ko}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-200 hover:border-white/30"
      >
        {en ? "Hide" : "닫기"}
      </button>
    </div>
  );
}
