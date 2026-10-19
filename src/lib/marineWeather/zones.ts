/**
 * 해상 기상 샘플 지점 — 해역(region)별 대표 바다 좌표.
 *
 * region id 는 전쟁위험 보험료(`/api/war-risk`)와 같은 집합을 쓴다 → 케이스 파일에서 해역 하나로 묶인다.
 * 좌표는 일부러 해협 한가운데가 아니라 "격자(0.25°≈28km)가 바다로 잡히는" 열린 수역에 둔다.
 * 그래도 육지 격자에 걸리면 `sampleNearest` 가 2칸 안의 가장 가까운 바다 격자로 옮기고 offset 을 남긴다.
 */

export type MarineRegion = "red-sea" | "hormuz" | "black-sea" | "taiwan-strait" | "malacca";

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
];

export const MARINE_REGIONS = [...new Set(MARINE_POINTS.map((p) => p.region))] as MarineRegion[];
