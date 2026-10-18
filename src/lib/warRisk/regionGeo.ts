/**
 * 좌표 → 전쟁위험 보험 해역 (war_risk_quotes.region 과 같은 id).
 * 대략적인 사각형 — 보험 시장이 부르는 해역 단위(홍해·아덴만 / 걸프·오만만 / 흑해)에 맞춘 것이지
 * 법적 경계(JWC Listed Areas)가 아니다.
 */

import type { WarRiskRegionId } from "@/lib/warRisk/extractPremium";

const BOXES: Array<{ id: WarRiskRegionId; s: number; n: number; w: number; e: number }> = [
  // 홍해 + 바브엘만데브 + 아덴만
  { id: "red-sea", s: 11, n: 30, w: 32, e: 44 },
  { id: "red-sea", s: 10, n: 16, w: 43, e: 52 },
  // 페르시아만 + 호르무즈 + 오만만
  { id: "hormuz", s: 22, n: 30.5, w: 47, e: 60 },
  // 흑해 + 아조프해
  { id: "black-sea", s: 40.5, n: 47.5, w: 27, e: 42 },
  { id: "taiwan-strait", s: 21.5, n: 26.5, w: 117, e: 122 },
  { id: "malacca", s: -1, n: 7, w: 95, e: 105 },
];

export function warRiskRegionAt(lat: number, lng: number): WarRiskRegionId {
  for (const b of BOXES) {
    if (lat >= b.s && lat <= b.n && lng >= b.w && lng <= b.e) return b.id;
  }
  return "other";
}

export const WAR_RISK_REGION_LABEL_KO: Record<WarRiskRegionId, string> = {
  "red-sea": "홍해·아덴만",
  hormuz: "호르무즈·걸프",
  "black-sea": "흑해",
  "taiwan-strait": "대만해협",
  malacca: "말라카",
  other: "기타 해역",
};

/** 해역 → 초크포인트 문서 페이지 */
export const WAR_RISK_REGION_PAGE: Partial<Record<WarRiskRegionId, string>> = {
  "red-sea": "/chokepoints/bab-el-mandeb",
  hormuz: "/chokepoints/strait-of-hormuz",
  "black-sea": "/chokepoints/turkish-straits",
  "taiwan-strait": "/chokepoints/taiwan-strait",
  malacca: "/chokepoints/strait-of-malacca",
};
