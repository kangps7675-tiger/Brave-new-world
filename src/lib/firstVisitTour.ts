/**
 * 첫 방문 화면 투어 — 현행 상단 크롬(3렌즈·묻기·메뉴·요약본·레이어).
 * 자동 풀투어 없음. 「둘러보기」수락 또는 메뉴 → 이용 안내에서만 시작.
 * 단계는 CTA(다음)만으로 진행 — 배경 클릭으로 넘어가지 않음.
 * 끝냄은 localStorage(FIRST_VISIT_TOUR_KEY) — 같은 브라우저는 자동 권유 안 함.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import type { SpotlightPlacement } from "@/components/UiSpotlightCoachmark";
import { firstScreenLayersTourBody } from "@/lib/layerOnboarding";

export const FIRST_VISIT_TOUR_KEY = "geowatch-first-visit-tour-v1";
/** 둘러보기 권유 배너 — 거절/수락 시 다시 안 뜸 */
export const TOUR_INVITE_KEY = "geowatch-tour-invite-v1";

export type FirstVisitTourStepId =
  | "globe"
  | "nav"
  | "ask"
  | "mode"
  | "menu"
  | "layers"
  | "layers-on"
  | "brief"
  | "bottom-intel"
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
  bodySatelliteKo?: string;
  bodySatelliteEn?: string;
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
      "검색과 ▾ 메뉴로 관심 나라·영토분쟁·역사지도로 갑니다. 지도가 혼자 날아가지 않아요 — 고르신 곳으로만 갑니다.",
    bodyEn:
      "Search and ▾ take you to hubs, disputes, and the history map. Nothing flies the camera on its own — only what you pick.",
    bodyEconomyKo:
      "검색·▾으로 에너지·물류 급소·금융 도시를 고르면 지도가 따라갑니다.",
    bodyEconomyEn:
      "Pick energy, chokepoints, or finance hubs from search / ▾ — the map follows.",
  },
  {
    id: "ask",
    targetSelector: "#ask-layers-button",
    placement: "below",
    accent: "amber",
    titleKo: "묻기",
    titleEn: "Ask",
    bodyKo:
      "검색 옆 「묻기」에 홍해·이란·우크라처럼 짧게 적으면, 관련 레이어가 켜지고 지도가 그쪽으로 맞춰집니다. 긴 해설 채팅이 아니라 ‘지도를 맞추는’ 버튼입니다.",
    bodyEn:
      "Tap Ask beside search and type a short cue (Red Sea, Iran, Ukraine). Matching layers turn on and the camera follows — map alignment, not a long chat.",
  },
  {
    id: "mode",
    targetSelector: "#view-mode-switcher",
    placement: "below",
    accent: "emerald",
    titleKo: "세 가지 렌즈",
    titleEn: "Three lenses",
    bodyKo:
      "같은 지구본을 세 렌즈로 봅니다. 「지정학」은 전선·분쟁, 「3D 라이브」는 실시간 입체 지도·항적, 「지경학」은 시장·항로·에너지입니다. 역사 지도는 위쪽 메뉴에서 따로 엽니다.",
    bodyEn:
      "Same globe, three lenses: Geopolitics (fronts & disputes), 3D Live (realtime globe & tracks), Geoeconomics (markets, lanes, energy). History map opens from the top menu, not this switch.",
    bodyEconomyKo:
      "지금 지경학 렌즈입니다. 「지정학」·「3D 라이브」로 바꿔 같은 지구를 다른 눈으로 볼 수 있어요.",
    bodyEconomyEn:
      "You’re on the Geoeconomics lens. Switch to Geopolitics or 3D Live for the same globe with a different focus.",
    bodySatelliteKo:
      "지금 3D 라이브입니다. Cesium 입체 지구와 실시간 신호가 중심이에요. 「지정학」·「지경학」으로도 바꿀 수 있습니다.",
    bodySatelliteEn:
      "You’re on 3D Live — Cesium globe and live signals. Switch to Geopolitics or Geoeconomics anytime.",
  },
  {
    id: "menu",
    targetSelector: "#chrome-menu-peep",
    placement: "below",
    accent: "sky",
    titleKo: "메뉴",
    titleEn: "Menu",
    bodyKo:
      "왼쪽 가장자리 「메뉴」탭(또는 연 뒤의 메뉴 버튼)에서 레이어·설정·장면 시작·이용 안내·출처를 엽니다. 이 투어도 나중에 이용 안내에서 다시 볼 수 있어요.",
    bodyEn:
      "The left edge Menu peep (or the Menu button when open) holds layers, settings, Scene start, Help, and Sources. Restart this tour from Help anytime.",
  },
  {
    id: "layers",
    targetSelector: "#layer-panel-toggle",
    placement: "below",
    accent: "violet",
    titleKo: "레이어(정보층)",
    titleEn: "Layers",
    bodyKo:
      "「레이어」는 지도 위에 무엇을 올릴지 고르는 스위치입니다. 전쟁 구역·뉴스·배·비행기 등을 켜고 끕니다. 언어·글꼴도 여기(또는 메뉴 → 설정)에 있어요.",
    bodyEn:
      "Layers is the switchboard for what sits on the map — zones, news, ships, aircraft. Language and font live here (or Menu → Settings).",
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
    id: "brief",
    targetSelector: "#macro-briefing-toggle",
    placement: "below",
    accent: "amber",
    titleKo: "오늘 한눈에",
    titleEn: "Overview",
    bodyKo:
      "「오늘 한눈에」는 오늘 상황을 짧게 읽어 주는 입구입니다. 궁금할 때만 열면 되고, 안 열어도 지도는 그대로 쓸 수 있어요.",
    bodyEn:
      "Overview is a short read of today’s picture. Open when curious — the map works fine without it.",
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
    id: "help",
    targetSelector: "#chrome-menu-peep",
    placement: "below",
    accent: "amber",
    titleKo: "다시 보는 법",
    titleEn: "How to revisit",
    bodyKo:
      "왼쪽 「메뉴」→ 이용 안내에서 이 투어를 다시 시작할 수 있고, 출처에서 데이터가 어디서 왔는지 확인할 수 있습니다. 「완료」를 누르면 투어가 끝나요 — 같은 브라우저에서는 자동으로 다시 안 뜹니다.",
    bodyEn:
      "Restart from left Menu → Help; Sources shows where data comes from. Tap Done to finish — this browser won’t auto-invite again.",
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
  const title = en ? step.titleEn : step.titleKo;
  if (step.useFirstScreenLayersBody) {
    return { title, body: firstScreenLayersTourBody(viewerMode, lang) };
  }
  let body = en ? step.bodyEn : step.bodyKo;
  if (viewerMode === "economy") {
    if (en && step.bodyEconomyEn) body = step.bodyEconomyEn;
    if (!en && step.bodyEconomyKo) body = step.bodyEconomyKo;
  } else if (viewerMode === "satellite" || viewerMode === "live") {
    if (en && step.bodySatelliteEn) body = step.bodySatelliteEn;
    if (!en && step.bodySatelliteKo) body = step.bodySatelliteKo;
  }
  return { title, body };
}
