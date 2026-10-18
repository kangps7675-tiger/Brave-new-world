import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { warRiskQuotes } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGIONS = new Set(["red-sea", "hormuz", "black-sea", "taiwan-strait", "malacca", "other"]);

/**
 * GET /api/war-risk?region=red-sea&days=90
 * 보도 기준 전쟁위험 보험료 — cron 적재분(D1)을 읽기만 한다.
 * 테이블 미마이그레이션 시 빈 배열로 폴백.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const regionRaw = url.searchParams.get("region");
  const region = regionRaw && REGIONS.has(regionRaw) ? regionRaw : null;
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 90));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  if (isApiStubMode()) {
    return NextResponse.json({ quotes: STUB.filter((q) => !region || q.region === region), stub: true });
  }

  try {
    const db = await getDb();
    const where = region
      ? and(eq(warRiskQuotes.region, region), gte(warRiskQuotes.publishedAt, since))
      : gte(warRiskQuotes.publishedAt, since);
    const rows = await db
      .select()
      .from(warRiskQuotes)
      .where(where)
      .orderBy(desc(warRiskQuotes.publishedAt))
      .limit(120);
    return NextResponse.json(
      { quotes: rows, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch {
    return NextResponse.json(
      { quotes: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}

const STUB = [
  {
    id: "stub-1",
    region: "red-sea",
    ratePct: 0.7,
    rateHighPct: null,
    ratePrevPct: 0.5,
    usdPerVoyage: null,
    direction: "up",
    confidence: "strong",
    quote: "(stub) War risk premiums rose from 0.5% to 0.7% of hull value",
    headline: "(stub) Red Sea war risk premiums climb",
    url: "https://example.com/stub",
    outlet: "Stub",
    feed: "stub",
    publishedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
  },
];
