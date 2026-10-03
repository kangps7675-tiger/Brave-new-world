/**
 * NewFeeds Iran regional feed → bottom intel / breaking stream.
 * Attribution: https://github.com/ktoetotam/NewFeeds (MIT)
 *
 * 프로덕션: cron `POST /api/newfeeds/sync` → memory/D1 → 여기 읽기.
 * 스냅샷이 비면 upstream에 한 번 붙어 채운다 (stub/시드 없음).
 */
import {
  NEWFEEDS_ATTRIBUTION_SHORT,
  NEWFEEDS_IRAN_FEED_URL,
} from "@/lib/newfeeds";
import {
  NEWFEEDS_IRAN_NEWS_CACHE_KEY,
  getNewfeedsIranNewsMemory,
  setNewfeedsIranNewsMemory,
} from "@/lib/newfeeds/store";
import { loadNewfeedsSnapshot } from "@/lib/newfeeds/persist";
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

function mapArticles(list: IranArticleRaw[], limit: number): NewsStreamItem[] {
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
}

/** Upstream 직행 — sync 전용. */
export async function fetchNewfeedsIranNewsItemsFromUpstream(
  limit = 30,
): Promise<NewsStreamItem[]> {
  const res = await fetch(NEWFEEDS_IRAN_FEED_URL, {
    headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/newfeeds-ingest" },
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
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
  return mapArticles(list, limit);
}

/** news-stream 병합용 — memory → D1 → upstream. */
export async function fetchNewfeedsIranNewsItems(limit = 30): Promise<NewsStreamItem[]> {
  const mem = getNewfeedsIranNewsMemory();
  if (mem.items.length) return mem.items.slice(0, limit);

  const fromD1 = await loadNewfeedsSnapshot<{
    fetchedAt?: string;
    items?: NewsStreamItem[];
  }>(NEWFEEDS_IRAN_NEWS_CACHE_KEY);
  if (fromD1?.payload?.items?.length) {
    setNewfeedsIranNewsMemory(
      fromD1.payload.items,
      fromD1.payload.fetchedAt || fromD1.fetchedAt,
    );
    return fromD1.payload.items.slice(0, limit);
  }

  try {
    const items = await fetchNewfeedsIranNewsItemsFromUpstream(limit);
    if (items.length) {
      setNewfeedsIranNewsMemory(items, new Date().toISOString());
    }
    return items;
  } catch {
    return [];
  }
}
