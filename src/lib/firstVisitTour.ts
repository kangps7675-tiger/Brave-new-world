/**
 * 첫 방문 유저 1~11 화면 투어 — 크롬·뉴스·알림·기본 켜진 레이어까지.
 * 자동 풀투어는 없음. 등불 후 짧은 권유 배너 또는 기능 안내에서 시작.
 * 단계는 CTA(다음)만으로 진행 — 배경 클릭으로 넘어가지 않음.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { SpotlightPlacement } from "@/components/UiSpotlightCoachmark";
import { firstScreenLayersTourBody } from "@/lib/layerOnboarding";

export const FIRST_VISIT_TOUR_KEY = "geowatch-first-visit-tour-v1";
/** 등불 후 투어 권유 배너 — 거절/수락 시 다시 안 뜸 */
export const TOUR_INVITE_KEY = "geowatch-tour-invite-v1";

export type FirstVisitTourStepId =
  | "globe"
  | "nav"
  | "mode"
  | "theaters"
  | "layers"
  | "layers-on"
  | "bottom-intel"
  | "news-sheet"
  | "news-tabs"
  | "alerts"
  | "help";

export type FirstVisitTourStep = {
  id: FirstVisitTourStepId;
  targetSelector: string;
  placement: SpotlightPlacement;
  accent: "sky" | "amber" | "emerald" | "rose" | "violet";
  /** 뉴스 시트 열기 */
  openIntel?: boolean;
  /** 레이어 패널 열기 */
  openLayers?: boolean;
  /** 본문을 첫 화면 ON 레이어 목록으로 대체 */
  useFirstScreenLayersBody?: boolean;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  bodyEconomyKo?: string;
  bodyEconomyEn?: string;
};

export const FIRST_VISIT_TOUR_STEPS: FirstVisitTourStep[] = [
  {
    id: "globe",
    targetSelector: "#map-globe-section",
    placement: "above",
    accent: "sky",
    titleKo: "지구본",
    titleEn: "Globe",
    bodyKo:
      "마우스로 끌면 지구가 돌아가고, 휠로 확대·축소합니다. 빈 바다를 두 번 누르면 그곳으로 들어갑니다. 화면이 비스듬하면 Alt를 누른 채 끌어서 기울기를 맞출 수 있어요.",
    bodyEn:
      "Drag to spin the globe, scroll to zoom. Double-click empty ocean to dive in. If the view is tilted, hold Alt and drag to straighten it.",
  },
  {
    id: "nav",
    targetSelector: "#app-hover-nav",
    placement: "below",
    accent: "sky",
    titleKo: "위쪽 탐색",
    titleEn: "Top navigation",
    bodyKo:
      "검색과 ▾ 메뉴로 관심 나라·분쟁 이야기로 갑니다. 지도가 혼자 어디로 날아가지 않아요 — 고르신 곳으로만 갑니다.",
    bodyEn:
      "Search and ▾ take you to hubs and dispute stories. Nothing flies the camera on its own — only what you pick.",
    bodyEconomyKo:
      "검색·▾으로 에너지·물류 급소·금융 도시를 고르면 지도가 따라갑니다.",
    bodyEconomyEn:
      "Pick energy, chokepoints, or finance hubs from search / ▾ — the map follows.",
  },
  {
    id: "mode",
    targetSelector: "#view-mode-switcher",
    placement: "below",
    accent: "emerald",
    titleKo: "보는 렌즈",
    titleEn: "View lens",
    bodyKo:
      "같은 지구본을 다른 렌즈로 봅니다. 전쟁·안보는 전선과 공개 정보, 경제·물류는 에너지·항로·시장 쪽이에요.",
    bodyEn:
      "Same globe, different lens. Conflict = fronts & open-source intel. Economy = energy, shipping, markets.",
  },
  {
    id: "theaters",
    targetSelector: "#exploration-theater-dropdown",
    placement: "below",
    accent: "amber",
    titleKo: "주요 전장",
    titleEn: "Key theaters",
    bodyKo:
      "대만·한반도·우크라이나·중동처럼 ‘지금 시끄러운 곳’으로 한 번에 이동합니다. 누르면 그 지역에 맞는 레이어 묶음이 켜질 수 있어요.",
    bodyEn:
      "Jump to Taiwan, Korea, Ukraine, or the Middle East. A matching layer preset may turn on when you tap.",
    bodyEconomyKo: "주요 허브·해협(초크포인트)으로 빠르게 이동합니다.",
    bodyEconomyEn: "Jump quickly to key hubs and chokepoints.",
  },
  {
    id: "layers",
    targetSelector: "#layer-panel-toggle",
    placement: "below",
    accent: "violet",
    titleKo: "레이어(정보층)",
    titleEn: "Layers",
    bodyKo:
      "≡ 는 ‘지도 위에 무엇을 올릴지’ 스위치 모음입니다. 전쟁 구역·뉴스·배·비행기 등을 여기서 켜고 끕니다. 언어·글꼴도 여기 있어요.",
    bodyEn:
      "≡ is the switchboard for what sits on the map — zones, news, ships, aircraft, and more. Language and font live here too.",
  },
  {
    id: "layers-on",
    targetSelector: "#layer-panel-toggle",
    placement: "below",
    accent: "violet",
    openLayers: true,
    useFirstScreenLayersBody: true,
    titleKo: "지금 켜져 있는 것",
    titleEn: "What’s already on",
    bodyKo: "",
    bodyEn: "",
  },
  {
    id: "bottom-intel",
    targetSelector: "#bottom-intel-compact",
    placement: "above",
    accent: "sky",
    titleKo: "아래쪽 요약",
    titleEn: "Bottom strip",
    bodyKo:
      "오늘 눈에 띄는 곳·추천·시세 줄이 모인 자리입니다. 📰 를 누르면 뉴스 전체 창이 열립니다.",
    bodyEn:
      "Today’s hotspots, suggestions, and tickers live here. Tap 📰 for the full news sheet.",
    bodyEconomyKo: "증시 티커와 경제 소식 입구입니다. 📈 로 시장·RSS 창을 엽니다.",
    bodyEconomyEn: "Market tickers and economy news. Tap 📈 for markets & RSS.",
  },
  {
    id: "news-sheet",
    targetSelector: "#intel-news-sheet",
    placement: "above",
    accent: "sky",
    openIntel: true,
    titleKo: "뉴스 창",
    titleEn: "News sheet",
    bodyKo:
      "검증된 보도부터 아직 덜 확인된 속보까지 쌓입니다. 카드를 누르면 원문, 「지도로」로 그 현장으로 갑니다. 위 손잡이를 아래로 끌면 창이 접힙니다.",
    bodyEn:
      "Verified reports and fresher unverified items stack here. Open originals, or fly to the place. Drag the handle down to dock.",
  },
  {
    id: "news-tabs",
    targetSelector: "#intel-sheet-tabs",
    placement: "above",
    accent: "violet",
    openIntel: true,
    titleKo: "뉴스 탭",
    titleEn: "News tabs",
    bodyKo:
      "뉴스 / 동영상 / 텔레그램 / 전선 탭을 바꿉니다. 지역 칩으로 범위를 줄이고, 국영·속보 토글로 ‘시끄러운 정도’를 조절하세요.",
    bodyEn:
      "Switch News / Video / Telegram / front-line tabs. Theater chips narrow the region; state-media toggles control volume.",
    bodyEconomyKo: "증시 · RSS · 동영상 탭과 장르 칩으로 시장 뉴스를 고릅니다.",
    bodyEconomyEn: "Markets · RSS · Video tabs and genre chips filter economy news.",
  },
  {
    id: "alerts",
    targetSelector: "#air-raid-chrome",
    placement: "above",
    accent: "rose",
    titleKo: "실시간 알림",
    titleEn: "Live alerts",
    bodyKo:
      "공습 경보·위협 칩입니다. 누르면 지도가 그쪽으로 가고, 안내 소리가 날 수 있어요. 공식 경보 앱을 대신하지 않으니 참고용으로만 봐 주세요.",
    bodyEn:
      "Air-raid and threat chips. Tap to fly; a brief may follow. This is not an official alert app — use it as a reference only.",
  },
  {
    id: "help",
    targetSelector: "#feature-guide-button",
    placement: "below",
    accent: "amber",
    titleKo: "도움말",
    titleEn: "Help",
    bodyKo:
      "「이용 안내」에서 이 투어를 다시 시작할 수 있고, 출처에서 데이터가 어디서 왔는지 확인할 수 있습니다. 「다음」이 「완료」로 바뀌면 투어가 끝나요.",
    bodyEn:
      "Restart this tour anytime from the guide; Sources shows where the data comes from. When Next becomes Done, you’re finished.",
  },
];

export function readFirstVisitTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(FIRST_VISIT_TOUR_KEY) === "1";
  } catch {
    return true;
  }
}

export function markFirstVisitTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FIRST_VISIT_TOUR_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearFirstVisitTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FIRST_VISIT_TOUR_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldOfferFirstVisitTour(): boolean {
  return !readFirstVisitTourDone();
}

export function tourStepCopy(
  step: FirstVisitTourStep,
  lang: LabelLanguage,
  viewerMode: ViewerMode,
): { title: string; body: string } {
  const en = lang === "en";
  const economy = viewerMode === "economy";
  const title = en ? step.titleEn : step.titleKo;
  if (step.useFirstScreenLayersBody) {
    return { title, body: firstScreenLayersTourBody(viewerMode, lang) };
  }
  let body = en ? step.bodyEn : step.bodyKo;
  if (economy) {
    if (en && step.bodyEconomyEn) body = step.bodyEconomyEn;
    if (!en && step.bodyEconomyKo) body = step.bodyEconomyKo;
  }
  return { title, body };
}
