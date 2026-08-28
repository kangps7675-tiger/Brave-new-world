import { BUILDINGS_MIN_ZOOM, type BasemapMode } from "@/lib/basemapMode";

/** Cesium ion — Cesium OSM Buildings (3D Tiles). 세슘 뷰어가 아니라 타일셋 ID만. */
export const CESIUM_OSM_BUILDINGS_ASSET_ID = 96188;

export const OSM_BUILDINGS_MIN_ZOOM = BUILDINGS_MIN_ZOOM;

/** 줌이 경계에서 깜빡이며 청크를 올렸다 내리지 않게 내리는 임계 */
export const OSM_BUILDINGS_DROP_ZOOM = OSM_BUILDINGS_MIN_ZOOM - 0.4;

export function cesiumOsmBuildingsEndpointUrl(
  assetId: number = CESIUM_OSM_BUILDINGS_ASSET_ID,
): string {
  return `https://api.cesium.com/v1/assets/${assetId}/endpoint`;
}

export function osmBuildingsEligible(opts: {
  basemapMode: BasemapMode;
  ultraLite: boolean;
  ionToken: string | null | undefined;
}): boolean {
  return opts.basemapMode === "terrain" && !opts.ultraLite && Boolean(opts.ionToken);
}

/**
 * 지형 모드 + 토큰 + 고줌에서만 무장.
 * 한 번 켜지면 drop zoom 아래까지는 유지한다.
 */
export function osmBuildingsArmedNext(
  prev: boolean,
  zoom: number,
  eligible: boolean,
  minZoom = OSM_BUILDINGS_MIN_ZOOM,
  dropZoom = OSM_BUILDINGS_DROP_ZOOM,
): boolean {
  if (!eligible) return false;
  if (prev) return zoom >= dropZoom;
  return zoom >= minZoom;
}
