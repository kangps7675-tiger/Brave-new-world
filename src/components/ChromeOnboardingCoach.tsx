"use client";

import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import type { ViewerMode } from "@/lib/viewPackages";

export const CHROME_COACH_KEY = "geowatch-chrome-coach-v4";

export type ChromeCoachStep = "nav";

export function readChromeCoachDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CHROME_COACH_KEY) === "1";
  } catch {
    return true;
  }
}

export function markChromeCoachDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHROME_COACH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferChromeCoach(): boolean {
  return !readChromeCoachDone();
}

type ChromeOnboardingCoachProps = {
  step: ChromeCoachStep | null;
  viewerMode: ViewerMode;
  lang?: "ko" | "en";
  onStepChange: (next: ChromeCoachStep | null) => void;
};

const COPY = {
  ko: {
    title: "탐색은 여기서",
    conflict:
      "상단 검색·옆 「묻기」·▾ 메뉴로 허브·분쟁사를 열고, 우측 「주요전장」으로 충돌지에 바로 갈 수 있습니다. 「묻기」는 관련 레이어를 자동으로 켭니다. 하단 뉴스 창은 궁금할 때 탭하세요. 로딩만으로 자동 진입하지 않습니다.",
    economy:
      "상단 검색·옆 「묻기」·▾ 메뉴로 에너지·초크·금융 허브를 고르면 지도가 움직입니다. 「묻기」로 항로·초크 레이어를 맞출 수 있습니다. 하단은 시장·경제 뉴스와 티커입니다.",
    done: "알겠습니다",
    skip: "스킵",
  },
  en: {
    title: "Explore from here",
    conflict:
      "Use top search, 「Ask」 beside it, and ▾ for hubs and dispute history; “Key theaters” jumps to Taiwan, Korea, Ukraine, or the Middle East. 「Ask」 turns on matching layers. Bottom news opens when you want it—nothing auto-enters from loading alone.",
    economy:
      "Pick energy, chokepoints, or finance hubs from top search / 「Ask」 / ▾. 「Ask」 can align shipping and chokepoint layers. Bottom strip is markets and economy news.",
    done: "Got it",
    skip: "Skip",
  },
} as const;

/**
 * 도메인 진입 후 공통 온보딩 1회 — 상단 탐색 + 하단 뉴스 한 장으로 안내.
 * (과도한 “누르세요” 연쇄를 줄이기 위해 nav→news 2단을 합침)
 */
export function ChromeOnboardingCoach({
  step,
  viewerMode,
  lang = "ko",
  onStepChange,
}: ChromeOnboardingCoachProps) {
  if (!step) return null;
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const isEconomy = viewerMode === "economy";

  const finish = () => {
    markChromeCoachDone();
    onStepChange(null);
  };

  return (
    <UiSpotlightCoachmark
      open
      targetSelector="#app-hover-nav"
      title={copy.title}
      body={isEconomy ? copy.economy : copy.conflict}
      ctaLabel={copy.done}
      skipLabel={copy.skip}
      placement="below"
      accent={isEconomy ? "emerald" : "sky"}
      onDismiss={finish}
      onSkip={finish}
    />
  );
}
