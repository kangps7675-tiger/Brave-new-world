import type { BasemapMode } from "@/lib/basemapMode";
import type { CrinkInfraCategory } from "@/lib/crinkInfraLayers";

/**
 * 인텔 베이스맵 전용. 지형(위성·3D 건물)과 겹치지 않는다.
 * 줌은 3D 건물(14)보다 일찍 — 기지·부두가 면으로 읽히는 근접 스케일.
 */
export const CRINK_DETAIL_MIN_ZOOM = 9.5;
export const CRINK_DETAIL_DROP_ZOOM = 9.0;
export const CRINK_POWER_MIN_ZOOM = 11;
export const CRINK_POWER_DROP_ZOOM = 10.5;
/** 주요 교역로 철도·도로 — 대륙 스케일에서 보이도록 더 일찍 */
export const CRINK_TRANSPORT_MIN_ZOOM = 4.5;
export const CRINK_TRANSPORT_DROP_ZOOM = 4.0;

export const CRINK_INFRA_MAX_PATHS_PER_CATEGORY = 2000;

export function crinkInfraEligible(opts: {
  basemapMode: BasemapMode;
  ultraLite: boolean;
}): boolean {
  return opts.basemapMode === "intel" && !opts.ultraLite;
}

/** 건물 레이어와 같은 히스테리시스: 한 번 켜지면 drop 아래까지 유지 */
export function crinkInfraArmedNext(
  prev: boolean,
  zoom: number,
  eligible: boolean,
  minZoom: number,
  dropZoom: number,
): boolean {
  if (!eligible) return false;
  if (prev) return zoom >= dropZoom;
  return zoom >= minZoom;
}

export function crinkInfraMinZoom(category: CrinkInfraCategory): number {
  if (category === "power") return CRINK_POWER_MIN_ZOOM;
  if (category === "rail" || category === "road") return CRINK_TRANSPORT_MIN_ZOOM;
  return CRINK_DETAIL_MIN_ZOOM;
}

export function crinkInfraDropZoom(category: CrinkInfraCategory): number {
  if (category === "power") return CRINK_POWER_DROP_ZOOM;
  if (category === "rail" || category === "road") return CRINK_TRANSPORT_DROP_ZOOM;
  return CRINK_DETAIL_DROP_ZOOM;
}

export function crinkInfraVisibilityHint(opts: {
  enabled: boolean;
  eligible: boolean;
  anyArmed: boolean;
  lang: "ko" | "en";
}): string | null {
  if (!opts.enabled) return null;
  if (!opts.eligible) {
    return opts.lang === "en"
      ? "Intel map only — switch off Terrain"
      : "인텔 지도에서만 · 지형 모드에서는 숨김";
  }
  if (!opts.anyArmed) {
    return opts.lang === "en"
      ? "Zoom in (near) to show runways · harbours"
      : "근접 확대 시 표시 · 활주로·항만 스케일";
  }
  return null;
}
