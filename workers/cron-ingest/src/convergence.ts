/**
 * Minimal D1 surface for this module.
 * Do NOT triple-slash @cloudflare/workers-types here: vitest imports this file
 * from src/, and that pollutes the Next.js typecheck DOM graph.
 */
type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
};
type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

/**
 * ????? ??? ????? ??????? ?????? ?????????? ?? ??? ??.
 *
 * ????? ?? ????? ??????????????
 *   ??? ????????????? ??. ??? FIRMS ??????? ?????43%? ???·??,
 *   14%? ?????????. ????????? ??? ??? ???????????, ????????
 *   FIRMS ??? ???? ??????????????? ???????????????.
 *   ??FIRMS ???????? ????????? (requiresCorroboration).
 *
 * ??? ??
 *   ???·??????? ????median·MAD ?????. ?? ??????????????????
 *   ?? ????????? ???? ???????????????? ????????????
 *   ???????????? BASELINE_GAP_DAYS ???????? ?????????????????
 *   ??? ????????????? ??? z ? ????
 *
 * ?? ??? *   ALGO_VERSION ???????? ???? ???? ????? ????? ?? ?? *   ??????? ???????????? ???. channels_json ????????????? *   ??????? ?????????backfill)???????.
 */

export const ALGO_VERSION = "conv-v1";

const BASELINE_DAYS = 60;
const BASELINE_GAP_DAYS = 3;
const MIN_BASELINE_SAMPLES = 21;

/** MAD ??????? ? ??? ??? */
const MAD_TO_SIGMA = 1.4826;

/** MAD ? 0?????????0????? ??) ???????? */
const MIN_MAD = 0.5;

export type ChannelId = "gdelt" | "firms" | "telegram" | "airraid";

type ChannelSpec = {
  id: ChannelId;
  /** theater_signal_daily ???????????? z ????? ?? */
  columns: string[];
  /** ?? z ??? */
  zThreshold: number;
  /** ????????? z ?? ?????? ?? ??? (??? ????1?? ??? ??? ??) */
  absFloor: number;
  /** true ????? ??????? ??????? ????*/
  requiresCorroboration: boolean;
};

const CHANNELS: ChannelSpec[] = [
  // GDELT ?????·????????? ??? ??????????????(??? ???????)
  { id: "gdelt", columns: ["mentions", "points"], zThreshold: 3.0, absFloor: 8, requiresCorroboration: false },
  { id: "telegram", columns: ["telegram_count"], zThreshold: 3.0, absFloor: 4, requiresCorroboration: false },
  { id: "airraid", columns: ["air_raid_score"], zThreshold: 2.5, absFloor: 1, requiresCorroboration: false },
  // ?????·???? ??? ?????????????????? ??????????
  { id: "firms", columns: ["fire_count"], zThreshold: 4.0, absFloor: 25, requiresCorroboration: true },
];

/** ??????????? ??? ?? ??*/
const MIN_CHANNELS = 3;

export type ChannelEval = {
  channel: ChannelId;
  value: number;
  median: number;
  mad: number;
  z: number;
  fired: boolean;
  suppressed?: "no-corroboration" | "below-floor" | "insufficient-baseline";
};

export type ConvergenceEvent = {
  id: string;
  signalDate: string;
  theaterId: string;
  algoVersion: string;
  channelCount: number;
  score: number;
  peakZ: number;
  firedChannels: ChannelId[];
  channels: ChannelEval[];
};

type SignalRow = {
  signal_date: string;
  theater_id: string;
  mentions: number;
  points: number;
  fire_count: number;
  telegram_count: number;
  air_raid_score: number;
};

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** median absolute deviation */
function mad(values: number[], med: number): number {
  if (values.length === 0) return MIN_MAD;
  const devs = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  return Math.max(MIN_MAD, median(devs));
}

function robustZ(value: number, med: number, m: number): number {
  return (value - med) / (m * MAD_TO_SIGMA);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * ?????·???????????????? ?????????????.
 * baseline ?? [targetDate - GAP - BASELINE_DAYS, targetDate - GAP) ??.
 */
export function evaluateTheater(
  targetDate: string,
  theaterId: string,
  target: SignalRow,
  baseline: SignalRow[],
): ConvergenceEvent | null {
  const evals: ChannelEval[] = [];

  for (const spec of CHANNELS) {
    // ??? ????? ?? z ???? ???????
    let best: ChannelEval | null = null;

    for (const col of spec.columns) {
      const series = baseline
        .map((r) => Number((r as unknown as Record<string, number>)[col] ?? 0))
        .filter((n) => Number.isFinite(n));

      const value = Number((target as unknown as Record<string, number>)[col] ?? 0);

      if (series.length < MIN_BASELINE_SAMPLES) {
        const e: ChannelEval = {
          channel: spec.id, value, median: 0, mad: MIN_MAD, z: 0,
          fired: false, suppressed: "insufficient-baseline",
        };
        if (!best || e.z > best.z) best = e;
        continue;
      }

      const sorted = [...series].sort((a, b) => a - b);
      const med = median(sorted);
      const m = mad(series, med);
      const z = robustZ(value, med, m);

      const belowFloor = value < spec.absFloor;
      const e: ChannelEval = {
        channel: spec.id,
        value, median: med, mad: m, z,
        fired: z >= spec.zThreshold && !belowFloor,
        ...(belowFloor && z >= spec.zThreshold ? { suppressed: "below-floor" as const } : {}),
      };
      if (!best || e.z > best.z) best = e;
    }

    if (best) evals.push(best);
  }

  // ?? ??? ??(FIRMS) ?? ????? ???????????????? ??
  const independentFired = evals.filter(
    (e) => e.fired && !CHANNELS.find((c) => c.id === e.channel)?.requiresCorroboration,
  );
  for (const e of evals) {
    const spec = CHANNELS.find((c) => c.id === e.channel);
    if (e.fired && spec?.requiresCorroboration && independentFired.length === 0) {
      e.fired = false;
      e.suppressed = "no-corroboration";
    }
  }

  const fired = evals.filter((e) => e.fired);
  if (fired.length < MIN_CHANNELS) return null;

  const score = fired.reduce((sum, e) => sum + e.z, 0);
  const peakZ = fired.reduce((mx, e) => Math.max(mx, e.z), 0);

  return {
    id: `${targetDate}:${theaterId}:${ALGO_VERSION}`,
    signalDate: targetDate,
    theaterId,
    algoVersion: ALGO_VERSION,
    channelCount: fired.length,
    score: Number(score.toFixed(4)),
    peakZ: Number(peakZ.toFixed(4)),
    firedChannels: fired.map((e) => e.channel),
    channels: evals,
  };
}

/**
 * ???????(??: ??? UTC)???????????????????? ?????????.
 * ???? ??? (date, theater, algo) ? ?????????? ???????append-only.
 */
export async function detectAndRecordConvergence(
  db: D1Database,
  opts?: { targetDate?: string },
): Promise<{ evaluated: number; fired: number; ids: string[]; skipped: number }> {
  const targetDate =
    opts?.targetDate ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const baselineEnd = addDays(targetDate, -BASELINE_GAP_DAYS);
  const baselineStart = addDays(baselineEnd, -BASELINE_DAYS);

  const targetRows = await db
    .prepare(
      `SELECT signal_date, theater_id, mentions, points, fire_count, telegram_count, air_raid_score
       FROM theater_signal_daily WHERE signal_date = ?`,
    )
    .bind(targetDate)
    .all<SignalRow>();

  const targets = targetRows.results ?? [];
  if (targets.length === 0) return { evaluated: 0, fired: 0, ids: [], skipped: 0 };

  const baseRows = await db
    .prepare(
      `SELECT signal_date, theater_id, mentions, points, fire_count, telegram_count, air_raid_score
       FROM theater_signal_daily
       WHERE signal_date >= ? AND signal_date < ?`,
    )
    .bind(baselineStart, baselineEnd)
    .all<SignalRow>();

  const byTheater = new Map<string, SignalRow[]>();
  for (const r of baseRows.results ?? []) {
    const arr = byTheater.get(r.theater_id) ?? [];
    arr.push(r);
    byTheater.set(r.theater_id, arr);
  }

  const now = new Date().toISOString();
  const ids: string[] = [];
  let skipped = 0;

  for (const t of targets) {
    const event = evaluateTheater(targetDate, t.theater_id, t, byTheater.get(t.theater_id) ?? []);
    if (!event) continue;

    const res = await db
      .prepare(
        `INSERT OR IGNORE INTO convergence_events
           (id, signal_date, theater_id, algo_version, channel_count, score, peak_z,
            fired_channels, channels_json, baseline_days, baseline_gap_days, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        event.id,
        event.signalDate,
        event.theaterId,
        event.algoVersion,
        event.channelCount,
        event.score,
        event.peakZ,
        event.firedChannels.join(","),
        JSON.stringify(event.channels),
        BASELINE_DAYS,
        BASELINE_GAP_DAYS,
        now,
      )
      .run();

    if ((res.meta?.changes ?? 0) > 0) ids.push(event.id);
    else skipped += 1;
  }

  return { evaluated: targets.length, fired: ids.length, ids, skipped };
}
