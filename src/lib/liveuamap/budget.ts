/**
 * LiveUAMap 일일 요청 예산 (UTC day) — 프로세스 메모리.
 */

import {
  getLiveuamapDailyBudgetCap,
  getLiveuamapRegionSlots,
  type LiveuamapRegionSlot,
} from "@/lib/liveuamap/regions";
import type { LiveuamapRegionId } from "@/lib/liveuamap/types";

type DayState = {
  dayUtc: string;
  totalUsed: number;
  perRegion: Partial<Record<LiveuamapRegionId, number>>;
  lastFetchAt: Partial<Record<LiveuamapRegionId, number>>;
};

let state: DayState = freshDay(utcDayKey());

function utcDayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function freshDay(dayUtc: string): DayState {
  return { dayUtc, totalUsed: 0, perRegion: {}, lastFetchAt: {} };
}

function rollDay(now = Date.now()) {
  const key = utcDayKey(now);
  if (state.dayUtc !== key) state = freshDay(key);
}

export function getLiveuamapBudgetSnapshot() {
  rollDay();
  return {
    dayUtc: state.dayUtc,
    used: state.totalUsed,
    cap: getLiveuamapDailyBudgetCap(),
    perRegion: { ...state.perRegion },
    lastFetchAt: { ...state.lastFetchAt },
  };
}

export function recordLiveuamapFetch(regionId: LiveuamapRegionId, now = Date.now()) {
  rollDay(now);
  state.totalUsed += 1;
  state.perRegion[regionId] = (state.perRegion[regionId] ?? 0) + 1;
  state.lastFetchAt[regionId] = now;
}

/** HTTP 없이 동일 resid 공유 슬롯의 interval만 갱신 (예산 카운트 없음). */
export function touchLiveuamapSlot(regionId: LiveuamapRegionId, now = Date.now()) {
  rollDay(now);
  state.lastFetchAt[regionId] = now;
}

/**
 * cron 틱에서 호출할 due 슬롯 (잔여 예산·지역 캡·minInterval).
 * 우선순위: regions.ts 배열 순서 (UA → Iran → …).
 */
export function selectDueLiveuamapSlots(now = Date.now(), maxSlots = 3): LiveuamapRegionSlot[] {
  rollDay(now);
  const cap = getLiveuamapDailyBudgetCap();
  const remaining = cap - state.totalUsed;
  if (remaining <= 0) return [];

  const due: LiveuamapRegionSlot[] = [];
  for (const slot of getLiveuamapRegionSlots()) {
    if (due.length >= maxSlots) break;
    if (due.length >= remaining) break;
    const usedRegion = state.perRegion[slot.id] ?? 0;
    if (usedRegion >= slot.dailyCap) continue;
    const last = state.lastFetchAt[slot.id] ?? 0;
    if (last > 0 && now - last < slot.minIntervalMs) continue;
    due.push(slot);
  }
  return due;
}

export type LiveuamapBudgetPersisted = {
  dayUtc: string;
  totalUsed: number;
  perRegion: Partial<Record<LiveuamapRegionId, number>>;
  lastFetchAt: Partial<Record<LiveuamapRegionId, number>>;
};

/** D1/디스크용 직렬화 스냅샷 (일일 카운터·minInterval). */
export function exportLiveuamapBudgetState(now = Date.now()): LiveuamapBudgetPersisted {
  rollDay(now);
  return {
    dayUtc: state.dayUtc,
    totalUsed: state.totalUsed,
    perRegion: { ...state.perRegion },
    lastFetchAt: { ...state.lastFetchAt },
  };
}

function isRegionId(key: string): key is LiveuamapRegionId {
  return (
    key === "ukraine" ||
    key === "iran" ||
    key === "yemen" ||
    key === "lebanon" ||
    key === "israel-palestine" ||
    key === "taiwan" ||
    key === "korea"
  );
}

/**
 * 저장된 예산을 메모리에 병합. 다른 UTC day·깨진 payload는 무시.
 * 카운터는 max merge — 낮은 값으로 덮어쓰지 않는다.
 */
export function hydrateLiveuamapBudgetState(raw: unknown, now = Date.now()): void {
  if (!raw || typeof raw !== "object") return;
  const saved = raw as Record<string, unknown>;
  if (typeof saved.dayUtc !== "string") return;
  if (typeof saved.totalUsed !== "number" || !Number.isFinite(saved.totalUsed)) return;

  rollDay(now);
  if (saved.dayUtc !== state.dayUtc) return;

  state.totalUsed = Math.max(state.totalUsed, Math.max(0, Math.floor(saved.totalUsed)));

  if (saved.perRegion && typeof saved.perRegion === "object") {
    for (const [key, value] of Object.entries(saved.perRegion as Record<string, unknown>)) {
      if (!isRegionId(key)) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      state.perRegion[key] = Math.max(state.perRegion[key] ?? 0, Math.max(0, Math.floor(value)));
    }
  }

  if (saved.lastFetchAt && typeof saved.lastFetchAt === "object") {
    for (const [key, value] of Object.entries(saved.lastFetchAt as Record<string, unknown>)) {
      if (!isRegionId(key)) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      state.lastFetchAt[key] = Math.max(state.lastFetchAt[key] ?? 0, value);
    }
  }
}

/** 테스트용 */
export function __resetLiveuamapBudgetForTests() {
  state = freshDay(utcDayKey());
}
