import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sitrepEvents } from "@/db/schema";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 12;

/**
 * SITREP 변화 로그 — cron-ingest가 daily_entity_ranks 전일 대비 diff에서
 * 검증등급 전환·유의미한 점수 델타를 감지해 sitrep_events에 기록한 걸 최근 순으로 반환.
 * 테이블 미마이그레이션 시(db:generate/db:migrate:remote 전) 빈 배열로 안전하게 폴백.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("sitrep", request);
  if (stub) return stub;

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(sitrepEvents)
      .orderBy(desc(sitrepEvents.createdAt))
      .limit(LIMIT);

    return NextResponse.json(
      { events: rows, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json(
      { events: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
