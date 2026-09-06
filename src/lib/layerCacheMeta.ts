/**
 * 레이어 클라이언트 캐시 UI 메타 이벤트 (P1-6).
 * fetch 래퍼 → 배지 컴포넌트 연결. 컴포넌트 의존 없이 lib에 둔다.
 */

export const LAYER_CACHE_META_EVENT = "geowatch-layer-cache-meta";

export type LayerCacheMetaDetail = {
  fromCache: boolean;
  fetchedAt: number;
  softTimeout?: boolean;
};

export function emitLayerCacheMeta(detail: LayerCacheMetaDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(LAYER_CACHE_META_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}
