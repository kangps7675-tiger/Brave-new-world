import { INTEREST_BUCKETS_MAX, type InterestBucket, type InterestProfile, type InterestState } from "@/lib/interest/interestTypes";

/** 반감기(일) — 최근 행동이 더 강하게 */
const HALF_LIFE_DAYS = 7;

function decayWeight(ageMs: number): number {
  const ageDays = Math.max(0, ageMs) / (24 * 60 * 60 * 1000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function bucketKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

export function deriveInterestProfile(
  state: InterestState,
  now = Date.now(),
): InterestProfile {
  const map = new Map<string, InterestBucket>();

  for (const event of state.events) {
    const id = event.id.trim();
    if (!id) continue;
    const key = bucketKey(event.kind, id);
    const w = (event.weight ?? 1) * decayWeight(now - event.at);
    const prev = map.get(key);
    if (prev) {
      prev.score += w;
      prev.count += 1;
      prev.lastAt = Math.max(prev.lastAt, event.at);
      if (event.label && !prev.label) prev.label = event.label;
    } else {
      map.set(key, {
        kind: event.kind,
        id,
        label: event.label,
        score: w,
        count: 1,
        lastAt: event.at,
      });
    }
  }

  const buckets = [...map.values()]
    .sort((a, b) => b.score - a.score || b.lastAt - a.lastAt)
    .slice(0, INTEREST_BUCKETS_MAX);

  const byKind = (kind: InterestBucket["kind"], n: number) =>
    buckets.filter((b) => b.kind === kind).slice(0, n);

  return {
    buckets,
    topTheaters: byKind("theater", 6),
    topThemes: byKind("theme", 4),
    topSymbols: byKind("symbol", 4),
    eventCount: state.events.length,
  };
}
