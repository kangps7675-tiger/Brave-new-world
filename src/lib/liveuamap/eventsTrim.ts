import type { LiveuamapEvent } from "@/lib/liveuamap/types";

/** D1 한 행 상한(약 2MB)보다 여유를 둔다. */
export const LIVEUA_MAX_EVENTS_PAYLOAD_BYTES = 1_500_000;

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * 이벤트는 최신순으로 들어온다고 가정하고, 상한을 넘으면 오래된 쪽부터 줄인다.
 * 1건만 남아도 넘으면 빈 배열.
 */
export function trimEventsToBytes(
  events: LiveuamapEvent[],
  maxBytes: number = LIVEUA_MAX_EVENTS_PAYLOAD_BYTES,
): LiveuamapEvent[] {
  let list = events;
  while (list.length > 0 && byteLength(JSON.stringify(list)) > maxBytes) {
    if (list.length === 1) return [];
    list = list.slice(0, Math.max(1, Math.floor(list.length * 0.8)));
  }
  return list;
}
