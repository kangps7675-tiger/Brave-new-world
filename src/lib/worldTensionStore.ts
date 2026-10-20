import type { WorldTensionSnapshot } from "@/lib/dailyRanks";

/**
 * GTI(세계 긴장지수) 단일 소스 캐시.
 *
 * 문제: 화면마다(상단 칩 · 일일 랭킹 공유 패널 등) `/api/daily-ranks`를
 * 각자 독립적으로 fetch하고 있었다. cron 갱신·D1 반영 타이밍에 따라
 * 같은 순간에도 화면마다 다른 GTI 숫자가 보일 수 있었다
 * (예: 상단 칩 59 vs 좌측 패널 56, 전일 대비 +2 vs +1.9 — 2026-08-30 사용자 리포트).
 *
 * 이 모듈은 날짜별로 "진행 중인 fetch 1개 + 최신 결과"만 유지하고,
 * 모든 구독자에게 같은 결과를 동시에 통지한다. 화면에 GTI 점수/Δ를
 * 보여주는 컴포넌트는 각자 fetch하지 말고 이 모듈(또는
 * `useWorldTensionSnapshot` 훅)을 거칠 것.
 *
 * 참고: 서버(`lib/dailyRanks.ts`)는 공식 스냅샷이 없을 때
 * `deriveWorldTensionFromTheaters`(EMA 스무딩 없는 폴백)를 대신 채워
 * 넣는다. 이 모듈은 그 사실 자체를 없애진 않지만, 최소한 같은 순간에
 * 화면마다 다른 값을 보여주는 문제는 없앤다. 폴백 사용 여부는
 * `snapshot.method === "theater-blend-fallback"`로 확인 가능
 * (→ `isEstimate`).
 */

export type WorldTensionEntry = {
  snapshot: WorldTensionSnapshot | null;
  fetchedAt: string | null;
};

type Listener = (entry: WorldTensionEntry) => void;

type StoreRecord = {
  entry: WorldTensionEntry;
  listeners: Set<Listener>;
  inFlight: Promise<void> | null;
};

const records = new Map<string, StoreRecord>();

function keyFor(date?: string | null): string {
  return date || "today";
}

function getRecord(key: string): StoreRecord {
  let rec = records.get(key);
  if (!rec) {
    rec = { entry: { snapshot: null, fetchedAt: null }, listeners: new Set(), inFlight: null };
    records.set(key, rec);
  }
  return rec;
}

/** 캐시된 현재 값 (없으면 snapshot: null). 동기 — fetch를 트리거하지 않음. */
export function getWorldTensionEntry(date?: string | null): WorldTensionEntry {
  return getRecord(keyFor(date)).entry;
}

/** 값이 바뀔 때마다 통지. date는 `refreshWorldTension`과 같은 값을 넘길 것. */
export function subscribeWorldTension(
  date: string | null | undefined,
  listener: Listener,
): () => void {
  const rec = getRecord(keyFor(date));
  rec.listeners.add(listener);
  return () => {
    rec.listeners.delete(listener);
  };
}

/**
 * 공유 캐시를 최신화한다. 같은 날짜에 대해 이미 진행 중인 fetch가 있으면
 * 새로 요청하지 않고 그 결과를 같이 기다린다 — 여러 컴포넌트가 동시에
 * 마운트돼도 네트워크 요청은 한 번만 나간다.
 */
export function refreshWorldTension(date?: string | null): Promise<void> {
  const key = keyFor(date);
  const rec = getRecord(key);
  if (rec.inFlight) return rec.inFlight;

  rec.inFlight = (async () => {
    try {
      const qs = new URLSearchParams({ limit: "1" });
      if (date) qs.set("date", date);
      const res = await fetch(`/api/daily-ranks?${qs.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        worldTension?: WorldTensionSnapshot | null;
        fetchedAt?: string;
      };
      if (data.worldTension) {
        rec.entry = { snapshot: data.worldTension, fetchedAt: data.fetchedAt ?? null };
        rec.listeners.forEach((listener) => listener(rec.entry));
      }
    } catch {
      /* 네트워크 실패 — 마지막으로 알려진 값을 유지 */
    } finally {
      rec.inFlight = null;
    }
  })();

  return rec.inFlight;
}
