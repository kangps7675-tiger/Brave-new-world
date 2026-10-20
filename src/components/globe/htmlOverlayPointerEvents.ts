import { CARRIER_MARKER_ROOT_CLASS } from "@/lib/usCarrierMarkers";
import { LOD_HYSTERESIS_MARGIN } from "@/components/globe/constants";
import type { GlobeLodTier } from "@/lib/globeLod";

/** HTML 오버레이 — 라벨·뉴스 뱃지 루트는 휠 줌이 지도로 전달되도록 none 유지 */
export function applyHtmlOverlayPointerEvents(el: HTMLElement, isVisible: boolean) {
  if (!isVisible) {
    el.style.pointerEvents = "none";
    return;
  }
  if (
    el.classList.contains("gdelt-news-alert-marker") ||
    el.classList.contains("ua-settlement-label") ||
    el.classList.contains("situation-callout") ||
    el.classList.contains("ua-callout") ||
    el.classList.contains(CARRIER_MARKER_ROOT_CLASS)
  ) {
    el.style.pointerEvents = "none";
    return;
  }
  el.style.pointerEvents = "auto";
}

export function getStableLodTier(prevTier: GlobeLodTier, altitude: number): GlobeLodTier {
  if (prevTier === "global") return altitude < 1.65 - LOD_HYSTERESIS_MARGIN ? "continent" : "global";
  if (prevTier === "continent") {
    if (altitude > 1.65 + LOD_HYSTERESIS_MARGIN) return "global";
    if (altitude < 1.1 - LOD_HYSTERESIS_MARGIN) return "regional";
    return "continent";
  }
  if (prevTier === "regional") {
    if (altitude > 1.1 + LOD_HYSTERESIS_MARGIN) return "continent";
    if (altitude < 0.72 - LOD_HYSTERESIS_MARGIN) return "near";
    return "regional";
  }
  if (prevTier === "near") {
    if (altitude > 0.72 + LOD_HYSTERESIS_MARGIN) return "regional";
    if (altitude < 0.28 - LOD_HYSTERESIS_MARGIN) return "village";
    return "near";
  }
  return altitude > 0.28 + LOD_HYSTERESIS_MARGIN ? "near" : "village";
}
