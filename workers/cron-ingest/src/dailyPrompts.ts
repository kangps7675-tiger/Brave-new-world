/**
 * 매일 동일 UP/DOWN 문제 출제 + 긴장도 방향 정산.
 * 질문은 지표(긴장도 점수)만 — 공습·인명 예측 프레임 금지.
 */

import { nextUtcRankDate, prevUtcRankDate, utcRankDate } from "./dailyRanks";

export type TensionDir = "up" | "down";

const SCORE_EPS = 0.5;

type RankLite = {
  entity_id: string;
  label_ko: string;
  label_en: string;
  kind: string;
  score: number;
  detail_json: string | null;
  rank: number;
};

function displayScore(row: RankLite): number {
  if (row.detail_json) {
    try {
      const d = JSON.parse(row.detail_json) as { displayScore?: number };
      if (typeof d.displayScore === "number" && Number.isFinite(d.displayScore)) {
        return Math.round(d.displayScore * 10) / 10;
      }
    } catch {
      /* ignore */
    }
  }
  return Math.round(Math.max(0, Number(row.score) || 0) * 10) / 10;
}

function hashPick(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, n);
}

async function loadCandidates(db: D1Database, rankDate: string): Promise<RankLite[]> {
  try {
    const { results } = await db
      .prepare(
        `SELECT entity_id, label_ko, label_en, kind, score, detail_json, rank
         FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind IN ('theater', 'chokepoint', 'world')
           AND rank <= 5
         ORDER BY
           CASE kind WHEN 'chokepoint' THEN 0 WHEN 'theater' THEN 1 ELSE 2 END,
           rank ASC`,
      )
      .bind(rankDate)
      .all<RankLite>();
    return results ?? [];
  } catch {
    return [];
  }
}

async function loadSubjectScore(
  db: D1Database,
  rankDate: string,
  subjectKind: string,
  subjectId: string,
): Promise<number | null> {
  try {
    const row = await db
      .prepare(
        `SELECT score, detail_json FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind = ?2 AND entity_id = ?3
         LIMIT 1`,
      )
      .bind(rankDate, subjectKind, subjectId)
      .first<{ score: number; detail_json: string | null }>();
    if (!row) return null;
    return displayScore({
      entity_id: subjectId,
      label_ko: "",
      label_en: "",
      kind: subjectKind,
      score: row.score,
      detail_json: row.detail_json,
      rank: 1,
    });
  } catch {
    return null;
  }
}

function buildQuestion(
  labelKo: string,
  labelEn: string,
  subjectKind: string,
): {
  questionKo: string;
  questionEn: string;
} {
  // 메인 문제 = WTI. 전장·초크포인트는 보너스 프레임.
  if (subjectKind === "world") {
    return {
      questionKo: "내일 이 시간, 세계 긴장도 지수(WTI)는 오를까 내릴까?",
      questionEn:
        "By this time tomorrow, will the World Tension Index (WTI) go UP or DOWN?",
    };
  }
  return {
    questionKo: `내일 이 시간, 「${labelKo}」 긴장도 지수는 오를까 내릴까? (보너스)`,
    questionEn: `By this time tomorrow, will the 「${labelEn}」 tension index go UP or DOWN? (bonus)`,
  };
}

/**
 * 오늘 랭킹 기준으로 내일(target=next) 문제 1개 upsert.
 * 이미 있으면 baseline만 갱신하지 않음(투표 중 문제 고정).
 */
export async function upsertTomorrowPrompt(
  db: D1Database,
  options: { rankDate?: string } = {},
): Promise<{ targetDate: string; subjectId: string } | null> {
  const rankDate = options.rankDate || utcRankDate();
  const targetDate = nextUtcRankDate(
    new Date(`${rankDate}T12:00:00.000Z`),
  );
  const createdAt = new Date().toISOString();

  try {
    const existing = await db
      .prepare(`SELECT subject_id FROM daily_prompts WHERE target_date = ?1 LIMIT 1`)
      .bind(targetDate)
      .first<{ subject_id: string }>();
    if (existing?.subject_id) {
      return { targetDate, subjectId: existing.subject_id };
    }
  } catch {
    // table may be missing pre-migrate
    return null;
  }

  const candidates = await loadCandidates(db, rankDate);
  if (candidates.length === 0) return null;

  // 메인 기축 = WTI(world/global). 없으면 전장·초크포인트 폴백(보너스).
  const world = candidates.find(
    (c) => c.kind === "world" && c.entity_id === "global",
  );
  const pick =
    world ??
    (() => {
      const hormuzIdx = candidates.findIndex((c) => c.entity_id === "choke-hormuz");
      const pool =
        hormuzIdx >= 0
          ? [candidates[hormuzIdx]!, ...candidates.filter((_, i) => i !== hormuzIdx)]
          : candidates;
      return pool[hashPick(targetDate, Math.min(pool.length, 6))]!;
    })();
  const baseline = displayScore(pick);
  const q = buildQuestion(pick.label_ko, pick.label_en, pick.kind);

  try {
    await db
      .prepare(
        `INSERT INTO daily_prompts (
           target_date, subject_kind, subject_id, label_ko, label_en,
           baseline_score, question_ko, question_en, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(target_date) DO NOTHING`,
      )
      .bind(
        targetDate,
        pick.kind,
        pick.entity_id,
        pick.label_ko,
        pick.label_en,
        baseline,
        q.questionKo,
        q.questionEn,
        createdAt,
      )
      .run();
    return { targetDate, subjectId: pick.entity_id };
  } catch (error) {
    console.warn(
      "[prompt] upsert skipped:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function readPrompt(
  db: D1Database,
  targetDate: string,
): Promise<{
  target_date: string;
  subject_kind: string;
  subject_id: string;
  label_ko: string;
  label_en: string;
  baseline_score: number;
  question_ko: string;
  question_en: string;
  created_at: string;
} | null> {
  try {
    return (
      (await db
        .prepare(`SELECT * FROM daily_prompts WHERE target_date = ?1 LIMIT 1`)
        .bind(targetDate)
        .first()) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * tension-dir 정산: baseline vs 정산일 점수 → up|down.
 * 동률(|Δ|<EPS)이면 winner null, 투표는 집계하되 적중 0.
 */
export async function settleTensionDir(
  db: D1Database,
  targetDate: string,
): Promise<{ total: number; correct: number; winner: TensionDir | null } | null> {
  const prompt = await readPrompt(db, targetDate);
  if (!prompt) return null;

  const live = await loadSubjectScore(
    db,
    targetDate,
    prompt.subject_kind,
    prompt.subject_id,
  );
  if (live == null) return null;

  const baseline = Number(prompt.baseline_score) || 0;
  const delta = live - baseline;
  let winner: TensionDir | null = null;
  if (delta > SCORE_EPS) winner = "up";
  else if (delta < -SCORE_EPS) winner = "down";

  const resolvedAt = new Date().toISOString();
  let total = 0;
  let correct = 0;

  try {
    if (winner) {
      const countRow = await db
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN pick_entity_id = ?1 THEN 1 ELSE 0 END) AS correct
           FROM daily_rank_predictions
           WHERE target_date = ?2 AND kind = 'tension-dir'`,
        )
        .bind(winner, targetDate)
        .first<{ total: number; correct: number | null }>();
      total = Number(countRow?.total) || 0;
      correct = Number(countRow?.correct) || 0;
    } else {
      const countRow = await db
        .prepare(
          `SELECT COUNT(*) AS total FROM daily_rank_predictions
           WHERE target_date = ?1 AND kind = 'tension-dir'`,
        )
        .bind(targetDate)
        .first<{ total: number }>();
      total = Number(countRow?.total) || 0;
      correct = 0;
    }
  } catch {
    return null;
  }

  const correctPct = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  try {
    await db
      .prepare(
        `INSERT INTO daily_prediction_stats (
           target_date, kind, total, correct, correct_pct, winner_entity_id, resolved_at
         ) VALUES (?1, 'tension-dir', ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(target_date, kind) DO UPDATE SET
           total = excluded.total,
           correct = excluded.correct,
           correct_pct = excluded.correct_pct,
           winner_entity_id = excluded.winner_entity_id,
           resolved_at = excluded.resolved_at`,
      )
      .bind(targetDate, total, correct, correctPct, winner, resolvedAt)
      .run();
  } catch (error) {
    console.warn(
      "[prompt] settle tension-dir skipped:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  return { total, correct, winner };
}

export { prevUtcRankDate };
