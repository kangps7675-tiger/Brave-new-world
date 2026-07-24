import {
  feedsForVideoTopic,
  youtubeAtomUrl,
  type VideoFeedDef,
} from "@/lib/news/videoFeedCatalog";
import type { VideoNewsItem, VideoNewsPayload, VideoNewsTopic } from "@/lib/news/videoTypes";

function stableId(videoId: string, source: string): string {
  return `yt-${source.slice(0, 12)}-${videoId}`.replace(/\s+/g, "");
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function tagText(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1].trim()) : null;
}

function attr(block: string, tag: string, name: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${name}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : null;
}

function parseEntry(
  entry: string,
  feed: VideoFeedDef,
): VideoNewsItem | null {
  const videoId =
    tagText(entry, "yt:videoId") ||
    attr(entry, "yt:videoId", "id") ||
    (() => {
      const href = attr(entry, "link", "href") || "";
      const m = href.match(/[?&]v=([\w-]{6,})/) || href.match(/youtu\.be\/([\w-]{6,})/);
      return m?.[1] ?? null;
    })();
  if (!videoId) return null;

  const title = tagText(entry, "title");
  if (!title) return null;

  const publishedAt =
    tagText(entry, "published") || tagText(entry, "updated") || new Date().toISOString();
  const link =
    attr(entry, "link", "href") || `https://www.youtube.com/watch?v=${videoId}`;
  const thumb =
    attr(entry, "media:thumbnail", "url") ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const summary = tagText(entry, "media:description") || tagText(entry, "summary") || undefined;

  return {
    id: stableId(videoId, feed.name),
    videoId,
    title: title.slice(0, 240),
    link,
    source: feed.name,
    publishedAt,
    thumbnailUrl: thumb,
    topic: feed.topic,
    summary: summary?.slice(0, 400),
  };
}

async function fetchFeedItems(feed: VideoFeedDef): Promise<VideoNewsItem[]> {
  try {
    const res = await fetch(youtubeAtomUrl(feed.channelId), {
      cache: "no-store",
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": "BraveNewWorld/1.0 VideoNews Reader",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
    const out: VideoNewsItem[] = [];
    for (const entry of entries) {
      const item = parseEntry(entry, feed);
      if (item) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

/** YouTube Atom → 메타만. max는 liveRenderGuard 상한과 맞춤. */
export async function buildVideoNewsStream(options: {
  topic: VideoNewsTopic;
  max: number;
}): Promise<VideoNewsPayload> {
  const feeds = feedsForVideoTopic(options.topic);
  const batches = await Promise.all(feeds.map((f) => fetchFeedItems(f)));
  const byId = new Map<string, VideoNewsItem>();
  for (const batch of batches) {
    for (const item of batch) {
      if (!byId.has(item.videoId)) byId.set(item.videoId, item);
    }
  }

  const items = Array.from(byId.values())
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, Math.max(1, options.max));

  const sources = new Set(items.map((i) => i.source));
  return {
    fetchedAt: new Date().toISOString(),
    topic: options.topic,
    items,
    stats: { total: items.length, sources: sources.size },
    source: "live",
  };
}
