/**
 * NewFeeds Iran regional feed → bottom intel / breaking stream.
 * Attribution: https://github.com/ktoetotam/NewFeeds (MIT)
 */
import {
  NEWFEEDS_ATTRIBUTION_SHORT,
  NEWFEEDS_IRAN_FEED_URL,
} from "@/lib/newfeeds";
import type { NewsStreamItem } from "@/lib/news/types";

type IranArticleRaw = {
  id?: string;
  title_en?: string;
  title_original?: string;
  summary_en?: string;
  url?: string;
  source_name?: string;
  published?: string;
  fetched_at?: string;
};

function stableNewfeedsId(title: string, link: string, id?: string): string {
  if (id) return `newfeeds-${id}`;
  const key = `${title.toLowerCase().slice(0, 80)}:${link.slice(0, 60)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return `newfeeds-${Math.abs(hash).toString(36)}`;
}

/** Fetch Iran state/regional pool for news-stream merge (tier 3 · middle-east). */
export async function fetchNewfeedsIranNewsItems(limit = 30): Promise<NewsStreamItem[]> {
  try {
    const res = await fetch(NEWFEEDS_IRAN_FEED_URL, {
      headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/1.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const raw = (await res.json()) as
      | IranArticleRaw[]
      | { articles?: IranArticleRaw[]; items?: IranArticleRaw[] };
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.articles)
        ? raw.articles
        : Array.isArray(raw.items)
          ? raw.items
          : [];

    const now = Date.now();
    const items: NewsStreamItem[] = [];
    for (const row of list) {
      const title = (row.title_en || row.title_original || "").trim();
      if (!title) continue;
      const link = row.url || "";
      const pubDate = row.published || row.fetched_at || new Date(now).toISOString();
      const ts = Date.parse(pubDate);
      if (!Number.isFinite(ts) || ts > now + 3_600_000) continue;

      const outlet = (row.source_name || "Iran state media").trim();
      items.push({
        id: stableNewfeedsId(title, link, row.id),
        title,
        link: link || NEWFEEDS_IRAN_FEED_URL,
        source: `${outlet} · ${NEWFEEDS_ATTRIBUTION_SHORT}`,
        publisher: outlet,
        pubDate: new Date(ts).toISOString(),
        theater: "middle-east",
        trustTier: 3,
        feedTopic: "defense",
        category: "NewFeeds Iran",
        summary: (row.summary_en || "").trim() || undefined,
      });
      if (items.length >= limit) break;
    }
    return items;
  } catch {
    return [];
  }
}
