/**
 * 기사 URL → 제목·매체·발행시각·본문 초안.
 * readability 없음 — og 메타 + <p> 정규식. 실패 시 붙여넣기 본문을 쓰도록 한다.
 */

import { isArticleUrl } from "@/lib/news/articleLink";
import { canFetchArticle } from "@/lib/news/robotsTxt";
import { SITE_URL } from "@/lib/siteUrl";

const UA = `BraveNewWorldBot/1.0 (+${SITE_URL}; case-file article extract)`;
const TIMEOUT_MS = 8_000;
const MAX_HTML_CHARS = 220_000;

export type ExtractedArticle = {
  url?: string;
  title: string | null;
  outlet: string | null;
  publishedAt: string | null;
  text: string;
  /** URL fetch 실패·robots 차단 등 */
  fetchNote?: string;
};

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

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(Number.parseInt(h, 16)));
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** <p>…</p> 본문 모으기 */
export function extractParagraphText(html: string): string {
  if (!html) return "";
  const parts: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = stripTags(m[1] ?? "");
    if (t.length < 40) continue;
    parts.push(t);
    if (parts.join("\n\n").length > 12_000) break;
  }
  if (parts.length > 0) return parts.join("\n\n");
  // fallback: title-ish body strip
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  return stripTags(body).slice(0, 8_000);
}

export function parseArticleMetaFromHtml(html: string): {
  title: string | null;
  outlet: string | null;
  publishedAt: string | null;
  text: string;
} {
  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
    null;
  const outlet =
    metaContent(html, "og:site_name") ||
    metaContent(html, "application-name") ||
    null;
  const publishedAt =
    metaContent(html, "article:published_time") ||
    metaContent(html, "og:updated_time") ||
    metaContent(html, "pubdate") ||
    null;
  return {
    title: title ? decodeEntities(stripTags(title)) : null,
    outlet: outlet ? decodeEntities(outlet) : null,
    publishedAt,
    text: extractParagraphText(html),
  };
}

export async function fetchAndExtractArticle(url: string): Promise<ExtractedArticle> {
  const trimmed = url.trim();
  if (!trimmed || !isArticleUrl(trimmed)) {
    return {
      url: trimmed || undefined,
      title: null,
      outlet: null,
      publishedAt: null,
      text: "",
      fetchNote: "유효한 기사 URL이 아닙니다",
    };
  }

  if (!(await canFetchArticle(trimmed, UA))) {
    return {
      url: trimmed,
      title: null,
      outlet: null,
      publishedAt: null,
      text: "",
      fetchNote: "robots.txt 또는 정책상 가져올 수 없습니다 — 본문을 붙여넣으세요",
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(trimmed, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": UA,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        url: trimmed,
        title: null,
        outlet: null,
        publishedAt: null,
        text: "",
        fetchNote: `HTTP ${res.status} — 본문을 붙여넣으세요`,
      };
    }
    const html = (await res.text()).slice(0, MAX_HTML_CHARS);
    const meta = parseArticleMetaFromHtml(html);
    return {
      url: trimmed,
      title: meta.title,
      outlet: meta.outlet,
      publishedAt: meta.publishedAt,
      text: meta.text,
      fetchNote: meta.text ? undefined : "본문을 못 찾았습니다 — 붙여넣기를 쓰세요",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return {
      url: trimmed,
      title: null,
      outlet: null,
      publishedAt: null,
      text: "",
      fetchNote: `${message} — 본문을 붙여넣으세요`,
    };
  } finally {
    clearTimeout(timer);
  }
}
