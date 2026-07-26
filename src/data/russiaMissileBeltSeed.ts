/**
 * 러시아 RVSN 미사일 벨트 — 공개 편제(군단·사단 주둔지) 기반 평가용.
 * 27·31·33 미사일군 권역 폴리곤 + 주둔지 콜아웃.
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

/** 27 근위 미사일군 (블라디미르) — 유럽 러시아 서부·중앙 */
const ARMY_27_RING: [number, number][] = [
  [33.2, 51.2],
  [36.5, 50.9],
  [42.0, 51.2],
  [46.5, 52.0],
  [48.5, 54.5],
  [48.2, 57.2],
  [45.0, 58.5],
  [38.0, 58.8],
  [33.0, 58.2],
  [32.5, 55.0],
];

/** 31 미사일군 (오렌부르크) — 우랄·볼가 동부 */
const ARMY_31_RING: [number, number][] = [
  [48.5, 49.8],
  [55.5, 49.5],
  [62.5, 50.2],
  [63.5, 54.0],
  [62.0, 58.8],
  [55.0, 59.8],
  [48.8, 59.2],
  [47.5, 55.0],
];

/** 33 근위 미사일군 (옴스크) — 시베리아 */
const ARMY_33_RING: [number, number][] = [
  [81.5, 52.0],
  [90.5, 52.5],
  [100.0, 51.5],
  [106.0, 51.8],
  [106.5, 54.0],
  [100.0, 56.0],
  [90.0, 56.5],
  [82.0, 56.2],
  [80.5, 54.0],
];

export const RUSSIA_MISSILE_BELTS: MissileBeltArea[] = [
  {
    id: "ru-belt-27th",
    kind: "missile-belt",
    theater: "russia",
    tier: "strategic",
    name: "27 근위 미사일군 벨트",
    nameEn: "27th Guards Missile Army belt",
    center: { lat: 54.8, lng: 40.5 },
    geometry: poly(ARMY_27_RING),
    noteKo: "RVSN · Yars/Topol-M 사일로·기동 (공개 편제). 평가용.",
    noteEn: "RVSN · Yars/Topol-M silo & mobile (open OoB). Evaluative.",
  },
  {
    id: "ru-belt-31st",
    kind: "missile-belt",
    theater: "russia",
    tier: "strategic",
    name: "31 미사일군 벨트",
    nameEn: "31st Missile Army belt",
    center: { lat: 55.5, lng: 56.0 },
    geometry: poly(ARMY_31_RING),
    noteKo: "RVSN · Dombarovsky Avangard/R-36 · 우랄 기동 여단 (평가).",
    noteEn: "RVSN · Dombarovsky Avangard/R-36 · Urals mobile brigades (evaluative).",
  },
  {
    id: "ru-belt-33rd",
    kind: "missile-belt",
    theater: "russia",
    tier: "strategic",
    name: "33 근위 미사일군 벨트",
    nameEn: "33rd Guards Missile Army belt",
    center: { lat: 54.0, lng: 90.0 },
    geometry: poly(ARMY_33_RING),
    noteKo: "RVSN · 시베리아 Yars 기동 · Uzhur 사일로 (평가).",
    noteEn: "RVSN · Siberian Yars mobile · Uzhur silos (evaluative).",
  },
];

/** theater 필드는 필터 우회용 — 실제 표시는 isNearRussiaMissileBelt */
export const RUSSIA_MISSILE_FACILITY_CALLOUTS: SituationCallout[] = [
  {
    id: "ru-kozelsk",
    theater: "russia-ukraine",
    lat: 54.03,
    lng: 35.78,
    title: "코젤스크",
    body: "27군 · Yars 사일로",
    side: "red",
  },
  {
    id: "ru-teykovo",
    theater: "russia-ukraine",
    lat: 56.85,
    lng: 40.53,
    title: "테이코보",
    body: "27군 · Topol-M/Yars 기동",
    side: "red",
  },
  {
    id: "ru-tatishchevo",
    theater: "russia-ukraine",
    lat: 51.67,
    lng: 45.57,
    title: "타티셰보",
    body: "27군 · Topol-M 사일로",
    side: "red",
  },
  {
    id: "ru-dombarovsky",
    theater: "russia-ukraine",
    lat: 50.75,
    lng: 59.5,
    title: "돔바로프스키",
    body: "31군 · R-36/Avangard 사일로",
    side: "red",
  },
  {
    id: "ru-nizhny-tagil",
    theater: "russia-ukraine",
    lat: 58.07,
    lng: 60.55,
    title: "니즈니타길",
    body: "31군 · Yars 기동",
    side: "red",
  },
  {
    id: "ru-uzhur",
    theater: "russia-ukraine",
    lat: 55.33,
    lng: 89.8,
    title: "우주르",
    body: "33군 · R-36 사일로",
    side: "red",
  },
  {
    id: "ru-novosibirsk",
    theater: "russia-ukraine",
    lat: 55.33,
    lng: 82.92,
    title: "노보시비르스크",
    body: "33군 · Yars 기동",
    side: "red",
  },
  {
    id: "ru-irkutsk",
    theater: "russia-ukraine",
    lat: 52.32,
    lng: 104.23,
    title: "이르쿠츠크",
    body: "33군 · Yars 기동",
    side: "red",
  },
];

/** 유럽 러시아·우랄·시베리아 RVSN 권역 */
export function isNearRussiaMissileBelt(lat: number, lng: number): boolean {
  const west = lat >= 50 && lat <= 60 && lng >= 32 && lng <= 64;
  const siberia = lat >= 51 && lat <= 57 && lng >= 80 && lng <= 107;
  return west || siberia;
}
