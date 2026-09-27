/**
 * 레이어 패널 첫 오픈 — UX 「뭐가 뭔지」 양피지 (브라우저당 1회).
 * 독자: 지정학·지경학을 잘 모르는 아마추어 성인.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import { firstScreenLayersTourBody, listFirstScreenLayerLines } from "@/lib/layerOnboarding";

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

/** 레이어 패널을 처음 열었을 때 — 화면 구조 + 지금 켜진 레이어 */
export function buildUxGuideBriefContent(
  lang: LabelLanguage,
  viewerMode: ViewerMode = "conflict",
): UxGuideBriefContent {
  const onLines = listFirstScreenLayerLines(viewerMode, lang);
  const onNames = onLines.map((l) => l.title).join(lang === "en" ? ", " : " · ");

  if (lang === "en") {
    return {
      title: "How to read this screen",
      paragraphs: [
        "Brave New World is an observatory map — news and movement stacked on a globe. You don’t need geopolitics training. Turn on only what you’re curious about.",
        "The buttons up top are lenses: History (why today looks like this), Live (what’s moving now), Geoeconomics (trade, energy, markets).",
        onNames
          ? `For this view, these layers start on: ${onNames}. They’re map overlays — not official alerts. You can switch any off in ≡.`
          : "Open ≡ to pick layers. Nothing scary is forced on.",
        "When you turn a new layer on, a short tip can point at that switch and explain it. Tap Got it to continue — tips never auto-flip by themselves.",
        "Tap a mark on the map (or a menu item) and a parchment like this opens. This is a reference tool, not an official alert app.",
      ],
      ctaLabel: "Got it",
    };
  }
  return {
    title: "이 화면, 이렇게 보시면 됩니다",
    paragraphs: [
      "멋진 신세계는 세계 소식과 움직임을 지구본에 모아 보여 주는 관측 지도입니다. 지정학을 몰라도 괜찮습니다 — 궁금한 것만 켜서 보시면 됩니다.",
      "맨 위 버튼들은 보는 렌즈입니다. 「역사」는 왜 오늘이 이렇게 됐는지, 「라이브」는 지금 움직이는 것, 「지경학」은 무역·에너지·시장 쪽입니다.",
      onNames
        ? `지금 이 보기에서는 이런 레이어가 켜져 시작합니다: ${onNames}. 지도 위에 올린 정보층일 뿐, 공식 경보가 아닙니다. ≡ 에서 언제든 끌 수 있어요.`
        : "≡ 에서 레이어를 골라 켜면 됩니다. 강제로 위험한 것이 켜져 있지는 않습니다.",
      "레이어를 새로 켜면, 그 스위치를 가리키며 짧은 설명이 뜰 수 있습니다. 「알겠어요」를 눌러야 다음으로 갑니다 — 혼자 촤르륵 넘어가지 않아요.",
      "지도 위 표시나 메뉴 항목을 누르면 지금처럼 양피지 설명창이 열립니다. 공식 경보 앱이 아니니 참고용으로만 봐 주세요.",
    ],
    ctaLabel: "알겠어요",
  };
}

/** 테스트·디버그용 — 본문에 첫 화면 레이어 설명이 들어가는지 */
export function uxGuideMentionsFirstScreen(lang: LabelLanguage, mode: ViewerMode): boolean {
  const body = firstScreenLayersTourBody(mode, lang);
  return body.length > 20;
}
