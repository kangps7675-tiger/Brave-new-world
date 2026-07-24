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

/** RSS 본문 스니펫 — 심층 기사 판별용 (등불 카드 요약 길이와 별개) */
const RSS_BODY_SNIPPET_MAX = 1000;

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
  // content:encoded 우선 — 심층 본문 스니펫
  const description =
    tagContent(block, "content:encoded") ||
    tagContent(block, "content") ||
    tagContent(block, "description") ||
    tagContent(block, "summary");

  if (!description) return undefined;

  const plain = stripHtml(description);
  if (!plain || plain.toLowerCase() === title.toLowerCase()) return undefined;
  // 긴 content:encoded를 남겨 심층 본문 후보를 가림 (UI 요약은 등불 picker에서 축약)
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

  for (const block of entries.slice(0, 15)) {
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
