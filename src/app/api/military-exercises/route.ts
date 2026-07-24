import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { militaryExercises } from "@/db/schema";
import { apiStubResponse } from "@/lib/apiStub";
import { rowToMilitaryExercise } from "@/lib/militaryExercises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 120;

/**
 * 군사 훈련 경보 스냅샷 (공시·OSINT 다층).
 * D1 읽기 전용 — 테이블 미마이그레이션 시 빈 배열.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("military-exercises", request);
  if (stub) return stub;

  try {
    const db = await getDb();
    const activeOnly = new URL(request.url).searchParams.get("all") !== "1";

    const rows = activeOnly
      ? await db
          .select()
          .from(militaryExercises)
          .where(eq(militaryExercises.active, 1))
          .orderBy(desc(militaryExercises.announcedAt))
          .limit(LIMIT)
      : await db
          .select()
          .from(militaryExercises)
          .orderBy(desc(militaryExercises.announcedAt))
          .limit(LIMIT);

    const exercises = rows.map(rowToMilitaryExercise);

    return NextResponse.json(
      {
        exercises,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json(
      { exercises: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
