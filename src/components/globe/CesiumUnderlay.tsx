"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { getCesiumBaseUrl, getCesiumIonToken } from "@/lib/cesium/hybridFlags";
import { computeCesiumBlend } from "@/lib/cesium/maplibreCesiumBlend";
import { mapLibreViewToCesiumLookAt } from "@/lib/cesium/maplibreToCesiumCamera";

export type CesiumUnderlayProps = {
  map: MapLibreMap | null;
  /** When false, destroy viewer and stop syncing */
  enabled: boolean;
  /** Called whenever MapLibre opacity should change */
  onMapLibreOpacity?: (opacity: number) => void;
  /** WebGL context lost on MapLibre — tear down Cesium */
  forceOff?: boolean;
};

type CesiumModule = typeof import("cesium");
type CesiumViewer = import("cesium").Viewer;

/**
 * Cesium canvas under MapLibre — camera tracks MapLibre; fades in on zoom+pitch.
 * pointer-events: none. Lazy-imports `cesium` only after blend threshold.
 */
export function CesiumUnderlay({
  map,
  enabled,
  onMapLibreOpacity,
  forceOff = false,
}: CesiumUnderlayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const mountedRef = useRef(false);
  const buildingPromiseRef = useRef<Promise<void> | null>(null);
  const onOpacityRef = useRef(onMapLibreOpacity);
  onOpacityRef.current = onMapLibreOpacity;

  // Tear down when disabled / force off
  useEffect(() => {
    if (enabled && !forceOff) return;
    const v = viewerRef.current;
    viewerRef.current = null;
    mountedRef.current = false;
    buildingPromiseRef.current = null;
    try {
      v?.destroy();
    } catch {
      /* ignore */
    }
    onOpacityRef.current?.(1);
  }, [enabled, forceOff]);

  useEffect(() => {
    if (!map || !enabled || forceOff) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const readView = () => {
      const c = map.getCenter();
      return {
        longitude: c.lng,
        latitude: c.lat,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        viewportHeightPx: map.getContainer().clientHeight || 800,
      };
    };

    const applyBlendCss = () => {
      const blend = computeCesiumBlend(readView());
      onOpacityRef.current?.(blend.mapLibreOpacity);
      host.style.opacity = String(Math.min(1, blend.cesiumReveal * 1.05));
      return blend;
    };

    const syncCamera = () => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed()) return;
      const blend = applyBlendCss();
      viewer.scene.requestRenderMode = !blend.cesiumActive;
      if (!blend.cesiumActive) return;

      const look = mapLibreViewToCesiumLookAt(readView());
      const target = Cesium.Cartesian3.fromDegrees(
        look.longitude,
        look.latitude,
        look.height,
      );
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(target);
      viewer.camera.lookAtTransform(
        transform,
        new Cesium.HeadingPitchRange(look.headingRad, look.pitchRad, look.range),
      );
      viewer.scene.requestRender();
    };

    const ensureViewer = async () => {
      if (cancelled || viewerRef.current || buildingPromiseRef.current) return;
      buildingPromiseRef.current = (async () => {
        if (typeof window !== "undefined") {
          (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
            getCesiumBaseUrl();
        }
        const Cesium = await import("cesium");
        // CSS once
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        if (cancelled || !hostRef.current) return;
        cesiumRef.current = Cesium;

        const ion = getCesiumIonToken();
        if (ion) {
          Cesium.Ion.defaultAccessToken = ion;
        }

        const viewer = new Cesium.Viewer(hostRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          creditContainer: document.createElement("div"),
          requestRenderMode: true,
          maximumRenderTimeChange: Number.POSITIVE_INFINITY,
          orderIndependentTranslucency: false,
          contextOptions: {
            webgl: {
              alpha: true,
              antialias: true,
              preserveDrawingBuffer: false,
            },
          },
        });

        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0a121c");
        viewer.scene.fog.enabled = true;
        if (viewer.scene.moon) viewer.scene.moon.show = false;
        if (viewer.scene.skyBox) viewer.scene.skyBox.show = true;
        if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
        viewer.resolutionScale = Math.min(1, window.devicePixelRatio || 1);

        // Imagery / terrain
        viewer.imageryLayers.removeAll();
        if (ion) {
          try {
            viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
          } catch {
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
          }
          try {
            const osm = await Cesium.createOsmBuildingsAsync();
            viewer.scene.primitives.add(osm);
          } catch {
            /* buildings optional */
          }
          try {
            const worldImagery = await Cesium.createWorldImageryAsync();
            viewer.imageryLayers.addImageryProvider(worldImagery);
          } catch {
            try {
              const ionLayer = await Cesium.ImageryLayer.fromProviderAsync(
                Cesium.IonImageryProvider.fromAssetId(2),
              );
              viewer.imageryLayers.add(ionLayer);
            } catch {
              viewer.imageryLayers.addImageryProvider(
                new Cesium.UrlTemplateImageryProvider({
                  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                  maximumLevel: 19,
                }),
              );
            }
          }
        } else {
          viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
          viewer.imageryLayers.addImageryProvider(
            new Cesium.UrlTemplateImageryProvider({
              url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              maximumLevel: 19,
              credit: "Esri",
            }),
          );
        }

        if (cancelled) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;
        mountedRef.current = true;
        syncCamera();
      })().finally(() => {
        buildingPromiseRef.current = null;
      });

      await buildingPromiseRef.current;
    };

    const onMove = () => {
      const blend = applyBlendCss();
      if (blend.shouldMountCesium) {
        void ensureViewer().then(() => {
          if (!cancelled) syncCamera();
        });
      } else if (viewerRef.current) {
        syncCamera();
      }
    };

    applyBlendCss();
    onMove();

    map.on("move", onMove);
    map.on("resize", onMove);

    resizeObserver = new ResizeObserver(() => {
      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        v.resize();
        syncCamera();
      }
    });
    resizeObserver.observe(host);

    return () => {
      cancelled = true;
      map.off("move", onMove);
      map.off("resize", onMove);
      resizeObserver?.disconnect();
      const v = viewerRef.current;
      viewerRef.current = null;
      mountedRef.current = false;
      try {
        v?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [map, enabled, forceOff]);

  if (!enabled || forceOff) return null;

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden [&_.cesium-viewer]:!h-full [&_.cesium-viewer]:!w-full [&_.cesium-viewer]:!m-0 [&_.cesium-widget]:!h-full [&_.cesium-widget]:!w-full [&_.cesium-widget_canvas]:!h-full [&_.cesium-widget_canvas]:!w-full [&_.cesium-viewer-bottom]:!hidden [&_.cesium-credit-logoContainer]:!hidden [&_.cesium-credit-enlarge]:!hidden"
      aria-hidden
      data-cesium-underlay
      style={{ opacity: 0 }}
    />
  );
}
