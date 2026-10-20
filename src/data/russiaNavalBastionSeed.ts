/**
 * 러시아 해군 벤트(Bastion) 방어권역 · 함대 순항미사일 사거리권 — RVSN 육상 미사일
 * 벨트(russiaMissileBeltSeed.ts)와는 별개 개념. `domain: "naval"`로 구분.
 *
 * ── Bastion 방어권역 ────────────────────────────────────────────
 * 콜라반도(북방함대 SSBN 모항) → 바렌츠해 → 노르웨이해 → GIUK 갭(그린란드-아이슬란드-영국)
 * 으로 이어지는 전략핵잠수함 보호권역. 러시아 해군 독트린 문헌상 실재하는 개념이나,
 * 1차 문헌은 좌표를 특정하지 않고 지명으로만 기술함 — 이 폴리곤은 그 기술을 지도에
 * 옮긴 근사치이며 정밀 경계가 아님.
 * 출처: Chatham House, "Russia's Military Posture in the Arctic" (2019),
 *   "Perimeter Control Around the 'Bastion'" — 콜라반도→바렌츠해→노르웨이해→GIUK갭 기술.
 *   https://www.chathamhouse.org/2019/06/russias-military-posture-arctic/2-perimeter-control-around-bastion
 *
 * ── 함대 순항미사일 사거리 부채꼴 ──────────────────────────────
 * 세베로모르스크(북방함대사령부)를 기점으로, 공개된 3M-14 Kalibr(SS-N-30A) 육상공격형
 * 최대 사거리(1,500~2,500km, CSIS 추산) 중 상한값으로 그린 부채꼴. 극점 부근을 지나는
 * 완전한 원은 지도 렌더링이 깨지므로(경도 wrap), 영국 제도 방향 섹터만 표시.
 * ⚠️ 이 부채꼴은 "이론상 도달 가능 사거리"이지 특정 표적에 대한 발사 계획이 아님.
 * 출처: CSIS Missile Threat, "3M-14 Kalibr (SS-N-30A)" —
 *   https://missilethreat.csis.org/missile/ss-n-30a/
 */
import type { MissileBeltArea } from "@/data/koreaMissileBeltSeed";

function poly(ring: [number, number][]): MissileBeltArea["geometry"] {
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  return { type: "Polygon", coordinates: [closed] };
}

/** 콜라반도 → 바렌츠해 → 노르웨이해 → GIUK 갭 (근사, 프리핸드) */
const BASTION_RING: [number, number][] = [
  [33.0, 69.5],
  [45.0, 70.5],
  [55.0, 71.0],
  [60.0, 77.0],
  [40.0, 80.0],
  [20.0, 79.0],
  [10.0, 74.0],
  [0.0, 72.0],
  [-10.0, 68.0],
  [-20.0, 65.0],
  [-15.0, 63.0],
  [-9.0, 62.0],
  [-3.0, 61.0],
  [3.0, 62.0],
  [10.0, 65.0],
  [20.0, 68.0],
  [33.0, 69.5],
];

/**
 * 세베로모르스크 기점, 영국 방향(방위각 195°~265°) Kalibr 상한사거리(2,500km) 섹터.
 * 극지방 전체를 도는 완전한 원은 경도 wrap으로 깨지므로 관련 섹터만 그림.
 */
const STRIKE_RANGE_SECTOR: [number, number][] = [
  [33.41, 69.07],
  [25.07, 46.98],
  [22.29, 47.28],
  [19.53, 47.66],
  [16.76, 48.14],
  [14.0, 48.69],
  [11.25, 49.32],
  [8.51, 50.03],
  [5.78, 50.82],
  [3.06, 51.69],
  [0.34, 52.63],
  [-2.36, 53.64],
  [-5.06, 54.72],
  [-7.75, 55.86],
  [-10.43, 57.07],
  [-13.11, 58.33],
  [33.41, 69.07],
];

export const RUSSIA_NAVAL_BASTION_BELTS: MissileBeltArea[] = [
  {
    id: "ru-naval-bastion-atlantic",
    kind: "missile-belt",
    theater: "russia",
    domain: "naval",
    tier: "strategic",
    name: "북방함대 벤트(Bastion) 방어권역",
    nameEn: "Northern Fleet Bastion defence zone",
    center: { lat: 73.0, lng: 25.0 },
    geometry: poly(BASTION_RING),
    noteKo:
      "콜라반도 SSBN 모항을 중심으로 바렌츠해·노르웨이해·GIUK 갭까지 이어지는 전략핵잠수함 보호권역. " +
      "1차 문헌은 정밀 좌표를 특정하지 않아 이 폴리곤은 지명 기술을 옮긴 근사치.",
    noteEn:
      "SSBN bastion protection zone from the Kola Peninsula through the Barents/Norwegian Seas to the GIUK gap. " +
      "Primary sources describe this by named seas, not coordinates — this polygon is an approximation.",
  },
  {
    id: "ru-naval-strike-range-uk",
    kind: "missile-belt",
    theater: "russia",
    domain: "naval",
    tier: "strategic",
    name: "함대 순항미사일 사거리 (세베로모르스크 기점, 영국 방향)",
    nameEn: "Fleet cruise-missile range fan (from Severomorsk, UK-facing sector)",
    center: { lat: 58.0, lng: 5.0 },
    geometry: poly(STRIKE_RANGE_SECTOR),
    noteKo:
      "3M-14 Kalibr 육상공격형 공개 추산 최대사거리(2,500km, CSIS) 기준 부채꼴. " +
      "이론상 도달범위이며 특정 표적 발사계획을 의미하지 않음.",
    noteEn:
      "Sector at the publicly estimated maximum range (2,500km, CSIS) of the 3M-14 Kalibr land-attack variant. " +
      "Shows theoretical reach only — not a claim of any specific strike plan.",
  },
];

/**
 * 콜라반도·바렌츠해·노르웨이해·GIUK 갭 권역 (Bastion 방어권역 + 함대 사거리 부채꼴).
 * 기존 isNearRussiaMissileBelt(육상 RVSN, lat 50-60°/80-107°)와는 겹치지 않는 북극/대서양 권역.
 */
export function isNearRussiaNavalBastion(lat: number, lng: number): boolean {
  return lat >= 55 && lat <= 82 && lng >= -25 && lng <= 65;
}
