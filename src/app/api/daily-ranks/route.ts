import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import { loadPredictionStats } from "@/lib/dailyPredict";
import { loadDailyRanks, prevUtcRankDate, utcRankDate } from "@/lib/dailyRanks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

/**
 * 오늘의 세계 위험 순위 + 공급망 스트레스 TOP.
 * D1 우선, 없으면 ingest worker /daily-ranks 폴백.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("daily-ranks", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, querySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, ranks: null },
      { status: 400 },
    );
  }

  const payload = await loadDailyRanks({
    date: parsed.data.date || utcRankDate(),
    limit: parsed.data.limit ?? 5,
  });

  let yesterdayCorrectPct = payload.yesterdayCorrectPct ?? null;
  if (yesterdayCorrectPct == null) {
    try {
      const stats = await loadPredictionStats({
        date: prevUtcRankDate(),
        kind: "tension-dir",
      });
      if (stats && stats.total > 0) yesterdayCorrectPct = stats.correctPct;
    } catch {
      // optional
    }
  }

  return NextResponse.json(
    { ...payload, yesterdayCorrectPct },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
