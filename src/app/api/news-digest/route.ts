import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  emptyNewsDigestCache,
  findDigestByArticleId,
  isNewsDigestItem,
  type NewsDigestCache,
} from "@/lib/news/digestTypes";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "news-digest.json");

function readDigestCache(): NewsDigestCache {
  if (!fs.existsSync(LIVE_FILE)) return emptyNewsDigestCache();
  try {
    const raw = fs.readFileSync(LIVE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<NewsDigestCache>;
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(isNewsDigestItem)
      : [];
    return {
      version: 1,
      generatedAt:
        typeof parsed.generatedAt === "string"
          ? parsed.generatedAt
          : new Date().toISOString(),
      llmEnabled: parsed.llmEnabled === true,
      items,
      note: typeof parsed.note === "string" ? parsed.note : undefined,
    };
  } catch {
    return emptyNewsDigestCache();
  }
}

/**
 * GET /api/news-digest
 * GET /api/news-digest?articleId=…
 *
 * 캐시 hit만 반환. LLM 온디맨드 호출 없음.
 */
export async function GET(request: NextRequest) {
  const cache = readDigestCache();
  const articleId = request.nextUrl.searchParams.get("articleId")?.trim() ?? "";

  if (articleId) {
    const item = findDigestByArticleId(cache, articleId);
    return NextResponse.json({
      generatedAt: cache.generatedAt,
      llmEnabled: cache.llmEnabled,
      articleId,
      item,
      cached: true,
    }, { headers: publicCacheHeaders(CDN_CACHE.briefing) });
  }

  return NextResponse.json({
    generatedAt: cache.generatedAt,
    llmEnabled: cache.llmEnabled,
    items: cache.items,
    note: cache.note,
    cached: true,
  }, { headers: publicCacheHeaders(CDN_CACHE.briefing) });
}
