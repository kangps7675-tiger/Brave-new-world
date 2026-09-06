/**
 * 북한 미사일 벨트 — Bermudez / CSIS 공개 분석 기반 평가용.
 * 3단 벨트(전술·작전·전략) 폴리곤 + 주요 시설 콜아웃.
 * 확정 사거리·비밀 진지가 아님.
 */
import type { SituationCallout } from "@/data/situationCalloutTypes";
import type { GeoJsonGeometry } from "@/data/geoTypes";

export type MissileBeltTier = "tactical" | "operational" | "strategic" | "silo-field";

export type MissileBeltArea = {
  id: string;
  kind: "missile-belt";
  theater: "korea" | "china" | "russia" | "iran";
  /** 육상(RVSN/PLARF 등) vs 해상(함대 벤트·사거리권). 생략 시 기존 육상 벨트로 취급. */
  domain?: "land" | "naval";
  tier: MissileBeltTier;
  name: string;
  nameEn: string;
  center: { lat: number; lng: number };
  geometry: GeoJsonGeometry;
  noteKo: string;
  noteEn: string;
};

function poly(ring: [number, number][]): GeoJsonGeometry {
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring
    : [...ring, ring[0]];
  return { type: "Polygon", coordinates: [closed] };
}

/** DMZ~약 90km — Scud급 SRBM 등 (평가) */
const TACTICAL_RING: [number, number][] = [
  [125.0, 38.15],
  [126.2, 38.05],
  [127.4, 38.1],
  [128.55, 38.35],
  [128.7, 38.85],
  [127.6, 39.05],
  [126.4, 39.0],
  [125.15, 38.85],
];

/** 약 90~150km — Rodong/MRBM 등 (평가) */
const OPERATIONAL_RING: [number, number][] = [
  [125.1, 39.05],
  [126.3, 39.1],
  [127.5, 39.15],
  [128.85, 39.45],
  [129.0, 40.05],
  [127.7, 40.15],
  [126.2, 40.0],
  [125.0, 39.7],
];

/** 150km+ — Hwasong/ICBM급 배치 추정 (평가, L자형) */
const STRATEGIC_RING: [number, number][] = [
  [124.4, 39.9],
  [125.6, 40.2],
  [126.5, 40.6],
  [127.2, 41.0],
  [128.2, 41.4],
  [129.4, 41.6],
  [130.0, 41.9],
  [130.1, 42.4],
  [129.0, 42.35],
  [127.5, 41.9],
  [126.2, 41.5],
  [125.0, 41.1],
  [124.3, 40.5],
];

export const KOREA_MISSILE_BELTS: MissileBeltArea[] = [
  {
    id: "nk-belt-tactical",
    kind: "missile-belt",
    theater: "korea",
    tier: "tactical",
    name: "전술 벨트",
    nameEn: "Tactical belt",
    center: { lat: 38.55, lng: 126.8 },
    geometry: poly(TACTICAL_RING),
    noteKo: "DMZ 북방 약 50~90km · Scud급 SRBM 등 단거리 (평가). Bermudez/CSIS 공개 분석 기준.",
    noteEn: "~50–90km north of DMZ · Scud-class SRBM (evaluative). Bermudez/CSIS open analysis.",
  },
  {
    id: "nk-belt-operational",
    kind: "missile-belt",
    theater: "korea",
    tier: "operational",
    name: "작전 벨트",
    nameEn: "Operational belt",
    center: { lat: 39.55, lng: 127.0 },
    geometry: poly(OPERATIONAL_RING),
    noteKo: "DMZ 북방 약 90~150km · Rodong급 MRBM 여단 (평가).",
    noteEn: "~90–150km north of DMZ · Rodong-class MRBM brigades (evaluative).",
  },
  {
    id: "nk-belt-strategic",
    kind: "missile-belt",
    theater: "korea",
    tier: "strategic",
    name: "전략 벨트",
    nameEn: "Strategic belt",
    center: { lat: 41.2, lng: 127.2 },
    geometry: poly(STRATEGIC_RING),
    noteKo: "DMZ 북방 150km+ · Hwasong/ICBM급 배치 추정 (평가).",
    noteEn: "150km+ north of DMZ · Hwasong/ICBM-class estimated basing (evaluative).",
  },
];

/** CSIS·공개 보도 기반 주요 기지 콜아웃 */
export const KOREA_MISSILE_FACILITY_CALLOUTS: SituationCallout[] = [
  {
    id: "nk-sakkanmol",
    theater: "korea",
    lat: 38.62,
    lng: 125.78,
    title: "삭간몰 기지",
    body: "전술 벨트 · CSIS 비공개 기지 공개분 (평가)",
    side: "red",
  },
  {
    id: "nk-singye",
    theater: "korea",
    lat: 38.52,
    lng: 126.52,
    title: "신계 기지",
    body: "전술 벨트 · 단거리 배치 추정",
    side: "red",
  },
  {
    id: "nk-kittaeryong",
    theater: "korea",
    lat: 38.65,
    lng: 127.1,
    title: "깃대령·금천리",
    body: "전술 벨트 · SRBM·방사포 사격장",
    side: "red",
  },
  {
    id: "nk-wonsan",
    theater: "korea",
    lat: 39.15,
    lng: 127.45,
    title: "원산·갈마",
    body: "작전·전술 경계 · 순항·해상 표적",
    side: "red",
  },
  {
    id: "nk-sinpo",
    theater: "korea",
    lat: 40.03,
    lng: 128.18,
    title: "신포 (SLBM)",
    body: "작전·동해안 · 잠수함 발사",
    side: "red",
  },
  {
    id: "nk-sino-ri",
    theater: "korea",
    lat: 39.72,
    lng: 125.48,
    title: "신오리 기지",
    body: "작전 벨트 · 운전군 (평가)",
    side: "red",
  },
  {
    id: "nk-tongchang-ri",
    theater: "korea",
    lat: 39.66,
    lng: 124.71,
    title: "동창리 발사장",
    body: "전략 축 · 위성·장거리 발사체",
    side: "red",
  },
  {
    id: "nk-musudan-hwadae",
    theater: "korea",
    lat: 40.8,
    lng: 129.5,
    title: "무수단·화대",
    body: "전략·동해안 · MRBM/시험 발사",
    side: "red",
  },
  {
    id: "nk-punggye",
    theater: "korea",
    lat: 41.28,
    lng: 129.09,
    title: "풍계리",
    body: "전략 벨트 인근 · 핵실험 발생지",
    side: "red",
  },
];

/** @deprecated 단일 동해안 벨트 — KOREA_MISSILE_BELTS 사용 */
export const KOREA_EAST_MISSILE_BELT = KOREA_MISSILE_BELTS[0];
/** @deprecated */
export const KOREA_EAST_MISSILE_FACILITY_CALLOUTS = KOREA_MISSILE_FACILITY_CALLOUTS;

/** 하위 호환 — 예전 타입 별칭 */
export type KoreaMissileBeltArea = MissileBeltArea;
