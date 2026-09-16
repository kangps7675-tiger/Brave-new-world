import { matchGazetteer } from "@/lib/geo/gazetteer";
import { matchConflictCategory } from "@/lib/conflictEvents/categoryKeywords";
import type { RawConflictEvent } from "@/lib/conflictEvents/types";
import type { HeroStatus, MediaTrustTier, NewsStreamItem } from "@/lib/news/types";

export type ExtractableItem = {
  id: string;
  title: string;
  snippet?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  occurredAt?: string | null;
  trustTier?: MediaTrustTier | null;
  heroStatus?: HeroStatus | null;
  channel?: RawConflictEvent["channel"];
};

function blobOf(item: ExtractableItem): string {
  return `${item.title} ${item.snippet ?? ""}`.trim();
}

/**
 * 키워드+지명 1차 매칭.
 * 좌표는 gazetteer 성공 시에만 채운다. 실패하면 lat/lng null — 지어내지 않음.
 * 카테고리 키워드가 없으면 후보가 아니다.
 */
export function extractRawConflictEvent(item: ExtractableItem): RawConflictEvent | null {
  const blob = blobOf(item);
  const cat = matchConflictCategory(blob);
  if (!cat) return null;
  const place = matchGazetteer(blob);
  return {
    id: item.id,
    title: item.title.trim(),
    snippet: (item.snippet ?? "").trim(),
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl ?? null,
    occurredAt: item.occurredAt ?? null,
    category: cat.category,
    keywords: cat.keywords,
    theater: place?.theater ?? null,
    lat: place ? place.lat : null,
    lng: place ? place.lng : null,
    matchedPlaceId: place?.id ?? null,
    extraction: "gazetteer",
    trustTier: item.trustTier ?? null,
    heroStatus: item.heroStatus ?? null,
    channel: item.channel ?? "rss",
  };
}

export function extractRawConflictEvents(items: ExtractableItem[]): RawConflictEvent[] {
  const out: RawConflictEvent[] = [];
  for (const item of items) {
    const raw = extractRawConflictEvent(item);
    if (raw) out.push(raw);
  }
  return out;
}

/** 좌표 없는 후보는 지도에 올리지 않는다. LLM 게이트 전 단계. */
export function locatedEventsOnly(events: RawConflictEvent[]): RawConflictEvent[] {
  return events.filter(
    (e) => typeof e.lat === "number" && typeof e.lng === "number" && Number.isFinite(e.lat) && Number.isFinite(e.lng),
  );
}

/** 좌표 미확정 + 카테고리 키워드는 걸린 애매 케이스 — LLM 후보 */
export function ambiguousUnlocatedEvents(events: RawConflictEvent[]): RawConflictEvent[] {
  return events.filter(
    (e) =>
      e.category !== "unknown" &&
      e.keywords.length > 0 &&
      (e.lat == null || e.lng == null),
  );
}

export function newsStreamItemToExtractable(item: NewsStreamItem): ExtractableItem {
  return {
    id: item.id,
    title: item.title,
    snippet: item.summary ?? "",
    sourceName: item.source,
    sourceUrl: item.link,
    occurredAt: item.pubDate,
    trustTier: item.trustTier,
    channel: "rss",
  };
}
