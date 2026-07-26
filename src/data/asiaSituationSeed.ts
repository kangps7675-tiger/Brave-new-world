/** 대만 해협 · 한반도 — 긴장/교전 시 표시용 콜아웃 시드 */
import type { SituationCallout } from "@/data/situationCalloutTypes";

export const TAIWAN_SITUATION_CALLOUTS: SituationCallout[] = [
  {
    id: "tw-strait-center",
    theater: "china-taiwan",
    lat: 24.2,
    lng: 119.2,
    title: "대만 해협 중심",
    body: "해·공 초계 · 차단 시나리오 (평가)",
    side: "neutral",
  },
  {
    id: "tw-taipei",
    theater: "china-taiwan",
    lat: 25.03,
    lng: 121.57,
    title: "타이베이 방공권",
    body: "정치·인구 중심 · 방공망",
    side: "blue",
  },
  {
    id: "tw-kaohsiung",
    theater: "china-taiwan",
    lat: 22.63,
    lng: 120.3,
    title: "가오슝 항만 축",
    body: "물류·해군 · 남부 접근로",
    side: "blue",
  },
  {
    id: "tw-fujian-coast",
    theater: "china-taiwan",
    lat: 24.5,
    lng: 118.1,
    title: "푸젠 연안",
    body: "로켓군·상륙 집결 가능권 (평가)",
    side: "red",
  },
  {
    id: "tw-penghu",
    theater: "china-taiwan",
    lat: 23.57,
    lng: 119.58,
    title: "펑후 열도",
    body: "해협 중간 전초기지",
    side: "neutral",
  },
];

export const KOREA_SITUATION_CALLOUTS: SituationCallout[] = [
  {
    id: "kr-dmz",
    theater: "korea",
    lat: 38.0,
    lng: 127.0,
    title: "DMZ 접촉선",
    body: "포병·GP · 긴장 상시",
    side: "neutral",
  },
  {
    id: "kr-seoul",
    theater: "korea",
    lat: 37.57,
    lng: 126.98,
    title: "수도권 방공",
    body: "인구밀집 · 북 포병 사거리권",
    side: "blue",
  },
  {
    id: "kr-pyongyang",
    theater: "korea",
    lat: 39.03,
    lng: 125.75,
    title: "평양 종심",
    body: "지휘·미사일 기반 (평가)",
    side: "red",
  },
  {
    id: "kr-west-sea",
    theater: "korea",
    lat: 37.5,
    lng: 125.0,
    title: "서해 NLL",
    body: "해상 교전·초계 빈발",
    side: "neutral",
  },
  // 미사일 벨트(전술·작전·전략)는 koreaMissileBeltSeed — 시설 콜아웃 + 폴리곤
];
