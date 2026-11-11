import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { officialDocFeed } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { isValidIssuerId } from "@/data/officialDocs";

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

  try {
    const db = await getDb();
    const where = issuer
      ? and(eq(officialDocFeed.issuerId, issuer), gte(officialDocFeed.publishedAt, since))
      : gte(officialDocFeed.publishedAt, since);
    const rows = await db.select().from(officialDocFeed).where(where).orderBy(desc(officialDocFeed.publishedAt)).limit(150);
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
