"use client";

import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 장면 딥링크 — 현재 카메라(lat/lng/altitude)·모드·켜진 레이어를 URL 쿼리로 직렬화.
 *
 * 형식: `?scene=1&mode=conflict&lat=12.61&lng=43.35&alt=1.20&layers=showWarZones.showAis`
 * - `layers`는 boolean 레이어 중 ON인 키만 `.`로 연결
 * - 파싱 시 존재하지 않는 키는 무시 (버전 간 안전)
 */
export type SceneLinkState = {
  mode: ViewerMode;
  lat: number;
  lng: number;
  altitude: number;
  /** ON인 boolean 레이어 키 목록 (없으면 모드 기본 히어로 레이어 유지) */
  layers: string[] | null;
};

const NUM = (v: string | null): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function buildSceneUrl(
  origin: string,
  state: {
    mode: ViewerMode;
    lat: number;
    lng: number;
    altitude: number;
    prefs: LayerPrefs;
  },
): string {
  const params = new URLSearchParams();
  params.set("scene", "1");
  params.set("mode", state.mode);
  params.set("lat", state.lat.toFixed(4));
  params.set("lng", state.lng.toFixed(4));
  params.set("alt", state.altitude.toFixed(3));

  const onKeys: string[] = [];
  for (const [key, value] of Object.entries(state.prefs)) {
    if (typeof value === "boolean" && value) onKeys.push(key);
  }
  if (onKeys.length > 0) params.set("layers", onKeys.join("."));

  return `${origin}/?${params.toString()}`;
}

export function parseSceneFromSearch(search: string): SceneLinkState | null {
  try {
    const params = new URLSearchParams(search);
    if (params.get("scene") !== "1") return null;

    const modeRaw = params.get("mode");
    const mode: ViewerMode = modeRaw === "economy" ? "economy" : "conflict";
    const lat = NUM(params.get("lat"));
    const lng = NUM(params.get("lng"));
    const alt = NUM(params.get("alt"));
    if (lat == null || lng == null) return null;

    const layersRaw = params.get("layers");
    const layers =
      layersRaw && layersRaw.length > 0
        ? layersRaw.split(".").filter((k) => /^[A-Za-z0-9_]+$/.test(k))
        : null;

    return {
      mode,
      lat: Math.max(-85, Math.min(85, lat)),
      lng: ((lng + 540) % 360) - 180,
      altitude: alt != null ? Math.max(0.05, Math.min(4, alt)) : 1.2,
      layers,
    };
  } catch {
    return null;
  }
}

/** 주소창의 scene 파라미터 제거 (히스토리 오염 방지, 새로고침 시 재적용 방지) */
export function clearSceneParamsFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("scene") == null) return;
    for (const key of ["scene", "mode", "lat", "lng", "alt", "layers"]) {
      url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
  } catch {
    // no-op
  }
}
