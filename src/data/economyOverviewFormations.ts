/**
 * 지경학 개관 — 지정학 STRATEGIC_OVERVIEW_CALLOUTS / STRATEGIC_SUPPORT_LINKS 대응.
 * 금융 허브 별은 financialMarketHubMarkers가 담당. 여기는 상시 콜아웃 3건 +
 * 에너지·무역·결제 축 소수 호만 큐레이션한다 (전체 CRINK/축 네트워크는 패널 토글).
 */

import type { SituationCallout } from "@/data/situationCalloutTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { greatCircleArc } from "@/lib/axisNetworkPaths";
import type { TransportPath } from "@/data/geoTypes";

/** 지경학 개관 상시 콜아웃 3건 */
export const ECONOMY_OVERVIEW_CALLOUTS: SituationCallout[] = [
  {
    id: "econ-overview-chokepoints",
    theater: "middle-east",
    lat: 22.5,
    lng: 48.5,
    title: "호르무즈 · 홍해 · 대만해협",
    body: "세계 원유·컨테이너 물량의 병목입니다. 봉쇄·우회가 유가·운임·보험료로 바로 전달됩니다.",
    side: "neutral",
  },
  {
    id: "econ-overview-semiconductor",
    theater: "china-taiwan",
    lat: 24.8,
    lng: 121.0,
    title: "반도체 회랑",
    body: "대만·한국·일본·미국을 잇는 설계·제조·장비 사슬입니다. 공급 차질이 전 산업 재고·가격으로 번집니다.",
    side: "blue",
  },
  {
    id: "econ-overview-dollar-hubs",
    theater: "korea",
    lat: 38.5,
    lng: -40,
    title: "달러 · 결제 허브",
    body: "뉴욕·런던·싱가포르 등에서 무역 결제·외환이 집중됩니다. 제재·청산 규칙이 자금 흐름을 가릅니다.",
    side: "blue",
  },
];

export type EconomyAxisHub = {
  id: string;
  lat: number;
  lng: number;
  nameKo: string;
  nameEn: string;
};

/** 큐레이션 축 끝점 — 공개 좌표 근사 */
export const ECONOMY_AXIS_HUBS: EconomyAxisHub[] = [
  { id: "hub-hormuz", lat: 26.6, lng: 56.3, nameKo: "호르무즈", nameEn: "Hormuz" },
  { id: "hub-rotterdam", lat: 51.95, lng: 4.14, nameKo: "로테르담", nameEn: "Rotterdam" },
  { id: "hub-shanghai", lat: 31.23, lng: 121.47, nameKo: "상하이", nameEn: "Shanghai" },
  { id: "hub-singapore", lat: 1.26, lng: 103.82, nameKo: "싱가포르", nameEn: "Singapore" },
  { id: "hub-ny", lat: 40.71, lng: -74.0, nameKo: "뉴욕", nameEn: "New York" },
  { id: "hub-london", lat: 51.51, lng: -0.13, nameKo: "런던", nameEn: "London" },
  { id: "hub-taipei", lat: 25.03, lng: 121.57, nameKo: "타이베이", nameEn: "Taipei" },
  { id: "hub-phoenix", lat: 33.45, lng: -112.07, nameKo: "피닉스", nameEn: "Phoenix" },
];

export type EconomyAxisLink = {
  id: string;
  fromId: string;
  toId: string;
  nameKo: string;
  nameEn: string;
  /** 에너지=호박 / 무역=시안 / 결제=라임 */
  accent: string;
};

export const ECONOMY_AXIS_LINKS: EconomyAxisLink[] = [
  {
    id: "econ-axis-hormuz-rotterdam",
    fromId: "hub-hormuz",
    toId: "hub-rotterdam",
    nameKo: "걸프 → 유럽 에너지 축",
    nameEn: "Gulf → Europe energy axis",
    accent: "rgba(251, 191, 36, 0.82)",
  },
  {
    id: "econ-axis-shanghai-singapore",
    fromId: "hub-shanghai",
    toId: "hub-singapore",
    nameKo: "동아시아 → 말라카 무역 축",
    nameEn: "East Asia → Malacca trade axis",
    accent: "rgba(45, 212, 191, 0.82)",
  },
  {
    id: "econ-axis-ny-london",
    fromId: "hub-ny",
    toId: "hub-london",
    nameKo: "뉴욕 → 런던 결제 축",
    nameEn: "New York → London payment axis",
    accent: "rgba(163, 230, 53, 0.82)",
  },
  {
    id: "econ-axis-taipei-phoenix",
    fromId: "hub-taipei",
    toId: "hub-phoenix",
    nameKo: "대만 → 미국 반도체 축",
    nameEn: "Taiwan → US semiconductor axis",
    accent: "rgba(96, 165, 250, 0.82)",
  },
];

function hubById(id: string): EconomyAxisHub | undefined {
  return ECONOMY_AXIS_HUBS.find((h) => h.id === id);
}

/** 지경학 개관 — 에너지·무역·결제 축 대권호 (소수만) */
export function economyAxisArrowPaths(lang: LabelLanguage = "ko"): TransportPath[] {
  const out: TransportPath[] = [];
  for (const link of ECONOMY_AXIS_LINKS) {
    const from = hubById(link.fromId);
    const to = hubById(link.toId);
    if (!from || !to) continue;
    const points = greatCircleArc(from.lat, from.lng, to.lat, to.lng, 24, 0.05);
    out.push({
      id: link.id,
      kind: "strategic-support-arrow",
      name: lang === "en" ? link.nameEn : link.nameKo,
      scalerank: 1,
      lengthKm: null,
      accentColor: link.accent,
      bbox: {
        minLat: Math.min(from.lat, to.lat),
        minLng: Math.min(from.lng, to.lng),
        maxLat: Math.max(from.lat, to.lat),
        maxLng: Math.max(from.lng, to.lng),
      },
      points,
      meta: {
        mode: "economy-axis",
        fromName: lang === "en" ? from.nameEn : from.nameKo,
        toName: lang === "en" ? to.nameEn : to.nameKo,
      },
    });
  }
  return out;
}
