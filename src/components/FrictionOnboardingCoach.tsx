"use client";

import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";

export const FRICTION_COACH_KEY = "geowatch-friction-coach-v1";

export type FrictionCoachStep = "list" | "history";

export function readFrictionCoachDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(FRICTION_COACH_KEY) === "1";
  } catch {
    return true;
  }
}

export function markFrictionCoachDone(): void {
  if (typeof window === "undefined") return;
  markNudgeShown("frictionCoach");
}

/** 미열람 + 이번 세션 온보딩 예산이 남아 있을 때만 */
export function shouldOfferFrictionCoach(): boolean {
  return canShowNudge("frictionCoach", !readFrictionCoachDone());
}

type FrictionOnboardingCoachProps = {
  step: FrictionCoachStep | null;
  lang?: "ko" | "en";
  onStepChange: (next: FrictionCoachStep | null) => void;
};

const COPY = {
  ko: {
    listTitle: "영토분쟁 · 같은 진영끼리의 충돌",
    listBody:
      "각 카드가 한 현장입니다. 누르면 그곳으로 이동하고 이야기가 열립니다. 「영토분쟁」에서는 국경 긴장과 한 목록으로 볼 수 있습니다. ✕ 로 시간순 보기를 끝냅니다.",
    listCta: "다음 — 현장 고르기",
    historyTitle: "시간순으로 보기",
    historyBody:
      "전개 단계를 누르면 지도 표시가 따라갑니다. 「이야기 다시 읽기」·「목록」·「카드 공유」·「역사 나가기」를 쓰세요. 지도를 축소해도 이 화면은 유지됩니다.",
    historyCta: "알겠습니다",
    skip: "스킵",
  },
  en: {
    listTitle: "Territorial disputes · clashes inside a bloc",
    listBody:
      "Each card is one site. Tap to fly there and open the story. In Territorial disputes you can browse them with border tensions as one list. Use ✕ to leave timeline view.",
    listCta: "Next — pick a site",
    historyTitle: "Timeline controls",
    historyBody:
      "Stage buttons drive map markers. Use Reread the story, List, Share card, and Exit. Zooming out won’t eject you.",
    historyCta: "Got it",
    skip: "Skip",
  },
} as const;

/**
 * 분쟁외교사(regime) 첫 진입 — 목록 버튼 → 역사 크롬 조작법.
 */
export function FrictionOnboardingCoach({
  step,
  lang = "ko",
  onStepChange,
}: FrictionOnboardingCoachProps) {
  if (!step) return null;
  const copy = lang === "en" ? COPY.en : COPY.ko;

  const skipAll = () => {
    markFrictionCoachDone();
    onStepChange(null);
  };

  if (step === "list") {
    return (
      <UiSpotlightCoachmark
        open
        targetSelector="#axis-regime-panel"
        title={copy.listTitle}
        body={copy.listBody}
        ctaLabel={copy.listCta}
        skipLabel={copy.skip}
        placement="below"
        accent="violet"
        onDismiss={() => onStepChange(null)}
        onSkip={skipAll}
      />
    );
  }

  return (
    <UiSpotlightCoachmark
      open
      targetSelector="#friction-history-chrome"
      title={copy.historyTitle}
      body={copy.historyBody}
      ctaLabel={copy.historyCta}
      skipLabel={copy.skip}
      placement="above"
      accent="violet"
      onDismiss={() => {
        markFrictionCoachDone();
        onStepChange(null);
      }}
      onSkip={skipAll}
    />
  );
}
