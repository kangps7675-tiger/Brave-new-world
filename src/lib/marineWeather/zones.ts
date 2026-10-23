/**
 * 해상 기상 샘플 지점 — 해역(region)별 대표 바다 좌표.
 *
 * region id 는 전쟁위험 보험료(`/api/war-risk`)와 같은 집합을 쓴다 → 케이스 파일에서 해역 하나로 묶인다.
 * 좌표는 일부러 해협 한가운데가 아니라 "격자(0.25°≈28km)가 바다로 잡히는" 열린 수역에 둔다.
 * 그래도 육지 격자에 걸리면 `sampleNearest` 가 2칸 안의 가장 가까운 바다 격자로 옮기고 offset 을 남긴다.
 */

import type { WaveFieldKey } from "./gfsWave";

/**
 * 앞의 5개는 전쟁위험 보험료 해역 id 와 같다. "arabian-sea"·"cape" 는 우회 판단용 대양 해역 —
 * 보험료 해역이 아니므로 war-risk 와는 연결되지 않는다 (초크포인트 페이지가 우회로로 같이 보여준다).
 */
export type RiskMarineRegion = "red-sea" | "hormuz" | "black-sea" | "taiwan-strait" | "malacca" | "arabian-sea" | "cape";

/**
 * 전 세계 확대 해역 — NOAA GFS-Wave(무료) 예보만. 유료 Datalastic 현재날씨는 위험 해역(RiskMarineRegion)에만 쓴다.
 * 격자(0.25°)가 못 잡는 좁은 해협은 가까운 열린 바다 격자로 옮겨 읽는다(offset 기록).
 */
export type GlobalMarineRegion =
  | "mediterranean" | "north-sea" | "baltic" | "north-atlantic" | "south-atlantic" | "caribbean" | "gulf-of-mexico"
  | "us-east" | "us-west" | "panama" | "north-pacific" | "south-pacific" | "indian-ocean" | "bay-of-bengal"
  | "east-asia" | "bering-sea" | "arctic" | "southern-ocean";

export type MarineRegion = RiskMarineRegion | GlobalMarineRegion;

export type MarinePoint = {
  id: string;
  region: MarineRegion;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
};

export const MARINE_POINTS: MarinePoint[] = [
  // 홍해·아덴만
  { id: "red-sea-south", region: "red-sea", nameKo: "홍해 남부(바브엘만데브 북쪽)", nameEn: "Southern Red Sea (north of Bab el-Mandeb)", lat: 13.4, lng: 42.8 },
  { id: "red-sea-hodeidah", region: "red-sea", nameKo: "호데이다 앞바다", nameEn: "Off Hodeidah", lat: 14.8, lng: 42.0 },
  { id: "red-sea-central", region: "red-sea", nameKo: "홍해 중부(제다 서쪽)", nameEn: "Central Red Sea (west of Jeddah)", lat: 21.5, lng: 38.4 },
  { id: "gulf-of-aden-west", region: "red-sea", nameKo: "아덴만 서부", nameEn: "Western Gulf of Aden", lat: 12.0, lng: 45.5 },
  { id: "gulf-of-aden-east", region: "red-sea", nameKo: "아덴만 동부", nameEn: "Eastern Gulf of Aden", lat: 13.0, lng: 49.0 },
  // 호르무즈·걸프
  { id: "hormuz-strait", region: "hormuz", nameKo: "호르무즈 해협 통항분리대", nameEn: "Strait of Hormuz TSS", lat: 26.6, lng: 56.7 },
  { id: "gulf-of-oman", region: "hormuz", nameKo: "오만만", nameEn: "Gulf of Oman", lat: 24.8, lng: 57.5 },
  { id: "fujairah-anchorage", region: "hormuz", nameKo: "푸자이라 정박지 앞바다", nameEn: "Off Fujairah anchorage", lat: 25.2, lng: 56.75 },
  { id: "persian-gulf-central", region: "hormuz", nameKo: "페르시아만 중부", nameEn: "Central Persian Gulf", lat: 27.0, lng: 51.5 },
  // 흑해
  { id: "black-sea-odesa", region: "black-sea", nameKo: "오데사 접근수역", nameEn: "Odesa approaches", lat: 46.0, lng: 31.0 },
  { id: "black-sea-bosphorus", region: "black-sea", nameKo: "보스포루스 북쪽 접근수역", nameEn: "Northern Bosphorus approach", lat: 41.6, lng: 29.2 },
  { id: "black-sea-west", region: "black-sea", nameKo: "흑해 서부", nameEn: "Western Black Sea", lat: 43.5, lng: 31.5 },
  { id: "black-sea-novorossiysk", region: "black-sea", nameKo: "노보로시스크 앞바다", nameEn: "Off Novorossiysk", lat: 44.3, lng: 37.5 },
  // 대만해협
  { id: "taiwan-strait-central", region: "taiwan-strait", nameKo: "대만해협 중부", nameEn: "Central Taiwan Strait", lat: 24.5, lng: 119.6 },
  // 말라카
  { id: "malacca-central", region: "malacca", nameKo: "말라카 해협 중부", nameEn: "Central Strait of Malacca", lat: 2.6, lng: 100.9 },
  { id: "singapore-east-approach", region: "malacca", nameKo: "싱가포르 해협 동쪽 접근수역", nameEn: "Singapore Strait eastern approach", lat: 1.7, lng: 104.8 },
  // 아라비아해 — 호르무즈·아덴만에서 인도양으로 나가는 길목 (대양)
  { id: "arabian-sea-west", region: "arabian-sea", nameKo: "아라비아해 서부(소코트라 동쪽)", nameEn: "Western Arabian Sea (east of Socotra)", lat: 14.0, lng: 58.0 },
  { id: "arabian-sea-central", region: "arabian-sea", nameKo: "아라비아해 중부", nameEn: "Central Arabian Sea", lat: 15.0, lng: 64.0 },
  { id: "arabian-sea-east", region: "arabian-sea", nameKo: "아라비아해 동부(인도 서안 앞)", nameEn: "Eastern Arabian Sea (off west India)", lat: 18.5, lng: 68.5 },
  // 희망봉 우회로 — 홍해를 피할 때 가는 길 (대양)
  { id: "mozambique-channel", region: "cape", nameKo: "모잠비크 해협", nameEn: "Mozambique Channel", lat: -22.0, lng: 40.5 },
  { id: "agulhas-south", region: "cape", nameKo: "아굴라스 곶 남쪽", nameEn: "South of Cape Agulhas", lat: -36.5, lng: 20.0 },
  { id: "cape-west", region: "cape", nameKo: "케이프타운 서쪽 대서양", nameEn: "Atlantic west of Cape Town", lat: -34.0, lng: 16.0 },
  // ── 전 세계 확대 (GFS-Wave 예보만) ──
  { id: "med-west", region: "mediterranean", nameKo: "지중해 서부", nameEn: "Western Mediterranean", lat: 38.5, lng: 5.0 },
  { id: "med-central", region: "mediterranean", nameKo: "지중해 중부", nameEn: "Central Mediterranean", lat: 35.0, lng: 17.0 },
  { id: "med-east", region: "mediterranean", nameKo: "지중해 동부", nameEn: "Eastern Mediterranean", lat: 33.8, lng: 30.0 },
  { id: "north-sea-south", region: "north-sea", nameKo: "북해 남부·영국해협 동쪽", nameEn: "Southern North Sea", lat: 53.0, lng: 3.0 },
  { id: "english-channel-west", region: "north-sea", nameKo: "영국해협 서부 접근수역", nameEn: "Western English Channel approach", lat: 49.5, lng: -4.5 },
  { id: "baltic-central", region: "baltic", nameKo: "발트해 중부", nameEn: "Central Baltic Sea", lat: 57.5, lng: 19.5 },
  { id: "n-atlantic-west", region: "north-atlantic", nameKo: "북대서양 서부", nameEn: "Western North Atlantic", lat: 38.0, lng: -55.0 },
  { id: "n-atlantic-central", region: "north-atlantic", nameKo: "북대서양 중부", nameEn: "Central North Atlantic", lat: 47.0, lng: -35.0 },
  { id: "n-atlantic-east", region: "north-atlantic", nameKo: "비스케이만 서쪽", nameEn: "West of the Bay of Biscay", lat: 46.0, lng: -12.0 },
  { id: "s-atlantic-north", region: "south-atlantic", nameKo: "남대서양 북부", nameEn: "North South Atlantic", lat: -5.0, lng: -20.0 },
  { id: "s-atlantic-south", region: "south-atlantic", nameKo: "남대서양 남부", nameEn: "South South Atlantic", lat: -35.0, lng: -25.0 },
  { id: "caribbean-central", region: "caribbean", nameKo: "카리브해 중부", nameEn: "Central Caribbean", lat: 15.0, lng: -75.0 },
  { id: "gulf-mexico-central", region: "gulf-of-mexico", nameKo: "멕시코만 중부", nameEn: "Central Gulf of Mexico", lat: 25.5, lng: -90.0 },
  { id: "us-east-offshore", region: "us-east", nameKo: "미 동안 앞바다", nameEn: "Off the US East Coast", lat: 38.0, lng: -71.0 },
  { id: "us-west-offshore", region: "us-west", nameKo: "미 서안 앞바다", nameEn: "Off the US West Coast", lat: 34.0, lng: -121.5 },
  { id: "panama-pacific", region: "panama", nameKo: "파나마 태평양측 접근수역", nameEn: "Panama Pacific approach", lat: 7.0, lng: -80.0 },
  { id: "panama-atlantic", region: "panama", nameKo: "파나마 대서양측 접근수역", nameEn: "Panama Atlantic approach", lat: 10.5, lng: -79.8 },
  { id: "n-pacific-west", region: "north-pacific", nameKo: "북태평양 서부", nameEn: "Western North Pacific", lat: 35.0, lng: 160.0 },
  { id: "n-pacific-central", region: "north-pacific", nameKo: "북태평양 중부", nameEn: "Central North Pacific", lat: 38.0, lng: -165.0 },
  { id: "n-pacific-east", region: "north-pacific", nameKo: "북태평양 동부", nameEn: "Eastern North Pacific", lat: 42.0, lng: -135.0 },
  { id: "s-pacific-west", region: "south-pacific", nameKo: "남서태평양", nameEn: "Southwest Pacific", lat: -30.0, lng: 170.0 },
  { id: "s-pacific-east", region: "south-pacific", nameKo: "남동태평양", nameEn: "Southeast Pacific", lat: -28.0, lng: -125.0 },
  { id: "indian-west", region: "indian-ocean", nameKo: "서인도양", nameEn: "Western Indian Ocean", lat: -8.0, lng: 62.0 },
  { id: "indian-south", region: "indian-ocean", nameKo: "남인도양", nameEn: "Southern Indian Ocean", lat: -30.0, lng: 85.0 },
  { id: "indian-east", region: "indian-ocean", nameKo: "동인도양(호주 서쪽)", nameEn: "Eastern Indian Ocean (west of Australia)", lat: -20.0, lng: 105.0 },
  { id: "bay-of-bengal-central", region: "bay-of-bengal", nameKo: "벵골만 중부", nameEn: "Central Bay of Bengal", lat: 14.0, lng: 88.0 },
  { id: "korea-strait", region: "east-asia", nameKo: "대한해협", nameEn: "Korea Strait", lat: 34.3, lng: 129.3 },
  { id: "east-china-sea", region: "east-asia", nameKo: "동중국해", nameEn: "East China Sea", lat: 30.0, lng: 125.0 },
  { id: "south-china-sea", region: "east-asia", nameKo: "남중국해", nameEn: "South China Sea", lat: 14.0, lng: 114.0 },
  { id: "bering-sea-central", region: "bering-sea", nameKo: "베링해 중부", nameEn: "Central Bering Sea", lat: 58.0, lng: -176.0 },
  { id: "barents-sea", region: "arctic", nameKo: "바렌츠해", nameEn: "Barents Sea", lat: 73.0, lng: 30.0 },
  { id: "greenland-sea", region: "arctic", nameKo: "그린란드해", nameEn: "Greenland Sea", lat: 76.0, lng: -5.0 },
  { id: "southern-ocean-atlantic", region: "southern-ocean", nameKo: "남극해(대서양 쪽)", nameEn: "Southern Ocean (Atlantic sector)", lat: -58.0, lng: -20.0 },
  { id: "southern-ocean-indian", region: "southern-ocean", nameKo: "남극해(인도양 쪽)", nameEn: "Southern Ocean (Indian sector)", lat: -58.0, lng: 80.0 },
  { id: "southern-ocean-pacific", region: "southern-ocean", nameKo: "남극해(태평양 쪽)", nameEn: "Southern Ocean (Pacific sector)", lat: -58.0, lng: -140.0 },
];

/** 대양 해역은 요청 수(해역 × 변수 × 예보시간)를 줄이려 필요한 변수만 받는다. 목록에 없는 해역은 전부 받는다. */
const GLOBAL_FIELDS: WaveFieldKey[] = ["hs_m", "wind_ms"];

export const GLOBAL_MARINE_REGIONS: GlobalMarineRegion[] = [
  "mediterranean", "north-sea", "baltic", "north-atlantic", "south-atlantic", "caribbean", "gulf-of-mexico",
  "us-east", "us-west", "panama", "north-pacific", "south-pacific", "indian-ocean", "bay-of-bengal",
  "east-asia", "bering-sea", "arctic", "southern-ocean",
];

export const MARINE_REGION_FIELDS: Partial<Record<MarineRegion, WaveFieldKey[]>> = {
  "arabian-sea": ["hs_m", "period_s", "wind_ms", "swell_m"],
  cape: ["hs_m", "period_s", "wind_ms", "swell_m"],
  ...Object.fromEntries(GLOBAL_MARINE_REGIONS.map((r) => [r, GLOBAL_FIELDS])),
};

export const MARINE_REGIONS = [...new Set(MARINE_POINTS.map((p) => p.region))] as MarineRegion[];

const GLOBAL_SET = new Set<string>(GLOBAL_MARINE_REGIONS);
export function isGlobalMarineRegion(region: string): boolean {
  return GLOBAL_SET.has(region);
}

/** 유료 Datalastic 현재날씨를 폴링하는 위험 해역 지점만 (전 세계 확대 지점은 제외 — 크레딧 보호) */
export const RISK_MARINE_POINTS = MARINE_POINTS.filter((p) => !GLOBAL_SET.has(p.region));
export const RISK_MARINE_REGIONS = MARINE_REGIONS.filter((r) => !GLOBAL_SET.has(r)) as RiskMarineRegion[];
