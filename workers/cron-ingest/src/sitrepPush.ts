/**
 * sitrep_events → Web Push 배달.
 * 변화 없는 날은 보내지 않음. 같은 UTC 날짜는 1회만.
 */

import { utcRankDate } from "./dailyRanks";
import type { IngestEnv } from "./env";
import { broadcastPush, type PushSendResult } from "./push";

export type SitrepPushDigestResult = {
  skipped: boolean;
  reason?: string;
  rankDate?: string;
  eventCount?: number;
  ko?: PushSendResult;
  en?: PushSendResult;
};

type SitrepRow = {
  message_ko: string;
  message_en: string;
  entity_id: string;
  event_type: string;
};

async function ensureSitrepPushSentTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS sitrep_push_sent (
         rank_date TEXT PRIMARY KEY,
         sent_at TEXT NOT NULL,
         event_count INTEGER NOT NULL DEFAULT 0,
         detail_json TEXT
       )`,
    )
    .run();
}

async function loadTodaySitrepEvents(
  db: D1Database,
  rankDate: string,
): Promise<SitrepRow[]> {
  try {
    const res = await db
      .prepare(
        `SELECT message_ko, message_en, entity_id, event_type
         FROM sitrep_events
         WHERE rank_date = ?
         ORDER BY id DESC
         LIMIT 8`,
      )
      .bind(rankDate)
      .all<SitrepRow>();
    return res.results ?? [];
  } catch {
    return [];
  }
}

function buildBody(messages: string[], emptyFallback: string): string {
  const lines = messages.map((m) => m.trim()).filter(Boolean);
  if (lines.length === 0) return emptyFallback;
  if (lines.length === 1) return lines[0]!;
  return lines
    .slice(0, 4)
    .map((l) => `· ${l}`)
    .join("\n");
}

/**
 * 오늘 sitrep 변화가 있으면 구독자에게 푸시.
 * - 이벤트 0건 → skip (아무 일도 없었다)
 * - 이미 오늘 보냄 → skip
 */
export async function dispatchSitrepDigestPush(
  env: IngestEnv,
): Promise<SitrepPushDigestResult> {
  const rankDate = utcRankDate();
  await ensureSitrepPushSentTable(env.DB);

  const events = await loadTodaySitrepEvents(env.DB, rankDate);
  if (events.length === 0) {
    return { skipped: true, reason: "no-sitrep-changes", rankDate, eventCount: 0 };
  }

  // 먼저 클레임해 동시 cron 이중 발송 방지. VAPID 불가 시에만 롤백.
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO sitrep_push_sent (rank_date, sent_at, event_count)
     VALUES (?, datetime('now'), ?)`,
  )
    .bind(rankDate, events.length)
    .run();
  const changes = (claim.meta as { changes?: number } | undefined)?.changes ?? 0;
  if (changes === 0) {
    return { skipped: true, reason: "already-sent-today", rankDate, eventCount: events.length };
  }

  const bodyKo = buildBody(
    events.map((e) => e.message_ko),
    "오늘 전장 판단이 바뀌었습니다.",
  );
  const bodyEn = buildBody(
    events.map((e) => e.message_en),
    "Theater judgments shifted today.",
  );

  const titleKo =
    events.length === 1
      ? "상황 변화"
      : `상황 변화 · ${events.length}건`;
  const titleEn =
    events.length === 1
      ? "Sitrep change"
      : `Sitrep · ${events.length} shifts`;

  const url = `/?sitrep=${encodeURIComponent(rankDate)}`;
  const tag = `sitrep-${rankDate}`;

  const ko = await broadcastPush(
    env,
    { title: titleKo, body: bodyKo, url, tag },
    { lang: "ko" },
  );
  const en = await broadcastPush(
    env,
    { title: titleEn, body: bodyEn, url, tag },
    { lang: "en" },
  );

  const attempted = (ko.attempted ?? 0) + (en.attempted ?? 0);
  if (attempted === 0 && (ko.error || en.error)) {
    await env.DB.prepare(`DELETE FROM sitrep_push_sent WHERE rank_date = ?`)
      .bind(rankDate)
      .run();
    return {
      skipped: true,
      reason: ko.error || en.error || "push-unavailable",
      rankDate,
      eventCount: events.length,
      ko,
      en,
    };
  }

  await env.DB.prepare(
    `UPDATE sitrep_push_sent
     SET event_count = ?, detail_json = ?, sent_at = datetime('now')
     WHERE rank_date = ?`,
  )
    .bind(
      events.length,
      JSON.stringify({
        koSent: ko.sent,
        enSent: en.sent,
        attempted,
        sent: (ko.sent ?? 0) + (en.sent ?? 0),
      }),
      rankDate,
    )
    .run();

  return {
    skipped: false,
    rankDate,
    eventCount: events.length,
    ko,
    en,
  };
}
