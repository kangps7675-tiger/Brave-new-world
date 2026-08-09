/**
 * 지도 피처 호버 ↔ 범례 하이라이트 (P3-6).
 */

export const HOVER_LAYER_EVENT = "geowatch-hover-layer";

export function emitHoverLayerId(layerId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(HOVER_LAYER_EVENT, { detail: { layerId } }),
    );
  } catch {
    /* ignore */
  }
}

export function onHoverLayerId(
  handler: (layerId: string | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ layerId: string | null }>).detail;
    handler(detail?.layerId ?? null);
  };
  window.addEventListener(HOVER_LAYER_EVENT, listener);
  return () => window.removeEventListener(HOVER_LAYER_EVENT, listener);
}
