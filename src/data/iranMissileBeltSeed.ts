/**
 * 이란 미사일 벨트 — 공개 OSINT·전장 시드 기반 평가용.
 * 서부(단거리)·중부(작전)·동부 종심(중장거리) 3단 + 시설 콜아웃.
 * 확정 사거리·비밀 진지가 아님.
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

/** 서부·걸프 전술 — SRBM·해안 타격권 */
const WESTERN_RING: [number, number][] = [
  [45.5, 29.5],
  [48.5, 28.8],
  [51.5, 27.5],
  [53.0, 28.5],
  [52.5, 31.5],
  [50.0, 34.0],
  [47.5, 35.0],
  [45.8, 34.2],
  [45.2, 31.5],
];

/** 중부 작전 — 나탄즈–이스파한–테헤란 축 */
const CENTRAL_RING: [number, number][] = [
  [49.5, 32.0],
  [52.0, 31.5],
  [54.5, 32.5],
  [55.5, 34.5],
  [54.0, 36.5],
  [51.5, 36.8],
  [49.8, 35.5],
  [49.2, 33.5],
];

/** 동부·종심 전략 — 세므난·샤흐루드·호라산 IRBM/MRBM 추정 */
const EASTERN_RING: [number, number][] = [
  [53.5, 33.5],
  [56.5, 33.0],
  [59.5, 34.0],
  [60.5, 36.0],
  [59.0, 37.5],
  [56.0, 37.2],
  [53.8, 36.0],
  [53.2, 34.5],
];

export const IRAN_MISSILE_BELTS: MissileBeltArea[] = [
  {
    id: "ir-belt-western",
    kind: "missile-belt",
    theater: "iran",
    tier: "tactical",
    name: "서부·걸프 전술 벨트",
    nameEn: "Western / Gulf tactical belt",
    center: { lat: 31.5, lng: 49.0 },
    geometry: poly(WESTERN_RING),
    noteKo: "SRBM·해안·걸프 타격권 (평가). 공개 OSINT 기반.",
    noteEn: "SRBM · Gulf / coastal strike belt (evaluative). Open-source.",
  },
  {
    id: "ir-belt-central",
    kind: "missile-belt",
    theater: "iran",
    tier: "operational",
    name: "중부 작전 벨트",
    nameEn: "Central operational belt",
    center: { lat: 34.2, lng: 52.0 },
    geometry: poly(CENTRAL_RING),
    noteKo: "나탄즈–이스파한–테헤란 · 핵·미사일 기반 축 (평가).",
    noteEn: "Natanz–Isfahan–Tehran · nuclear/missile corridor (evaluative).",
  },
  {
    id: "ir-belt-eastern",
    kind: "missile-belt",
    theater: "iran",
    tier: "strategic",
    name: "동부 종심 전략 벨트",
    nameEn: "Eastern strategic depth belt",
    center: { lat: 35.5, lng: 56.5 },
    geometry: poly(EASTERN_RING),
    noteKo: "세므난·샤흐루드 방면 · MRBM/IRBM 종심 (평가).",
    noteEn: "Semnan–Shahroud axis · MRBM/IRBM depth (evaluative).",
  },
];

export const IRAN_MISSILE_FACILITY_CALLOUTS: SituationCallout[] = [
  {
    id: "ir-natanz",
    theater: "middle-east",
    lat: 33.51,
    lng: 51.73,
    title: "나탄즈",
    body: "중부 벨트 · 핵·미사일 기반",
    side: "red",
  },
  {
    id: "ir-isfahan",
    theater: "middle-east",
    lat: 32.65,
    lng: 51.67,
    title: "이스파한",
    body: "중부 벨트 · 산업·미사일 축",
    side: "red",
  },
  {
    id: "ir-tehran",
    theater: "middle-east",
    lat: 35.69,
    lng: 51.39,
    title: "테헤란 종심",
    body: "지휘·방공 · 전략 표적",
    side: "red",
  },
  {
    id: "ir-semnan",
    theater: "middle-east",
    lat: 35.58,
    lng: 53.39,
    title: "세므난",
    body: "동부 벨트 · 발사·시험 추정",
    side: "red",
  },
  {
    id: "ir-shahroud",
    theater: "middle-east",
    lat: 36.42,
    lng: 54.97,
    title: "샤흐루드",
    body: "동부 벨트 · 우주·장거리 축",
    side: "red",
  },
  {
    id: "ir-khorramabad",
    theater: "middle-east",
    lat: 33.49,
    lng: 48.36,
    title: "호람아바드 방면",
    body: "서부 벨트 · SRBM 배치 추정",
    side: "red",
  },
  {
    id: "ir-bushehr",
    theater: "middle-east",
    lat: 28.97,
    lng: 50.84,
    title: "부셰르–걸프",
    body: "서부 벨트 · 해안 타격권",
    side: "red",
  },
];

/** 이란 본토 미사일 벨트권 (이스라엘·레반트 제외) */
export function isNearIranMissileBelt(lat: number, lng: number): boolean {
  return lat >= 27 && lat <= 38 && lng >= 45 && lng <= 61;
}
