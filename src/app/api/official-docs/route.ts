import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { officialDocFeed, officialDocPoll } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { isValidIssuerId } from "@/data/officialDocs";
import { buildFeedStatus } from "@/lib/officialDocs/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/official-docs?issuer=us&days=30
 * 각국 정부·기구가 새로 낸 성명·공동성명·팩트시트·회담 요약 목록(제목·링크·요약). cron 적재분(D1)을 읽기만 한다.
 * 원문 전체가 아니라 링크 목록이다. 테이블 미마이그레이션 시 빈 배열로 폴백.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const issuerRaw = url.searchParams.get("issuer");
  const issuer = issuerRaw && isValidIssuerId(issuerRaw) ? issuerRaw : null;
  const days = Math.min(180, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  if (isApiStubMode()) return NextResponse.json({ docs: [], stub: true });

  // ?status=1 — 피드별 마지막 수집 결과(어느 사이트가 막혔는지). 접속 확인을 PC 없이 하려는 용도.
  if (url.searchParams.get("status")) {
    try {
      const db = await getDb();
      const polls = await db.select().from(officialDocPoll).orderBy(desc(officialDocPoll.checkedAt));
      const stored = await db
        .select({ feed: officialDocFeed.feed, count: sql<number>`count(*)`, newestPublishedAt: sql<string | null>`max(${officialDocFeed.publishedAt})` })
        .from(officialDocFeed)
        .groupBy(officialDocFeed.feed);
      // 수집 성공 여부만이 아니라, 실제로 문서가 쌓이는지까지 겹쳐 본다(조용히 0건이 된 소스를 가려내려고)
      const health = buildFeedStatus(polls, stored);
      return NextResponse.json(
        {
          feeds: health.feeds,
          ok: polls.filter((f) => f.ok === 1).length,
          failed: polls.filter((f) => f.ok !== 1).length,
          counts: health.counts,
          needsAttention: health.needsAttention.map((f) => ({ feed: f.feed, health: f.health, reason: f.reason, error: f.error })),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return NextResponse.json({ feeds: [], ok: 0, failed: 0, counts: {}, needsAttention: [] });
    }
  }

  try {
    const db = await getDb();
    const where = issuer
      ? and(eq(officialDocFeed.issuerId, issuer), gte(officialDocFeed.publishedAt, since))
      : gte(officialDocFeed.publishedAt, since);
    let rows: Array<Record<string, unknown>>;
    try {
      rows = await db.select().from(officialDocFeed).where(where).orderBy(desc(officialDocFeed.publishedAt)).limit(150);
    } catch {
      // 0044(번역 칸) 마이그레이션 전이면 옛 칸만 읽는다 — 번역이 없어도 문서 목록은 계속 나와야 한다
      rows = await db
        .select({
          id: officialDocFeed.id, issuerId: officialDocFeed.issuerId, kind: officialDocFeed.kind, weight: officialDocFeed.weight,
          title: officialDocFeed.title, url: officialDocFeed.url, publishedAt: officialDocFeed.publishedAt, summary: officialDocFeed.summary,
          tags: officialDocFeed.tags, feed: officialDocFeed.feed, agency: officialDocFeed.agency, ingestedAt: officialDocFeed.ingestedAt,
        })
        .from(officialDocFeed)
        .where(where)
        .orderBy(desc(officialDocFeed.publishedAt))
        .limit(150);
    }
    return NextResponse.json(
      { docs: rows, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch {
    return NextResponse.json(
      { docs: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
