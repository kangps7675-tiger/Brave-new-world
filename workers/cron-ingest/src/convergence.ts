/**
 * 컨버전스 감지 — 독립 채널이 같은 전장에서 동시에 이상값을 보일 때만 발화.
 *
 * 왜 단일 채널 임계값이 아니라 컨버전스인가
 *   단일 소스는 오탐이 너무 많다. 특히 FIRMS 열이상은 오탐의 43%가 산업·광산,
 *   14%가 가스 플레어다. 페르시아만은 세계 최대 플레어 지대라서, 호르무즈에서
 *   FIRMS 단독 급증은 분쟁이 아니라 석유산업 가동률일 가능성이 높다.
 *   → FIRMS 는 단독으로 발화할 수 없다 (requiresCorroboration).
 *
 * 통계 방법
 *   평균·표준편차 대신 median·MAD 를 쓴다. 분쟁 신호는 두꺼운 꼬리를 가져서
 *   과거 폭발적 사건 하나가 평균을 끌어올리면 다음 사건을 못 잡는다.
 *   베이스라인에서 최근 BASELINE_GAP_DAYS 는 제외한다 — 사건이 서서히 고조되면
 *   자기 자신이 베이스라인에 섞여 z 가 죽는다.
 *
 * 버전 관리
 *   ALGO_VERSION 을 바꾸면 과거 발화와 섞이지 않는다. 적중률을 말할 때
 *   반드시 같은 버전끼리만 비교해야 한다. channels_json 에 입력을 남기므로
 *   새 버전으로 과거를 재채점(backfill)할 수 있다.
 */

export const ALGO_VERSION = "conv-v1";

const BASELINE_DAYS = 60;
const BASELINE_GAP_DAYS = 3;
const MIN_BASELINE_SAMPLES = 21;

/** MAD → 정규분포 σ 환산 상수 */
const MAD_TO_SIGMA = 1.4826;

/** MAD 가 0일 때(대부분 0인 희소 채널) 사용할 하한 */
const MIN_MAD = 0.5;

export type ChannelId = "gdelt" | "firms" | "telegram" | "airraid";

type ChannelSpec = {
  id: ChannelId;
  /** theater_signal_daily 컬럼들 — 여럿이면 z 최대값을 채택 */
  columns: string[];
  /** 발화 z 임계 */
  zThreshold: number;
  /** 이 값 미만이면 z 와 무관하게 발화 금지 (희소 채널의 1→3 같은 잡음 차단) */
  absFloor: number;
  /** true 면 다른 채널이 함께 발화할 때만 카운트 */
  requiresCorroboration: boolean;
};

const CHANNELS: ChannelSpec[] = [
  // GDELT 언급량·이벤트포인트는 같은 소스라 하나로 묶는다 (독립 채널이 아님)
  { id: "gdelt", columns: ["mentions", "points"], zThreshold: 3.0, absFloor: 8, requiresCorroboration: false },
  { id: "telegram", columns: ["telegram_count"], zThreshold: 3.0, absFloor: 4, requiresCorroboration: false },
  { id: "airraid", columns: ["air_raid_score"], zThreshold: 2.5, absFloor: 1, requiresCorroboration: false },
  // 플레어·산업열 오탐 때문에 임계를 높이고 단독 발화를 금지한다
  { id: "firms", columns: ["fire_count"], zThreshold: 4.0, absFloor: 25, requiresCorroboration: true },
];

/** 발화에 필요한 최소 독립 채널 수 */
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
 * 한 전장·한 날짜에 대해 컨버전스 여부를 평가한다.
 * baseline 은 [targetDate - GAP - BASELINE_DAYS, targetDate - GAP) 구간.
 */
export function evaluateTheater(
  targetDate: string,
  theaterId: string,
  target: SignalRow,
  baseline: SignalRow[],
): ConvergenceEvent | null {
  const evals: ChannelEval[] = [];

  for (const spec of CHANNELS) {
    // 여러 컬럼이면 각각 z 를 구해 최대값 채택
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

  // 보강 필요 채널(FIRMS) 처리 — 다른 채널이 하나도 안 켜졌으면 무효
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
 * 대상 날짜(기본: 어제 UTC)에 대해 전 전장을 평가하고 발화를 기록한다.
 * 이미 같은 (date, theater, algo) 가 있으면 건드리지 않는다 — append-only.
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
