export type LayerPanelLang = "ko" | "en";

export const LAYER_CATEGORY_COPY: Record<
  string,
  { title: { ko: string; en: string }; hint: { ko: string; en: string } }
> = {
  map: {
    title: { ko: "지도 · 지명", en: "Map & places" },
    hint: {
      ko: "도시명 · 철도 (국경선·해안선은 항상 표시)",
      en: "City labels · railways (borders & coastlines always shown)",
    },
  },
  conflict: {
    title: { ko: "분쟁 · 영토", en: "Conflict & territory" },
    hint: {
      ko: "전선 · 공중위협 · 대치 지점 · 긴장 구역 · 중동 · 뉴스",
      en: "Front lines · air threats · standoffs · tension zones · Middle East · news",
    },
  },
  energy: {
    title: { ko: "에너지·자원", en: "Energy & resources" },
    hint: {
      ko: "원유·가스 수송 · 발전·채굴 · 광물",
      en: "Oil & gas transport · power & mining · minerals",
    },
  },
  transport: {
    title: { ko: "운송 · 통신", en: "Transport & telecom" },
    hint: {
      ko: "항로 · 해저 케이블 · 공항·항구 · 요충지",
      en: "Shipping lanes · subsea cables · airports & ports · chokepoints",
    },
  },
  military: {
    title: { ko: "군사 · 안보", en: "Military & security" },
    hint: {
      ko: "기지, 항공, 정찰위성, 난민",
      en: "Bases, aviation, recon satellites, refugees",
    },
  },
  live: {
    title: { ko: "실시간 · 사건", en: "Live & events" },
    hint: {
      ko: "화재, 사이버, 선거, 우주",
      en: "Fires, cyber, elections, space",
    },
  },
  economy: {
    title: { ko: "경제 · 제재", en: "Economy & sanctions" },
    hint: {
      ko: "허브, 데이터센터, 제재",
      en: "Hubs, data centers, sanctions",
    },
  },
};

/** GlobeDashboard / useLayerPanelCategories 아이템 id 기준 */
export const LAYER_ITEM_LABELS: Record<string, { ko: string; en: string }> = {
  "city-labels": { ko: "도시명", en: "City labels" },
  rail: { ko: "철도", en: "Railways" },
  ukraine: { ko: "우크라이나 전선·점령", en: "Ukraine front line & occupation" },
  neptun: { ko: "우크라이나 공중위협 (실시간)", en: "Ukraine air threats (live)" },
  "east-asia-neon": { ko: "동아시아 대치·발사 지점", en: "East Asia standoffs & launch sites" },
  "china-taiwan-incidents": { ko: "중국–대만 대치", en: "China–Taiwan standoffs" },
  "china-japan-incidents": { ko: "중국–일본 대치", en: "China–Japan standoffs" },
  "china-philippines-incidents": {
    ko: "중국–필리핀 해상 충돌",
    en: "China–Philippines maritime clashes",
  },
  "us-china-incidents": { ko: "미국–중국 군사 마찰", en: "US–China military friction" },
  "nk-missile-tests": { ko: "북한 미사일·무기 시험", en: "North Korea missile & weapons tests" },
  "war-zones": { ko: "전쟁·교전 구역", en: "War zones" },
  "diplomatic-tension": { ko: "외교 긴장 구역", en: "Diplomatic tension zones" },
  "east-asia-adiz": { ko: "방공식별구역 (ADIZ)", en: "Air defense zones (ADIZ)" },
  "island-chains": { ko: "도련선 · 미군 방어선", en: "Island chains & US defense lines" },
  "newfeeds-iran": { ko: "이란·중동 공격 소식", en: "Iran & Middle East attack news" },
  "ukmto-incidents": { ko: "UKMTO 상선 피습·나포 경보", en: "UKMTO merchant vessel alerts" },
  "navarea-warnings": { ko: "NAVAREA 항행경보", en: "NAVAREA navigation warnings" },
  "military-exercises": { ko: "군사 훈련 구역", en: "Military exercise zones" },
  "tzeva-adom": { ko: "이스라엘 로켓·공습 경보", en: "Israel rocket & air raid alerts" },
  "axis-network": {
    ko: "이란·중국·러시아·북한 관계망",
    en: "Iran–China–Russia–North Korea network",
  },
  "conflict-zones": { ko: "추정 전쟁지역 (데모)", en: "Estimated war zones (demo)" },
  "arms-embargo": { ko: "무기 금수 국가", en: "Arms embargo states" },
  ucdp: { ko: "분쟁 사건 기록", en: "UCDP conflict events" },
  "gdelt-war": { ko: "뉴스 · 전투·충돌", en: "News · combat & clashes" },
  "gdelt-diplomatic": { ko: "뉴스 · 외교 긴장", en: "News · diplomatic tension" },
  "gdelt-ocean": { ko: "뉴스 · 대양 경쟁", en: "News · ocean competition" },
  "gdelt-protest": { ko: "뉴스 · 시위", en: "News · protests" },
  "telegram-osint": { ko: "텔레그램 전장 소식", en: "Telegram battlefield updates" },
  "energy-pipelines": { ko: "원유·가스 수송망", en: "Oil & gas transport network" },
  "oil-pipelines": { ko: "송유관", en: "Oil pipelines" },
  "gas-pipelines": { ko: "가스관", en: "Gas pipelines" },
  "lng-terminals": { ko: "LNG(액화가스) 터미널", en: "LNG terminals" },
  "subsea-pipelines": { ko: "해저 파이프라인", en: "Subsea pipelines" },
  "gem-resources": { ko: "발전·채굴·산업 시설", en: "Power, mining & industrial sites" },
  "gem-group-coal": { ko: "석탄 (발전·광산·터미널)", en: "Coal" },
  "gem-group-power": { ko: "원자력·재생에너지", en: "Nuclear & renewables" },
  "gem-group-oil-gas": { ko: "석유·가스 발전·채굴", en: "Oil & gas power / extraction" },
  "gem-group-industry": { ko: "철강·시멘트·화학", en: "Steel, cement, chemicals" },
  "gem-coal-plants": { ko: "석탄 발전소", en: "Coal plants" },
  "gem-coal-mines": { ko: "석탄 광산", en: "Coal mines" },
  "gem-coal-terminals": { ko: "석탄 터미널", en: "Coal terminals" },
  "gem-nuclear": { ko: "원자력 발전", en: "Nuclear power" },
  "gem-solar": { ko: "태양광 발전", en: "Solar" },
  "gem-wind": { ko: "풍력 발전", en: "Wind" },
  "gem-hydro": { ko: "수력 발전", en: "Hydro" },
  "gem-geothermal": { ko: "지열 발전", en: "Geothermal" },
  "gem-bioenergy": { ko: "바이오에너지", en: "Bioenergy" },
  "gem-oil-gas-plants": { ko: "석유·가스 발전", en: "Oil & gas plants" },
  "gem-oil-gas-extraction": { ko: "석유·가스 채굴", en: "Oil & gas extraction" },
  "gem-iron-ore": { ko: "철광", en: "Iron ore" },
  "gem-cement": { ko: "시멘트 공장", en: "Cement" },
  "gem-steel": { ko: "철강 공장", en: "Steel" },
  "gem-chemicals": { ko: "화학 공장", en: "Chemicals" },
  "energy-other": { ko: "광물 매장지·원자력 시설", en: "Mineral deposits & nuclear sites" },
  resources: { ko: "광물·자원 매장지", en: "Mineral & resource deposits" },
  nuclear: { ko: "원자력 시설", en: "Nuclear facilities" },
  shipping: { ko: "해상 항로", en: "Shipping lanes" },
  "us-dfc-supply": { ko: "미국 DFC 개발금융망", en: "US DFC development finance network" },
  "bri-trade": { ko: "일대일로 무역 연결", en: "Belt & Road trade links" },
  cables: { ko: "해저 케이블", en: "Subsea cables" },
  tunnels: { ko: "해저터널", en: "Subsea tunnels" },
  airports: { ko: "공항", en: "Airports" },
  ports: { ko: "항구", en: "Ports" },
  ixp: { ko: "인터넷 교환점", en: "Internet exchange points" },
  "logistics-risk": { ko: "해상 요충·물류 거점", en: "Maritime chokepoints & logistics hubs" },
  "logistics-stress": { ko: "물류 스트레스 색상", en: "Logistics stress colors" },
  "gscpi-gauge": { ko: "GSCPI 공급망 압력", en: "GSCPI supply-chain pressure" },
  "critical-nodes": { ko: "핵심 인프라 노드", en: "Critical infrastructure nodes" },
  ais: { ko: "위장·그림자함대", en: "Spoofed & shadow fleet vessels" },
  "disguised-vessels": { ko: "위장·그림자함대", en: "Spoofed & shadow fleet vessels" },
  "military-bases": { ko: "미군 기지", en: "US military bases" },
  "military-air": { ko: "군사 항공기", en: "Military aircraft" },
  intel: { ko: "정보 수집 거점", en: "Intelligence collection sites" },
  refugee: { ko: "난민 캠프", en: "Refugee camps" },
  firms: { ko: "위성 화재 (NASA FIRMS)", en: "Satellite fires (NASA FIRMS)" },
  cyber: { ko: "사이버 공격", en: "Cyber attacks" },
  election: { ko: "선거 사건", en: "Election events" },
  space: { ko: "우주 발사", en: "Space launches" },
  "recon-satellites": { ko: "정찰위성 (전역 시야)", en: "Recon satellites (global view)" },
  "gps-interference": { ko: "GPS 재밍 (GPSJam)", en: "GPS interference (GPSJam)" },
  "air-traffic": { ko: "항공기 운항", en: "Flight activity" },
  economic: { ko: "경제 중심지", en: "Economic hubs" },
  "ai-dc": { ko: "AI 데이터센터", en: "AI data centers" },
  sanctions: { ko: "제재 대상", en: "Sanctioned entities" },
};

/** 상세 문구 한글 → EN (긴 구문 우선) */
const DETAIL_KO_TO_EN: Array<[RegExp, string]> = [
  [/주요 도시/g, "major cities"],
  [/노선/g, "routes"],
  [/서버 설정 꺼짐 \(NEPTUN_ENABLED\)/g, "Server setting off (NEPTUN_ENABLED)"],
  [/우크라이나 근처로 이동 시 로드/g, "Loads when near Ukraine"],
  [/우크라이나 근처로 이동/g, "Move near Ukraine"],
  [/예상 항로 포함/g, "with projected tracks"],
  [/드론·미사일/g, "Drones · missiles"],
  [/드론·순항·탄도 위치와 궤적 · 탄착 표시/g, "Drone · cruise · ballistic tracks · impacts"],
  [/공습 경보/g, "Air-raid alerts"],
  [/데모 궤적/g, "Demo tracks"],
  [/연결 오류/g, "Connection error"],
  [/연결 중/g, "Connecting"],
  [/불러오는 중…/g, "Loading…"],
  [/로드 실패/g, "Load failed"],
  [/데이터 빌드 필요/g, "Data build required"],
  [/점령·주장 경계/g, "occupation · claim boundaries"],
  [/전선 구역/g, "Front sectors"],
  [/피드 오류/g, "Feed error"],
  [/공격 지점/g, "Attack sites"],
  [/유가 민감/g, "oil-sensitive"],
  [/이란 국영·공식 · 빨간 점/g, "Iran state/official · red dots"],
  [/물류 스트레스 신호/g, "logistics stress signal"],
  [/홍해·호르무즈 등 · 비공식 소스/g, "Red Sea · Hormuz · unofficial sources"],
  [/물류·해상 제약/g, "logistics · maritime constraints"],
  [/항행 폐쇄·훈련 구역/g, "closures · exercise areas"],
  [/석탄·재생·석유가스·산업 \(GEM\)/g, "coal · renewables · oil/gas · industry (GEM)"],
  [/매장지·원전·연구시설/g, "deposits · nuclear · research"],
  [/발전소·연구시설/g, "plants · research"],
  [/광물·자원 매장지/g, "Mineral · resource deposits"],
  [/미국 개발금융 투자 대상국/g, "US DFC partner countries"],
  [/민항/g, "Civil flights"],
  [/군용 제외/g, "military excluded"],
  [/금융·무역 허브/g, "Finance · trade hubs"],
  [/데이터센터 시설/g, "Data center sites"],
  [/제재 국가·기업/g, "Sanctioned states · firms"],
  [/민간 항적 불러오는 중…/g, "Loading civil tracks…"],
  [/민간 항적 새로고침/g, "Refresh civil tracks"],
  [/유효/g, "Active"],
  [/경보/g, "Alerts"],
  [/상세/g, "detail"],
  [/광물/g, "Minerals"],
  [/원자력/g, "Nuclear"],
  [/실시간/g, "Live"],
  [/추적/g, "tracks"],
  [/개요/g, "overview"],
  [/(\d[\d,]*)\s*곳/g, "$1 sites"],
  [/(\d[\d,]*)\s*개/g, "$1"],
  [/(\d[\d,]*)\s*건/g, "$1"],
  [/(\d[\d,]*)\s*대/g, "$1"],
  [/호 /g, "arcs "],
  [/켜짐/g, "On"],
  [/꺼짐/g, "Off"],
  [/전역/g, "Global"],
  [/대륙/g, "Continent"],
  [/지역/g, "Regional"],
  [/근접/g, "Near"],
  [/도시와 마을/g, "Local"],
];

export function layerCategoryTitle(
  id: string,
  lang: LayerPanelLang,
  fallback: string,
): string {
  return LAYER_CATEGORY_COPY[id]?.title[lang] ?? fallback;
}

export function layerCategoryHint(
  id: string,
  lang: LayerPanelLang,
  fallback?: string,
): string | undefined {
  const hint = LAYER_CATEGORY_COPY[id]?.hint[lang];
  return hint ?? fallback;
}

export function layerItemLabel(
  id: string,
  lang: LayerPanelLang,
  fallback: string,
): string {
  return LAYER_ITEM_LABELS[id]?.[lang] ?? fallback;
}

export function localizeLayerDetail(detail: string, lang: LayerPanelLang): string {
  if (lang !== "en" || !detail) return detail;
  let out = detail;
  for (const [re, en] of DETAIL_KO_TO_EN) {
    out = out.replace(re, en);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

type ToggleLike = {
  id: string;
  label: string;
  detail?: string;
  options?: ToggleLike[];
};

function localizeToggleTree<T extends ToggleLike>(item: T, lang: LayerPanelLang): T {
  return {
    ...item,
    label: layerItemLabel(item.id, lang, item.label),
    detail:
      item.detail !== undefined ? localizeLayerDetail(item.detail, lang) : item.detail,
    options: item.options?.map((opt) => localizeToggleTree(opt, lang)),
  };
}

export function localizeLayerCategories<
  T extends {
    id: string;
    title: string;
    hint?: string;
    items: ToggleLike[];
  },
>(categories: T[], lang: LayerPanelLang): T[] {
  return categories.map((category) => ({
    ...category,
    title: layerCategoryTitle(category.id, lang, category.title),
    hint:
      category.hint !== undefined
        ? layerCategoryHint(category.id, lang, category.hint)
        : category.hint,
    items: category.items.map((item) => localizeToggleTree(item, lang)),
  }));
}
