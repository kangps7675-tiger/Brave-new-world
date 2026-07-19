"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { globeViewToMapLibre, mapLibreZoomToAltitude } from "@/lib/mapLibreBasemap";
import { createMapGlobeMethods, type MapGlobeMethods } from "@/lib/mapGlobeRef";
import {
  asFn,
  buildFirmsFiresGeoJson,
  buildHeatmapGeoJson,
  buildLabelsGeoJson,
  buildPathsGeoJson,
  buildPointsGeoJson,
  buildPolygonsGeoJson,
  buildRingsGeoJson,
  CIRCLE_RADIUS_BY_ZOOM,
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
  islandChainsBasesGeoJson,
  islandChainsChinaGeoJson,
  islandChainsRadarGeoJson,
  islandChainsTaiwanPulseGeoJson,
  islandChainsUsGeoJson,
} from "@/data/islandChains";

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
  /** MapLibre feature picking 대상 — VIINA 근접 줌에서 폴리곤 제외 등 */
  interactiveLayerIds?: readonly string[];
  /** 중국 도련선 · 미군 방어선 · 대만 펄스 */
  showIslandChains?: boolean;
  [key: string]: unknown;
}

const INTERACTIVE_LAYERS = [
  "map-points",
  "map-gem-facilities",
  "map-paths",
  "map-polygons-fill",
  "map-rings",
  "firms-flame",
  "ukraine-macro-fill",
  "ukraine-micro-fill",
  "ukraine-micro-defense",
  "ukraine-micro-combat-circle",
  "island-chains-bases",
] as const;

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
  const { mapStyleUrl, backgroundColor = "#02040a", showIslandChains = false } = props;
  const onGlobeReady = props.onGlobeReady as (() => void) | undefined;
  const onGlobeMouseMove = props.onGlobeMouseMove as
    | ((coords: { lat: number; lng: number } | null) => void)
    | undefined;

  const mapRef = useRef<MapRef>(null);
  const changeListenersRef = useRef(new Set<() => void>());
  const readyRef = useRef(false);
  const onGlobeReadyRef = useRef<(() => void) | undefined>(onGlobeReady);
  const onGlobeMouseMoveRef = useRef<
    ((coords: { lat: number; lng: number } | null) => void) | undefined
  >(onGlobeMouseMove);
  const [, setMapZoom] = useState(2);
  const [mapLoaded, setMapLoaded] = useState(false);
  /** 수상전투함 8방위 실루엣용 — 5° 양자화 */
  const [mapBearingDeg, setMapBearingDeg] = useState(0);
  /** 도련선/방어선 — 호버 기지 레이더 */
  const [hoveredIslandBaseId, setHoveredIslandBaseId] = useState<string | null>(null);
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

  const methods = useMemo(
    () => createMapGlobeMethods(mapRef, changeListenersRef),
    [],
  );

  useImperativeHandle(ref, () => methods, [methods]);

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
    const head = pathsData[0] as { id?: string } | undefined;
    const mid = pathsData[Math.floor(pathsData.length / 2)] as { id?: string } | undefined;
    const tail = pathsData[pathsData.length - 1] as { id?: string } | undefined;
    return `${pathsData.length}:${head?.id ?? ""}:${mid?.id ?? ""}:${tail?.id ?? ""}`;
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
  }, [pointsData]);

  const pathsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildPathsGeoJson(deferredPathsData, {
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
  }, [deferredPathsData]);

  const priorityPathsGeoJson = useMemo(() => {
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
  }, [priorityPathsData]);

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
    const a = accessorsRef.current;
    return buildLabelsGeoJson(labelsData, {
      lat: a.labelLat,
      lng: a.labelLng,
      text: a.labelText,
      size: a.labelSize,
      color: a.labelColor,
      dotRadius: a.labelDotRadius,
    });
  }, [labelsData]);

  const heatmapCollections = useMemo(() => buildHeatmapGeoJson(heatmapsData), [heatmapsData]);

  const notifyChange = useCallback(() => {
    changeListenersRef.current.forEach((listener) => listener());
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

  const handleMove = useCallback(
    (event: { viewState: { zoom: number; bearing?: number } }) => {
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
        publishZoom(mapZoomRef.current, true);
      }, 420);
      notifyChange();
    },
    [notifyChange, publishZoom],
  );

  useEffect(() => {
    return () => {
      if (pendingZoomPublishRef.current != null) {
        window.clearTimeout(pendingZoomPublishRef.current);
      }
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
    };
  }, []);

  const emitGlobeReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onGlobeReadyRef.current?.();
    notifyChange();
  }, [notifyChange]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setProjection({ type: "globe" });
    publishZoom(map.getZoom(), true);
    setMapLoaded(true);

    void ensureGemFacilityImages(map).catch(() => {
      /* 아이콘 로드 실패 시 circle 폴백 없음 — 재시도는 스타일 리로드 시 */
    });

    if (map.isStyleLoaded()) {
      emitGlobeReady();
      return;
    }

    map.once("idle", emitGlobeReady);
  }, [emitGlobeReady, publishZoom]);

  const resolveFeature = useCallback(
    (layerId: string, index: number) => {
      if (layerId === "map-points" || layerId === "map-gem-facilities") {
        return pointsData[index] ?? null;
      }
      if (layerId === "firms-flame") {
        return firmsFiresData[index] ?? null;
      }
      if (layerId === "map-paths") return deferredPathsData[index] ?? null;
      if (layerId === "map-polygons-fill") return polygonsData[index] ?? null;
      if (layerId === "map-rings") return ringsData[index] ?? null;
      return null;
    },
    [deferredPathsData, firmsFiresData, pointsData, polygonsData, ringsData],
  );

  const handleMapClick = useCallback(
    (event: { lngLat: { lat: number; lng: number }; features?: { layer?: { id?: string }; properties?: { index?: number } }[] }) => {
      const features = event.features ?? [];
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
        if (layerId === "map-paths") {
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
    [onGlobeClick, onPathClick, onPointClick, onPolygonClick, resolveFeature],
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
        if (layerId === "map-paths") {
          onPathHover?.(item);
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
    },
    [onPathHover, onPointHover, onPolygonHover, resolveFeature],
  );

  const handleMapMouseLeave = useCallback(() => {
    onGlobeMouseMoveRef.current?.(null);
    setHoveredIslandBaseId(null);
    onPointHover?.(null);
    onPathHover?.(null);
    onPolygonHover?.(null);
  }, [onPathHover, onPointHover, onPolygonHover]);

  useEffect(() => {
    if (!mapLoaded || firmsFiresData.length === 0) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    void ensureFirmsFireImages(map).catch(() => undefined);
  }, [firmsFiresData.length, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || firmsFiresData.length === 0) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
  }, [mapLoaded, mapStyleUrl]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const onStyle = () => {
      void ensureGemFacilityImages(map).catch(() => undefined);
      void ensureFirmsFireImages(map).catch(() => undefined);
    };
    map.on("style.load", onStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [mapLoaded, mapStyleUrl]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("moveend", notifyChange);
    return () => {
      map.off("moveend", notifyChange);
    };
  }, [mapLoaded, notifyChange]);

  const chinaChainsFc = useMemo(() => islandChainsChinaGeoJson(), []);
  const usLinesFc = useMemo(() => islandChainsUsGeoJson(), []);
  const basesFc = useMemo(() => islandChainsBasesGeoJson(), []);
  const taiwanPulseFc = useMemo(() => islandChainsTaiwanPulseGeoJson(), []);
  const radarFc = useMemo(
    () => islandChainsRadarGeoJson(showIslandChains ? hoveredIslandBaseId : null),
    [showIslandChains, hoveredIslandBaseId],
  );

  /** 중국 도련선 점선 흐름 + 대만 펄스 — 100ms (내장 GPU 친화) */
  useEffect(() => {
    if (!mapLoaded || !showIslandChains) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
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

  useEffect(() => {
    if (!showIslandChains) setHoveredIslandBaseId(null);
  }, [showIslandChains]);

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

  const initialCamera = globeViewToMapLibre({ lat: 25, lng: 105, altitude: 2.25 });

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: backgroundColor as string }}>
      <Map
        ref={mapRef}
        mapStyle={mapStyleUrl as string}
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
        /** 캔버스 공유/캡처(ShareViewButton)에서 toBlob·toDataURL로 실제 렌더링 결과를
         *  읽어야 하므로 필요 — 없으면 브라우저가 프레임마다 버퍼를 비워 캡처가 빈 화면이 됨.
         *  react-map-gl 타입에 없음 → MapLibre MapOptions로 전달 */
        {...({ preserveDrawingBuffer: true } as Record<string, unknown>)}
        interactiveLayerIds={interactiveLayerIds}
        onLoad={handleLoad}
        onMove={handleMove}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        cursor="grab"
      >
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
          <Source id="axis-hub-countries-source" type="geojson" data={axisHubCountriesGeoJson}>
            <Layer
              id="axis-hub-countries-fill"
              type="fill"
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "#dc2626"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.28],
              }}
            />
            <Layer
              id="axis-hub-countries-outline"
              type="line"
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "rgba(248,113,113,0.75)"],
                "line-width": 1.2,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {pathsGeoJson.features.length > 0 ? (
          <Source id="map-paths-source" type="geojson" data={pathsGeoJson}>
            <Layer
              id="map-paths"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": PATH_LINE_WIDTH_BY_ZOOM,
                "line-opacity": 0.92,
                "line-dasharray": [
                  "case",
                  [">", ["get", "dashLength"], 0],
                  ["literal", [2, 1.2]],
                  ["literal", [1, 0]],
                ],
              }}
            />
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
                "circle-stroke-width": 0.5,
                "circle-stroke-color": "rgba(2,4,10,0.55)",
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
            <Source id="island-chains-china-source" type="geojson" data={chinaChainsFc}>
              <Layer
                id="island-chains-china"
                type="line"
                paint={{
                  "line-color": ["coalesce", ["get", "color"], "#ef4444"],
                  "line-width": 2,
                  "line-opacity": 0.72,
                  "line-dasharray": [0, 4, 3],
                }}
              />
            </Source>
            <Source id="island-chains-us-source" type="geojson" data={usLinesFc}>
              <Layer
                id="island-chains-us-glow"
                type="line"
                paint={{
                  "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
                  "line-width": 7,
                  "line-opacity": 0.22,
                  "line-blur": 1.2,
                }}
              />
              <Layer
                id="island-chains-us"
                type="line"
                paint={{
                  "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
                  "line-width": 3.6,
                  "line-opacity": 0.92,
                }}
              />
            </Source>
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
                "text-halo-color": "rgba(2,4,10,0.75)",
                "text-halo-width": 1,
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

        {htmlElement
          ? htmlElementsData.map((item, index) => {
              const id =
                (item as { markerId?: string; id?: string }).markerId ??
                (item as { id?: string }).id ??
                index;
              const enriched =
                (item as { displayKind?: string }).displayKind === "ais-html"
                  ? { ...(item as object), mapBearingDeg }
                  : item;
              const rotation = htmlRotation(enriched);
              const alignment = htmlRotationAlignment(enriched);
              const rotKey =
                alignment === "map" ? Math.round((((rotation % 360) + 360) % 360) / 5) * 5 : 0;
              const surface =
                (enriched as { category?: string }).category === "military" &&
                ["destroyer", "frigate", "corvette", "cruiser", "submarine"].includes(
                  String((enriched as { militaryKind?: string }).militaryKind ?? ""),
                );
              const headingRaw = Number(
                (enriched as { courseOverGround?: number; trueHeading?: number })
                  .courseOverGround ??
                  (enriched as { trueHeading?: number }).trueHeading ??
                  0,
              );
              const relHeading = (((headingRaw - mapBearingDeg) % 360) + 360) % 360;
              const headingKey = surface
                ? String(Math.round(relHeading / 45) * 45)
                : alignment === "map"
                  ? String(rotKey)
                  : "0";
              const bearingKey = surface ? String(mapBearingDeg) : "0";
              return (
              <Marker
                key={`html-marker-${id}-r${rotKey}-b${bearingKey}-h${headingKey}`}
                longitude={htmlLng(item)}
                latitude={htmlLat(item)}
                anchor="center"
                rotation={rotation}
                rotationAlignment={alignment}
                pitchAlignment="viewport"
              >
                <div
                  ref={(node) => {
                    if (!node) return;
                    // killed/label 등이 바뀌면 DOM을 다시 그려 사망 숫자가 갱신되게 함
                    const typed = enriched as {
                      displayKind?: string;
                      killed?: number;
                      wounded?: number;
                      warheads?: number;
                      labelLanguage?: string;
                      killedLabel?: string;
                      mapBearingDeg?: number;
                      courseOverGround?: number | null;
                      trueHeading?: number | null;
                      militaryKind?: string | null;
                    };
                    const sig = [
                      typed.displayKind ?? "",
                      typed.killed ?? "",
                      typed.wounded ?? "",
                      typed.warheads ?? "",
                      typed.killedLabel ?? "",
                      typed.mapBearingDeg ?? "",
                      typed.courseOverGround ?? "",
                      typed.trueHeading ?? "",
                      typed.militaryKind ?? "",
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
          : null}
      </Map>
    </div>
  );
});

export { mapLibreZoomToAltitude };
