import type { LabelLanguage } from "@/lib/layerPrefs";
import type { EventTier, TransportPath } from "@/data/geoTypes";
import type { UsCarrierStatus } from "@/data/usCarriers";
import type { DisputeArea } from "@/data/geoTypes";

type Bi = Record<LabelLanguage, string>;

function pick(bi: Bi, lang: LabelLanguage): string {
  return bi[lang] ?? bi.ko;
}

const STATIC_KIND: Record<string, Bi> = {
  airport: { ko: "공항", en: "Airport" },
  port: { ko: "항구", en: "Port" },
  resource: { ko: "자원 매장지", en: "Resource site" },
  "military-base": { ko: "군사기지", en: "Military base" },
  "cable-landing": { ko: "케이블 착륙지", en: "Cable landing" },
  "nuclear-site": { ko: "원자력 시설", en: "Nuclear site" },
  "internet-exchange": { ko: "인터넷 교환점", en: "Internet exchange" },
  "refugee-camp": { ko: "난민 캠프", en: "Refugee camp" },
  "ucdp-event": { ko: "분쟁 사건", en: "Dispute event" },
  "ai-data-center": { ko: "AI 데이터센터", en: "AI data center" },
  "economic-center": { ko: "경제 중심지", en: "Economic hub" },
  "sanctions-entity": { ko: "제재 대상", en: "Sanctions entity" },
  "space-launch": { ko: "우주 발사", en: "Space launch" },
  "lng-terminal": { ko: "액화가스 터미널", en: "LNG terminal" },
  chokepoint: { ko: "해상 초크포인트", en: "Maritime chokepoint" },
  "logistics-hub": { ko: "핵심 물류 거점", en: "Logistics hub" },
  "submarine-tunnel": { ko: "해저터널", en: "Submarine tunnel" },
  "critical-node": { ko: "크리티컬 노드", en: "Critical node" },
  "gem-coal-plant": { ko: "석탄 발전소 (GEM)", en: "Coal plant (GEM)" },
  "gem-coal-mine": { ko: "석탄 광산 (GEM)", en: "Coal mine (GEM)" },
  "gem-coal-terminal": { ko: "석탄 터미널 (GEM)", en: "Coal terminal (GEM)" },
  "gem-nuclear": { ko: "원자력 (GEM)", en: "Nuclear (GEM)" },
  "gem-solar": { ko: "태양광 (GEM)", en: "Solar (GEM)" },
  "gem-wind": { ko: "풍력 (GEM)", en: "Wind (GEM)" },
  "gem-hydro": { ko: "수력 (GEM)", en: "Hydro (GEM)" },
  "gem-geothermal": { ko: "지열 (GEM)", en: "Geothermal (GEM)" },
  "gem-bioenergy": { ko: "바이오에너지 (GEM)", en: "Bioenergy (GEM)" },
  "gem-oil-gas-plant": { ko: "오일·가스 발전 (GEM)", en: "Oil & gas plant (GEM)" },
  "gem-oil-gas-extraction": { ko: "오일·가스 채굴 (GEM)", en: "Oil & gas extraction (GEM)" },
  "gem-iron-ore": { ko: "철광산 (GEM)", en: "Iron ore mine (GEM)" },
  "gem-cement": { ko: "시멘트 (GEM)", en: "Cement (GEM)" },
  "gem-steel": { ko: "철강 (GEM)", en: "Steel (GEM)" },
  "gem-chemical": { ko: "화학 (GEM)", en: "Chemicals (GEM)" },
};

const PATH_KIND: Partial<Record<TransportPath["kind"], Bi>> = {
  "shipping-lane": { ko: "해상 운송로", en: "Shipping lane" },
  "submarine-cable": { ko: "해저 케이블", en: "Submarine cable" },
  "oil-pipeline": { ko: "송유관 (GEM)", en: "Oil pipeline (GEM)" },
  "gas-pipeline": { ko: "가스 파이프라인 (GEM)", en: "Gas pipeline (GEM)" },
  "subsea-pipeline": { ko: "해저 파이프라인 (EMODnet)", en: "Subsea pipeline (EMODnet)" },
  "dispute-boundary": { ko: "분쟁 경계선", en: "Dispute boundary" },
  "lsib-boundary": { ko: "LSIB 국경선 (미 국무부)", en: "LSIB boundary (US Dept. of State)" },
  "country-border": { ko: "국경선", en: "Country border" },
  coastline: { ko: "해안선", en: "Coastline" },
  rail: { ko: "철도", en: "Railway" },
  "arms-embargo": { ko: "무기금수 구역", en: "Arms embargo zone" },
  "dispute-zone": { ko: "분쟁·긴장 테두리", en: "Dispute / tension outline" },
  "dispute-hatch": { ko: "분쟁 빗금", en: "Dispute hatch" },
  "conflict-hatch": { ko: "분쟁 구역 빗금", en: "Conflict zone hatch" },
  "axis-link": { ko: "축 관계망", en: "Axis relationship link" },
  "bri-trade": { ko: "일대일로 무역 연결", en: "BRI trade connectivity" },
  "us-dfc-supply": { ko: "미국 DFC 개발금융망", en: "U.S. DFC network" },
  "ua-axis": { ko: "UA 작전 축", en: "UA axis of advance" },
  "ru-axis": { ko: "RU 방어선", en: "RU defensive line" },
  "ua-advance": { ko: "UA 진격 방향", en: "UA advance" },
  "ru-advance": { ko: "RU 진격·압박", en: "RU advance / pressure" },
  msr: { ko: "보급로", en: "MSR" },
  "ukraine-ru-occupied": { ko: "RU 점령 테두리", en: "RU occupied outline" },
  "ukraine-ua-occupied": { ko: "UA 점령 테두리", en: "UA controlled outline" },
  "ukraine-ru-occupied-hatch": { ko: "RU 점령 빗금", en: "RU occupied hatch" },
  "ukraine-ua-occupied-hatch": { ko: "UA 점령 빗금", en: "UA controlled hatch" },
  "ukraine-ru-claim": { ko: "RU 진격·주장 테두리", en: "RU claim outline" },
  "ukraine-ua-claim": { ko: "UA 주장 테두리", en: "UA claim outline" },
  "ukraine-ru-claim-hatch": { ko: "RU 진격·주장 빗금", en: "RU claim hatch" },
  "ukraine-ua-claim-hatch": { ko: "UA 주장 빗금", en: "UA claim hatch" },
  "ukraine-ru-front": { ko: "RU 점령 경계", en: "RU front line" },
  "ukraine-ua-front": { ko: "UA 경계", en: "UA front line" },
  "ukraine-contested-front": { ko: "경합 경계", en: "Contested front" },
  "ukraine-ua-gain": { ko: "UA 반격·회복 영역", en: "UA regained area" },
  "ukraine-combat-zone": { ko: "전투지역 (반경 5km)", en: "Combat zone (5 km)" },
  "neptun-trail": { ko: "드론·미사일 공중 궤적", en: "Drone / missile air track" },
  "neptun-projection": { ko: "예측 항로", en: "Predicted track" },
  "neptun-trail-archived": { ko: "지나간 공중 궤적", en: "Past air track" },
};

const TIER: Record<EventTier, Bi> = {
  war: { ko: "전쟁·군사 충돌", en: "War / military clash" },
  diplomatic: { ko: "외교적 긴장", en: "Diplomatic tension" },
  alliance: { ko: "동맹국 갈등", en: "Alliance friction" },
  protest: { ko: "시위", en: "Protest" },
};

const CARRIER_STATUS: Record<UsCarrierStatus, Bi> = {
  deployed: { ko: "배치·작전", en: "Deployed / active" },
  home: { ko: "항구·주둔", en: "In port / home" },
  maintenance: { ko: "정비·대기", en: "Maintenance" },
};

const TENSION: Record<"high" | "medium" | "low", Bi> = {
  high: { ko: "높음", en: "High" },
  medium: { ko: "중간", en: "Medium" },
  low: { ko: "낮음", en: "Low" },
};

const DISPUTE_CAT: Record<string, Bi> = {
  "①": { ko: "활성 영토분쟁", en: "Active territorial dispute" },
  "②": { ko: "미획정 경계/정전선", en: "Undelimited / ceasefire line" },
  "③": { ko: "전략적 요충지", en: "Strategic chokepoint" },
  "④": { ko: "민족자결", en: "Self-determination" },
};

export function staticKindLabel(kind: string, lang: LabelLanguage): string {
  return STATIC_KIND[kind] ? pick(STATIC_KIND[kind], lang) : kind;
}

export function pathKindLabel(kind: TransportPath["kind"], lang: LabelLanguage): string {
  const bi = PATH_KIND[kind];
  return bi ? pick(bi, lang) : kind;
}

export function eventTierLabel(tier: EventTier, lang: LabelLanguage): string {
  return pick(TIER[tier], lang);
}

export function carrierStatusLabel(status: UsCarrierStatus, lang: LabelLanguage): string {
  return pick(CARRIER_STATUS[status], lang);
}

export function tensionLabel(
  tension: DisputeArea["tension"],
  lang: LabelLanguage,
): string {
  return pick(TENSION[tension === "high" || tension === "medium" ? tension : "low"], lang);
}

export function disputeCategoryLabel(category: string, lang: LabelLanguage): string {
  const bi = DISPUTE_CAT[category];
  return bi ? `${category}${pick(bi, lang)}` : category;
}

export function hatchStyleLabelLocalized(
  style: string,
  lang: LabelLanguage,
  combatHazard?: boolean,
): string {
  if (combatHazard) {
    return pick({ ko: "빨강 빗금 / (실전투·폭격)", en: "Red hatch / (active combat)" }, lang);
  }
  if (style === "slash") {
    return pick({ ko: "주황 빗금 / (외교적 긴장)", en: "Orange hatch / (diplomatic)" }, lang);
  }
  if (style === "backslash") {
    return pick({ ko: "노랑 빗금 \\ (중긴장·영토)", en: "Yellow hatch \\ (medium / territory)" }, lang);
  }
  if (style === "cross") {
    return pick({ ko: "황금 교차 X (회색지대·위기)", en: "Gold cross X (gray zone)" }, lang);
  }
  return pick({ ko: "청록 가로선 — (저긴장)", en: "Teal lines — (low tension)" }, lang);
}

/** 공통 호버 카드 문구 */
export const HOVER = {
  usCarrierDetail: (status: string, lang: LabelLanguage) =>
    pick({ ko: `미 항공모함 · ${status}`, en: `US aircraft carrier · ${status}` }, lang),
  operational: (lang: LabelLanguage) => pick({ ko: "작전중", en: "On ops" }, lang),
  neptunTrack: (lang: LabelLanguage) =>
    pick({ ko: "드론·미사일 궤적 추적", en: "Drone / missile track" }, lang),
  heading: (deg: number, lang: LabelLanguage) =>
    pick({ ko: `방위 ${deg}°`, en: `Heading ${deg}°` }, lang),
  relatedTickers: (tickers: string, lang: LabelLanguage) =>
    pick({ ko: `연관 지표 · ${tickers}`, en: `Related tickers · ${tickers}` }, lang),
  hintFlyZone: (lang: LabelLanguage) =>
    pick({ ko: "클릭하면 해당 구역으로 이동", en: "Click to fly to this area" }, lang),
  militaryBase: (lang: LabelLanguage) => pick({ ko: "미군기지", en: "US military base" }, lang),
  milAircraft: (lang: LabelLanguage) =>
    pick({ ko: "군사 항공기 (ADS-B)", en: "Military aircraft (ADS-B)" }, lang),
  civAircraft: (lang: LabelLanguage) =>
    pick({ ko: "민간 항공기 (ADS-B)", en: "Civilian aircraft (ADS-B)" }, lang),
  firmsCombat: (lang: LabelLanguage) =>
    pick({ ko: "분쟁 관련 화재 가능성", en: "Likely conflict-related fire" }, lang),
  firmsFire: (lang: LabelLanguage) =>
    pick({ ko: "산불·기타 열원 가능성", en: "Possible wildfire or other heat" }, lang),
  firmsCombatHint: (lang: LabelLanguage) =>
    pick(
      { ko: "근접 추정 · 폭격 증거가 아닙니다", en: "Proximity estimate · not proof of a strike" },
      lang,
    ),
  firmsWildfireHint: (lang: LabelLanguage) =>
    pick(
      { ko: "위성 열감지일 뿐 · 원인 확정 아님", en: "Satellite thermal detection only" },
      lang,
    ),
  aiWarZone: (tension: string, lang: LabelLanguage) =>
    pick(
      { ko: `AI 전쟁지역 (데모) · 긴장도 ${tension}`, en: `AI war zone (demo) · tension ${tension}` },
      lang,
    ),
  countSuffix: (n: number, lang: LabelLanguage) =>
    pick({ ko: `${n.toLocaleString()}건`, en: `${n.toLocaleString()} events` }, lang),
  hintDetail: (lang: LabelLanguage) =>
    pick({ ko: "클릭하면 상세 설명", en: "Click for details" }, lang),
  hintView: (lang: LabelLanguage) =>
    pick({ ko: "클릭하면 상세 보기", en: "Click to view details" }, lang),
  active: (lang: LabelLanguage) => pick({ ko: "활성", en: "Active" }, lang),
  gdeltNews: (lang: LabelLanguage) => pick({ ko: "GDELT 뉴스", en: "GDELT news" }, lang),
  freshBreaking: (lang: LabelLanguage) => pick({ ko: " · 최신 속보", en: " · Breaking" }, lang),
  country: (lang: LabelLanguage) => pick({ ko: "국가", en: "Country" }, lang),
  ukraineFront: (status: string, lang: LabelLanguage) =>
    pick({ ko: `우크라이나 전선 · ${status}`, en: `Ukraine front · ${status}` }, lang),
  uaRu: (lang: LabelLanguage) => pick({ ko: "RU 점령", en: "RU occupied" }, lang),
  uaUa: (lang: LabelLanguage) => pick({ ko: "UA 통제", en: "UA controlled" }, lang),
  uaContested: (lang: LabelLanguage) => pick({ ko: "경합", en: "Contested" }, lang),
  disputeBorder: (hatch: string, lang: LabelLanguage) =>
    pick({ ko: `고정 테두리 · ${hatch}`, en: `Fixed outline · ${hatch}` }, lang),
  combatPrefix: (lang: LabelLanguage) =>
    pick({ ko: "실전투/폭격 · ", en: "Active combat · " }, lang),
  tensionPrefix: (t: string, lang: LabelLanguage) =>
    pick({ ko: `긴장 ${t}`, en: `Tension ${t}` }, lang),
  pathLength: (km: string, lang: LabelLanguage) =>
    pick({ ko: `길이 ${km}km`, en: `Length ${km} km` }, lang),
  neptunProjection: (lang: LabelLanguage) =>
    pick(
      { ko: "속도·방위 기반 예측 항로 (비공식)", en: "Predicted track from speed/heading (unofficial)" },
      lang,
    ),
  neptunTrailBody: (lang: LabelLanguage) =>
    pick({ ko: "관측된 이동 궤적", en: "Observed track" }, lang),
  ocean: (lang: LabelLanguage) => pick({ ko: "바다", en: "Ocean" }, lang),
  oceanDetail: (lang: LabelLanguage) =>
    pick({ ko: "지구본 위 해역", en: "Maritime area on the globe" }, lang),
  tapToPin: (lang: LabelLanguage) =>
    pick({ ko: "탭하면 설명 고정", en: "Tap to pin tip" }, lang),
} as const;
