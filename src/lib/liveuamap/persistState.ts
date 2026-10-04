/**
 * LiveUA 수집 상태 영속화 — 이벤트 링버퍼 · 일일 예산 · 지역별 마지막 호출 시각.
 *
 * 서버리스/HMR에서는 프로세스 메모리가 수시로 초기화된다. 그러면 예산 카운터와
 * minInterval이 리셋돼 호출이 몰리고(한도 낭비) 이벤트 목록은 비어 보인다.
 * 그래서 기존 `deepstate_occupied_snapshots`(cache_key 단일 행 키-값 패턴)에
 * 별도 cacheKey 두 개로 저장한다 — 스키마 변경·마이그레이션 없음.
 *
 * D1을 못 읽거나 쓰면 조용히 메모리 동작으로 돌아간다 (기존 동작과 동일).
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deepstateOccupiedSnapshots } from "@/db/schema";
import {
  exportLiveuamapBudgetState,
  hydrateLiveuamapBudgetState,
} from "@/lib/liveuamap/budget";
import {
  exportLiveuamapStoreState,
  hydrateLiveuamapStoreState,
} from "@/lib/liveuamap/store";
import {
  LIVEUA_MAX_EVENTS_PAYLOAD_BYTES,
  trimEventsToBytes,
} from "@/lib/liveuamap/eventsTrim";

export const LIVEUA_FEED_EVENTS_KEY = "liveua-feed-events";
export const LIVEUA_FEED_BUDGET_KEY = "liveua-feed-budget";

export { LIVEUA_MAX_EVENTS_PAYLOAD_BYTES, trimEventsToBytes };

/** GET 폴링(15초)마다 D1을 치지 않도록. */
const HYDRATE_MIN_INTERVAL_MS = 20_000;

let lastHydrateAt = 0;
let hydrateInFlight: Promise<void> | null = null;

async function readRow(key: string): Promise<{ payloadJson: string } | null> {
  const db = await getDb();
  const rows = await db
    .select({ payloadJson: deepstateOccupiedSnapshots.payloadJson })
    .from(deepstateOccupiedSnapshots)
    .where(eq(deepstateOccupiedSnapshots.cacheKey, key))
    .limit(1);
  return rows[0] ?? null;
}

async function writeRow(
  key: string,
  payload: unknown,
  count: number,
  fetchedAt: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(payload);
  await db
    .insert(deepstateOccupiedSnapshots)
    .values({
      cacheKey: key,
      payloadJson,
      featureCount: count,
      fetchedAt,
      source: "liveuamap-feed",
      deepstateId: null,
      ingestedAt: now,
    })
    .onConflictDoUpdate({
      target: deepstateOccupiedSnapshots.cacheKey,
      set: {
        payloadJson,
        featureCount: count,
        fetchedAt,
        source: "liveuamap-feed",
        deepstateId: null,
        ingestedAt: now,
      },
    });
}

/**
 * D1 → 메모리. 콜드스타트·HMR 직후 예산/이벤트를 복구한다.
 * `force`가 아니면 20초 안에 다시 부르지 않는다.
 */
export async function hydrateLiveuamapStateFromD1(
  options: { force?: boolean } = {},
): Promise<void> {
  const now = Date.now();
  if (!options.force && now - lastHydrateAt < HYDRATE_MIN_INTERVAL_MS) return;
  if (hydrateInFlight) return hydrateInFlight;

  hydrateInFlight = (async () => {
    try {
      const [budgetRow, eventsRow] = await Promise.all([
        readRow(LIVEUA_FEED_BUDGET_KEY),
        readRow(LIVEUA_FEED_EVENTS_KEY),
      ]);
      if (budgetRow?.payloadJson) {
        try {
          hydrateLiveuamapBudgetState(JSON.parse(budgetRow.payloadJson));
        } catch {
          /* 깨진 행은 무시 */
        }
      }
      if (eventsRow?.payloadJson) {
        try {
          hydrateLiveuamapStoreState(JSON.parse(eventsRow.payloadJson));
        } catch {
          /* 깨진 행은 무시 */
        }
      }
      lastHydrateAt = Date.now();
    } catch {
      /* D1 불가 — 메모리 동작 유지. lastHydrateAt은 갱신하지 않아 다음에 재시도 */
    } finally {
      hydrateInFlight = null;
    }
  })();
  return hydrateInFlight;
}

/**
 * 메모리 → D1. 쓰기 직전에 한 번 더 읽어 병합(max)하므로,
 * 다른 인스턴스가 올려둔 카운터를 낮은 값으로 덮어쓰지 않는다 (원자적이진 않다).
 * 이벤트가 0건이면 이벤트 행은 건드리지 않는다 — 복구 실패 상태가 D1을 비우지 못하게.
 */
export async function persistLiveuamapState(): Promise<boolean> {
  try {
    await hydrateLiveuamapStateFromD1({ force: true });

    const budget = exportLiveuamapBudgetState();
    await writeRow(
      LIVEUA_FEED_BUDGET_KEY,
      budget,
      budget.totalUsed,
      new Date().toISOString(),
    );

    const store = exportLiveuamapStoreState();
    if (store.events.length > 0) {
      const trimmed = trimEventsToBytes(store.events);
      await writeRow(
        LIVEUA_FEED_EVENTS_KEY,
        {
          events: trimmed,
          lastIngestAt: store.lastIngestAt,
          lastError: store.lastError,
        },
        trimmed.length,
        store.lastIngestAt ?? new Date().toISOString(),
      );
    }
    return true;
  } catch {
    return false;
  }
}

/** 테스트용 */
export function __resetLiveuamapPersistForTests() {
  lastHydrateAt = 0;
  hydrateInFlight = null;
}
