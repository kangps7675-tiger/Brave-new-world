/**
 * 우크라이나 → 러시아(및 점령지) 타격 핫스팟.
 *
 * NEPTUN(우크라로 날아오는 위협)의 "반대 방향". 단, 러시아는 공식 실시간 방공 경보
 * 피드를 공개하지 않으므로 궤적·탄착을 확정할 수 없다 — 자주 타격되는 지점(오블라스트·
 * 비행장·정유소·항만)만 앵커로 두고, 최신 GDELT 속보가 근처에 있을 때만 점등한다.
 * 모든 표시는 "보도·주장 · 미확인"으로 취급(러 국방부 격추 주장/우크라 발표 모두 검증 불가).
 */

export type RussiaStrikeKind =
  | "drone" // 장거리 자폭드론 (Liutyi 등)
  | "cruise-missile" // 순항 (Storm Shadow · Neptune 등)
  | "ballistic-missile" // ATACMS 등
  | "naval-drone" // 해상 무인정 (USV)
  | "refinery" // 정유·에너지 시설
  | "airbase"; // 비행장

export type RussiaStrikeIncident = {
  id: string;
  kind: RussiaStrikeKind;
  lat: number;
  lng: number;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** 0–1 · 리플 세기 (보도 빈도·중요도 근사) */
  intensity: number;
};

export const RUSSIA_STRIKE_KIND_LABEL = {
  drone: { ko: "장거리 드론", en: "Long-range drone" },
  "cruise-missile": { ko: "순항미사일", en: "Cruise missile" },
  "ballistic-missile": { ko: "탄도미사일", en: "Ballistic missile" },
  "naval-drone": { ko: "해상 무인정", en: "Naval drone (USV)" },
  refinery: { ko: "정유·에너지", en: "Refinery / energy" },
  airbase: { ko: "비행장", en: "Airbase" },
} as const;

/**
 * 자주 타격되는 지점 앵커 (공개 보도 기반 근사 좌표).
 * 벨고로드가 전체의 약 44% — intensity로 반영.
 */
export const RUSSIA_STRIKE_INCIDENTS: RussiaStrikeIncident[] = [
  {
    id: "ru-belgorod",
    kind: "drone",
    lat: 50.6,
    lng: 36.6,
    titleKo: "벨고로드 일대",
    titleEn: "Belgorod area",
    bodyKo: "국경 최다 피격지 · 드론·포격 빈발",
    bodyEn: "Most-struck border region · drones / shelling",
    intensity: 0.95,
  },
  {
    id: "ru-kursk",
    kind: "drone",
    lat: 51.73,
    lng: 36.19,
    titleKo: "쿠르스크 일대",
    titleEn: "Kursk area",
    bodyKo: "접경 교전·드론 타격 밀집",
    bodyEn: "Border fighting / drone strike dens",
    intensity: 0.9,
  },
  {
    id: "ru-bryansk",
    kind: "drone",
    lat: 53.25,
    lng: 34.37,
    titleKo: "브랸스크 일대",
    titleEn: "Bryansk area",
    bodyKo: "탄약고·물류 표적 드론 타격",
    bodyEn: "Ammo depot / logistics drone strikes",
    intensity: 0.78,
  },
  {
    id: "ru-voronezh",
    kind: "drone",
    lat: 51.66,
    lng: 39.2,
    titleKo: "보로네시 일대",
    titleEn: "Voronezh area",
    bodyKo: "집결지·비행장 인근 드론 활동",
    bodyEn: "Staging / airfield-area drone activity",
    intensity: 0.72,
  },
  {
    id: "ru-rostov",
    kind: "drone",
    lat: 47.24,
    lng: 39.7,
    titleKo: "로스토프나도누 일대",
    titleEn: "Rostov-on-Don area",
    bodyKo: "남부군관구 사령부권 드론 타격",
    bodyEn: "Southern MD HQ zone drone strikes",
    intensity: 0.72,
  },
  {
    id: "ru-moscow",
    kind: "drone",
    lat: 55.75,
    lng: 37.62,
    titleKo: "모스크바 일대",
    titleEn: "Moscow area",
    bodyKo: "수도권 장거리 드론 요격·공항 폐쇄 빈발",
    bodyEn: "Capital long-range drones · airport closures",
    intensity: 0.8,
  },
  {
    id: "ru-engels",
    kind: "airbase",
    lat: 51.48,
    lng: 46.2,
    titleKo: "엥겔스 공군기지",
    titleEn: "Engels air base",
    bodyKo: "전략폭격기(Tu-95/160) 기지 타격 표적",
    bodyEn: "Strategic bomber base strike target",
    intensity: 0.82,
  },
  {
    id: "ru-morozovsk",
    kind: "airbase",
    lat: 48.31,
    lng: 41.79,
    titleKo: "모로좁스크 공군기지",
    titleEn: "Morozovsk air base",
    bodyKo: "Su-34 전폭기 기지",
    bodyEn: "Su-34 fighter-bomber base",
    intensity: 0.7,
  },
  {
    id: "ru-novorossiysk",
    kind: "naval-drone",
    lat: 44.72,
    lng: 37.79,
    titleKo: "노보로시스크 항",
    titleEn: "Novorossiysk port",
    bodyKo: "흑해함대·석유 수출항 해상드론 표적",
    bodyEn: "Black Sea Fleet / oil port USV target",
    intensity: 0.72,
  },
  {
    id: "ru-sevastopol",
    kind: "naval-drone",
    lat: 44.6,
    lng: 33.53,
    titleKo: "세바스토폴 (크림)",
    titleEn: "Sevastopol (Crimea)",
    bodyKo: "흑해함대 모항 · USV·미사일 타격 표적",
    bodyEn: "Black Sea Fleet home port · USV/missile target",
    intensity: 0.85,
  },
  {
    id: "ru-tuapse",
    kind: "refinery",
    lat: 44.1,
    lng: 39.08,
    titleKo: "투압세 정유소",
    titleEn: "Tuapse refinery",
    bodyKo: "흑해 연안 정유·수출 시설 타격",
    bodyEn: "Black Sea refinery / export strikes",
    intensity: 0.68,
  },
  {
    id: "ru-ryazan",
    kind: "refinery",
    lat: 54.6,
    lng: 39.7,
    titleKo: "랴잔 정유소",
    titleEn: "Ryazan refinery",
    bodyKo: "내륙 대형 정유소 드론 타격",
    bodyEn: "Major inland refinery drone strikes",
    intensity: 0.68,
  },
  {
    id: "ru-krasnodar",
    kind: "refinery",
    lat: 45.04,
    lng: 38.98,
    titleKo: "크라스노다르 일대",
    titleEn: "Krasnodar area",
    bodyKo: "정유·연료 인프라 표적",
    bodyEn: "Refinery / fuel infrastructure target",
    intensity: 0.66,
  },
  {
    id: "ru-taganrog",
    kind: "drone",
    lat: 47.24,
    lng: 38.9,
    titleKo: "타간로크 일대",
    titleEn: "Taganrog area",
    bodyKo: "항공·방산 시설 인근 타격",
    bodyEn: "Aviation / defense-industry area strikes",
    intensity: 0.6,
  },
  {
    id: "ru-feodosia",
    kind: "cruise-missile",
    lat: 45.03,
    lng: 35.38,
    titleKo: "페오도시야 (크림)",
    titleEn: "Feodosia (Crimea)",
    bodyKo: "상륙함·탄약 하역항 순항미사일 타격",
    bodyEn: "Landing-ship / ammo port cruise-missile strikes",
    intensity: 0.66,
  },
];
