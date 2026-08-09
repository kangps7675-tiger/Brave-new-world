/**
 * 파이프라인 하트비트 — 조용히 끊기는 것을 막는다.
 *
 * 시계열이 상품이면, 최악의 사고는 "지도가 안 뜬다"가 아니라
 * "6개월 동안 스냅샷이 안 쌓였는데 아무도 몰랐다"이다.
 * 후자는 복구가 불가능하다. 원천 API 가 과거를 돌려주지 않기 때문이다.
 *
 * 그래서 매일 한 행을 남기고, 직전 스냅샷과의 간격이 벌어지면 healthy=0 을 세운다.
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

/** gap 이 이 값을 넘으면 비정상으로 본다 (하루 1회 cron 기준) */
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

  // 직전에 실제로 신호가 쌓인 날
  const prev = await db
    .prepare(
      `SELECT MAX(signal_date) AS d FROM theater_signal_daily WHERE signal_date < ?`,
    )
    .bind(yesterday)
    .first<{ d: string | null }>();

  const theaterSignalRows = sig?.n ?? 0;
  const gapDays = prev?.d ? daysBetween(prev.d, yesterday) : 0;

  const problems: string[] = [];
  if (theaterSignalRows === 0) problems.push("어제 전장 신호 스냅샷 0건");
  if ((mkt?.n ?? 0) === 0) problems.push("최근 7일 시장 시계열 0건");
  if (gapDays > MAX_HEALTHY_GAP_DAYS) problems.push(`스냅샷 공백 ${gapDays}일`);

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
