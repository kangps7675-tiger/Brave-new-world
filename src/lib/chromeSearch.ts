import Fuse from "fuse.js";
import type { SearchPlace } from "@/data/geoTypes";
import type { NewsStreamItem } from "@/lib/news/types";

export type ChromeSearchPlaceHit = {
  kind: "place";
  place: SearchPlace;
  score: number;
};

export type ChromeSearchNewsHit = {
  kind: "news";
  article: NewsStreamItem;
  score: number;
};

export type ChromeSearchHit = ChromeSearchPlaceHit | ChromeSearchNewsHit;

export type ChromeKeywordSuggestion = {
  keyword: string;
  count: number;
};

const PLACE_KEYS = [
  { name: "name", weight: 0.45 },
  { name: "nameKo", weight: 0.4 },
  { name: "country", weight: 0.1 },
  { name: "type", weight: 0.05 },
] as const;

const NEWS_KEYS = [
  { name: "title", weight: 0.55 },
  { name: "summary", weight: 0.25 },
  { name: "source", weight: 0.12 },
  { name: "publisher", weight: 0.05 },
  { name: "theater", weight: 0.03 },
] as const;

/** 영·한 불용어 — 기사 키워드 자동완성에서 제외 */
const STOPWORDS = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "at",
    "from",
    "by",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "it",
    "its",
    "this",
    "that",
    "these",
    "those",
    "after",
    "before",
    "over",
    "under",
    "into",
    "about",
    "against",
    "between",
    "through",
    "during",
    "without",
    "within",
    "says",
    "said",
    "will",
    "can",
    "could",
    "would",
    "should",
    "may",
    "might",
    "new",
    "news",
    "report",
    "reports",
    "year",
    "years",
    "day",
    "days",
    "week",
    "month",
    "및",
    "등",
    "또",
    "위한",
    "대한",
    "관련",
    "통해",
    "이날",
    "오늘",
    "어제",
    "밝혔다",
    "따르면",
    "기자",
    "뉴스",
  ].map((w) => w.toLowerCase()),
);

/** 지명·국가·분쟁 Fuse 인덱스 */
export function createPlaceSearchIndex(places: SearchPlace[]) {
  return new Fuse(places, {
    keys: [...PLACE_KEYS],
    threshold: 0.38,
    ignoreLocation: true,
    includeScore: true,
  });
}

/** 현재 스트림 기사 Fuse 인덱스 */
export function createNewsSearchIndex(articles: NewsStreamItem[]) {
  return new Fuse(articles, {
    keys: [...NEWS_KEYS],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });
}

/**
 * 장소 + 기사를 점수순으로 합쳐 상위 N개.
 * Fuse score는 낮을수록 일치도 높음.
 */
export function searchChromeHits(options: {
  query: string;
  placeIndex: Fuse<SearchPlace> | null;
  newsIndex: Fuse<NewsStreamItem> | null;
  limit?: number;
}): ChromeSearchHit[] {
  const q = options.query.trim();
  if (!q) return [];
  const limit = options.limit ?? 12;

  const placeHits: ChromeSearchHit[] = options.placeIndex
    ? options.placeIndex.search(q).map((r) => ({
        kind: "place" as const,
        place: r.item,
        score: r.score ?? 1,
      }))
    : [];

  const newsHits: ChromeSearchHit[] = options.newsIndex
    ? options.newsIndex.search(q).map((r) => ({
        kind: "news" as const,
        article: r.item,
        score: r.score ?? 1,
      }))
    : [];

  return [...placeHits, ...newsHits]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

/** 기사 제목·요약에서 키워드 빈도 사전 구축 */
export function buildNewsKeywordCatalog(
  articles: NewsStreamItem[],
): ChromeKeywordSuggestion[] {
  const counts = new Map<string, { display: string; count: number }>();

  const bump = (display: string, weight = 1) => {
    const key = display.toLowerCase();
    if (STOPWORDS.has(key) || key.length < 2) return;
    const prev = counts.get(key);
    if (prev) prev.count += weight;
    else counts.set(key, { display, count: weight });
  };

  for (const article of articles) {
    const text = `${article.title} ${article.summary ?? ""}`;
    for (const token of tokenizeNewsText(text)) bump(token);

    // 영문 2~3단어 구 — "Red Sea", "North Korea" 등 자동완성용
    const words = article.title.match(/[A-Za-z][A-Za-z0-9'-]*/g) ?? [];
    for (let i = 0; i < words.length; i++) {
      if (STOPWORDS.has(words[i].toLowerCase())) continue;
      if (i + 1 < words.length && !STOPWORDS.has(words[i + 1].toLowerCase())) {
        bump(`${words[i]} ${words[i + 1]}`, 2);
      }
      if (
        i + 2 < words.length &&
        !STOPWORDS.has(words[i + 1].toLowerCase()) &&
        !STOPWORDS.has(words[i + 2].toLowerCase())
      ) {
        bump(`${words[i]} ${words[i + 1]} ${words[i + 2]}`, 2);
      }
    }
  }

  return [...counts.values()]
    .map(({ display, count }) => ({ keyword: display, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
}

/**
 * 입력 접두/부분 일치 키워드 자동완성.
 * 쿼리와 완전히 같은 단어는 제외. 접두 일치·빈도 순.
 */
export function suggestNewsKeywords(
  query: string,
  catalog: ChromeKeywordSuggestion[],
  limit = 8,
): ChromeKeywordSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const matched: ChromeKeywordSuggestion[] = [];
  for (const row of catalog) {
    const key = row.keyword.toLowerCase();
    if (key === q) continue;
    if (!key.startsWith(q) && !key.includes(q)) continue;
    matched.push(row);
  }
  matched.sort((a, b) => {
    const aPrefix = a.keyword.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.keyword.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return b.count - a.count;
  });
  return matched.slice(0, limit);
}

export function tokenizeNewsText(text: string): string[] {
  const raw = text.match(/[A-Za-z][A-Za-z0-9'-]{2,}|[\uac00-\ud7a3]{2,}/g) ?? [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const piece of raw) {
    const lower = piece.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    tokens.push(piece.length <= 24 ? piece : piece.slice(0, 24));
  }
  return tokens;
}
