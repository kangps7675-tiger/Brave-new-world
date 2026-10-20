/**
 * 북한 미사일·무기실험 핫스팟.
 * 공개 API로 탄착군을 확정할 수 없어 발사·실험 발생지만 표시.
 * (실시간 탄착·궤적은 우크라 NEPTUN만)
 */

export type KoreaMissileKind =
  | "ballistic"
  | "cruise"
  | "slbm"
  | "hypersonic"
  | "space-launch"
  | "artillery"
  | "nuclear-related";

/** 발사·실험 발생 지점만 */
export type KoreaMissileAnchor = "event-site";

export type KoreaMissileIncident = {
  id: string;
  kind: KoreaMissileKind;
  anchor: KoreaMissileAnchor;
  lat: number;
  lng: number;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** 0–1 · 리플 세기 */
  intensity: number;
};

export const KOREA_MISSILE_KIND_LABEL = {
  ballistic: { ko: "탄도미사일", en: "Ballistic missile" },
  cruise: { ko: "순항미사일", en: "Cruise missile" },
  slbm: { ko: "SLBM", en: "SLBM" },
  hypersonic: { ko: "극초음속", en: "Hypersonic" },
  "space-launch": { ko: "우주발사체", en: "Space launch" },
  artillery: { ko: "방사포·포격", en: "MLRS / artillery" },
  "nuclear-related": { ko: "핵·관련", en: "Nuclear-related" },
} as const;

export const KOREA_MISSILE_ANCHOR_LABEL = {
  "event-site": { ko: "발사·실험 위치", en: "Launch / event site" },
} as const;

/** 대표 발사·실험 앵커 (공개 좌표·보도 기반 근사) */
export const KOREA_MISSILE_INCIDENTS: KoreaMissileIncident[] = [
  {
    id: "nk-sunan-ballistic",
    kind: "ballistic",
    anchor: "event-site",
    lat: 39.2,
    lng: 125.67,
    titleKo: "평양 순안 일대",
    titleEn: "Pyongyang Sunan area",
    bodyKo: "중·장거리 탄도 발사 빈발 · 발생지에 표시",
    bodyEn: "Frequent MRBM/IRBM launches · event-site marker",
    intensity: 0.95,
  },
  {
    id: "nk-tongchang-ri",
    kind: "space-launch",
    anchor: "event-site",
    lat: 39.66,
    lng: 124.71,
    titleKo: "동창리 발사장",
    titleEn: "Tongchang-ri launch site",
    bodyKo: "위성·장거리 발사체 실험",
    bodyEn: "Satellite / long-range launcher tests",
    intensity: 0.9,
  },
  {
    id: "nk-sinpo-slbm",
    kind: "slbm",
    anchor: "event-site",
    lat: 40.03,
    lng: 128.18,
    titleKo: "신포 조선·해상",
    titleEn: "Sinpo shipyard / sea",
    bodyKo: "SLBM·잠수함 발사 밀집",
    bodyEn: "SLBM / submarine launch dens",
    intensity: 0.88,
  },
  {
    id: "nk-kittaeryong",
    kind: "ballistic",
    anchor: "event-site",
    lat: 38.65,
    lng: 127.1,
    titleKo: "깃대령 일대",
    titleEn: "Kittaeryong area",
    bodyKo: "단거리 탄도·방사포 사격장",
    bodyEn: "SRBM / MLRS ranges",
    intensity: 0.8,
  },
  {
    id: "nk-hwadae",
    kind: "ballistic",
    anchor: "event-site",
    lat: 40.8,
    lng: 129.5,
    titleKo: "화대·함경 동해안",
    titleEn: "Hwadae / Hamgyong coast",
    bodyKo: "동해안 SRBM/MRBM 발사",
    bodyEn: "East-sea SRBM/MRBM launches",
    intensity: 0.82,
  },
  {
    id: "nk-wonsan",
    kind: "cruise",
    anchor: "event-site",
    lat: 39.15,
    lng: 127.45,
    titleKo: "원산·갈마 일대",
    titleEn: "Wonsan / Kalma area",
    bodyKo: "순항·해상 표적 사격 관련",
    bodyEn: "Cruise / maritime fire dens",
    intensity: 0.75,
  },
  {
    id: "nk-sunchon",
    kind: "ballistic",
    anchor: "event-site",
    lat: 39.42,
    lng: 125.93,
    titleKo: "순천 일대",
    titleEn: "Sunchon area",
    bodyKo: "항공·미사일 관련 활동 밀집",
    bodyEn: "Air / missile-related activity dens",
    intensity: 0.7,
  },
  {
    id: "nk-panghyon",
    kind: "hypersonic",
    anchor: "event-site",
    lat: 39.88,
    lng: 125.25,
    titleKo: "방현 일대",
    titleEn: "Panghyon area",
    bodyKo: "극초음속·신형 미사일 시험 추정",
    bodyEn: "Hypersonic / new-type missile tests (est.)",
    intensity: 0.78,
  },
  {
    id: "nk-punggye-ri",
    kind: "nuclear-related",
    anchor: "event-site",
    lat: 41.28,
    lng: 129.09,
    titleKo: "풍계리",
    titleEn: "Punggye-ri",
    bodyKo: "핵실험·관련 활동 (발생지)",
    bodyEn: "Nuclear test / related activity (event-site)",
    intensity: 0.92,
  },
  {
    id: "nk-kaesong-artillery",
    kind: "artillery",
    anchor: "event-site",
    lat: 37.97,
    lng: 126.55,
    titleKo: "개성 북방·전연",
    titleEn: "Kaesong / forward area",
    bodyKo: "방사포·포격 도발 발생지",
    bodyEn: "MLRS / artillery provocation site",
    intensity: 0.72,
  },
];
