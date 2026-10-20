/**
 * 스트림 인제스트 방어선 — 링 버퍼 캡 + 5초 버스트 주입.
 * Phase 2: Telegram/GDELT UI state는 폴링 주기와 별개로, 연속 업데이트를 버스트로 합친다.
 */

/** 클라이언트 GDELT 이벤트 링 상한 (렌더 LOD와 별개 — React state 폭증 방지) */
export const GDELT_CLIENT_RING_CAP = 1600;

/** 클라이언트 Telegram 알림 링 상한 (서버 MAX_ALERTS=200과 정렬) */
export const TELEGRAM_CLIENT_RING_CAP = 200;

/** Phase 2 — 연속 ingest를 이 간격으로 coalesce */
export const STREAM_INGEST_BURST_MS = 5_000;

/** 오래된 항목부터 버리고 최신 `cap`개만 유지 */
export function ringCapTail<T>(items: T[], cap: number): T[] {
  if (cap <= 0) return [];
  if (items.length <= cap) return items;
  return items.slice(items.length - cap);
}

/** id 기준 최신 우선 병합 후 링 캡 */
export function ringCapByIdNewestFirst<T extends { id: string }>(
  items: T[],
  cap: number,
): T[] {
  if (items.length <= cap) return items;
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out.reverse();
}

type BurstApplier<T> = {
  /** 대기열에 넣고 interval 후 한 번 apply. 첫 호출은 immediate면 즉시. */
  enqueue: (value: T, options?: { immediate?: boolean }) => void;
  flush: () => void;
  dispose: () => void;
};

/**
 * 메인 스레드 setState 폭주를 막기 위한 버스트 어플라이어.
 * live 모드에서 Telegram/GDELT 응답이 연달아 와도 최대 5초에 한 번만 반영.
 */
export function createBurstApplier<T>(
  apply: (value: T) => void,
  intervalMs: number = STREAM_INGEST_BURST_MS,
): BurstApplier<T> {
  let pending: T | undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstDone = false;

  const flush = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending === undefined) return;
    const value = pending;
    pending = undefined;
    apply(value);
  };

  return {
    enqueue(value, options) {
      pending = value;
      const immediate = options?.immediate === true || !firstDone;
      if (immediate) {
        firstDone = true;
        flush();
        return;
      }
      if (timer != null) return;
      timer = setTimeout(() => {
        timer = null;
        firstDone = true;
        flush();
      }, intervalMs);
    },
    flush,
    dispose() {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      pending = undefined;
    },
  };
}
