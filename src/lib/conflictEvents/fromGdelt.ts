import { matchConflictCategory } from "@/lib/conflictEvents/categoryKeywords";
import { displaySourceName } from "@/lib/conflictEvents/confidence";
import { matchGazetteer } from "@/lib/geo/gazetteer";
import type { ScoredEvent } from "@/data/eventTiers";
import type { RawConflictEvent } from "@/lib/conflictEvents/types";

function eventBlob(event: ScoredEvent): string {
  return `${event.title ?? ""} ${event.category ?? ""} ${event.country ?? ""}`;
}

export function scoredEventToRaw(event: ScoredEvent): RawConflictEvent {
  const blob = eventBlob(event);
  const cat = matchConflictCategory(blob);
  const place = matchGazetteer(blob);
  return {
    id: event.id,
    title: (event.title ?? event.category ?? "GDELT event").trim(),
    snippet: event.category ?? "",
    sourceName: displaySourceName("GDELT", event.sourceUrl),
    sourceUrl: event.sourceUrl,
    occurredAt: event.createdAt ?? event.eventDate,
    category: cat?.category ?? "unknown",
    keywords: cat?.keywords ?? [],
    theater: place?.theater ?? null,
    lat: event.lat,
    lng: event.lng,
    matchedPlaceId: place?.id ?? null,
    extraction: "gdelt",
    channel: "gdelt",
  };
}

export function scoredEventsToRaw(events: ScoredEvent[]): RawConflictEvent[] {
  return events.map(scoredEventToRaw);
}
