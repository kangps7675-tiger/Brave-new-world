import type { LiveuamapEvent } from "@/lib/liveuamap/types";

/** 24–48h 링버퍼 — 프로세스 메모리 (telegramAlertStore 패턴) */
const MAX_EVENTS = 400;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

let events: LiveuamapEvent[] = [];
let lastIngestAt: string | null = null;
let lastError: string | null = null;

function prune(list: LiveuamapEvent[]): LiveuamapEvent[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return list
    .filter((e) => {
      const t = Date.parse(e.publishedAt);
      return Number.isFinite(t) ? t >= cutoff : true;
    })
    .slice(0, MAX_EVENTS);
}

export function getLiveuamapStore() {
  return { events: prune(events), lastIngestAt, lastError };
}

export function replaceLiveuamapEvents(
  next: LiveuamapEvent[],
  fetchedAt?: string | null,
  error?: string | null,
) {
  events = prune(next);
  lastIngestAt = fetchedAt ?? new Date().toISOString();
  lastError = error ?? null;
}

export function pushLiveuamapEvent(event: LiveuamapEvent) {
  events = prune([event, ...events.filter((e) => e.id !== event.id)]);
  lastIngestAt = new Date().toISOString();
  lastError = null;
}
