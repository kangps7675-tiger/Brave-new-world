import type { ExplorationPreset, NavMenuGroup, NavSelection } from "@/data/navRegions";
import { toNavSelection } from "@/data/navRegions";
import { HUB_NAV_GROUP } from "@/data/hubNav";
import { navSelectionFromId } from "@/lib/theaterFocus";
import type { ViewerMode } from "@/lib/viewPackages";

/** 경제 nav id → RSS 필터 키워드 */
export const ECON_REGION_KEYWORDS: Record<string, string[]> = {
  hormuz: ["hormuz", "oil", "brent", "iran", "gulf", "opec"],
  suez: ["suez", "canal", "shipping", "container", "red sea"],
  "bab-el-mandeb": ["red sea", "houthi", "shipping", "suez", "brent"],
  malacca: ["malacca", "shipping", "china trade", "semiconductor"],
  panama: ["panama canal", "shipping", "container"],
  dubai: ["dubai", "uae", "energy", "lng"],
  qatar: ["qatar", "lng", "gas"],
  rotterdam: ["rotterdam", "europe gas", "ttf", "lng"],
  singapore: ["singapore", "shipping", "trade hub"],
  nyc: ["wall street", "fed", "s&p", "nasdaq", "dollar"],
  london: ["london", "ftse", "bank of england", "sterling"],
  "hong-kong": ["hong kong", "hang seng", "china markets"],
  "taiwan-chip": ["tsmc", "taiwan", "semiconductor", "chip"],
  "nova-ai": ["ashburn", "northern virginia", "data center", "aws", "hyperscaler", "ai infra"],
  "korea-fab": ["pyeongtaek", "yongin", "samsung", "hynix", "평택", "용인", "반도체"],
  "kumamoto-fab": ["kumamoto", "구마모토", "tsmc japan", "japan fab"],
  "arizona-fab": ["arizona", "phoenix", "tsmc arizona", "애리조나"],
  "vietnam-mfg": ["vietnam", "베트남", "hanoi", "bac ninh", "foxconn", "samsung vietnam"],
  "battery-nickel": ["indonesia", "nickel", "battery", "니켈", "배터리", "리튬"],
  "fed-dc": ["federal reserve", "the fed", "fomc", "rate cut", "rate hike", "연준", "금리"],
  "ecb-frankfurt": ["ecb", "european central bank", "frankfurt", "eur", "유럽중앙은행"],
  "boj-tokyo": ["bank of japan", "boj", "yen", "엔화", "일본은행", "엔저"],
  "pboc-shanghai": ["pboc", "yuan", "renminbi", "shanghai", "위안", "중국 인민은행", "상하이"],
  "chicago-cme": ["cme", "chicago", "corn", "soybean", "wheat futures", "시카고", "곡물"],
  "black-sea-grain": ["black sea", "odessa", "grain corridor", "wheat", "흑해", "곡물 회랑", "오데사"],
  "pilbara-iron": ["pilbara", "iron ore", "perth", "australia mining", "철광", "퍼스"],
  "chile-copper": ["chile", "copper", "codelco", "구리", "칠레"],
  "lithium-aus": ["lithium", "리튬", "pilbara lithium", "배터리 광물"],
};

/** nav id → 관련 티커 힌트 */
export const ECON_REGION_TICKERS: Record<string, string> = {
  hormuz: "Brent · DXY · VIX",
  suez: "Brent · DXY · VIX",
  "bab-el-mandeb": "Brent · Gold · VIX",
  malacca: "Shanghai · Hang Seng · Brent",
  panama: "S&P 500 · Brent",
  "taiwan-chip": "NASDAQ · Hang Seng · Shanghai",
  "nova-ai": "NASDAQ · NVDA · MSFT",
  "korea-fab": "KOSPI · Samsung · SK Hynix",
  "kumamoto-fab": "Nikkei · TSM · NASDAQ",
  "arizona-fab": "NASDAQ · TSM · SOX",
  "vietnam-mfg": "VN-Index · USD/VND",
  "battery-nickel": "Nickel · Lithium · EV",
  "fed-dc": "DXY · US10Y · S&P 500",
  "ecb-frankfurt": "EUR/USD · Bund · Stoxx",
  "boj-tokyo": "USD/JPY · Nikkei · JGBs",
  "pboc-shanghai": "USD/CNH · Hang Seng · CSI 300",
  "chicago-cme": "Corn · Soy · Wheat",
  "black-sea-grain": "Wheat · Corn · Brent",
  "pilbara-iron": "Iron Ore · AUD · BHP",
  "chile-copper": "Copper · CLP · Codelco",
  "lithium-aus": "Lithium · AUD · EV",
};

export const ENERGY_CHOKEPOINTS_GROUP: NavMenuGroup = {
  id: "energy-chokepoints",
  label: "에너지 · 초크포인트",
  items: [
    {
      id: "hormuz",
      label: "호르무즈",
      lat: 26.56,
      lng: 56.25,
      altitude: 1.7,
      description: "걸프 원유 ~20% · Brent 즉각 반응",
      bbox: { minLat: 12, maxLat: 40, minLng: 32, maxLng: 66 },
      subItems: [],
    },
    {
      id: "suez",
      label: "수에즈 · 홍해",
      lat: 22,
      lng: 38,
      altitude: 1.72,
      description: "컨테이너·원유 병목 · 운임 프리미엄",
      bbox: { minLat: 8, maxLat: 36, minLng: 28, maxLng: 52 },
      subItems: [
        {
          id: "suez-canal",
          label: "수에즈 운하",
          lat: 30.45,
          lng: 32.35,
          altitude: 0.9,
          description: "유럽·아시아 무역 관문",
          bbox: { minLat: 29, maxLat: 31.5, minLng: 31, maxLng: 33.5 },
        },
        {
          id: "bab-el-mandeb",
          label: "바브엘만데브",
          lat: 12.58,
          lng: 43.33,
          altitude: 0.95,
          description: "홍해·수에즈 연결 · 해상 리스크",
          bbox: { minLat: 11, maxLat: 14, minLng: 42, maxLng: 45 },
        },
      ],
    },
    {
      id: "malacca",
      label: "말라카 · 대만 해협",
      lat: 2.8,
      lng: 101.0,
      altitude: 1.7,
      description: "아시아 제조·에너지 허리",
      bbox: { minLat: -2, maxLat: 28, minLng: 95, maxLng: 125 },
      subItems: [
        {
          id: "malacca-strait",
          label: "말라카 해협",
          lat: 2.8,
          lng: 101.0,
          altitude: 1.0,
          description: "~25% traded goods",
          bbox: { minLat: 0, maxLat: 6, minLng: 98, maxLng: 104 },
        },
        {
          id: "taiwan-strait-econ",
          label: "대만 해협",
          lat: 24.5,
          lng: 119.5,
          altitude: 0.88,
          description: "반도체·해운 수로",
          bbox: { minLat: 22, maxLat: 26, minLng: 117, maxLng: 122 },
        },
      ],
    },
    {
      id: "panama",
      label: "파나마 운하",
      lat: 9.08,
      lng: -79.68,
      altitude: 1.05,
      description: "미주·아시아 컨테이너 연결",
      bbox: { minLat: 8, maxLat: 10.5, minLng: -80.5, maxLng: -78.5 },
      subItems: [],
    },
  ],
};

export const ENERGY_HUBS_GROUP: NavMenuGroup = {
  id: "energy-hubs",
  label: "LNG · 에너지 허브",
  items: [
    {
      id: "dubai",
      label: "두바이 · 걸프",
      lat: 25.2,
      lng: 55.27,
      altitude: 1.7,
      description: "OPEC+ · 에너지 금융",
      bbox: { minLat: 12, maxLat: 38, minLng: 40, maxLng: 62 },
      subItems: [],
    },
    {
      id: "qatar",
      label: "카타르 LNG",
      lat: 25.3,
      lng: 51.5,
      altitude: 0.98,
      description: "LNG 수출 · 가스 spot",
      bbox: { minLat: 24, maxLat: 26.5, minLng: 50, maxLng: 52.5 },
      subItems: [],
    },
    {
      id: "rotterdam",
      label: "로테르담 · EU 가스",
      lat: 51.9,
      lng: 4.5,
      altitude: 1.1,
      description: "TTF · EU LNG 수입",
      bbox: { minLat: 50.5, maxLat: 53, minLng: 3, maxLng: 6 },
      subItems: [],
    },
    {
      id: "singapore-energy",
      label: "싱가포르 허브",
      lat: 1.35,
      lng: 103.8,
      altitude: 1.05,
      description: "아시아 정유·LNG 트레이딩",
      bbox: { minLat: 0.5, maxLat: 2.5, minLng: 102.5, maxLng: 105 },
      subItems: [],
    },
  ],
};

export const FINANCE_TRADE_GROUP: NavMenuGroup = {
  id: "finance-trade",
  label: "금융 · 무역 허브",
  items: [
    {
      id: "nyc",
      label: "뉴욕",
      lat: 40.71,
      lng: -74.0,
      altitude: 1.25,
      description: "Fed · S&P · NASDAQ",
      bbox: { minLat: 39, maxLat: 42, minLng: -75.5, maxLng: -72.5 },
      subItems: [],
    },
    {
      id: "london",
      label: "런던",
      lat: 51.5,
      lng: -0.12,
      altitude: 1.2,
      description: "FTSE · ECB 연동 · 와이어",
      bbox: { minLat: 50.5, maxLat: 52.5, minLng: -1.5, maxLng: 1 },
      subItems: [],
    },
    {
      id: "singapore",
      label: "싱가포르",
      lat: 1.35,
      lng: 103.8,
      altitude: 1.05,
      description: "아시아 금융·무역 중심",
      bbox: { minLat: 0.5, maxLat: 2.5, minLng: 102.5, maxLng: 105 },
      subItems: [],
    },
    {
      id: "hong-kong",
      label: "홍콩",
      lat: 22.3,
      lng: 114.17,
      altitude: 1.0,
      description: "Hang Seng · 중국 자본",
      bbox: { minLat: 21.5, maxLat: 23.5, minLng: 113, maxLng: 115 },
      subItems: [],
    },
  ],
};

/** 반도체·AI 인프라·배터리·이전 생산 */
export const SUPPLY_MANUFACTURING_GROUP: NavMenuGroup = {
  id: "supply-manufacturing",
  label: "공급망 · 제조",
  items: [
    {
      id: "taiwan-chip",
      label: "대만 · TSMC",
      lat: 22.7,
      lng: 122.9,
      altitude: 0.98,
      description: "첨단 칩 · 대만 해협 공급망",
      bbox: { minLat: 18.2, maxLat: 27.2, minLng: 116.8, maxLng: 129.0 },
      subItems: [],
    },
    {
      id: "korea-fab",
      label: "평택 · 용인",
      lat: 37.12,
      lng: 127.2,
      altitude: 0.72,
      description: "삼성·SK하이닉스 메모리·파운드리",
      bbox: { minLat: 36.6, maxLat: 37.7, minLng: 126.6, maxLng: 127.8 },
      subItems: [],
    },
    {
      id: "arizona-fab",
      label: "애리조나 Fab",
      lat: 33.3,
      lng: -111.75,
      altitude: 0.95,
      description: "TSMC · 미국 온쇼어링",
      bbox: { minLat: 32.6, maxLat: 34.0, minLng: -112.8, maxLng: -110.8 },
      subItems: [],
    },
    {
      id: "kumamoto-fab",
      label: "구마모토 Fab",
      lat: 32.8,
      lng: 130.71,
      altitude: 0.9,
      description: "TSMC 일본 · 일본 반도체 르네상스",
      bbox: { minLat: 32.2, maxLat: 33.4, minLng: 130.0, maxLng: 131.4 },
      subItems: [],
    },
    {
      id: "nova-ai",
      label: "노스버지니아 AI",
      lat: 39.04,
      lng: -77.49,
      altitude: 0.95,
      description: "Ashburn · 하이퍼스케일 DC · AI 인프라",
      bbox: { minLat: 38.5, maxLat: 39.5, minLng: -78.0, maxLng: -76.8 },
      subItems: [],
    },
    {
      id: "vietnam-mfg",
      label: "베트남 제조",
      lat: 21.0,
      lng: 106.5,
      altitude: 1.25,
      description: "전자기기·조립 · 차이나+1",
      bbox: { minLat: 10.0, maxLat: 23.0, minLng: 102.0, maxLng: 110.0 },
      subItems: [],
    },
    {
      id: "battery-nickel",
      label: "인니 니켈 · 배터리",
      lat: -2.5,
      lng: 118.0,
      altitude: 1.65,
      description: "EV 배터리 원료 · 다운스트림 투자",
      bbox: { minLat: -11, maxLat: 6, minLng: 95, maxLng: 141 },
      subItems: [],
    },
  ],
};

/** 중앙은행 · 환율 · 금리 사이클 */
export const RATES_CURRENCY_GROUP: NavMenuGroup = {
  id: "rates-currency",
  label: "통화 · 금리",
  items: [
    {
      id: "fed-dc",
      label: "연준 · 워싱턴",
      lat: 38.9,
      lng: -77.04,
      altitude: 1.15,
      description: "FOMC · DXY · 미 국채",
      bbox: { minLat: 37.5, maxLat: 40.5, minLng: -79, maxLng: -75 },
      subItems: [],
    },
    {
      id: "ecb-frankfurt",
      label: "ECB · 프랑크푸르트",
      lat: 50.11,
      lng: 8.68,
      altitude: 1.05,
      description: "유로 정책금리 · Bund",
      bbox: { minLat: 49.2, maxLat: 51.0, minLng: 7.5, maxLng: 10.0 },
      subItems: [],
    },
    {
      id: "boj-tokyo",
      label: "일본은행 · 도쿄",
      lat: 35.68,
      lng: 139.76,
      altitude: 1.0,
      description: "엔화 · YCC · Nikkei",
      bbox: { minLat: 34.8, maxLat: 36.5, minLng: 138.5, maxLng: 141.0 },
      subItems: [],
    },
    {
      id: "pboc-shanghai",
      label: "인민은행 · 상하이",
      lat: 31.23,
      lng: 121.47,
      altitude: 1.05,
      description: "위안 · 신용·부동산 리스크",
      bbox: { minLat: 29.5, maxLat: 32.5, minLng: 119.5, maxLng: 123.0 },
      subItems: [],
    },
  ],
};

/** 곡물 · 금속 · 배터리 광물 */
export const COMMODITIES_FOOD_GROUP: NavMenuGroup = {
  id: "commodities-food",
  label: "원자재 · 식량",
  items: [
    {
      id: "chicago-cme",
      label: "시카고 · CME",
      lat: 41.88,
      lng: -87.63,
      altitude: 1.05,
      description: "곡물·유지 선물 · 글로벌 가격 기준",
      bbox: { minLat: 40.8, maxLat: 42.5, minLng: -88.5, maxLng: -86.5 },
      subItems: [],
    },
    {
      id: "black-sea-grain",
      label: "흑해 곡물 회랑",
      lat: 44.5,
      lng: 33.5,
      altitude: 1.35,
      description: "밀·옥수수 · 오데사–보스포루스",
      bbox: { minLat: 40, maxLat: 48, minLng: 28, maxLng: 42 },
      subItems: [],
    },
    {
      id: "pilbara-iron",
      label: "필바라 · 철광",
      lat: -22.0,
      lng: 118.5,
      altitude: 1.35,
      description: "호주 철광석 · 중국 수요",
      bbox: { minLat: -26, maxLat: -18, minLng: 114, maxLng: 122 },
      subItems: [],
    },
    {
      id: "chile-copper",
      label: "칠레 구리",
      lat: -23.5,
      lng: -69.5,
      altitude: 1.4,
      description: "세계 구리 공급 · 전력망·EV",
      bbox: { minLat: -28, maxLat: -18, minLng: -72, maxLng: -66 },
      subItems: [],
    },
    {
      id: "lithium-aus",
      label: "호주 리튬",
      lat: -30.75,
      lng: 121.5,
      altitude: 1.25,
      description: "배터리급 리튬 · EV 원료",
      bbox: { minLat: -33, maxLat: -28, minLng: 118, maxLng: 125 },
      subItems: [],
    },
  ],
};

export const ECON_NAV_MENU_GROUPS: NavMenuGroup[] = [
  ENERGY_CHOKEPOINTS_GROUP,
  ENERGY_HUBS_GROUP,
  RATES_CURRENCY_GROUP,
  FINANCE_TRADE_GROUP,
  SUPPLY_MANUFACTURING_GROUP,
  COMMODITIES_FOOD_GROUP,
];

export const ECON_EXPLORATION_PRESETS: ExplorationPreset[] = [
  {
    id: "hormuz",
    label: "호르무즈",
    tagline: "걸프 원유 · Brent",
    navItem: ENERGY_CHOKEPOINTS_GROUP.items[0]!,
    groupId: ENERGY_CHOKEPOINTS_GROUP.id,
  },
  {
    id: "fed-dc",
    label: "연준",
    tagline: "금리 · DXY",
    navItem: RATES_CURRENCY_GROUP.items[0]!,
    groupId: RATES_CURRENCY_GROUP.id,
  },
  {
    id: "taiwan-chip",
    label: "대만·칩",
    tagline: "TSMC · NASDAQ",
    navItem: SUPPLY_MANUFACTURING_GROUP.items[0]!,
    groupId: SUPPLY_MANUFACTURING_GROUP.id,
  },
  {
    id: "chicago-cme",
    label: "시카고",
    tagline: "곡물 선물",
    navItem: COMMODITIES_FOOD_GROUP.items[0]!,
    groupId: COMMODITIES_FOOD_GROUP.id,
  },
];

export function getNavMenuGroups(mode: ViewerMode): NavMenuGroup[] {
  return mode === "economy" ? ECON_NAV_MENU_GROUPS : [HUB_NAV_GROUP as unknown as NavMenuGroup];
}

export function econNavSelectionFromId(id: string, parentLabel?: string): NavSelection | null {
  for (const group of ECON_NAV_MENU_GROUPS) {
    for (const item of group.items) {
      if (item.id === id) return toNavSelection(item, group.id);
      const sub = item.subItems.find((s) => s.id === id);
      if (sub) return toNavSelection(sub, group.id, parentLabel ?? item.label);
    }
  }
  return null;
}

export function navSelectionFromIdAnyMode(
  id: string,
  mode: "conflict" | "economy" | "satellite" | "live",
  parentLabel?: string,
): NavSelection | null {
  if (mode === "economy") return econNavSelectionFromId(id, parentLabel);
  return navSelectionFromId(id, parentLabel);
}
