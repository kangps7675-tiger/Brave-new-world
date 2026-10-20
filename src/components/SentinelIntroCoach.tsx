"use client";

import { useEffect, useState } from "react";
import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import { SENTINEL_TOGGLE_ID } from "@/components/SentinelModeControl";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type Props = {
  lang: LabelLanguage;
  /** 첫 인상·게이트 이후 화면이 안정됐을 때 */
  ready: boolean;
  /** 이미 순회 중이면 소개 불필요 */
  sentinelActive: boolean;
  economyMode?: boolean;
  /** 「한번 켜보기」 */
  onTry: () => void;
};

/**
 * 자동 순회(구 센티넬) 1회 소개 — 버튼을 가리키며 무엇을 하는지 알려 준다.
 * SoundUnmuteNudge와 같이 온보딩 예산을 소비한다.
 */
export function SentinelIntroCoach({
  lang,
  ready,
  sentinelActive,
  economyMode = false,
  onTry,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || sentinelActive || open) return;
    if (!canShowNudge("sentinelIntro")) return;

    let cancelled = false;
    let tries = 0;

    const attempt = () => {
      if (cancelled) return;
      const el = document.getElementById(SENTINEL_TOGGLE_ID);
      if (!el) {
        tries += 1;
        if (tries < 25) {
          window.setTimeout(attempt, 200);
        }
        return;
      }
      if (!canShowNudge("sentinelIntro")) return;
      markNudgeShown("sentinelIntro");
      setOpen(true);
    };

    attempt();
    return () => {
      cancelled = true;
    };
  }, [ready, sentinelActive, open]);

  if (!open || sentinelActive) return null;

  const finish = () => setOpen(false);

  const tryAndFinish = () => {
    setOpen(false);
    onTry();
  };

  return (
    <UiSpotlightCoachmark
      open
      targetSelector={`#${SENTINEL_TOGGLE_ID}`}
      title={t("sentinelIntroTitle", lang)}
      body={
        economyMode
          ? t("sentinelIntroBodyEconomy", lang)
          : t("sentinelIntroBodyConflict", lang)
      }
      ctaLabel={t("sentinelIntroTry", lang)}
      skipLabel={t("sentinelIntroDismiss", lang)}
      placement="below"
      accent={economyMode ? "amber" : "rose"}
      onDismiss={tryAndFinish}
      onSkip={finish}
    />
  );
}
