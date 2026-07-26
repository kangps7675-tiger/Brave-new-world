/**
 * Nav 베이스맵 모드
 * - intel: Carto Dark Matter (다크 벡터, 레이어 가독)
 * - terrain(지형): MapLibre 호환 OSM 벡터 스타일 (OpenFreeMap Liberty)
 *   + DEM 기복 + 고줌 3D 건물. 사진 래스터(Esri 등)는 쓰지 않는다.
 */

export type BasemapMode = "intel" | "terrain";

/** Fog payload — maplibre-gl 버전별 FogSpecification export 유무와 무관하게 사용 */
export type BasemapFogSpec = {
  color?: string;
  "high-color"?: string;
  "horizon-blend"?: number;
  "space-color"?: string;
  "star-intensity"?: number;
};

export const DEFAULT_BASEMAP_MODE: BasemapMode = "intel";

/** 인텔 — Carto Dark Matter GL (벡터) */
export const INTEL_VECTOR_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/**
 * 지형(벡터) — MapLibre 생태계 공개 스타일 (OpenFreeMap Liberty).
 * MapLibre GL 공식 예제·문서에서 사용하는 키 불필요 OSM 벡터 타일 스타일.
 * @see https://openfreemap.org/ · https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
 */
export const TERRAIN_VECTOR_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

/** @deprecated use TERRAIN_VECTOR_STYLE_URL */
export const PHOTO_VECTOR_STYLE_URL = TERRAIN_VECTOR_STYLE_URL;

export const TERRAIN_VECTOR_ATTRIBUTION =
  "© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors";

/** @deprecated use TERRAIN_VECTOR_ATTRIBUTION */
export const PHOTO_VECTOR_ATTRIBUTION = TERRAIN_VECTOR_ATTRIBUTION;

/** AWS Terrarium DEM (키 불필요) */
export const AWS_TERRARIUM_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export const AWS_TERRARIUM_ATTRIBUTION = "Elevation © AWS Terrain Tiles (Terrarium)";

/** OpenFreeMap planet — building extrusion (스타일과 동일 타일셋) */
export const OPENFREEMAP_PLANET_URL = "https://tiles.openfreemap.org/planet";

export const OPENFREEMAP_ATTRIBUTION = "© OpenFreeMap · © OpenStreetMap contributors";

export const BASEMAP_SOURCE_IDS = {
  terrain: "terrain-dem",
  buildings: "openfreemap-buildings",
} as const;

export const BASEMAP_LAYER_IDS = {
  buildings: "3d-buildings",
} as const;

/** 우리 오버레이 — 스타일 베이스와 구분 (필요 시) */
const OWN_LAYER_ID_RE =
  /^(map-|firms-|ukraine-|island-|axis-|basemap-|terrain-|3d-buildings|air-raid-)/;

export function isOwnMapLayerId(layerId: string): boolean {
  return OWN_LAYER_ID_RE.test(layerId);
}

/** localStorage 레거시 `"photo"` → `"terrain"` */
export function parseBasemapMode(value: unknown): BasemapMode {
  if (value === "terrain" || value === "photo") return "terrain";
  return "intel";
}

/** 모드별 MapLibre style.json URL */
export function styleUrlForBasemapMode(mode: BasemapMode): string {
  return mode === "terrain" ? TERRAIN_VECTOR_STYLE_URL : INTEL_VECTOR_STYLE_URL;
}

export type TerrainExaggeration = {
  intel: number;
  terrain: number;
};

export const TERRAIN_EXAGGERATION: TerrainExaggeration = {
  intel: 0.6,
  terrain: 1.4,
};

export const BUILDINGS_MIN_ZOOM = 14;

/** MapLibre fog — terrain: 옅은 파란 대기 / intel: 다크 사이버 */
export function fogForBasemapMode(mode: BasemapMode): BasemapFogSpec {
  if (mode === "terrain") {
    return {
      color: "rgb(186, 210, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.025,
      "space-color": "rgb(4, 6, 18)",
      "star-intensity": 0.55,
    };
  }
  return {
    color: "rgb(8, 12, 24)",
    "high-color": "rgb(12, 28, 48)",
    "horizon-blend": 0.012,
    "space-color": "rgb(2, 4, 10)",
    "star-intensity": 0.35,
  };
}

/** MapLibre Map — 구조적 타이핑으로 버전 차이 흡수 */
export type BasemapMapLike = {
  getStyle: () => { layers?: { id: string; type?: string }[] } | undefined;
  setLayoutProperty: (layerId: string, name: string, value: unknown) => void;
  getLayer: (id: string) => unknown;
  setFog: (fog: BasemapFogSpec | null) => void;
  setTerrain: (terrain: { source: string; exaggeration?: number } | null) => void;
  getSource: (id: string) => unknown;
  setProjection?: (projection: { type: string }) => void;
};

/** 스타일 교체 후 Mercator 리셋 방지 — 항상 3D 지구본 투영 */
export function applyBasemapGlobeProjection(map: BasemapMapLike): void {
  try {
    map.setProjection?.({ type: "globe" });
  } catch {
    /* projection unsupported */
  }
}

export function applyBasemapFog(map: BasemapMapLike, mode: BasemapMode): void {
  try {
    map.setFog(fogForBasemapMode(mode));
  } catch {
    /* fog unsupported */
  }
}

export function applyBasemapTerrain(
  map: BasemapMapLike,
  mode: BasemapMode,
  opts?: { ultraLite?: boolean },
): void {
  if (!map.getSource(BASEMAP_SOURCE_IDS.terrain)) return;
  const exaggeration = opts?.ultraLite
    ? Math.min(0.4, TERRAIN_EXAGGERATION.intel)
    : TERRAIN_EXAGGERATION[mode];
  try {
    map.setTerrain({
      source: BASEMAP_SOURCE_IDS.terrain,
      exaggeration,
    });
  } catch {
    /* terrain unsupported */
  }
}
