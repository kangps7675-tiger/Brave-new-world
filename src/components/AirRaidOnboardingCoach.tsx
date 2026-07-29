"use client";

import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";

export const AIR_RAID_COACH_KEY = "geowatch-air-raid-coach-v1";

export function readAirRaidCoachDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AIR_RAID_COACH_KEY) === "1";
  } catch {
    return true;
  }
}

export function markAirRaidCoachDone(): void {
  if (typeof window === "undefined") return;
  markNudgeShown("airRaidCoach");
}

/** 미열람 + 이번 세션 온보딩 예산이 남아 있을 때만 */
export function shouldOfferAirRaidCoach(): boolean {
  return canShowNudge("airRaidCoach", !readAirRaidCoachDone());
}

type AirRaidOnboardingCoachProps = {
  open: boolean;
  /** 데스크톱 우상단 vs 모바일 하단 */
  targetSelector?: string;
  /** 모바일 하단 칩이면 above */
  placement?: "below" | "above";
  lang?: "ko" | "en";
  onDismiss: () => void;
};

const COPY = {
  ko: {
    title: "공습 경보 버튼",
    body:
      "우크라이나(NEPTUN)·이스라엘(체바 아돔) 공습 경보 칩입니다. 누르면 해당 지역으로 이동하고, 이동 직후 사이렌이 짧게 울립니다. 이어폰을 권장하며, 원치 않으면 벨(소리) 버튼으로 언제든 끌 수 있습니다. 체크박스만 켠다고 사이렌이 나지 않습니다.",
    done: "알겠습니다",
    skip: "스킵",
  },
  en: {
    title: "Air-raid alert button",
    body:
      "Ukraine (NEPTUN) and Israel (Tzeva Adom) alert chips. Tap to fly to the region — a short siren plays after the move. Headphones recommended; mute anytime with the bell. Turning a layer on alone does not play the siren.",
    done: "Got it",
    skip: "Skip",
  },
} as const;

/**
 * 공습경보 칩이 처음 보일 때 1회 설명 (사이렌 = 칩 클릭 fly 후에만).
 */
export function AirRaidOnboardingCoach({
  open,
  targetSelector = "#air-raid-chrome",
  placement = "below",
  lang = "ko",
  onDismiss,
}: AirRaidOnboardingCoachProps) {
  if (!open) return null;
  const copy = lang === "en" ? COPY.en : COPY.ko;

  const finish = () => {
    markAirRaidCoachDone();
    onDismiss();
  };

  return (
    <UiSpotlightCoachmark
      open
      targetSelector={targetSelector}
      title={copy.title}
      body={copy.body}
      ctaLabel={copy.done}
      skipLabel={copy.skip}
      placement={placement}
      accent="rose"
      onDismiss={finish}
      onSkip={finish}
    />
  );
}
