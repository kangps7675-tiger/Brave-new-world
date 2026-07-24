/**
 * 대만해협 living timeline — LLM 없이 GDELT taiwan-tension 휴리스틱 큐레이션.
 */

const CONFLICT_ID = "taiwan-strait";
const QUERY_TAG = "taiwan-tension";
const MAX_PER_DAY = 2;

type GdeltRow = {
  id: string;
  name: string | null;
  url: string | null;
  mention_count: number | null;
  ingested_at: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function utcDate(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function prevUtcDate(d: Date = new Date()): string {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() - 1);
  return utcDate(x);
}

function normalizeHeadline(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  t = t.replace(/^["'「『]+|["'」』]+$/g, "");
  if (t.length > 140) t = `${t.slice(0, 137)}…`;
  return t;
}

function headlinePair(name: string): { ko: string; en: string } {
  const base = normalizeHeadline(name);
  const ko =
    /[가-힣]/.test(base)
      ? base
      : `${base} (대만해협·자동 요약)`;
  const en =
    /[가-힣]/.test(base) && !/[A-Za-z]{3,}/.test(base)
      ? `Taiwan Strait signal · auto summary`
      : `${base} (Taiwan Strait · auto summary)`;
  return { ko, en };
}

function entryId(conflictId: string, entryDate: string, slot: number): string {
  return `${conflictId}-${entryDate}-${slot}`;
}

export type CurateLivingTaiwanResult = {
  conflictId: string;
  entryDate: string;
  upserted: number;
  skipped: boolean;
  reason?: string;
};

/**
 * 전일(UTC) taiwan-tension GDELT 상위 이벤트를 1~2줄로 upsert.
 * 실패해도 ingest는 계속 — 호출부에서 try/catch.
 */
export async function curateLivingTaiwan(db: D1Database): Promise<CurateLivingTaiwanResult> {
  const entryDate = prevUtcDate();
  const windowStart = `${entryDate}T00:00:00.000Z`;
  const windowEnd = `${utcDate()}T00:00:00.000Z`;

  const existing = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM living_timeline_entries
       WHERE conflict_id = ? AND entry_date = ?`,
    )
    .bind(CONFLICT_ID, entryDate)
    .first<{ c: number }>();

  if ((existing?.c ?? 0) >= MAX_PER_DAY) {
    return {
      conflictId: CONFLICT_ID,
      entryDate,
      upserted: 0,
      skipped: true,
      reason: "already-filled",
    };
  }

  const { results } = await db
    .prepare(
      `SELECT id, name, url, mention_count, ingested_at
       FROM gdelt_points
       WHERE query_tag = ?
         AND ingested_at >= ?
         AND ingested_at < ?
         AND name IS NOT NULL
         AND TRIM(name) != ''
       ORDER BY COALESCE(mention_count, 0) DESC, ingested_at DESC
       LIMIT 8`,
    )
    .bind(QUERY_TAG, windowStart, windowEnd)
    .all<GdeltRow>();

  const rows = results ?? [];
  if (rows.length === 0) {
    return {
      conflictId: CONFLICT_ID,
      entryDate,
      upserted: 0,
      skipped: true,
      reason: "no-gdelt",
    };
  }

  const seen = new Set<string>();
  const picks: GdeltRow[] = [];
  for (const row of rows) {
    const key = normalizeHeadline(row.name ?? "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    picks.push(row);
    if (picks.length >= MAX_PER_DAY) break;
  }

  const createdAt = new Date().toISOString();
  let upserted = 0;
  for (let i = 0; i < picks.length; i++) {
    const row = picks[i]!;
    const { ko, en } = headlinePair(row.name ?? "Taiwan Strait update");
    const urls = row.url ? [row.url] : [];
    const id = entryId(CONFLICT_ID, entryDate, i + 1);
    await db
      .prepare(
        `INSERT INTO living_timeline_entries
          (id, conflict_id, entry_date, headline_ko, headline_en, source_urls_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           headline_ko = excluded.headline_ko,
           headline_en = excluded.headline_en,
           source_urls_json = excluded.source_urls_json,
           created_at = excluded.created_at`,
      )
      .bind(
        id,
        CONFLICT_ID,
        entryDate,
        ko,
        en,
        urls.length ? JSON.stringify(urls) : null,
        createdAt,
      )
      .run();
    upserted += 1;
  }

  return {
    conflictId: CONFLICT_ID,
    entryDate,
    upserted,
    skipped: upserted === 0,
  };
}
