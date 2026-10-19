import { liveuaConfirmedStrike, type LiveuaStrikeKind } from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import { resolveNewsCoords } from "@/lib/news/newsStreamMapTags";
import type { NewsStreamItem } from "@/lib/news/types";

/**
 * 지구 전역 공습 불꽃 — 드론·미사일·유도폭탄이 실제로 떨어진 곳.
 * 출처는 셋: liveuamap 속보, NewFeeds 공격 분류(이란·걸프·중동 일대), RSS 뉴스(지명을 좌표로 풀 수 있는 것).
 * 같은 사건은 한 번만 찍고, 가장 최신 것부터 상한까지 둔다.
 */
export type StrikeOrigin = "liveuamap" | "newfeeds" | "rss";

export type StrikeFlame = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  /** 큰 양피지에 싣는 사건 설명 */
  body: string;
  kind: LiveuaStrikeKind;
  region: string;
  publishedAt: string;
  origin: StrikeOrigin;
  /** 출처 줄 — NewFeeds는 약관상 출처를 반드시 표기한다 */
  source: string;
  /** 원문 링크 */
  url?: string;
};

const NEWFEEDS_MAX_AGE_MS = 48 * 3_600_000;
const RSS_MAX_AGE_MS = 24 * 3_600_000;

export function flamesFromLiveua(events: readonly LiveuamapEvent[], ko: boolean): StrikeFlame[] {
  const out: StrikeFlame[] = [];
  for (const ev of events) {
    const hit = liveuaConfirmedStrike(ev);
    if (!hit || !Number.isFinite(ev.lat) || !Number.isFinite(ev.lng)) continue;
    out.push({
      id: ev.id,
      lat: ev.lat,
      lng: ev.lng,
      title: ko ? ev.titleKo?.trim() || ev.title : ev.title,
      body: ko ? ev.bodyKo?.trim() || ev.body : ev.body,
      kind: hit.kind,
      region: ev.regionId,
      publishedAt: ev.publishedAt,
      origin: "liveuamap",
      source: "Liveuamap",
      url: ev.sourceUrl,
    });
  }
  return out;
}

export function flamesFromNewfeeds(
  attacks: readonly NewfeedsAttackPoint[],
  now: number = Date.now(),
): StrikeFlame[] {
  const out: StrikeFlame[] = [];
  for (const a of attacks) {
    if (!Number.isFinite(a.lat) || !Number.isFinite(a.lng)) continue;
    const at = a.publishedAt ? Date.parse(a.publishedAt) : Number.NaN;
    if (!Number.isFinite(at) || now - at > NEWFEEDS_MAX_AGE_MS || at > now + 3_600_000) continue;
    const hit = liveuaConfirmedStrike({
      title: a.title,
      body: a.summary,
      tags: [a.category],
      lat: a.lat,
      lng: a.lng,
    });
    if (!hit) continue;
    out.push({
      id: `nf:${a.id}`,
      lat: a.lat,
      lng: a.lng,
      title: a.title,
      body: a.summary,
      kind: hit.kind,
      region: a.region || "newfeeds",
      publishedAt: a.publishedAt!,
      origin: "newfeeds",
      source: `NewFeeds · ${a.sourceName}`,
      url: a.sourceUrl ?? undefined,
    });
  }
  return out;
}

/**
 * RSS 뉴스 — 제목·요약에서 지명을 좌표로 풀 수 있고, 드론·미사일이 실제로 맞았다고 읽히는 건만.
 * 지명을 못 푸는 기사는 불꽃이 될 수 없다(좌표를 지어내지 않는다).
 */
export function flamesFromNews(
  items: readonly NewsStreamItem[],
  ko: boolean,
  now: number = Date.now(),
): StrikeFlame[] {
  const out: StrikeFlame[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const at = Date.parse(item.pubDate);
    if (!Number.isFinite(at) || now - at > RSS_MAX_AGE_MS || at > now + 3_600_000) continue;
    const coords = resolveNewsCoords(item);
    if (!coords) continue;
    const hit = liveuaConfirmedStrike({
      title: item.title,
      body: item.summary ?? "",
      titleKo: item.titleKo,
      bodyKo: item.bodyKo,
      tags: [],
      lat: coords.lat,
      lng: coords.lng,
    });
    if (!hit) continue;
    out.push({
      id: `rss:${item.id}`,
      lat: coords.lat,
      lng: coords.lng,
      title: ko ? item.titleKo?.trim() || item.title : item.title,
      body: ko ? item.bodyKo?.trim() || item.summary || "" : item.summary || "",
      kind: hit.kind,
      region: item.theater,
      publishedAt: new Date(at).toISOString(),
      origin: "rss",
      source: `RSS · ${item.publisher || item.source}`,
      url: item.link,
    });
  }
  return out;
}

const KM_PER_DEG = 111;

function sameEvent(a: StrikeFlame, b: StrikeFlame): boolean {
  if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > 12 * 3_600_000) return false;
  const dLat = (a.lat - b.lat) * KM_PER_DEG;
  const dLng = (a.lng - b.lng) * KM_PER_DEG * Math.cos((b.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng) < 30;
}

/**
 * 같은 사건(30km 안 · 12시간 안)이 여러 출처에 있으면 앞 그룹 것만 남긴다 — 순서가 곧 우선순위.
 * 결과는 최신순, 상한까지.
 */
export function mergeStrikeFlames(groups: StrikeFlame[][], max = 150): StrikeFlame[] {
  const kept: StrikeFlame[] = [];
  for (const group of groups) {
    const base = kept.length;
    for (const f of group) {
      if (!kept.slice(0, base).some((k) => sameEvent(k, f))) kept.push(f);
    }
  }
  return kept
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, max);
}
