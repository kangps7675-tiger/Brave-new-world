/**
 * 중국 주변 해역 대치·마찰 핫스팟 (남중국해·동중국해·서태평양·대만해협).
 * HAPI/ACLED는 국가 단위 집계만 주므로, 지도 점은 IRONSIGHT·공개 대치 좌표 시드.
 */

export type ChinaTheaterDyad =
  | "china-taiwan"
  | "china-japan"
  | "china-philippines"
  | "us-china";

export type ChinaTheaterSea =
  | "taiwan-strait"
  | "south-china-sea"
  | "east-china-sea"
  | "west-pacific";

export type ChinaTheaterIncident = {
  id: string;
  dyad: ChinaTheaterDyad;
  sea: ChinaTheaterSea;
  lat: number;
  lng: number;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** 0–1 · 리플 세기 */
  intensity: number;
  /** 동적 사건의 원문 기사 링크 */
  sourceUrl?: string;
};

export const CHINA_THEATER_INCIDENTS: ChinaTheaterIncident[] = [
  // —— 중국↔대만 ——
  {
    id: "ct-strait-median",
    dyad: "china-taiwan",
    sea: "taiwan-strait",
    lat: 24.15,
    lng: 119.05,
    titleKo: "대만 해협 중간선",
    titleEn: "Taiwan Strait median line",
    bodyKo: "해·공 초계·월선 빈발 구간",
    bodyEn: "Frequent air/naval median-line crossings",
    intensity: 0.95,
  },
  {
    id: "ct-kinmen-approach",
    dyad: "china-taiwan",
    sea: "taiwan-strait",
    lat: 24.45,
    lng: 118.35,
    titleKo: "진먼 접근로",
    titleEn: "Kinmen approaches",
    bodyKo: "연안 근접·포격·무인기 관측권",
    bodyEn: "Near-shore drones / artillery watch",
    intensity: 0.8,
  },
  {
    id: "ct-penghu",
    dyad: "china-taiwan",
    sea: "taiwan-strait",
    lat: 23.57,
    lng: 119.58,
    titleKo: "펑후 해역",
    titleEn: "Penghu waters",
    bodyKo: "해협 중간 전초·해상 차단축",
    bodyEn: "Mid-strait outpost / blockade axis",
    intensity: 0.72,
  },
  {
    id: "ct-bashi",
    dyad: "china-taiwan",
    sea: "west-pacific",
    lat: 21.0,
    lng: 121.5,
    titleKo: "바시 해협",
    titleEn: "Bashi Channel",
    bodyKo: "대만 남부·서태평양 출입로",
    bodyEn: "Southern Taiwan / WestPac gateway",
    intensity: 0.85,
  },
  {
    id: "ct-northeast-adiz",
    dyad: "china-taiwan",
    sea: "east-china-sea",
    lat: 26.2,
    lng: 122.0,
    titleKo: "대만 북동 ADIZ",
    titleEn: "NE Taiwan ADIZ",
    bodyKo: "동중국해 방공식별구역 접촉",
    bodyEn: "East China Sea ADIZ contact dens",
    intensity: 0.78,
  },
  {
    id: "ct-southwest-patrol",
    dyad: "china-taiwan",
    sea: "south-china-sea",
    lat: 21.8,
    lng: 119.2,
    titleKo: "대만 남서 초계권",
    titleEn: "SW Taiwan patrol box",
    bodyKo: "남중국해 북단·항모·초계기",
    bodyEn: "SCS northern rim patrols",
    intensity: 0.88,
  },

  // —— 중국↔일본 ——
  {
    id: "cj-senkaku",
    dyad: "china-japan",
    sea: "east-china-sea",
    lat: 25.74,
    lng: 123.47,
    titleKo: "센카쿠/댜오위",
    titleEn: "Senkaku / Diaoyu",
    bodyKo: "해경·어선·영해 침입 대치",
    bodyEn: "Coast-guard / fishing / territorial stand-offs",
    intensity: 0.92,
  },
  {
    id: "cj-miyako",
    dyad: "china-japan",
    sea: "east-china-sea",
    lat: 24.8,
    lng: 125.3,
    titleKo: "미야코 해협",
    titleEn: "Miyako Strait",
    bodyKo: "중·일 해군 통과·감시 통로",
    bodyEn: "PLAN/JMSDF transit choke",
    intensity: 0.75,
  },
  {
    id: "cj-ecs-adiz",
    dyad: "china-japan",
    sea: "east-china-sea",
    lat: 28.5,
    lng: 125.0,
    titleKo: "동중국해 ADIZ 중첩",
    titleEn: "ECS ADIZ overlap",
    bodyKo: "중·일 방공 식별구역 마찰",
    bodyEn: "Overlapping ADIZ friction",
    intensity: 0.7,
  },
  {
    id: "cj-okinawa-west",
    dyad: "china-japan",
    sea: "west-pacific",
    lat: 26.2,
    lng: 126.5,
    titleKo: "오키나와 서방 해역",
    titleEn: "West of Okinawa",
    bodyKo: "서태평양 초계·미일 연계 감시",
    bodyEn: "WestPac patrol / US–Japan watch",
    intensity: 0.65,
  },

  // —— 중국↔필리핀 ——
  {
    id: "cp-scarborough",
    dyad: "china-philippines",
    sea: "south-china-sea",
    lat: 15.14,
    lng: 117.76,
    titleKo: "스카버러 암초",
    titleEn: "Scarborough Shoal",
    bodyKo: "해경·어선 봉쇄·물대포",
    bodyEn: "Coast-guard blockade / water cannon",
    intensity: 0.95,
  },
  {
    id: "cp-second-thomas",
    dyad: "china-philippines",
    sea: "south-china-sea",
    lat: 9.79,
    lng: 115.86,
    titleKo: "세컨드 토마스 암초",
    titleEn: "Second Thomas Shoal",
    bodyKo: "보급선 차단·충돌·물대포",
    bodyEn: "Resupply blockade / ramming",
    intensity: 0.98,
  },
  {
    id: "cp-sabina",
    dyad: "china-philippines",
    sea: "south-china-sea",
    lat: 10.73,
    lng: 115.82,
    titleKo: "사비나 암초",
    titleEn: "Sabina Shoal",
    bodyKo: "해상 대치·보급 마찰",
    bodyEn: "Maritime stand-off dens",
    intensity: 0.82,
  },
  {
    id: "cp-reed-bank",
    dyad: "china-philippines",
    sea: "south-china-sea",
    lat: 11.5,
    lng: 116.8,
    titleKo: "리드 뱅크",
    titleEn: "Reed Bank",
    bodyKo: "에너지·어업·EEZ 주장 충돌",
    bodyEn: "Energy / fisheries / EEZ clash",
    intensity: 0.7,
  },
  {
    id: "cp-thitu",
    dyad: "china-philippines",
    sea: "south-china-sea",
    lat: 11.05,
    lng: 114.28,
    titleKo: "티투섬 일대",
    titleEn: "Thitu Island area",
    bodyKo: "스프래틀리 전초기지 주변 초계",
    bodyEn: "Spratly outpost patrols",
    intensity: 0.68,
  },

  // —— 미국↔중국 ——
  {
    id: "uc-luzon-strait",
    dyad: "us-china",
    sea: "west-pacific",
    lat: 20.5,
    lng: 121.0,
    titleKo: "루손 해협",
    titleEn: "Luzon Strait",
    bodyKo: "미·중 해·공 통과·감시",
    bodyEn: "US–China transit / ISR dens",
    intensity: 0.88,
  },
  {
    id: "uc-philippine-sea",
    dyad: "us-china",
    sea: "west-pacific",
    lat: 18.0,
    lng: 128.0,
    titleKo: "필리핀해 서태평양",
    titleEn: "Philippine Sea (WestPac)",
    bodyKo: "항모·폭격기 초계 마찰권",
    bodyEn: "Carrier / bomber patrol friction",
    intensity: 0.8,
  },
  {
    id: "uc-scs-fonop",
    dyad: "us-china",
    sea: "south-china-sea",
    lat: 12.5,
    lng: 114.5,
    titleKo: "남중국해 FONOP 축",
    titleEn: "SCS FONOP corridor",
    bodyKo: "항행의 자유·함정 접근 대치",
    bodyEn: "Freedom-of-navigation approaches",
    intensity: 0.85,
  },
  {
    id: "uc-taiwan-east",
    dyad: "us-china",
    sea: "west-pacific",
    lat: 23.5,
    lng: 123.5,
    titleKo: "대만 동부 해역",
    titleEn: "East of Taiwan",
    bodyKo: "미 함정·항공기 통과·억제",
    bodyEn: "US transit / deterrence east of Taiwan",
    intensity: 0.9,
  },
  {
    id: "uc-paracel-rim",
    dyad: "us-china",
    sea: "south-china-sea",
    lat: 16.5,
    lng: 112.0,
    titleKo: "파라셀 외곽",
    titleEn: "Paracel outer rim",
    bodyKo: "미·중 해상 근접·초계",
    bodyEn: "Close approaches / patrols",
    intensity: 0.72,
  },
];

export const CHINA_THEATER_DYAD_LABEL = {
  "china-taiwan": { ko: "중국↔대만", en: "China↔Taiwan" },
  "china-japan": { ko: "중국↔일본", en: "China↔Japan" },
  "china-philippines": { ko: "중국↔필리핀", en: "China↔Philippines" },
  "us-china": { ko: "미국↔중국", en: "US↔China" },
} as const;

export const CHINA_THEATER_SEA_LABEL = {
  "taiwan-strait": { ko: "대만해협", en: "Taiwan Strait" },
  "south-china-sea": { ko: "남중국해", en: "South China Sea" },
  "east-china-sea": { ko: "동중국해", en: "East China Sea" },
  "west-pacific": { ko: "서태평양", en: "Western Pacific" },
} as const;
