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

/** 테스트용 */
export function __resetLiveuamapBudgetForTests() {
  state = freshDay(utcDayKey());
}
