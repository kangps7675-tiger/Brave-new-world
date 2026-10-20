import type { NewsStreamItem } from "@/lib/news/types";

/** 뉴스 논조 — 카드 드롭다운에서 서로 다른 시각 3종을 고르기 위함 */
export type NewsViewpoint = "bullish" | "bearish" | "macro";

export type TickerRelatedNewsPick = {
  item: NewsStreamItem;
  viewpoint: NewsViewpoint;
};

const BULLISH_RE =
  /\b(rally|surge|soar|gain|gains|record\s?high|bull|rebound|rise|rises|jump|climb|boost|optimistic|recovery|all[\s-]?time\s?high)\b|상승|급등|반등|최고치|낙관|회복/i;

const BEARISH_RE =
  /\b(plunge|crash|slump|fall|falls|drop|drops|fear|sell[\s-]?off|tumble|decline|loss|losses|bear|warning|risk[\s-]?off|recession|default)\b|급락|폭락|하락|공포|매도|경고|침체|리스크/i;

const MACRO_RE =
  /\b(war|sanction|embargo|hormuz|taiwan|strait|strike|missile|conflict|opec|fed\b|ecb|rate\s?cut|rate\s?hike|inflation|gdp|tariff|geopolitic|blockade|shipping|freight|red\s?sea|suez)\b|제재|호르무즈|대만|금리|인플레|관세|지정학|봉쇄|홍해|수에즈|유가|연준/i;

/** 심볼 → 관련 뉴스 매칭 키워드 (영·한) */
export const TICKER_NEWS_KEYWORDS: Record<string, string[]> = {
  "^VIX": ["vix", "fear index", "volatility", "risk-off", "risk off", "공포지수", "변동성"],
  "CL=F": [
    "wti",
    "crude",
    "oil price",
    "oil prices",
    "opec",
    "hormuz",
    "원유",
    "유가",
    "서부텍사스",
  ],
  "BZ=F": ["brent", "crude", "oil price", "opec", "hormuz", "브렌트", "유가", "원유"],
  "GC=F": ["gold", "bullion", "safe haven", "금 가격", "금값", "안전자산"],
  "BTC-USD": ["bitcoin", "btc", "crypto", "cryptocurrency", "비트코인", "암호화폐"],
  "DX-Y.NYB": ["dollar index", "dxy", "us dollar", "greenback", "달러 인덱스", "달러지수"],
  "^GSPC": ["s&p", "s&p 500", "spx", "wall street", "us stocks", "미 증시", "미국 증시"],
  "^IXIC": ["nasdaq", "tech stocks", "magnificent", "나스닥", "기술주"],
  "^N225": ["nikkei", "tokyo stocks", "japan stocks", "니케이", "도쿄 증시", "일본 증시"],
  "^KS11": ["kospi", "seoul stocks", "korea stocks", "코스피", "한국 증시", "서울 증시"],
  "^HSI": ["hang seng", "hong kong stocks", "항셍", "홍콩 증시"],
  "000001.SS": [
    "shanghai",
    "china stocks",
    "csi 300",
    "a-shares",
    "상하이",
    "중국 증시",
    "상해종합",
  ],
};

export function viewpointOfNews(item: NewsStreamItem): NewsViewpoint {
  const blob = `${item.title} ${item.summary ?? ""}`;
  const bull = BULLISH_RE.test(blob);
  const bear = BEARISH_RE.test(blob);
  if (bull && !bear) return "bullish";
  if (bear && !bull) return "bearish";
  if (MACRO_RE.test(blob)) return "macro";
  if (bull) return "bullish";
  if (bear) return "bearish";
  return "macro";
}

export function viewpointLabel(viewpoint: NewsViewpoint, lang: "ko" | "en" = "ko"): string {
  if (lang === "en") {
    if (viewpoint === "bullish") return "Bullish";
    if (viewpoint === "bearish") return "Bearish";
    return "Macro / geo";
  }
  if (viewpoint === "bullish") return "상승·낙관";
  if (viewpoint === "bearish") return "하락·경계";
  return "매크로·지정학";
}

function normalizeSource(source: string): string {
  return source
    .toLowerCase()
    .replace(/\s*·\s*.*$/, "")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .slice(0, 40);
}

function matchesTickerKeywords(item: NewsStreamItem, keywords: string[]): boolean {
  const blob = `${item.title} ${item.summary ?? ""} ${item.source}`.toLowerCase();
  return keywords.some((kw) => blob.includes(kw.toLowerCase()));
}

function recencyScore(pubDate: string): number {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return 0;
  const ageH = Math.max(0, (Date.now() - ts) / 3_600_000);
  return Math.max(0, 72 - ageH);
}

/**
 * 티커 관련 뉴스 중 **서로 다른 시각·출처** 최대 3건.
 * 우선순위: bullish / bearish / macro 슬롯을 채운 뒤, 부족하면 다른 출처로 보충.
 */
export function pickDiverseTickerNews(
  symbol: string,
  pool: NewsStreamItem[],
  limit = 3,
): TickerRelatedNewsPick[] {
  const keywords = TICKER_NEWS_KEYWORDS[symbol];
  if (!keywords?.length || pool.length === 0) return [];

  const candidates = pool
    .filter((item) => matchesTickerKeywords(item, keywords))
    .map((item) => ({
      item,
      viewpoint: viewpointOfNews(item),
      sourceKey: normalizeSource(item.source || item.publisher || "unknown"),
      score: recencyScore(item.pubDate) + (4 - item.trustTier) * 4,
    }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return [];

  const picked: TickerRelatedNewsPick[] = [];
  const usedIds = new Set<string>();
  const usedSources = new Set<string>();
  const usedViews = new Set<NewsViewpoint>();

  const tryTake = (pred: (c: (typeof candidates)[number]) => boolean) => {
    for (const c of candidates) {
      if (usedIds.has(c.item.id)) continue;
      if (!pred(c)) continue;
      picked.push({ item: c.item, viewpoint: c.viewpoint });
      usedIds.add(c.item.id);
      usedSources.add(c.sourceKey);
      usedViews.add(c.viewpoint);
      return true;
    }
    return false;
  };

  // 1) 시각 슬롯을 가능한 한 다르게 채움
  for (const view of ["bullish", "bearish", "macro"] as NewsViewpoint[]) {
    if (picked.length >= limit) break;
    tryTake((c) => c.viewpoint === view && !usedSources.has(c.sourceKey));
  }
  for (const view of ["bullish", "bearish", "macro"] as NewsViewpoint[]) {
    if (picked.length >= limit) break;
    if (usedViews.has(view)) continue;
    tryTake((c) => c.viewpoint === view);
  }

  // 2) 부족한 칸은 다른 출처 우선으로 보충
  while (picked.length < limit) {
    if (!tryTake((c) => !usedSources.has(c.sourceKey))) break;
  }
  while (picked.length < limit) {
    if (!tryTake(() => true)) break;
  }

  return picked.slice(0, limit);
}
