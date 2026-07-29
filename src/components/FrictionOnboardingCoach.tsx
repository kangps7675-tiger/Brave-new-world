"use client";

import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";

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
  try {
    localStorage.setItem(FRICTION_COACH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferFrictionCoach(): boolean {
  return !readFrictionCoachDone();
}

type FrictionOnboardingCoachProps = {
  step: FrictionCoachStep | null;
  lang?: "ko" | "en";
  onStepChange: (next: FrictionCoachStep | null) => void;
};

const COPY = {
  ko: {
    listTitle: "영토분쟁 · 진영 내부 목록",
    listBody:
      "각 카드가 한 현장입니다. 누르면 좌표로 이동하고 양피지 브리프가 열립니다. 「영토분쟁」에서는 국경·화약고와 한 아카이브로 포괄 열람할 수 있습니다. ✕ 로 역사 모드를 종료합니다.",
    listCta: "다음 — 현장 고르기",
    historyTitle: "역사 모드 조작",
    historyBody:
      "전개 단계를 누르면 지도 콜아웃이 따라갑니다. 「양피지 다시 읽기」·「목록」·「카드 공유」·「역사 나가기」를 쓰세요. 줌아웃해도 이 모드는 유지됩니다.",
    historyCta: "알겠습니다",
    skip: "스킵",
  },
  en: {
    listTitle: "Territorial archive · intra-bloc",
    listBody:
      "Each card is one site. Tap to fly there and open the parchment brief. In Territorial disputes you can browse them with border kegs as one archive. Use ✕ to leave history mode.",
    listCta: "Next — pick a site",
    historyTitle: "History mode controls",
    historyBody:
      "Stage buttons drive map callouts. Use Reopen parchment, List, Share card, and Exit history. Zooming out won’t eject you.",
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
