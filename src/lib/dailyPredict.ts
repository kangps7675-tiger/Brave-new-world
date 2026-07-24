import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyPredictionStats, dailyRankPredictions } from "@/db/schema";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export type PredictKind = "theater" | "tension-dir";

/** Cron 전장 id와 동기 — 허용 픽 화이트리스트 */
export const THEATER_PREDICT_IDS = [
  "ukraine",
  "middle-east",
  "taiwan",
  "korea",
  "pacific",
  "atlantic",
  "arctic",
] as const;

export const TENSION_DIR_PICKS = ["up", "down"] as const;

export type DailyPredictionStats = {
  targetDate: string;
  kind: PredictKind;
  total: number;
  correct: number;
  correctPct: number;
  winnerEntityId: string | null;
  resolvedAt: string;
};

export type DailyPredictResult = {
  ok: boolean;
  createdAt?: string;
  source?: "d1" | "ingest-worker" | "stub";
  error?: string;
};

function isValidPick(kind: PredictKind, id: string): boolean {
  if (kind === "tension-dir") {
    return (TENSION_DIR_PICKS as readonly string[]).includes(id);
  }
  return (THEATER_PREDICT_IDS as readonly string[]).includes(id);
}

function normalizeKind(kind: string | undefined): PredictKind {
  return kind === "tension-dir" ? "tension-dir" : "theater";
}

export async function upsertDailyPredictLocal(input: {
  targetDate: string;
  kind: PredictKind;
  deviceId: string;
  pickEntityId: string;
}): Promise<DailyPredictResult> {
  if (!isValidPick(input.kind, input.pickEntityId)) {
    return { ok: false, error: "invalid pick" };
  }
  const createdAt = new Date().toISOString();
  try {
    const db = await getDb();
    await db
      .insert(dailyRankPredictions)
      .values({
        targetDate: input.targetDate,
        kind: input.kind,
        deviceId: input.deviceId,
        pickEntityId: input.pickEntityId,
        createdAt,
      })
      .onConflictDoUpdate({
        target: [
          dailyRankPredictions.targetDate,
          dailyRankPredictions.kind,
          dailyRankPredictions.deviceId,
        ],
        set: {
          pickEntityId: input.pickEntityId,
          createdAt,
        },
      });
    return { ok: true, createdAt, source: "d1" };
  } catch {
    return { ok: false, error: "d1 unavailable" };
  }
}

export async function upsertDailyPredictViaWorker(input: {
  targetDate: string;
  kind: PredictKind;
  deviceId: string;
  pickEntityId: string;
}): Promise<DailyPredictResult> {
  const base = ingestWorkerBase();
  if (!base) return { ok: false, error: "no ingest worker" };
  try {
    const secret = process.env.INGEST_CRON_SECRET?.trim();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(`${base}/daily-predict`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: body?.error || `worker ${res.status}` };
    }
    const body = (await res.json()) as { createdAt?: string };
    return { ok: true, createdAt: body.createdAt, source: "ingest-worker" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "worker failed",
    };
  }
}

export async function submitDailyPredict(input: {
  targetDate: string;
  kind: PredictKind;
  deviceId: string;
  pickEntityId: string;
}): Promise<DailyPredictResult> {
  const local = await upsertDailyPredictLocal(input);
  if (local.ok) return local;
  return upsertDailyPredictViaWorker(input);
}

export async function readPredictionStatsFromD1(options: {
  date: string;
  kind?: PredictKind;
}): Promise<DailyPredictionStats | null> {
  const kind = options.kind || "tension-dir";
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(dailyPredictionStats)
      .where(
        and(
          eq(dailyPredictionStats.targetDate, options.date),
          eq(dailyPredictionStats.kind, kind),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      targetDate: row.targetDate,
      kind: normalizeKind(row.kind),
      total: Number(row.total) || 0,
      correct: Number(row.correct) || 0,
      correctPct: Number(row.correctPct) || 0,
      winnerEntityId: row.winnerEntityId,
      resolvedAt: row.resolvedAt,
    };
  } catch {
    return null;
  }
}

export async function readPredictionStatsFromWorker(options: {
  date: string;
  kind?: PredictKind;
}): Promise<DailyPredictionStats | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  const kind = options.kind || "tension-dir";
  try {
    const qs = new URLSearchParams({ date: options.date, kind });
    const res = await fetch(`${base}/daily-prediction-stats?${qs}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      stats?: {
        targetDate: string;
        kind: string;
        total: number;
        correct: number;
        correctPct: number;
        winnerEntityId: string | null;
        resolvedAt: string;
      } | null;
    };
    if (!payload.stats) return null;
    return {
      targetDate: payload.stats.targetDate,
      kind: normalizeKind(payload.stats.kind),
      total: Number(payload.stats.total) || 0,
      correct: Number(payload.stats.correct) || 0,
      correctPct: Number(payload.stats.correctPct) || 0,
      winnerEntityId: payload.stats.winnerEntityId,
      resolvedAt: payload.stats.resolvedAt,
    };
  } catch {
    return null;
  }
}

/**
 * 예측 1:1 맞대결용 — 같은 날짜·kind에서 나를 제외한 임의의 다른 deviceId 픽 하나.
 * 실시간 매칭이 아니라 "이미 쌓인 픽 풀에서 랜덤 상대" — 새 인프라 없이 기존 테이블만 읽는다.
 */
export async function readOpponentPickFromD1(options: {
  date: string;
  kind: PredictKind;
  excludeDeviceId: string;
}): Promise<string | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ pickEntityId: dailyRankPredictions.pickEntityId })
      .from(dailyRankPredictions)
      .where(
        and(
          eq(dailyRankPredictions.targetDate, options.date),
          eq(dailyRankPredictions.kind, options.kind),
          ne(dailyRankPredictions.deviceId, options.excludeDeviceId),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return rows[0]?.pickEntityId ?? null;
  } catch {
    return null;
  }
}

export async function loadPredictionStats(options: {
  date: string;
  kind?: PredictKind;
}): Promise<DailyPredictionStats | null> {
  const fromD1 = await readPredictionStatsFromD1(options);
  if (fromD1) return fromD1;
  return readPredictionStatsFromWorker(options);
}
