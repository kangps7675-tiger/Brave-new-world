import { and, desc, gte, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { referenceMonitorItems } from "@/db/schema";
import { apiStubResponse } from "@/lib/apiStub";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";
import type { ReferenceMonitorItem } from "@/lib/referenceMonitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 120;

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function safeJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * CSIS Beyond Parallel · NTI 레퍼런스 감시 — cron 적재분을 D1에서 읽기만 한다.
 *
 * 쿼리:
 *   ?source=csis-beyond-parallel,nti
 *   ?topic=missile-silo,dprk       (하나라도 걸리면 통과)
 *   ?minRelevance=3
 *   ?limit=40
 *
 * 테이블 미마이그레이션 시 빈 배열로 안전 폴백 (다른 D1 라우트와 동일).
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("reference-monitor", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const sources = parseList(url.searchParams.get("source"));
  const topics = parseList(url.searchParams.get("topic"));
  const minRelevance = Number(url.searchParams.get("minRelevance") ?? "0");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );

  try {
    const db = await getDb();
    const filters = [];
    if (sources.length > 0) filters.push(inArray(referenceMonitorItems.source, sources));
    if (Number.isFinite(minRelevance) && minRelevance > 0) {
      filters.push(gte(referenceMonitorItems.relevance, minRelevance));
    }
    // topics 는 JSON 문자열 컬럼이라 SQL LIKE 로 1차 필터 후 아래에서 정확히 거른다
    for (const topic of topics) {
      filters.push(sql`${referenceMonitorItems.topicsJson} LIKE ${`%"${topic}"%`}`);
    }

    const rows = await db
      .select()
      .from(referenceMonitorItems)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(referenceMonitorItems.updatedAt), desc(referenceMonitorItems.publishedAt))
      .limit(limit);

    const items: ReferenceMonitorItem[] = rows.map((row) => ({
      id: row.id,
      source: row.source,
      sourceLabel: row.sourceLabel,
      channel: row.channel,
      url: row.url,
      title: row.title,
      summary: row.summary,
      author: row.author,
      categories: safeJsonArray(row.categoriesJson),
      topics: safeJsonArray(row.topicsJson),
      relevance: row.relevance,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      firstSeenAt: row.firstSeenAt,
    }));

    const sourceCounts = new Map<string, { source: string; label: string; count: number }>();
    for (const item of items) {
      const entry = sourceCounts.get(item.source) ?? {
        source: item.source,
        label: item.sourceLabel,
        count: 0,
      };
      entry.count += 1;
      sourceCounts.set(item.source, entry);
    }

    return NextResponse.json(
      {
        items,
        sources: [...sourceCounts.values()],
        count: items.length,
        fetchedAt: new Date().toISOString(),
      },
      { headers: publicCacheHeaders(CDN_CACHE.referenceMonitor) },
    );
  } catch {
    return NextResponse.json(
      { items: [], sources: [], count: 0, fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
