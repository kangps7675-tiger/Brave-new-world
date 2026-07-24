"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import { markChromeCoachDone } from "@/components/ChromeOnboardingCoach";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  FIRST_VISIT_TOUR_STEPS,
  markFirstVisitTourDone,
  tourStepCopy,
  type FirstVisitTourStepId,
} from "@/lib/firstVisitTour";

type FirstVisitTourProps = {
  active: boolean;
  lang?: LabelLanguage;
  viewerMode: ViewerMode;
  onClose: () => void;
  onOpenIntel: () => void;
  onCloseIntel: () => void;
};

/**
 * 첫 방문 1~10 스포트라이트 투어.
 * 뉴스 시트 단계는 시트를 연 뒤 타깃을 가리킵니다.
 */
export function FirstVisitTour({
  active,
  lang = "ko",
  viewerMode,
  onClose,
  onOpenIntel,
  onCloseIntel,
}: FirstVisitTourProps) {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [resolvedSelector, setResolvedSelector] = useState("#map-globe-section");
  const steps = FIRST_VISIT_TOUR_STEPS;
  const step = steps[index] ?? steps[0]!;
  const total = steps.length;
  const en = lang === "en";

  const finish = useCallback(() => {
    markFirstVisitTourDone();
    markChromeCoachDone();
    onCloseIntel();
    onClose();
  }, [onClose, onCloseIntel]);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      setReady(false);
      return;
    }
    setIndex(0);
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;
    setReady(false);
    if (step.openIntel) onOpenIntel();
    else onCloseIntel();

    let cancelled = false;
    let tries = 0;
    const wait = () => {
      if (cancelled) return;
      const el = document.querySelector(step.targetSelector);
      if (el) {
        setResolvedSelector(step.targetSelector);
        setReady(true);
        return;
      }
      if (tries > 24) {
        const fallback =
          document.querySelector("#map-globe-section") != null
            ? "#map-globe-section"
            : "#app-hover-nav";
        setResolvedSelector(fallback);
        setReady(true);
        return;
      }
      tries += 1;
      window.setTimeout(wait, 120);
    };
    const t = window.setTimeout(wait, step.openIntel ? 320 : 50);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [active, index, step, onOpenIntel, onCloseIntel]);

  const copy = useMemo(
    () => tourStepCopy(step, lang, viewerMode),
    [step, lang, viewerMode],
  );

  if (!active || !ready) return null;

  const isLast = index >= total - 1;
  const isFirst = index <= 0;

  return (
    <UiSpotlightCoachmark
      open
      targetSelector={resolvedSelector}
      title={copy.title}
      body={copy.body}
      progressLabel={`${index + 1} / ${total}`}
      placement={step.placement}
      accent={step.accent}
      ctaLabel={isLast ? (en ? "Done" : "완료") : en ? "Next" : "다음"}
      skipLabel={en ? "Skip tour" : "투어 스킵"}
      backLabel={isFirst ? undefined : en ? "Back" : "이전"}
      onDismiss={() => {
        if (isLast) finish();
        else setIndex((i) => Math.min(i + 1, total - 1));
      }}
      onSkip={finish}
      onBack={isFirst ? undefined : () => setIndex((i) => Math.max(i - 1, 0))}
    />
  );
}

export type { FirstVisitTourStepId };
