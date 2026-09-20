"use client";

/**
 * 위성 모드 글로브 — God's Eye View 키리스 경로와 동일한 스택.
 * Esri World Imagery + (Ion 있으면) World Terrain / Google Photorealistic 3D Tiles.
 * @see https://github.com/bilawalsidhu/gods-eye-view
 */

import { useEffect, useRef, useState } from "react";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";

const ESRI_WORLD_IMAGERY =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
const KEYLESS_TERRAIN =
  "https://terrain.reearth.land/cesium-mesh/ellipsoid";
/** Cesium ion — Google Photorealistic 3D Tiles (개인/비상업 Community 토큰) */
const ION_GOOGLE_PHOTOREAL_ASSET = 2275207;
const ION_WORLD_TERRAIN_ASSET = 1;

export type CesiumSatelliteGlobeProps = {
  className?: string;
  /** 초기 카메라 (고도 m) */
  initial?: { lat: number; lng: number; heightM?: number };
};

type StackKind = "esri" | "photoreal";

export function CesiumSatelliteGlobe({
  className = "",
  initial = { lat: 30, lng: 40, heightM: 12_000_000 },
}: CesiumSatelliteGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [stack, setStack] = useState<StackKind>("esri");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const creditContainer = creditRef.current;
    if (!container || !creditContainer) return;

    let cancelled = false;
    let viewer: import("cesium").Viewer | null = null;

    (async () => {
      try {
        if (typeof window !== "undefined") {
          (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
            "/cesium/";
        }

        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        if (cancelled) return;

        const ionToken = getRuntimeConfig().cesiumIonToken?.trim() || "";
        if (ionToken) {
          Cesium.Ion.defaultAccessToken = ionToken;
        }

        viewer = new Cesium.Viewer(container, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          vrButton: false,
          selectionIndicator: false,
          infoBox: false,
          baseLayer: false,
          creditContainer,
          msaaSamples: 4,
          contextOptions: { webgl: { preserveDrawingBuffer: true } },
        });

        viewer.targetFrameRate = 60;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.globe.enableLighting = false;

        let usedPhotoreal = false;
        if (ionToken) {
          try {
            const resource = await Cesium.IonResource.fromAssetId(
              ION_GOOGLE_PHOTOREAL_ASSET,
              { accessToken: ionToken },
            );
            const tileset = await Cesium.Cesium3DTileset.fromUrl(resource, {
              maximumScreenSpaceError: 16,
            });
            if (cancelled) {
              viewer.destroy();
              return;
            }
            viewer.scene.primitives.add(tileset);
            viewer.scene.globe.show = false;
            usedPhotoreal = true;
            setStack("photoreal");
          } catch (err) {
            console.warn(
              "[CesiumSatelliteGlobe] Photorealistic 3D unavailable, Esri imagery:",
              err,
            );
          }
        }

        if (!usedPhotoreal) {
          viewer.scene.globe.show = true;
          const imagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            ESRI_WORLD_IMAGERY,
            {
              enablePickFeatures: false,
              credit:
                "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
            },
          );
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(imagery);

          try {
            if (ionToken) {
              const terrainRes = await Cesium.IonResource.fromAssetId(
                ION_WORLD_TERRAIN_ASSET,
                { accessToken: ionToken },
              );
              viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                terrainRes,
                {
                  requestVertexNormals: true,
                  requestWaterMask: false,
                },
              );
            } else {
              viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                KEYLESS_TERRAIN,
              );
            }
          } catch (err) {
            console.warn("[CesiumSatelliteGlobe] terrain fallback:", err);
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
          }
          setStack("esri");
        }

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            initial.lng,
            initial.lat,
            initial.heightM ?? 12_000_000,
          ),
        });

        if (!cancelled) setStatus("ready");
      } catch (err) {
        console.error("[CesiumSatelliteGlobe]", err);
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Cesium failed");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewer?.destroy();
      } catch {
        /* already destroyed */
      }
      viewer = null;
    };
    // initial lat/lng only for first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative h-full w-full bg-[#02040a] ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={creditRef}
        className="pointer-events-none absolute bottom-1 right-2 z-20 max-w-[min(28rem,70vw)] text-micro leading-tight text-sky-100/70 [&_a]:text-sky-200/90"
      />

      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#02040a]/70">
          <p className="text-sm font-medium tracking-wide text-sky-100/80">
            Loading satellite globe…
          </p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#02040a] p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-rose-200">
              Cesium globe failed to start
            </p>
            <p className="mt-2 max-w-md text-xs text-sky-100/60">{errorMsg}</p>
            <p className="mt-3 max-w-md text-xs text-sky-100/50">
              Run <code className="text-sky-200/80">npm run cesium:assets</code>{" "}
              so <code className="text-sky-200/80">public/cesium</code> exists.
            </p>
          </div>
        </div>
      ) : null}

      {status === "ready" ? (
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-sky-200/20 bg-[#0f1d35]/75 px-2.5 py-1.5 backdrop-blur-sm">
          <p className="text-micro font-semibold uppercase tracking-wider text-sky-100/90">
            Observe · Cesium
          </p>
          <p className="mt-0.5 text-micro text-sky-100/55">
            {stack === "photoreal"
              ? "Cesium ion · Google Photorealistic 3D"
              : "Esri World Imagery · CesiumJS"}
            {" · "}
            sources attributed below
          </p>
        </div>
      ) : null}
    </div>
  );
}
