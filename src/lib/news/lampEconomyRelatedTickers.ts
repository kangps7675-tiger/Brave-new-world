/**
 * 지경학 등불 — 뉴스에 묶인 관련 기업·지표 심볼 (시세판용).
 * Yahoo 카탈로그(`STOCK_TICKER_SYMBOLS`)에 있는 것만. 해석용 · 투자 권유 아님.
 */

import type { LampFeaturedNews } from "@/lib/news/periodicBriefing";
import { STOCK_TICKER_SYMBOLS } from "@/lib/stockTickers";
import {
  theaterAssetSymbols,
  type TheaterMarketFilter,
} from "@/lib/theaterAssets";

/** 엔티티 id → Yahoo 심볼 (카탈로그에 있는 것만) */
const ENTITY_TO_SYMBOLS: Record<string, string[]> = {
  nvidia: ["NVDA", "SMH"],
  apple: ["AAPL"],
  microsoft: ["MSFT"],
  google: ["GOOGL"],
  amazon: ["AMZN"],
  meta: ["META"],
  intel: ["SMH"],
  tesla: ["^GSPC", "^IXIC"],
  exxon: ["XOM", "XLE", "CL=F"],
  chevron: ["CVX", "XLE", "CL=F"],
  fed: ["^TNX", "^IRX", "DX-Y.NYB", "^GSPC"],
  jpmorgan: ["JPM", "^GSPC"],
  goldman: ["^GSPC", "^TNX"],
  blackrock: ["^GSPC"],
  china: ["000001.SS", "^HSI", "CNY=X"],
  huawei: ["SMH", "000001.SS"],
  alibaba: ["^HSI", "000001.SS"],
  tencent: ["^HSI"],
  bytedance: ["^HSI", "^IXIC"],
  smic: ["SMH", "000001.SS"],
  catl: ["000001.SS", "HG=F"],
  byd: ["000001.SS"],
  xiaomi: ["^HSI"],
  pboc: ["CNY=X", "000001.SS"],
  nio: ["^HSI", "^IXIC"],
  ecb: ["EURUSD=X", "^STOXX50E", "^TNX"],
  eu: ["EURUSD=X", "^STOXX50E", "^GDAXI"],
  siemens: ["^GDAXI"],
  sap: ["^GDAXI"],
  lvmh: ["^FCHI"],
  vw: ["^GDAXI"],
  total: ["XLE", "BZ=F", "CL=F"],
  bp: ["XLE", "BZ=F"],
  shell: ["XLE", "BZ=F", "CL=F"],
  asml: ["ASML", "SMH"],
  deutschebank: ["^GDAXI", "EURUSD=X"],
  russia: ["BZ=F", "NG=F", "GC=F", "^VIX"],
  gazprom: ["NG=F", "BZ=F"],
  rosneft: ["BZ=F", "CL=F"],
  cbr: ["GC=F", "^VIX"],
  korea: ["005930.KS", "000660.KS", "^KS11", "KRW=X"],
  japan: ["^N225", "JPY=X", "SMH"],
  samsung: ["005930.KS", "SMH", "000660.KS"],
  skhynix: ["000660.KS", "SMH", "005930.KS"],
  hyundai: ["^KS11", "KRW=X"],
  bok: ["KRW=X", "^KS11", "^TNX"],
  toyota: ["^N225", "JPY=X"],
  softbank: ["^N225", "^IXIC"],
  sony: ["^N225"],
  boj: ["JPY=X", "^N225", "^TNX"],
  taiwan: ["TSM", "^TWII", "SMH"],
  tsmc: ["TSM", "SMH", "^TWII"],
  india: ["^NSEI"],
  asean: ["^HSI", "CL=F", "BDRY"],
  aramco: ["CL=F", "BZ=F", "XLE"],
  saudi: ["CL=F", "BZ=F", "GC=F"],
  adnoc: ["CL=F", "BZ=F"],
  imf: ["DX-Y.NYB", "^GSPC", "GC=F"],
  opec: ["CL=F", "BZ=F", "XLE"],
};

/** 제목·요약에서 엔티티를 잡을 정규식 (MARKET_FOCUS_ENTITIES와 동일 축) */
const ENTITY_DETECT: Array<{ id: string; re: RegExp }> = [
  { id: "nvidia", re: /\bnvidia\b|\b엔비디아\b/i },
  { id: "apple", re: /\bapple\b|\b애플\b/i },
  { id: "microsoft", re: /\bmicrosoft\b|\bmsft\b|\b마이크로소프트\b/i },
  { id: "google", re: /\bgoogle\b|\balphabet\b|\b구글\b|\b알파벳\b/i },
  { id: "amazon", re: /\bamazon\b|\bamzn\b|\b아마존\b/i },
  { id: "meta", re: /\bmeta\b|\bfacebook\b|\b메타\b/i },
  { id: "intel", re: /\bintel\b|\b인텔\b/i },
  { id: "tesla", re: /\btesla\b|\b테슬라\b/i },
  { id: "exxon", re: /\bexxon\b|\b엑손\b/i },
  { id: "chevron", re: /\bchevron\b|\b셰브론\b/i },
  { id: "fed", re: /\bfederal reserve\b|\bfed\b|\bjerome powell\b|\b연준\b|\b파월\b/i },
  { id: "jpmorgan", re: /\bjpmorgan\b|\bjp morgan\b|\bjpm\b/i },
  { id: "goldman", re: /\bgoldman\b|\b골드만\b/i },
  { id: "blackrock", re: /\bblackrock\b|\b블랙록\b/i },
  { id: "huawei", re: /\bhuawei\b|\b화웨이\b/i },
  { id: "alibaba", re: /\balibaba\b|\b알리바바\b/i },
  { id: "tencent", re: /\btencent\b|\b텐센트\b/i },
  { id: "bytedance", re: /\bbytedance\b|\btiktok\b|\b바이트댄스\b|\b틱톡\b/i },
  { id: "smic", re: /\bsmic\b/i },
  { id: "catl", re: /\bcatl\b/i },
  { id: "byd", re: /\bbyd\b/i },
  { id: "xiaomi", re: /\bxiaomi\b|\b샤오미\b/i },
  { id: "pboc", re: /\bpboc\b|\bpeople'?s bank of china\b|\b인민은행\b/i },
  { id: "nio", re: /\bnio\b|\b니오\b/i },
  { id: "china", re: /\bchina\b|\bchinese\b|\bbeijing\b|\b중국\b|\b베이징\b/i },
  { id: "ecb", re: /\becb\b|\beuropean central bank\b|\blagarde\b|\b유럽중앙은행\b|\b라가르드\b/i },
  { id: "asml", re: /\basml\b/i },
  { id: "siemens", re: /\bsiemens\b|\b지멘스\b/i },
  { id: "sap", re: /\bsap\b/i },
  { id: "lvmh", re: /\blvmh\b|\blouis vuitton\b/i },
  { id: "vw", re: /\bvolkswagen\b|\bvw\b|\b폭스바겐\b/i },
  { id: "total", re: /\btotalenergies\b/i },
  { id: "bp", re: /\bbp\b|\bbritish petroleum\b/i },
  { id: "shell", re: /\bshell\b/i },
  { id: "deutschebank", re: /\bdeutsche bank\b|\b도이치은행\b/i },
  { id: "eu", re: /\beurozone\b|\beuropean union\b|\beu commission\b|\b유럽연합\b|\b유로존\b/i },
  { id: "gazprom", re: /\bgazprom\b|\b가즈프롬\b/i },
  { id: "rosneft", re: /\brosneft\b|\b로스네프트\b/i },
  { id: "cbr", re: /\bcentral bank of russia\b|\bcbr\b|\bruble\b|\b루블\b/i },
  { id: "russia", re: /\brussia\b|\brussian\b|\bmoscow\b|\bkremlin\b|\b러시아\b|\b모스크바\b|\b크렘린\b/i },
  { id: "samsung", re: /\bsamsung\b|\b삼성\b/i },
  { id: "skhynix", re: /\bhynix\b|\b하이닉스\b/i },
  { id: "hyundai", re: /\bhyundai\b|\b현대차\b|\b현대자동차\b/i },
  { id: "bok", re: /\bbank of korea\b|\bbok\b|\b한국은행\b/i },
  { id: "korea", re: /\bkorea\b|\bkorean\b|\bseoul\b|\bsouth korea\b|\b한국\b|\b서울\b|\b대한민국\b/i },
  { id: "toyota", re: /\btoyota\b|\b토요타\b|\b도요타\b/i },
  { id: "softbank", re: /\bsoftbank\b|\b소프트뱅크\b/i },
  { id: "sony", re: /\bsony\b|\b소니\b/i },
  { id: "boj", re: /\bbank of japan\b|\bboj\b|\b일본은행\b/i },
  { id: "japan", re: /\bjapan\b|\bjapanese\b|\btokyo\b|\b일본\b|\b도쿄\b/i },
  { id: "tsmc", re: /\btsmc\b|\btaiwan semiconductor\b|\b대만반도체\b/i },
  { id: "taiwan", re: /\btaiwan\b|\btaipei\b|\b대만\b|\b타이베이\b/i },
  { id: "india", re: /\bindia\b|\bindian\b|\bmodi\b|\bmumbai\b|\b인도\b|\b모디\b/i },
  { id: "asean", re: /\basean\b|\bindonesia\b|\bvietnam\b|\bthailand\b|\bmalaysia\b|\bphilippines\b|\bsingapore\b|\b아세안\b|\b인도네시아\b|\b베트남\b/i },
  { id: "aramco", re: /\baramco\b|\b아람코\b/i },
  { id: "saudi", re: /\bsaudi\b|\briyadh\b|\bvision\s?2030\b|\b사우디\b|\b리야드\b/i },
  { id: "adnoc", re: /\badnoc\b|\bu\.?a\.?e\.?\b|\bdubai\b|\babu\s?dhabi\b|\b아랍에미리트\b|\b두바이\b/i },
  { id: "imf", re: /\bimf\b|\binternational monetary fund\b/i },
  { id: "opec", re: /\bopec\b/i },
];

const GENRE_SYMBOLS: Record<string, string[]> = {
  shipping: ["FRO", "ZIM", "STNG", "BDRY", "CL=F"],
  energy: ["CL=F", "BZ=F", "NG=F", "XLE", "XOM"],
  markets: ["^GSPC", "^IXIC", "^VIX", "^TNX", "DX-Y.NYB"],
  fx: ["KRW=X", "JPY=X", "CNY=X", "EURUSD=X", "DX-Y.NYB"],
  semis: ["SMH", "TSM", "NVDA", "ASML", "005930.KS", "000660.KS"],
};

const FALLBACK_SYMBOLS = ["^VIX", "CL=F", "^GSPC", "KRW=X", "SMH", "005930.KS"];

const CATALOG = new Set(STOCK_TICKER_SYMBOLS.map((s) => s.symbol));

const THEATER_FILTERS = new Set<string>([
  "middle-east",
  "russia-ukraine",
  "china-taiwan",
  "korea",
  "japan",
  "south-asia",
  "southeast-asia",
  "south-america",
  "africa",
  "arctic",
  "atlantic",
  "global",
]);

function pushUnique(out: string[], symbol: string, limit: number): void {
  if (out.length >= limit) return;
  if (!CATALOG.has(symbol)) return;
  if (out.includes(symbol)) return;
  out.push(symbol);
}

function symbolsFromBlob(blob: string, out: string[], limit: number): void {
  for (const { id, re } of ENTITY_DETECT) {
    if (out.length >= limit) break;
    if (!re.test(blob)) continue;
    for (const sym of ENTITY_TO_SYMBOLS[id] ?? []) {
      pushUnique(out, sym, limit);
    }
  }
}

/**
 * 지경학 등불 뉴스에서 관련 시세 심볼을 고른다.
 * 우선순위: 기사 엔티티 → 장르 → 전장 매크로 → 글로벌 폴백.
 */
export function pickEconomyLampRelatedSymbols(
  news: LampFeaturedNews[],
  limit = 8,
): string[] {
  const out: string[] = [];
  const target = Math.max(4, Math.min(limit, 10));

  for (const item of news) {
    if (out.length >= target) break;
    const blob = `${item.title} ${item.summary} ${item.focusLabel ?? ""}`;
    symbolsFromBlob(blob, out, target);
  }

  for (const item of news) {
    if (out.length >= target) break;
    const genre = (item.econGenre ?? "").toLowerCase().trim();
    if (!genre) continue;
    const syms = GENRE_SYMBOLS[genre];
    if (syms) {
      for (const sym of syms) pushUnique(out, sym, target);
      continue;
    }
    for (const [key, list] of Object.entries(GENRE_SYMBOLS)) {
      if (!genre.includes(key)) continue;
      for (const sym of list) pushUnique(out, sym, target);
    }
  }

  for (const item of news) {
    if (out.length >= target) break;
    const theater = item.theater?.trim();
    if (!theater || !THEATER_FILTERS.has(theater)) continue;
    for (const sym of theaterAssetSymbols(theater as TheaterMarketFilter, "economy")) {
      pushUnique(out, sym, target);
    }
  }

  for (const sym of FALLBACK_SYMBOLS) {
    pushUnique(out, sym, target);
  }

  return out;
}
