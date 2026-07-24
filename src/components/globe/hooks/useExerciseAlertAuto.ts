"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import {
  buildExerciseBriefingContent,
  type ExerciseBriefingContent,
} from "@/components/ExerciseBriefingParchment";
import type { ExerciseOffer } from "@/components/ExerciseOfferBanner";
import { exerciseFlyTarget } from "@/lib/militaryExerciseHatch";

const EXERCISE_FLY_MS = 900;

type UseExerciseAlertAutoOptions = {
  paused: boolean;
  labelLanguage: LabelLanguage;
  exercises: MilitaryExercise[];
  briefingBlocked: boolean;
  exerciseBriefing: ExerciseBriefingContent | null;
  setExerciseBriefing: (content: ExerciseBriefingContent | null) => void;
  flyTo: (lat: number, lng: number, altitude?: number, durationMs?: number) => void;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
};

/**
 * 신규 군사 훈련 — 레이어 soft ON → fly → 전보 양피지 (사이렌 없음).
 * 첫 스냅샷은 seen만. auto-ON 레이어는 활성 훈련 소진 시에만 OFF.
 */
export function useExerciseAlertAuto({
  paused,
  labelLanguage,
  exercises,
  briefingBlocked,
  exerciseBriefing,
  setExerciseBriefing,
  flyTo,
  patchLayerPrefsSoft,
  layerPrefsLiveRef,
}: UseExerciseAlertAutoOptions) {
  const [exerciseOffer, setExerciseOffer] = useState<ExerciseOffer | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const busyRef = useRef(false);
  const seqRef = useRef(0);
  const autoEnabledRef = useRef(false);
  const bannerDismissedKeyRef = useRef<string | null>(null);

  const engage = useCallback(
    (ex: MilitaryExercise) => {
      if (busyRef.current) return;
      const fly = exerciseFlyTarget(ex);
      if (!fly) return;

      busyRef.current = true;
      const seq = ++seqRef.current;
      const lang = labelLanguage === "en" ? "en" : "ko";

      if (!layerPrefsLiveRef.current.showMilitaryExercises) {
        autoEnabledRef.current = true;
        const patch: Partial<LayerPrefs> = { showMilitaryExercises: true };
        const opaque = ex.actors.some((a) => a === "nk" || a === "ir");
        if (!opaque) {
          if (!layerPrefsLiveRef.current.showAis) patch.showAis = true;
          if (!layerPrefsLiveRef.current.showMilitaryActivity) {
            patch.showMilitaryActivity = true;
          }
        }
        patchLayerPrefsSoft(patch);
      }

      const offer: ExerciseOffer = {
        key: ex.id,
        exercise: ex,
        title: ex.title,
      };
      if (bannerDismissedKeyRef.current !== offer.key) {
        setExerciseOffer(offer);
      }

      flyTo(fly.lat, fly.lng, fly.altitude, EXERCISE_FLY_MS);

      const brief = buildExerciseBriefingContent(ex, lang);
      window.setTimeout(() => {
        if (seq !== seqRef.current) return;
        if (brief && !briefingBlocked) {
          setExerciseBriefing(brief);
        }
        busyRef.current = false;
      }, EXERCISE_FLY_MS + 120);
    },
    [
      briefingBlocked,
      flyTo,
      labelLanguage,
      layerPrefsLiveRef,
      patchLayerPrefsSoft,
      setExerciseBriefing,
    ],
  );

  useEffect(() => {
    if (paused) return;
    const active = exercises.filter((e) => e.active);
    const keys = active.map((e) => e.id);

    if (seenRef.current == null) {
      seenRef.current = new Set(keys);
      return;
    }

    if (briefingBlocked || busyRef.current || exerciseBriefing) return;

    for (const ex of active) {
      if (seenRef.current.has(ex.id)) continue;
      seenRef.current.add(ex.id);
      if (exerciseFlyTarget(ex)) {
        engage(ex);
        break;
      }
    }
  }, [briefingBlocked, engage, exerciseBriefing, exercises, paused]);

  useEffect(() => {
    const anyActive = exercises.some((e) => e.active);
    if (anyActive) return;
    if (!autoEnabledRef.current) return;
    autoEnabledRef.current = false;
    patchLayerPrefsSoft({ showMilitaryExercises: false });
    setExerciseOffer(null);
    setExerciseBriefing(null);
  }, [exercises, patchLayerPrefsSoft, setExerciseBriefing]);

  const dismissOffer = useCallback(() => {
    if (exerciseOffer) bannerDismissedKeyRef.current = exerciseOffer.key;
    setExerciseOffer(null);
  }, [exerciseOffer]);

  return {
    exerciseOffer,
    dismissExerciseOffer: dismissOffer,
    exerciseAutoBusy: busyRef.current,
  };
}
