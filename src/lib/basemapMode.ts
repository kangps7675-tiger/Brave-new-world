/**
 * Nav 베이스맵 모드 (둘 다 MapLibre 벡터 파이프라인 — WebGL 단일 컨텍스트)
 * - intel: OpenFreeMap Dark + DEM(0.6) + 다크 fog/우주색.
 *   위성 래스터·3D 건물·Liberty 해양톤 덮어쓰기 없음.
 * - terrain(지형): OpenFreeMap Liberty + DEM(1.4) + 고줌 3D 건물.
 *   확대 시 Esri World Imagery가 바탕에 드러나고, 토지/수역 fill만 투명해져
 *   도로·국경·라벨은 벡터로 남는다. 줌 ≥ 14에서 Cesium OSM Buildings
 *   (3D Tiles, deck.gl Tile3DLayer)가 형태·높이·창문 패턴을 그린다.
 *   세슘 뷰어는 쓰지 않음 — MapLibre WebGL 컨텍스트를 공유한다.
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

/**
 * 인텔 — OpenFreeMap Dark (벡터). 지형 모드와 동일한 OpenFreeMap 인프라 사용.
 * 예전 Carto Dark Matter(`basemaps.cartocdn.com`)는 벡터 타일 TileJSON이
 * 빈 `{}`를 반환해(무료 티어 장애로 추정) 실사용·배포 환경 모두에서 화면이
 * 검게 죽는 문제가 있어 더 안정적인 소스로 교체.
 */
export const INTEL_VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

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

/** MapLibre fog — 인텔은 워룸 우주 후광, 지형은 밝은 대기(지구 밖 우주는 유지). */
export function fogForBasemapMode(mode: BasemapMode): BasemapFogSpec {
  if (mode === "terrain") {
    return {
      color: "rgb(198, 218, 238)",
      "high-color": "rgb(148, 188, 228)",
      "horizon-blend": 0.045,
      "space-color": "rgb(6, 10, 22)",
      "star-intensity": 0.18,
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

/** 캔버스·스타일 background 레이어 — 인텔과 동일 우주색 */
export const BASEMAP_SPACE_BACKGROUND = "#0b0c10";

/**
 * 지형 해양 — OpenFreeMap Liberty 기본 water (`rgb(158,189,255)`).
 */
export const TERRAIN_OCEAN_FILL = "rgb(158, 189, 255)";

/** 저줌 Natural Earth 래스터 — 육지 음영을 살리고 바다는 벡터 fill이 받친다. */
const TERRAIN_NE_RASTER_OPACITY = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  0.52,
  3,
  0.34,
  6,
  0.12,
  10,
  0,
] as const;

/** MapLibre Map — 구조적 타이핑으로 버전 차이 흡수 */
export type BasemapMapLike = {
  getStyle: () => {
    layers?: { id: string; type?: string; "source-layer"?: string }[];
  } | undefined;
  setLayoutProperty: (layerId: string, name: string, value: unknown) => void;
  setPaintProperty?: (layerId: string, name: string, value: unknown) => void;
  getLayer: (id: string) => unknown;
  setFog: (fog: BasemapFogSpec | null) => void;
  setTerrain: (terrain: { source: string; exaggeration?: number } | null) => void;
  getSource: (id: string) => unknown;
  setProjection?: (projection: { type: string }) => void;
  getProjection?: () => { type?: string } | undefined;
  addSource?: (id: string, source: Record<string, unknown>) => void;
  removeSource?: (id: string) => void;
  addLayer?: (layer: Record<string, unknown>, beforeId?: string) => void;
  removeLayer?: (id: string) => void;
};

/** Style / setProjection에 넣는 3D 지구본 투영 (줌과 무관). */
export const BASEMAP_GLOBE_PROJECTION = {
  type: "vertical-perspective",
} as const;

/**
 * OpenFreeMap style.json에는 projection이 없다.
 * setStyle 커밋 직전에 주입해 Mercator 기본값을 덮는다.
 */
export function injectGlobeProjection<T extends Record<string, unknown>>(
  style: T,
): T & { projection: typeof BASEMAP_GLOBE_PROJECTION } {
  return {
    ...style,
    projection: BASEMAP_GLOBE_PROJECTION,
  };
}

/**
 * 도시 스케일 3D Tiles(OSM Buildings)가 켜진 맵.
 * deck.gl Tile3DLayer는 mercator MapView와 맞춰야 건물이 좌표에 앉는다.
 * 고줌에서는 구면과 평면이 사실상 같고, 줌아웃 시 이 집합에서 빼면 지구본으로 돌아온다.
 */
const cityBuildingsMercatorMaps = new WeakSet<object>();

export function setCityBuildingsMercator(map: BasemapMapLike, on: boolean): void {
  if (on) cityBuildingsMercatorMaps.add(map);
  else cityBuildingsMercatorMaps.delete(map);
  if (on) {
    try {
      map.setProjection?.({ type: "mercator" });
    } catch {
      /* projection unsupported */
    }
    return;
  }
  applyBasemapGlobeProjection(map);
}

/**
 * 스타일 교체 후 Mercator 리셋 방지 — 항상 3D 지구본 투영.
 *
 * MapLibre v6에서 `globe`는 z≈11–12에 mercator로 넘어가는 **적응형 프리셋**이다.
 * 전역 뷰에서 납작한 세계지도로 보이는 회귀를 막기 위해
 * `vertical-perspective`(줌과 무관하게 구)를 우선 적용한다.
 * 미지원 빌드만 `globe`로 폴백.
 *
 * OSM 3D 건물이 켜져 있으면 mercator를 유지한다 (도시 줌, deck.gl 정렬).
 */
export function applyBasemapGlobeProjection(map: BasemapMapLike): void {
  if (!map.setProjection) return;
  if (cityBuildingsMercatorMaps.has(map)) {
    try {
      map.setProjection({ type: "mercator" });
    } catch {
      /* ignore */
    }
    return;
  }

  const apply = (type: "vertical-perspective" | "globe") => {
    map.setProjection?.({ type });
  };

  try {
    apply("vertical-perspective");
    const type = readProjectionType(map);
    if (type === "vertical-perspective" || type === "globe") return;
    apply("globe");
  } catch {
    try {
      apply("globe");
    } catch {
      /* projection unsupported */
    }
  }
}

function readProjectionType(map: BasemapMapLike): string | undefined {
  try {
    const raw = map.getProjection?.()?.type as unknown;
    if (typeof raw === "string") return raw;
    // 일부 빌드는 expression / ProjectionDefinition 객체를 돌려준다
    if (raw && typeof raw === "object" && "name" in raw) {
      const name = (raw as { name?: unknown }).name;
      if (typeof name === "string") return name;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** 현재 투영이 납작한 mercator인지 (워치독용) */
export function isMercatorProjection(map: BasemapMapLike): boolean {
  const type = readProjectionType(map);
  return !type || type === "mercator";
}

export function applyBasemapFog(map: BasemapMapLike, mode: BasemapMode): void {
  try {
    map.setFog(fogForBasemapMode(mode));
  } catch {
    /* fog unsupported */
  }
}

/**
 * Liberty 등 밝은 스타일의 background 레이어를 우주색으로 덮어
 * 지구본 바깥이 크림/하늘색으로 보이지 않게 한다.
 *
 * 지형에서는 쓰지 않는다. OpenMapTiles에서 육지가 background 색이라
 * 덮으면 지구 표면 전체가 우주색으로 가라앉는다. 바깥 우주는 fog space-color.
 */
export function applyBasemapSpaceBackground(
  map: BasemapMapLike,
  mode: BasemapMode = "intel",
): void {
  if (mode === "terrain") return;
  try {
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (layer.type !== "background") continue;
      map.setPaintProperty?.(layer.id, "background-color", BASEMAP_SPACE_BACKGROUND);
    }
    // 관례적 id도 한 번 더 시도
    if (map.getLayer("background")) {
      map.setPaintProperty?.("background", "background-color", BASEMAP_SPACE_BACKGROUND);
    }
  } catch {
    /* paint unsupported */
  }
}

/**
 * 지형: Liberty water fill → 밝은 해양. 저줌 NE 음영은 육지 가독용으로 살린다.
 */
export function applyBasemapOceanColors(
  map: BasemapMapLike,
  mode: BasemapMode,
  oceanCss: string = TERRAIN_OCEAN_FILL,
): void {
  if (mode !== "terrain") return;
  try {
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (isOwnMapLayerId(layer.id)) continue;
      const id = layer.id.toLowerCase();
      const sourceLayer = (layer["source-layer"] ?? "").toLowerCase();
      const isWaterFill =
        layer.type === "fill" &&
        (id === "water" ||
          id.startsWith("water_") ||
          sourceLayer === "water" ||
          id.includes("ocean"));
      if (isWaterFill) {
        // 색만 덮는다. opacity는 지형 모드에서 위성 페이드(applyBasemapSatelliteImagery)가 담당.
        map.setPaintProperty?.(layer.id, "fill-color", oceanCss);
        continue;
      }
      if (
        layer.type === "line" &&
        (id.startsWith("waterway") || sourceLayer === "waterway")
      ) {
        map.setPaintProperty?.(layer.id, "line-color", oceanCss);
      }
    }

    if (map.getLayer("natural_earth")) {
      map.setPaintProperty?.(
        "natural_earth",
        "raster-opacity",
        TERRAIN_NE_RASTER_OPACITY,
      );
    }
  } catch {
    /* paint unsupported */
  }
}

export function applyBasemapTerrain(
  map: BasemapMapLike,
  mode: BasemapMode,
  opts?: { ultraLite?: boolean },
): void {
  if (!map.getSource(BASEMAP_SOURCE_IDS.terrain)) return;

  /**
   * Ultra-Lite에서는 terrain을 **완전히 끈다** (이전: exaggeration만 0.4로 하향).
   *
   * terrain이 켜져 있으면 exaggeration이 아무리 낮아도 비용의 대부분은 그대로다:
   *  - DEM 타일 fetch·디코드
   *  - globe 투영에서의 지형 메시 재구성
   *  - **HTML 마커의 오클루전 판정이 표고 조회를 타게 된다**
   *    (opacityWhenCovered가 걸린 마커가 화면에 수백 개다 → 마커당 프레임당 비용)
   *
   * Ultra-Lite 대상은 내장 그래픽·8GB RAM 환경이므로, 입체감보다
   * 프레임이 우선이다. 지형 모드를 명시적으로 고른 경우에만 유지한다.
   */
  if (opts?.ultraLite && mode !== "terrain") {
    try {
      map.setTerrain(null);
    } catch {
      /* terrain unsupported */
    }
    return;
  }

  // 인텔: 예전 설정 exaggeration 0.6 / 지형: 1.4
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

/**
 * 지형(OpenFreeMap Liberty) 기본 도시명 — 스타일 기본값(~10–14px)이 작아
 * 줌 구간별로 한 단계 키운다. MapLibre setLayoutProperty로 가능.
 * 3선(town/village)은 applyBasemapCityLabelRank가 숨기므로 스케일하지 않는다.
 */
const TERRAIN_PLACE_LABEL_TEXT_SIZE: Record<string, unknown> = {
  label_city: ["interpolate", ["linear"], ["zoom"], 4, 14, 7, 17, 11, 22],
  label_city_capital: ["interpolate", ["linear"], ["zoom"], 4, 15, 7, 18, 11, 24],
};

/**
 * OpenFreeMap 3선 이하 정착지 라벨.
 * Liberty(지형): town/village/other · Dark(인텔): town/village/suburb/hamlet
 */
export const PLACE_LABEL_HIDE_LAYER_IDS = [
  "label_other",
  "label_village",
  "label_town",
  "place_other",
  "place_suburb",
  "place_village",
  "place_town",
] as const;

/** 1선(수도·거대도시) + 2선(city). 국가·주 라벨은 건드리지 않는다. */
export const PLACE_LABEL_KEEP_LAYER_IDS = [
  "label_city",
  "label_city_capital",
  "place_city",
  "place_city_large",
] as const;

/**
 * 벡터 베이스맵 도시명을 1선·2선만 남긴다.
 * OpenMapTiles class=city(수도 포함)까지, town/village/suburb는 숨김.
 */
export function applyBasemapCityLabelRank(map: BasemapMapLike): void {
  try {
    for (const layerId of PLACE_LABEL_HIDE_LAYER_IDS) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, "visibility", "none");
    }
    for (const layerId of PLACE_LABEL_KEEP_LAYER_IDS) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, "visibility", "visible");
    }
  } catch {
    /* layout unsupported */
  }
}

export function applyBasemapPlaceLabelScale(map: BasemapMapLike, mode: BasemapMode): void {
  applyBasemapCityLabelRank(map);
  if (mode !== "terrain") return;
  try {
    for (const [layerId, textSize] of Object.entries(TERRAIN_PLACE_LABEL_TEXT_SIZE)) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, "text-size", textSize);
      map.setPaintProperty?.(layerId, "text-halo-width", 1.6);
    }
  } catch {
    /* layout/paint unsupported */
  }
}

/**
 * 지형 모드 위성 사진 (MapLibre raster under vector).
 *
 * Esri World Imagery(키 불필요). 전 지구 공통 보장 maxzoom≈19 — 그 이상은
 * overzoom으로 마지막 실측 타일을 확대해 채운다. 오지·해양은 원본 촬영
 * 해상도 한계로 더 선명해지지 않는다.
 */
export const SATELLITE_IMAGERY_SOURCE_ID = "satellite-imagery";
export const SATELLITE_IMAGERY_LAYER_ID = "satellite-imagery-layer";
export const SATELLITE_IMAGERY_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];
export const SATELLITE_IMAGERY_ATTRIBUTION =
  "Esri, Maxar, Earthstar Geographics, GIS User Community";
/** 이 줌까지는 서버가 실측 타일을 보장 — 그 이상은 overzoom으로 확대 표시 */
export const SATELLITE_IMAGERY_MAX_NATIVE_ZOOM = 19;

/**
 * 저줌: 위성 숨김(벡터 Liberty만) → 중줌부터 서서히 드러남 → 고줌에서 풀 선명.
 * 대역폭·타일 요청도 저줌에서 거의 나가지 않게 한다.
 */
const SATELLITE_RASTER_OPACITY_EXPR = [
  "interpolate",
  ["linear"],
  ["zoom"],
  9,
  0,
  11,
  0.45,
  12.5,
  0.9,
  14,
  1,
] as const;

/**
 * 사진이 바탕에 깔리고 도로·국경·라벨·3D 건물은 그 위에 남도록,
 * 넓은 면적 fill(수역·토지피복·2D 건물 등)만 확대할수록 투명해진다.
 */
const SATELLITE_FADE_ID_RE =
  /^(water|waterway|landcover|landuse|park|sand|natural_earth|land|earth|grass|wood|forest|residential|industrial|cemetery|pitch|school|hospital|building)/i;
const SATELLITE_FADE_OPACITY_EXPR = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  1,
  10,
  1,
  11.5,
  0.4,
  13,
  0.06,
  14.5,
  0,
] as const;

function removeSatelliteImagery(map: BasemapMapLike): void {
  try {
    if (map.getLayer(SATELLITE_IMAGERY_LAYER_ID)) {
      map.removeLayer?.(SATELLITE_IMAGERY_LAYER_ID);
    }
    if (map.getSource(SATELLITE_IMAGERY_SOURCE_ID)) {
      map.removeSource?.(SATELLITE_IMAGERY_SOURCE_ID);
    }
  } catch {
    /* 스타일 교체(setStyle) 중이면 이미 정리됐을 수 있음 */
  }
}

export function applyBasemapSatelliteImagery(map: BasemapMapLike, mode: BasemapMode): void {
  if (mode !== "terrain") {
    removeSatelliteImagery(map);
    return;
  }
  try {
    if (!map.getSource(SATELLITE_IMAGERY_SOURCE_ID)) {
      map.addSource?.(SATELLITE_IMAGERY_SOURCE_ID, {
        type: "raster",
        tiles: SATELLITE_IMAGERY_TILES,
        tileSize: 256,
        maxzoom: SATELLITE_IMAGERY_MAX_NATIVE_ZOOM,
        attribution: SATELLITE_IMAGERY_ATTRIBUTION,
      });
    }
    if (!map.getLayer(SATELLITE_IMAGERY_LAYER_ID)) {
      // background 바로 위 — 도로·라벨·fill-extrusion은 전부 그 위에 남는다.
      const firstLayerId = map.getStyle()?.layers?.[0]?.id;
      map.addLayer?.(
        {
          id: SATELLITE_IMAGERY_LAYER_ID,
          type: "raster",
          source: SATELLITE_IMAGERY_SOURCE_ID,
          paint: {
            "raster-fade-duration": 0,
            "raster-opacity": SATELLITE_RASTER_OPACITY_EXPR,
            "raster-resampling": "linear",
          },
        },
        firstLayerId,
      );
    } else {
      map.setPaintProperty?.(
        SATELLITE_IMAGERY_LAYER_ID,
        "raster-opacity",
        SATELLITE_RASTER_OPACITY_EXPR,
      );
    }

    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (isOwnMapLayerId(layer.id) || layer.id === SATELLITE_IMAGERY_LAYER_ID) continue;
      if (layer.type === "raster" && /natural_earth/i.test(layer.id)) {
        map.setPaintProperty?.(layer.id, "raster-opacity", TERRAIN_NE_RASTER_OPACITY);
        continue;
      }
      if (layer.type !== "fill") continue;
      const sourceLayer = (layer["source-layer"] ?? "").toLowerCase();
      if (!SATELLITE_FADE_ID_RE.test(layer.id) && !SATELLITE_FADE_ID_RE.test(sourceLayer)) {
        continue;
      }
      map.setPaintProperty?.(layer.id, "fill-opacity", SATELLITE_FADE_OPACITY_EXPR);
    }
  } catch {
    /* 소스/레이어 조작 실패 시 벡터 지형만 유지 (사진 없이도 지도는 정상 동작) */
  }
}
