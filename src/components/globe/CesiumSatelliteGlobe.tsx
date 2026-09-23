"use client";

/**
 * 위성 모드 글로브 — God's Eye View 키리스 경로와 동일한 스택.
 * Esri World Imagery + (Ion 있으면) World Terrain / Google Photorealistic 3D Tiles.
 * @see https://github.com/bilawalsidhu/gods-eye-view
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  AXIS_HUB_BORDER_COLOR,
  axisHubBorderWidthPx,
  collectAxisHubBorderRings,
  type LngLatRing,
} from "@/lib/axisHubCountryPolygons";
import { fetchDataWithFallback } from "@/lib/dataProfile";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";
import { SHADOW_FLEET_MARKER_SIZE } from "@/data/shadowFleetSilhouette";
import { SUBMARINE_PROFILE_SIZE } from "@/data/submarineSilhouette";
import { SURFACE_COMBATANT_PROFILE_SIZE } from "@/data/surfaceCombatantSilhouette";
import { CARRIER_MARKER_ICON_SIZE } from "@/data/usCarrierDeckSilhouette";
import {
  aisCommercialPointColor,
  AIS_SURFACE_COMBATANT_FILL,
  usesSurfaceCombatantDeckIcon,
} from "@/lib/aisVesselClass";
import { aisShipIconSvg, aisVesselHeadingDeg } from "@/lib/aisVesselMarkers";
import { classifyMilAircraft } from "@/lib/milAircraftKind";
import { milAircraftIconSvg } from "@/lib/milAircraftIcon";
import type { AircraftPalette } from "@/lib/milAircraftSymbols";
import {
  shadowFleetFacingFromRelativeHeading,
  shadowFleetIconSvg,
  shadowFleetRelativeHeading,
} from "@/lib/shadowFleetDeckIcon";
import {
  submarineFacingFromRelativeHeading,
  submarineProfileIconSvg,
} from "@/lib/submarineDeckIcon";
import {
  surfaceCombatantFacingFromRelativeHeading,
  surfaceCombatantRelativeHeading,
  warshipProfileIconSvg,
} from "@/lib/surfaceCombatantDeckIcon";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";
import type { CesiumAlertItem, CesiumAlertKind } from "@/lib/cesiumAlerts";

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
  /** 세슘 알림창과 같은 경보 핀 (UKMTO·NAVAREA·초크·훈련·게이트·항로) */
  alertPins?: CesiumAlertItem[];
  onSelectAlert?: (item: CesiumAlertItem) => void;
  /** viewer가 준비되어 flyTo를 받을 수 있게 된 시점 — 관측 모드 전환 후 flyTo 대기에 사용 */
  onReady?: () => void;
  /** 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용 */
  onSelectEntity?: (selection: CesiumEntitySelection) => void;
};

type StackKind = "esri" | "photoreal";
type ErrorKind = "chunk" | "assets" | "other";

const CHUNK_RELOAD_KEY = "cesium-chunk-reload";

const ALERT_PIN_COLOR: Record<CesiumAlertKind, string> = {
  ukmto: "#e4e4e7",
  navarea: "#c084fc",
  portwatch: "#f59e0b",
  exercise: "#22d3ee",
  "ais-gate": "#38bdf8",
  "dark-fleet": "#fb7185",
  route: "#a3e635",
};

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

type GlobeOccluder = {
  isPointVisible: (point: import("cesium").Cartesian3) => boolean;
};

/** Cesium 런타임에 있으나 public typings에 빠져 있는 EllipsoidalOccluder. */
function createGlobeOccluder(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
): GlobeOccluder {
  const Ctor = (Cesium as unknown as {
    EllipsoidalOccluder: new (
      ellipsoid: import("cesium").Ellipsoid,
      cameraPosition: import("cesium").Cartesian3,
    ) => GlobeOccluder;
  }).EllipsoidalOccluder;
  return new Ctor(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
}

/** Cesium 항공기 빌보드 — MapLibre 실루엣과 동일 SVG, 군용=현행 팔레트·민간=초록. */
const CESIUM_AIRCRAFT_SIZE = { mil: 26, civ: 22 } as const;
const aircraftBillboardUriCache = new Map<string, string>();
const aisBillboardUriCache = new Map<string, string>();
/** 궤도·위성 줌에서도 선박이 읽히게 — MapLibre 22px보다 키움 */
const CESIUM_AIS_GENERIC_PX = 36;
/** 해수면 마커를 지형/3D Tiles에 묻히지 않게 띄움 (m) */
const CESIUM_AIS_HEIGHT_M = 1_200;
/** depth test 끄면 지구 뒤편도 뚫고 보이므로, 가시 반구만 Infinity */
const CESIUM_AIS_NO_DEPTH = Number.POSITIVE_INFINITY;

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

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** MapLibre aisVesselSymbols와 동일 실루엣 — Cesium billboard용. */
function cesiumAisBillboard(
  vessel: AisVessel,
  mapBearingDeg: number,
): { image: string; width: number; height: number; rotation: number } {
  const military = vessel.category === "military";
  const disguised = Boolean(vessel.disguised);
  const surface = !disguised && military && usesSurfaceCombatantDeckIcon(vessel.militaryKind);
  const submarine = !disguised && military && vessel.militaryKind === "submarine";
  const carrier = !disguised && military && vessel.militaryKind === "carrier";
  const aspectHull = disguised || surface || submarine;
  const heading = aisVesselHeadingDeg(vessel, {
    allowStationaryHeading: aspectHull || carrier,
  });

  if (aspectHull) {
    const relative = disguised
      ? shadowFleetRelativeHeading(heading ?? 0, mapBearingDeg)
      : surfaceCombatantRelativeHeading(heading ?? 0, mapBearingDeg);
    const facing = disguised
      ? shadowFleetFacingFromRelativeHeading(relative)
      : submarine
        ? submarineFacingFromRelativeHeading(relative)
        : surfaceCombatantFacingFromRelativeHeading(relative);
    if (disguised) {
      const size = SHADOW_FLEET_MARKER_SIZE;
      const key = `shadow:${facing}`;
      let image = aisBillboardUriCache.get(key);
      if (!image) {
        image = svgDataUri(shadowFleetIconSvg("#c45c5c", size, facing));
        aisBillboardUriCache.set(key, image);
      }
      return { image, width: size.width * 0.45, height: size.height * 0.45, rotation: 0 };
    }
    if (submarine) {
      const size = SUBMARINE_PROFILE_SIZE;
      const key = `sub:${facing}`;
      let image = aisBillboardUriCache.get(key);
      if (!image) {
        image = svgDataUri(
          submarineProfileIconSvg(AIS_SURFACE_COMBATANT_FILL, size, facing),
        );
        aisBillboardUriCache.set(key, image);
      }
      return { image, width: size.width * 0.55, height: size.height * 0.55, rotation: 0 };
    }
    const size = SURFACE_COMBATANT_PROFILE_SIZE;
    const key = `surface:${facing}`;
    let image = aisBillboardUriCache.get(key);
    if (!image) {
      image = svgDataUri(
        warshipProfileIconSvg(AIS_SURFACE_COMBATANT_FILL, size, facing),
      );
      aisBillboardUriCache.set(key, image);
    }
    return { image, width: size.width * 0.5, height: size.height * 0.5, rotation: 0 };
  }

  if (carrier) {
    const size = CARRIER_MARKER_ICON_SIZE;
    const key = "carrier";
    let image = aisBillboardUriCache.get(key);
    if (!image) {
      image = svgDataUri(carrierDeckIconSvg(size, AIS_SURFACE_COMBATANT_FILL));
      aisBillboardUriCache.set(key, image);
    }
    const rotation =
      heading == null ? 0 : -((heading * Math.PI) / 180);
    return {
      image,
      width: size.width * 0.45,
      height: size.height * 0.45,
      rotation,
    };
  }

  const color = military
    ? AIS_SURFACE_COMBATANT_FILL
    : (aisCommercialPointColor(vessel.shipType).replace(/[\d.]+\)$/, "0.98)") ||
      aisCommercialPointColor(vessel.shipType));
  const px = CESIUM_AIS_GENERIC_PX;
  const key = `generic:${military ? "mil" : color}:${px}`;
  let image = aisBillboardUriCache.get(key);
  if (!image) {
    image = svgDataUri(aisShipIconSvg(color, px, military));
    aisBillboardUriCache.set(key, image);
  }
  const rotation =
    heading == null ? -((18 * Math.PI) / 180) : -((heading * Math.PI) / 180);
  return { image, width: px, height: px, rotation };
}

function syncAisBillboardEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  prefix: "ais" | "disguised",
  items: AisVessel[],
): void {
  const seen = new Set<string>();
  const mapBearingDeg =
    ((Cesium.Math.toDegrees(viewer.camera.heading) % 360) + 360) % 360;
  const heightM = prefix === "disguised" ? CESIUM_AIS_HEIGHT_M + 200 : CESIUM_AIS_HEIGHT_M;
  const scaleByDistance = new Cesium.NearFarScalar(2.0e5, 1.35, 1.6e7, 0.55);

  for (const item of items) {
    const lat = item.lat;
    const lng = item.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const id = `${prefix}:${item.mmsi}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, heightM);
    const billboard = cesiumAisBillboard(item, mapBearingDeg);
    const name = item.shipName || item.mmsi;

    const existing = viewer.entities.getById(id);
    if (existing) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = name;
      // 가시성(지구 뒤편)은 preRender 훅에서 매 프레임 갱신
      existing.show = true;
      if (existing.point) existing.point = undefined;
      if (existing.billboard) {
        existing.billboard.image = new Cesium.ConstantProperty(billboard.image);
        existing.billboard.width = new Cesium.ConstantProperty(billboard.width);
        existing.billboard.height = new Cesium.ConstantProperty(billboard.height);
        existing.billboard.rotation = new Cesium.ConstantProperty(billboard.rotation);
        existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(
          CESIUM_AIS_NO_DEPTH,
        );
        existing.billboard.scaleByDistance = new Cesium.ConstantProperty(scaleByDistance);
        existing.billboard.color = new Cesium.ConstantProperty(Cesium.Color.WHITE);
      } else {
        existing.billboard = new Cesium.BillboardGraphics({
          image: billboard.image,
          width: billboard.width,
          height: billboard.height,
          rotation: billboard.rotation,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: CESIUM_AIS_NO_DEPTH,
          scaleByDistance,
          color: Cesium.Color.WHITE,
        });
      }
      continue;
    }

    viewer.entities.add({
      id,
      name,
      position,
      show: true,
      billboard: new Cesium.BillboardGraphics({
        image: billboard.image,
        width: billboard.width,
        height: billboard.height,
        rotation: billboard.rotation,
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: CESIUM_AIS_NO_DEPTH,
        scaleByDistance,
        color: Cesium.Color.WHITE,
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

/** 카메라가 돌 때마다 지구 뒤편 AIS를 숨김 — 폴링 때만 갱신하면 반대편 바다가 비어 보임 */
function updateAisEntityOcclusion(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
): void {
  const occluder = createGlobeOccluder(Cesium, viewer);
  for (const entity of viewer.entities.values) {
    if (typeof entity.id !== "string") continue;
    if (!entity.id.startsWith("ais:") && !entity.id.startsWith("disguised:")) continue;
    const position = entity.position?.getValue(viewer.clock.currentTime);
    if (!position) continue;
    entity.show = occluder.isPointVisible(position);
  }
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
  const occluder = createGlobeOccluder(Cesium, viewer);

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

/**
 * 북한·중국·러시아·이란 국경. 굵기는 지면 폭(m)을 유지해서
 * 줌아웃하면 화면에서 같은 비율로 얇아지고, 줌인하면 굵어진다.
 * 반환값은 해제 함수.
 */
function attachAxisHubBorders(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  rings: LngLatRing[],
): () => void {
  const color = Cesium.Color.fromCssColorString(AXIS_HUB_BORDER_COLOR);
  const ids: string[] = [];
  const instances = rings.map((ring, index) => {
    const flat: number[] = [];
    for (const pair of ring) {
      const lng = pair[0];
      const lat = pair[1];
      if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) {
        continue;
      }
      flat.push(lng, lat);
    }
    if (flat.length < 8) return null;
    const id = `hub-border:${index}`;
    ids.push(id);
    return new Cesium.GeometryInstance({
      id,
      geometry: new Cesium.GroundPolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray(flat),
        width: 2,
        arcType: Cesium.ArcType.GEODESIC,
        granularity: 0,
      }),
    });
  }).filter((instance): instance is import("cesium").GeometryInstance => instance != null);

  if (!instances.length || !Cesium.GroundPolylinePrimitive.isSupported(viewer.scene)) {
    return () => {};
  }

  const primitive = new Cesium.GroundPolylinePrimitive({
    geometryInstances: instances,
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType("Color", { color }),
    }),
    classificationType: Cesium.ClassificationType.BOTH,
    allowPicking: false,
    asynchronous: true,
  });
  viewer.scene.groundPrimitives.add(primitive);

  const scratchCarto = new Cesium.Cartographic();
  let lastPx = -1;
  const removePreRender = viewer.scene.preRender.addEventListener(() => {
    if (viewer.isDestroyed() || primitive.isDestroyed() || !primitive.ready) return;
    const carto = Cesium.Cartographic.fromCartesian(
      viewer.camera.positionWC,
      viewer.scene.globe.ellipsoid,
      scratchCarto,
    );
    const frustum = viewer.camera.frustum as { fovy?: number };
    const px = axisHubBorderWidthPx({
      cameraHeightM: carto.height,
      canvasHeightPx: viewer.scene.canvas.clientHeight,
      fovyRad: frustum.fovy ?? Math.PI / 3,
    });
    if (px === lastPx) return;
    const width: number[] = [px];
    try {
      for (const id of ids) {
        const attrs = primitive.getGeometryInstanceAttributes(id);
        if (attrs) attrs.width = width;
      }
    } catch {
      return;
    }
    lastPx = px;
  });

  return () => {
    removePreRender();
    if (!primitive.isDestroyed()) {
      if (!viewer.isDestroyed()) {
        viewer.scene.groundPrimitives.remove(primitive);
      } else {
        primitive.destroy();
      }
    }
  };
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
      alertPins = [],
      onSelectAlert,
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
  const onSelectAlertRef = useRef(onSelectAlert);
  onSelectAlertRef.current = onSelectAlert;
  const alertPinsRef = useRef(alertPins);
  alertPinsRef.current = alertPins;
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
          if (prefix === "alert" || prefix === "alertline") {
            const pin = alertPinsRef.current.find((item) => item.id === key);
            if (pin) onSelectAlertRef.current?.(pin);
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

  /** 북한·중국·러시아·이란 빨간 국경. 줌 배율에 맞춰 굵기가 같이 변한다. */
  useEffect(() => {
    if (status !== "ready") return;
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    let cancelled = false;
    let detach: (() => void) | null = null;

    (async () => {
      try {
        const response = await fetchDataWithFallback("axis-hub-countries.json");
        if (!response.ok || cancelled || viewer.isDestroyed()) return;
        const rings = collectAxisHubBorderRings(
          (await response.json()) as FeatureCollection,
        );
        if (cancelled || viewer.isDestroyed() || rings.length === 0) return;
        detach = attachAxisHubBorders(Cesium, viewer, rings);
      } catch (err) {
        console.warn("[CesiumSatelliteGlobe] axis hub borders:", err);
      }
    })();

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [status]);

  /** 카메라 회전 시 지구 뒤편 AIS 숨김 — 폴링 주기에 묶이지 않음 */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    const remove = viewer.scene.preRender.addEventListener(() => {
      if (viewer.isDestroyed()) return;
      updateAisEntityOcclusion(Cesium, viewer);
    });
    return () => {
      remove();
    };
  }, [status]);

  /**
   * AIS/ADS-B 라이브 엔티티 동기화 — MapLibre 심볼 레이어를 대체. 전부 Cesium billboard.
   * viewer.entities를 prefix(ais:/disguised:/mil:/civ:)별로 diff해서
   * 매 폴링마다 전체 재생성하지 않고 위치/아이콘만 갱신한다.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    // 군함/상선 세부 필터 — showAisMilitary·showAisCommercial. "other" 카테고리는
    // 상선(민간) 쪽으로 취급한다.
    const aisFiltered = showAis
      ? aisVessels.filter((v) => (v.category === "military" ? showAisMilitary : showAisCommercial))
      : [];
    syncAisBillboardEntities(Cesium, viewer, "ais", aisFiltered);
    syncAisBillboardEntities(
      Cesium,
      viewer,
      "disguised",
      showDisguisedVessels ? disguisedVessels : [],
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

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const seen = new Set<string>();
    for (const pin of alertPins) {
      if (pin.kind === "dark-fleet") continue;
      const pointId = `alert:${pin.id}`;
      seen.add(pointId);
      const color = Cesium.Color.fromCssColorString(ALERT_PIN_COLOR[pin.kind]);
      const position = Cesium.Cartesian3.fromDegrees(pin.lng, pin.lat, 0);
      const existing = viewer.entities.getById(pointId);
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = pin.title;
        if (existing.point) {
          existing.point.color = new Cesium.ConstantProperty(color);
        }
      } else {
        viewer.entities.add({
          id: pointId,
          name: pin.title,
          position,
          point: {
            pixelSize: pin.kind === "route" || pin.kind === "ais-gate" ? 7 : 11,
            color,
            outlineColor: Cesium.Color.BLACK.withAlpha(0.65),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }

      const lineId = `alertline:${pin.id}`;
      if (pin.path && pin.path.length >= 2) {
        seen.add(lineId);
        const positions = pin.path.map((point) =>
          Cesium.Cartesian3.fromDegrees(point.lng, point.lat, 0),
        );
        const line = viewer.entities.getById(lineId);
        if (line?.polyline) {
          line.polyline.positions = new Cesium.ConstantProperty(positions);
        } else if (!line) {
          viewer.entities.add({
            id: lineId,
            name: pin.title,
            polyline: {
              positions,
              width: 2,
              material: new Cesium.ColorMaterialProperty(color.withAlpha(0.85)),
              clampToGround: true,
            },
          });
        }
      }
    }

    const stale: import("cesium").Entity[] = [];
    for (const entity of viewer.entities.values) {
      const id = entity.id;
      if (typeof id !== "string") continue;
      if (!id.startsWith("alert:") && !id.startsWith("alertline:")) continue;
      if (!seen.has(id)) stale.push(entity);
    }
    for (const entity of stale) viewer.entities.remove(entity);
  }, [alertPins, status]);

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
