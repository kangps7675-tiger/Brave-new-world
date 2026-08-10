/**
 * 레이어 캡 알림 — 거부/자동 강등 (P0-7 / P2-2).
 *
 * 거부는 Ultra 이외의 레거시 경로용으로 남겨 두고,
 * 일반 모드도 자리 비우기(evict) + undo 이벤트를 쓴다.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import { isLayerCapCountedKey } from "@/lib/layerExclusiveCap";

export const LAYER_CAP_REJECTED_EVENT = "geowatch-layer-cap-rejected";
export const LAYER_CAP_EVICTED_EVENT = "geowatch-layer-cap-evicted";
export const LAYER_CAP_UNDO_EVENT = "geowatch-layer-cap-undo";

export type LayerCapRejectedDetail = {
  /** 켜려다 거부된 레이어 prefs 키 */
  key: string;
  /** 현재 상한 (내부·디버그용 — UI에는 숫자를 내지 않는다) */
  cap: number;
  ultraLite: boolean;
};

export type LayerCapEvictedDetail = {
  /** 자리를 비우기 위해 끈 레이어 prefs 키 */
  evicted: Array<keyof LayerPrefs>;
  /** [되돌리기]용 스냅샷 */
  undo: LayerPrefs;
};

export function diffTurnedOffLayers(
  before: LayerPrefs,
  after: LayerPrefs,
): Array<keyof LayerPrefs> {
  const out: Array<keyof LayerPrefs> = [];
  for (const key of Object.keys(before) as Array<keyof LayerPrefs>) {
    if (!isLayerCapCountedKey(key)) continue;
    if (before[key] === true && after[key] !== true) out.push(key);
  }
  return out;
}

export function emitLayerCapRejected(detail: LayerCapRejectedDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<LayerCapRejectedDetail>(LAYER_CAP_REJECTED_EVENT, { detail }),
    );
  } catch {
    /* CustomEvent 미지원 — 알림만 생략 */
  }
}

export function onLayerCapRejected(
  handler: (detail: LayerCapRejectedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<LayerCapRejectedDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(LAYER_CAP_REJECTED_EVENT, listener);
  return () => window.removeEventListener(LAYER_CAP_REJECTED_EVENT, listener);
}

export function emitLayerCapEvicted(detail: LayerCapEvictedDetail): void {
  if (typeof window === "undefined") return;
  if (detail.evicted.length === 0) return;
  try {
    window.dispatchEvent(
      new CustomEvent<LayerCapEvictedDetail>(LAYER_CAP_EVICTED_EVENT, { detail }),
    );
  } catch {
    /* ignore */
  }
}

export function onLayerCapEvicted(
  handler: (detail: LayerCapEvictedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<LayerCapEvictedDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(LAYER_CAP_EVICTED_EVENT, listener);
  return () => window.removeEventListener(LAYER_CAP_EVICTED_EVENT, listener);
}

export function emitLayerCapUndo(undo: LayerPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<LayerPrefs>(LAYER_CAP_UNDO_EVENT, { detail: undo }),
    );
  } catch {
    /* ignore */
  }
}

export function onLayerCapUndo(handler: (undo: LayerPrefs) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<LayerPrefs>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(LAYER_CAP_UNDO_EVENT, listener);
  return () => window.removeEventListener(LAYER_CAP_UNDO_EVENT, listener);
}
