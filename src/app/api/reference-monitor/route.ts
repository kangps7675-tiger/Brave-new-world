import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
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
 * CSIS Beyond Parallel · NTI · CRINK 허브 모니터 — cron 적재분을 D1에서 읽기만 한다.
 *
 * 쿼리:
 *   ?source=csis-beyond-parallel,nti,38-north
 *   ?hub=PRK|CHN|RUS|IRN
 *   ?topic=missile-silo,dprk,hub:PRK
 *   ?minRelevance=3
 *   ?limit=40
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("reference-monitor", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const sources = parseList(url.searchParams.get("source"));
  const topics = parseList(url.searchParams.get("topic"));
  const hub = (url.searchParams.get("hub") || "").trim().toUpperCase();
  const minRelevance = Number(url.searchParams.get("minRelevance") ?? "0");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );

  try {
    const db = await getDb();
    const filters = [];
    if (sources.length > 0) filters.push(inArray(referenceMonitorItems.source, sources));
    if (hub === "PRK" || hub === "CHN" || hub === "RUS" || hub === "IRN") {
      filters.push(eq(referenceMonitorItems.hub, hub));
    }
    if (Number.isFinite(minRelevance) && minRelevance > 0) {
      filters.push(gte(referenceMonitorItems.relevance, minRelevance));
    }
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
      hub: row.hub,
      placeId: row.placeId,
      lat: row.lat,
      lng: row.lng,
      imageUrl: row.imageUrl,
      thumbCredit: row.thumbCredit,
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
        hub: hub || null,
        fetchedAt: new Date().toISOString(),
      },
      { headers: publicCacheHeaders(CDN_CACHE.referenceMonitor) },
    );
  } catch {
    return NextResponse.json(
      { items: [], sources: [], count: 0, hub: hub || null, fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
