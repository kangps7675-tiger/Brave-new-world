import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { rateLimitKey } from "@/lib/auth/clientIdentity";
import {
  submitDailyPredict,
  THEATER_PREDICT_IDS,
  TENSION_DIR_PICKS,
} from "@/lib/dailyPredict";
import { nextUtcRankDate } from "@/lib/dailyPredictPrefs";
import { utcRankDate } from "@/lib/dailyRanks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 * 투표 조작(ballot stuffing) 완화
 *
 * deviceId 는 클라이언트가 만들어 localStorage 에 넣는 값이라 서버가 신뢰할 수
 * 없다 — 무한히 새로 만들어 통계를 왜곡할 수 있다. 게스트 UX(로그인 없음)를
 * 유지해야 하므로 deviceId 자체는 그대로 두고, **IP당 하루 제출 수**로 상한을
 * 건다. 한 가구/한 사무실에서 여러 명이 참여하는 경우를 고려해 여유를 뒀다.
 *
 * 프로세스 메모리 기반이라 인스턴스마다 독립적이다. 통계 무결성이 더 중요해지면
 * D1 에 (ip_hash, targetDate) 카운터를 두는 편이 정확하다.
 * ------------------------------------------------------------------ */
const MAX_SUBMITS_PER_IP_PER_DAY = 12;
const submitHits = new Map<string, { count: number; day: string }>();

function allowSubmit(ip: string, day: string): boolean {
  const row = submitHits.get(ip);
  if (!row || row.day !== day) {
    if (submitHits.size > 5000) submitHits.clear();
    submitHits.set(ip, { count: 1, day });
    return true;
  }
  if (row.count >= MAX_SUBMITS_PER_IP_PER_DAY) return false;
  row.count += 1;
  return true;
}

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

  const ip = rateLimitKey(request);
  if (!ip || !allowSubmit(ip, today)) {
    return NextResponse.json(
      { ok: false, error: "too many submissions today", rateLimited: true },
      { status: 429 },
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
