import {
  computePriceOutcomes,
  computeTrafficOutcomes,
  distributionFromDeltas,
} from "@/lib/straitReplay/computeOutcomes";
import { FRED_SERIES_MAP } from "@/lib/straitReplay/fredSeriesMap";
import {
  buildSyntheticTrafficForEvent,
  loadSeedEventsForStrait,
  mergeTrafficDays,
} from "@/lib/straitReplay/loadSeed";
import type {
  OutcomeDistribution,
  OutcomeRow,
  StraitEvent,
  StraitId,
  StraitReplayResponse,
  TrafficDay,
} from "@/lib/straitReplay/types";
import { PRICE_HORIZONS, TRAFFIC_HORIZONS } from "@/lib/straitReplay/types";

const ATTRIBUTIONS = [
  {
    id: "portwatch",
    label: "IMF PortWatch",
    url: "https://portwatch.imf.org/",
    note: "Chokepoint daily transit volumes (IMF/Oxford).",
  },
  {
    id: "fred",
    label: "FRED",
    url: "https://fred.stlouisfed.org/",
    note: "Daily series for Brent, dollar index, VIX.",
  },
] as const;

function addUtcDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 같은 해협 + 같은 kind 우선, 부족하면 같은 해협 전체. reviewed만. */
export function pickSimilarEvents(
  all: StraitEvent[],
  focus: StraitEvent,
  limit = 12,
): StraitEvent[] {
  const reviewed = all.filter(
    (e) => e.reviewed && e.straitId === focus.straitId && e.id !== focus.id,
  );
  const sameKind = reviewed.filter((e) => e.kind === focus.kind);
  const rest = reviewed.filter((e) => e.kind !== focus.kind);
  return [...sameKind, ...rest]
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))
    .slice(0, limit);
}

export function buildDistributions(
  events: StraitEvent[],
  outcomes: OutcomeRow[],
): OutcomeDistribution[] {
  const dists: OutcomeDistribution[] = [];
  const eventIds = new Set(events.map((e) => e.id));
  for (const horizon of TRAFFIC_HORIZONS) {
    const deltas = outcomes
      .filter(
        (o) =>
          o.metric === "traffic_total" &&
          o.horizon === horizon &&
          eventIds.has(o.eventId),
      )
      .map((o) => o.deltaPct);
    dists.push(distributionFromDeltas("traffic_total", horizon, deltas));
  }
  for (const entry of FRED_SERIES_MAP) {
    for (const horizon of PRICE_HORIZONS) {
      const deltas = outcomes
        .filter(
          (o) =>
            o.metric === entry.metric &&
            o.horizon === horizon &&
            eventIds.has(o.eventId),
        )
        .map((o) => o.deltaPct);
      dists.push(distributionFromDeltas(entry.metric, horizon, deltas));
    }
  }
  return dists;
}

function trafficWindow(
  traffic: TrafficDay[],
  straitId: StraitId,
  eventOn: string,
): Array<{ date: string; vesselCount: number }> {
  const from = addUtcDays(eventOn, -14);
  const to = addUtcDays(eventOn, 14);
  return traffic
    .filter(
      (r) => r.straitId === straitId && r.date >= from && r.date <= to,
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => ({ date: r.date, vesselCount: r.vesselCount }));
}

export function buildReplayPayload(args: {
  straitId: StraitId;
  eventId?: string | null;
  events: StraitEvent[];
  traffic: TrafficDay[];
  outcomes: OutcomeRow[];
  /** FRED 없으면 가격 outcome은 비움 — 지어내지 않음 */
  priceByMetric?: Record<string, Array<{ date: string; value: number }>>;
}): StraitReplayResponse {
  const reviewed = args.events.filter(
    (e) => e.reviewed && e.straitId === args.straitId,
  );
  if (reviewed.length === 0) {
    return {
      straitId: args.straitId,
      event: null,
      similarEvents: [],
      outcomes: [],
      distributions: [],
      trafficSeries: [],
      sampleSize: 0,
      isSynthetic: false,
      dataThrough: dataThrough(args.traffic, args.straitId),
      lastEventOn: null,
      calmNote: true,
      attributions: [...ATTRIBUTIONS],
      emptyReason: "no_reviewed_events",
    };
  }

  const focus =
    (args.eventId
      ? reviewed.find((e) => e.id === args.eventId)
      : null) ??
    reviewed.slice().sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))[0]!;

  const similar = pickSimilarEvents(reviewed, focus);
  const cohort = [focus, ...similar];

  let outcomes = args.outcomes.filter((o) =>
    cohort.some((e) => e.id === o.eventId),
  );
  if (outcomes.length === 0) {
    outcomes = cohort.flatMap((e) => {
      const trafficRows = computeTrafficOutcomes({
        eventId: e.id,
        straitId: e.straitId,
        eventOn: e.occurredOn,
        baselineWindowDays: e.baselineWindowDays,
        traffic: args.traffic,
      });
      const priceRows = FRED_SERIES_MAP.flatMap((m) => {
        const series = args.priceByMetric?.[m.metric];
        if (!series?.length) return [];
        return computePriceOutcomes({
          eventId: e.id,
          eventOn: e.occurredOn,
          metric: m.metric,
          series,
        });
      });
      return [...trafficRows, ...priceRows];
    });
  }

  const lastEventOn = reviewed
    .map((e) => e.occurredOn)
    .sort()
    .at(-1)!;
  const sevenAgo = addUtcDays(new Date().toISOString().slice(0, 10), -7);
  const calmNote = !reviewed.some((e) => e.occurredOn >= sevenAgo);

  return {
    straitId: args.straitId,
    event: focus,
    similarEvents: similar,
    outcomes,
    distributions: buildDistributions(cohort, outcomes),
    trafficSeries: trafficWindow(args.traffic, args.straitId, focus.occurredOn),
    sampleSize: cohort.length,
    isSynthetic: cohort.some((e) => e.isSynthetic),
    dataThrough: dataThrough(args.traffic, args.straitId),
    lastEventOn,
    calmNote,
    attributions: [...ATTRIBUTIONS],
    emptyReason: null,
  };
}

function dataThrough(
  traffic: TrafficDay[],
  straitId: StraitId,
): string | null {
  const dates = traffic
    .filter((r) => r.straitId === straitId)
    .map((r) => r.date)
    .sort();
  return dates.at(-1) ?? null;
}

/** D1 비어 있을 때 시드 JSON + 합성 통행으로 응답 (샘플 배지 필수). */
export function buildSeedFallbackReplay(
  straitId: StraitId,
  eventId?: string | null,
): StraitReplayResponse {
  const events = loadSeedEventsForStrait(straitId);
  const traffic = mergeTrafficDays(
    events.flatMap((e) => buildSyntheticTrafficForEvent(e)),
  );
  return buildReplayPayload({
    straitId,
    eventId,
    events,
    traffic,
    outcomes: [],
    priceByMetric: {},
  });
}
