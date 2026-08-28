"use client";

import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import { WebglContextLostOverlay } from "@/components/WebglContextLostOverlay";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * MapLibre v6 — 번들러(webpack 등)에서는 워커 URL이 `import.meta.url` 기준으로
 * 자동 감지되지 않는다(모듈 그래프 안에서 신뢰 불가). 이걸 안 해주면 워커
 * 객체 자체는 생성되지만(워커 생성 자체는 에러 없이 성공) 그 안의 스크립트가
 * 비어있어 dispatcher가 보내는 모든 메시지(loadTile 포함)에 응답이 없다 —
 * console 에러도, 'error' 이벤트도 없이 조용히 멈춘다. 그 결과 style.json·
 * TileJSON·sprite는 정상 로드되는데 벡터 타일 .pbf 요청은 단 한 건도 나가지
 * 않고 베이스맵이 완전히 빈 채(alpha=0)로 남는다.
 *
 * 공식 가이드가 제안하는 `new URL("maplibre-gl/dist/maplibre-gl-worker.mjs",
 * import.meta.url)` 패턴은 실사용 환경에서도 안 통했다 — Next.js의 webpack
 * 클라이언트 번들은 네이티브 ESM이 아니라 webpack 런타임 위에서 도는 번들이라
 * `import.meta.url`이 실제 파일 위치를 가리키지 않기 때문. 대신 워커 파일을
 * `scripts/copy-maplibre-worker.mjs`(predev/prebuild에서 자동 실행)로
 * public/에 worker+shared를 그대로 복사해두고, 아래처럼 평범한 정적 URL로
 * 가리킨다. v6 worker는 `./maplibre-gl-shared.mjs`를 상대 import하므로
 * shared가 빠지면 워커가 404로 죽고 .pbf가 0건이 된다.
 * @see https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/
 */
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}
import type { FeatureCollection } from "geojson";
import { globeViewToMapLibre, mapLibreZoomToAltitude } from "@/lib/mapLibreBasemap";
import { ENTRY_GATE } from "@/lib/entryOverview";
import { createMapGlobeMethods, type MapGlobeMethods } from "@/lib/mapGlobeRef";
import {
  asFn,
  buildCorridorGlintGradient,
  buildCorridorGlintOffGradient,
  buildFirmsFiresGeoJson,
  buildHeatmapGeoJson,
  buildLabelsGeoJson,
  buildPathsGeoJson,
  buildPointsGeoJson,
  buildPolygonsGeoJson,
  buildRingsGeoJson,
  CIRCLE_RADIUS_BY_ZOOM,
  CORRIDOR_GLINT_MAX_LEGS,
  CORRIDOR_GLINT_PERIOD_MS,
  CORRIDOR_GLINT_TICK_MS,
  FIRMS_ICON_SIZE_BY_ZOOM,
  LABEL_DOT_RADIUS_BY_ZOOM,
  LABEL_TEXT_SIZE_BY_ZOOM,
  PATH_LINE_WIDTH_BY_ZOOM,
  RING_RADIUS_BY_ZOOM,
} from "@/lib/mapGlobeLayers";
import { firmsFireIconId, ensureFirmsFireImages } from "@/lib/firmsFireIcons";
import {
  gemFacilityIconId,
  isGemFacilityKind,
  ensureGemFacilityImages,
} from "@/lib/gemFacilityIcons";
import {
  AIRCRAFT_SYMBOL_LAYER_ID,
  AIRCRAFT_SYMBOL_SOURCE_ID,
  ensureAircraftSymbolImages,
} from "@/lib/milAircraftSymbols";
import {
  islandChainsBasesGeoJson,
  islandChainsChinaGeoJson,
  islandChainsChinaHighlightGeoJson,
  islandChainsRadarGeoJson,
  islandChainsTaiwanPulseGeoJson,
  islandChainsUsHighlightGeoJson,
} from "@/data/islandChains";
import {
  applyBasemapFog,
  applyBasemapGlobeProjection,
  applyBasemapOceanColors,
  applyBasemapPlaceLabelScale,
  applyBasemapSatelliteImagery,
  applyBasemapSpaceBackground,
  applyBasemapTerrain,
  AWS_TERRARIUM_ATTRIBUTION,
  AWS_TERRARIUM_TILES,
  BASEMAP_LAYER_IDS,
  BASEMAP_SOURCE_IDS,
  BUILDINGS_MIN_ZOOM,
  DEFAULT_BASEMAP_MODE,
  INTEL_VECTOR_STYLE_URL,
  injectGlobeProjection,
  isMercatorProjection,
  OPENFREEMAP_ATTRIBUTION,
  OPENFREEMAP_PLANET_URL,
  parseBasemapMode,
  type BasemapMapLike,
  type BasemapMode,
} from "@/lib/basemapMode";
import { osmBuildingsArmedNext, osmBuildingsEligible } from "@/lib/osmBuildings3d";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";

const OsmBuildingsOverlay = dynamic(
  () =>
    import("@/components/globe/OsmBuildingsOverlay").then(
      (mod) => mod.OsmBuildingsOverlay,
    ),
  { ssr: false },
);

/** fog + (인텔만) 우주 배경 + (지형만) 밝은 해양 — 지형 육지는 Liberty 배경색 유지 */
function applyBasemapAtmosphere(map: BasemapMapLike, mode: BasemapMode): void {
  applyBasemapFog(map, mode);
  applyBasemapSpaceBackground(map, mode);
  // Liberty 수면·NE 래스터 보정은 지형 전용 — 인텔 Dark 페인트는 건드리지 않음
  applyBasemapOceanColors(map, mode);
}

/**
 * GlobeLayerProps(Record)와 intersection하면 index signature가 콜백을 unknown으로 넓힙니다.
 * 명시 필드 + [key: string]: unknown 으로 레이어 props는 허용하고 콜백 시그니처를 유지합니다.
 */
export interface MapGlobeViewProps {
  mapStyleUrl: string;
  backgroundColor?: string;
  onGlobeReady?: () => void;
  /** 빈 바다·지도 위 커서 좌표 (해역명 툴팁 등) */
  onGlobeMouseMove?: (coords: { lat: number; lng: number } | null) => void;
  /** MapLibre 로드 직후 — 상위(GlobeMapCanvas)에서 map 인스턴스가 필요할 때용 (현재 미사용) */
  onMapReadyForHybrid?: (map: import("maplibre-gl").Map) => void;
  /** WebGL context lost — 상위에서 별도 처리하고 싶을 때용 (현재 미사용) */
  onWebglContextLost?: () => void;
  /** MapLibre feature picking 대상 — VIINA 근접 줌에서 폴리곤 제외 등 */
  interactiveLayerIds?: readonly string[];
  /** 중국 도련선 · 미군 방어선 · 대만 펄스 */
  showIslandChains?: boolean;
  /** 인텔(다크 벡터) / 지형(MapLibre OSM 벡터+DEM) — mapStyleUrl 교체로 전환 */
  basemapMode?: BasemapMode;
  /** Ultra-Lite: 3D 건물·야간불빛 OFF, 지형 exaggeration 하향 */
  ultraLite?: boolean;
  [key: string]: unknown;
}

const INTERACTIVE_LAYERS = [
  "map-points",
  "map-gem-facilities",
  AIRCRAFT_SYMBOL_LAYER_ID,
  "map-paths-solid",
  "map-paths-dashed",
  "map-polygons-fill",
  "map-rings",
  "firms-flame",
  "ukraine-macro-fill",
  "ukraine-micro-fill",
  "ukraine-micro-defense",
  "ukraine-micro-combat-circle",
  "island-chains-bases",
] as const;

function isMapPathsLayer(layerId: string): boolean {
  return layerId === "map-paths-solid" || layerId === "map-paths-dashed";
}

/**
 * 호버된 path item이 "실측 회랑"(글린트 대상)이면 그 groupId를, 아니면 null을 반환한다.
 * 일반 철도/도로/파이프라인 등은 글린트 대상이 아니므로 호버해도 반짝이지 않는다.
 * 아직 "건설중"인 회랑은 완공된 인프라처럼 보이면 안 되므로 글린트 대상에서 제외한다.
 */
function realCorridorGroupIdOf(item: unknown): string | null {
  if (!item || typeof item !== "object" || !("meta" in item)) return null;
  const meta = (item as { meta?: Record<string, unknown> }).meta;
  if (!meta || meta.geometrySource !== "real-corridor") return null;
  if (meta.status === "under-construction") return null;
  const groupId = meta.groupId ?? meta.corridorGroupId;
  return typeof groupId === "string" && groupId ? groupId : null;
}

/**
 * 호버된 path item이 axis-link(축 관계망/군수 이송) 관계면 그 groupId를 반환한다 —
 * 글린트와 달리 실측 회랑 여부·건설 상태와 무관하게, axis-link이기만 하면 대상이 된다.
 * 이 값이 map-paths-hover-recolor-* 레이어의 필터로 쓰여, 호버 중인 국가색 링크의
 * 색이 관계 성격 색(군수=빨강 등)으로 잠깐 바뀌게 한다.
 */
function axisLinkHoverGroupId(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const kind = "kind" in item ? (item as { kind?: string }).kind : undefined;
  if (kind !== "axis-link") return null;
  const meta = "meta" in item ? (item as { meta?: Record<string, unknown> }).meta : undefined;
  const groupId = meta?.groupId ?? meta?.corridorGroupId;
  if (typeof groupId === "string" && groupId) return groupId;
  const id = "id" in item ? (item as { id?: string }).id : undefined;
  return typeof id === "string" && id ? id : null;
}

/** PortWatch maritime routes — flowing dash (trade particle motion). */
const MARITIME_DASH_SEQUENCE: [number, number, number][] = [
  [0, 5, 2.5],
  [0.6, 5, 1.9],
  [1.2, 5, 1.3],
  [1.8, 5, 0.7],
  [2.4, 5, 0.1],
  [0, 0.6, 4.4],
  [0, 1.2, 3.8],
  [0, 1.8, 3.2],
  [0, 2.4, 2.6],
  [0, 3.0, 2.0],
  [0, 3.6, 1.4],
  [0, 4.2, 0.8],
];

/** 도련선 점선 흐름 — MapLibre dasharray 시퀀스 */
const CHINA_DASH_SEQUENCE: [number, number, number][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0.01],
  [0, 0.5, 3.5],
  [0, 1, 3],
  [0, 1.5, 2.5],
  [0, 2, 2],
  [0, 2.5, 1.5],
  [0, 3, 1],
  [0, 3.5, 0.5],
];

export const MapGlobeView = forwardRef<MapGlobeMethods, MapGlobeViewProps>(function MapGlobeView(
  props,
  ref,
) {
  const {
    mapStyleUrl: mapStyleUrlProp,
    backgroundColor = "#02040a",
    showIslandChains = false,
  } = props;
  /** index signature로 unknown이 되므로 명시 파싱 */
  const mapStyleUrl =
    typeof mapStyleUrlProp === "string" && mapStyleUrlProp.length > 0
      ? mapStyleUrlProp
      : INTEL_VECTOR_STYLE_URL;
  const basemapMode = parseBasemapMode(props.basemapMode ?? DEFAULT_BASEMAP_MODE);
  const ultraLite = Boolean(props.ultraLite);
  const onGlobeReady = props.onGlobeReady as (() => void) | undefined;
  const onGlobeMouseMove = props.onGlobeMouseMove as
    | ((coords: { lat: number; lng: number } | null) => void)
    | undefined;
  const onMapReadyForHybrid = props.onMapReadyForHybrid as
    | ((map: import("maplibre-gl").Map) => void)
    | undefined;
  const onWebglContextLost = props.onWebglContextLost as (() => void) | undefined;

  const mapRef = useRef<MapRef>(null);
  /** WebGL 컨텍스트 유실 상태 (P0-2) */
  const [contextLost, setContextLost] = useState(false);
  const changeListenersRef = useRef(new Set<() => void>());
  const readyRef = useRef(false);
  const onGlobeReadyRef = useRef<(() => void) | undefined>(onGlobeReady);
  const onGlobeMouseMoveRef = useRef<
    ((coords: { lat: number; lng: number } | null) => void) | undefined
  >(onGlobeMouseMove);
  const onMapReadyForHybridRef = useRef(onMapReadyForHybrid);
  const onWebglContextLostRef = useRef(onWebglContextLost);
  const basemapModeRef = useRef<BasemapMode>(basemapMode);
  const ultraLiteRef = useRef(ultraLite);
  const [mapZoom, setMapZoom] = useState(2);
  const [mapLoaded, setMapLoaded] = useState(false);
  /** 수상전투함 8방위 실루엣용 — 5° 양자화 */
  const [mapBearingDeg, setMapBearingDeg] = useState(0);
  /** 도련선/방어선 — 호버 기지 레이더 */
  const [hoveredIslandBaseId, setHoveredIslandBaseId] = useState<string | null>(null);
  /**
   * 실측 회랑 "글린트" — 상시 재생이 아니라 개별 회랑/축 관계를 호버할 때만
   * 켜진다. groupId(edge.id/arms 쌍/corridor.id)가 같은 leg 전체가 같이 반짝인다.
   */
  const [hoveredPathGroupId, setHoveredPathGroupId] = useState<string | null>(null);
  /**
   * axis-link 국가색→관계색 호버 리컬러 대상 groupId. 글린트(hoveredPathGroupId)와
   * 달리 실측 회랑 여부와 무관하게 axis-link이기만 하면 켜진다 — 대권 호로 폴백된
   * 스포크 관계(예: 러–카자흐)도 호버하면 색이 바뀌어야 하기 때문.
   */
  const [hoveredAxisLinkGroupId, setHoveredAxisLinkGroupId] = useState<string | null>(null);
  /** onMove는 프레임마다 오므로 zoom→GeoJSON 재빌드는 idle 시에만 */
  const mapZoomRef = useRef(2);
  const mapBearingRef = useRef(0);
  const lastZoomPublishAtRef = useRef(0);
  const pendingZoomPublishRef = useRef<number | null>(null);
  const moveIdleTimerRef = useRef<number | null>(null);
  const movingRef = useRef(false);

  useEffect(() => {
    onGlobeReadyRef.current = onGlobeReady;
  }, [onGlobeReady]);

  useEffect(() => {
    onGlobeMouseMoveRef.current = onGlobeMouseMove;
  }, [onGlobeMouseMove]);

  useEffect(() => {
    onMapReadyForHybridRef.current = onMapReadyForHybrid;
  }, [onMapReadyForHybrid]);

  useEffect(() => {
    onWebglContextLostRef.current = onWebglContextLost;
  }, [onWebglContextLost]);

  useEffect(() => {
    basemapModeRef.current = basemapMode;
  }, [basemapMode]);

  useEffect(() => {
    ultraLiteRef.current = ultraLite;
  }, [ultraLite]);

  /**
   * style.json을 미리 fetch해 Map 마운트를 막으면 OpenFreeMap 응답·OneDrive I/O
   * 동안 검은 화면만 보인다. URL로 즉시 올리고 handleLoad/setStyle 훅·styledata
   * 가드에서 globe projection을 씌운다 (mercator 첫 프레임은 수 ms 수준).
   */
  /** onLoad에만 의존하지 않음 — style URL 로드 레이스에서도 투영·진단 훅 보장 */
  useEffect(() => {
    if (!mapStyleUrl) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      const map = mapRef.current?.getMap();
      if (!map) {
        if (tries > 100) window.clearInterval(id);
        return;
      }
      const m = map as unknown as BasemapMapLike;
      try {
        const w = window as Window & {
          __GEOWATCH_MAP_PROJECTION?: () => unknown;
          __GEOWATCH_FORCE_GLOBE?: () => void;
        };
        w.__GEOWATCH_MAP_PROJECTION = () => map.getProjection?.();
        w.__GEOWATCH_FORCE_GLOBE = () => {
          applyBasemapGlobeProjection(m);
          try {
            map.setProjection?.({ type: "vertical-perspective" });
          } catch {
            /* ignore */
          }
        };
      } catch {
        /* ignore */
      }
      applyBasemapGlobeProjection(m);
      if (map.isStyleLoaded() || tries > 80) {
        applyBasemapAtmosphere(m, basemapModeRef.current);
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [mapStyleUrl]);

  const ionToken = getRuntimeConfig().cesiumIonToken;
  const osmEligible = osmBuildingsEligible({
    basemapMode,
    ultraLite,
    ionToken,
  });
  const [osmBuildingsArmed, setOsmBuildingsArmed] = useState(false);
  useEffect(() => {
    setOsmBuildingsArmed((prev) => osmBuildingsArmedNext(prev, mapZoom, osmEligible));
  }, [mapZoom, osmEligible]);
  useEffect(() => {
    if (!osmEligible) return;
    void import("@/components/globe/OsmBuildingsOverlay");
  }, [osmEligible]);
  const showOsmBuildings = osmBuildingsArmed;
  /** Ion 3D Tiles가 켜지면 상자 extrusion은 겹치지 않게 끈다. 토큰 없으면 폴백. */
  const showVectorBuildings =
    basemapMode === "terrain" && !ultraLite && !showOsmBuildings;

  /** 밝은 베이스맵에서는 후광·테두리를 흰색으로 뒤집어 대비를 유지 */
  const isLightBasemap = basemapMode === "terrain";
  const labelHaloColor = isLightBasemap ? "rgba(255,255,255,0.95)" : "rgba(2,4,10,0.75)";
  const labelHaloWidth = isLightBasemap ? 2 : 1;
  const pointStrokeColor = isLightBasemap
    ? "rgba(255,255,255,0.9)"
    : "rgba(2,4,10,0.55)";
  const pointStrokeWidth = isLightBasemap ? 1 : 0.5;

  const methods = useMemo(
    () => createMapGlobeMethods(mapRef, changeListenersRef),
    [],
  );

  useImperativeHandle(ref, () => methods, [methods]);

  useEffect(() => {
    return () => {
      methods.dispose();
    };
  }, [methods]);

  const pointsData = useMemo(() => (props.pointsData as unknown[]) ?? [], [props.pointsData]);
  const pathsData = useMemo(() => (props.pathsData as unknown[]) ?? [], [props.pathsData]);
  /** 공습 포커스 등 — 지연 없이 즉시 그려야 하는 경로 (정면에서도 보이게) */
  const priorityPathsData = useMemo(
    () => (props.priorityPathsData as unknown[]) ?? [],
    [props.priorityPathsData],
  );
  const focusFillGeoJson = props.focusFillGeoJson as FeatureCollection | null | undefined;
  const [deferredPathsData, setDeferredPathsData] = useState(pathsData);
  const pathsContentKey = useMemo(() => {
    if (pathsData.length === 0) return "0";
    const head = pathsData[0] as { id?: string; kind?: string } | undefined;
    const mid = pathsData[Math.floor(pathsData.length / 2)] as
      | { id?: string; kind?: string }
      | undefined;
    const tail = pathsData[pathsData.length - 1] as { id?: string; kind?: string } | undefined;
    let bri = 0;
    let dfc = 0;
    for (const raw of pathsData) {
      const kind = (raw as { kind?: string } | undefined)?.kind;
      if (kind === "bri-trade") bri += 1;
      else if (kind === "us-dfc-supply") dfc += 1;
    }
    return `${pathsData.length}:b${bri}:d${dfc}:${head?.id ?? ""}:${mid?.id ?? ""}:${tail?.id ?? ""}`;
  }, [pathsData]);

  useEffect(() => {
    if (pathsData.length < 64) {
      setDeferredPathsData(pathsData);
      return;
    }
    let cancelled = false;
    const raf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      // startTransition 없이 적용 — 카메라 이동 중에도 빗금이 한 프레임에 반영되게
      if (!cancelled) setDeferredPathsData(pathsData);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [pathsContentKey, pathsData]);

  const polygonsData = useMemo(
    () => (props.polygonsData as { geometry: unknown }[]) ?? [],
    [props.polygonsData],
  );
  const ringsData = useMemo(() => (props.ringsData as unknown[]) ?? [], [props.ringsData]);
  const firmsFiresData = useMemo(
    () => (props.firmsFiresData as unknown[]) ?? [],
    [props.firmsFiresData],
  );
  const labelsData = useMemo(() => (props.labelsData as unknown[]) ?? [], [props.labelsData]);
  const htmlElementsData = useMemo(
    () => (props.htmlElementsData as unknown[]) ?? [],
    [props.htmlElementsData],
  );
  const heatmapsData = useMemo(
    () =>
      (props.heatmapsData as {
        points: { lat: number; lng: number; weight: number }[];
        tier: string;
        bandwidth?: number;
        colorSaturation?: number;
      }[]) ?? [],
    [props.heatmapsData],
  );

  const emptyUkraineFc = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: "FeatureCollection", features: [] }),
    [],
  );
  const ukraineMacroGeoJson = useMemo(() => {
    const raw = props.ukraineMacroGeoJson as GeoJSON.FeatureCollection | undefined;
    return raw?.type === "FeatureCollection" ? raw : emptyUkraineFc;
  }, [emptyUkraineFc, props.ukraineMacroGeoJson]);
  const ukraineMicroGeoJson = useMemo(() => {
    const raw = props.ukraineMicroGeoJson as GeoJSON.FeatureCollection | undefined;
    return raw?.type === "FeatureCollection" ? raw : emptyUkraineFc;
  }, [emptyUkraineFc, props.ukraineMicroGeoJson]);
  const axisHubCountriesGeoJson = useMemo(() => {
    const raw = props.axisHubCountriesGeoJson as GeoJSON.FeatureCollection | undefined;
    return raw?.type === "FeatureCollection" ? raw : emptyUkraineFc;
  }, [emptyUkraineFc, props.axisHubCountriesGeoJson]);

  const interactiveLayerIds = useMemo(() => {
    const fromProps = props.interactiveLayerIds;
    const base =
      Array.isArray(fromProps) && fromProps.length > 0
        ? [...fromProps]
        : [...INTERACTIVE_LAYERS];
    if (showIslandChains && !base.includes("island-chains-bases")) {
      base.push("island-chains-bases");
    }
    return base;
  }, [props.interactiveLayerIds, showIslandChains]);

  const pointLat = asFn<unknown, number>(props.pointLat, () => 0);
  const pointLng = asFn<unknown, number>(props.pointLng, () => 0);
  const pointColor = asFn<unknown, string>(props.pointColor, () => "rgba(148,163,184,0.8)");
  const pointRadius = asFn<unknown, number>(props.pointRadius, () => 0.15);

  const firmsLat = asFn<unknown, number>(props.firmsLat ?? props.pointLat, () => 0);
  const firmsLng = asFn<unknown, number>(props.firmsLng ?? props.pointLng, () => 0);
  const firmsAngularRadius = asFn<unknown, number>(
    props.firmsAngularRadius ?? props.pointRadius,
    () => 0.2,
  );
  const firmsCause = asFn<unknown, string>(props.firmsCause, () => "none");
  const firmsFrp = asFn<unknown, number | null | undefined>(props.firmsFrp, () => null);

  const pathPoints = asFn<unknown, { lat: number; lng: number; alt?: number }[]>(
    props.pathPoints,
    () => [],
  );
  const pathColor = asFn<unknown, string>(props.pathColor, () => "rgba(148,163,184,0.6)");
  const pathStroke = asFn<unknown, number>(props.pathStroke, () => 0.5);
  const pathDashLength = asFn<unknown, number>(props.pathDashLength, () => 0);
  const pathDashGap = asFn<unknown, number>(props.pathDashGap, () => 0);

  const polygonGeoJsonGeometry = asFn<unknown, GeoJSON.Geometry>(
    props.polygonGeoJsonGeometry,
    () => ({ type: "Polygon", coordinates: [] }),
  );
  const polygonCapColor = asFn<unknown, string>(props.polygonCapColor, () => "rgba(0,0,0,0)");
  const polygonStrokeColor = asFn<unknown, string>(props.polygonStrokeColor, () => "rgba(0,0,0,0)");
  const polygonFillOpacity = asFn<unknown, number>(props.polygonFillOpacity, () => 0.72);

  const ringLat = asFn<unknown, number>(props.ringLat, () => 0);
  const ringLng = asFn<unknown, number>(props.ringLng, () => 0);
  const ringColor = asFn<unknown, string>(props.ringColor, () => "rgba(250,204,21,0.45)");
  const ringMaxRadius = asFn<unknown, number>(props.ringMaxRadius, () => 1);

  const labelLat = asFn<unknown, number>(props.labelLat, () => 0);
  const labelLng = asFn<unknown, number>(props.labelLng, () => 0);
  const labelText = asFn<unknown, string>(props.labelText, () => "");
  const labelSize = asFn<unknown, number>(props.labelSize, () => 0.5);
  const labelColor = asFn<unknown, string>(props.labelColor, () => "rgba(226,232,240,0.9)");
  const labelDotRadius = asFn<unknown, number>(props.labelDotRadius, () => 0.08);

  const htmlLat = asFn<unknown, number>(props.htmlLat, () => 0);
  const htmlLng = asFn<unknown, number>(props.htmlLng, () => 0);
  const htmlElement = props.htmlElement as ((item: unknown) => HTMLElement) | undefined;
  const htmlRotation = asFn<unknown, number>(props.htmlRotation, () => 0);
  const htmlRotationAlignment = asFn<unknown, "map" | "viewport" | "auto">(
    props.htmlRotationAlignment,
    () => "viewport",
  );

  /**
   * 위치·회전 접근자는 매 렌더 새 참조(인라인 화살표)라 deps에 넣으면
   * htmlMarkerNodes 메모가 절대 적중하지 않는다. 전부 item만 보는 순수
   * 함수이므로 ref로 최신값을 읽어도 결과가 같다 — accessorsRef와 같은 패턴.
   */
  const htmlAccessorsRef = useRef({
    htmlLat,
    htmlLng,
    htmlRotation,
    htmlRotationAlignment,
  });
  htmlAccessorsRef.current = {
    htmlLat,
    htmlLng,
    htmlRotation,
    htmlRotationAlignment,
  };

  const onPointClick = props.onPointClick as ((item: unknown) => void) | undefined;
  const onPointHover = props.onPointHover as ((item: unknown | null) => void) | undefined;
  const onPathClick = props.onPathClick as ((item: unknown) => void) | undefined;
  const onPathHover = props.onPathHover as ((item: unknown | null) => void) | undefined;
  const onPolygonClick = props.onPolygonClick as ((item: unknown) => void) | undefined;
  const onPolygonHover = props.onPolygonHover as ((item: unknown | null) => void) | undefined;
  const onGlobeClick = props.onGlobeClick as
    | ((coords: { lat: number; lng: number }) => void)
    | undefined;

  /** inline accessor props는 매 렌더 새 참조 → GeoJSON deps에서 제외하고 ref로만 읽음 */
  const accessorsRef = useRef({
    pointLat,
    pointLng,
    pointColor,
    pointRadius,
    firmsLat,
    firmsLng,
    firmsAngularRadius,
    firmsCause,
    firmsFrp,
    pathPoints,
    pathColor,
    pathStroke,
    pathDashLength,
    pathDashGap,
    polygonGeoJsonGeometry,
    polygonCapColor,
    polygonStrokeColor,
    polygonFillOpacity,
    ringLat,
    ringLng,
    ringColor,
    ringMaxRadius,
    labelLat,
    labelLng,
    labelText,
    labelSize,
    labelColor,
    labelDotRadius,
  });
  accessorsRef.current = {
    pointLat,
    pointLng,
    pointColor,
    pointRadius,
    firmsLat,
    firmsLng,
    firmsAngularRadius,
    firmsCause,
    firmsFrp,
    pathPoints,
    pathColor,
    pathStroke,
    pathDashLength,
    pathDashGap,
    polygonGeoJsonGeometry,
    polygonCapColor,
    polygonStrokeColor,
    polygonFillOpacity,
    ringLat,
    ringLng,
    ringColor,
    ringMaxRadius,
    labelLat,
    labelLng,
    labelText,
    labelSize,
    labelColor,
    labelDotRadius,
  };

  const pointsGeoJson = useMemo(() => {
    // basemapMode: 톤별 pointColor가 accessors에만 있고 data ref는 안 바뀌므로 강제 재빌드
    void basemapMode;
    const a = accessorsRef.current;
    return buildPointsGeoJson(pointsData, {
      lat: a.pointLat,
      lng: a.pointLng,
      color: a.pointColor,
      radius: a.pointRadius,
      kind: (item) =>
        item && typeof item === "object" && "kind" in item
          ? String((item as { kind?: string }).kind ?? "")
          : undefined,
      icon: (item) => {
        const kind =
          item && typeof item === "object" && "kind" in item
            ? String((item as { kind?: string }).kind ?? "")
            : "";
        return isGemFacilityKind(kind) ? gemFacilityIconId(kind) : undefined;
      },
    });
  }, [pointsData, basemapMode]);

  const pathsGeoJson = useMemo(() => {
    void basemapMode;
    const a = accessorsRef.current;
    return buildPathsGeoJson(deferredPathsData, {
      points: a.pathPoints,
      color: a.pathColor,
      stroke: a.pathStroke,
      // 실측 회랑이 육로↔해상 다구간(legs)으로 쪼개진 경우, 해상 구간(카스피해
      // 도하 등)만 점선(map-paths-dashed)으로 그려서 "장애물을 만나 항로로
      // 갈아탄다"는 걸 시각적으로 드러낸다. 그 외에는 기존 접근자 그대로 위임.
      dashLength: (item) => {
        const legMode =
          item && typeof item === "object" && "meta" in item
            ? (item as { meta?: { legMode?: string } }).meta?.legMode
            : undefined;
        const kind =
          item && typeof item === "object" && "kind" in item
            ? String((item as { kind?: string }).kind ?? "")
            : undefined;
        if (kind === "maritime-route") return 4;
        return legMode === "sea" ? 3 : a.pathDashLength(item);
      },
      dashGap: a.pathDashGap,
      kind: (item) =>
        item && typeof item === "object" && "kind" in item
          ? String((item as { kind?: string }).kind ?? "")
          : undefined,
      // 실측 회랑(카스피해 드론 이송로·라진-하산철도 등, axis-link 오버라이드) —
      // map-paths-glint 레이어가 태양광 글린트 밴드를 흘려보낼 대상만 표시.
      // 육로 구간이든 해상(점선) 구간이든 같은 회랑에 속하면 동일하게 반짝여서
      // 구간이 바뀌어도 "하나로 이어진 인프라"처럼 보이게 한다.
      glint: (item) => {
        const meta =
          item && typeof item === "object" && "meta" in item
            ? (item as { meta?: { geometrySource?: string; status?: string } }).meta
            : undefined;
        // 건설중인 회랑은 아직 없는 인프라를 완공된 것처럼 반짝이게 하지 않는다.
        return meta?.geometrySource === "real-corridor" && meta?.status !== "under-construction";
      },
      // 같은 회랑/축 관계의 leg들을 하나로 묶는 키 — 호버 중인 groupId와 같은
      // feature만 map-paths-glint-* 레이어 필터를 통과해 반짝인다.
      groupId: (item) => {
        const meta =
          item && typeof item === "object" && "meta" in item
            ? (item as { meta?: { groupId?: string; corridorGroupId?: string } }).meta
            : undefined;
        return meta?.groupId ?? meta?.corridorGroupId ?? undefined;
      },
      legIndex: (item) => {
        const meta =
          item && typeof item === "object" && "meta" in item
            ? (item as { meta?: { legIndex?: number } }).meta
            : undefined;
        return meta?.legIndex;
      },
      // axis-link 전용 — 호버 시 국가 기본색 대신 드러날 관계 성격 색(군수=빨강 등).
      hoverColor: (item) => {
        const meta =
          item && typeof item === "object" && "meta" in item
            ? (item as { meta?: { hoverColor?: string } }).meta
            : undefined;
        return typeof meta?.hoverColor === "string" ? meta.hoverColor : undefined;
      },
    });
  }, [deferredPathsData, basemapMode]);

  const hasMaritimeRoutes = useMemo(
    () => pathsGeoJson.features.some((f) => f.properties?.kind === "maritime-route"),
    [pathsGeoJson],
  );

  const priorityPathsGeoJson = useMemo(() => {
    void basemapMode;
    if (priorityPathsData.length === 0) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const a = accessorsRef.current;
    return buildPathsGeoJson(priorityPathsData, {
      points: a.pathPoints,
      color: a.pathColor,
      stroke: a.pathStroke,
      dashLength: a.pathDashLength,
      dashGap: a.pathDashGap,
      kind: (item) =>
        item && typeof item === "object" && "kind" in item
          ? String((item as { kind?: string }).kind ?? "")
          : undefined,
    });
  }, [priorityPathsData, basemapMode]);

  const polygonsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildPolygonsGeoJson(polygonsData, {
      geometry: a.polygonGeoJsonGeometry,
      fillColor: a.polygonCapColor,
      strokeColor: a.polygonStrokeColor,
      fillOpacity: a.polygonFillOpacity,
    });
  }, [polygonsData]);

  const ringsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildRingsGeoJson(ringsData, {
      lat: a.ringLat,
      lng: a.ringLng,
      color: a.ringColor,
      maxRadius: a.ringMaxRadius,
    });
  }, [ringsData]);

  const firmsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildFirmsFiresGeoJson(firmsFiresData, {
      lat: a.firmsLat,
      lng: a.firmsLng,
      cause: a.firmsCause,
      frp: a.firmsFrp,
      angularRadius: a.firmsAngularRadius,
      iconId: (item) => firmsFireIconId(a.firmsCause(item)),
    });
  }, [firmsFiresData]);

  const labelsGeoJson = useMemo(() => {
    // basemapMode: 지형(밝은) 전환 시 글자색을 어두운 팔레트로 다시 bake
    void basemapMode;
    const a = accessorsRef.current;
    return buildLabelsGeoJson(labelsData, {
      lat: a.labelLat,
      lng: a.labelLng,
      text: a.labelText,
      size: a.labelSize,
      color: a.labelColor,
      dotRadius: a.labelDotRadius,
    });
  }, [labelsData, basemapMode]);

  const heatmapCollections = useMemo(() => buildHeatmapGeoJson(heatmapsData), [heatmapsData]);

  /**
   * 항공기 symbol 레이어 데이터. 상위(useGlobeMapGlobeProps)에서 이미
   * FeatureCollection으로 만들어 넘겨준다 — 여기서 다시 빌드하지 않는다.
   */
  const aircraftSymbolsGeoJson = useMemo(() => {
    const raw = props.aircraftSymbolsData as GeoJSON.FeatureCollection | undefined;
    return raw?.type === "FeatureCollection" ? raw : emptyUkraineFc;
  }, [emptyUkraineFc, props.aircraftSymbolsData]);

  /** properties.index → 원본 항공기 (클릭/호버 복원용) */
  const aircraftSymbolsItems = useMemo(
    () => (props.aircraftSymbolsItems as unknown[]) ?? [],
    [props.aircraftSymbolsItems],
  );
  const aircraftSymbolsIsCivil = useMemo(
    () => (props.aircraftSymbolsIsCivil as boolean[]) ?? [],
    [props.aircraftSymbolsIsCivil],
  );
  const onAircraftClick = props.onAircraftClick as
    | ((item: unknown, isCivil: boolean) => void)
    | undefined;
  const onAircraftHover = props.onAircraftHover as
    | ((item: unknown | null) => void)
    | undefined;

  /**
   * pointOfView(jumpTo) → onMove → notifyChange 동기 재진입을 막는다.
   * 재진입 시 고도 클램프가 change 리스너를 중첩 호출해 React #185를 냈다.
   */
  const notifyDepthRef = useRef(0);
  const notifyChange = useCallback(() => {
    if (notifyDepthRef.current > 0) return;
    notifyDepthRef.current = 1;
    try {
      changeListenersRef.current.forEach((listener) => listener());
    } finally {
      notifyDepthRef.current = 0;
    }
  }, []);

  const publishZoom = useCallback((zoom: number, force = false) => {
    mapZoomRef.current = zoom;
    const now = performance.now();
    const ZOOM_PUBLISH_MS = 150;
    if (!force && now - lastZoomPublishAtRef.current < ZOOM_PUBLISH_MS) {
      if (pendingZoomPublishRef.current == null) {
        pendingZoomPublishRef.current = window.setTimeout(() => {
          pendingZoomPublishRef.current = null;
          lastZoomPublishAtRef.current = performance.now();
          setMapZoom(mapZoomRef.current);
        }, ZOOM_PUBLISH_MS);
      }
      return;
    }
    if (pendingZoomPublishRef.current != null) {
      window.clearTimeout(pendingZoomPublishRef.current);
      pendingZoomPublishRef.current = null;
    }
    lastZoomPublishAtRef.current = now;
    setMapZoom(zoom);
  }, []);

  /**
   * 지도 이동 중 <html>에 `map-moving`을 걸어 backdrop-filter·무한 pulse
   * 애니메이션을 잠시 끈다 (globals.css 하단 P-perf 블록).
   *
   * WebGL 캔버스 위의 backdrop-filter는 지도가 움직이는 동안 매 프레임
   * 백드롭 읽기 + 블러 패스를 재실행한다 — 패널 수만큼 곱해진다.
   * 토글은 드래그당 2회(시작/종료)뿐이라 스타일 재계산 비용은 무시할 만하다.
   */
  const movingClassRef = useRef(false);
  const setMovingClass = useCallback((moving: boolean) => {
    if (typeof document === "undefined") return;
    if (movingClassRef.current === moving) return;
    movingClassRef.current = moving;
    document.documentElement.classList.toggle("map-moving", moving);
  }, []);

  const handleMove = useCallback(
    (event: { viewState: { zoom: number; bearing?: number } }) => {
      // 은은한 자전 jumpTo — 매 프레임 notify하면 isCameraMoving이 풀리지 않음
      if (methods.controls().isAutoRotateFrame) {
        mapZoomRef.current = event.viewState.zoom;
        return;
      }

      setMovingClass(true);
      mapZoomRef.current = event.viewState.zoom;
      const rawBearing = event.viewState.bearing ?? mapRef.current?.getMap()?.getBearing() ?? 0;
      const quantized =
        Math.round((((rawBearing % 360) + 360) % 360) / 5) * 5;
      if (quantized !== mapBearingRef.current) {
        mapBearingRef.current = quantized;
        setMapBearingDeg(quantized);
      }
      movingRef.current = true;
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      // Sizes track via MapLibre zoom expressions (no GeoJSON rebuild on zoom).
      // publishZoom on idle keeps mapZoomRef / listeners in sync; notify runs every frame (no setState).
      moveIdleTimerRef.current = window.setTimeout(() => {
        movingRef.current = false;
        setMovingClass(false);
        publishZoom(mapZoomRef.current, true);
      }, 420);
      notifyChange();
    },
    [methods, notifyChange, publishZoom, setMovingClass],
  );

  useEffect(() => {
    return () => {
      if (pendingZoomPublishRef.current != null) {
        window.clearTimeout(pendingZoomPublishRef.current);
      }
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      // 언마운트 시 클래스가 <html>에 남으면 다른 화면의 블러까지 죽는다
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("map-moving");
      }
    };
  }, []);

  const emitGlobeReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onGlobeReadyRef.current?.();
    notifyChange();
  }, [notifyChange]);

  /**
   * P0-2: WebGL 컨텍스트 유실 복구.
   *
   * 모바일에서 탭 전환·메모리 압박이 오면 브라우저가 GPU 컨텍스트를 회수한다.
   * 지금까지는 아무 처리가 없어 지도가 **검은 화면으로 영구 고착**됐다 —
   * 사용자에게 남은 선택지는 새로고침뿐이었고, 그마저도 안내가 없었다.
   *
   * `preventDefault()`가 핵심이다. 이걸 호출하지 않으면 브라우저는
   * `webglcontextrestored`를 아예 발화시키지 않아 자동 복구 자체가 불가능해진다.
   */
  const handleContextRetry = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!mapLoaded) return;
    const canvas = mapRef.current?.getMap()?.getCanvas();
    if (!canvas) return;

    const onLost = (e: Event) => {
      e.preventDefault(); // 이게 없으면 restored가 오지 않는다
      setContextLost(true);
      onWebglContextLostRef.current?.();
    };
    const onRestored = () => {
      setContextLost(false);
      // 스타일·소스는 maplibre가 자체 복구하지만 globe 투영·fog는 다시 씌워야 한다
      const map = mapRef.current?.getMap();
      if (!map) return;
      const m = map as unknown as BasemapMapLike;
      applyBasemapGlobeProjection(m);
      applyBasemapAtmosphere(m, basemapModeRef.current);
      applyBasemapTerrain(m, basemapModeRef.current, { ultraLite: ultraLiteRef.current });
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
      applyBasemapPlaceLabelScale(m, basemapModeRef.current);
      map.triggerRepaint();
    };

    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [mapLoaded]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const m = map as unknown as BasemapMapLike;

    // 진단 훅을 최우선 등록 (아래 setStyle 래핑이 실패해도 e2e/콘솔이 살도록)
    try {
      const w = window as Window & {
        __GEOWATCH_MAP_PROJECTION?: () => unknown;
        __GEOWATCH_FORCE_GLOBE?: () => void;
      };
      w.__GEOWATCH_MAP_PROJECTION = () => map.getProjection?.();
      w.__GEOWATCH_FORCE_GLOBE = () => {
        applyBasemapGlobeProjection(m);
        try {
          map.setProjection?.({ type: "vertical-perspective" });
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* SSR / opaque */
    }

    applyBasemapGlobeProjection(m);

    /**
     * react-map-gl Map 타입에 transformStyle가 없어 JSX로 못 넘긴다.
     * 이후 setStyle 호출마다 vertical-perspective를 주입한다.
     * (이미 로드된 style을 다시 setStyle 하지 않음 — onLoad 레이스 방지)
     */
    const hooked = map as typeof map & { __globeStyleHook?: boolean };
    if (!hooked.__globeStyleHook) {
      hooked.__globeStyleHook = true;
      try {
        const originalSetStyle = map.setStyle.bind(map);
        map.setStyle = ((style, options) => {
          const userTransform = options?.transformStyle;
          return originalSetStyle(style, {
            ...options,
            transformStyle: (prev, next) => {
              const mid = userTransform ? userTransform(prev, next) : next;
              return injectGlobeProjection(
                mid as unknown as Record<string, unknown>,
              ) as typeof next;
            },
          });
        }) as typeof map.setStyle;
      } catch {
        /* setStyle wrap unsupported */
      }
    }

    methods.applyControls();
    publishZoom(map.getZoom(), true);
    setMapLoaded(true);
    onMapReadyForHybridRef.current?.(map);

    void ensureGemFacilityImages(map).catch(() => {
      /* 아이콘 로드 실패 시 circle 폴백 없음 — 재시도는 스타일 리로드 시 */
    });
    void ensureAircraftSymbolImages(map).catch(() => {
      /* 실패 시 해당 아이콘만 안 그려진다 — 재시도는 스타일 리로드 시 */
    });

    const applyVisuals = () => {
      applyBasemapGlobeProjection(m);
      applyBasemapAtmosphere(m, basemapModeRef.current);
      applyBasemapTerrain(m, basemapModeRef.current, {
        ultraLite: ultraLiteRef.current,
      });
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
      applyBasemapPlaceLabelScale(m, basemapModeRef.current);
    };

    if (map.isStyleLoaded()) {
      applyVisuals();
      emitGlobeReady();
      return;
    }

    // idle이 영구히 안 오면 부트 스플래시가 고착될 수 있어 상한 후 강제 ready
    const idleFallback = window.setTimeout(() => {
      applyVisuals();
      emitGlobeReady();
    }, 12_000);
    map.once("idle", () => {
      window.clearTimeout(idleFallback);
      applyVisuals();
      emitGlobeReady();
    });
  }, [emitGlobeReady, methods, publishZoom]);

  /**
   * 베이스맵 모드 전환 후 globe 투영·fog·terrain exaggeration.
   * 스타일 URL 교체 시 대부분의 style.json에 projection이 없어 Mercator로 떨어지므로
   * 매번 globe를 다시 씌운다.
   */
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const apply = () => {
      if (movingRef.current) return;
      const m = map as unknown as BasemapMapLike;
      applyBasemapGlobeProjection(m);
      applyBasemapAtmosphere(m, basemapMode);
      applyBasemapTerrain(m, basemapMode, { ultraLite });
      applyBasemapSatelliteImagery(m, basemapMode);
      applyBasemapPlaceLabelScale(m, basemapMode);
    };

    if (movingRef.current) {
      // 실시간 레이어(ACLED·GDELT·선박 추적 등)가 끊임없이 갱신되는 화면에서는
      // MapLibre의 네이티브 "idle" 이벤트가 사실상 영영 안 올 수 있다 — idle만
      // 믿고 기다리면 베이스맵 전환 시 위성 사진·terrain 과장이 영구히 안 씌워짐.
      // handleLoad와 동일하게 idle과 타임아웃 중 먼저 오는 쪽으로 반드시 적용한다.
      let settled = false;
      const onIdle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallback);
        map.off("idle", onIdle);
        apply();
      };
      const fallback = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        map.off("idle", onIdle);
        apply();
      }, 1500);
      map.on("idle", onIdle);
      return () => {
        settled = true;
        window.clearTimeout(fallback);
        map.off("idle", onIdle);
      };
    }

    apply();
    return undefined;
  }, [basemapMode, mapLoaded, ultraLite, mapStyleUrl]);

  /** terrain DEM 소스가 React로 붙은 뒤 setTerrain 재적용 */
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    let settled = false;
    const tryTerrain = () => {
      if (movingRef.current) return;
      if (settled) return;
      settled = true;
      window.clearTimeout(t);
      map.off("idle", tryTerrain);
      const m = map as unknown as BasemapMapLike;
      applyBasemapGlobeProjection(m);
      applyBasemapTerrain(m, basemapModeRef.current, {
        ultraLite: ultraLiteRef.current,
      });
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
    };
    // 80ms 지연 후 1차 시도, 그래도 movingRef가 걸려 있으면 idle을 기다리되
    // — 실시간 레이어 때문에 idle이 영영 안 올 수 있어 1.5s 타임아웃으로도 강제 재시도.
    const t = window.setTimeout(tryTerrain, 80);
    const forceRetry = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      map.off("idle", tryTerrain);
      const m = map as unknown as BasemapMapLike;
      applyBasemapGlobeProjection(m);
      applyBasemapTerrain(m, basemapModeRef.current, {
        ultraLite: ultraLiteRef.current,
      });
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
    }, 1500);
    map.once("idle", tryTerrain);
    return () => {
      settled = true;
      window.clearTimeout(t);
      window.clearTimeout(forceRetry);
      map.off("idle", tryTerrain);
    };
  }, [mapLoaded, basemapMode, ultraLite, mapStyleUrl]);

  /** 스타일 로드 후 fog·globe 재적용 (URL 교체 시) */
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const sync = () => {
      if (movingRef.current) return;
      const m = map as unknown as BasemapMapLike;
      applyBasemapGlobeProjection(m);
      applyBasemapAtmosphere(m, basemapModeRef.current);
      // 대기권(해양색)이 water fill을 다시 건드린 뒤에도 위성 페이드가 유지되게
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
      applyBasemapPlaceLabelScale(m, basemapModeRef.current);
    };
    sync();
    map.once("idle", sync);
    return () => {
      map.off("idle", sync);
    };
  }, [mapLoaded, mapStyleUrl, basemapMode]);

  /**
   * OpenFreeMap style.json에는 projection이 없어 로드·교체 순간 Mercator로 떨어진다.
   * styledata 때마다 mercator면 지구본을 다시 씌운다 (납작한 세계지도 회귀 방지).
   */
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const m = map as unknown as BasemapMapLike;
    const ensureGlobe = () => {
      if (movingRef.current) return;
      if (!isMercatorProjection(m)) return;
      applyBasemapGlobeProjection(m);
      applyBasemapAtmosphere(m, basemapModeRef.current);
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
    };
    ensureGlobe();
    map.on("styledata", ensureGlobe);
    const poll = window.setInterval(ensureGlobe, 1500);
    const stopPoll = window.setTimeout(() => window.clearInterval(poll), 20_000);
    return () => {
      map.off("styledata", ensureGlobe);
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
    };
  }, [mapLoaded, mapStyleUrl]);

  const resolveFeature = useCallback(
    (layerId: string, index: number) => {
      if (layerId === "map-points" || layerId === "map-gem-facilities") {
        return pointsData[index] ?? null;
      }
      if (layerId === "firms-flame") {
        return firmsFiresData[index] ?? null;
      }
      if (isMapPathsLayer(layerId)) return deferredPathsData[index] ?? null;
      if (layerId === "map-polygons-fill") return polygonsData[index] ?? null;
      if (layerId === "map-rings") return ringsData[index] ?? null;
      if (layerId === AIRCRAFT_SYMBOL_LAYER_ID) {
        return aircraftSymbolsItems[index] ?? null;
      }
      return null;
    },
    [
      aircraftSymbolsItems,
      deferredPathsData,
      firmsFiresData,
      pointsData,
      polygonsData,
      ringsData,
    ],
  );

  const handleMapClick = useCallback(
    (event: {
      lngLat: { lat: number; lng: number };
      features?: { layer?: { id?: string }; properties?: { index?: number; id?: unknown } }[];
    }) => {
      const features = event.features ?? [];

      /**
       * 모바일엔 호버가 없다 — 기지를 탭하면 같은 방식으로 선이 드러나고,
       * 빈 곳을 탭하면 닫힌다. (데스크톱 호버 동작은 그대로 유지)
       */
      const baseFeature = features.find((f) => f.layer?.id === "island-chains-bases");
      const tappedBaseId = baseFeature?.properties?.id;
      if (typeof tappedBaseId === "string" && tappedBaseId.length > 0) {
        // 토글이 아니라 항상 선택 — 터치에서는 tap 직전 합성 mousemove가 이미
        // 같은 값을 넣어두는 경우가 있어, 토글로 두면 즉시 꺼져 버린다.
        setHoveredIslandBaseId(tappedBaseId);
        return;
      }
      if (hoveredIslandBaseId) setHoveredIslandBaseId(null);

      for (const feature of features) {
        const layerId = feature.layer?.id;
        const index = feature.properties?.index;
        if (layerId == null || index == null) continue;
        const item = resolveFeature(layerId, Number(index));
        if (!item) continue;
        if (layerId === "map-points" || layerId === "firms-flame") {
          onPointClick?.(item);
          return;
        }
        if (layerId === AIRCRAFT_SYMBOL_LAYER_ID) {
          onAircraftClick?.(item, aircraftSymbolsIsCivil[Number(index)] ?? false);
          return;
        }
        if (isMapPathsLayer(layerId)) {
          onPathClick?.(item);
          return;
        }
        if (layerId === "map-polygons-fill") {
          onPolygonClick?.(item);
          return;
        }
      }
      onGlobeClick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    },
    [
      hoveredIslandBaseId,
      onGlobeClick,
      onPathClick,
      onPointClick,
      onPolygonClick,
      resolveFeature,
    ],
  );

  const handleMapMouseMove = useCallback(
    (event: {
      lngLat: { lat: number; lng: number };
      features?: {
        layer?: { id?: string };
        properties?: { index?: number; id?: string };
      }[];
    }) => {
      const { lat, lng } = event.lngLat;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        onGlobeMouseMoveRef.current?.({ lat, lng });
      }

      const features = event.features ?? [];
      let baseHit: string | null = null;
      for (const feature of features) {
        if (feature.layer?.id === "island-chains-bases") {
          const id = feature.properties?.id;
          if (typeof id === "string" && id.length > 0) {
            baseHit = id;
            break;
          }
        }
      }
      setHoveredIslandBaseId(baseHit);

      for (const feature of features) {
        const layerId = feature.layer?.id;
        const index = feature.properties?.index;
        if (layerId == null || index == null) continue;
        const item = resolveFeature(layerId, Number(index));
        if (!item) continue;
        if (layerId === "map-points" || layerId === "firms-flame") {
          onPointHover?.(item);
          return;
        }
        if (layerId === AIRCRAFT_SYMBOL_LAYER_ID) {
          onAircraftHover?.(item);
          return;
        }
        if (isMapPathsLayer(layerId)) {
          onPathHover?.(item);
          setHoveredPathGroupId(realCorridorGroupIdOf(item));
          setHoveredAxisLinkGroupId(axisLinkHoverGroupId(item));
          return;
        }
        if (layerId === "map-polygons-fill") {
          onPolygonHover?.(item);
          return;
        }
      }
      onPointHover?.(null);
      onPathHover?.(null);
      onPolygonHover?.(null);
      onAircraftHover?.(null);
      setHoveredPathGroupId(null);
      setHoveredAxisLinkGroupId(null);
    },
    [onAircraftHover, onPathHover, onPointHover, onPolygonHover, resolveFeature],
  );

  const handleMapMouseLeave = useCallback(() => {
    onGlobeMouseMoveRef.current?.(null);
    setHoveredIslandBaseId(null);
    onPointHover?.(null);
    onPathHover?.(null);
    onPolygonHover?.(null);
    onAircraftHover?.(null);
    setHoveredPathGroupId(null);
    setHoveredAxisLinkGroupId(null);
  }, [onAircraftHover, onPathHover, onPointHover, onPolygonHover]);

  useEffect(() => {
    if (!mapLoaded || firmsFiresData.length === 0) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    void ensureFirmsFireImages(map).catch(() => undefined);
  }, [firmsFiresData.length, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || firmsFiresData.length === 0) return;
    if (
      prefersReducedMotion()
    ) {
      return;
    }

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last < 70) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      last = now;
      if (movingRef.current) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      const map = mapRef.current?.getMap();
      if (!map?.getLayer("firms-flame")) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      const t = now / 1000;
      const p0 = 0.94 + 0.06 * Math.sin(t * 3.2);
      const p1 = 0.94 + 0.06 * Math.sin(t * 3.2 + 2.1);
      const p2 = 0.94 + 0.06 * Math.sin(t * 3.2 + 4.2);
      const pulseByPhase = ["match", ["get", "phase"], 0, p0, 1, p1, p2];
      try {
        // icon-size is a zoom expression (FIRMS_ICON_SIZE_BY_ZOOM); only pulse opacity
        map.setPaintProperty("firms-flame", "icon-opacity", [
          "*",
          ["get", "iconOpacity"],
          ["+", 0.92, ["*", 0.08, pulseByPhase]],
        ] as never);
      } catch {
        /* style swap mid-frame */
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [firmsFiresData.length, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    void ensureGemFacilityImages(map).catch(() => undefined);
    void ensureFirmsFireImages(map).catch(() => undefined);
    void ensureAircraftSymbolImages(map).catch(() => undefined);
  }, [mapLoaded, mapStyleUrl]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const onStyle = () => {
      // OpenFreeMap Liberty 등 projection 미포함 스타일은 Mercator로 리셋됨 → 지구본 재적용
      const m = map as unknown as BasemapMapLike;
      applyBasemapGlobeProjection(m);
      applyBasemapAtmosphere(m, basemapModeRef.current);
      applyBasemapTerrain(m, basemapModeRef.current, {
        ultraLite: ultraLiteRef.current,
      });
      applyBasemapSatelliteImagery(m, basemapModeRef.current);
      applyBasemapPlaceLabelScale(m, basemapModeRef.current);
      methods.applyControls();
      void ensureGemFacilityImages(map).catch(() => undefined);
      void ensureFirmsFireImages(map).catch(() => undefined);
      void ensureAircraftSymbolImages(map).catch(() => undefined);
    };
    map.on("style.load", onStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [mapLoaded, mapStyleUrl, methods]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("moveend", notifyChange);
    return () => {
      map.off("moveend", notifyChange);
    };
  }, [mapLoaded, notifyChange]);

  /**
   * 중국 도련선은 체크박스가 켜지면 전체를 은은하게 상시 표시하고(발견성·안정감),
   * 기지를 호버(모바일은 탭)하면 그 기지가 걸친 구간만 위에 겹쳐 강조한다.
   * 미군 기지망(거미줄)은 반대로 상시 표시하지 않고, 기지를 호버·탭했을 때만
   * 그 기지에 연결된 간선(허브·스포크)만 그린다 — 태평양 전역에 항상 깔린 선이 아니다.
   * 호버 전용으로 두면 선이 있는지조차 모르는 유저가 생겨서 기지 점(circle)은 항상 보이게 둔다.
   */
  const activeIslandBaseId = showIslandChains ? hoveredIslandBaseId : null;
  const chinaChainsFc = useMemo(() => islandChainsChinaGeoJson(), []);
  const chinaHighlightFc = useMemo(
    () => islandChainsChinaHighlightGeoJson(activeIslandBaseId),
    [activeIslandBaseId],
  );
  const usHighlightFc = useMemo(
    () => islandChainsUsHighlightGeoJson(activeIslandBaseId),
    [activeIslandBaseId],
  );
  const basesFc = useMemo(() => islandChainsBasesGeoJson(), []);
  const taiwanPulseFc = useMemo(() => islandChainsTaiwanPulseGeoJson(), []);
  const radarFc = useMemo(
    () => islandChainsRadarGeoJson(activeIslandBaseId),
    [activeIslandBaseId],
  );

  /** 중국 도련선 점선 흐름 + 대만 펄스 — 100ms (내장 GPU 친화) */
  useEffect(() => {
    if (!mapLoaded || !showIslandChains) return;
    if (
      prefersReducedMotion()
    ) {
      return;
    }
    const map = mapRef.current?.getMap();
    if (!map) return;
    let step = 0;
    const id = window.setInterval(() => {
      if (!map.getLayer("island-chains-china")) return;
      step = (step + 1) % CHINA_DASH_SEQUENCE.length;
      const dash = CHINA_DASH_SEQUENCE[step]!;
      try {
        map.setPaintProperty("island-chains-china", "line-dasharray", dash);
        if (map.getLayer("island-chains-taiwan-pulse")) {
          const t = step / CHINA_DASH_SEQUENCE.length;
          const wave = Math.abs(Math.sin(t * Math.PI * 2));
          map.setPaintProperty(
            "island-chains-taiwan-pulse",
            "circle-radius",
            14 + wave * 22,
          );
          map.setPaintProperty(
            "island-chains-taiwan-pulse",
            "circle-opacity",
            0.12 + wave * 0.38,
          );
          map.setPaintProperty(
            "island-chains-taiwan-pulse",
            "circle-stroke-opacity",
            0.35 + wave * 0.55,
          );
        }
      } catch {
        /* style reload race */
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [mapLoaded, showIslandChains]);

  /** PortWatch graph routes — dashOffset flow + capacity-scaled glow */
  useEffect(() => {
    if (!mapLoaded || !hasMaritimeRoutes) return;
    if (prefersReducedMotion()) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    let step = 0;
    const id = window.setInterval(() => {
      if (!map.getLayer("map-paths-maritime")) return;
      step = (step + 1) % MARITIME_DASH_SEQUENCE.length;
      const dash = MARITIME_DASH_SEQUENCE[step]!;
      try {
        map.setPaintProperty("map-paths-maritime", "line-dasharray", dash);
      } catch {
        /* style reload race */
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [mapLoaded, hasMaritimeRoutes]);

  useEffect(() => {
    if (!showIslandChains) setHoveredIslandBaseId(null);
  }, [showIslandChains]);

  /**
   * 실측 회랑 "글린트" — 상시 재생이 아니라 개별 회랑/축 관계를 호버할 때만 켜진다.
   * 태양광이 칼날을 스치듯 밴드가 line-progress를 따라 이동하되, 다구간(육로↔해상)
   * 회랑이면 leg의 실제 거리(lengthKm) 비례로 파동이 순서대로 넘어간다 — 짧은
   * 해상 구간은 빨리 지나가고 긴 철도 구간은 천천히, 실제 이동 시간처럼 보이게.
   * island-chains 애니메이션과 동일하게 100ms 인터벌(내장 GPU 친화) +
   * getLayer 가드 + try/catch(스타일 리로드 레이스 대비).
   */
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!mapLoaded || !map) return;
    const layerIds = Array.from(
      { length: CORRIDOR_GLINT_MAX_LEGS },
      (_, i) => `map-paths-glint-${i}`,
    );
    const clearAll = () => {
      for (const layerId of layerIds) {
        if (!map.getLayer(layerId)) continue;
        try {
          map.setPaintProperty(layerId, "line-gradient", buildCorridorGlintOffGradient());
        } catch {
          /* style reload race */
        }
      }
    };

    if (!hoveredPathGroupId || prefersReducedMotion()) {
      clearAll();
      return;
    }

    // 호버 중인 회랑의 leg들을 실제 거리(lengthKm) 비례로 [startFrac, endFrac] 구간화.
    const matches: { legIndex: number; lengthKm: number }[] = [];
    for (const raw of deferredPathsData) {
      if (!raw || typeof raw !== "object" || !("meta" in raw)) continue;
      const meta = (raw as { meta?: Record<string, unknown> }).meta;
      if (!meta || meta.geometrySource !== "real-corridor") continue;
      const groupId = (meta.groupId ?? meta.corridorGroupId) as string | undefined;
      if (groupId !== hoveredPathGroupId) continue;
      const legIndex = typeof meta.legIndex === "number" ? meta.legIndex : 0;
      const lengthKmRaw = (raw as { lengthKm?: number | null }).lengthKm;
      const lengthKm = typeof lengthKmRaw === "number" && lengthKmRaw > 0 ? lengthKmRaw : 1;
      matches.push({ legIndex, lengthKm });
    }
    if (matches.length === 0) {
      // deferredPathsData가 아직 안 갱신됐거나 매칭 실패 — 다음 훅 재실행을 기다린다.
      clearAll();
      return;
    }
    matches.sort((a, b) => a.legIndex - b.legIndex);
    const totalKm = matches.reduce((sum, m) => sum + m.lengthKm, 0) || 1;
    let cursor = 0;
    const legs = matches.map((m) => {
      const startFrac = cursor / totalKm;
      cursor += m.lengthKm;
      return { legIndex: m.legIndex, startFrac, endFrac: cursor / totalKm };
    });

    const totalSteps = Math.max(
      1,
      Math.round(CORRIDOR_GLINT_PERIOD_MS / CORRIDOR_GLINT_TICK_MS),
    );
    let step = 0;
    const tick = () => {
      const g = step / totalSteps; // 전체 회랑 길이 기준 0→1 진행(위상)
      for (let slot = 0; slot < CORRIDOR_GLINT_MAX_LEGS; slot += 1) {
        const layerId = layerIds[slot];
        if (!map.getLayer(layerId)) continue;
        const leg = legs.find((l) => l.legIndex === slot);
        try {
          if (!leg) {
            map.setPaintProperty(layerId, "line-gradient", buildCorridorGlintOffGradient());
            continue;
          }
          const span = leg.endFrac - leg.startFrac;
          const localFrac = span > 0 ? (g - leg.startFrac) / span : 0;
          map.setPaintProperty(
            layerId,
            "line-gradient",
            localFrac < -0.08 || localFrac > 1.08
              ? buildCorridorGlintOffGradient()
              : buildCorridorGlintGradient(Math.max(0, Math.min(1, localFrac))),
          );
        } catch {
          /* style reload race */
        }
      }
    };
    tick();
    const id = window.setInterval(() => {
      step = (step + 1) % totalSteps;
      tick();
    }, CORRIDOR_GLINT_TICK_MS);
    return () => window.clearInterval(id);
  }, [mapLoaded, hoveredPathGroupId, deferredPathsData]);

  /**
   * Alt + 좌클릭 드래그 → pitch / bearing 조절.
   * flyTo로 사선으로 눕힌 카메라를 유저가 바로잡을 수 있게 함.
   * (기본은 우클릭·Ctrl 드래그가 MapLibre rotate — Alt는 별도 단축키)
   */
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const canvas = map.getCanvas();
    if (!canvas) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let panWasEnabled = true;
    let rotateWasEnabled = true;

    const finish = () => {
      if (!dragging) return;
      dragging = false;
      if (panWasEnabled) map.dragPan.enable();
      if (rotateWasEnabled) map.dragRotate.enable();
      canvas.style.cursor = "";
    };

    const onDown = (event: MouseEvent) => {
      if (!event.altKey || event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      panWasEnabled = map.dragPan.isEnabled();
      rotateWasEnabled = map.dragRotate.isEnabled();
      map.dragPan.disable();
      map.dragRotate.disable();
      canvas.style.cursor = "move";
      event.preventDefault();
      event.stopPropagation();
    };

    const onMove = (event: MouseEvent) => {
      if (!dragging) return;
      if (!event.altKey) {
        finish();
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      if (dx === 0 && dy === 0) return;
      // 좌우 → 베어링(회전), 위아래 → 피치(눕히기/세우기)
      const nextBearing = map.getBearing() - dx * 0.45;
      const nextPitch = Math.max(0, Math.min(85, map.getPitch() - dy * 0.35));
      map.jumpTo({ bearing: nextBearing, pitch: nextPitch });
      event.preventDefault();
    };

    const onUp = () => finish();

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") finish();
    };

    canvas.addEventListener("mousedown", onDown, true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      finish();
      canvas.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mapLoaded]);

  /**
   * HTML 마커 목록 — **메모이제이션 필수**.
   *
   * 이 map은 화면 마커 수만큼 <Marker> JSX를 만든다. GlobeDashboard는
   * 상태가 64개라 티커·폴링 등 지도와 무관한 이유로도 자주 리렌더되는데,
   * 그때마다 이 목록 전체가 재생성되고 React가 전부 diff했다.
   *
   * deps 설계:
   *  - htmlElementsData : deconflict가 참조를 유지하므로(htmlOverlayDeconflict.ts)
   *                       내용이 안 바뀌면 같은 배열 = 스킵된다. 두 최적화가 맞물린다.
   *  - htmlElement      : GlobeDashboard의 useCallback. 언어·고도가 바뀌면 새로 생성되므로
   *                       마커 DOM을 다시 만들어야 하는 시점과 정확히 일치한다.
   *  - mapBearingDeg    : 옆모습 실루엣(e/w)이 실제로 뒤집히는 기준
   *  - basemapMode      : 톤에 따라 팔레트가 달라짐
   *
   * 위치 접근자(htmlLat/Lng/Rotation/RotationAlignment)는 item만 보는 순수 함수라
   * ref로 최신값을 읽어도 안전하다 — deps에 넣으면 매 렌더 새 참조라 메모가 죽는다.
   */
  const htmlMarkerNodes = useMemo(() => {
    if (!htmlElement) return null;
    const { htmlLat, htmlLng, htmlRotation, htmlRotationAlignment } =
      htmlAccessorsRef.current;
    return (
            htmlElementsData.map((item, index) => {
                const displayKind = String(
                  (item as { displayKind?: string }).displayKind ?? "",
                );
                // markerId만 키로 씀 — bare `id` 폴백은 종류 간 키 충돌로
                // 사망자·콜아웃·뉴스 네온이 한 Marker에 묶이는 원인이 됨
                const markerId = String(
                  (item as { markerId?: string }).markerId ??
                    `${displayKind || "html"}-${index}`,
                );
                const enriched =
                  displayKind === "ais-html"
                    ? { ...(item as object), mapBearingDeg }
                    : item;
                const rotation = htmlRotation(enriched);
                const alignment = htmlRotationAlignment(enriched);
                const rotKey =
                  alignment === "map" ? Math.round((((rotation % 360) + 360) % 360) / 5) * 5 : 0;
                const milKind = String(
                  (enriched as { militaryKind?: string | null }).militaryKind ?? "",
                );
                const disguised = Boolean((enriched as { disguised?: boolean }).disguised);
                // 수상함·잠수함·위장선 — 옆모습 E/W (항모는 俯視+침로 회전)
                const sideProfileHull =
                  disguised ||
                  ((enriched as { category?: string }).category === "military" &&
                    milKind !== "" &&
                    milKind !== "unknown" &&
                    milKind !== "carrier");
                const headingRaw = Number(
                  (enriched as { courseOverGround?: number; trueHeading?: number })
                    .courseOverGround ??
                    (enriched as { trueHeading?: number }).trueHeading ??
                    0,
                );
                const relHeading = (((headingRaw - mapBearingDeg) % 360) + 360) % 360;
                const headingKey = sideProfileHull
                  ? relHeading > 180
                    ? "w"
                    : "e"
                  : alignment === "map"
                    ? String(rotKey)
                    : "0";
                // 전부 viewport — map pitch면 사망자만 기울며 같은 좌표의 콜아웃·네온과 한 덩어리처럼 보임
                const pitchAlignment = "viewport" as const;
                // MapLibre는 react-globe htmlAltitude를 무시 → 픽셀 오프셋으로 종류 분리
                // (음수=왼쪽/위). 전장에서 사망자·콜아웃·네온이 겹쳐 묶이지 않게 함.
                const markerOffset =
                  displayKind === "casualty-skull"
                    ? ([0, 30] as [number, number])
                    : displayKind === "situation-callout"
                      ? ([-12, -42] as [number, number])
                      : displayKind === "news-stream-neon" ||
                          displayKind === "ukraine-gdelt-neon" ||
                          displayKind === "telegram-neon"
                        ? ([18, 8] as [number, number])
                        : undefined;
                return (
                <Marker
                  /**
                   * key는 **markerId만**. 이전에는 `-r${rotKey}-b${bearingKey}-h${headingKey}`가
                   * 붙어 있어서, 지도를 5° 회전할 때마다 해당 마커가 통째로
                   * 언마운트→재마운트됐다 (DOM 파괴 + htmlElement() 재호출 +
                   * innerHTML 재파싱). 회전 드래그가 끊기던 주원인.
                   *
                   * 회전/침로 변화는 아래 ref 콜백의 data-markerSig가 이미
                   * 정확히 감지해 필요한 경우에만 DOM을 다시 만든다 —
                   * key가 그 방어를 무력화하고 있었다.
                   */
                  key={`html-marker-${markerId}`}
                  longitude={htmlLng(item)}
                  latitude={htmlLat(item)}
                  anchor="center"
                  offset={markerOffset}
                  rotation={rotation}
                  rotationAlignment={alignment}
                  pitchAlignment={pitchAlignment}
                  /**
                   * 기본 0.2면 구체 뒤편(유럽 기지 등)이 한반도 쪽에서 비쳐 보임.
                   *
                   * ⚠️ 비용 주의: 이 값이 있으면 MapLibre가 마커마다 오클루전
                   * 판정을 돌리고, terrain이 켜져 있으면 표고 조회까지 탄다.
                   * 화면 마커가 수백 개이므로 프레임당 비용이 곱해진다.
                   * → Ultra-Lite에서 terrain을 끄는 이유 (basemapMode.ts).
                   * 근본 해결은 아이콘성 마커를 symbol 레이어로 옮기는 것.
                   */
                  opacityWhenCovered={0}
                >
                  <div
                    ref={(node) => {
                      if (!node) return;
                      // markerId·본문까지 시그에 포함 — 종류별 공통 sig로 DOM이 재사용되며
                      // 사망자/콜아웃/네온이 한 노드에 섞이던 문제 방지
                      const typed = enriched as {
                        markerId?: string;
                        displayKind?: string;
                        killed?: number;
                        wounded?: number;
                        warheads?: number;
                        killedLabel?: string;
                        title?: string;
                        body?: string;
                        accent?: string;
                        link?: string;
                        militaryKind?: string | null;
                        headingDeg?: number;
                        lat?: number;
                        orbitLat?: number;
                      };
                      const reconHalo =
                        (typed.displayKind ?? displayKind) === "recon-sat-html" &&
                        typed.orbitLat != null &&
                        typed.lat != null &&
                        Math.abs(typed.orbitLat - typed.lat) > 0.12;
                      const sig = [
                        typed.markerId ?? markerId,
                        typed.displayKind ?? displayKind,
                        typed.killed ?? "",
                        typed.wounded ?? "",
                        typed.warheads ?? "",
                        typed.killedLabel ?? "",
                        typed.title ?? "",
                        typed.body ?? "",
                        typed.accent ?? "",
                        typed.link ?? "",
                        /**
                         * 이전에는 mapBearingDeg·courseOverGround·trueHeading 원값을 넣었다.
                         * 이 값들은 카메라를 5° 돌릴 때마다 바뀌므로, 실제 그림이 그대로인데도
                         * 회전 내내 DOM을 다시 만들었다.
                         *
                         * headingKey는 **실제로 렌더되는 방향**만 담는다 —
                         * 옆모습 실루엣은 "e"/"w" 둘 뿐이고, map-aligned는 5° 양자화,
                         * 나머지는 "0". 즉 그림이 실제로 뒤집힐 때만 재생성된다.
                         */
                        headingKey,
                        typed.militaryKind ?? "",
                        reconHalo ? "halo" : "ground",
                        typed.headingDeg != null
                          ? String(Math.round((((typed.headingDeg % 360) + 360) % 360) / 15) * 15)
                          : "",
                        // 톤이 바뀌면 팔레트가 달라지므로 DOM을 다시 만들어야 함
                        basemapMode,
                      ].join("|");
                      if (node.dataset.markerSig === sig && node.childElementCount > 0) return;
                      node.replaceChildren();
                      const el = htmlElement(enriched);
                      node.appendChild(el);
                      node.dataset.markerSig = sig;
                    }}
                  />
                </Marker>
                );
              })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlElementsData, htmlElement, mapBearingDeg, basemapMode]);

  /** ENTRY_GATE 와 동일 — 맵 마운트·configureGlobe 사이 카메라 점프 방지 */
  const initialCamera = globeViewToMapLibre({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
    altitude: ENTRY_GATE.bootAltitude,
    pitch: ENTRY_GATE.bootPitch,
  });

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: backgroundColor as string }}>
      {contextLost ? <WebglContextLostOverlay onRetry={handleContextRetry} /> : null}
      <Map
        ref={mapRef}
        mapStyle={mapStyleUrl}
        initialViewState={{
          longitude: initialCamera.longitude,
          latitude: initialCamera.latitude,
          zoom: initialCamera.zoom,
          pitch: initialCamera.pitch,
          bearing: initialCamera.bearing,
        }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        renderWorldCopies={false}
        /**
         * ⚠️ `preserveDrawingBuffer`를 여기에 다시 넣지 말 것.
         * 매 프레임 백버퍼 보존을 강제해 브라우저의 스왑 최적화를 통째로 끈다
         * (내장 GPU 기준 프레임 예산 20~40% 손실). 공유 캡처 한 번을 위해
         * 100% 시간 동안 비용을 내는 구조였다.
         * 캡처는 methods.captureFrame() — 필요한 순간에만 triggerRepaint 후
         * render 콜백 안에서 읽는다. (mapGlobeRef.ts)
         *
         * globe projection은 style 객체에 미리 주입하고, handleLoad에서 setProjection으로 고정한다.
         */
        interactiveLayerIds={interactiveLayerIds}
        onLoad={handleLoad}
        onMove={handleMove}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        cursor="grab"
      >
        {/* DEM — 상시 소스, exaggeration만 모드별로 조절 */}
        <Source
          id={BASEMAP_SOURCE_IDS.terrain}
          type="raster-dem"
          tiles={[AWS_TERRARIUM_TILES]}
          tileSize={256}
          maxzoom={15}
          attribution={AWS_TERRARIUM_ATTRIBUTION}
          {...({ encoding: "terrarium" } as Record<string, unknown>)}
        />

        {showOsmBuildings && ionToken ? (
          <OsmBuildingsOverlay accessToken={ionToken} />
        ) : null}

        {/* 지형 모드 · 고줌 3D 건물 — Ion 없으면 OpenFreeMap extrusion 폴백 */}
        {showVectorBuildings ? (
          <Source
            id={BASEMAP_SOURCE_IDS.buildings}
            type="vector"
            url={OPENFREEMAP_PLANET_URL}
            attribution={OPENFREEMAP_ATTRIBUTION}
          >
            <Layer
              id={BASEMAP_LAYER_IDS.buildings}
              type="fill-extrusion"
              {...({
                "source-layer": "building",
                minzoom: BUILDINGS_MIN_ZOOM,
                filter: ["!=", ["get", "hide_3d"], true],
                paint: {
                  "fill-extrusion-color": "#c4b8a8",
                  "fill-extrusion-opacity": 0.72,
                  "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    BUILDINGS_MIN_ZOOM,
                    0,
                    BUILDINGS_MIN_ZOOM + 1,
                    ["coalesce", ["get", "render_height"], ["get", "height"], 10],
                  ],
                  "fill-extrusion-base": [
                    "coalesce",
                    ["get", "render_min_height"],
                    ["get", "min_height"],
                    0,
                  ],
                },
              } as Record<string, unknown>)}
            />
          </Source>
        ) : null}

        {polygonsGeoJson.features.length > 0 ? (
          <Source id="map-polygons" type="geojson" data={polygonsGeoJson}>
            <Layer
              id="map-polygons-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "fill"],
                "fill-opacity": ["get", "fillOpacity"],
              }}
            />
            <Layer
              id="map-polygons-line"
              type="line"
              paint={{
                "line-color": ["get", "stroke"],
                "line-width": 1.1,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {axisHubCountriesGeoJson.features.length > 0 ? (
          <Source
            id="axis-hub-countries-source"
            type="geojson"
            data={axisHubCountriesGeoJson}
            tolerance={0}
            buffer={64}
          >
            <Layer
              id="axis-hub-countries-fill"
              type="fill"
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "#dc2626"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.28],
                "fill-antialias": true,
              }}
            />
            <Layer
              id="axis-hub-countries-outline"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "rgba(248,113,113,0.9)"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  2,
                  0.6,
                  6,
                  1.1,
                  10,
                  1.6,
                ],
                "line-opacity": 0.92,
              }}
            />
          </Source>
        ) : null}

        {pathsGeoJson.features.length > 0 ? (
          <Source
            id="map-paths-source"
            type="geojson"
            data={pathsGeoJson}
            lineMetrics
          >
            {/* 실선 — data-driven dasharray 없이 (DFC/BRI 등) */}
            <Layer
              id="map-paths-solid"
              type="line"
              filter={["<=", ["get", "dashLength"], 0]}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                // DFC·BRI 코리도어: 반투명 + 살짝 blur → 폴리곤 띠 느낌
                "line-opacity": [
                  "case",
                  [
                    "any",
                    ["==", ["get", "kind"], "bri-trade"],
                    ["==", ["get", "kind"], "us-dfc-supply"],
                  ],
                  0.72,
                  0.95,
                ],
                "line-blur": [
                  "case",
                  [
                    "any",
                    ["==", ["get", "kind"], "bri-trade"],
                    ["==", ["get", "kind"], "us-dfc-supply"],
                  ],
                  1.15,
                  0,
                ],
              }}
            />
            {/* 점선 — 고정 dasharray + 필터 (data-driven dash 회피) */}
            <Layer
              id="map-paths-dashed"
              type="line"
              filter={[
                "all",
                [">", ["get", "dashLength"], 0],
                ["!=", ["get", "kind"], "maritime-route"],
              ]}
              layout={{
                "line-cap": "butt",
                "line-join": "round",
              }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                "line-opacity": 0.9,
                "line-dasharray": [2, 1.2],
              }}
            />
            {/* PortWatch maritime — capacity glow underlay + animated dash flow */}
            <Layer
              id="map-paths-maritime-glow"
              type="line"
              filter={["==", ["get", "kind"], "maritime-route"]}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  2,
                  ["*", ["get", "strokeAngular"], 2.8],
                  6,
                  ["*", ["get", "strokeAngular"], 4.2],
                  10,
                  ["*", ["get", "strokeAngular"], 5.6],
                ],
                "line-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  2,
                  0.22,
                  8,
                  0.38,
                ],
                "line-blur": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  2,
                  0.6,
                  8,
                  1.4,
                ],
              }}
            />
            <Layer
              id="map-paths-maritime"
              type="line"
              filter={["==", ["get", "kind"], "maritime-route"]}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                "line-opacity": 0.96,
                "line-dasharray": [0, 5, 2.5],
              }}
            />
            {/*
              axis-link 국가색→관계색 호버 리컬러. base(solid/dashed) 레이어는 국가(허브)
              고유색을 그대로 두고, 그 위에 순수 추가로 덧그리는 레이어라 기존 스타일에는
              영향이 없다. 호버 중인 groupId와 같은 axis-link feature만 필터를 통과해
              관계 성격 색(군수=빨강, 하이브리드=주황 등)으로 잠깐 바뀐다. solid/dashed를
              나눠 그리는 이유는 해상 leg(점선)까지 실선으로 덮어써버리지 않기 위함.
            */}
            <Layer
              id="map-paths-hover-recolor-solid"
              type="line"
              filter={[
                "all",
                ["<=", ["get", "dashLength"], 0],
                ["!=", ["get", "hoverColor"], ""],
                ["==", ["get", "groupId"], hoveredAxisLinkGroupId ?? "__none__"],
              ]}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": ["get", "hoverColor"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                "line-opacity": 0.95,
              }}
            />
            <Layer
              id="map-paths-hover-recolor-dashed"
              type="line"
              filter={[
                "all",
                [">", ["get", "dashLength"], 0],
                ["!=", ["get", "hoverColor"], ""],
                ["==", ["get", "groupId"], hoveredAxisLinkGroupId ?? "__none__"],
              ]}
              layout={{
                "line-cap": "butt",
                "line-join": "round",
              }}
              paint={{
                "line-color": ["get", "hoverColor"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                "line-opacity": 0.9,
                "line-dasharray": [2, 1.2],
              }}
            />
            {/*
              실측 회랑(카스피해 드론 이송로·라진-하산철도 등, axis-link 오버라이드) 전용 —
              "칼날에 태양광이 스치는" 하이라이트 밴드가 line-progress를 따라 흐른다.
              base 레이어(위 solid/dashed)는 그대로 두고, 그 위에 겹쳐 그리는 순수 추가
              레이어라 기존 경로 스타일에는 영향이 없다. 상시 재생이 아니라 개별 회랑을
              호버할 때만 켜짐(hoveredPathGroupId) — leg마다 별도 레이어(map-paths-glint-N)를
              둬서, 다구간(육로↔해상) 회랑이면 파동이 leg 하나씩 순서대로 넘어가게 한다.
            */}
            {Array.from({ length: CORRIDOR_GLINT_MAX_LEGS }, (_, slot) => (
              <Layer
                key={`map-paths-glint-${slot}`}
                id={`map-paths-glint-${slot}`}
                type="line"
                filter={[
                  "all",
                  ["==", ["get", "glint"], true],
                  ["==", ["get", "groupId"], hoveredPathGroupId ?? "__none__"],
                  ["==", ["get", "legIndex"], slot],
                ]}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
                paint={{
                  "line-gradient": buildCorridorGlintOffGradient(),
                  "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                  "line-blur": 0.6,
                  "line-opacity": 0.95,
                }}
              />
            ))}
          </Source>
        ) : null}

        {focusFillGeoJson && focusFillGeoJson.features.length > 0 ? (
          <Source id="air-raid-focus-fill-source" type="geojson" data={focusFillGeoJson}>
            <Layer
              id="air-raid-focus-fill"
              type="fill"
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "rgba(185, 28, 28, 0.28)"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.32],
              }}
            />
          </Source>
        ) : null}

        {priorityPathsGeoJson.features.length > 0 ? (
          <Source id="map-priority-paths-source" type="geojson" data={priorityPathsGeoJson}>
            <Layer
              id="map-priority-paths"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                "line-opacity": 1,
              }}
            />
          </Source>
        ) : null}

        {pointsGeoJson.features.length > 0 ? (
          <Source id="map-points-source" type="geojson" data={pointsGeoJson}>
            <Layer
              id="map-points"
              type="circle"
              filter={["!", ["has", "icon"]]}
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": CIRCLE_RADIUS_BY_ZOOM,
                "circle-opacity": 0.92,
                "circle-stroke-width": pointStrokeWidth,
                "circle-stroke-color": pointStrokeColor,
              }}
            />
            <Layer
              id="map-gem-facilities"
              type="symbol"
              filter={["has", "icon"]}
              layout={{
                "icon-image": ["get", "icon"],
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1.5,
                  0.28,
                  4,
                  0.42,
                  7,
                  0.62,
                  10,
                  0.85,
                ],
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-anchor": "center",
              }}
              paint={{
                "icon-opacity": 0.95,
              }}
            />
          </Source>
        ) : null}

        {/*
         * 항공기 — DOM Marker가 아니라 symbol 레이어.
         * 군용기 150 + 민항기 280 = 최대 430개가 프레임마다 project+transform을
         * 돌던 것을 GPU 배치 렌더 하나로 대체한다. (milAircraftSymbols.ts)
         */}
        {aircraftSymbolsGeoJson.features.length > 0 ? (
          <Source
            id={AIRCRAFT_SYMBOL_SOURCE_ID}
            type="geojson"
            data={aircraftSymbolsGeoJson}
          >
            <Layer
              id={AIRCRAFT_SYMBOL_LAYER_ID}
              type="symbol"
              layout={{
                "icon-image": ["get", "icon"],
                // 이미지를 표시 크기 그대로 구웠으므로 스케일 보간 없음(=선명).
                // 줌아웃에서만 살짝 줄여 전역 뷰의 밀도를 낮춘다.
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1.5,
                  0.62,
                  4,
                  0.82,
                  7,
                  1,
                ],
                // 침로 회전 — 실루엣의 코가 북쪽(+Y)이라 heading을 그대로 쓴다
                "icon-rotate": ["get", "rotate"],
                "icon-rotation-alignment": "map",
                "icon-pitch-alignment": "viewport",
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-anchor": "center",
              }}
              paint={{
                // 침로 미상은 0.8 (기존 DOM 마커 규칙 유지)
                "icon-opacity": ["get", "opacity"],
              }}
            />
          </Source>
        ) : null}

        {firmsGeoJson.features.length > 0 ? (
          <Source id="firms-fires-source" type="geojson" data={firmsGeoJson}>
            <Layer
              id="firms-flame"
              type="symbol"
              layout={{
                "icon-image": ["get", "icon"],
                "icon-size": FIRMS_ICON_SIZE_BY_ZOOM,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-anchor": "bottom",
                "icon-pitch-alignment": "viewport",
                "icon-rotation-alignment": "viewport",
              }}
              paint={{
                "icon-opacity": ["get", "iconOpacity"],
              }}
            />
          </Source>
        ) : null}

        {ringsGeoJson.features.length > 0 ? (
          <Source id="map-rings-source" type="geojson" data={ringsGeoJson}>
            <Layer
              id="map-rings"
              type="circle"
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": RING_RADIUS_BY_ZOOM,
                "circle-opacity": 0.35,
                "circle-stroke-width": 1,
                "circle-stroke-color": ["get", "color"],
              }}
            />
          </Source>
        ) : null}

        {showIslandChains ? (
          <>
            {/* 상시 표시 — 체크박스만 켜도 전체 선이 은은하게 보인다 */}
            <Source id="island-chains-china-source" type="geojson" data={chinaChainsFc}>
              <Layer
                id="island-chains-china"
                type="line"
                paint={{
                  "line-color": ["coalesce", ["get", "color"], "#ef4444"],
                  "line-width": 1.8,
                  "line-opacity": 0.42,
                  "line-dasharray": [0, 4, 3],
                }}
              />
            </Source>
            {/* 미군 기지망은 상시 표시 없음 — 기지를 호버·탭했을 때만 아래 highlight 블록에서 그린다 */}

            {/* 호버·탭 강조 — 해당 기지가 걸친 선만 위에 겹쳐 촤악 살아난다 */}
            {chinaHighlightFc.features.length > 0 ? (
              <Source
                id="island-chains-china-highlight-source"
                type="geojson"
                data={chinaHighlightFc}
              >
                <Layer
                  id="island-chains-china-highlight"
                  type="line"
                  paint={{
                    "line-color": ["coalesce", ["get", "color"], "#ef4444"],
                    "line-width": 3.2,
                    "line-opacity": 0.95,
                    "line-dasharray": [0, 4, 3],
                    "line-opacity-transition": { duration: 280, delay: 0 },
                    "line-width-transition": { duration: 280, delay: 0 },
                  }}
                />
              </Source>
            ) : null}
            {usHighlightFc.features.length > 0 ? (
              /* 거미줄 — hub(사령부 간) 간선은 굵고 밝게, spoke(전방기지) 간선은 가늘게 */
              <Source
                id="island-chains-us-highlight-source"
                type="geojson"
                data={usHighlightFc}
              >
                <Layer
                  id="island-chains-us-highlight-glow"
                  type="line"
                  paint={{
                    "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
                    "line-width": ["case", ["==", ["get", "tier"], "hub"], 10, 6],
                    "line-opacity": ["case", ["==", ["get", "tier"], "hub"], 0.32, 0.22],
                    "line-blur": 1.3,
                    "line-opacity-transition": { duration: 280, delay: 0 },
                  }}
                />
                <Layer
                  id="island-chains-us-highlight"
                  type="line"
                  paint={{
                    "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
                    "line-width": ["case", ["==", ["get", "tier"], "hub"], 4.5, 2.6],
                    "line-opacity": 1,
                    "line-dasharray": ["case", ["==", ["get", "tier"], "hub"], ["literal", [1, 0]], ["literal", [2, 1.4]]],
                    "line-opacity-transition": { duration: 280, delay: 0 },
                  }}
                />
              </Source>
            ) : null}
            <Source id="island-chains-taiwan-source" type="geojson" data={taiwanPulseFc}>
              <Layer
                id="island-chains-taiwan-pulse"
                type="circle"
                paint={{
                  "circle-color": "rgba(239, 68, 68, 0.15)",
                  "circle-radius": 18,
                  "circle-opacity": 0.28,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ef4444",
                  "circle-stroke-opacity": 0.65,
                  "circle-pitch-alignment": "map",
                }}
              />
            </Source>
            {radarFc.features.length > 0 ? (
              <Source id="island-chains-radar-source" type="geojson" data={radarFc}>
                <Layer
                  id="island-chains-radar-fill"
                  type="fill"
                  paint={{
                    "fill-color": "rgba(59, 130, 246, 0.14)",
                    "fill-opacity": 0.85,
                  }}
                />
                <Layer
                  id="island-chains-radar-outline"
                  type="line"
                  paint={{
                    "line-color": "rgba(147, 197, 253, 0.85)",
                    "line-width": 1.4,
                    "line-opacity": 0.9,
                    "line-dasharray": [1.2, 1.2],
                  }}
                />
              </Source>
            ) : null}
            <Source id="island-chains-bases-source" type="geojson" data={basesFc}>
              <Layer
                id="island-chains-bases"
                type="circle"
                paint={{
                  "circle-color": "#93c5fd",
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    2,
                    3.2,
                    5,
                    5.5,
                    8,
                    7,
                  ],
                  "circle-opacity": 0.95,
                  "circle-stroke-width": 1.4,
                  "circle-stroke-color": "#1e3a8a",
                }}
              />
            </Source>
          </>
        ) : null}

        {/* Ukraine front LOD: soft macro/micro overlap */}
        {ukraineMacroGeoJson.features.length > 0 ? (
          <Source id="ukraine-macro-source" type="geojson" data={ukraineMacroGeoJson}>
            <Layer
              id="ukraine-macro-fill"
              type="fill"
              maxzoom={6.25}
              filter={[
                "all",
                ["==", ["geometry-type"], "Polygon"],
                ["in", ["get", "role"], ["literal", ["ru-occupied", "ua-occupied", "ru-claimed", "ua-claimed"]]],
              ]}
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "#b91c1c"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.34],
              }}
            />
            <Layer
              id="ukraine-macro-outline"
              type="line"
              maxzoom={6.25}
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#fecaca"],
                "line-width": 1.4,
                "line-opacity": 0.85,
              }}
            />
            <Layer
              id="ukraine-macro-hatch"
              type="line"
              maxzoom={6.25}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["get", "role"], "hatch"],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "rgba(248,113,113,0.5)"],
                "line-width": 0.9,
                "line-opacity": 0.7,
              }}
            />
          </Source>
        ) : null}

        {ukraineMicroGeoJson.features.length > 0 ? (
          <Source id="ukraine-micro-source" type="geojson" data={ukraineMicroGeoJson}>
            <Layer
              id="ukraine-micro-fill"
              type="fill"
              minzoom={5.75}
              filter={[
                "all",
                ["==", ["geometry-type"], "Polygon"],
                ["in", ["get", "role"], ["literal", ["ru-occupied", "ua-occupied", "ru-claimed", "ua-claimed"]]],
              ]}
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "#f97316"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.4],
              }}
            />
            <Layer
              id="ukraine-micro-outline"
              type="line"
              minzoom={5.75}
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#fed7aa"],
                "line-width": 1.1,
                "line-opacity": 0.9,
              }}
            />
            <Layer
              id="ukraine-micro-defense"
              type="line"
              minzoom={5.75}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["get", "role"], "defense-line"],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#f87171"],
                "line-width": 2.2,
                "line-opacity": 0.95,
              }}
            />
            <Layer
              id="ukraine-micro-advance"
              type="line"
              minzoom={5.75}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["in", ["get", "role"], ["literal", ["advance", "hatch"]]],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#38bdf8"],
                "line-width": 1.6,
                "line-opacity": 0.88,
                "line-dasharray": [2, 1.2],
              }}
            />
            <Layer
              id="ukraine-micro-combat-circle"
              type="circle"
              minzoom={5.75}
              filter={[
                "all",
                ["==", ["geometry-type"], "Point"],
                ["==", ["get", "role"], "combat-ring"],
              ]}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  10,
                  10,
                  22,
                  13,
                  36,
                ],
                "circle-color": ["coalesce", ["get", "fill"], "#22c55e"],
                "circle-opacity": 0.28,
                "circle-stroke-width": 2,
                "circle-stroke-color": ["coalesce", ["get", "stroke"], "#86efac"],
              }}
            />
            <Layer
              id="ukraine-micro-combat-ring-line"
              type="line"
              minzoom={5.75}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["get", "role"], "combat-ring"],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#4ade80"],
                "line-width": 1.5,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {labelsGeoJson.features.length > 0 ? (
          <Source id="map-labels-source" type="geojson" data={labelsGeoJson}>
            <Layer
              id="map-labels-dot"
              type="circle"
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": LABEL_DOT_RADIUS_BY_ZOOM,
                "circle-opacity": 0.9,
              }}
            />
            <Layer
              id="map-labels-text"
              type="symbol"
              layout={{
                "text-field": ["get", "label"],
                "text-size": LABEL_TEXT_SIZE_BY_ZOOM,
                "text-offset": [0, 0.8],
                "text-anchor": "top",
                "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              }}
              paint={{
                "text-color": ["get", "color"],
                "text-halo-color": labelHaloColor,
                "text-halo-width": labelHaloWidth,
              }}
            />
          </Source>
        ) : null}

        {heatmapCollections.map((collection, index) =>
          collection.features.length > 0 ? (
            <Source
              key={`heatmap-${index}`}
              id={`map-heatmap-${index}`}
              type="geojson"
              data={collection}
            >
              <Layer
                id={`map-heatmap-layer-${index}`}
                type="heatmap"
                paint={{
                  "heatmap-weight": ["get", "weight"],
                  "heatmap-intensity": 0.65,
                  "heatmap-radius": 18,
                  "heatmap-opacity": 0.55,
                }}
              />
            </Source>
          ) : null,
        )}

        {htmlMarkerNodes}
      </Map>
    </div>
  );
});

export { mapLibreZoomToAltitude };
