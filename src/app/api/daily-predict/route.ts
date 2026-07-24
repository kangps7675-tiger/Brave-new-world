import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import {
  submitDailyPredict,
  THEATER_PREDICT_IDS,
  TENSION_DIR_PICKS,
} from "@/lib/dailyPredict";
import { nextUtcRankDate } from "@/lib/dailyPredictPrefs";
import { utcRankDate } from "@/lib/dailyRanks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  kind: z.enum(["theater", "tension-dir"]).default("tension-dir"),
  pickEntityId: z.string().min(1).max(64),
  deviceId: z.string().min(8).max(80),
});

/**
 * 게스트 일일 예측 upsert.
 * - tension-dir: up|down (내일의 긴장도)
 * - theater: 전장 1위 고르기 (레거시)
 */
export async function POST(request: Request) {
  const stub = apiStubResponse("daily-predict", request);
  if (stub) return stub;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const kind = parsed.data.kind;
  const pick = parsed.data.pickEntityId;
  const pickOk =
    kind === "tension-dir"
      ? (TENSION_DIR_PICKS as readonly string[]).includes(pick)
      : (THEATER_PREDICT_IDS as readonly string[]).includes(pick);
  if (!pickOk) {
    return NextResponse.json({ ok: false, error: "invalid pick" }, { status: 400 });
  }

  const today = utcRankDate();
  const tomorrow = nextUtcRankDate();
  const targetDate = parsed.data.targetDate || tomorrow;
  if (targetDate !== today && targetDate !== tomorrow) {
    return NextResponse.json(
      { ok: false, error: "targetDate out of window" },
      { status: 400 },
    );
  }

  const result = await submitDailyPredict({
    targetDate,
    kind,
    deviceId: parsed.data.deviceId,
    pickEntityId: pick,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "submit failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    targetDate,
    kind,
    pickEntityId: pick,
    createdAt: result.createdAt,
    source: result.source,
  });
}
