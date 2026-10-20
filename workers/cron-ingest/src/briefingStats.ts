/**
 * LLM 없이 D1 라이브 관측으로 일/주/월 브리핑 통계·샘플을 쌓는다.
 * - 매 ingest: 오늘 daily-* upsert (카운트 + 핫 샘플)
 * - weekly/monthly는 daily 합산 rollup
 * - 날짜가 바뀌면 새 period_key 행이 생기고, 이전 daily 행은 아카이브로 남음
 */

export type BriefingStatsRow = {
  period_key: string;
  tier: string;
  gdelt_count: number;
  firms_count: number;
  telegram_count: number;
  news_item_count: number;
  top_gdelt_tag: string | null;
  top_telegram_region: string | null;
  detail_json: string | null;
  window_start: string | null;
  window_end: string | null;
  updated_at: string;
};

export type BriefingDetailPayload = {
  source: string;
  days?: number;
  gdeltSamples?: Array<{ name: string; queryTag: string | null }>;
  telegramSamples?: Array<{ region: string; text: string }>;
  gdeltTagCounts?: Array<{ tag: string; c: number }>;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: d.getUTCFullYear(), week };
}

export function dailyKey(date: Date = new Date()): string {
  return `daily-${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function weeklyKey(date: Date = new Date()): string {
  const { year, week } = isoWeek(date);
  return `weekly-${year}-W${pad2(week)}`;
}

export function monthlyKey(date: Date = new Date()): string {
  return `monthly-${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

async function countTable(db: D1Database, table: string): Promise<number> {
  try {
    const row = await db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).first<{ c: number }>();
    return row?.c ?? 0;
  } catch {
    return 0;
  }
}

async function topTag(db: D1Database, sql: string): Promise<string | null> {
  try {
    const row = await db.prepare(sql).first<{ tag: string | null; c: number }>();
    return row?.tag ?? null;
  } catch {
    return null;
  }
}

async function collectDetail(db: D1Database): Promise<BriefingDetailPayload> {
  const gdeltSamples: BriefingDetailPayload["gdeltSamples"] = [];
  const telegramSamples: BriefingDetailPayload["telegramSamples"] = [];
  const gdeltTagCounts: BriefingDetailPayload["gdeltTagCounts"] = [];

  try {
    const { results } = await db
      .prepare(
        `SELECT name, query_tag AS queryTag FROM gdelt_points
         WHERE name IS NOT NULL AND name != ''
         ORDER BY COALESCE(mention_count, 0) DESC
         LIMIT 5`,
      )
      .all<{ name: string; queryTag: string | null }>();
    for (const row of results ?? []) {
      gdeltSamples.push({
        name: String(row.name).slice(0, 120),
        queryTag: row.queryTag,
      });
    }
  } catch {
    // ignore
  }

  try {
    const { results } = await db
      .prepare(
        `SELECT region, text FROM telegram_alerts
         WHERE text IS NOT NULL AND text != ''
         ORDER BY received_at DESC
         LIMIT 4`,
      )
      .all<{ region: string; text: string }>();
    for (const row of results ?? []) {
      telegramSamples.push({
        region: row.region || "global",
        text: String(row.text).replace(/\s+/g, " ").trim().slice(0, 160),
      });
    }
  } catch {
    // ignore
  }

  try {
    const { results } = await db
      .prepare(
        `SELECT query_tag AS tag, COUNT(*) AS c FROM gdelt_points
         WHERE query_tag IS NOT NULL AND query_tag != ''
         GROUP BY query_tag ORDER BY c DESC LIMIT 5`,
      )
      .all<{ tag: string; c: number }>();
    for (const row of results ?? []) {
      gdeltTagCounts.push({ tag: row.tag, c: Number(row.c) || 0 });
    }
  } catch {
    // ignore
  }

  return {
    source: "d1-live-snapshot",
    gdeltSamples,
    telegramSamples,
    gdeltTagCounts,
  };
}

async function upsertStats(db: D1Database, row: BriefingStatsRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO briefing_period_stats (
        period_key, tier, gdelt_count, firms_count, telegram_count, news_item_count,
        top_gdelt_tag, top_telegram_region, detail_json, window_start, window_end, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(period_key) DO UPDATE SET
        gdelt_count = excluded.gdelt_count,
        firms_count = excluded.firms_count,
        telegram_count = excluded.telegram_count,
        news_item_count = excluded.news_item_count,
        top_gdelt_tag = excluded.top_gdelt_tag,
        top_telegram_region = excluded.top_telegram_region,
        detail_json = excluded.detail_json,
        window_start = excluded.window_start,
        window_end = excluded.window_end,
        updated_at = excluded.updated_at`,
    )
    .bind(
      row.period_key,
      row.tier,
      row.gdelt_count,
      row.firms_count,
      row.telegram_count,
      row.news_item_count,
      row.top_gdelt_tag,
      row.top_telegram_region,
      row.detail_json,
      row.window_start,
      row.window_end,
      row.updated_at,
    )
    .run();
}

async function sumDailyPrefix(
  db: D1Database,
  likePrefix: string,
): Promise<{
  gdelt: number;
  firms: number;
  telegram: number;
  news: number;
  days: number;
}> {
  try {
    const row = await db
      .prepare(
        `SELECT
           COALESCE(SUM(gdelt_count), 0) AS gdelt,
           COALESCE(SUM(firms_count), 0) AS firms,
           COALESCE(SUM(telegram_count), 0) AS telegram,
           COALESCE(SUM(news_item_count), 0) AS news,
           COUNT(*) AS days
         FROM briefing_period_stats
         WHERE period_key LIKE ? AND tier = 'daily'`,
      )
      .bind(likePrefix)
      .first<{ gdelt: number; firms: number; telegram: number; news: number; days: number }>();
    return {
      gdelt: row?.gdelt ?? 0,
      firms: row?.firms ?? 0,
      telegram: row?.telegram ?? 0,
      news: row?.news ?? 0,
      days: row?.days ?? 0,
    };
  } catch {
    return { gdelt: 0, firms: 0, telegram: 0, news: 0, days: 0 };
  }
}

/** Cron 끝에서 호출 — daily 스냅샷 + 현재 주/월 rollup */
export async function upsertBriefingPeriodStats(db: D1Database): Promise<{
  dailyKey: string;
  weeklyKey: string;
  monthlyKey: string;
}> {
  const now = new Date();
  const updatedAt = now.toISOString();
  const dKey = dailyKey(now);
  const wKey = weeklyKey(now);
  const mKey = monthlyKey(now);

  const gdelt = await countTable(db, "gdelt_points");
  const firms = await countTable(db, "firms_fires");
  const telegram = await countTable(db, "telegram_alerts");
  const news = await countTable(db, "news_stream_items");
  const topGdelt = await topTag(
    db,
    `SELECT query_tag AS tag, COUNT(*) AS c FROM gdelt_points
     WHERE query_tag IS NOT NULL AND query_tag != ''
     GROUP BY query_tag ORDER BY c DESC LIMIT 1`,
  );
  const topTg = await topTag(
    db,
    `SELECT region AS tag, COUNT(*) AS c FROM telegram_alerts
     WHERE region IS NOT NULL AND region != ''
     GROUP BY region ORDER BY c DESC LIMIT 1`,
  );
  const detail = await collectDetail(db);

  const dayStart = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}T00:00:00.000Z`;

  await upsertStats(db, {
    period_key: dKey,
    tier: "daily",
    gdelt_count: gdelt,
    firms_count: firms,
    telegram_count: telegram,
    news_item_count: news,
    top_gdelt_tag: topGdelt,
    top_telegram_region: topTg,
    detail_json: JSON.stringify(detail),
    window_start: dayStart,
    window_end: updatedAt,
    updated_at: updatedAt,
  });

  const weekDays: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    if (weeklyKey(d) === wKey) weekDays.push(dailyKey(d));
  }
  let wG = 0;
  let wF = 0;
  let wT = 0;
  let wN = 0;
  let wDays = 0;
  for (const key of weekDays) {
    try {
      const row = await db
        .prepare(
          `SELECT gdelt_count, firms_count, telegram_count, news_item_count
           FROM briefing_period_stats WHERE period_key = ?`,
        )
        .bind(key)
        .first<{
          gdelt_count: number;
          firms_count: number;
          telegram_count: number;
          news_item_count: number;
        }>();
      if (!row) continue;
      wG += row.gdelt_count;
      wF += row.firms_count;
      wT += row.telegram_count;
      wN += row.news_item_count;
      wDays += 1;
    } catch {
      // ignore
    }
  }

  await upsertStats(db, {
    period_key: wKey,
    tier: "weekly",
    gdelt_count: wG,
    firms_count: wF,
    telegram_count: wT,
    news_item_count: wN,
    top_gdelt_tag: topGdelt,
    top_telegram_region: topTg,
    detail_json: JSON.stringify({ ...detail, source: "daily-rollup", days: wDays }),
    window_start: weekDays[weekDays.length - 1] ?? null,
    window_end: updatedAt,
    updated_at: updatedAt,
  });

  const monthPrefix = `daily-${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-%`;
  const monthSum = await sumDailyPrefix(db, monthPrefix);
  await upsertStats(db, {
    period_key: mKey,
    tier: "monthly",
    gdelt_count: monthSum.gdelt,
    firms_count: monthSum.firms,
    telegram_count: monthSum.telegram,
    news_item_count: monthSum.news,
    top_gdelt_tag: topGdelt,
    top_telegram_region: topTg,
    detail_json: JSON.stringify({
      ...detail,
      source: "daily-rollup",
      days: monthSum.days,
    }),
    window_start: `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-01`,
    window_end: updatedAt,
    updated_at: updatedAt,
  });

  // 2026-08-07: daily tier 90일 롤링 삭제를 중단한다.
  // 일별 행은 연 365개로 무시할 수준이고, 이 시계열이 컨버전스 베이스라인과
  // 과거 적중률의 유일한 근거다. 한 번 지우면 원천 API가 과거를 돌려주지 않는다.
  // 되돌리려면 R2 아카이브를 먼저 붙일 것. (참고: workers/cron-ingest/src/db.ts pruneOldRows)

  return { dailyKey: dKey, weeklyKey: wKey, monthlyKey: mKey };
}

export async function readBriefingStats(
  db: D1Database,
  periodKey: string,
): Promise<BriefingStatsRow | null> {
  try {
    return await db
      .prepare(
        `SELECT period_key, tier, gdelt_count, firms_count, telegram_count, news_item_count,
                top_gdelt_tag, top_telegram_region, detail_json, window_start, window_end, updated_at
         FROM briefing_period_stats WHERE period_key = ?`,
      )
      .bind(periodKey)
      .first<BriefingStatsRow>();
  } catch {
    return null;
  }
}
