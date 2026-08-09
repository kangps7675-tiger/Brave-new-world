/// <reference types="@cloudflare/workers-types" />
/**
 * ì»¨ë²„?„ìŠ¤ ê°ì? ???…ë¦½ ì±„ë„??ê°™ì? ?„ì¥?ì„œ ?™ì‹œ???´ìƒê°’ì„ ë³´ì¼ ?Œë§Œ ë°œí™”.
 *
 * ???¨ì¼ ì±„ë„ ?„ê³„ê°’ì´ ?„ë‹ˆ??ì»¨ë²„?„ìŠ¤?¸ê?
 *   ?¨ì¼ ?ŒìŠ¤???¤íƒ???ˆë¬´ ë§ë‹¤. ?¹íˆ FIRMS ?´ì´?ì? ?¤íƒ??43%ê°€ ?°ì—…Â·ê´‘ì‚°,
 *   14%ê°€ ê°€???Œë ˆ?´ë‹¤. ?˜ë¥´?œì•„ë§Œì? ?¸ê³„ ìµœë? ?Œë ˆ??ì§€?€?¼ì„œ, ?¸ë¥´ë¬´ì¦ˆ?ì„œ
 *   FIRMS ?¨ë… ê¸‰ì¦?€ ë¶„ìŸ???„ë‹ˆ???ìœ ?°ì—… ê°€?™ë¥ ??ê°€?¥ì„±???’ë‹¤.
 *   ??FIRMS ???¨ë…?¼ë¡œ ë°œí™”?????†ë‹¤ (requiresCorroboration).
 *
 * ?µê³„ ë°©ë²•
 *   ?‰ê· Â·?œì??¸ì°¨ ?€??medianÂ·MAD ë¥??´ë‹¤. ë¶„ìŸ ? í˜¸???êº¼??ê¼¬ë¦¬ë¥?ê°€?¸ì„œ
 *   ê³¼ê±° ??°œ???¬ê±´ ?˜ë‚˜ê°€ ?‰ê· ???Œì–´?¬ë¦¬ë©??¤ìŒ ?¬ê±´??ëª??¡ëŠ”??
 *   ë² ì´?¤ë¼?¸ì—??ìµœê·¼ BASELINE_GAP_DAYS ???œì™¸?œë‹¤ ???¬ê±´???œì„œ??ê³ ì¡°?˜ë©´
 *   ?ê¸° ?ì‹ ??ë² ì´?¤ë¼?¸ì— ?ì—¬ z ê°€ ì£½ëŠ”??
 *
 * ë²„ì „ ê´€ë¦? *   ALGO_VERSION ??ë°”ê¾¸ë©?ê³¼ê±° ë°œí™”?€ ?ì´ì§€ ?ŠëŠ”?? ?ì¤‘ë¥ ì„ ë§í•  ?? *   ë°˜ë“œ??ê°™ì? ë²„ì „?¼ë¦¬ë§?ë¹„êµ?´ì•¼ ?œë‹¤. channels_json ???…ë ¥???¨ê¸°ë¯€ë¡? *   ??ë²„ì „?¼ë¡œ ê³¼ê±°ë¥??¬ì±„??backfill)?????ˆë‹¤.
 */

export const ALGO_VERSION = "conv-v1";

const BASELINE_DAYS = 60;
const BASELINE_GAP_DAYS = 3;
const MIN_BASELINE_SAMPLES = 21;

/** MAD ???•ê·œë¶„í¬ ? ?˜ì‚° ?ìˆ˜ */
const MAD_TO_SIGMA = 1.4826;

/** MAD ê°€ 0?????€ë¶€ë¶?0???¬ì†Œ ì±„ë„) ?¬ìš©???˜í•œ */
const MIN_MAD = 0.5;

export type ChannelId = "gdelt" | "firms" | "telegram" | "airraid";

type ChannelSpec = {
  id: ChannelId;
  /** theater_signal_daily ì»¬ëŸ¼?????¬ëŸ¿?´ë©´ z ìµœë?ê°’ì„ ì±„íƒ */
  columns: string[];
  /** ë°œí™” z ?„ê³„ */
  zThreshold: number;
  /** ??ê°?ë¯¸ë§Œ?´ë©´ z ?€ ë¬´ê??˜ê²Œ ë°œí™” ê¸ˆì? (?¬ì†Œ ì±„ë„??1?? ê°™ì? ?¡ìŒ ì°¨ë‹¨) */
  absFloor: number;
  /** true ë©??¤ë¥¸ ì±„ë„???¨ê»˜ ë°œí™”???Œë§Œ ì¹´ìš´??*/
  requiresCorroboration: boolean;
};

const CHANNELS: ChannelSpec[] = [
  // GDELT ?¸ê¸‰?‰Â·ì´ë²¤íŠ¸?¬ì¸?¸ëŠ” ê°™ì? ?ŒìŠ¤???˜ë‚˜ë¡?ë¬¶ëŠ”??(?…ë¦½ ì±„ë„???„ë‹˜)
  { id: "gdelt", columns: ["mentions", "points"], zThreshold: 3.0, absFloor: 8, requiresCorroboration: false },
  { id: "telegram", columns: ["telegram_count"], zThreshold: 3.0, absFloor: 4, requiresCorroboration: false },
  { id: "airraid", columns: ["air_raid_score"], zThreshold: 2.5, absFloor: 1, requiresCorroboration: false },
  // ?Œë ˆ?´Â·ì‚°?…ì—´ ?¤íƒ ?Œë¬¸???„ê³„ë¥??’ì´ê³??¨ë… ë°œí™”ë¥?ê¸ˆì??œë‹¤
  { id: "firms", columns: ["fire_count"], zThreshold: 4.0, absFloor: 25, requiresCorroboration: true },
];

/** ë°œí™”???„ìš”??ìµœì†Œ ?…ë¦½ ì±„ë„ ??*/
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
 * ???„ì¥Â·??? ì§œ???€??ì»¨ë²„?„ìŠ¤ ?¬ë?ë¥??‰ê??œë‹¤.
 * baseline ?€ [targetDate - GAP - BASELINE_DAYS, targetDate - GAP) êµ¬ê°„.
 */
export function evaluateTheater(
  targetDate: string,
  theaterId: string,
  target: SignalRow,
  baseline: SignalRow[],
): ConvergenceEvent | null {
  const evals: ChannelEval[] = [];

  for (const spec of CHANNELS) {
    // ?¬ëŸ¬ ì»¬ëŸ¼?´ë©´ ê°ê° z ë¥?êµ¬í•´ ìµœë?ê°?ì±„íƒ
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

  // ë³´ê°• ?„ìš” ì±„ë„(FIRMS) ì²˜ë¦¬ ???¤ë¥¸ ì±„ë„???˜ë‚˜????ì¼œì¡Œ?¼ë©´ ë¬´íš¨
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
 * ?€??? ì§œ(ê¸°ë³¸: ?´ì œ UTC)???€?????„ì¥???‰ê??˜ê³  ë°œí™”ë¥?ê¸°ë¡?œë‹¤.
 * ?´ë? ê°™ì? (date, theater, algo) ê°€ ?ˆìœ¼ë©?ê±´ë“œë¦¬ì? ?ŠëŠ”????append-only.
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

    if ((res.meta.changes ?? 0) > 0) ids.push(event.id);
    else skipped += 1;
  }

  return { evaluated: targets.length, fired: ids.length, ids, skipped };
}
