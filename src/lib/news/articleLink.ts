/**
 * 등불·원문 CTA — 섹션/토픽/홈성 URL 거부, 개별 기사 path만 통과.
 */

/** 명백한 섹션·허브 세그먼트 (단독 또는 짧은 경로) */
const SECTION_SEGMENTS = new Set([
  "business",
  "markets",
  "market",
  "technology",
  "tech",
  "world",
  "politics",
  "economy",
  "economies",
  "finance",
  "energy",
  "opinion",
  "sport",
  "sports",
  "culture",
  "lifestyle",
  "health",
  "science",
  "video",
  "videos",
  "podcasts",
  "live",
  "breaking",
  "asia",
  "europe",
  "africa",
  "americas",
  "middle-east",
  "china",
  "uk",
  "us",
  "asia-pacific",
  "news",
  "articles",
  "article",
  "story",
  "stories",
  "topics",
  "topic",
  "section",
  "sections",
  "category",
  "categories",
  "tag",
  "tags",
  "latest",
]);

/** 기사 slug로 보이는 토큰 — 날짜·긴 하이픈 제목·id */
const ARTICLE_SLUG_RE =
  /(?:^\d{4}[-/]\d{2}[-/]\d{2})|(?:[-_/]\d{4}[-/]\d{2}[-/]\d{2}[-_/])|(?:[a-z0-9]+(?:-[a-z0-9]+){3,})|(?:\d{5,})|(?:article|story|id)[-_/]?[a-z0-9]+/i;

function pathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

/**
 * 개별 기사 URL로 보이는지.
 * 섹션 인덱스(`/business/energy/`, `/world/europe/`)는 false.
 */
export function isArticleUrl(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length < 12) return false;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const segs = pathSegments(url.pathname);
  if (segs.length === 0) return false;

  // 홈·1단 섹션만
  if (segs.length === 1) {
    const only = segs[0]!;
    if (SECTION_SEGMENTS.has(only)) return false;
    return ARTICLE_SLUG_RE.test(only) || only.length >= 24;
  }

  // 마지막 세그먼트가 짧은 섹션명이고 전체가 짧으면 허브
  const last = segs[segs.length - 1]!;
  const allSectionNamed = segs.every((s) => SECTION_SEGMENTS.has(s));
  if (allSectionNamed && segs.length <= 3) {
    return false;
  }

  // 마지막이 섹션 단어뿐이고 slug가 아니면 거부
  if (SECTION_SEGMENTS.has(last) && last.length <= 14 && !/\d/.test(last)) {
    // …/world/europe 형태
    if (segs.length <= 3 && segs.every((s) => SECTION_SEGMENTS.has(s) || s.length <= 16)) {
      return false;
    }
  }

  // 기사 신호: 긴 slug, 날짜, id, 또는 4단 이상 path
  if (ARTICLE_SLUG_RE.test(last) || ARTICLE_SLUG_RE.test(segs.join("/"))) return true;
  // BBC 스타일 /news/articles/c2e8x9y7z1wq — 알파숫자 id
  if (/^[a-z]*\d+[a-z0-9]*$/i.test(last) && last.length >= 8) return true;
  if (segs.length >= 3 && last.length >= 10 && !SECTION_SEGMENTS.has(last)) return true;
  if (segs.length >= 4 && last.length >= 12) return true;
  if (last.length >= 28) return true;
  if (/\.(html?|shtml)$/i.test(last)) return true;

  return false;
}
