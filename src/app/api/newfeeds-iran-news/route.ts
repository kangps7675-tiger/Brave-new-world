import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/apiCache";
import {
  NEWFEEDS_ATTRIBUTION,
  NEWFEEDS_IRAN_FEED_URL,
  NEWFEEDS_REPO_URL,
} from "@/lib/newfeeds";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_KEY = "newfeeds:iran-feed:v1";
const CACHE_MS = 5 * 60 * 1000;

type IranArticle = {
  id?: string;
  title_en?: string;
  title_original?: string;
  summary_en?: string;
  url?: string;
  source_name?: string;
  published?: string;
  fetched_at?: string;
};

/**
 * GET /api/newfeeds-iran-news?limit=24
 * Proxies NewFeeds Iran regional feed for news pooling.
 * Attribution: https://github.com/ktoetotam/NewFeeds (MIT)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 24;

  const cached = getCached<{ fetchedAt: string; items: IranArticle[] }>(CACHE_KEY);
  if (cached) {
    return NextResponse.json({
      ...cached,
      items: cached.items.slice(0, limit),
      attribution: NEWFEEDS_ATTRIBUTION,
      attributionUrl: NEWFEEDS_REPO_URL,
      live: true,
    }, { headers: publicCacheHeaders(CDN_CACHE.newfeeds) });
  }

  try {
    const res = await fetch(NEWFEEDS_IRAN_FEED_URL, {
      headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/1.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          fetchedAt: new Date().toISOString(),
          items: [],
          live: false,
          attribution: NEWFEEDS_ATTRIBUTION,
          attributionUrl: NEWFEEDS_REPO_URL,
          error: `upstream ${res.status}`,
        },
        { status: 502 },
      );
    }

    const raw = (await res.json()) as IranArticle[] | { articles?: IranArticle[]; items?: IranArticle[] };
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.articles)
        ? raw.articles
        : Array.isArray(raw.items)
          ? raw.items
          : [];

    const items = list.map((row) => ({
      id: row.id,
      title: row.title_en || row.title_original || "",
      summary: row.summary_en || "",
      url: row.url || null,
      source: row.source_name || "NewFeeds",
      publishedAt: row.published || row.fetched_at || null,
    }));

    const payload = { fetchedAt: new Date().toISOString(), items };
    setCached(CACHE_KEY, payload, CACHE_MS);

    return NextResponse.json({
      ...payload,
      items: items.slice(0, limit),
      live: true,
      attribution: NEWFEEDS_ATTRIBUTION,
      attributionUrl: NEWFEEDS_REPO_URL,
    }, { headers: publicCacheHeaders(CDN_CACHE.newfeeds) });
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        items: [],
        live: false,
        attribution: NEWFEEDS_ATTRIBUTION,
        attributionUrl: NEWFEEDS_REPO_URL,
        error: publicErrorMessage(error, "iran feed failed"),
      },
      { status: 502 },
    );
  }
}
