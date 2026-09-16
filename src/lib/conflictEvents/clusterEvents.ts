import { CLUSTER_DEFAULTS } from "@/lib/conflictEvents/clusterConfig";
import {
  clusterHeroStatus,
  clusterTrustTier,
  confidenceFromSourceCount,
  uniqueSourceKey,
} from "@/lib/conflictEvents/confidence";
import { geohashEncode, haversineKm, jaccard, parseOccurredAt } from "@/lib/conflictEvents/geo";
import { locatedEventsOnly } from "@/lib/conflictEvents/extractRawEvents";
import type {
  ClusterThresholds,
  ConflictEventCluster,
  ConflictEventSource,
  RawConflictEvent,
} from "@/lib/conflictEvents/types";

function keywordBag(event: RawConflictEvent): string[] {
  const bag = [...event.keywords];
  if (event.category !== "unknown") bag.push(event.category);
  return bag;
}

function occurredMs(event: RawConflictEvent): number {
  return parseOccurredAt(event.occurredAt) ?? 0;
}

function shouldMerge(
  a: RawConflictEvent,
  b: RawConflictEvent,
  thresholds: ClusterThresholds,
): boolean {
  const ta = occurredMs(a);
  const tb = occurredMs(b);
  if (ta && tb && Math.abs(ta - tb) > thresholds.maxTimeDiffMs) return false;
  if (!a.lat || !a.lng || !b.lat || !b.lng) return false;
  const hashA = geohashEncode(a.lat, a.lng, thresholds.geohashPrecision);
  const hashB = geohashEncode(b.lat, b.lng, thresholds.geohashPrecision);
  const geoOk =
    hashA === hashB ||
    haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }) <=
      thresholds.maxDistanceKm;
  if (!geoOk) return false;
  return jaccard(keywordBag(a), keywordBag(b)) >= thresholds.minJaccard;
}

function sourceOf(event: RawConflictEvent): ConflictEventSource {
  return {
    id: event.id,
    name: event.sourceName,
    url: event.sourceUrl,
    title: event.title,
    occurredAt: event.occurredAt,
    trustTier: event.trustTier,
    heroStatus: event.heroStatus,
    channel: event.channel,
  };
}

function mergeCluster(members: RawConflictEvent[]): ConflictEventCluster {
  const sorted = [...members].sort((a, b) => occurredMs(a) - occurredMs(b));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const unique = new Map<string, ConflictEventSource>();
  for (const ev of sorted) {
    const src = sourceOf(ev);
    const key = uniqueSourceKey(src.name, src.url);
    if (!unique.has(key)) unique.set(key, src);
  }
  const sources = Array.from(unique.values());
  const confidence = confidenceFromSourceCount(sources.length);
  const trustTier = clusterTrustTier(sources.map((s) => s.trustTier));
  const heroStatus = clusterHeroStatus({
    confidence,
    trustTier,
    statuses: sources.map((s) => s.heroStatus),
  });
  const lat =
    sorted.reduce((sum, e) => sum + (e.lat ?? 0), 0) / sorted.length;
  const lng =
    sorted.reduce((sum, e) => sum + (e.lng ?? 0), 0) / sorted.length;
  const keywords = Array.from(new Set(sorted.flatMap((e) => e.keywords)));
  const firstSeenAt = first.occurredAt ?? new Date(occurredMs(first) || Date.now()).toISOString();
  const lastConfirmedAt = last.occurredAt ?? firstSeenAt;
  const hash = geohashEncode(lat, lng, 5);
  return {
    clusterId: `ce-${hash}-${first.id}`,
    lat,
    lng,
    category: first.category,
    theater: first.theater ?? last.theater,
    keywords,
    title: last.title || first.title,
    snippet: last.snippet || first.snippet,
    sources,
    firstSeenAt,
    lastConfirmedAt,
    confidence,
    trustTier,
    heroStatus,
    matchedPlaceId: last.matchedPlaceId ?? first.matchedPlaceId,
  };
}

/**
 * geohash~5 일치 OR 거리≤10km, AND |Δt|≤2h, AND 키워드 자카드 ≥ 임계치.
 * 좌표 없는 이벤트는 클러스터에 넣지 않는다.
 */
export function clusterConflictEvents(
  events: RawConflictEvent[],
  thresholds: ClusterThresholds = CLUSTER_DEFAULTS,
): ConflictEventCluster[] {
  const located = locatedEventsOnly(events).sort((a, b) => occurredMs(a) - occurredMs(b));
  const parent = located.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const a = find(i);
    const b = find(j);
    if (a !== b) parent[a] = b;
  };

  for (let i = 0; i < located.length; i += 1) {
    const a = located[i];
    const ta = occurredMs(a);
    for (let j = i + 1; j < located.length; j += 1) {
      const b = located[j];
      const tb = occurredMs(b);
      if (ta && tb && tb - ta > thresholds.maxTimeDiffMs) break;
      if (shouldMerge(a, b, thresholds)) union(i, j);
    }
  }

  const groups = new Map<number, RawConflictEvent[]>();
  located.forEach((ev, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(ev);
    groups.set(root, list);
  });

  return Array.from(groups.values()).map(mergeCluster);
}

/** 클러스터링 전 대비 중복 핀 비율 — 같은 좌표 격자에서 핀이 2개 이상인 비율 */
export function duplicatePinRate(count: number, uniqueKeys: number): number {
  if (count <= 0) return 0;
  return Math.max(0, (count - uniqueKeys) / count);
}
