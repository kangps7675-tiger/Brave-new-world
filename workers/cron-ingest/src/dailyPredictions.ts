/**
 * 일일 랭킹 예측 정산 + 읽기/쓰기 (게스트 deviceId).
 * upsertDailyRanks 직후 settlePredictions(rankDate) — 오늘 TOP1과 target_date=오늘 pick 비교.
 */

import { utcRankDate } from "./dailyRanks";

export type PredictKind = "theater" | "tension-dir";

const PREDICT_KINDS: PredictKind[] = ["theater", "tension-dir"];

const THEATER_IDS = new Set([
  "ukraine",
  "middle-east",
  "taiwan",
  "korea",
  "pacific",
  "atlantic",
  "arctic",
]);

function isValidPick(kind: PredictKind, pick: string): boolean {
  if (kind === "tension-dir") return pick === "up" || pick === "down";
  return THEATER_IDS.has(pick);
}

export type PredictionStatsRow = {
  target_date: string;
  kind: string;
  total: number;
  correct: number;
  correct_pct: number;
  winner_entity_id: string | null;
  resolved_at: string;
};

async function loadTop1EntityId(
  db: D1Database,
  rankDate: string,
  kind: PredictKind,
): Promise<string | null> {
  try {
    const row = await db
      .prepare(
        `SELECT entity_id FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind = ?2 AND rank = 1
         LIMIT 1`,
      )
      .bind(rankDate, kind)
      .first<{ entity_id: string }>();
    return row?.entity_id ? String(row.entity_id) : null;
  } catch {
    return null;
  }
}

/**
 * targetDate(=방금 upsert한 rankDate) 예측을 TOP1과 대조해 stats upsert.
 * 랭킹이 아직 없으면 skip.
 */
export async function settlePredictions(
  db: D1Database,
  targetDate: string,
): Promise<{ kind: PredictKind; total: number; correct: number }[]> {
  const resolvedAt = new Date().toISOString();
  const out: { kind: PredictKind; total: number; correct: number }[] = [];

  for (const kind of PREDICT_KINDS) {
    if (kind === "tension-dir") {
      try {
        const { settleTensionDir } = await import("./dailyPrompts");
        const result = await settleTensionDir(db, targetDate);
        if (result) out.push({ kind, total: result.total, correct: result.correct });
      } catch (error) {
        console.warn(
          "[predict] tension-dir settle skipped:",
          error instanceof Error ? error.message : error,
        );
      }
      continue;
    }

    const winner = await loadTop1EntityId(db, targetDate, kind);
    if (!winner) continue;

    let total = 0;
    let correct = 0;
    try {
      const countRow = await db
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN pick_entity_id = ?1 THEN 1 ELSE 0 END) AS correct
           FROM daily_rank_predictions
           WHERE target_date = ?2 AND kind = ?3`,
        )
        .bind(winner, targetDate, kind)
        .first<{ total: number; correct: number | null }>();
      total = Number(countRow?.total) || 0;
      correct = Number(countRow?.correct) || 0;
    } catch {
      // table missing on first deploy
      continue;
    }

    if (total === 0) {
      // still record winner so UI can show "집계 중" vs empty day
      out.push({ kind, total: 0, correct: 0 });
      continue;
    }

    const correctPct = Math.round((correct / total) * 1000) / 10;
    try {
      await db
        .prepare(
          `INSERT INTO daily_prediction_stats (
             target_date, kind, total, correct, correct_pct, winner_entity_id, resolved_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT(target_date, kind) DO UPDATE SET
             total = excluded.total,
             correct = excluded.correct,
             correct_pct = excluded.correct_pct,
             winner_entity_id = excluded.winner_entity_id,
             resolved_at = excluded.resolved_at`,
        )
        .bind(targetDate, kind, total, correct, correctPct, winner, resolvedAt)
        .run();
    } catch (error) {
      console.warn(
        "[predict] settle skipped:",
        error instanceof Error ? error.message : error,
      );
      continue;
    }
    out.push({ kind, total, correct });
  }

  return out;
}

export async function upsertPrediction(
  db: D1Database,
  input: {
    targetDate: string;
    kind: PredictKind;
    deviceId: string;
    pickEntityId: string;
  },
): Promise<{ ok: true; createdAt: string } | { ok: false; error: string }> {
  if (!isValidPick(input.kind, input.pickEntityId)) {
    return { ok: false, error: "invalid pick" };
  }
  const createdAt = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO daily_rank_predictions (
           target_date, kind, device_id, pick_entity_id, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(target_date, kind, device_id) DO UPDATE SET
           pick_entity_id = excluded.pick_entity_id,
           created_at = excluded.created_at`,
      )
      .bind(
        input.targetDate,
        input.kind,
        input.deviceId,
        input.pickEntityId,
        createdAt,
      )
      .run();
    return { ok: true, createdAt };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "upsert failed",
    };
  }
}

export async function readPredictionStats(
  db: D1Database,
  options: { date?: string; kind?: PredictKind } = {},
): Promise<PredictionStatsRow | null> {
  const targetDate = options.date || utcRankDate();
  const kind = options.kind || "tension-dir";
  try {
    const row = await db
      .prepare(
        `SELECT target_date, kind, total, correct, correct_pct,
                winner_entity_id, resolved_at
         FROM daily_prediction_stats
         WHERE target_date = ?1 AND kind = ?2
         LIMIT 1`,
      )
      .bind(targetDate, kind)
      .first<PredictionStatsRow>();
    return row ?? null;
  } catch {
    return null;
  }
}

export async function readPredictionForDevice(
  db: D1Database,
  options: { targetDate: string; kind: PredictKind; deviceId: string },
): Promise<{ pick_entity_id: string; created_at: string } | null> {
  try {
    const row = await db
      .prepare(
        `SELECT pick_entity_id, created_at FROM daily_rank_predictions
         WHERE target_date = ?1 AND kind = ?2 AND device_id = ?3
         LIMIT 1`,
      )
      .bind(options.targetDate, options.kind, options.deviceId)
      .first<{ pick_entity_id: string; created_at: string }>();
    return row ?? null;
  } catch {
    return null;
  }
}
