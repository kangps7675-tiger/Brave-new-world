/// <reference types="@cloudflare/workers-types" />
/**
 * ?Œì´?„ë¼???˜íŠ¸ë¹„íŠ¸ ??ì¡°ìš©???Šê¸°??ê²ƒì„ ë§‰ëŠ”??
 *
 * ?œê³„?´ì´ ?í’ˆ?´ë©´, ìµœì•…???¬ê³ ??"ì§€?„ê? ???¬ë‹¤"ê°€ ?„ë‹ˆ?? * "6ê°œì›” ?™ì•ˆ ?¤ëƒ…?·ì´ ???“ì??”ë° ?„ë¬´??ëª°ë???´ë‹¤.
 * ?„ì??ë³µêµ¬ê°€ ë¶ˆê??¥í•˜?? ?ì²œ API ê°€ ê³¼ê±°ë¥??Œë ¤ì£¼ì? ?Šê¸° ?Œë¬¸?´ë‹¤.
 *
 * ê·¸ë˜??ë§¤ì¼ ???‰ì„ ?¨ê¸°ê³? ì§ì „ ?¤ëƒ…?·ê³¼??ê°„ê²©??ë²Œì–´ì§€ë©?healthy=0 ???¸ìš´??
 */

export type Heartbeat = {
  checkDate: string;
  theaterSignalRows: number;
  marketSeriesRows: number;
  convergenceEvents: number;
  gapDays: number;
  healthy: boolean;
  note?: string;
};

/** gap ????ê°’ì„ ?˜ìœ¼ë©?ë¹„ì •?ìœ¼ë¡?ë³¸ë‹¤ (?˜ë£¨ 1??cron ê¸°ì?) */
const MAX_HEALTHY_GAP_DAYS = 2;

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000);
}

export async function recordHeartbeat(db: D1Database): Promise<Heartbeat> {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const sig = await db
    .prepare(`SELECT COUNT(*) AS n FROM theater_signal_daily WHERE signal_date = ?`)
    .bind(yesterday)
    .first<{ n: number }>();

  const mkt = await db
    .prepare(
      `SELECT COUNT(DISTINCT series_id) AS n FROM market_daily
       WHERE obs_date >= ?`,
    )
    .bind(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
    .first<{ n: number }>();

  const conv = await db
    .prepare(`SELECT COUNT(*) AS n FROM convergence_events WHERE signal_date = ?`)
    .bind(yesterday)
    .first<{ n: number }>();

  // ì§ì „???¤ì œë¡?? í˜¸ê°€ ?“ì¸ ??  const prev = await db
    .prepare(
      `SELECT MAX(signal_date) AS d FROM theater_signal_daily WHERE signal_date < ?`,
    )
    .bind(yesterday)
    .first<{ d: string | null }>();

  const theaterSignalRows = sig?.n ?? 0;
  const gapDays = prev?.d ? daysBetween(prev.d, yesterday) : 0;

  const problems: string[] = [];
  if (theaterSignalRows === 0) problems.push("?´ì œ ?„ì¥ ? í˜¸ ?¤ëƒ…??0ê±?);
  if ((mkt?.n ?? 0) === 0) problems.push("ìµœê·¼ 7???œì¥ ?œê³„??0ê±?);
  if (gapDays > MAX_HEALTHY_GAP_DAYS) problems.push(`?¤ëƒ…??ê³µë°± ${gapDays}??);

  const beat: Heartbeat = {
    checkDate: today,
    theaterSignalRows,
    marketSeriesRows: mkt?.n ?? 0,
    convergenceEvents: conv?.n ?? 0,
    gapDays,
    healthy: problems.length === 0,
    note: problems.length ? problems.join(" / ") : undefined,
  };

  await db
    .prepare(
      `INSERT INTO pipeline_heartbeat
         (check_date, theater_signal_rows, market_series_rows, convergence_events,
          gap_days, healthy, note, created_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(check_date) DO UPDATE SET
         theater_signal_rows = excluded.theater_signal_rows,
         market_series_rows = excluded.market_series_rows,
         convergence_events = excluded.convergence_events,
         gap_days = excluded.gap_days,
         healthy = excluded.healthy,
         note = excluded.note`,
    )
    .bind(
      beat.checkDate,
      beat.theaterSignalRows,
      beat.marketSeriesRows,
      beat.convergenceEvents,
      beat.gapDays,
      beat.healthy ? 1 : 0,
      beat.note ?? null,
      new Date().toISOString(),
    )
    .run();

  if (!beat.healthy) {
    console.error("[heartbeat] UNHEALTHY:", beat.note);
  }

  return beat;
}
