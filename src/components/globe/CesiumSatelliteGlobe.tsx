"use client";

/**
 * 위성 모드 글로브 — God's Eye View 키리스 경로와 동일한 스택.
 * Esri World Imagery + (Ion 있으면) World Terrain / Google Photorealistic 3D Tiles.
 * @see https://github.com/bilawalsidhu/gods-eye-view
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";
import { aisCommercialPointColor, aisMilitaryMapPointColor } from "@/lib/aisVesselClass";
import { classifyMilAircraft } from "@/lib/milAircraftKind";
import { milAircraftIconSvg } from "@/lib/milAircraftIcon";
import type { AircraftPalette } from "@/lib/milAircraftSymbols";

const ESRI_WORLD_IMAGERY =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
const KEYLESS_TERRAIN =
  "https://terrain.reearth.land/cesium-mesh/ellipsoid";
/** Cesium ion — Google Photorealistic 3D Tiles (개인/비상업 Community 토큰) */
const ION_GOOGLE_PHOTOREAL_ASSET = 2275207;
const ION_WORLD_TERRAIN_ASSET = 1;

/**
 * globe.gl altitude(=cameraDistance/100-1, 지구 반지름 단위) ↔ Cesium 높이(m) 변환.
 * MapLibre 쪽 `globeCamera.ts`의 단위 관례와 맞춘다 — flyTo(lat,lng,altitude,...)
 * 호출부가 모드와 무관하게 같은 altitude 숫자를 넘길 수 있게 하기 위함.
 */
const EARTH_RADIUS_M = 6_371_000;
function altitudeToHeightM(altitude: number): number {
  const a = Number.isFinite(altitude) ? Math.max(0.02, altitude) : 1;
  return a * EARTH_RADIUS_M;
}

export type CesiumEntitySelection =
  | { kind: "ais"; item: AisVessel }
  | { kind: "mil"; item: MilitaryAircraft; traffic: "military" | "civil" };

/** GlobeDashboard가 관측(Cesium) 모드에서 카메라를 조작하기 위한 최소 핸들 */
export type CesiumGlobeHandle = {
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: { pitch?: number; bearing?: number },
  ) => void;
};

export type CesiumSatelliteGlobeProps = {
  className?: string;
  /** 초기 카메라 (고도 m) */
  initial?: { lat: number; lng: number; heightM?: number };
  /** 항적(AIS/ADS-B) — MapLibre에서 제거하고 관측(Cesium)으로 일원화 */
  aisVessels?: AisVessel[];
  disguisedVessels?: AisVessel[];
  milAircraft?: MilitaryAircraft[];
  civAircraft?: MilitaryAircraft[];
  showAis?: boolean;
  /** AIS 군함만 표시 — showAis 켜져 있을 때의 세부 필터 */
  showAisMilitary?: boolean;
  /** AIS 상선·민간만 표시 — showAis 켜져 있을 때의 세부 필터 */
  showAisCommercial?: boolean;
  showDisguisedVessels?: boolean;
  showMilitaryActivity?: boolean;
  showAirTraffic?: boolean;
  /** viewer가 준비되어 flyTo를 받을 수 있게 된 시점 — 관측 모드 전환 후 flyTo 대기에 사용 */
  onReady?: () => void;
  /** 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용 */
  onSelectEntity?: (selection: CesiumEntitySelection) => void;
};

type StackKind = "esri" | "photoreal";
type ErrorKind = "chunk" | "assets" | "other";

const CHUNK_RELOAD_KEY = "cesium-chunk-reload";

function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name || "";
  const msg = err.message || "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

function isCesiumAssetsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message || "";
  return (
    /\/cesium\//i.test(msg) ||
    /CESIUM_BASE_URL/i.test(msg) ||
    /Workers\//i.test(msg)
  );
}

/**
 * 점 엔티티 그룹을 prefix로 diff-sync — 매 폴링마다 add/remove 대신
 * 기존 엔티티는 위치·색만 갱신하고, 사라진 것만 지운다.
 * 지구 반대편은 EllipsoidalOccluder로 숨긴다 (투명 비침 방지).
 */
function syncPointEntities<T>(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  prefix: string,
  items: T[],
  opts: {
    getId: (item: T) => string;
    getLat: (item: T) => number;
    getLng: (item: T) => number;
    getHeightM: (item: T) => number;
    getColor: (item: T) => string;
    pixelSize: number;
    getName: (item: T) => string;
  },
): void {
  const seen = new Set<string>();
  const outlineColor = Cesium.Color.fromCssColorString("rgba(6, 10, 22, 0.85)");
  const occluder = new Cesium.EllipsoidalOccluder(
    viewer.scene.globe.ellipsoid,
    viewer.camera.positionWC,
  );

  for (const item of items) {
    const lat = opts.getLat(item);
    const lng = opts.getLng(item);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const id = `${prefix}:${opts.getId(item)}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, opts.getHeightM(item));
    const visible = occluder.isPointVisible(position);
    let color: import("cesium").Color;
    try {
      color = Cesium.Color.fromCssColorString(opts.getColor(item));
    } catch {
      color = Cesium.Color.LIGHTGRAY;
    }

    const existing = viewer.entities.getById(id);
    if (existing) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.show = visible;
      if (existing.point) {
        existing.point.color = new Cesium.ConstantProperty(color);
        // 예전 Infinity 설정이 남아 있으면 반대편이 비침 — 매 갱신마다 깊이 테스트 강제
        existing.point.disableDepthTestDistance = new Cesium.ConstantProperty(0);
      }
      existing.name = opts.getName(item);
      continue;
    }

    viewer.entities.add({
      id,
      name: opts.getName(item),
      position,
      show: visible,
      point: new Cesium.PointGraphics({
        pixelSize: opts.pixelSize,
        color,
        outlineColor,
        outlineWidth: 1,
        // 0 = 항상 지구/지형에 가려짐 (Infinity면 반대편까지 비침)
        disableDepthTestDistance: 0,
      }),
    });
  }

  const toRemove: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (typeof entity.id === "string" && entity.id.startsWith(`${prefix}:`) && !seen.has(entity.id)) {
      toRemove.push(entity);
    }
  }
  for (const entity of toRemove) {
    viewer.entities.remove(entity);
  }
}

/** Cesium 항공기 빌보드 — MapLibre 실루엣과 동일 SVG, 군용=현행 팔레트·민간=초록. */
const CESIUM_AIRCRAFT_SIZE = { mil: 26, civ: 22 } as const;
const aircraftBillboardUriCache = new Map<string, string>();

function aircraftHeadingDeg(aircraft: MilitaryAircraft): number | null {
  const raw = aircraft.track ?? aircraft.trueHeading ?? aircraft.magHeading;
  if (raw == null || !Number.isFinite(raw)) return null;
  return ((raw % 360) + 360) % 360;
}

function cesiumAircraftBillboardUri(
  aircraft: MilitaryAircraft,
  palette: AircraftPalette,
): string {
  const role =
    palette === "civil" ? ("transport" as const) : classifyMilAircraft(aircraft).role;
  const px = palette === "civil" ? CESIUM_AIRCRAFT_SIZE.civ : CESIUM_AIRCRAFT_SIZE.mil;
  const key = `${palette}:${role}:${px}`;
  const cached = aircraftBillboardUriCache.get(key);
  if (cached) return cached;
  const svg = milAircraftIconSvg(role, { width: px, height: px }, { palette });
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  aircraftBillboardUriCache.set(key, uri);
  return uri;
}

function syncAircraftBillboardEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  prefix: "mil" | "civ",
  items: MilitaryAircraft[],
  palette: AircraftPalette,
): void {
  const seen = new Set<string>();
  const sizePx = palette === "civil" ? CESIUM_AIRCRAFT_SIZE.civ : CESIUM_AIRCRAFT_SIZE.mil;
  const occluder = new Cesium.EllipsoidalOccluder(
    viewer.scene.globe.ellipsoid,
    viewer.camera.positionWC,
  );

  for (const item of items) {
    const lat = item.lat;
    const lng = item.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const id = `${prefix}:${item.hex || item.id}`;
    seen.add(id);
    const heightM = (item.altitudeGeom ?? item.altitude ?? 10_000) * 0.3048;
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, heightM);
    const visible = occluder.isPointVisible(position);
    const heading = aircraftHeadingDeg(item);
    // SVG 코=+Y(북). Cesium billboard.rotation은 북 기준 반시계(rad).
    const rotation =
      heading == null
        ? Cesium.Math.toRadians(-18)
        : -Cesium.Math.toRadians(heading);
    const image = cesiumAircraftBillboardUri(item, palette);
    const name = item.callsign || item.registration || item.hex;

    const existing = viewer.entities.getById(id);
    if (existing) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = name;
      existing.show = visible;
      if (existing.point) {
        existing.point = undefined;
      }
      if (existing.billboard) {
        existing.billboard.image = new Cesium.ConstantProperty(image);
        existing.billboard.rotation = new Cesium.ConstantProperty(rotation);
        existing.billboard.width = new Cesium.ConstantProperty(sizePx);
        existing.billboard.height = new Cesium.ConstantProperty(sizePx);
        existing.billboard.color = new Cesium.ConstantProperty(
          Cesium.Color.WHITE.withAlpha(heading == null ? 0.82 : 1),
        );
        existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(0);
      } else {
        existing.billboard = new Cesium.BillboardGraphics({
          image,
          width: sizePx,
          height: sizePx,
          rotation,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: 0,
          color: Cesium.Color.WHITE.withAlpha(heading == null ? 0.82 : 1),
        });
      }
      continue;
    }

    viewer.entities.add({
      id,
      name,
      position,
      show: visible,
      billboard: new Cesium.BillboardGraphics({
        image,
        width: sizePx,
        height: sizePx,
        rotation,
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: 0,
        color: Cesium.Color.WHITE.withAlpha(heading == null ? 0.82 : 1),
      }),
    });
  }

  const toRemove: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith(`${prefix}:`) &&
      !seen.has(entity.id)
    ) {
      toRemove.push(entity);
    }
  }
  for (const entity of toRemove) {
    viewer.entities.remove(entity);
  }
}

export const CesiumSatelliteGlobe = forwardRef<CesiumGlobeHandle, CesiumSatelliteGlobeProps>(
  function CesiumSatelliteGlobe(
    {
      className = "",
      initial = { lat: 30, lng: 40, heightM: 12_000_000 },
      aisVessels = [],
      disguisedVessels = [],
      milAircraft = [],
      civAircraft = [],
      showAis = false,
      showAisMilitary = true,
      showAisCommercial = true,
      showDisguisedVessels = false,
      showMilitaryActivity = false,
      showAirTraffic = false,
      onReady,
      onSelectEntity,
    },
    ref,
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [stack, setStack] = useState<StackKind>("esri");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>("other");
  // 마운트 이펙트에서 만든 viewer/Cesium 모듈 — 엔티티 동기화 이펙트에서 재사용
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumModRef = useRef<typeof import("cesium") | null>(null);
  const clickHandlerRef = useRef<import("cesium").ScreenSpaceEventHandler | null>(null);

  // 클릭 핸들러가 매 폴링마다 재등록되지 않도록 최신 데이터를 ref로 보관
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onSelectEntityRef = useRef(onSelectEntity);
  onSelectEntityRef.current = onSelectEntity;
  const aisVesselsRef = useRef(aisVessels);
  aisVesselsRef.current = aisVessels;
  const disguisedVesselsRef = useRef(disguisedVessels);
  disguisedVesselsRef.current = disguisedVessels;
  const milAircraftRef = useRef(milAircraft);
  milAircraftRef.current = milAircraft;
  const civAircraftRef = useRef(civAircraft);
  civAircraftRef.current = civAircraft;

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (lat, lng, altitude, durationMs, camera) => {
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return;
        const heightM = altitudeToHeightM(altitude ?? 0.55);
        const orientation = {
          heading: Cesium.Math.toRadians(camera?.bearing ?? 0),
          pitch: Cesium.Math.toRadians((camera?.pitch ?? 0) - 90),
          roll: 0,
        };
        const destination = Cesium.Cartesian3.fromDegrees(lng, lat, heightM);
        if (!durationMs || durationMs <= 0) {
          viewer.camera.setView({ destination, orientation });
        } else {
          viewer.camera.flyTo({ destination, orientation, duration: durationMs / 1000 });
        }
      },
    }),
    [],
  );

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

        // 배포 URL·SW 꼬임 시 ChunkLoadError가 나기 쉬워 한 번 재시도
        let Cesium: typeof import("cesium");
        try {
          Cesium = await import("cesium");
          await import("cesium/Build/Cesium/Widgets/widgets.css");
        } catch (firstErr) {
          if (!isChunkLoadError(firstErr)) throw firstErr;
          await new Promise((r) => window.setTimeout(r, 800));
          Cesium = await import("cesium");
          await import("cesium/Build/Cesium/Widgets/widgets.css");
        }

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
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }
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

        // 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용.
        // prefix(ais:/disguised:/mil:/civ:)로 어느 배열에서 찾을지 판단한다.
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction((movement: { position: import("cesium").Cartesian2 }) => {
          const v = viewerRef.current;
          if (!v || v.isDestroyed()) return;
          const picked = v.scene.pick(movement.position);
          const rawId = picked?.id;
          const entityId: string | undefined =
            typeof rawId === "string"
              ? rawId
              : rawId && typeof rawId.id === "string"
                ? rawId.id
                : undefined;
          if (!entityId) return;
          const sep = entityId.indexOf(":");
          if (sep < 0) return;
          const prefix = entityId.slice(0, sep);
          const key = entityId.slice(sep + 1);

          if (prefix === "ais" || prefix === "disguised") {
            const pool = prefix === "ais" ? aisVesselsRef.current : disguisedVesselsRef.current;
            const vessel = pool.find((x) => x.mmsi === key || x.id === key);
            if (vessel) onSelectEntityRef.current?.({ kind: "ais", item: vessel });
            return;
          }
          if (prefix === "mil" || prefix === "civ") {
            const pool = prefix === "mil" ? milAircraftRef.current : civAircraftRef.current;
            const aircraft = pool.find((x) => x.hex === key || x.id === key);
            if (aircraft) {
              onSelectEntityRef.current?.({
                kind: "mil",
                item: aircraft,
                traffic: prefix === "civ" ? "civil" : "military",
              });
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        clickHandlerRef.current = handler;

        if (!cancelled) {
          try {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
          } catch {
            /* ignore */
          }
          viewerRef.current = viewer;
          cesiumModRef.current = Cesium;
          setStatus("ready");
          onReadyRef.current?.();
        }
      } catch (err) {
        console.error("[CesiumSatelliteGlobe]", err);
        if (cancelled) return;

        if (isChunkLoadError(err) && typeof window !== "undefined") {
          try {
            if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
              sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
              window.location.reload();
              return;
            }
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
          } catch {
            /* private mode / blocked storage */
          }
        } else if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
          } catch {
            /* ignore */
          }
        }

        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Cesium failed");
        setErrorKind(
          isChunkLoadError(err)
            ? "chunk"
            : isCesiumAssetsError(err)
              ? "assets"
              : "other",
        );
      }
    })();

    return () => {
      cancelled = true;
      viewerRef.current = null;
      cesiumModRef.current = null;
      try {
        clickHandlerRef.current?.destroy();
      } catch {
        /* already destroyed */
      }
      clickHandlerRef.current = null;
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

  /**
   * AIS/ADS-B 라이브 엔티티 동기화 — MapLibre 심볼 레이어를 대체.
   * viewer.entities를 prefix(ais:/disguised:/mil:/civ:)별로 diff해서
   * 매 폴링마다 전체 재생성하지 않고 위치/색만 갱신한다.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    // 군함/상선 세부 필터 — showAisMilitary·showAisCommercial. "other" 카테고리는
    // aisMilitaryMapPointColor 색 배정과 동일하게 상선(민간) 쪽으로 취급한다.
    const aisFiltered = showAis
      ? aisVessels.filter((v) => (v.category === "military" ? showAisMilitary : showAisCommercial))
      : [];
    syncPointEntities(Cesium, viewer, "ais", aisFiltered, {
      getId: (v: AisVessel) => v.mmsi,
      getLat: (v: AisVessel) => v.lat,
      getLng: (v: AisVessel) => v.lng,
      // 수면 살짝 위 — 지구와 z-fight 줄이면서 반대편 가림은 유지
      getHeightM: () => 80,
      getColor: (v: AisVessel) =>
        v.category === "military" ? aisMilitaryMapPointColor() : aisCommercialPointColor(v.shipType),
      pixelSize: 6,
      getName: (v: AisVessel) => v.shipName || v.mmsi,
    });

    syncPointEntities(
      Cesium,
      viewer,
      "disguised",
      showDisguisedVessels ? disguisedVessels : [],
      {
        getId: (v: AisVessel) => v.mmsi,
        getLat: (v: AisVessel) => v.lat,
        getLng: (v: AisVessel) => v.lng,
        getHeightM: () => 100,
        getColor: () => "#f43f5e",
        pixelSize: 8,
        getName: (v: AisVessel) => v.shipName || v.mmsi,
      },
    );

    syncAircraftBillboardEntities(
      Cesium,
      viewer,
      "mil",
      showMilitaryActivity ? milAircraft : [],
      "military",
    );
    syncAircraftBillboardEntities(
      Cesium,
      viewer,
      "civ",
      showAirTraffic ? civAircraft : [],
      "civil",
    );
  }, [
    status,
    aisVessels,
    disguisedVessels,
    milAircraft,
    civAircraft,
    showAis,
    showAisMilitary,
    showAisCommercial,
    showDisguisedVessels,
    showMilitaryActivity,
    showAirTraffic,
  ]);

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
            {errorKind === "chunk" ? (
              <div className="mt-3 space-y-3">
                <p className="max-w-md text-xs text-sky-100/50">
                  배포 직후 청크 불일치이거나,{" "}
                  <code className="text-sky-200/80">*.vercel.app</code> 배포 URL이
                  로그인 HTML을 돌려줄 때 납니다. 프로덕션 도메인으로 열어 주세요.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-sky-200/30 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/25"
                    onClick={() => {
                      try {
                        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                      } catch {
                        /* ignore */
                      }
                      const url = new URL(window.location.href);
                      url.searchParams.set("_chunk", String(Date.now()));
                      window.location.replace(url.toString());
                    }}
                  >
                    강제 새로고침
                  </button>
                  <a
                    href="https://conflict-view.vercel.app/"
                    className="rounded-md border border-emerald-200/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25"
                  >
                    프로덕션 열기
                  </a>
                </div>
              </div>
            ) : errorKind === "assets" ? (
              <p className="mt-3 max-w-md text-xs text-sky-100/50">
                Run <code className="text-sky-200/80">npm run cesium:assets</code>{" "}
                so <code className="text-sky-200/80">public/cesium</code> exists.
              </p>
            ) : (
              <p className="mt-3 max-w-md text-xs text-sky-100/50">
                잠시 후 다시 시도하거나 페이지를 새로고침해 주세요.
              </p>
            )}
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
  },
);
