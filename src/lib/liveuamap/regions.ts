/**
 * LiveUAMap mpts 지역 슬롯 — 일 200 req 예산 배분.
 * resid는 포털/실측으로 확정. LIVEUAMAP_RESID_MAP JSON으로 덮어쓰기.
 *
 * 실측(2026-10): Ukraine=0, Lebanon/IL-PS 공유=2.
 * Iran·Yemen 전용 resid는 포털에서 확인 후 env로 넣는다.
 */

import type { LiveuamapRegionId } from "@/lib/liveuamap/types";
import type { NewsTheater } from "@/lib/news/types";

export type LiveuamapRegionSlot = {
  id: LiveuamapRegionId;
  resid: number;
  dailyCap: number;
  /** 최소 호출 간격 */
  minIntervalMs: number;
  theater: NewsTheater;
  /** fields/kmls/Polygon 통제면 파싱 대상 */
  parseControl: boolean;
};

/** 플랜 배분: UA96 Iran48 YE24 LB16 IL12 TW4 KR4 — 합 204 → 실무 200 캡 */
const BUILTIN_SLOTS: Omit<LiveuamapRegionSlot, "resid">[] = [
  {
    id: "ukraine",
    dailyCap: 96,
    minIntervalMs: 15 * 60_000,
    theater: "russia-ukraine",
    parseControl: true,
  },
  {
    id: "iran",
    dailyCap: 48,
    minIntervalMs: 30 * 60_000,
    theater: "middle-east",
    parseControl: true,
  },
  {
    id: "yemen",
    dailyCap: 24,
    minIntervalMs: 60 * 60_000,
    theater: "middle-east",
    parseControl: true,
  },
  {
    id: "lebanon",
    dailyCap: 16,
    minIntervalMs: 90 * 60_000,
    theater: "middle-east",
    parseControl: true,
  },
  {
    id: "israel-palestine",
    dailyCap: 12,
    minIntervalMs: 2 * 60 * 60_000,
    theater: "middle-east",
    parseControl: false,
  },
  {
    id: "taiwan",
    dailyCap: 4,
    minIntervalMs: 6 * 60 * 60_000,
    theater: "china-taiwan",
    parseControl: false,
  },
  {
    id: "korea",
    dailyCap: 4,
    minIntervalMs: 6 * 60 * 60_000,
    theater: "korea",
    parseControl: false,
  },
];

/**
 * 기본 resid — 실측분 내장. 나머지는 LIVEUAMAP_RESID_MAP으로 덮어쓴다.
 * (-1 = 슬롯 비활성)
 */
const BUILTIN_RESIDS: Record<LiveuamapRegionId, number> = {
  ukraine: 0,
  iran: -1,
  yemen: -1,
  lebanon: 2,
  "israel-palestine": 2,
  taiwan: -1,
  korea: -1,
};

function parseResidMapEnv(): Partial<Record<LiveuamapRegionId, number>> {
  const raw = process.env.LIVEUAMAP_RESID_MAP?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<LiveuamapRegionId, number>> = {};
    for (const slot of BUILTIN_SLOTS) {
      const v = parsed[slot.id];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        out[slot.id] = Math.floor(v);
      } else if (typeof v === "string" && /^\d+$/.test(v.trim())) {
        out[slot.id] = Number(v.trim());
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function resolveResidMap(): Record<LiveuamapRegionId, number> {
  const overlay = parseResidMapEnv();
  return { ...BUILTIN_RESIDS, ...overlay };
}

export function getLiveuamapRegionSlots(): LiveuamapRegionSlot[] {
  const resids = resolveResidMap();
  return BUILTIN_SLOTS.map((slot) => ({
    ...slot,
    resid: resids[slot.id],
  })).filter((slot) => slot.resid >= 0);
}

export function getRegionSlot(id: LiveuamapRegionId): LiveuamapRegionSlot | null {
  return getLiveuamapRegionSlots().find((s) => s.id === id) ?? null;
}

export const LIVEUAMAP_DAILY_BUDGET_DEFAULT = 200;

export function getLiveuamapDailyBudgetCap(): number {
  const raw = process.env.LIVEUAMAP_DAILY_BUDGET?.trim();
  if (!raw) return LIVEUAMAP_DAILY_BUDGET_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : LIVEUAMAP_DAILY_BUDGET_DEFAULT;
}
