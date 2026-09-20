/**
 * 레이어 패널 첫 오픈 — UX 「뭐가 뭔지」 양피지 (브라우저당 1회).
 * 독자: 지정학·지경학을 잘 모르는 아마추어 성인.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export const UX_GUIDE_BRIEF_KEY = "cv-ux-guide-brief-v1";

export type UxGuideBriefContent = {
  title: string;
  paragraphs: string[];
  ctaLabel: string;
};

export function readUxGuideBriefDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(UX_GUIDE_BRIEF_KEY) === "1";
  } catch {
    return true;
  }
}

export function markUxGuideBriefDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UX_GUIDE_BRIEF_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferUxGuideBrief(): boolean {
  return !readUxGuideBriefDone();
}

/** 레이어 패널을 처음 열었을 때 — 화면 구조만 친절히 */
export function buildUxGuideBriefContent(lang: LabelLanguage): UxGuideBriefContent {
  if (lang === "en") {
    return {
      title: "How to read this screen",
      paragraphs: [
        "Brave New World is an observatory map — news, movement, and market signals stacked on a globe. You don’t need geopolitics training. Turn on only what you’re curious about.",
        "The three buttons on top are lenses. History = why today looks like this. Live = what’s moving now. Geoeconomics = trade, energy, and markets.",
        "In the ≡ layers list, turn something on. Then tap a mark on the map (or a menu item) — a parchment like this opens to explain it. This is not an official alert app; use it as a reference.",
      ],
      ctaLabel: "Got it",
    };
  }
  return {
    title: "이 화면, 이렇게 보시면 됩니다",
    paragraphs: [
      "멋진 신세계는 세계 소식과 움직임을 지구본에 모아 보여 주는 관측 지도입니다. 지정학을 몰라도 괜찮습니다 — 궁금한 것만 켜서 보시면 됩니다.",
      "맨 위 버튼 세 개는 보는 렌즈입니다. 「역사」는 왜 오늘이 이렇게 됐는지, 「라이브」는 지금 움직이는 것, 「지경학」은 무역·에너지·시장 쪽입니다.",
      "왼쪽 ≡ 레이어에서 정보를 켠 뒤, 지도 위 표시나 메뉴 항목을 누르면 지금처럼 양피지 설명창이 열립니다. 공식 경보 앱이 아니니 참고용으로만 봐 주세요.",
    ],
    ctaLabel: "알겠어요",
  };
}
