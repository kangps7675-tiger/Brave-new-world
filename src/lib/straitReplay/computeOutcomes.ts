import type {
  OutcomeHorizon,
  OutcomeRow,
  TrafficDay,
} from "@/lib/straitReplay/types";

export type PriceDay = { date: string; value: number };

function addUtcDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function sortedTraffic(
  rows: TrafficDay[],
  straitId: string,
): TrafficDay[] {
  return rows
    .filter((r) => r.straitId === straitId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 사건일 이전 `windowDays`일 평균 (사건일 제외). 구멍 있으면 null. */
export function trafficBaseline(
  rows: TrafficDay[],
  straitId: string,
  eventOn: string,
  windowDays: number,
): { avg: number; daysUsed: number } | null {
  const sorted = sortedTraffic(rows, straitId);
  const start = addUtcDays(eventOn, -windowDays);
  const window = sorted.filter(
    (r) => r.date >= start && r.date < eventOn && Number.isFinite(r.vesselCount),
  );
  if (window.length === 0) return null;
  const avg =
    window.reduce((s, r) => s + r.vesselCount, 0) / window.length;
  return { avg, daysUsed: window.length };
}

/** 특정 날짜의 통행. 없으면 null (보간 금지). */
export function trafficOnDate(
  rows: TrafficDay[],
  straitId: string,
  date: string,
): number | null {
  const hit = sortedTraffic(rows, straitId).find((r) => r.date === date);
  if (!hit || !Number.isFinite(hit.vesselCount)) return null;
  return hit.vesselCount;
}

/**
 * 가격: 사건일 종가. 휴장이면 **다음 영업일**로 정렬.
 * (주말·공휴일 구멍은 보간하지 않고, 이후 첫 관측일을 사건일 앵커로 쓴다.)
 */
export function priceOnOrNextSession(
  series: PriceDay[],
  eventOn: string,
): { date: string; value: number } | null {
  const sorted = series
    .filter((r) => Number.isFinite(r.value))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const row of sorted) {
    if (row.date >= eventOn) return { date: row.date, value: row.value };
  }
  return null;
}

/** 앵커일로부터 horizonDays 뒤 — 휴장이면 그 이후 첫 영업일. */
export function priceAfterSessions(
  series: PriceDay[],
  anchorDate: string,
  horizonDays: number,
): { date: string; value: number } | null {
  const target = addUtcDays(anchorDate, horizonDays);
  const sorted = series
    .filter((r) => Number.isFinite(r.value))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const row of sorted) {
    if (row.date >= target) return { date: row.date, value: row.value };
  }
  return null;
}

export function pctChange(
  baseline: number,
  observed: number,
): number | null {
  if (!Number.isFinite(baseline) || !Number.isFinite(observed)) return null;
  if (baseline === 0) return null;
  return ((observed - baseline) / baseline) * 100;
}

const TRAFFIC_HORIZON_DAYS: Record<"D+1" | "D+5" | "D+14", number> = {
  "D+1": 1,
  "D+5": 5,
  "D+14": 14,
};

export function computeTrafficOutcomes(args: {
  eventId: string;
  straitId: string;
  eventOn: string;
  baselineWindowDays: number;
  traffic: TrafficDay[];
}): OutcomeRow[] {
  const base = trafficBaseline(
    args.traffic,
    args.straitId,
    args.eventOn,
    args.baselineWindowDays,
  );
  const out: OutcomeRow[] = [];
  for (const horizon of ["D+1", "D+5", "D+14"] as const) {
    const date = addUtcDays(args.eventOn, TRAFFIC_HORIZON_DAYS[horizon]);
    const observed = trafficOnDate(args.traffic, args.straitId, date);
    if (!base) {
      out.push({
        eventId: args.eventId,
        metric: "traffic_total",
        horizon,
        baselineValue: null,
        observedValue: observed,
        deltaPct: null,
        sampleNote: "missing_baseline_window",
      });
      continue;
    }
    if (observed == null) {
      out.push({
        eventId: args.eventId,
        metric: "traffic_total",
        horizon,
        baselineValue: base.avg,
        observedValue: null,
        deltaPct: null,
        sampleNote: `missing_traffic_${date}`,
      });
      continue;
    }
    out.push({
      eventId: args.eventId,
      metric: "traffic_total",
      horizon,
      baselineValue: base.avg,
      observedValue: observed,
      deltaPct: pctChange(base.avg, observed),
      sampleNote: `baseline_days=${base.daysUsed}`,
    });
  }
  return out;
}

export function computePriceOutcomes(args: {
  eventId: string;
  eventOn: string;
  metric: string;
  series: PriceDay[];
}): OutcomeRow[] {
  const anchor = priceOnOrNextSession(args.series, args.eventOn);
  const out: OutcomeRow[] = [];
  for (const horizon of ["D+1", "D+5"] as const) {
    const days = horizon === "D+1" ? 1 : 5;
    if (!anchor) {
      out.push({
        eventId: args.eventId,
        metric: args.metric,
        horizon,
        baselineValue: null,
        observedValue: null,
        deltaPct: null,
        sampleNote: "missing_event_session",
      });
      continue;
    }
    const later = priceAfterSessions(args.series, anchor.date, days);
    if (!later) {
      out.push({
        eventId: args.eventId,
        metric: args.metric,
        horizon,
        baselineValue: anchor.value,
        observedValue: null,
        deltaPct: null,
        sampleNote: `missing_price_${horizon}`,
      });
      continue;
    }
    out.push({
      eventId: args.eventId,
      metric: args.metric,
      horizon,
      baselineValue: anchor.value,
      observedValue: later.value,
      deltaPct: pctChange(anchor.value, later.value),
      sampleNote:
        later.date === addUtcDays(anchor.date, days)
          ? null
          : `aligned_to_session_${later.date}`,
    });
  }
  return out;
}

export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/** 표본 5 미만이면 분포 통계 null + insufficient. */
export function distributionFromDeltas(
  metric: string,
  horizon: OutcomeHorizon,
  deltas: Array<number | null>,
): {
  metric: string;
  horizon: OutcomeHorizon;
  sampleSize: number;
  min: number | null;
  median: number | null;
  max: number | null;
  points: number[];
  insufficient: boolean;
} {
  const points = deltas.filter(
    (d): d is number => d != null && Number.isFinite(d),
  );
  const sampleSize = points.length;
  if (sampleSize < 5) {
    return {
      metric,
      horizon,
      sampleSize,
      min: null,
      median: null,
      max: null,
      points,
      insufficient: true,
    };
  }
  return {
    metric,
    horizon,
    sampleSize,
    min: Math.min(...points),
    median: medianOf(points),
    max: Math.max(...points),
    points,
    insufficient: false,
  };
}
