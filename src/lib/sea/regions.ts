/**
 * 해역 — 첫 화면(SeaDashboard)의 기본 단위.
 *
 * id는 war_risk_quotes.region · marine_weather.region 과 같은 값을 쓴다
 * (warRisk/regionGeo.ts · marineWeather/zones.ts). 한 해역을 고르면
 * 피격 · 경보 · 보험료 · 날씨 · 통항량 · 뉴스가 전부 같은 id로 걸러진다.
 */

import type { WarRiskRegionId } from "@/lib/warRisk/extractPremium";
import { warRiskRegionAt } from "@/lib/warRisk/regionGeo";
import type { NewsTheater } from "@/lib/news/types";

export type SeaRegionId = Exclude<WarRiskRegionId, "other">;

export type SeaRegion = {
  id: SeaRegionId;
  nameKo: string;
  nameEn: string;
  /** 지구본 카메라 */
  center: { lat: number; lng: number; zoom: number };
  /** IMF PortWatch 초크포인트 id (lib/portWatch.ts CHOKE_TO_PORTWATCH 키) */
  chokepoints: Array<{ id: string; nameKo: string }>;
  /** NAVAREA 구역 (navarea_features.region) */
  navareas: string[];
  /** 뉴스 관련도 — 이 단어가 제목·요약에 있으면 해역 뉴스로 올린다 */
  newsKeywords: RegExp;
  newsTheaters: NewsTheater[];
  /** 초크포인트 문서 페이지 */
  page: string;
};

export const SEA_REGIONS: SeaRegion[] = [
  {
    id: "red-sea",
    nameKo: "홍해·아덴만",
    nameEn: "Red Sea & Gulf of Aden",
    center: { lat: 15.5, lng: 42.5, zoom: 4.2 },
    chokepoints: [
      { id: "choke-bab-el-mandeb", nameKo: "바브엘만데브" },
      { id: "choke-suez", nameKo: "수에즈 운하" },
      { id: "choke-good-hope", nameKo: "희망봉(우회로)" },
    ],
    navareas: ["IX", "VIII"],
    newsKeywords:
      /red sea|bab[- ]el[- ]mandeb|gulf of aden|houthi|yemen|hodeidah|eilat|suez|aden|홍해|후티|예멘|아덴|수에즈|호데이다/i,
    newsTheaters: ["middle-east"],
    page: "/chokepoints/bab-el-mandeb",
  },
  {
    id: "hormuz",
    nameKo: "호르무즈·걸프",
    nameEn: "Strait of Hormuz & the Gulf",
    center: { lat: 26.2, lng: 55.5, zoom: 4.6 },
    chokepoints: [{ id: "choke-hormuz", nameKo: "호르무즈" }],
    navareas: ["IX"],
    newsKeywords:
      /hormuz|persian gulf|gulf of oman|fujairah|khor fakkan|bandar abbas|ras laffan|iran.*(tanker|ship|vessel|navy)|irgc navy|호르무즈|페르시아만|오만만|푸자이라|걸프|이란.*(유조선|선박|나포)/i,
    newsTheaters: ["middle-east"],
    page: "/chokepoints/strait-of-hormuz",
  },
  {
    id: "black-sea",
    nameKo: "흑해",
    nameEn: "Black Sea",
    center: { lat: 45.5, lng: 34.5, zoom: 4.4 },
    chokepoints: [{ id: "choke-bosporus", nameKo: "보스포루스" }],
    navareas: ["III"],
    newsKeywords:
      /black sea|odesa|odessa|novorossiysk|tuapse|crimea|sevastopol|bosporus|kerch|azov|refinery|oil depot|oil terminal|흑해|오데사|노보로시스크|투압세|크림|세바스토폴|보스포루스|정유|유류저장|석유 ?터미널/i,
    newsTheaters: ["russia-ukraine"],
    page: "/chokepoints/turkish-straits",
  },
  {
    id: "taiwan-strait",
    nameKo: "대만해협",
    nameEn: "Taiwan Strait",
    center: { lat: 24, lng: 120, zoom: 4.8 },
    chokepoints: [{ id: "choke-taiwan", nameKo: "대만해협" }],
    navareas: ["XI"],
    newsKeywords: /taiwan strait|taiwan|kinmen|pla navy|coast guard.*taiwan|대만|타이완|진먼|금문/i,
    newsTheaters: ["china-taiwan"],
    page: "/chokepoints/taiwan-strait",
  },
  {
    id: "malacca",
    nameKo: "말라카",
    nameEn: "Strait of Malacca",
    center: { lat: 3.5, lng: 100.5, zoom: 4.8 },
    chokepoints: [{ id: "choke-malacca", nameKo: "말라카" }],
    navareas: ["XI"],
    newsKeywords: /malacca|singapore strait|singapore.*(ship|tanker)|말라카|싱가포르 해협/i,
    newsTheaters: ["southeast-asia"],
    page: "/chokepoints/strait-of-malacca",
  },
];

export const DEFAULT_SEA_REGION: SeaRegionId = "red-sea";

export function getSeaRegion(id: string | null | undefined): SeaRegion {
  return SEA_REGIONS.find((r) => r.id === id) ?? SEA_REGIONS[0];
}

/** 좌표 → 해역 (경계 밖이면 null) */
export function seaRegionAt(lat: number, lng: number): SeaRegionId | null {
  const id = warRiskRegionAt(lat, lng);
  return id === "other" ? null : id;
}
