import { matchConflictCategory } from "@/lib/conflictEvents/categoryKeywords";
import { matchGazetteer } from "@/lib/geo/gazetteer";
import type { NewfeedsAttackPoint, NewfeedsAttackRaw } from "@/lib/newfeeds";
import type { RawConflictEvent } from "@/lib/conflictEvents/types";

export function newfeedsRawToConflictEvent(raw: NewfeedsAttackRaw): RawConflictEvent {
  const blob = `${raw.title_en ?? ""} ${raw.summary_en ?? ""} ${raw.classification?.location ?? ""}`;
  const cat = matchConflictCategory(blob);
  const place = matchGazetteer(blob);
  const lat = typeof raw.lat === "number" ? raw.lat : place?.lat ?? null;
  const lng = typeof raw.lng === "number" ? raw.lng : place?.lng ?? null;
  return {
    id: raw.id,
    title: (raw.title_en || raw.title_original || "Attack event").trim(),
    snippet: (raw.summary_en || raw.classification?.brief || "").trim(),
    sourceName: raw.source_name || "NewFeeds",
    sourceUrl: raw.url || null,
    occurredAt: raw.published || raw.fetched_at || null,
    category: cat?.category ?? "unknown",
    keywords: cat?.keywords ?? [],
    theater: place?.theater ?? "iran",
    lat,
    lng,
    matchedPlaceId: place?.id ?? null,
    extraction: "newfeeds",
    channel: "newfeeds",
    trustTier: 3,
  };
}

export function newfeedsPointToConflictEvent(point: NewfeedsAttackPoint): RawConflictEvent {
  const blob = `${point.title} ${point.summary} ${point.location}`;
  const cat = matchConflictCategory(blob);
  const place = matchGazetteer(blob);
  return {
    id: point.id,
    title: point.title,
    snippet: point.summary,
    sourceName: point.sourceName,
    sourceUrl: point.sourceUrl,
    occurredAt: point.publishedAt,
    category: cat?.category ?? "unknown",
    keywords: cat?.keywords ?? [],
    theater: place?.theater ?? "iran",
    lat: point.lat,
    lng: point.lng,
    matchedPlaceId: place?.id ?? null,
    extraction: "newfeeds",
    channel: "newfeeds",
    trustTier: 3,
  };
}
