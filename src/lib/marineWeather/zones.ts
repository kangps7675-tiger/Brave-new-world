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
export type MarineRegion = "red-sea" | "hormuz" | "black-sea" | "taiwan-strait" | "malacca" | "arabian-sea" | "cape";

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
];

/** 대양 해역은 요청 수(해역 × 변수 × 예보시간)를 줄이려 필요한 변수만 받는다. 목록에 없는 해역은 전부 받는다. */
export const MARINE_REGION_FIELDS: Partial<Record<MarineRegion, WaveFieldKey[]>> = {
  "arabian-sea": ["hs_m", "period_s", "wind_ms", "swell_m"],
  cape: ["hs_m", "period_s", "wind_ms", "swell_m"],
};

export const MARINE_REGIONS = [...new Set(MARINE_POINTS.map((p) => p.region))] as MarineRegion[];
