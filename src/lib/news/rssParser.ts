export type RawRssItem = {
  title: string;
  link: string;
  pubDate: string;
  category?: string;
  publisher?: string;
  imageUrl?: string;
  summary?: string;
};

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function tagContent(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(cdata) || block.match(plain);
  return match ? decodeEntities(match[1]) : "";
}

function atomLink(block: string): string {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (hrefMatch) return hrefMatch[1];
  return tagContent(block, "link");
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * RSS 본문 스니펫 상한 — **저작권 정책 상수. 올리지 말 것.**
 *
 * 타 매체 기사 본문의 재현 범위를 인용 관행 안에 묶어두기 위한 값이다.
 * 짧은 속보는 1000자면 사실상 전문(全文)이 되고, 여기에 한국어 번역까지
 * 얹으면 2차적저작물 작성(저작권법 제22조)에 해당해 인용(제28조) 항변이
 * 어려워진다. Telegram 측 `TELEGRAM_SNIPPET_MAX_CHARS = 280` 과 같은 사상.
 *
 * @see docs/copyright-audit-2026-08-01.md — R-3
 * @see docs/copyright-checklist.md
 */
const RSS_BODY_SNIPPET_MAX = 220;
/** 피드당 파싱 상한 — "한 사건, 여러 관점"용 재료 확보 (기존 15) */
const PER_FEED_MAX_ITEMS = 40; // 모바일 홈·전체 풀링 확대

function truncateSummary(text: string, max = RSS_BODY_SNIPPET_MAX): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  if (/^https?:\/\//i.test(url)) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url);
}

function extractImageUrl(block: string, description: string): string | undefined {
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i);
  if (enclosure && isImageUrl(enclosure[1])) return enclosure[1];

  const media =
    block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["'][^>]*>/i) ||
    block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  if (media && isImageUrl(media[1])) return media[1];

  const contentEncoded = tagContent(block, "content:encoded") || tagContent(block, "content");
  const imgSource = description || contentEncoded;
  const img = imgSource.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img && isImageUrl(img[1])) return img[1];

  return undefined;
}

function extractSummary(block: string, title: string): string | undefined {
  /*
   * 순서가 곧 저작권 정책이다 — **뒤집지 말 것.**
   *
   * `description` / `summary` 는 매체가 "요약용으로 배포하라"고 스스로 넣은 필드다.
   * `content:encoded` 는 RSS 규격상 **기사 전문(full text)** 이 들어가는 자리이므로
   * 최후순위로 내린다. 전문 필드를 1순위로 고르는 것은 "더 많은 본문을 가져오는"
   * 의도적 설계로 읽히고, 분쟁 시 인용 항변을 약화시킨다.
   *
   * @see docs/copyright-audit-2026-08-01.md — R-3
   */
  const description =
    tagContent(block, "description") ||
    tagContent(block, "summary") ||
    tagContent(block, "content") ||
    tagContent(block, "content:encoded");

  if (!description) return undefined;

  const plain = stripHtml(description);
  if (!plain || plain.toLowerCase() === title.toLowerCase()) return undefined;
  return truncateSummary(plain, RSS_BODY_SNIPPET_MAX);
}

export function parseRssXml(xml: string): RawRssItem[] {
  if (xml.trimStart().startsWith("<!DOCTYPE") || xml.trimStart().startsWith("<html")) {
    return [];
  }

  const items: RawRssItem[] = [];
  const blocks = Array.from(xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)).map((m) => m[1]);
  const entries =
    blocks.length > 0
      ? blocks
      : Array.from(xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)).map((m) => m[1]);

  for (const block of entries.slice(0, PER_FEED_MAX_ITEMS)) {
    let title = tagContent(block, "title");
    const link = atomLink(block);
    const pubDate =
      tagContent(block, "pubDate") ||
      tagContent(block, "published") ||
      tagContent(block, "updated");
    const category = tagContent(block, "category") || undefined;
    const description = tagContent(block, "description");

    if (!title) continue;

    let publisher: string | undefined;
    const dashIdx = title.lastIndexOf(" - ");
    if (dashIdx > 20) {
      publisher = title.slice(dashIdx + 3).trim();
      title = title.slice(0, dashIdx).trim();
    }

    items.push({
      title,
      link,
      pubDate,
      category,
      publisher,
      imageUrl: extractImageUrl(block, description),
      summary: extractSummary(block, title),
    });
  }

  return items;
}

export async function fetchRssFeed(
  url: string,
  timeoutMs = 5000,
): Promise<RawRssItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "BraveNewWorld/1.0 RSS Reader",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
