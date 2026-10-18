import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import {
  getLiveuamapBudgetSnapshot,
} from "@/lib/liveuamap/budget";

/**
 * 지역별 최신 속보 상한 — mpts `count`(LIVEUAMAP_MPTS_COUNT=200)과 맞춤.
 * 전역 링버퍼만 쓰면 우크라가 비우크라 슬롯을 밀어내므로 regionId당 유지.
 */
export const LIVEUAMAP_MAX_EVENTS_PER_REGION = 200;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
/**
 * 하이브리드전 사건은 드물고 우크라 전투 속보에 묻히기 쉬워 따로 보관한다.
 * 지역별 창과 48시간을 넘겨 72시간·최대 40건까지 유지.
 */
const HYBRID_MAX_AGE_MS = 72 * 60 * 60 * 1000;
export const LIVEUAMAP_MAX_HYBRID_EVENTS = 40;

let events: LiveuamapEvent[] = [];
let lastIngestAt: string | null = null;
let lastError: string | null = null;

function prune(list: LiveuamapEvent[]): LiveuamapEvent[] {
  const now = Date.now();
  const cutoff = now - MAX_AGE_MS;
  const hybridCutoff = now - HYBRID_MAX_AGE_MS;
  const isHybrid = (e: LiveuamapEvent) => (e.tags ?? []).includes("hybrid");
  const fresh = list
    .filter((e) => {
      const t = Date.parse(e.publishedAt);
      if (!Number.isFinite(t)) return true;
      return t >= (isHybrid(e) ? hybridCutoff : cutoff);
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const perRegion = new Map<string, number>();
  const out: LiveuamapEvent[] = [];
  const kept = new Set<string>();
  for (const e of fresh) {
    const n = perRegion.get(e.regionId) ?? 0;
    if (n >= LIVEUAMAP_MAX_EVENTS_PER_REGION) continue;
    perRegion.set(e.regionId, n + 1);
    out.push(e);
    kept.add(e.id);
  }
  // 창에서 밀려난 하이브리드 사건을 따로 살린다 (최신순, 상한 내)
  let hybridExtra = 0;
  for (const e of fresh) {
    if (kept.has(e.id) || !isHybrid(e)) continue;
    if (hybridExtra >= LIVEUAMAP_MAX_HYBRID_EVENTS) break;
    out.push(e);
    kept.add(e.id);
    hybridExtra += 1;
  }
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function getLiveuamapStore() {
  return {
    events: prune(events),
    lastIngestAt,
    lastError,
    budget: getLiveuamapBudgetSnapshot(),
  };
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

/** id 기준 merge — 신규·갱신 앞쪽, KO 필드 보존 */
export function mergeLiveuamapEvents(
  incoming: LiveuamapEvent[],
  fetchedAt?: string | null,
  error?: string | null,
) {
  if (!incoming.length) {
    if (error) lastError = error;
    if (fetchedAt) lastIngestAt = fetchedAt;
    return;
  }
  const byId = new Map<string, LiveuamapEvent>();
  for (const e of events) byId.set(e.id, e);
  for (const e of incoming) {
    const prev = byId.get(e.id);
    byId.set(e.id, {
      ...prev,
      ...e,
      titleKo: e.titleKo || prev?.titleKo,
      bodyKo: e.bodyKo || prev?.bodyKo,
      // 처음 받은 시각은 유지한다
      seenAt: prev?.seenAt ?? e.seenAt ?? fetchedAt ?? new Date().toISOString(),
    });
  }
  events = prune([...byId.values()]);
  lastIngestAt = fetchedAt ?? new Date().toISOString();
  lastError = error ?? null;
}

export function pushLiveuamapEvent(event: LiveuamapEvent) {
  events = prune([event, ...events.filter((e) => e.id !== event.id)]);
  lastIngestAt = new Date().toISOString();
  lastError = null;
}

export type LiveuamapStorePersisted = {
  events: LiveuamapEvent[];
  lastIngestAt: string | null;
  lastError?: string | null;
};

/** D1/디스크용 이벤트 링버퍼 스냅샷. */
export function exportLiveuamapStoreState(): LiveuamapStorePersisted {
  return {
    events: prune(events),
    lastIngestAt,
    lastError,
  };
}

function isLiveuamapEvent(value: unknown): value is LiveuamapEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.regionId === "string" &&
    typeof e.lat === "number" &&
    typeof e.lng === "number" &&
    typeof e.title === "string" &&
    typeof e.publishedAt === "string"
  );
}

/**
 * 저장된 이벤트를 메모리에 병합. 동일 id는 메모리(현재)가 우선, 나머지는 저장분이 채운다.
 * lastIngestAt도 메모리가 이미 있으면 유지.
 */
export function hydrateLiveuamapStoreState(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const saved = raw as Record<string, unknown>;
  const incoming = Array.isArray(saved.events)
    ? saved.events.filter(isLiveuamapEvent)
    : [];
  if (!incoming.length && saved.lastIngestAt == null && saved.lastError == null) return;

  const byId = new Map<string, LiveuamapEvent>();
  for (const e of incoming) byId.set(e.id, e);
  for (const e of events) byId.set(e.id, e); // 메모리 wins
  events = prune([...byId.values()]);

  if (lastIngestAt == null && typeof saved.lastIngestAt === "string") {
    lastIngestAt = saved.lastIngestAt;
  }
  if (lastError == null && typeof saved.lastError === "string") {
    lastError = saved.lastError;
  }
}

/** 테스트용 */
export function __resetLiveuamapStoreForTests() {
  events = [];
  lastIngestAt = null;
  lastError = null;
}
