"use client";

/**
 * 위성 모드 글로브 — God's Eye View 키리스 경로와 동일한 스택.
 * Esri World Imagery + World Elevation(또는 Ion World Terrain). 산악 기복 유지.
 * Ion 토큰이 있으면 World Imagery(AERIAL) + World Terrain 우선 — 유료 관측 화질.
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
import { attachGibsClouds } from "@/lib/cesiumGibsClouds";
import { attachRealtimeDayNight } from "@/lib/cesiumDayNight";
import { attachGibsAerosolSmoke } from "@/lib/cesiumGibsSmoke";
import {
  attachFirmsFirePulse,
  syncFirmsFireEntities,
  type CesiumFirmsFirePoint,
} from "@/lib/cesiumFirmsFires";
import {
  attachMissileLaunchPulse,
  syncMissileLaunchEntities,
  type CesiumMissileLaunchPoint,
} from "@/lib/cesiumMissileLaunches";
import {
  attachAirRaidZonePulse,
  syncAirRaidZoneEntities,
} from "@/lib/cesiumAirRaidZones";
import {
  resolveCinematicCamera,
  resolveCinematicDurationMs,
} from "@/lib/globeCamera";
import {
  getNeptunTypeMeta,
  type NeptunAlerts,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import { useCesiumKeyboardNav } from "@/components/globe/hooks/useCesiumKeyboardNav";

const ESRI_WORLD_IMAGERY =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
/** Esri World Elevation 3D — Ion 없이도 산악 기복 */
const ESRI_WORLD_ELEVATION =
  "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer";
/** Cesium ion World Terrain (createWorldTerrainAsync / asset 1) */
const ION_WORLD_TERRAIN_ASSET = 1;
/** 위성·지역 줌에서 기복이 읽히도록 살짝 과장 (1=실측) */
const TERRAIN_VERTICAL_EXAGGERATION = 1.85;

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
  /** 하루 리플레이 — UTC 시각(0–24)으로 태양/야경 시계 설정 */
  setClockHourUtc: (hourUtc: number) => void;
  /** 실시간 시계로 복귀 */
  resetClockLive: () => void;
  /** 하루 재생 multiplier (0=정지, 예: 1200 ≈ 하루를 약 72초에) */
  setClockMultiplier: (multiplier: number) => void;
  captureFrame: () => Promise<HTMLCanvasElement | null>;
  /** 녹화용 라이브 WebGL 캔버스 */
  getCanvas: () => HTMLCanvasElement | null;
  /** 장면 링크용 카메라 (globe.gl altitude 단위) */
  pointOfView: () => { lat: number; lng: number; altitude: number } | null;
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
  /** NEPTUN 우크라 UAV·미사일 — 뷰포트 필터·상한은 상위에서 적용 */
  neptunThreats?: NeptunLiveThreat[];
  showNeptun?: boolean;
  /** 세슘 알림창과 같은 경보 핀 (UKMTO·NAVAREA·초크·훈련·게이트·항로) */
  alertPins?: CesiumAlertItem[];
  onSelectAlert?: (item: CesiumAlertItem) => void;
  /** LIVEUA 전선 속보 핀 */
  liveuaPins?: Array<{ id: string; title: string; lat: number; lng: number }>;
  onSelectLiveuaPin?: (id: string) => void;
  /** LIVEUA/DeepState 통제·점령 GeoJSON (overview fill) */
  controlGeoJson?: GeoJSON.FeatureCollection | null;
  /** NASA FIRMS — 화염·연기 빌보드 */
  firmsFires?: CesiumFirmsFirePoint[];
  showFirmsFires?: boolean;
  /** 북한 미사일 발사·시험 */
  missileLaunches?: CesiumMissileLaunchPoint[];
  showMissileLaunches?: boolean;
  /** NEPTUN 공습 경보 존 */
  neptunAlerts?: NeptunAlerts | null;
  showAirRaidZones?: boolean;
  /** viewer가 준비되어 flyTo를 받을 수 있게 된 시점 — 관측 모드 전환 후 flyTo 대기에 사용 */
  onReady?: () => void;
  /** 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용 */
  onSelectEntity?: (selection: CesiumEntitySelection) => void;
};

type StackKind = "esri" | "photoreal";
type ErrorKind = "chunk" | "assets" | "other";

const CHUNK_RELOAD_KEY = "cesium-chunk-reload";
/** WebGL/부팅 실패를 즉시 에러 UI로 떨어뜨리지 않는 유예(ms) */
const CESIUM_LOAD_GRACE_MS = 22_000;

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
    if (
      !entity.id.startsWith("ais:") &&
      !entity.id.startsWith("disguised:") &&
      !entity.id.startsWith("neptun:")
    ) {
      continue;
    }
    const position = entity.position?.getValue(viewer.clock.currentTime);
    if (!position) continue;
    entity.show = occluder.isPointVisible(position);
  }
}

const CESIUM_NEPTUN_HEIGHT_M: Record<string, number> = {
  uav: 2_400,
  recon: 3_200,
  missile: 8_000,
  ballistic: 18_000,
  kab: 5_000,
  mig31k: 12_000,
  unknown: 4_000,
};
const CESIUM_NEPTUN_TRAIL_MAX = 12;
const neptunBillboardUriCache = new Map<string, string>();

function neptunBillboardImage(colorCss: string): string {
  const key = colorCss;
  let image = neptunBillboardUriCache.get(key);
  if (!image) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="5.5" fill="${colorCss}" stroke="#fff" stroke-width="1.4"/>
      <circle cx="14" cy="14" r="10" fill="none" stroke="${colorCss}" stroke-width="1.2" opacity="0.45"/>
    </svg>`;
    image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    neptunBillboardUriCache.set(key, image);
  }
  return image;
}

function neptunTrailPositions(
  Cesium: typeof import("cesium"),
  threat: NeptunLiveThreat,
  heightM: number,
): import("cesium").Cartesian3[] {
  const trail = threat.trail ?? [];
  const sliced =
    trail.length > CESIUM_NEPTUN_TRAIL_MAX - 1
      ? trail.slice(trail.length - (CESIUM_NEPTUN_TRAIL_MAX - 1))
      : trail;
  const pts: import("cesium").Cartesian3[] = [];
  for (const p of sliced) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    pts.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, heightM * 0.85));
  }
  const lat = threat.predictedLat ?? threat.lat;
  const lon = threat.predictedLon ?? threat.lon;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    pts.push(Cesium.Cartesian3.fromDegrees(lon, lat, heightM));
  }
  return pts;
}

/** NEPTUN UAV·미사일 — 빌보드 + 짧은 궤적 폴리라인 (상한·오클루전은 AIS와 동일) */
function syncNeptunBillboardEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  items: NeptunLiveThreat[],
): void {
  const seen = new Set<string>();
  const scaleByDistance = new Cesium.NearFarScalar(1.5e5, 1.4, 4.0e6, 0.45);

  for (const threat of items) {
    const lat = threat.predictedLat ?? threat.lat;
    const lon = threat.predictedLon ?? threat.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const meta = getNeptunTypeMeta(threat.type);
    const heightM = CESIUM_NEPTUN_HEIGHT_M[threat.type] ?? CESIUM_NEPTUN_HEIGHT_M.unknown;
    const id = `neptun:${threat.id}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(lon, lat, heightM);
    const image = neptunBillboardImage(meta.color);
    const name = threat.title || meta.label;

    const existing = viewer.entities.getById(id);
    if (existing) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = name;
      existing.show = true;
      if (existing.billboard) {
        existing.billboard.image = new Cesium.ConstantProperty(image);
        existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(
          CESIUM_AIS_NO_DEPTH,
        );
        existing.billboard.scaleByDistance = new Cesium.ConstantProperty(scaleByDistance);
      }
      const trailPts = neptunTrailPositions(Cesium, threat, heightM);
      if (trailPts.length >= 2) {
        if (existing.polyline) {
          existing.polyline.positions = new Cesium.ConstantProperty(trailPts);
          existing.polyline.material = new Cesium.ColorMaterialProperty(
            Cesium.Color.fromCssColorString(meta.color).withAlpha(0.75),
          );
        } else {
          existing.polyline = new Cesium.PolylineGraphics({
            positions: trailPts,
            width: 2.2,
            material: Cesium.Color.fromCssColorString(meta.color).withAlpha(0.75),
            clampToGround: false,
            arcType: Cesium.ArcType.GEODESIC,
          });
        }
      } else if (existing.polyline) {
        existing.polyline = undefined;
      }
      continue;
    }

    const trailPts = neptunTrailPositions(Cesium, threat, heightM);
    viewer.entities.add({
      id,
      name,
      position,
      show: true,
      billboard: new Cesium.BillboardGraphics({
        image,
        width: 22,
        height: 22,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: CESIUM_AIS_NO_DEPTH,
        scaleByDistance,
        color: Cesium.Color.WHITE,
      }),
      ...(trailPts.length >= 2
        ? {
            polyline: new Cesium.PolylineGraphics({
              positions: trailPts,
              width: 2.2,
              material: Cesium.Color.fromCssColorString(meta.color).withAlpha(0.75),
              clampToGround: false,
              arcType: Cesium.ArcType.GEODESIC,
            }),
          }
        : {}),
    });
  }

  const toRemove: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (typeof entity.id === "string" && entity.id.startsWith("neptun:") && !seen.has(entity.id)) {
      toRemove.push(entity);
    }
  }
  for (const entity of toRemove) {
    viewer.entities.remove(entity);
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
      neptunThreats = [],
      showNeptun = false,
      alertPins = [],
      onSelectAlert,
      liveuaPins = [],
      onSelectLiveuaPin,
      controlGeoJson = null,
      firmsFires = [],
      showFirmsFires = false,
      missileLaunches = [],
      showMissileLaunches = false,
      neptunAlerts = null,
      showAirRaidZones = false,
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
  const [hoverTip, setHoverTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [bootNonce, setBootNonce] = useState(0);
  // 마운트 이펙트에서 만든 viewer/Cesium 모듈 — 엔티티 동기화 이펙트에서 재사용
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumModRef = useRef<typeof import("cesium") | null>(null);
  const clickHandlerRef = useRef<import("cesium").ScreenSpaceEventHandler | null>(null);
  const mountAtRef = useRef(Date.now());
  const contextLostRecreateRef = useRef(false);
  const softErrorTimerRef = useRef<number | null>(null);

  // 클릭 핸들러가 매 폴링마다 재등록되지 않도록 최신 데이터를 ref로 보관
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onSelectEntityRef = useRef(onSelectEntity);
  onSelectEntityRef.current = onSelectEntity;
  const onSelectAlertRef = useRef(onSelectAlert);
  onSelectAlertRef.current = onSelectAlert;
  const onSelectLiveuaPinRef = useRef(onSelectLiveuaPin);
  onSelectLiveuaPinRef.current = onSelectLiveuaPin;
  const alertPinsRef = useRef(alertPins);
  alertPinsRef.current = alertPins;
  const liveuaPinsRef = useRef(liveuaPins);
  liveuaPinsRef.current = liveuaPins;
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
        const resolved = resolveCinematicCamera(camera);
        const orientation = {
          heading: Cesium.Math.toRadians(resolved.bearing),
          pitch: Cesium.Math.toRadians(resolved.pitch - 90),
          roll: 0,
        };
        const destination = Cesium.Cartesian3.fromDegrees(lng, lat, heightM);
        // durationMs === 0 은 즉시 스냅 (인터럽트용). undefined는 시네마틱.
        if (durationMs === 0) {
          viewer.camera.setView({ destination, orientation });
          return;
        }
        const durationSec = resolveCinematicDurationMs(durationMs) / 1000;
        // 궤도 아크 + ease-in-out — 빠르면서도 천천히 감속하는 대각선 진입
        viewer.camera.flyTo({
          destination,
          orientation,
          duration: durationSec,
          maximumHeight: Math.max(heightM * 2.4, heightM + 2_200_000),
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
        });
      },
      setClockHourUtc: (hourUtc) => {
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return;
        const h = ((hourUtc % 24) + 24) % 24;
        const now = new Date();
        const iso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}T${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}:00Z`;
        viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(iso);
        viewer.clock.shouldAnimate = false;
        viewer.clock.multiplier = 1;
      },
      resetClockLive: () => {
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return;
        viewer.clock.currentTime = Cesium.JulianDate.now();
        viewer.clock.multiplier = 1;
        viewer.clock.shouldAnimate = true;
      },
      setClockMultiplier: (multiplier) => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;
        viewer.clock.multiplier = multiplier;
        viewer.clock.shouldAnimate = multiplier !== 0;
      },
      captureFrame: () => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) {
          return Promise.resolve(null);
        }
        const source = viewer.scene.canvas;
        if (!source.width || !source.height) return Promise.resolve(null);
        viewer.scene.requestRender();
        return new Promise<HTMLCanvasElement | null>((resolve) => {
          window.requestAnimationFrame(() => {
            try {
              const out = document.createElement("canvas");
              out.width = source.width;
              out.height = source.height;
              const ctx = out.getContext("2d");
              if (!ctx) {
                resolve(null);
                return;
              }
              ctx.drawImage(source, 0, 0);
              resolve(out);
            } catch {
              resolve(null);
            }
          });
        });
      },
      getCanvas: () => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return null;
        return viewer.scene.canvas;
      },
      pointOfView: () => {
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return null;
        const carto = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC);
        if (!carto) return null;
        return {
          lat: Cesium.Math.toDegrees(carto.latitude),
          lng: Cesium.Math.toDegrees(carto.longitude),
          altitude: Math.max(0.02, carto.height / EARTH_RADIUS_M),
        };
      },
    }),
    [],
  );

  /** WASD / 화살표 이동, +/- 확대·축소 — MapLibre와 동일 (캔버스 포커스 불필요) */
  useCesiumKeyboardNav(viewerRef, status === "ready");

  useEffect(() => {
    const container = containerRef.current;
    const creditContainer = creditRef.current;
    if (!container || !creditContainer) return;

    let cancelled = false;
    let viewer: import("cesium").Viewer | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let onContextLost: ((ev: Event) => void) | null = null;
    let detachClouds: (() => void) | null = null;
    let detachDayNight: (() => void) | null = null;
    let detachSmoke: (() => void) | null = null;
    let detachFirmsPulse: (() => void) | null = null;
    let detachMissilePulse: (() => void) | null = null;
    let detachAirRaidPulse: (() => void) | null = null;
    mountAtRef.current = Date.now();
    setStatus("loading");
    setHoverTip(null);

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
        // 산·계곡 기복이 위성 뷰에서도 읽히도록 수직 과장
        if (typeof viewer.scene.verticalExaggeration === "number") {
          viewer.scene.verticalExaggeration = TERRAIN_VERTICAL_EXAGGERATION;
        }
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#02040a");
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#02040a");
        const translucency = (
          viewer.scene.globe as {
            translucency?: { enabled: boolean; frontFaceAlpha?: number };
          }
        ).translucency;
        if (translucency) {
          translucency.enabled = false;
          if (typeof translucency.frontFaceAlpha === "number") {
            translucency.frontFaceAlpha = 1.0;
          }
        }
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }
        viewer.scene.fog.enabled = true;
        // 낮/밤은 attachRealtimeDayNight에서 enableLighting=true + 실시간 시계로 맞춤
        viewer.scene.globe.enableLighting = false;

        // 낮/밤·야경은 Globe imagery + 태양 조명.
        // Ion 토큰 → World Imagery(유료 화질) 우선, 실패 시 Esri.
        let usedPhotoreal = false;
        let dayImageryLayer: import("cesium").ImageryLayer | null = null;
        {
          viewer.scene.globe.show = true;
          viewer.imageryLayers.removeAll();

          if (ionToken) {
            try {
              const ionImagery = await Cesium.createWorldImageryAsync({
                style: Cesium.IonWorldImageryStyle.AERIAL,
              });
              dayImageryLayer = viewer.imageryLayers.addImageryProvider(ionImagery);
              dayImageryLayer.alpha = 1.0;
              usedPhotoreal = true;
            } catch (ionImgErr) {
              console.warn(
                "[CesiumSatelliteGlobe] Ion World Imagery → Esri fallback:",
                ionImgErr,
              );
            }
          }

          if (!dayImageryLayer) {
            const imagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
              ESRI_WORLD_IMAGERY,
              {
                enablePickFeatures: false,
                credit:
                  "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
              },
            );
            dayImageryLayer = viewer.imageryLayers.addImageryProvider(imagery);
            dayImageryLayer.alpha = 1.0;
          }

          try {
            if (ionToken) {
              try {
                viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
                  requestVertexNormals: true,
                  requestWaterMask: false,
                });
              } catch (ionErr) {
                console.warn(
                  "[CesiumSatelliteGlobe] Ion World Terrain → fromIonAssetId:",
                  ionErr,
                );
                viewer.terrainProvider =
                  await Cesium.CesiumTerrainProvider.fromIonAssetId(
                    ION_WORLD_TERRAIN_ASSET,
                    {
                      requestVertexNormals: true,
                      requestWaterMask: false,
                    },
                  );
              }
            } else {
              viewer.terrainProvider =
                await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                  ESRI_WORLD_ELEVATION,
                );
            }
          } catch (err) {
            console.warn(
              "[CesiumSatelliteGlobe] terrain primary failed, Esri elevation:",
              err,
            );
            try {
              viewer.terrainProvider =
                await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                  ESRI_WORLD_ELEVATION,
                );
            } catch (arcErr) {
              console.warn("[CesiumSatelliteGlobe] terrain fallback flat:", arcErr);
              viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            }
          }
          setStack(usedPhotoreal ? "photoreal" : "esri");
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
        const resolvePickedEntityId = (
          picked: unknown,
        ): string | undefined => {
          const rawId = (picked as { id?: unknown } | undefined)?.id;
          if (typeof rawId === "string") return rawId;
          if (rawId && typeof (rawId as { id?: unknown }).id === "string") {
            return (rawId as { id: string }).id;
          }
          return undefined;
        };

        const hoverLabelForEntity = (entityId: string): string | null => {
          const entity = viewer!.entities.getById(entityId);
          const name =
            typeof entity?.name === "string" && entity.name.trim()
              ? entity.name.trim()
              : null;
          const sep = entityId.indexOf(":");
          if (sep < 0) return name;
          const prefix = entityId.slice(0, sep);
          const key = entityId.slice(sep + 1);
          if (prefix === "liveua") {
            const pin = liveuaPinsRef.current.find((p) => p.id === key);
            return pin?.title || name;
          }
          if (prefix === "ais" || prefix === "disguised") {
            const pool =
              prefix === "ais" ? aisVesselsRef.current : disguisedVesselsRef.current;
            const vessel = pool.find((x) => x.mmsi === key || x.id === key);
            return vessel?.shipName || vessel?.mmsi || name;
          }
          if (prefix === "mil" || prefix === "civ") {
            const pool =
              prefix === "mil" ? milAircraftRef.current : civAircraftRef.current;
            const aircraft = pool.find((x) => x.hex === key || x.id === key);
            return (
              aircraft?.callsign ||
              aircraft?.registration ||
              aircraft?.hex ||
              name
            );
          }
          if (prefix === "alert" || prefix === "alertline") {
            const pin = alertPinsRef.current.find((item) => item.id === key);
            return pin?.title || name;
          }
          return name;
        };

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction((movement: { position: import("cesium").Cartesian2 }) => {
          const v = viewerRef.current;
          if (!v || v.isDestroyed()) return;
          const picked = v.scene.pick(movement.position);
          const entityId = resolvePickedEntityId(picked);
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
          if (prefix === "liveua") {
            onSelectLiveuaPinRef.current?.(key);
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

        const geoJsonHoverLabel = (
          ent: {
            properties?: {
              name?: { getValue?: (t: unknown) => unknown };
              Name?: { getValue?: (t: unknown) => unknown };
              region?: { getValue?: (t: unknown) => unknown };
              getValue?: (t: unknown) => Record<string, unknown>;
            };
            name?: string;
          },
          time: import("cesium").JulianDate,
        ): string | null => {
          const bag = ent.properties?.getValue?.(time);
          const fromBag =
            (typeof bag?.name === "string" && bag.name) ||
            (typeof bag?.Name === "string" && bag.Name) ||
            (typeof bag?.region === "string" && bag.region) ||
            null;
          const fromProp =
            (ent.properties?.name?.getValue?.(time) as string | undefined) ||
            (ent.properties?.Name?.getValue?.(time) as string | undefined) ||
            (ent.properties?.region?.getValue?.(time) as string | undefined) ||
            null;
          return (
            (typeof fromBag === "string" && fromBag) ||
            (typeof fromProp === "string" && fromProp) ||
            (typeof ent.name === "string" && ent.name.trim()) ||
            null
          );
        };

        handler.setInputAction(
          (movement: { endPosition: import("cesium").Cartesian2 }) => {
            const v = viewerRef.current;
            if (!v || v.isDestroyed()) {
              setHoverTip(null);
              return;
            }
            const picked = v.scene.pick(movement.endPosition);
            let tip: string | null = null;
            const raw = (picked as { id?: unknown } | undefined)?.id;
            if (typeof raw === "string") {
              tip = hoverLabelForEntity(raw);
            } else if (raw && typeof raw === "object") {
              // Cesium pick → Entity. Prefix pins live on viewer.entities;
              // control GeoJSON lives on a DataSource (id is usually a UUID).
              const ent = raw as {
                id?: string;
                name?: string;
                properties?: {
                  name?: { getValue?: (t: unknown) => unknown };
                  Name?: { getValue?: (t: unknown) => unknown };
                  region?: { getValue?: (t: unknown) => unknown };
                  getValue?: (t: unknown) => Record<string, unknown>;
                };
              };
              const eid = typeof ent.id === "string" ? ent.id : undefined;
              if (eid && eid.includes(":")) {
                tip = hoverLabelForEntity(eid);
              }
              if (!tip) {
                tip = geoJsonHoverLabel(ent, v.clock.currentTime);
              }
            }
            if (tip) {
              const canvasW = v.canvas.clientWidth || 320;
              const nearRight = movement.endPosition.x > canvasW - 180;
              setHoverTip({
                text: tip,
                x: nearRight ? canvasW - 16 : movement.endPosition.x,
                y: nearRight ? 28 : movement.endPosition.y,
              });
            } else {
              setHoverTip(null);
            }
          },
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        );

        const canvas = viewer.canvas;
        canvasEl = canvas;
        onContextLost = (ev: Event) => {
          ev.preventDefault();
          console.warn("[CesiumSatelliteGlobe] WebGL context lost");
          setStatus("loading");
          setHoverTip(null);
          try {
            viewer?.resize();
          } catch {
            /* ignore */
          }
          if (!contextLostRecreateRef.current) {
            contextLostRecreateRef.current = true;
            window.setTimeout(() => setBootNonce((n) => n + 1), 400);
            return;
          }
          // Already recreated once — keep loading, then soft-error after grace.
          const elapsed = Date.now() - mountAtRef.current;
          const remain = Math.max(0, CESIUM_LOAD_GRACE_MS - elapsed);
          if (softErrorTimerRef.current != null) {
            window.clearTimeout(softErrorTimerRef.current);
          }
          softErrorTimerRef.current = window.setTimeout(() => {
            setStatus("error");
            setErrorMsg("WebGL context lost");
            setErrorKind("other");
          }, remain);
        };
        canvas.addEventListener("webglcontextlost", onContextLost, false);

        clickHandlerRef.current = handler;

        if (!cancelled) {
          try {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
          } catch {
            /* ignore */
          }
          viewerRef.current = viewer;
          cesiumModRef.current = Cesium;
          try {
            detachDayNight = attachRealtimeDayNight(
              Cesium,
              viewer,
              dayImageryLayer,
            );
          } catch (err) {
            console.warn("[CesiumSatelliteGlobe] day/night:", err);
          }
          try {
            detachClouds = attachGibsClouds(Cesium, viewer, {
              enableTileOverlay: !usedPhotoreal,
            });
          } catch (err) {
            console.warn("[CesiumSatelliteGlobe] GIBS clouds:", err);
          }
          try {
            detachSmoke = attachGibsAerosolSmoke(Cesium, viewer);
          } catch (err) {
            console.warn("[CesiumSatelliteGlobe] GIBS aerosol:", err);
          }
          try {
            detachFirmsPulse = attachFirmsFirePulse(Cesium, viewer);
            detachMissilePulse = attachMissileLaunchPulse(Cesium, viewer);
            detachAirRaidPulse = attachAirRaidZonePulse(Cesium, viewer);
          } catch (err) {
            console.warn("[CesiumSatelliteGlobe] layer pulses:", err);
          }
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

        const kind: ErrorKind = isChunkLoadError(err)
          ? "chunk"
          : isCesiumAssetsError(err)
            ? "assets"
            : "other";
        const msg = err instanceof Error ? err.message : "Cesium failed";
        const elapsed = Date.now() - mountAtRef.current;
        const remain = CESIUM_LOAD_GRACE_MS - elapsed;
        if (remain > 0 && kind !== "chunk") {
          // soft-load: 유예 동안 로딩 오버레이 유지 후 에러 UI
          setStatus("loading");
          setErrorMsg(null);
          if (softErrorTimerRef.current != null) {
            window.clearTimeout(softErrorTimerRef.current);
          }
          softErrorTimerRef.current = window.setTimeout(() => {
            if (cancelled) return;
            setStatus("error");
            setErrorMsg(msg);
            setErrorKind(kind);
          }, remain);
          return;
        }

        setStatus("error");
        setErrorMsg(msg);
        setErrorKind(kind);
      }
    })();

    return () => {
      cancelled = true;
      try {
        detachDayNight?.();
      } catch {
        /* ignore */
      }
      detachDayNight = null;
      try {
        detachSmoke?.();
      } catch {
        /* ignore */
      }
      detachSmoke = null;
      try {
        detachFirmsPulse?.();
      } catch {
        /* ignore */
      }
      detachFirmsPulse = null;
      try {
        detachMissilePulse?.();
      } catch {
        /* ignore */
      }
      detachMissilePulse = null;
      try {
        detachAirRaidPulse?.();
      } catch {
        /* ignore */
      }
      detachAirRaidPulse = null;
      try {
        detachClouds?.();
      } catch {
        /* ignore */
      }
      detachClouds = null;
      viewerRef.current = null;
      cesiumModRef.current = null;
      if (softErrorTimerRef.current != null) {
        window.clearTimeout(softErrorTimerRef.current);
        softErrorTimerRef.current = null;
      }
      if (canvasEl && onContextLost) {
        canvasEl.removeEventListener("webglcontextlost", onContextLost, false);
      }
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
    // initial lat/lng only for first mount; bootNonce recreates after context loss
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootNonce]);

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
    syncNeptunBillboardEntities(Cesium, viewer, showNeptun ? neptunThreats : []);
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
    showNeptun,
    neptunThreats,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    syncFirmsFireEntities(Cesium, viewer, showFirmsFires ? firmsFires : []);
    syncMissileLaunchEntities(
      Cesium,
      viewer,
      showMissileLaunches ? missileLaunches : [],
    );
    syncAirRaidZoneEntities(
      Cesium,
      viewer,
      showAirRaidZones ? neptunAlerts : null,
    );
  }, [
    status,
    showFirmsFires,
    firmsFires,
    showMissileLaunches,
    missileLaunches,
    showAirRaidZones,
    neptunAlerts,
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

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const seen = new Set<string>();
    for (const pin of liveuaPins) {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
      const pointId = `liveua:${pin.id}`;
      seen.add(pointId);
      const position = Cesium.Cartesian3.fromDegrees(pin.lng, pin.lat, 0);
      const existing = viewer.entities.getById(pointId);
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = pin.title;
      } else {
        viewer.entities.add({
          id: pointId,
          name: pin.title,
          position,
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString("#f59e0b"),
            outlineColor: Cesium.Color.BLACK.withAlpha(0.65),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }

    const stale: import("cesium").Entity[] = [];
    for (const entity of viewer.entities.values) {
      const id = entity.id;
      if (typeof id !== "string" || !id.startsWith("liveua:")) continue;
      if (!seen.has(id)) stale.push(entity);
    }
    for (const entity of stale) viewer.entities.remove(entity);
  }, [liveuaPins, status]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    let cancelled = false;
    const dataSourceName = "liveua-control";

    const removeExisting = () => {
      const existing = viewer.dataSources.getByName(dataSourceName);
      for (const ds of [...existing]) {
        void viewer.dataSources.remove(ds, true);
      }
    };

    if (!controlGeoJson?.features?.length) {
      removeExisting();
      return;
    }

    void (async () => {
      try {
        removeExisting();
        const ds = await Cesium.GeoJsonDataSource.load(controlGeoJson, {
          clampToGround: true,
        });
        if (cancelled || viewer.isDestroyed()) return;
        ds.name = dataSourceName;
        for (const entity of ds.entities.values) {
          if (entity.polygon) {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
              Cesium.Color.fromCssColorString("#b45309").withAlpha(0.62),
            );
            entity.polygon.outline = new Cesium.ConstantProperty(true);
            entity.polygon.outlineColor = new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString("#fbbf24").withAlpha(0.85),
            );
            entity.polygon.heightReference = new Cesium.ConstantProperty(
              Cesium.HeightReference.CLAMP_TO_GROUND,
            );
            // 지형에만 클램프 — 뒷면 depth-fail 머티리얼은 PolygonGraphics에 없음
            entity.polygon.classificationType = new Cesium.ConstantProperty(
              Cesium.ClassificationType.TERRAIN,
            );
          }
        }
        await viewer.dataSources.add(ds);
      } catch (err) {
        console.warn("[CesiumSatelliteGlobe] control GeoJSON", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [controlGeoJson, status]);

  return (
    <div className={`relative h-full w-full bg-[#02040a] ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={creditRef}
        className="pointer-events-none absolute bottom-1 right-2 z-20 max-w-[min(28rem,70vw)] text-micro leading-tight text-sky-100/70 [&_a]:text-sky-200/90"
      />

      {hoverTip ? (
        <div
          className="pointer-events-none absolute z-30 max-w-[min(18rem,70vw)] rounded-md border border-sky-200/25 bg-[#0b1628]/92 px-2.5 py-1.5 text-xs text-sky-50 shadow-lg backdrop-blur-sm"
          style={
            hoverTip.y <= 36
              ? { right: 12, top: 12 }
              : {
                  left: Math.min(
                    hoverTip.x + 14,
                    (containerRef.current?.clientWidth ?? 320) - 12,
                  ),
                  top: Math.max(8, hoverTip.y - 8),
                  transform: "translateY(-100%)",
                }
          }
        >
          {hoverTip.text}
        </div>
      ) : null}

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
              ? "Cesium Ion · World Imagery HD · World Terrain"
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
