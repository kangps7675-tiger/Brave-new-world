/**
 * LiveUAMap mpts 지역 슬롯 — 일 200 req 예산 배분.
 * resid는 공식 Regions enum + 실측. LIVEUAMAP_RESID_MAP JSON으로 덮어쓰기.
 *
 * 기본값 (liveuamap.consolecsharp.api Regions):
 * Ukraine=0, IsraelPalestine=2, Yemen=53, Iran=66, Lebanon=74.
 * Lebanon은 IL/PS(2)와 분리해 전용 resid를 쓴다 — 공유 시 bbox에 통제면이 탈락하던 문제 방지.
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

/**
 * 발트 3국·동유럽(폴란드·루마니아·몰도바 등) 국경 침범·사보타주 전용 일일 요청 수.
 * 기존 배분에서 떼지 않고 **추가**한다 (우크라이나·이란·중동 몫은 그대로).
 * 지역 번호(LIVEUAMAP_RESID_MAP 의 "nato-east")가 없으면 슬롯이 꺼져 있고, 그동안 요청은 나가지 않는다.
 */
export const NATO_EAST_DAILY_CAP = 10;

/**
 * 플랜 배분: UA96 Iran48 YE24 LB16 IL12 NATO-E10 TW4 KR4 — 합 214, 번호가 없는 슬롯은 제외.
 * 위험도 순서 = 호출 우선순위: 우크라이나 → 이란 → 중동(예멘·레바논·이스라엘) → 동유럽(발트 3국).
 * 한 틱에 도는 슬롯 수가 제한돼 있어 배열 순서가 곧 우선순위다.
 * 하이브리드전 분류는 전용 슬롯과 무관하게 모든 슬롯 응답에 적용된다 (hybridWarfare.ts).
 */
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
    /** resid 2 통제면을 IL/PS bbox로 저장 — Lebanon(74)과 분리 */
    parseControl: true,
  },
  {
    id: "nato-east",
    dailyCap: NATO_EAST_DAILY_CAP,
    // 하루 10회 — 약 2.4시간에 한 번
    minIntervalMs: 2 * 60 * 60_000,
    theater: "russia-ukraine",
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
 * 기본 resid — 공식 Regions enum. LIVEUAMAP_RESID_MAP으로 덮어쓴다.
 * (-1 = 슬롯 비활성)
 */
const BUILTIN_RESIDS: Record<LiveuamapRegionId, number> = {
  ukraine: 0,
  iran: 66,
  yemen: 53,
  lebanon: 74,
  "israel-palestine": 2,
  taiwan: -1,
  korea: -1,
  /** 공식 지역 번호 미확인 — LIVEUAMAP_RESID_MAP 으로 설정하기 전까지 비활성 */
  "nato-east": -1,
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

/** 기존 200 + 발트·동유럽 전용 10회 (LIVEUAMAP_DAILY_BUDGET 으로 덮어쓸 수 있다) */
export const LIVEUAMAP_DAILY_BUDGET_DEFAULT = 210;

export function getLiveuamapDailyBudgetCap(): number {
  const raw = process.env.LIVEUAMAP_DAILY_BUDGET?.trim();
  if (!raw) return LIVEUAMAP_DAILY_BUDGET_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : LIVEUAMAP_DAILY_BUDGET_DEFAULT;
}
