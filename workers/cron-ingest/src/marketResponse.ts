/**
 * 시장 반응 기록 — 컨버전스 발화 이후 유가·달러·변동성이 실제로 어떻게 움직였는가.
 *
 * 이 모듈이 없으면 컨버전스는 영원히 "그럴듯한 신호"로 남는다.
 * 적중률을 말하려면 발화와 결과가 같은 DB에 나란히 있어야 한다.
 *
 * 출처: FRED (미국 세인트루이스 연은). 미 정부 저작물로 퍼블릭 도메인이라
 * 상업적 재배포 제약이 없다. Yahoo Finance 는 ToS 문제가 있어 쓰지 않는다
 * (docs/commercial-licensing.md 참조).
 *
 * 한계 — 정직하게 적어둔다
 *   FRED 는 **일별 종가**만 준다. 인트라데이가 없으므로 "발화 후 4시간" 같은
 *   지표는 만들 수 없다. 지금은 D+1/2/5 로 시작한다. 초크포인트 교란이
 *   유가·운임에 반영되는 시간대를 생각하면 일별로도 트랙레코드는 성립한다.
 *   인트라데이는 매출이 생긴 뒤 유료 피드로 붙일 것.
 */

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

/** 추적 대상 — 지정학 충격이 실제로 지나가는 경로만 */
export const TRACKED_SERIES = [
  "DCOILWTICO", // WTI 원유
  "DCOILBRENTEU", // 브렌트 원유
  "VIXCLS", // 변동성
  "DTWEXBGS", // 달러 지수 (광의)
] as const;

export type SeriesId = (typeof TRACKED_SERIES)[number];

/** 측정 지평 (거래일 아님, 달력일 기준으로 가장 가까운 관측치를 취함) */
const HORIZONS = [1, 2, 5] as const;

/** z_change 산출용 과거 표본 */
const VOL_WINDOW = 90;

type FredObs = { date: string; value: string };

async function fetchFredSeries(
  apiKey: string,
  seriesId: string,
  startDate: string,
): Promise<Array<{ date: string; value: number }>> {
  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", startDate);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}`);

  const json = (await res.json()) as { observations?: FredObs[] };
  return (json.observations ?? [])
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value)); // FRED 는 휴장일에 "." 를 준다
}

/**
 * 최근 관측치를 market_daily 에 적재한다. 매일 1회.
 * 이미 있는 (series, date) 는 갱신한다 — FRED 는 초기 발표를 나중에 개정한다.
 */
export async function ingestMarketDaily(
  db: D1Database,
  apiKey: string,
  opts?: { lookbackDays?: number },
): Promise<{ series: number; rows: number; errors: string[] }> {
  const lookback = opts?.lookbackDays ?? 30;
  const start = new Date(Date.now() - lookback * 86400000).toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const errors: string[] = [];
  let rows = 0;

  for (const seriesId of TRACKED_SERIES) {
    try {
      const obs = await fetchFredSeries(apiKey, seriesId, start);
      for (const o of obs) {
        await db
          .prepare(
            `INSERT INTO market_daily (series_id, obs_date, value, source, ingested_at)
             VALUES (?,?,?,'fred',?)
             ON CONFLICT(series_id, obs_date) DO UPDATE SET
               value = excluded.value, ingested_at = excluded.ingested_at`,
          )
          .bind(seriesId, o.date, o.value, now)
          .run();
        rows += 1;
      }
    } catch (err) {
      errors.push(`${seriesId}: ${(err as Error).message}`);
    }
  }

  return { series: TRACKED_SERIES.length, rows, errors };
}

/** 해당 날짜 이하에서 가장 가까운 관측치 (휴장일 대응) */
async function valueOnOrBefore(
  db: D1Database,
  seriesId: string,
  date: string,
): Promise<{ date: string; value: number } | null> {
  const row = await db
    .prepare(
      `SELECT obs_date, value FROM market_daily
       WHERE series_id = ? AND obs_date <= ?
       ORDER BY obs_date DESC LIMIT 1`,
    )
    .bind(seriesId, date)
    .first<{ obs_date: string; value: number }>();
  return row ? { date: row.obs_date, value: row.value } : null;
}

/** 직전 VOL_WINDOW 관측의 일간 로그수익률 표준편차 */
async function trailingVol(
  db: D1Database,
  seriesId: string,
  before: string,
): Promise<number | null> {
  const res = await db
    .prepare(
      `SELECT value FROM market_daily
       WHERE series_id = ? AND obs_date < ?
       ORDER BY obs_date DESC LIMIT ?`,
    )
    .bind(seriesId, before, VOL_WINDOW + 1)
    .all<{ value: number }>();

  const vals = (res.results ?? []).map((r) => r.value).reverse();
  if (vals.length < 30) return null;

  const rets: number[] = [];
  for (let i = 1; i < vals.length; i += 1) {
    if (vals[i - 1] > 0 && vals[i] > 0) rets.push(Math.log(vals[i] / vals[i - 1]));
  }
  if (rets.length < 20) return null;

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varc = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(varc);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 결과가 아직 안 채워진 발화들에 대해 시장 반응을 계산한다.
 * 지평이 도래하지 않은 건 건너뛰고 다음 실행에서 다시 시도한다.
 */
export async function backfillOutcomes(
  db: D1Database,
  opts?: { maxEvents?: number },
): Promise<{ measured: number; pending: number }> {
  const maxEvents = opts?.maxEvents ?? 200;
  const today = new Date().toISOString().slice(0, 10);

  // 최대 지평(5일)이 아직 안 지난 것까지 포함해 부분 측정한다
  const events = await db
    .prepare(
      `SELECT id, signal_date FROM convergence_events
       WHERE signal_date >= ?
       ORDER BY signal_date DESC LIMIT ?`,
    )
    .bind(addDays(today, -400), maxEvents)
    .all<{ id: string; signal_date: string }>();

  const now = new Date().toISOString();
  let measured = 0;
  let pending = 0;

  for (const ev of events.results ?? []) {
    for (const seriesId of TRACKED_SERIES) {
      const base = await valueOnOrBefore(db, seriesId, addDays(ev.signal_date, -1));
      if (!base) continue;

      const vol = await trailingVol(db, seriesId, ev.signal_date);

      for (const h of HORIZONS) {
        const endTarget = addDays(ev.signal_date, h);
        if (endTarget > today) {
          pending += 1;
          continue;
        }

        const exists = await db
          .prepare(
            `SELECT 1 FROM convergence_outcomes
             WHERE event_id = ? AND series_id = ? AND horizon_days = ?`,
          )
          .bind(ev.id, seriesId, h)
          .first();
        if (exists) continue;

        const end = await valueOnOrBefore(db, seriesId, endTarget);
        if (!end || end.date <= base.date) {
          pending += 1;
          continue;
        }

        const pct = ((end.value - base.value) / base.value) * 100;
        // 지평 h 일 누적이므로 변동성도 √h 로 스케일
        const zChange =
          vol && vol > 0 ? Math.log(end.value / base.value) / (vol * Math.sqrt(h)) : null;

        await db
          .prepare(
            `INSERT OR IGNORE INTO convergence_outcomes
               (event_id, series_id, horizon_days, base_date, base_value,
                end_date, end_value, pct_change, z_change, measured_at)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
          )
          .bind(
            ev.id, seriesId, h,
            base.date, base.value,
            end.date, end.value,
            Number(pct.toFixed(4)),
            zChange === null ? null : Number(zChange.toFixed(4)),
            now,
          )
          .run();
        measured += 1;
      }
    }
  }

  return { measured, pending };
}
