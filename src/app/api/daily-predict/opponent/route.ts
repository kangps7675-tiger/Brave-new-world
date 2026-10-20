import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import { readOpponentPickFromD1 } from "@/lib/dailyPredict";
import { prevUtcRankDate } from "@/lib/dailyPredictPrefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  kind: z.enum(["theater", "tension-dir"]).optional(),
  deviceId: z.string().min(8).max(80),
});

/**
 * 예측 1:1 맞대결 — 같은 날짜·kind에서 나를 뺀 임의의 다른 deviceId 픽 하나를 돌려준다.
 * 정산된 과거 날짜(기본 어제)에만 의미 있음. 새 테이블 없이 daily_rank_predictions만 읽는다.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("daily-predict-opponent", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, querySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, opponentPick: null },
      { status: 400 },
    );
  }

  const date = parsed.data.date || prevUtcRankDate();
  const kind = parsed.data.kind || "tension-dir";
  const opponentPick = await readOpponentPickFromD1({
    date,
    kind,
    excludeDeviceId: parsed.data.deviceId,
  });

  return NextResponse.json(
    { date, kind, opponentPick },
    { headers: { "Cache-Control": "no-store" } },
  );
}
