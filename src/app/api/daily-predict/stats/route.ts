import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import { loadPredictionStats } from "@/lib/dailyPredict";
import { prevUtcRankDate } from "@/lib/dailyPredictPrefs";
import { utcRankDate } from "@/lib/dailyRanks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  kind: z.enum(["theater", "tension-dir"]).optional(),
});

/**
 * 예측 정산 통계 — 「어제 맞춘 N%」.
 * 기본 date = 어제(UTC), kind = tension-dir.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("daily-predict-stats", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, querySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, stats: null },
      { status: 400 },
    );
  }

  const date = parsed.data.date || prevUtcRankDate();
  const stats = await loadPredictionStats({
    date,
    kind: parsed.data.kind || "tension-dir",
  });

  return NextResponse.json(
    {
      date,
      today: utcRankDate(),
      fetchedAt: new Date().toISOString(),
      stats,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
