import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import { listDailyRankDates, utcRankDate } from "@/lib/dailyRanks";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(366).optional(),
});

/**
 * 일별 랭크가 존재하는 UTC 날짜 목록 (최신→과거).
 * TimeScrubber가 빈날을 건너뛰도록 한다.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("daily-ranks-dates", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, querySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, dates: [] },
      { status: 400 },
    );
  }

  const payload = await listDailyRankDates({
    from: parsed.data.from,
    to: parsed.data.to || utcRankDate(),
    limit: parsed.data.limit ?? 120,
  });

  return NextResponse.json({
    ...payload,
    today: utcRankDate(),
    fetchedAt: new Date().toISOString(),
  }, { headers: publicCacheHeaders(CDN_CACHE.briefing) });
}
