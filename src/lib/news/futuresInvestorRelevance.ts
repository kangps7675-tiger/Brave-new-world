/**
 * 선물·매크로 투자자 페르소나 — 뉴스 관련도 점수.
 * 유가·금리·환율·운임·초크·거시 뉴스가 테크 헤드라인보다 위로 오게.
 */

import { isChokepointEconomyNews } from "@/lib/news/chokepointNews";
import type { NewsStreamItem } from "@/lib/news/types";

/** 높을수록 우선 (sort에서 내림차순) */
const GENRE_BOOST: Record<string, number> = {
  energy: 100,
  macro: 95,
  shipping: 90,
  markets: 70,
  infra: 35,
  chips: 20,
  tech: 8,
  auto: 12,
};

/**
 * 유가·금리·환율·곡물·귀금속·운임·중앙은행 — 선물 데스크 키워드.
 * (제목·요약 매칭용, 표시 카피용 아님)
 */
const FUTURES_DESK_RE =
  /\b(?:wti|brent|crude|oil|lng|nat(?:ural)?\s?gas|opec|gasoline|diesel|heating\s?oil)\b|\b(?:fed|fomc|ecb|boj|bok|pboc|cpi|ppi|pce|inflation|yield|treasury|t-?note|t-?bill|rate\s?(?:cut|hike|hold|decision)|federal\s?funds)\b|\b(?:dxy|dollar\s?index|eur(?:usd)?|usdjpy|usd\/?krw|fx\s?volatil|currency)\b|\b(?:gold|silver|copper|wheat|corn|soy)\b|\b(?:freight|baltic|bdi|tanker|vlcc|dry\s?bulk|container\s?rate|shipping\s?rate)\b|\b(?:hormuz|suez|malacca|red\s?sea|bab[\s-]?el|bosporus|chokepoint)\b|유가|원유|브렌트|천연가스|연준|금리|물가|국채|환율|달러지수|금\b|은\b|구리|소맥|운임|발틱|호르무즈|수에즈|말라카|홍해/i;

/** 테크·연예성 노이즈 — 약하게 내림 */
const FUTURES_NOISE_RE =
  /\b(?:iphone|celebrity|box\s?office|streaming\s?war|app\s?store|meme\s?stock)\b|아이폰|연예|박스오피스/i;

/**
 * 0~약 160. preferEconomy 피드에서 theater 가점 다음에 사용.
 * conflict 피드에서는 oil/shipping/choke만 약한 가점.
 */
export function futuresInvestorRelevance(
  item: NewsStreamItem,
  mode: "economy" | "conflict" = "economy",
): number {
  const blob = `${item.title} ${item.summary ?? ""} ${item.category ?? ""}`;
  let score = 0;

  if (mode === "economy") {
    score += GENRE_BOOST[item.econGenre ?? ""] ?? 0;
    if (FUTURES_DESK_RE.test(blob)) score += 55;
    if (isChokepointEconomyNews(blob)) score += 40;
    if (item.feedTopic === "economy") score += 10;
    if (FUTURES_NOISE_RE.test(blob)) score -= 25;
  } else {
    // 지정학에서도 에너지·해운·초크는 선물 데스크 관심사
    if (FUTURES_DESK_RE.test(blob)) score += 28;
    if (isChokepointEconomyNews(blob)) score += 22;
    if (item.econGenre === "energy" || item.econGenre === "shipping") score += 15;
  }

  return score;
}
