/**
 * 첫 방문 유저 1~10 화면 투어 — 크롬·뉴스·알림까지.
 * 자동 풀투어는 없음. 등불 후 짧은 권유 배너 또는 기능 안내에서 시작.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { SpotlightPlacement } from "@/components/UiSpotlightCoachmark";

export const FIRST_VISIT_TOUR_KEY = "geowatch-first-visit-tour-v1";
/** 등불 후 투어 권유 배너 — 거절/수락 시 다시 안 뜸 */
export const TOUR_INVITE_KEY = "geowatch-tour-invite-v1";

export type FirstVisitTourStepId =
  | "globe"
  | "nav"
  | "mode"
  | "theaters"
  | "layers"
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
  /** 레이어 패널 열기 (선택) */
  openLayers?: boolean;
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
    titleKo: "1 · 지구본",
    titleEn: "1 · Globe",
    bodyKo:
      "드래그로 이동·회전, 스크롤로 줌합니다. 빈 바다를 더블클릭하면 그 지점으로 확대됩니다. 화면이 사선으로 기울어졌을 때 Alt를 누른 채 드래그하면 기울기·회전을 맞출 수 있습니다 (좌우=돌리기, 위아래=눕히기/세우기).",
    bodyEn:
      "Drag to pan/rotate, scroll to zoom. Double-click empty ocean to zoom in. When the view is tilted, hold Alt and drag to adjust pitch and bearing (left/right = spin, up/down = tilt).",
  },
  {
    id: "nav",
    targetSelector: "#app-hover-nav",
    placement: "below",
    accent: "sky",
    titleKo: "2 · 상단 탐색",
    titleEn: "2 · Top navigation",
    bodyKo:
      "검색과 ▾ 메뉴로 중국·러시아·북한·이란 허브, 분쟁사·축을 엽니다. 로딩만으로 자동 진입하지 않습니다.",
    bodyEn:
      "Search and ▾ open China/Russia/DPRK/Iran hubs and dispute history. Nothing auto-enters from loading alone.",
    bodyEconomyKo:
      "검색·▾으로 에너지·초크포인트·금융 허브를 고르면 지도가 이동합니다.",
    bodyEconomyEn:
      "Pick energy, chokepoints, or finance hubs from search / ▾ — the map follows your choice.",
  },
  {
    id: "mode",
    targetSelector: "#view-mode-switcher",
    placement: "below",
    accent: "emerald",
    titleKo: "3 · 지정학 ↔ 지경학",
    titleEn: "3 · Conflict ↔ Economy",
    bodyKo:
      "지정학은 전선·OSINT, 지경학은 에너지·물류·시장입니다. 같은 지구본을 다른 렌즈로 봅니다.",
    bodyEn:
      "Conflict = fronts & OSINT. Economy = energy, logistics, markets. Same globe, different lens.",
  },
  {
    id: "theaters",
    targetSelector: "#exploration-theater-dropdown",
    placement: "below",
    accent: "amber",
    titleKo: "4 · 주요전장",
    titleEn: "4 · Key theaters",
    bodyKo:
      "대만·한반도·우크라이나·중동으로 바로 날아갑니다. 클릭하면 해당 전장 레이어 프리셋이 켜집니다.",
    bodyEn:
      "Jump to Taiwan, Korea, Ukraine, or the Middle East. Clicking applies that theater’s layer preset.",
    bodyEconomyKo: "주요 허브·초크포인트로 빠르게 이동합니다.",
    bodyEconomyEn: "Jump quickly to key hubs and chokepoints.",
  },
  {
    id: "layers",
    targetSelector: "#layer-panel-toggle",
    placement: "below",
    accent: "violet",
    titleKo: "5 · 레이어",
    titleEn: "5 · Layers",
    bodyKo:
      "≡ 버튼에서 전쟁구역·GDELT·AIS·ADS-B·이란 NewFeeds 등을 켜고 끕니다. 표시 언어·UI 글꼴도 여기 있습니다.",
    bodyEn:
      "≡ toggles war zones, GDELT, AIS, ADS-B, Iran NewFeeds, and more. Display language and UI font live here too.",
  },
  {
    id: "bottom-intel",
    targetSelector: "#bottom-intel-compact",
    placement: "above",
    accent: "sky",
    titleKo: "6 · 하단 인텔",
    titleEn: "6 · Bottom intel",
    bodyKo:
      "투데이 핫스팟·맞춤 추천·티커가 모인 자리입니다. 📰를 누르면 전체 뉴스 시트가 열립니다.",
    bodyEn:
      "Today hotspot, For-you chips, and tickers live here. Tap 📰 to open the full news sheet.",
    bodyEconomyKo: "증시 티커와 경제 속보 입구입니다. 📈로 시장·RSS 시트를 엽니다.",
    bodyEconomyEn: "Market tickers and economy news. Tap 📈 for markets & RSS.",
  },
  {
    id: "news-sheet",
    targetSelector: "#intel-news-sheet",
    placement: "above",
    accent: "sky",
    openIntel: true,
    titleKo: "7 · 뉴스 시트",
    titleEn: "7 · News sheet",
    bodyKo:
      "검증 보도(Tier1)·보완·속보가 쌓입니다. 카드를 누르면 원문, 「지도보러가기」로 해당 전장으로 이동합니다. 핸들을 아래로 끌면 시트가 접힙니다.",
    bodyEn:
      "Verified (Tier1), secondary, and breaking items stack here. Open originals, or fly to the theater. Drag the handle down to dock.",
  },
  {
    id: "news-tabs",
    targetSelector: "#intel-sheet-tabs",
    placement: "above",
    accent: "violet",
    openIntel: true,
    titleKo: "8 · 뉴스 탭·필터",
    titleEn: "8 · News tabs & filters",
    bodyKo:
      "뉴스 / 동영상 / 텔레그램 OSINT / VIINA 전선 탭을 바꿉니다. 전장 칩으로 중동·러우 등을 거르고, Tier3(국영·속보) 토글로 수위를 조절하세요.",
    bodyEn:
      "Switch News / Video / Telegram OSINT / VIINA. Theater chips filter regions; Tier3 toggles state-media volume.",
    bodyEconomyKo: "증시 · RSS · 동영상 탭과 장르 칩으로 시장 뉴스를 고릅니다.",
    bodyEconomyEn: "Markets · RSS · Video tabs and genre chips filter economy news.",
  },
  {
    id: "alerts",
    targetSelector: "#air-raid-chrome",
    placement: "above",
    accent: "rose",
    titleKo: "9 · 실시간 알림",
    titleEn: "9 · Live alerts",
    bodyKo:
      "이스라엘 공습 경보·우크라 위협·이란 NewFeeds 칩입니다. 누르면 지도가 날아가고, 사이렌·브리핑이 이어질 수 있습니다. 대만해협 팔로우 칩도 하단 근처에 있습니다.",
    bodyEn:
      "Israel air-raid, Ukraine threats, and Iran NewFeeds chips. Tap to fly; sirens/briefs may follow. Taiwan Strait follow sits near the bottom strip too.",
  },
  {
    id: "help",
    targetSelector: "#feature-guide-button",
    placement: "below",
    accent: "amber",
    titleKo: "10 · 도움말·출처",
    titleEn: "10 · Help & sources",
    bodyKo:
      "「기능 안내」에서 언제든 투어를 시작할 수 있고, 출처 버튼으로 데이터 라이선스를 확인합니다.",
    bodyEn:
      "Start the tour anytime from Feature guide; Sources shows data licenses.",
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
  let body = en ? step.bodyEn : step.bodyKo;
  if (economy) {
    if (en && step.bodyEconomyEn) body = step.bodyEconomyEn;
    if (!en && step.bodyEconomyKo) body = step.bodyEconomyKo;
  }
  return { title, body };
}
