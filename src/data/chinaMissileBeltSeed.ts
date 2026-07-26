/**
 * 중국 PLARF 미사일 벨트 — 확인 사일로군(위먼·하미·항긴기)을 벨트 폴리곤+콜아웃으로.
 * 원본: PLARF Silo Study (공개 위성 판독). 후보 격자와는 별개.
 */
import type { SituationCallout } from "@/data/situationCalloutTypes";
import type { MissileBeltArea } from "@/data/koreaMissileBeltSeed";

function poly(ring: [number, number][]): MissileBeltArea["geometry"] {
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  return { type: "Polygon", coordinates: [closed] };
}

/** 위먼·하미·항긴기 단지 윤곽 (사일로 군집 근사) */
const YUMEN_RING: [number, number][] = [
  [96.25, 40.22],
  [96.65, 40.22],
  [96.68, 40.05],
  [96.28, 40.04],
];

const HAMI_RING: [number, number][] = [
  [92.28, 42.42],
  [92.72, 42.42],
  [92.75, 42.22],
  [92.3, 42.22],
];

const HANGGIN_RING: [number, number][] = [
  [107.9, 40.22],
  [108.35, 40.22],
  [108.38, 40.02],
  [107.92, 40.02],
];

export const CHINA_MISSILE_BELTS: MissileBeltArea[] = [
  {
    id: "cn-belt-yumen",
    kind: "missile-belt",
    theater: "china",
    tier: "silo-field",
    name: "위먼 사일로군",
    nameEn: "Yumen silo field",
    center: { lat: 40.13, lng: 96.44 },
    geometry: poly(YUMEN_RING),
    noteKo: "PLARF 확인 사일로군 · 약 119기 (위성 판독). 공식 확인이 아닙니다.",
    noteEn: "PLARF identified silo field · ~119 silos (imagery). Not officially confirmed.",
  },
  {
    id: "cn-belt-hami",
    kind: "missile-belt",
    theater: "china",
    tier: "silo-field",
    name: "하미 사일로군",
    nameEn: "Hami silo field",
    center: { lat: 42.32, lng: 92.5 },
    geometry: poly(HAMI_RING),
    noteKo: "PLARF 확인 사일로군 · 약 110기 (위성 판독).",
    noteEn: "PLARF identified silo field · ~110 silos (imagery).",
  },
  {
    id: "cn-belt-hanggin",
    kind: "missile-belt",
    theater: "china",
    tier: "silo-field",
    name: "항긴기 사일로군",
    nameEn: "Hanggin Banner silo field",
    center: { lat: 40.12, lng: 108.12 },
    geometry: poly(HANGGIN_RING),
    noteKo: "PLARF 확인 사일로군 · 약 83기 (위성 판독).",
    noteEn: "PLARF identified silo field · ~83 silos (imagery).",
  },
];

/** 사일로군 중심 콜아웃 — theater는 표시 필터용 china-taiwan이 아니라 별도 취급 */
export const CHINA_MISSILE_FACILITY_CALLOUTS: SituationCallout[] = [
  {
    id: "cn-yumen",
    theater: "china-taiwan",
    lat: 40.13,
    lng: 96.44,
    title: "위먼 미사일 단지",
    body: "PLARF 사일로군 · ~119기 · ICBM 추정",
    side: "red",
  },
  {
    id: "cn-hami",
    theater: "china-taiwan",
    lat: 42.32,
    lng: 92.5,
    title: "하미 미사일 단지",
    body: "PLARF 사일로군 · ~110기 · ICBM 추정",
    side: "red",
  },
  {
    id: "cn-hanggin",
    theater: "china-taiwan",
    lat: 40.12,
    lng: 108.12,
    title: "항긴기 미사일 단지",
    body: "PLARF 사일로군 · ~83기 · ICBM 추정",
    side: "red",
  },
];

/** 카메라가 서부·북부 중국 사일로 벨트권에 있는지 */
export function isNearChinaMissileBelt(lat: number, lng: number): boolean {
  return lat >= 38.5 && lat <= 43.5 && lng >= 90 && lng <= 111;
}
