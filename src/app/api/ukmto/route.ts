import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ukmtoIncidents } from "@/db/schema";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 500;

/**
 * UKMTO(Royal Navy) 상선 피습·나포·의심활동 경보 — 최근 순.
 * 비공식 엔드포인트 기반 cron 적재분을 D1에서 읽기만 한다 (서버가 직접 상류를 매 요청마다 찌르지 않음).
 * ?limit=N (기본 60, 최대 500) — 정답표 비교·이력 점검용으로 더 길게 받을 수 있다.
 * 테이블 미마이그레이션 시(db:generate/db:migrate:remote 전) 빈 배열로 안전하게 폴백.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("ukmto", request);
  if (stub) return stub;

  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(new URL(request.url).searchParams.get("limit"))) || DEFAULT_LIMIT));
    const db = await getDb();
    const rows = await db
      .select()
      .from(ukmtoIncidents)
      .orderBy(desc(ukmtoIncidents.utcDateOfIncident))
      .limit(limit);

    return NextResponse.json(
      { incidents: rows, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=90" } },
    );
  } catch {
    return NextResponse.json(
      { incidents: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
