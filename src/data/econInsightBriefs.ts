import {
  criticalNodeForEconNavId,
  type CriticalRiskLevel,
} from "@/data/criticalNodes";

export type InsightRiskLevel = "CRITICAL" | "HIGH" | "STABLE";

export type MarketLinkDirection = "up" | "down" | "watch";

export type EconInsightMarketLink = {
  symbol: string;
  direction: MarketLinkDirection;
};

export type EconInsightBrief = {
  navId: string;
  titleKo: string;
  titleEn: string;
  riskLevel: InsightRiskLevel;
  impactLine: string;
  marketLinks: EconInsightMarketLink[];
  paragraphs: string[];
  /** ISO country hint for world-stats optional card */
  countryHint?: string;
  criticalNodeId?: string;
};

function riskFromUpstream(r: CriticalRiskLevel): InsightRiskLevel {
  if (r === "critical") return "CRITICAL";
  if (r === "high") return "HIGH";
  return "STABLE";
}

function briefFromMapped(
  navId: string,
  titleKo: string,
  titleEn: string,
  marketLinks: EconInsightMarketLink[],
  extraKo: string[],
  countryHint?: string,
): EconInsightBrief {
  const node = criticalNodeForEconNavId(navId);
  const paragraphs = node
    ? [
        node.plain,
        `무엇을 통제하나 — ${node.what}`,
        `왜 중요한가 — ${node.why}`,
        `단절되면 — ${node.disruption}`,
        ...(node.realEvent ? [`실제 사건 — ${node.realEvent}`] : []),
        ...extraKo,
      ]
    : extraKo;
  return {
    navId,
    titleKo,
    titleEn,
    riskLevel: node ? riskFromUpstream(node.risk) : "HIGH",
    impactLine: node?.flow || node?.metric || node?.plain.slice(0, 80) || titleKo,
    marketLinks,
    paragraphs,
    countryHint: countryHint ?? node?.country,
    criticalNodeId: node?.id,
  };
}

const LOCAL: Record<string, EconInsightBrief> = {
  hormuz: briefFromMapped(
    "hormuz",
    "호르무즈 해협",
    "Strait of Hormuz",
    [
      { symbol: "WTI", direction: "up" },
      { symbol: "Brent", direction: "up" },
      { symbol: "BDI", direction: "up" },
    ],
    ["페르시아만 원유·LNG가 세계 시장으로 나가는 병목. 긴장이 고조되면 에너지·인플레이션 경로로 파급됩니다."],
    "Iran",
  ),
  suez: briefFromMapped(
    "suez",
    "수에즈 · 홍해",
    "Suez · Red Sea",
    [
      { symbol: "BDI", direction: "up" },
      { symbol: "Brent", direction: "watch" },
      { symbol: "DXY", direction: "watch" },
    ],
    ["유럽–아시아 컨테이너·에너지의 지름길. 우회는 곧 운임·재고 회전일 증가입니다."],
    "Egypt",
  ),
  "suez-canal": briefFromMapped(
    "suez-canal",
    "수에즈 운하",
    "Suez Canal",
    [
      { symbol: "BDI", direction: "up" },
      { symbol: "Container", direction: "up" },
    ],
    ["운하 자체의 통행 차질은 즉시 스케줄·보험 프리미엄으로 반영됩니다."],
    "Egypt",
  ),
  "bab-el-mandeb": briefFromMapped(
    "bab-el-mandeb",
    "바브엘만데브",
    "Bab el-Mandeb",
    [
      { symbol: "Brent", direction: "up" },
      { symbol: "Gold", direction: "up" },
      { symbol: "BDI", direction: "up" },
    ],
    ["홍해 입구. 안보 리스크가 수에즈 전체 회랑의 신뢰도를 흔듭니다."],
    "Yemen",
  ),
  malacca: briefFromMapped(
    "malacca",
    "말라카 · 대만 해협",
    "Malacca · Taiwan Strait",
    [
      { symbol: "Shanghai", direction: "watch" },
      { symbol: "Brent", direction: "watch" },
      { symbol: "NASDAQ", direction: "watch" },
    ],
    ["아시아 제조·에너지 허리. 봉쇄·지연은 반도체·소비재 재고에 직결됩니다."],
    "Singapore",
  ),
  "malacca-strait": briefFromMapped(
    "malacca-strait",
    "말라카 해협",
    "Strait of Malacca",
    [
      { symbol: "BDI", direction: "up" },
      { symbol: "SGD", direction: "watch" },
    ],
    ["세계 무역 물량의 큰 축이 지나가는 협수로입니다."],
    "Malaysia",
  ),
  "taiwan-strait-econ": briefFromMapped(
    "taiwan-strait-econ",
    "대만 해협",
    "Taiwan Strait",
    [
      { symbol: "TSM", direction: "down" },
      { symbol: "SOXX", direction: "down" },
      { symbol: "Hang Seng", direction: "down" },
    ],
    ["반도체·해운 수로가 겹칩니다. 지정학 긴장이 곧 공급망·시총 리스크입니다."],
    "Taiwan",
  ),
  panama: briefFromMapped(
    "panama",
    "파나마 운하",
    "Panama Canal",
    [
      { symbol: "BDI", direction: "up" },
      { symbol: "S&P 500", direction: "watch" },
    ],
    ["미주–아시아 컨테이너 연결. 가뭄·통행 제한이 곧 미국 인플레·소매 재고에 닿습니다."],
    "Panama",
  ),
  dubai: {
    navId: "dubai",
    titleKo: "두바이 · 걸프",
    titleEn: "Dubai · Gulf",
    riskLevel: "HIGH",
    impactLine: "OPEC+ 시그널 · 에너지 금융·무역 허브",
    marketLinks: [
      { symbol: "Brent", direction: "watch" },
      { symbol: "DXY", direction: "watch" },
    ],
    paragraphs: [
      "걸프 에너지 정책과 중계 무역이 만나는 도시입니다.",
      "유가 협의·제재 우회 루머·지정학 헤드라인이 한꺼번에 가격에 반영됩니다.",
    ],
    countryHint: "United Arab Emirates",
  },
  qatar: briefFromMapped(
    "qatar",
    "카타르 LNG",
    "Qatar LNG",
    [
      { symbol: "TTF", direction: "up" },
      { symbol: "Brent", direction: "watch" },
    ],
    ["세계 LNG 스팟·장기계약의 핵심 공급지. 유럽·아시아 가스 가격에 민감합니다."],
    "Qatar",
  ),
  rotterdam: {
    navId: "rotterdam",
    titleKo: "로테르담 · EU 가스",
    titleEn: "Rotterdam · EU Gas",
    riskLevel: "HIGH",
    impactLine: "TTF · EU LNG·정유 수입 관문",
    marketLinks: [
      { symbol: "TTF", direction: "up" },
      { symbol: "EUR", direction: "watch" },
    ],
    paragraphs: [
      "유럽 에너지·석유제품 가격 발견의 현장입니다.",
      "파이프·터미널 재고 뉴스가 TTF와 산업 마진을 동시에 움직입니다.",
    ],
    countryHint: "Netherlands",
  },
  "singapore-energy": briefFromMapped(
    "singapore-energy",
    "싱가포르 허브",
    "Singapore Hub",
    [
      { symbol: "Brent", direction: "watch" },
      { symbol: "SGD", direction: "watch" },
    ],
    ["아시아 정유·LNG·벙커링 트레이딩 중심. 해운·케이블이 한곳에 겹칩니다."],
    "Singapore",
  ),
  nyc: {
    navId: "nyc",
    titleKo: "뉴욕",
    titleEn: "New York",
    riskLevel: "HIGH",
    impactLine: "Fed · S&P · NASDAQ — 글로벌 리스크 프리미엄의 거울",
    marketLinks: [
      { symbol: "S&P 500", direction: "watch" },
      { symbol: "DXY", direction: "watch" },
      { symbol: "VIX", direction: "up" },
    ],
    paragraphs: [
      "월스트리트는 지정학·인플레 충격을 즉각 가격에 넣습니다.",
      "연준 기대·달러·위험자산이 동시에 움직이는 교차점입니다.",
    ],
    countryHint: "United States",
  },
  london: {
    navId: "london",
    titleKo: "런던",
    titleEn: "London",
    riskLevel: "HIGH",
    impactLine: "FTSE · 원자재 금융 · 유럽 자본시장의 허브",
    marketLinks: [
      { symbol: "FTSE", direction: "watch" },
      { symbol: "GBP", direction: "watch" },
      { symbol: "Gold", direction: "watch" },
    ],
    paragraphs: [
      "유럽·중동 자본과 원자재 북킹이 교차합니다.",
      "금리·에너지 쇼크가 스털링과 증시에 동시에 반영됩니다.",
    ],
    countryHint: "United Kingdom",
  },
  singapore: briefFromMapped(
    "singapore",
    "싱가포르",
    "Singapore",
    [
      { symbol: "STI", direction: "watch" },
      { symbol: "SGD", direction: "watch" },
    ],
    ["아시아 금융·무역·해저케이블 허브. 지역 리스크의 조기 경보지입니다."],
    "Singapore",
  ),
  "hong-kong": {
    navId: "hong-kong",
    titleKo: "홍콩",
    titleEn: "Hong Kong",
    riskLevel: "HIGH",
    impactLine: "Hang Seng · 중국 본토 자본의 창구",
    marketLinks: [
      { symbol: "Hang Seng", direction: "watch" },
      { symbol: "USD/CNH", direction: "watch" },
    ],
    paragraphs: [
      "중국·글로벌 자본이 만나는 시장입니다.",
      "규제·지정학 뉴스가 증시·위안 역외 환율을 동시에 흔듭니다.",
    ],
    countryHint: "Hong Kong",
  },
  "taiwan-chip": briefFromMapped(
    "taiwan-chip",
    "대만 · TSMC",
    "Taiwan · TSMC",
    [
      { symbol: "TSM", direction: "down" },
      { symbol: "SOXX", direction: "down" },
      { symbol: "NASDAQ", direction: "down" },
    ],
    ["첨단 로직의 병목. 생산 차질은 IT·자동차·국방 공급망까지 번집니다."],
    "Taiwan",
  ),
  "korea-fab": {
    navId: "korea-fab",
    titleKo: "평택 · 용인",
    titleEn: "Pyeongtaek · Yongin",
    riskLevel: "HIGH",
    impactLine: "세계 메모리·첨단 파운드리 생산의 핵심 축",
    marketLinks: [
      { symbol: "Samsung", direction: "watch" },
      { symbol: "SK Hynix", direction: "watch" },
      { symbol: "SOXX", direction: "watch" },
    ],
    paragraphs: [
      "삼성·SK하이닉스 클러스터가 AI·스마트폰 수요를 떠받칩니다.",
      "설비 투자·전력·지정학 리스크가 업황 사이클보다 먼저 가격에 반영되기도 합니다.",
    ],
    countryHint: "South Korea",
  },
  "arizona-fab": {
    navId: "arizona-fab",
    titleKo: "애리조나 Fab",
    titleEn: "Arizona Fab",
    riskLevel: "HIGH",
    impactLine: "TSMC 미국 온쇼어링 · 공급망 다변화의 상징",
    marketLinks: [
      { symbol: "TSM", direction: "watch" },
      { symbol: "SOXX", direction: "watch" },
    ],
    paragraphs: [
      "미 반도체법과 안보 논리가 공장 부지 위에 겹칩니다.",
      "지연·비용 뉴스가 곧 밸류체인 재배치 기대로 읽힙니다.",
    ],
    countryHint: "United States",
  },
  "kumamoto-fab": {
    navId: "kumamoto-fab",
    titleKo: "구마모토 Fab",
    titleEn: "Kumamoto Fab",
    riskLevel: "HIGH",
    impactLine: "TSMC 일본 · 동북아 반도체 지형의 이동",
    marketLinks: [
      { symbol: "Nikkei", direction: "up" },
      { symbol: "TSM", direction: "watch" },
    ],
    paragraphs: [
      "일본 반도체 르네상스의 현장이자, 대만 리스크 헷지 축입니다.",
      "보조금·인력·용수 이슈가 투자 서사와 함께 움직입니다.",
    ],
    countryHint: "Japan",
  },
  "nova-ai": {
    navId: "nova-ai",
    titleKo: "노스버지니아 AI",
    titleEn: "Northern Virginia AI",
    riskLevel: "HIGH",
    impactLine: "세계 하이퍼스케일·AI 인프라의 밀도 최고 권역",
    marketLinks: [
      { symbol: "NVDA", direction: "up" },
      { symbol: "MSFT", direction: "up" },
      { symbol: "NASDAQ", direction: "watch" },
    ],
    paragraphs: [
      "Ashburn을 축으로 AWS·MS·Google·코로 시설이 밀집합니다.",
      "전력·용수·랜딩 제한이 AI CAPEX 사이클의 병목이 됩니다.",
    ],
    countryHint: "United States",
  },
  "vietnam-mfg": {
    navId: "vietnam-mfg",
    titleKo: "베트남 제조",
    titleEn: "Vietnam Manufacturing",
    riskLevel: "STABLE",
    impactLine: "차이나+1 전자기기·조립의 핵심 이전지",
    marketLinks: [
      { symbol: "VN-Index", direction: "up" },
      { symbol: "USD/VND", direction: "watch" },
    ],
    paragraphs: [
      "스마트폰·가전 공급망이 북부 공단으로 옮겨왔습니다.",
      "미–중 관세·FDI 뉴스가 수출·환율 기대에 바로 붙습니다.",
    ],
    countryHint: "Vietnam",
  },
  "battery-nickel": {
    navId: "battery-nickel",
    titleKo: "인니 니켈 · 배터리",
    titleEn: "Indonesia Nickel · Battery",
    riskLevel: "HIGH",
    impactLine: "EV 배터리 원료·다운스트림의 전략 광상",
    marketLinks: [
      { symbol: "Nickel", direction: "up" },
      { symbol: "EV", direction: "watch" },
    ],
    paragraphs: [
      "니켈 정책·수출 규제가 글로벌 배터리 마진을 흔듭니다.",
      "중국·한국·일본 OEM의 투자 경쟁이 지정학·ESG와 얽힙니다.",
    ],
    countryHint: "Indonesia",
  },
  "fed-dc": {
    navId: "fed-dc",
    titleKo: "연준 · 워싱턴",
    titleEn: "Fed · Washington",
    riskLevel: "CRITICAL",
    impactLine: "FOMC · DXY · 미 국채 — 글로벌 유동성의 스위치",
    marketLinks: [
      { symbol: "DXY", direction: "watch" },
      { symbol: "US10Y", direction: "watch" },
      { symbol: "S&P 500", direction: "watch" },
    ],
    paragraphs: [
      "금리 경로 한 줄이 신흥국·원자재·빅테크 밸류에이션을 동시에 재가격합니다.",
      "지정학 충격도 ‘연준이 어떻게 반응할까’로 재해석됩니다.",
    ],
    countryHint: "United States",
  },
  "ecb-frankfurt": {
    navId: "ecb-frankfurt",
    titleKo: "ECB · 프랑크푸르트",
    titleEn: "ECB · Frankfurt",
    riskLevel: "HIGH",
    impactLine: "유로 정책금리 · Bund — 유럽 성장·에너지의 거울",
    marketLinks: [
      { symbol: "EUR/USD", direction: "watch" },
      { symbol: "Bund", direction: "watch" },
      { symbol: "Stoxx", direction: "watch" },
    ],
    paragraphs: [
      "에너지 쇼크와 분절된 재정정책 사이에서 유로 유동성을 조정합니다.",
      "금리 발언이 바로 EUR와 유럽 증시 베타를 바꿉니다.",
    ],
    countryHint: "Germany",
  },
  "boj-tokyo": {
    navId: "boj-tokyo",
    titleKo: "일본은행 · 도쿄",
    titleEn: "BoJ · Tokyo",
    riskLevel: "HIGH",
    impactLine: "엔화 · YCC — 글로벌 캐리 트레이드의 축",
    marketLinks: [
      { symbol: "USD/JPY", direction: "watch" },
      { symbol: "Nikkei", direction: "watch" },
    ],
    paragraphs: [
      "엔저·정상화 기대가 세계 자산배분을 흔듭니다.",
      "정책 미세조정이 곧 위험자산 변동성으로 전이됩니다.",
    ],
    countryHint: "Japan",
  },
  "pboc-shanghai": {
    navId: "pboc-shanghai",
    titleKo: "인민은행 · 상하이",
    titleEn: "PBOC · Shanghai",
    riskLevel: "HIGH",
    impactLine: "위안 · 신용·부동산 — 중국 수요 사이클의 스위치",
    marketLinks: [
      { symbol: "USD/CNH", direction: "watch" },
      { symbol: "Hang Seng", direction: "watch" },
      { symbol: "CSI 300", direction: "watch" },
    ],
    paragraphs: [
      "유동성·부동산·수출이 동시에 움직이는 정책 허브입니다.",
      "완화·긴축 시그널이 원자재·신흥국 위험선호도를 바꿉니다.",
    ],
    countryHint: "China",
  },
  "chicago-cme": {
    navId: "chicago-cme",
    titleKo: "시카고 · CME",
    titleEn: "Chicago · CME",
    riskLevel: "HIGH",
    impactLine: "곡물·유지 선물 — 글로벌 식량 가격의 기준점",
    marketLinks: [
      { symbol: "Corn", direction: "up" },
      { symbol: "Soy", direction: "up" },
      { symbol: "Wheat", direction: "up" },
    ],
    paragraphs: [
      "기후·전쟁·수출 통제가 시카고 보드에서 숫자로 만납니다.",
      "신흥국 인플레·정치 불안의 조기 지표가 되기도 합니다.",
    ],
    countryHint: "United States",
  },
  "black-sea-grain": briefFromMapped(
    "black-sea-grain",
    "흑해 곡물 회랑",
    "Black Sea Grain Corridor",
    [
      { symbol: "Wheat", direction: "up" },
      { symbol: "Corn", direction: "up" },
      { symbol: "Brent", direction: "watch" },
    ],
    ["오데사–보스포루스 축. 봉쇄는 즉시 밀·옥수수 선물과 북아프리카 식량 안보에 닿습니다."],
    "Ukraine",
  ),
  "pilbara-iron": {
    navId: "pilbara-iron",
    titleKo: "필바라 · 철광",
    titleEn: "Pilbara · Iron Ore",
    riskLevel: "HIGH",
    impactLine: "중국 수요 ↔ 호주 공급 — 철광석 가격의 축",
    marketLinks: [
      { symbol: "Iron Ore", direction: "watch" },
      { symbol: "AUD", direction: "watch" },
      { symbol: "BHP", direction: "watch" },
    ],
    paragraphs: [
      "세계 해상 철광의 핵심 산지입니다.",
      "중국 부동산·조강 뉴스가 곧바로 AUD와 광산주에 반영됩니다.",
    ],
    countryHint: "Australia",
  },
  "chile-copper": {
    navId: "chile-copper",
    titleKo: "칠레 구리",
    titleEn: "Chile Copper",
    riskLevel: "HIGH",
    impactLine: "전력망·EV·AI 인프라를 떠받치는 구리 공급",
    marketLinks: [
      { symbol: "Copper", direction: "up" },
      { symbol: "CLP", direction: "watch" },
    ],
    paragraphs: [
      "세계 구리 생산의 중심지 중 하나입니다.",
      "파업·허가·중국 수요가 녹색 전환 투자 비용을 좌우합니다.",
    ],
    countryHint: "Chile",
  },
  "lithium-aus": {
    navId: "lithium-aus",
    titleKo: "호주 리튬",
    titleEn: "Australia Lithium",
    riskLevel: "HIGH",
    impactLine: "배터리급 리튬 — EV·에너지저장의 원료 병목",
    marketLinks: [
      { symbol: "Lithium", direction: "watch" },
      { symbol: "AUD", direction: "watch" },
      { symbol: "EV", direction: "watch" },
    ],
    paragraphs: [
      "리튬 가격 사이클이 OEM 마진과 광산 CAPEX를 동시에 흔듭니다.",
      "정책·환경 허가도 공급 타이밍 리스크입니다.",
    ],
    countryHint: "Australia",
  },
};

export function resolveEconInsightBrief(navId: string): EconInsightBrief | null {
  return LOCAL[navId] ?? null;
}

/** 순환/랜덤 픽 등 목록 전체가 필요한 곳(예: 주기 브리핑)에서 사용 */
export function allEconInsightBriefs(): EconInsightBrief[] {
  return Object.values(LOCAL);
}

/** navId → countryHint (SOTW macro / 구역 패널) */
export function countryHintForEconNav(navId: string): string | null {
  return LOCAL[navId]?.countryHint ?? null;
}

export function insightRiskToCss(level: InsightRiskLevel): string {
  if (level === "CRITICAL") return "border-rose-500/60 bg-rose-950/80 text-rose-100";
  if (level === "HIGH") return "border-amber-400/55 bg-amber-950/70 text-amber-100";
  return "border-emerald-400/50 bg-emerald-950/70 text-emerald-100";
}
