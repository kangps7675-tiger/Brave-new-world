/**
 * NAVAREA exercise (+ 선택 RSS 키워드) → military_exercises 정규화 upsert.
 * 항적 없이도 공시 라벨을 지도·자동 경보에 올린다.
 */

import { classifyNavareaSecurity } from "../../../src/lib/navareaSecurity";
import {
  inferActorsFromText,
  inferCoalition,
  rfGapNoteForActors,
  theaterFromExerciseCoords,
  type ExerciseActor,
} from "../../../src/lib/militaryExercises";
import type { IngestEnv } from "./env";
import { readIntVar } from "./db";

export type MilitaryExerciseRow = {
  id: string;
  title: string;
  summary: string | null;
  actors_json: string;
  coalition: string | null;
  theater: string | null;
  lat: number | null;
  lng: number | null;
  geojson: string | null;
  starts_at: string | null;
  ends_at: string | null;
  announced_at: string | null;
  confidence: string;
  sources_json: string;
  rf_gap_note: string | null;
  active: number;
  ingested_at: string;
};

type NavareaDbRow = {
  id: string;
  region: string;
  source: string;
  warning_date: string;
  area_hint: string | null;
  description: string;
  geometry_type: string;
  geojson: string;
  radius_nm: number | null;
  lat: number | null;
  lng: number | null;
};

async function shouldPoll(db: D1Database, minMinutes: number): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT MAX(ingested_at) AS last FROM military_exercises`)
      .first<{ last: string | null }>();
    const last = row?.last;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return Date.now() - lastMs >= minMinutes * 60 * 1000;
  } catch {
    return true;
  }
}

async function batchRun(db: D1Database, stmts: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < stmts.length; i += 40) {
    await db.batch(stmts.slice(i, i + 40));
  }
}

function titleFromNavarea(row: NavareaDbRow): string {
  const hint = (row.area_hint || "").trim();
  if (hint) return `NAVAREA ${row.region} · ${hint}`;
  return `NAVAREA ${row.region} · ${row.id} · military exercise`;
}

function navareaToExercise(row: NavareaDbRow, ingestedAt: string): MilitaryExerciseRow | null {
  const kind = classifyNavareaSecurity({
    description: row.description,
    areaHint: row.area_hint ?? "",
  });
  if (kind !== "exercise") return null;

  const blob = `${row.area_hint ?? ""}\n${row.description}`;
  const actors = inferActorsFromText(blob) as ExerciseActor[];
  const theater =
    theaterFromExerciseCoords(row.lat, row.lng) ??
    (row.region === "XI" ? "japan" : null);

  return {
    id: `navarea-ex-${row.id}`,
    title: titleFromNavarea(row),
    summary: row.description.slice(0, 1200),
    actors_json: JSON.stringify(actors),
    coalition: inferCoalition(actors),
    theater,
    lat: row.lat,
    lng: row.lng,
    geojson: row.geojson,
    starts_at: row.warning_date || null,
    ends_at: null,
    announced_at: row.warning_date || ingestedAt,
    confidence: "announced",
    sources_json: JSON.stringify([
      {
        name: `NAVAREA ${row.region} (${row.source})`,
        official: true,
      },
    ]),
    rf_gap_note: rfGapNoteForActors(actors, "ko"),
    active: 1,
    ingested_at: ingestedAt,
  };
}

async function loadNavareaRows(db: D1Database): Promise<NavareaDbRow[]> {
  try {
    const res = await db
      .prepare(
        `SELECT id, region, source, warning_date, area_hint, description,
                geometry_type, geojson, radius_nm, lat, lng
         FROM navarea_features
         ORDER BY warning_date DESC
         LIMIT 400`,
      )
      .all<NavareaDbRow>();
    return res.results ?? [];
  } catch {
    return [];
  }
}

async function upsertExercises(db: D1Database, rows: MilitaryExerciseRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const stmts = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO military_exercises (
           id, title, summary, actors_json, coalition, theater,
           lat, lng, geojson, starts_at, ends_at, announced_at,
           confidence, sources_json, rf_gap_note, active, ingested_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           summary = excluded.summary,
           actors_json = excluded.actors_json,
           coalition = excluded.coalition,
           theater = excluded.theater,
           lat = excluded.lat,
           lng = excluded.lng,
           geojson = excluded.geojson,
           starts_at = excluded.starts_at,
           announced_at = excluded.announced_at,
           confidence = excluded.confidence,
           sources_json = excluded.sources_json,
           rf_gap_note = excluded.rf_gap_note,
           active = excluded.active,
           ingested_at = excluded.ingested_at`,
      )
      .bind(
        row.id,
        row.title,
        row.summary,
        row.actors_json,
        row.coalition,
        row.theater,
        row.lat,
        row.lng,
        row.geojson,
        row.starts_at,
        row.ends_at,
        row.announced_at,
        row.confidence,
        row.sources_json,
        row.rf_gap_note,
        row.active,
        row.ingested_at,
      ),
  );
  await batchRun(db, stmts);
  return rows.length;
}

/** NAVAREA에 없는 navarea-ex-* 는 inactive */
async function deactivateStaleNavareaExercises(
  db: D1Database,
  keepIds: Set<string>,
): Promise<void> {
  try {
    const existing = await db
      .prepare(
        `SELECT id FROM military_exercises WHERE id LIKE 'navarea-ex-%' AND active = 1`,
      )
      .all<{ id: string }>();
    const stale = (existing.results ?? []).filter((r) => !keepIds.has(r.id));
    if (stale.length === 0) return;
    const stmts = stale.map((r) =>
      db.prepare(`UPDATE military_exercises SET active = 0 WHERE id = ?`).bind(r.id),
    );
    await batchRun(db, stmts);
  } catch {
    /* ignore */
  }
}

/**
 * 간단 RSS 키워드 슬라이스 — news_stream_items 가 있을 때만.
 * unverified 로 적재 (관영 화이트리스트 승격은 추후 — docs/exercise-alerts.md · deferred-status.md).
 */
async function ingestNewsKeywordExercises(
  db: D1Database,
  ingestedAt: string,
): Promise<number> {
  try {
    const res = await db
      .prepare(
        `SELECT id, title, link, source, pub_date, theater, summary
         FROM news_stream_items
         WHERE lower(title) LIKE '%exercise%'
            OR lower(title) LIKE '%drill%'
            OR lower(title) LIKE '%live fire%'
            OR title LIKE '%군사훈련%'
            OR title LIKE '%연합훈련%'
            OR title LIKE '%联合演习%'
         ORDER BY pub_date DESC
         LIMIT 40`,
      )
      .all<{
        id: string;
        title: string;
        link: string | null;
        source: string | null;
        pub_date: string | null;
        theater: string | null;
        summary: string | null;
      }>();
    const rows: MilitaryExerciseRow[] = [];
    for (const item of res.results ?? []) {
      const blob = `${item.title}\n${item.summary ?? ""}`;
      const actors = inferActorsFromText(blob);
      rows.push({
        id: `news-ex-${item.id}`.slice(0, 180),
        title: item.title.slice(0, 200),
        summary: (item.summary || item.title).slice(0, 1200),
        actors_json: JSON.stringify(actors),
        coalition: inferCoalition(actors),
        theater: item.theater,
        lat: null,
        lng: null,
        geojson: null,
        starts_at: item.pub_date,
        ends_at: null,
        announced_at: item.pub_date || ingestedAt,
        confidence: "unverified",
        sources_json: JSON.stringify([
          {
            name: item.source || "RSS",
            url: item.link || undefined,
            official: false,
          },
        ]),
        rf_gap_note: rfGapNoteForActors(actors, "ko"),
        active: 1,
        ingested_at: ingestedAt,
      });
    }
    return upsertExercises(db, rows);
  } catch {
    return 0;
  }
}

export async function fetchAndUpsertMilitaryExercises(env: IngestEnv): Promise<{
  count: number;
  fromNavarea: number;
  fromNews: number;
  errors: string[];
  skipped: boolean;
}> {
  const enabled = (env.MILITARY_EXERCISE_INGEST_ENABLED ?? "true").trim().toLowerCase();
  if (enabled === "0" || enabled === "false" || enabled === "off") {
    return { count: 0, fromNavarea: 0, fromNews: 0, errors: [], skipped: true };
  }

  const minInterval = Math.max(10, readIntVar(env.MILITARY_EXERCISE_POLL_MIN_INTERVAL_MINUTES, 20));
  if (!(await shouldPoll(env.DB, minInterval))) {
    return { count: 0, fromNavarea: 0, fromNews: 0, errors: [], skipped: true };
  }

  const errors: string[] = [];
  const ingestedAt = new Date().toISOString();
  let fromNavarea = 0;
  let fromNews = 0;

  try {
    const navRows = await loadNavareaRows(env.DB);
    const exercises = navRows
      .map((r) => navareaToExercise(r, ingestedAt))
      .filter((r): r is MilitaryExerciseRow => Boolean(r));
    fromNavarea = await upsertExercises(env.DB, exercises);
    await deactivateStaleNavareaExercises(
      env.DB,
      new Set(exercises.map((e) => e.id)),
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "navarea→exercise failed");
  }

  try {
    fromNews = await ingestNewsKeywordExercises(env.DB, ingestedAt);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "news→exercise failed");
  }

  return {
    count: fromNavarea + fromNews,
    fromNavarea,
    fromNews,
    errors: errors.slice(0, 6),
    skipped: false,
  };
}
