/**
 * RSS에 이미지가 없을 때 기사 페이지의 og:image / twitter:image로 보강.
 * 실패·타임아웃은 빈 문자열 — 스트림 전체를 죽이지 않음.
 */

import { isArticleUrl } from "@/lib/news/articleLink";
import { hasLampPhoto, normalizeLampImageUrl } from "@/lib/news/lampThumbnail";
import { canFetchArticle } from "@/lib/news/robotsTxt";
import type { NewsStreamItem } from "@/lib/news/types";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * 봇 신원 — **연락 가능한 실제 주소를 쓸 것.**
 *
 * 이전 값은 `+https://localhost` 였다. 봇 신원은 상대 매체가 우리 트래픽을
 * 식별하고 차단 여부를 판단할 유일한 수단인데, `localhost` 는 신원을 밝히지
 * 않은 것과 같다. robots.txt 준수와 함께 "정직한 크롤러"의 최소 조건이다.
 *
 * @see docs/copyright-audit-2026-08-01.md — O-3
 */
const ENRICH_USER_AGENT = `ConflictViewBot/1.0 (+${SITE_URL}; article thumbnail enrichment)`;

const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_MAX_ENRICH = 24;
const DEFAULT_CONCURRENCY = 4;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — lamp slot

type CacheEntry = { imageUrl: string; at: number };

const ogImageCache = new Map<string, CacheEntry>();

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reProp = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const rePropSwap = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );
  const m = html.match(reProp) || html.match(rePropSwap);
  return m?.[1]?.trim() || null;
}

/** HTML fixture / 응답에서 og·twitter 이미지 URL 추출 (테스트·런타임 공용) */
export function parseOgImageFromHtml(html: string, pageUrl?: string): string {
  if (!html) return "";
  const raw =
    metaContent(html, "og:image") ||
    metaContent(html, "og:image:url") ||
    metaContent(html, "twitter:image") ||
    metaContent(html, "twitter:image:src") ||
    "";
  if (!raw) return "";

  let absolute = raw;
  if (pageUrl && raw.startsWith("/")) {
    try {
      absolute = new URL(raw, pageUrl).href;
    } catch {
      return "";
    }
  } else if (pageUrl && !/^https?:\/\//i.test(raw)) {
    try {
      absolute = new URL(raw, pageUrl).href;
    } catch {
      return "";
    }
  }

  return normalizeLampImageUrl(absolute);
}

export async function fetchArticleOgImage(
  articleUrl: string,
  opts?: { timeoutMs?: number },
): Promise<string> {
  if (!isArticleUrl(articleUrl)) return "";

  const cached = ogImageCache.get(articleUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.imageUrl;
  }

  /*
   * robots.txt 확인 — 기사 페이지를 능동적으로 가져오기 전 필수 관문.
   * RSS 수신과 달리 이건 상대 서버에 우리가 요청을 넣는 크롤링이다.
   * 차단이면 이미지 없이 진행한다 (스트림을 죽이지 않는다).
   */
  if (!(await canFetchArticle(articleUrl, ENRICH_USER_AGENT))) {
    ogImageCache.set(articleUrl, { imageUrl: "", at: Date.now() });
    return "";
  }

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(articleUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": ENRICH_USER_AGENT,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      ogImageCache.set(articleUrl, { imageUrl: "", at: Date.now() });
      return "";
    }
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype) && ctype.length > 0) {
      ogImageCache.set(articleUrl, { imageUrl: "", at: Date.now() });
      return "";
    }
    // head만 필요 — 본문 앞부분만 읽기
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > 180_000 ? buf.slice(0, 180_000) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const imageUrl = parseOgImageFromHtml(html, articleUrl);
    ogImageCache.set(articleUrl, { imageUrl, at: Date.now() });
    return imageUrl;
  } catch {
    ogImageCache.set(articleUrl, { imageUrl: "", at: Date.now() });
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export type EnrichNewsStreamImagesOptions = {
  /** 보강 시도 상한 (기본 24) */
  maxEnrich?: number;
  concurrency?: number;
  timeoutMs?: number;
  /** 전체 보강 벽시계 예산 (기본 8s) — warm/빌드용 */
  budgetMs?: number;
};

/**
 * imageUrl 없는 최근 기사에 og:image를 채운다.
 * 이미 사진이 있거나 섹션 URL이면 스킵.
 */
export async function enrichNewsStreamImages(
  items: NewsStreamItem[],
  opts: EnrichNewsStreamImagesOptions = {},
): Promise<NewsStreamItem[]> {
  const maxEnrich = opts.maxEnrich ?? DEFAULT_MAX_ENRICH;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const budgetMs = opts.budgetMs ?? 8_000;
  const started = Date.now();

  const needIdx: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (hasLampPhoto(item.imageUrl)) continue;
    if (!isArticleUrl(item.link)) continue;
    needIdx.push(i);
    if (needIdx.length >= maxEnrich) break;
  }

  if (needIdx.length === 0) return items;

  const out = items.slice();
  let cursor = 0;

  async function worker() {
    while (cursor < needIdx.length) {
      if (Date.now() - started >= budgetMs) return;
      const my = cursor++;
      const idx = needIdx[my]!;
      const item = out[idx]!;
      const imageUrl = await fetchArticleOgImage(item.link, { timeoutMs });
      if (imageUrl) {
        out[idx] = { ...item, imageUrl };
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, needIdx.length) }, () =>
    worker(),
  );
  await Promise.all(runners);
  return out;
}

/** 테스트용 캐시 비우기 */
export function clearOgImageCacheForTests() {
  ogImageCache.clear();
}
