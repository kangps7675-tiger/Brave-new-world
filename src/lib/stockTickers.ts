import {
  theaterAssetNote,
  theaterAssetSymbols,
  type TheaterMarketFilter,
} from "@/lib/theaterAssets";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type { TheaterMarketFilter } from "@/lib/theaterAssets";
export {
  THEATER_ASSETS,
  theaterAssetNote,
  theaterAssetSymbols,
  theaterPrimarySymbols,
  yahooQuoteUrl,
  tradingViewSymbolUrl,
} from "@/lib/theaterAssets";

export type StockTickerSymbol = {
  symbol: string;
  label: string;
};

export type StockTickerItem = {
  symbol: string;
  label: string;
  price: number | null;
  /**
   * 전 영업일(또는 직전 관측) 대비 등락 %.
   * Yahoo·FRED·해운 프록시 모두 같은 기준 — 장중 순간 변동이 아님.
   */
  changePercent: number | null;
  /** 등락 기준 — 항상 전일(직전 관측) 대비 */
  changeBasis?: "prev-day";
  /** 관측일 YYYY-MM-DD (FRED 등 일간 소스) */
  asOf?: string | null;
  /** 최근 일봉 종가 — 전일대비 추세 스파크라인 */
  sparkline: number[];
};

/** 특정 사건(뉴스) 발생 시점 대비 지금까지의 가격 변동 — "사건-종목 연결" 카드용 */
export type MarketReactionItem = {
  symbol: string;
  priceAt: number | null;
  priceNow: number | null;
  changePercentSinceEvent: number | null;
  /** 벤치마크(S&P500) 동일구간 변동을 뺀 초과 변동 — 시장 전체 흐름과 사건 반응을 분리 */
  excessChangePercent?: number | null;
  /** 평소 일간 변동폭(σ) 대비 몇 배로 움직였나 — 판정의 핵심 수치 */
  sigma?: number | null;
};

/**
 * 사건이 시장에 영향을 줬는지에 대한 판정.
 * - impact: 2σ 이상 — 뚜렷한 반응
 * - mild: 1~2σ — 약한 반응
 * - none: 1σ 미만 — 평소 변동 범위(= 영향 없음)
 * - pending: 장 마감·데이터 부족으로 아직 판정 불가
 */
export type MarketReactionVerdict = "impact" | "mild" | "none" | "pending";

/** 이 값 이상이면 "뚜렷한 반응" — 알림 푸시 임계값이기도 하다 */
export const REACTION_IMPACT_SIGMA = 2;
export const REACTION_MILD_SIGMA = 1;

export function verdictFromSigma(
  sigma: number | null | undefined,
  marketOpen: boolean,
): MarketReactionVerdict {
  if (sigma == null || !Number.isFinite(sigma)) return "pending";
  // 장이 닫혀 있는데 거의 안 움직인 건 "영향 없음"이 아니라 "아직 모름"
  if (!marketOpen && Math.abs(sigma) < REACTION_MILD_SIGMA) return "pending";
  const abs = Math.abs(sigma);
  if (abs >= REACTION_IMPACT_SIGMA) return "impact";
  if (abs >= REACTION_MILD_SIGMA) return "mild";
  return "none";
}

export function verdictLabel(verdict: MarketReactionVerdict, ko: boolean): string {
  if (verdict === "impact") return ko ? "시장 반응 확인됨" : "Market reacted";
  if (verdict === "mild") return ko ? "약한 반응" : "Mild reaction";
  if (verdict === "none") return ko ? "시장은 반응하지 않음" : "No market reaction";
  return ko ? "판정 대기 (장 마감)" : "Pending (market closed)";
}

/**
 * Yahoo 심볼 → 사람이 읽는 이름 (CL=F → WTI 원유 등).
 * UI는 심볼 대신 이 이름을 쓰고, 심볼은 title/링크에만 둡니다.
 */
export const TICKER_DISPLAY_NAMES: Record<string, { ko: string; en: string }> = {
  "^VIX": { ko: "VIX 공포지수", en: "VIX Fear Index" },
  "CL=F": { ko: "WTI 원유", en: "WTI crude" },
  "BZ=F": { ko: "브렌트유 선물", en: "Brent Crude" },
  "NG=F": { ko: "천연가스 선물", en: "Natural Gas" },
  "ZW=F": { ko: "밀 선물", en: "Wheat Futures" },
  "ZC=F": { ko: "옥수수 선물", en: "Corn Futures" },
  "GC=F": { ko: "금 선물", en: "Gold Futures" },
  "SI=F": { ko: "은 선물", en: "Silver Futures" },
  "HG=F": { ko: "구리 선물", en: "Copper Futures" },
  SMH: { ko: "반도체 ETF (SMH)", en: "Semiconductor ETF (SMH)" },
  TSM: { ko: "TSMC ADR", en: "TSMC ADR" },
  NVDA: { ko: "엔비디아", en: "NVIDIA" },
  ASML: { ko: "ASML", en: "ASML" },
  XLE: { ko: "에너지 섹터 ETF", en: "Energy Select ETF" },
  ITA: { ko: "방산 ETF (ITA)", en: "Aerospace & Defense ETF" },
  AAPL: { ko: "애플", en: "Apple" },
  MSFT: { ko: "마이크로소프트", en: "Microsoft" },
  GOOGL: { ko: "알파벳", en: "Alphabet" },
  AMZN: { ko: "아마존", en: "Amazon" },
  META: { ko: "메타", en: "Meta" },
  JPM: { ko: "JP모건", en: "JPMorgan" },
  XOM: { ko: "엑슨모빌", en: "ExxonMobil" },
  CVX: { ko: "셰브론", en: "Chevron" },
  FRO: { ko: "프론트라인 (탱커)", en: "Frontline (tankers)" },
  ZIM: { ko: "짐 통합해운", en: "ZIM Integrated" },
  STNG: { ko: "스콜피오 탱커스", en: "Scorpio Tankers" },
  DAL: { ko: "델타항공", en: "Delta Air Lines" },
  UAL: { ko: "유나이티드항공", en: "United Airlines" },
  LUV: { ko: "사우스웨스트항공", en: "Southwest Airlines" },
  JETS: { ko: "항공 ETF (JETS)", en: "Airlines ETF (JETS)" },
  LMT: { ko: "록히드마틴", en: "Lockheed Martin" },
  RTX: { ko: "RTX", en: "RTX" },
  NOC: { ko: "노스롭그루먼", en: "Northrop Grumman" },
  GD: { ko: "제너럴 다이내믹스", en: "General Dynamics" },
  "005930.KS": { ko: "삼성전자", en: "Samsung Electronics" },
  "000660.KS": { ko: "SK하이닉스", en: "SK hynix" },
  "BTC-USD": { ko: "비트코인", en: "Bitcoin" },
  "ETH-USD": { ko: "이더리움", en: "Ethereum" },
  "DX-Y.NYB": { ko: "달러 인덱스", en: "US Dollar Index" },
  "KRW=X": { ko: "원/달러 환율", en: "USD/KRW" },
  "JPY=X": { ko: "엔/달러 환율", en: "USD/JPY" },
  "CNY=X": { ko: "위안/달러 환율", en: "USD/CNY" },
  "EURUSD=X": { ko: "유로/달러", en: "EUR/USD" },
  "^IRX": { ko: "미 단기금리 (13주)", en: "US 13W T-bill" },
  "^FVX": { ko: "미 5년물 금리", en: "US 5Y Yield" },
  "^TNX": { ko: "미 10년물 금리", en: "US 10Y Yield" },
  "^TYX": { ko: "미 30년물 금리", en: "US 30Y Yield" },
  FEDFUNDS: { ko: "미 연준 기준금리(실효)", en: "Fed funds (effective)" },
  "^GSPC": { ko: "S&P 500", en: "S&P 500" },
  "^IXIC": { ko: "나스닥", en: "Nasdaq Composite" },
  "^DJI": { ko: "다우존스", en: "Dow Jones" },
  "^RUT": { ko: "러셀 2000", en: "Russell 2000" },
  "^N225": { ko: "니케이 225", en: "Nikkei 225" },
  "^KS11": { ko: "코스피", en: "KOSPI" },
  "^KQ11": { ko: "코스닥", en: "KOSDAQ" },
  "^HSI": { ko: "항셍지수", en: "Hang Seng" },
  "000001.SS": { ko: "상하이종합", en: "Shanghai Composite" },
  "^TWII": { ko: "대만 가권", en: "Taiwan Weighted" },
  "^NSEI": { ko: "니프티 50", en: "Nifty 50" },
  "^AXJO": { ko: "호주 ASX 200", en: "ASX 200" },
  "^FTSE": { ko: "FTSE 100", en: "FTSE 100" },
  "^GDAXI": { ko: "DAX", en: "DAX" },
  "^FCHI": { ko: "CAC 40", en: "CAC 40" },
  "^STOXX50E": { ko: "유로 STOXX 50", en: "Euro Stoxx 50" },
  "^BVSP": { ko: "브라질 보베스파", en: "Bovespa" },
  BDRY: { ko: "건화물 운임 ETF", en: "Dry Bulk Shipping ETF" },
};

/**
 * Yahoo Finance — 가격 폴링 소스 (API 키 없음).
 * 등락%는 전 영업일 종가 대비로 통일. 원자재·달러는 FRED가 있으면 일간 관측으로 보완.
 * label은 영문 짧은 표기(API 기본값). UI는 tickerDisplayName() 사용.
 * @see `/api/stock-tickers` · `yahoo-finance2` · `fred.ts`
 */
export const STOCK_TICKER_SYMBOLS: StockTickerSymbol[] = [
  { symbol: "^VIX", label: "VIX Fear Index" },
  { symbol: "CL=F", label: "WTI crude" },
  { symbol: "BZ=F", label: "Brent Crude" },
  { symbol: "NG=F", label: "Natural Gas" },
  { symbol: "ZW=F", label: "Wheat Futures" },
  { symbol: "ZC=F", label: "Corn Futures" },
  { symbol: "GC=F", label: "Gold Futures" },
  { symbol: "SI=F", label: "Silver Futures" },
  { symbol: "HG=F", label: "Copper Futures" },
  { symbol: "SMH", label: "VanEck Semiconductor ETF" },
  { symbol: "TSM", label: "TSMC ADR" },
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "ASML", label: "ASML" },
  { symbol: "XLE", label: "Energy Select Sector ETF" },
  { symbol: "ITA", label: "iShares U.S. Aerospace & Defense ETF" },
  { symbol: "AAPL", label: "Apple" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "GOOGL", label: "Alphabet" },
  { symbol: "AMZN", label: "Amazon" },
  { symbol: "META", label: "Meta" },
  { symbol: "JPM", label: "JPMorgan" },
  { symbol: "XOM", label: "ExxonMobil" },
  { symbol: "CVX", label: "Chevron" },
  { symbol: "FRO", label: "Frontline" },
  { symbol: "ZIM", label: "ZIM Integrated Shipping" },
  { symbol: "STNG", label: "Scorpio Tankers" },
  { symbol: "DAL", label: "Delta Air Lines" },
  { symbol: "UAL", label: "United Airlines" },
  { symbol: "LUV", label: "Southwest Airlines" },
  { symbol: "JETS", label: "U.S. Global Jets ETF" },
  { symbol: "LMT", label: "Lockheed Martin" },
  { symbol: "RTX", label: "RTX" },
  { symbol: "NOC", label: "Northrop Grumman" },
  { symbol: "GD", label: "General Dynamics" },
  { symbol: "005930.KS", label: "Samsung Electronics" },
  { symbol: "000660.KS", label: "SK hynix" },
  { symbol: "BTC-USD", label: "Bitcoin" },
  { symbol: "ETH-USD", label: "Ethereum" },
  { symbol: "DX-Y.NYB", label: "US Dollar Index" },
  { symbol: "KRW=X", label: "USD/KRW" },
  { symbol: "JPY=X", label: "USD/JPY" },
  { symbol: "CNY=X", label: "USD/CNY" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "^IRX", label: "US 13W T-bill" },
  { symbol: "^FVX", label: "US 5Y Yield" },
  { symbol: "^TNX", label: "US 10Y Yield" },
  { symbol: "^TYX", label: "US 30Y Yield" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^N225", label: "Nikkei 225" },
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^KQ11", label: "KOSDAQ" },
  { symbol: "^HSI", label: "Hang Seng" },
  { symbol: "000001.SS", label: "Shanghai Composite" },
  { symbol: "^TWII", label: "Taiwan Weighted" },
  { symbol: "^NSEI", label: "Nifty 50" },
  { symbol: "^AXJO", label: "ASX 200" },
  { symbol: "^FTSE", label: "FTSE 100" },
  { symbol: "^GDAXI", label: "DAX" },
  { symbol: "^FCHI", label: "CAC 40" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50" },
  { symbol: "^BVSP", label: "Bovespa" },
  { symbol: "BDRY", label: "Dry Bulk Shipping ETF" },
];

/** Yahoo 심볼을 한글/영문 표시명으로. 없으면 기존 label·심볼 정제. */
export function tickerDisplayName(
  symbol: string,
  lang: LabelLanguage = "ko",
): string {
  const named = TICKER_DISPLAY_NAMES[symbol];
  if (named) return lang === "en" ? named.en : named.ko;
  const fallback = STOCK_TICKER_SYMBOLS.find((entry) => entry.symbol === symbol)?.label;
  if (fallback) return fallback;
  return symbol.replace(/^\^/, "").replace(/=F$/, "");
}

/** 하단 스크롤 스트립 — 매크로·환율·금리·에너지 (전장 primary는 mergeTickerStripSymbols로 앞에 붙임) */
export const TICKER_STRIP_SYMBOLS: string[] = [
  "^VIX",
  "KRW=X",
  "EURUSD=X",
  "^TNX",
  "^IRX",
  "CL=F",
  "BZ=F",
  "NG=F",
  "GC=F",
  "BTC-USD",
  "DX-Y.NYB",
  "^GSPC",
  "^IXIC",
];

/**
 * 전역 코어 스트립 + 전장 primary를 merge.
 * highlight에만 있는 심볼(곡물·반도체 등)도 앞에 넣어 화면에 보이게 한다.
 */
export function mergeTickerStripSymbols(highlightSymbols: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of highlightSymbols) {
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  for (const symbol of TICKER_STRIP_SYMBOLS) {
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  return out;
}

export type MarketGroupId =
  | "fx-rates"
  | "risk"
  | "commodities"
  | "crypto"
  | "us-equities"
  | "asia"
  | "europe";

export const MARKET_GROUPS: Array<{
  id: MarketGroupId;
  label: string;
  labelEn: string;
  symbols: string[];
}> = [
  {
    id: "fx-rates",
    label: "환율 · 금리",
    labelEn: "FX · Rates",
    symbols: [
      "KRW=X",
      "EURUSD=X",
      "JPY=X",
      "CNY=X",
      "^IRX",
      "^FVX",
      "^TNX",
      "^TYX",
      "FEDFUNDS",
    ],
  },
  {
    id: "risk",
    label: "리스크 · 달러",
    labelEn: "Risk · Dollar",
    symbols: ["^VIX", "DX-Y.NYB"],
  },
  {
    id: "commodities",
    label: "에너지 · 곡물 · 금속",
    labelEn: "Energy · Grains · Metals",
    symbols: ["CL=F", "BZ=F", "NG=F", "ZW=F", "ZC=F", "GC=F", "SI=F", "HG=F"],
  },
  {
    id: "crypto",
    label: "암호화폐",
    labelEn: "Crypto",
    symbols: ["BTC-USD", "ETH-USD"],
  },
  {
    id: "us-equities",
    label: "미국 · 미주",
    labelEn: "US · Americas",
    symbols: ["^GSPC", "^IXIC", "^DJI", "^RUT", "^BVSP", "SMH", "NVDA", "XLE", "ITA"],
  },
  {
    id: "asia",
    label: "아시아 · 태평양",
    labelEn: "Asia · Pacific",
    symbols: [
      "^N225",
      "^KS11",
      "^KQ11",
      "^HSI",
      "000001.SS",
      "^TWII",
      "^NSEI",
      "^AXJO",
      "TSM",
      "005930.KS",
      "000660.KS",
    ],
  },
  {
    id: "europe",
    label: "유럽 · 해운",
    labelEn: "Europe · Shipping",
    symbols: ["^FTSE", "^GDAXI", "^FCHI", "^STOXX50E", "ASML", "BDRY"],
  },
];

/**
 * Yahoo에 없는 FRED 전용 심볼 — 연준 실효금리 등.
 * Yahoo 배치에 넣으면 전체 quote가 깨질 수 있어 따로 합친다.
 * (한은 기준금리·국고채 3년은 ECOS 키 연동 전까지 보류)
 */
export const FRED_ONLY_TICKER_SYMBOLS: StockTickerSymbol[] = [
  { symbol: "FEDFUNDS", label: "Fed funds (effective)" },
];

export function formatTickerPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 10_000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(2);
}

export function formatTickerChangePercent(
  changePercent: number | null,
  options?: { lang?: LabelLanguage; withBasis?: boolean },
): string {
  if (changePercent === null) return "—";
  const sign = changePercent > 0 ? "+" : "";
  const pct = `${sign}${changePercent.toFixed(1)}%`;
  if (!options?.withBasis) return pct;
  return options.lang === "en" ? `${pct} d/d` : `전일 ${pct}`;
}

export function tickerChangeTone(changePercent: number | null): "up" | "down" | "flat" {
  if (changePercent === null || Math.abs(changePercent) < 0.05) return "flat";
  return changePercent > 0 ? "up" : "down";
}

/** @deprecated Prefer theaterAssetSymbols — kept for existing imports */
export const THEATER_RELATED_SYMBOLS: Record<TheaterMarketFilter, string[]> = {
  all: theaterAssetSymbols("all"),
  "middle-east": theaterAssetSymbols("middle-east"),
  "russia-ukraine": theaterAssetSymbols("russia-ukraine"),
  "china-taiwan": theaterAssetSymbols("china-taiwan"),
  korea: theaterAssetSymbols("korea"),
  japan: theaterAssetSymbols("japan"),
  "south-asia": theaterAssetSymbols("south-asia"),
  "southeast-asia": theaterAssetSymbols("southeast-asia"),
  "south-america": theaterAssetSymbols("south-america"),
  africa: theaterAssetSymbols("africa"),
  arctic: theaterAssetSymbols("arctic"),
  atlantic: theaterAssetSymbols("atlantic"),
  global: theaterAssetSymbols("global"),
};

export function pickRelatedTickers(
  all: StockTickerItem[],
  filter: TheaterMarketFilter,
): StockTickerItem[] {
  const order = theaterAssetSymbols(filter);
  const bySymbol = new Map(all.map((t) => [t.symbol, t]));
  return order.map((symbol) => bySymbol.get(symbol)).filter((t): t is StockTickerItem => t != null);
}

export function theaterMarketBlurb(filter: TheaterMarketFilter): string {
  return theaterAssetNote(filter, "ko");
}
