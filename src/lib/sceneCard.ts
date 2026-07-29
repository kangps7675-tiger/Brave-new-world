/**
 * 공유 장면 → 폰용 카드 모델 (P2-3-A)
 *
 * ── 무엇이 깨져 있었나 ─────────────────────────────────────────────
 *   데스크톱에서 ShareView → `?scene=…`
 *     → 폰이 링크를 연다
 *     → 폰은 지구본을 **의도적으로** 마운트하지 않는다 (usePhoneUi)
 *     → 딥링크는 지구본 경로에서만 의미가 있다
 *     → 장면을 못 본다 → 재공유 불가 → **성장 루프 단절**
 *
 * 폰에서 지구본을 띄우는 건 답이 아니다. 그건 성능상 옳은 결단이었고
 * 바꾸면 레이어·LOD·캡·터치 IA를 한 벌 더 관리하게 된다.
 *
 * ── 폰에서의 약속 ─────────────────────────────────────────────────
 *   「지도」가 아니라 **「오늘의 긴장을 읽고, 공유된 장면을 이해할 수 있다」**
 *   지도 조작은 데스크톱·태블릿의 일.
 *
 * 이 모듈은 좌표를 사람이 읽을 수 있는 장소로 되돌리고, 켜져 있던 레이어에서
 * "무엇을 보고 있었는지"를 뽑아 카드 한 장으로 만든다.
 */

import type { SceneLinkState } from "@/lib/sceneLink";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type ScenePlace = {
  id: string;
  ko: string;
  en: string;
  lat: number;
  lng: number;
};

/**
 * 좌표 → 지명 역참조용 앵커.
 * 전장(theater) + 해상 초크포인트. 공유되는 장면 대부분이 이 근처다.
 */
export const SCENE_PLACES: ScenePlace[] = [
  { id: "middle-east", ko: "중동", en: "Middle East", lat: 29.2, lng: 42.5 },
  { id: "russia-ukraine", ko: "러시아·우크라이나", en: "Russia · Ukraine", lat: 48.5, lng: 34 },
  { id: "china-taiwan", ko: "대만 해협", en: "Taiwan Strait", lat: 24.48, lng: 119.5 },
  { id: "korea", ko: "한반도", en: "Korean Peninsula", lat: 38.0, lng: 127.3 },
  { id: "japan", ko: "일본", en: "Japan", lat: 36, lng: 138 },
  { id: "south-asia", ko: "남아시아", en: "South Asia", lat: 22, lng: 78 },
  { id: "southeast-asia", ko: "남중국해·동남아", en: "South China Sea", lat: 8, lng: 115 },
  { id: "south-america", ko: "남미", en: "South America", lat: -15, lng: -58 },
  { id: "africa", ko: "아프리카", en: "Africa", lat: 8, lng: 18 },
  { id: "arctic", ko: "북극", en: "Arctic", lat: 75, lng: 40 },
  { id: "atlantic", ko: "북대서양", en: "North Atlantic", lat: 55, lng: -30 },
  { id: "choke-hormuz", ko: "호르무즈 해협", en: "Strait of Hormuz", lat: 26.58, lng: 56.25 },
  { id: "choke-suez", ko: "수에즈 운하", en: "Suez Canal", lat: 31.25, lng: 32.34 },
  { id: "choke-bab-el-mandeb", ko: "바브엘만데브 해협", en: "Bab el-Mandeb", lat: 12.61, lng: 43.35 },
  { id: "choke-malacca", ko: "믈라카 해협", en: "Malacca Strait", lat: 2.5, lng: 101.5 },
  { id: "choke-panama", ko: "파나마 운하", en: "Panama Canal", lat: 9.08, lng: -79.68 },
  { id: "choke-gibraltar", ko: "지브롤터 해협", en: "Strait of Gibraltar", lat: 35.95, lng: -5.6 },
  { id: "choke-good-hope", ko: "희망봉", en: "Cape of Good Hope", lat: -34.35, lng: 18.48 },
];

/** 대원거리 근사 (km) — 지명 역참조에는 이 정도면 충분 */
export function roughDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const meanLat = ((a.lat + b.lat) / 2) * toRad;
  const dLng = (b.lng - a.lng) * toRad * Math.cos(meanLat);
  return Math.sqrt(dLat * dLat + dLng * dLng) * 6371;
}

/**
 * 가장 가까운 앵커. 너무 멀면 null —
 * "남대서양 한복판"을 「아프리카」라고 부르면 오히려 신뢰를 잃는다.
 */
export function nearestScenePlace(
  lat: number,
  lng: number,
  maxKm = 2_200,
): ScenePlace | null {
  let best: ScenePlace | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const place of SCENE_PLACES) {
    const km = roughDistanceKm({ lat, lng }, place);
    if (km < bestKm) {
      bestKm = km;
      best = place;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}

/** 켜져 있던 레이어에서 "무엇을 보던 장면인가"를 뽑는 매핑 */
const LAYER_TOPICS: Array<{ keys: string[]; ko: string; en: string }> = [
  { keys: ["showWarZones", "showGdeltWar", "showMilitaryActivity"], ko: "전선·교전", en: "Fronts & combat" },
  { keys: ["showUkraineControl", "showNeptun"], ko: "우크라이나 전황", en: "Ukraine front" },
  { keys: ["showAis", "showShippingLanes", "showLogisticsRisk", "showPorts"], ko: "해상 물류", en: "Maritime logistics" },
  { keys: ["showUkmtoIncidents", "showNavareaWarnings"], ko: "해상 경보", en: "Maritime alerts" },
  { keys: ["showOilPipelines", "showGasPipelines", "showLngTerminals", "showSubseaPipelines"], ko: "에너지 배관", en: "Energy pipelines" },
  { keys: ["showSubmarineCables", "showInternetExchanges"], ko: "해저 케이블", en: "Subsea cables" },
  { keys: ["showUsCarriers", "showMilitaryBases"], ko: "미군 전개", en: "US posture" },
  { keys: ["showAirTraffic", "showGpsInterference"], ko: "항공·GNSS", en: "Air & GNSS" },
  { keys: ["showFirmsFires"], ko: "화재 감지", en: "Fire detections" },
  { keys: ["showTelegramOsint"], ko: "텔레그램 OSINT", en: "Telegram OSINT" },
  { keys: ["showCriticalNodes", "showAiDataCenters"], ko: "크리티컬 노드", en: "Critical nodes" },
];

/** 장면에서 최대 3개 주제 — 8개를 나열하면 카드가 아니라 목록이 된다 */
export function sceneTopics(layers: string[] | null, lang: LabelLanguage, max = 3): string[] {
  if (!layers || layers.length === 0) return [];
  const on = new Set(layers);
  const out: string[] = [];
  for (const topic of LAYER_TOPICS) {
    if (topic.keys.some((k) => on.has(k))) {
      out.push(lang === "en" ? topic.en : topic.ko);
      if (out.length >= max) break;
    }
  }
  return out;
}

export type SceneCard = {
  /** 지명 (역참조 실패 시 좌표 문자열) */
  placeLabel: string;
  /** 앵커를 찾았는가 — false면 좌표만 보여준 것 */
  placeResolved: boolean;
  modeLabel: string;
  topics: string[];
  lat: number;
  lng: number;
};

export function buildSceneCard(scene: SceneLinkState, lang: LabelLanguage): SceneCard {
  const en = lang === "en";
  const place = nearestScenePlace(scene.lat, scene.lng);
  const coords = `${scene.lat.toFixed(1)}°, ${scene.lng.toFixed(1)}°`;

  return {
    placeLabel: place ? (en ? place.en : place.ko) : coords,
    placeResolved: place != null,
    modeLabel:
      scene.mode === "economy"
        ? en
          ? "Geoeconomics"
          : "지경학"
        : en
          ? "Geopolitics"
          : "지정학",
    topics: sceneTopics(scene.layers, lang),
    lat: scene.lat,
    lng: scene.lng,
  };
}
