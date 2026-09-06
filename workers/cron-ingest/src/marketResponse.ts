/// <reference types="@cloudflare/workers-types" />
/**
 * ?œì¥ ë°˜ì‘ ê¸°ë¡ ??ì»¨ë²„?„ìŠ¤ ë°œí™” ?´í›„ ? ê?Â·?¬ëŸ¬Â·ë³€?™ì„±???¤ì œë¡??´ë–»ê²??€ì§ì??”ê?.
 *
 * ??ëª¨ë“ˆ???†ìœ¼ë©?ì»¨ë²„?„ìŠ¤???ì›??"ê·¸ëŸ´??•œ ? í˜¸"ë¡??¨ëŠ”??
 * ?ì¤‘ë¥ ì„ ë§í•˜?¤ë©´ ë°œí™”?€ ê²°ê³¼ê°€ ê°™ì? DB???˜ë????ˆì–´???œë‹¤.
 *
 * ì¶œì²˜: FRED (ë¯¸êµ­ ?¸ì¸?¸ë£¨?´ìŠ¤ ?°ì?). ë¯??•ë? ?€?‘ë¬¼ë¡??¼ë¸”ë¦??„ë©”?¸ì´?? * ?ì—…???¬ë°°???œì•½???†ë‹¤. Yahoo Finance ??ToS ë¬¸ì œê°€ ?ˆì–´ ?°ì? ?ŠëŠ”?? * (docs/commercial-licensing.md ì°¸ì¡°).
 *
 * ?œê³„ ???•ì§?˜ê²Œ ?ì–´?”ë‹¤
 *   FRED ??**?¼ë³„ ì¢…ê?**ë§?ì¤€?? ?¸íŠ¸?¼ë°?´ê? ?†ìœ¼ë¯€ë¡?"ë°œí™” ??4?œê°„" ê°™ì?
 *   ì§€?œëŠ” ë§Œë“¤ ???†ë‹¤. ì§€ê¸ˆì? D+1/2/5 ë¡??œì‘?œë‹¤. ì´ˆí¬?¬ì¸??êµë??? *   ? ê?Â·?´ì„??ë°˜ì˜?˜ëŠ” ?œê°„?€ë¥??ê°?˜ë©´ ?¼ë³„ë¡œë„ ?¸ë™?ˆì½”?œëŠ” ?±ë¦½?œë‹¤.
 *   ?¸íŠ¸?¼ë°?´ëŠ” ë§¤ì¶œ???ê¸´ ??? ë£Œ ?¼ë“œë¡?ë¶™ì¼ ê²?
 */

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

/** ì¶”ì  ?€????ì§€?•í•™ ì¶©ê²©???¤ì œë¡?ì§€?˜ê???ê²½ë¡œë§?*/
export const TRACKED_SERIES = [
  "DCOILWTICO", // WTI ?ìœ 
  "DCOILBRENTEU", // ë¸Œë Œ???ìœ 
  "VIXCLS", // ë³€?™ì„±
  "DTWEXBGS", // ?¬ëŸ¬ ì§€??(ê´‘ì˜)
] as const;

export type SeriesId = (typeof TRACKED_SERIES)[number];

/** ì¸¡ì • ì§€??(ê±°ë˜???„ë‹˜, ?¬ë ¥??ê¸°ì??¼ë¡œ ê°€??ê°€ê¹Œìš´ ê´€ì¸¡ì¹˜ë¥?ì·¨í•¨) */
const HORIZONS = [1, 2, 5] as const;

/** z_change ?°ì¶œ??ê³¼ê±° ?œë³¸ */
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
    .filter((o) => Number.isFinite(o.value)); // FRED ???´ì¥?¼ì— "." ë¥?ì¤€??}

/**
 * ìµœê·¼ ê´€ì¸¡ì¹˜ë¥?market_daily ???ì¬?œë‹¤. ë§¤ì¼ 1??
 * ?´ë? ?ˆëŠ” (series, date) ??ê°±ì‹ ?œë‹¤ ??FRED ??ì´ˆê¸° ë°œí‘œë¥??˜ì¤‘??ê°œì •?œë‹¤.
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

/** ?´ë‹¹ ? ì§œ ?´í•˜?ì„œ ê°€??ê°€ê¹Œìš´ ê´€ì¸¡ì¹˜ (?´ì¥???€?? */
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

/** ì§ì „ VOL_WINDOW ê´€ì¸¡ì˜ ?¼ê°„ ë¡œê·¸?˜ìµë¥??œì??¸ì°¨ */
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
 * ê²°ê³¼ê°€ ?„ì§ ??ì±„ì›Œì§?ë°œí™”?¤ì— ?€???œì¥ ë°˜ì‘??ê³„ì‚°?œë‹¤.
 * ì§€?‰ì´ ?„ë˜?˜ì? ?Šì? ê±?ê±´ë„ˆ?°ê³  ?¤ìŒ ?¤í–‰?ì„œ ?¤ì‹œ ?œë„?œë‹¤.
 */
export async function backfillOutcomes(
  db: D1Database,
  opts?: { maxEvents?: number },
): Promise<{ measured: number; pending: number }> {
  const maxEvents = opts?.maxEvents ?? 200;
  const today = new Date().toISOString().slice(0, 10);

  // ìµœë? ì§€??5?????„ì§ ??ì§€??ê²ƒê¹Œì§€ ?¬í•¨??ë¶€ë¶?ì¸¡ì •?œë‹¤
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
        // ì§€??h ???„ì ?´ë?ë¡?ë³€?™ì„±???šh ë¡??¤ì???        const zChange =
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
