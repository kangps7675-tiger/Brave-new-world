"use client";

/**
 * 위성 모드 글로브 — God's Eye View에 가까운 베이스 스택.
 * Ion 토큰 + CESIUM_GOOGLE_3D(기본 on): Google Photorealistic 3D Tiles + World Terrain.
 * 폴백: Ion World Imagery + Terrain + OSM Buildings → Esri World Imagery + Esri Elevation.
 * 글로브는 유지(UKMTO/클램프 GroundPolyline). Google만으로는 오버레이가 깨진다.
 * @see https://github.com/bilawalsidhu/gods-eye-view
 * @see https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { FeatureCollection } from "geojson";
import {
  AXIS_HUB_BORDER_HALO_WIDTH_M,
  AXIS_HUB_BORDER_WIDTH_M,
  axisHubBorderWidthPx,
  collectAxisHubBorderRings,
  type LngLatRing,
} from "@/lib/axisHubCountryPolygons";
import { fetchDataWithFallback } from "@/lib/dataProfile";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";
import {
  attachConflictEventPulse,
  syncConflictEventEntities,
  type CesiumConflictEventPoint,
} from "@/lib/cesiumConflictEvents";
import {
  filterPlaceLabelsForOverlay,
  syncPlaceLabelEntities,
  type CesiumPlaceLabel,
} from "@/lib/cesiumPlaceLabels";
import {
  attachObservePlaceNameOverlay,
  type ObservePlaceOverlayHandle,
} from "@/lib/cesiumGooglePlaceOverlay";
import {
  attachWorldAdminBorders,
  loadCountryBorderRings,
} from "@/lib/cesiumWorldBorders";
import {
  OBSERVE_AXIS_BORDER,
  OBSERVE_AXIS_BORDER_HALO,
  OBSERVE_CONTROL_FILL,
  OBSERVE_CONTROL_FILL_ALPHA,
  OBSERVE_CONTROL_OUTLINE,
  OBSERVE_CONTROL_OUTLINE_ALPHA,
} from "@/lib/observeSensorStyle";
import { IntelGradeBadge } from "@/components/globe/IntelGradeBadge";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  DESK_NON_FOCUS_ALPHA,
  deskGradeVisual,
  deskSlotOpacity,
  deskSpotlightRadiusKm,
  haversineKm,
} from "@/lib/intelContract/deskFocus";
import {
  buildCorroborationRings,
  litRingCount,
} from "@/lib/intelContract/deskVerifySequence";
import {
  NEW_OBS_PULSE_MS,
  coolCssColor,
  timeWindowAlpha,
} from "@/lib/intelContract/deskDynamics";
import { aisTrackerArrowSvg, aisTrackerMark, aisVesselHeadingDeg } from "@/lib/aisVesselMarkers";
import { classifyMilAircraft } from "@/lib/milAircraftKind";
import { milAircraftIconSvg } from "@/lib/milAircraftIcon";
import type { AircraftPalette } from "@/lib/milAircraftSymbols";
import type { CesiumAlertItem, CesiumAlertKind } from "@/lib/cesiumAlerts";
import { attachRealtimeDayNight } from "@/lib/cesiumDayNight";
import { applyObserveOceanLook } from "@/lib/cesiumOceanLook";
import {
  holdObserveRender,
  installObserveRenderGovernor,
  observeRequestRender,
  releaseObserveRender,
  uninstallObserveRenderGovernor,
} from "@/lib/cesiumObserveRenderGovernor";
import {
  createObserveSurfaceController,
  type ObserveSurfaceController,
} from "@/lib/cesiumObserveSurface";
import {
  applyObserveLookToViewer,
  OBSERVE_LOOK_ORBIT_M,
  observeLookForHeightM,
} from "@/lib/cesiumObserveLook";
import {
  attachObserveIdleSpin,
  observeIdleSpinShouldRun,
  readObserveCinemaPref,
  startObserveBootIntro,
  writeObserveCinemaPref,
} from "@/lib/cesiumObserveStage";
import {
  attachObserveTrackDeadReckon,
  observeTrackViewFrom,
  startObserveEntityFollow,
  type ObserveLiveTrackFix,
  type ObserveLiveTrackSpec,
} from "@/lib/cesiumTrackedEntity";
import {
  clearObserveAircraftModels,
  selectObserveModelEntityIds,
  syncObserveAircraftModels,
  type ObserveModelCandidate,
} from "@/lib/cesiumTrackedModels";
import { getGlobeLod } from "@/lib/globeLod";
import {
  liveAirTrafficDisplayMax,
  liveAisDisplayMax,
  liveMilDisplayMax,
} from "@/lib/liveRenderGuard";
import {
  attachFirmsFirePulse,
  syncFirmsFireEntities,
  type CesiumFirmsFirePoint,
} from "@/lib/cesiumFirmsFires";
import {
  attachLiveuaStrikePulse,
  syncLiveuaStrikeEntities,
  type CesiumLiveuaStrikePoint,
} from "@/lib/cesiumLiveuaStrikes";
import {
  syncLiveuaGroundEntities,
  type CesiumLiveuaGroundPoint,
} from "@/lib/cesiumLiveuaGround";
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
  attachMaritimeOverlays,
  buildMaritimeOverlaySegments,
  resolveMaritimeOverlayPickId,
  type CesiumChokeRingInput,
  type MaritimeOverlaySegment,
} from "@/lib/cesiumMaritimeOverlays";
import {
  syncStraitReplayEntities,
  type StraitReplayScene,
} from "@/lib/cesiumStraitReplay";
import {
  syncStraitLabelEntities,
  syncStraitPortPointEntities,
  type StraitLabelEntity,
} from "@/lib/cesiumStraitCallouts";
import type { StraitPortMarker } from "@/lib/cesiumStraitOverlays";
import { observeStraitInitialCamera } from "@/lib/cesiumStraitScene";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import {
  resolveCinematicCamera,
  lookAtRangeForHeight,
  clampCesiumPitchToGlobeDeg,
  type FlyCameraOpts,
  resolveCinematicDurationMs,
} from "@/lib/globeCamera";
import {
  getNeptunTypeMeta,
  type NeptunAlerts,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import { useCesiumKeyboardNav } from "@/components/globe/hooks/useCesiumKeyboardNav";
import { useCesiumModifierLook } from "@/components/globe/hooks/useCesiumModifierLook";
import { useCesiumHorizonGuard } from "@/components/globe/hooks/useCesiumHorizonGuard";

const ESRI_WORLD_IMAGERY =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
/** Esri World Elevation 3D — Ion 없이도 산악 기복 */
const ESRI_WORLD_ELEVATION =
  "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer";
/** Cesium ion World Terrain (createWorldTerrainAsync / asset 1) */
const ION_WORLD_TERRAIN_ASSET = 1;
/** 위성·지역 줌에서 기복이 읽히도록 살짝 과장 (1=실측). Google 3D 메시와는 충돌하므로 그때는 1.0 */
const TERRAIN_VERTICAL_EXAGGERATION = 1.85;
/** Google Photorealistic SSE — Lite(사무 GPU) / Default(품질) */
const GOOGLE_3D_SSE_LITE = 18;
const GOOGLE_3D_SSE_DEFAULT = 14;
const GOOGLE_3D_SESSION_KEY = "cesium-google-3d-on";
const GOOGLE_3D_QUALITY_KEY = "cesium-google-3d-quality";
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
    camera?: FlyCameraOpts,
  ) => void;
  /** 하루 리플레이 — UTC 시각(0–24)으로 태양 시계(터미네이터) 설정 */
  setClockHourUtc: (hourUtc: number) => void;
  /** 실시간 시계로 복귀 */
  resetClockLive: () => void;
  /** 하루 재생 multiplier (0=정지, 예: 1200 ≈ 하루를 약 72초에) */
  setClockMultiplier: (multiplier: number) => void;
  captureFrame: () => Promise<HTMLCanvasElement | null>;
  /** 녹화용 라이브 WebGL 캔버스 */
  getCanvas: () => HTMLCanvasElement | null;
  /**
   * preserveDrawingBuffer=false 녹화 — present 직후 콜백 + continuous hold.
   * 반환 disposer로 해제.
   */
  bindPresenting: (onPresent: () => void) => () => void;
  /** 장면 링크용 카메라 (globe.gl altitude 단위) */
  pointOfView: () => { lat: number; lng: number; altitude: number } | null;
  /** 해협 이력 리플레이 마커 동기화 (null이면 제거) */
  setStraitReplayScene: (scene: StraitReplayScene | null) => void;
  /**
   * AIS/항공기 live track — Cesium trackedEntity + DR.
   * null이면 추적 해제. follow=false면 엔티티 DR만 유지·카메라는 해제.
   */
  setLiveTrackFollow: (spec: ObserveLiveTrackSpec | null) => void;
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
  /**
   * 속보 공간 — 지표 위 최대 카메라 높이(m).
   * 휠 줌아웃이 기울기를 유지한 채 멀어지기만 하지 못하게 막는다.
   */
  cameraCeilingM?: number | null;
  onSelectAlert?: (item: CesiumAlertItem) => void;
  /** 지정학과 동일 UKMTO 흑백 원 빗금 — 관측 모드 GroundPolyline */
  ukmtoIncidents?: UkmtoIncidentPoint[];
  /** NAVAREA 보라 빗금·외곽 */
  navareaFeatures?: NavareaFeaturePoint[];
  /** PortWatch/초크 글로우 링 */
  chokeRings?: CesiumChokeRingInput[];
  /**
   * 해협 씬 정적 밀도·통항 게이트 (viewport cull 결과).
   * MapLibre 레이어판 복제가 아니라 활성 해협 주변만.
   */
  straitOverlaySegments?: MaritimeOverlaySegment[];
  /** 통항 배지·번들 콜아웃·항구 라벨 */
  straitLabels?: StraitLabelEntity[];
  straitPorts?: StraitPortMarker[];
  /** LIVEUA 전선 속보 핀 */
  liveuaPins?: Array<{
    id: string;
    title: string;
    lat: number;
    lng: number;
    imageUrl?: string;
    /** 72h 시간 페이드·신규 펄스 */
    publishedAt?: string | null;
  }>;
  /** 「위치로 가기」로 포커스된 LiveUA 사건 — 핀 강조 */
  focusedLiveuaId?: string | null;
  /** 워치보드 안건 포커스 — 스포트라이트·등급 핀·PIR 슬롯 */
  deskFocus?: import("@/lib/intelContract/deskFocus").DeskFocus | null;
  /** 드론·미사일이 실제로 떨어진 좌표 — 폭발·화염·연기 */
  liveuaStrikes?: CesiumLiveuaStrikePoint[];
  /** 보병·기갑·경장갑 공격 좌표 — 교차 소총 마커 */
  liveuaGround?: CesiumLiveuaGroundPoint[];
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
  /** 지명 (상위 filterObservePlaceLabels — 국가→마을 줌 LOD) */
  placeLabels?: CesiumPlaceLabel[];
  placeLabelLang?: LabelLanguage;
  showPlaceLabels?: boolean;
  /** conflict-events + displayGrade */
  conflictEvents?: CesiumConflictEventPoint[];
  showConflictEvents?: boolean;
  onSelectConflictEvent?: (event: CesiumConflictEventPoint) => void;
  /** viewer가 준비되어 flyTo를 받을 수 있게 된 시점 — 관측 모드 전환 후 flyTo 대기에 사용 */
  onReady?: () => void;
  /**
   * next/dynamic 은 전달된 ref 를 `{ retry }` 로 덮어써 flyTo 가 사라진다.
   * 부모 useRef 를 prop 으로 받아 실제 카메라 핸들을 여기 심는다.
   */
  handleRef?: { current: CesiumGlobeHandle | null } | null;
  /** 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용 */
  onSelectEntity?: (selection: CesiumEntitySelection) => void;
  /**
   * 유저가 드래그로 카메라를 뺏을 때 — follow 해제.
   * handoff/flyTo 등 프로그램 비행은 호출하지 않음.
   */
  onUserBreakFollow?: () => void;
};

type StackKind = "esri" | "ion" | "google3d";
type ErrorKind = "chunk" | "assets" | "other";

function readGoogle3dSessionPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = sessionStorage.getItem(GOOGLE_3D_SESSION_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* private mode */
  }
  return true;
}

function readGoogle3dQualityPref(): "lite" | "default" {
  if (typeof window === "undefined") return "lite";
  try {
    const raw = sessionStorage.getItem(GOOGLE_3D_QUALITY_KEY);
    if (raw === "default") return "default";
  } catch {
    /* private mode */
  }
  return "lite";
}

function google3dSseForQuality(quality: "lite" | "default"): number {
  return quality === "default" ? GOOGLE_3D_SSE_DEFAULT : GOOGLE_3D_SSE_LITE;
}

/** quality SSE + 고도 bias — photoreal geometric LOD 정합 */
function google3dSseForLook(
  quality: "lite" | "default",
  heightM: number,
): number {
  return google3dSseForQuality(quality) + observeLookForHeightM(heightM).sseBias;
}

function refreshObserveAircraftModels(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  trackedId: string | null,
  candidates?: ObserveModelCandidate[],
  headings?: Map<string, number | null>,
): void {
  const aircraftTracked =
    trackedId &&
    (trackedId.startsWith("mil:") || trackedId.startsWith("civ:"))
      ? trackedId
      : null;

  let list = candidates;
  let headingMap = headings;
  if (!list || !headingMap) {
    list = [];
    headingMap = new Map();
    const time = viewer.clock.currentTime;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string") continue;
      if (!entity.id.startsWith("mil:") && !entity.id.startsWith("civ:")) continue;
      const pos = entity.position?.getValue(time);
      if (!pos) continue;
      const carto = Cesium.Cartographic.fromCartesian(pos);
      list.push({
        entityId: entity.id,
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
        headingDeg: null,
      });
      headingMap.set(entity.id, null);
    }
  }

  const carto = viewer.camera.positionCartographic;
  const cameraCenter = carto
    ? {
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
      }
    : null;
  const cameraHeightM = carto?.height ?? Number.POSITIVE_INFINITY;

  const modelIds = selectObserveModelEntityIds(aircraftTracked, list, {
    cameraCenter,
    cameraHeightM,
  });
  if (modelIds.size === 0) {
    clearObserveAircraftModels(Cesium, viewer);
    return;
  }
  syncObserveAircraftModels(
    Cesium,
    viewer,
    modelIds,
    headingMap,
    aircraftTracked,
  );
}

const CHUNK_RELOAD_KEY = "cesium-chunk-reload";

/** 카메라 높이 → liveRenderGuard와 같은 LOD 티어 */
function observeLodTierFromViewer(
  viewer: import("cesium").Viewer,
): import("@/lib/globeLod").GlobeLodTier {
  const heightM = viewer.camera.positionCartographic?.height ?? EARTH_RADIUS_M * 2;
  const altitude = Math.max(0.02, heightM / EARTH_RADIUS_M);
  return getGlobeLod(altitude).tier;
}

/** 뷰포트 중심에 가까운 순으로 잘라 clutter 예산 적용 */
function takeNearestByBudget<T extends { lat: number; lng: number }>(
  items: T[],
  max: number,
  centerLat: number,
  centerLng: number,
): T[] {
  if (items.length <= max) return items;
  const scored = items.map((item, index) => {
    const dLat = item.lat - centerLat;
    const dLng = item.lng - centerLng;
    return { index, d2: dLat * dLat + dLng * dLng };
  });
  scored.sort((a, b) => a.d2 - b.d2);
  const keep = new Set(scored.slice(0, max).map((s) => s.index));
  return items.filter((_, i) => keep.has(i));
}
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
const CESIUM_AIRCRAFT_SIZE = { mil: 34, civ: 24 } as const;
const aircraftBillboardUriCache = new Map<string, string>();
const aisBillboardUriCache = new Map<string, string>();
/** 해수면 마커를 지형/3D Tiles에 묻히지 않게 띄움 (m) */
const CESIUM_AIS_HEIGHT_M = 1_200;
/**
 * 함선 화살 화면 크기 — 카메라와의 거리(m).
 * 가까운 줌(약 120km)에서 크게, 지구 전경(약 2.2만 km)에서 작게.
 * 그 사이는 선형으로 이어져 줌인·줌아웃에 같이 움직인다.
 */
const AIS_TRACKER_NEAR_M = 120_000;
const AIS_TRACKER_NEAR_SCALE = 1.85;
const AIS_TRACKER_FAR_M = 22_000_000;
const AIS_TRACKER_FAR_SCALE = 0.22;
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

/** MarineTraffic식 침로 화살 — 선종별 색·실루엣. 코=북쪽, rotation은 침로. */
function cesiumAisBillboard(
  vessel: AisVessel,
): { image: string; width: number; height: number; rotation: number } {
  const mark = aisTrackerMark(vessel);
  const heading = aisVesselHeadingDeg(vessel, { allowStationaryHeading: true });
  const key = `tracker:${mark.kind}:${mark.px}`;
  let image = aisBillboardUriCache.get(key);
  if (!image) {
    image = svgDataUri(aisTrackerArrowSvg(mark.kind, mark.color, mark.px));
    aisBillboardUriCache.set(key, image);
  }
  const rotation = heading == null ? 0 : -((heading * Math.PI) / 180);
  return { image, width: mark.px, height: mark.px, rotation };
}

/** 침로·속력으로 짧은 궤적 꼬리 (히스토리 없을 때 해협 밀도용) */
function aisHeadingTrailPositions(
  Cesium: typeof import("cesium"),
  vessel: AisVessel,
  heightM: number,
): import("cesium").Cartesian3[] | null {
  const heading = aisVesselHeadingDeg(vessel, { allowStationaryHeading: true });
  const sog = vessel.speedOverGround;
  if (heading == null || sog == null || sog < 1.5) return null;
  const minutes = Math.min(45, Math.max(12, sog * 1.8));
  const distKm = (sog * 1.852 * minutes) / 60;
  const distDeg = distKm / 111;
  const rad = ((heading + 180) * Math.PI) / 180;
  const lat2 = vessel.lat + distDeg * Math.cos(rad);
  const lng2 =
    vessel.lng + distDeg * Math.sin(rad) / Math.max(0.2, Math.cos((vessel.lat * Math.PI) / 180));
  return [
    Cesium.Cartesian3.fromDegrees(lng2, lat2, heightM * 0.85),
    Cesium.Cartesian3.fromDegrees(vessel.lng, vessel.lat, heightM),
  ];
}

function syncAisBillboardEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  prefix: "ais" | "disguised",
  items: AisVessel[],
  preservePositionEntityId?: string | null,
): void {
  const seen = new Set<string>();
  const heightM = prefix === "disguised" ? CESIUM_AIS_HEIGHT_M + 200 : CESIUM_AIS_HEIGHT_M;
  const scaleByDistance = new Cesium.NearFarScalar(
    AIS_TRACKER_NEAR_M,
    AIS_TRACKER_NEAR_SCALE,
    AIS_TRACKER_FAR_M,
    AIS_TRACKER_FAR_SCALE,
  );
  const trailColor = Cesium.Color.fromCssColorString("rgba(125, 211, 252, 0.55)");

  for (const item of items) {
    const lat = item.lat;
    const lng = item.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const id = `${prefix}:${item.mmsi}`;
    seen.add(id);
    const trailId = `${prefix}-trail:${item.mmsi}`;
    seen.add(trailId);
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, heightM);
    const billboard = cesiumAisBillboard(item);
    const name = item.shipName || item.mmsi;
    const trailPts = aisHeadingTrailPositions(Cesium, item, heightM);

    const existing = viewer.entities.getById(id);
    if (existing) {
      // live track DR CallbackProperty는 위치 소유권 유지
      if (id !== preservePositionEntityId) {
        existing.position = new Cesium.ConstantPositionProperty(position);
      }
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
    } else {
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

    const trailExisting = viewer.entities.getById(trailId);
    if (trailPts && trailPts.length >= 2) {
      if (trailExisting?.polyline) {
        trailExisting.polyline.positions = new Cesium.ConstantProperty(trailPts);
        trailExisting.show = true;
      } else if (!trailExisting) {
        viewer.entities.add({
          id: trailId,
          show: true,
          polyline: {
            positions: trailPts,
            width: 1.5,
            material: new Cesium.ColorMaterialProperty(trailColor),
            clampToGround: false,
          },
        });
      }
    } else if (trailExisting) {
      trailExisting.show = false;
    }
  }

  const toRemove: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (typeof entity.id !== "string") continue;
    const isShip = entity.id.startsWith(`${prefix}:`);
    const isTrail = entity.id.startsWith(`${prefix}-trail:`);
    if ((isShip || isTrail) && !seen.has(entity.id)) {
      toRemove.push(entity);
    }
  }
  for (const entity of toRemove) {
    viewer.entities.remove(entity);
  }
}

/** depth-test 끈 빌보드/점이 지구를 뚫고 보이지 않게 — 가시 반구만 show */
const GLOBE_OCCLUSION_PREFIXES = [
  "ais:",
  "disguised:",
  "neptun:",
  "mil:",
  "civ:",
  "alert:",
  "liveua:",
  "liveua-strike:",
  "liveua-ground:",
  "firms:",
  "nk-missile:",
  "conflict:",
] as const;

/** 카메라가 돌 때마다 지구 뒤편 점·함선·항공기를 숨김 */
function updateGlobeEntityOcclusion(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
): void {
  const occluder = createGlobeOccluder(Cesium, viewer);
  const tracked = viewer.trackedEntity;
  for (const entity of viewer.entities.values) {
    if (typeof entity.id !== "string") continue;
    if (!GLOBE_OCCLUSION_PREFIXES.some((p) => entity.id.startsWith(p))) continue;
    // alertline 은 지면 클램프 폴리라인 — 오클루전 대상 아님
    if (entity.id.startsWith("alertline:")) continue;
    // live track 대상은 카메라가 따라가므로 항상 표시
    if (tracked && entity === tracked) {
      entity.show = true;
      continue;
    }
    const position = entity.position?.getValue(viewer.clock.currentTime);
    if (!position) continue;
    entity.show = occluder.isPointVisible(position);
  }
}

/** 공중 고도 — MapLibre 지상 배지와 달리 떠 보이게 */
const CESIUM_NEPTUN_HEIGHT_M: Record<string, number> = {
  uav: 3_200,
  recon: 4_200,
  missile: 11_000,
  ballistic: 22_000,
  kab: 6_500,
  mig31k: 14_000,
  unknown: 5_000,
};
const CESIUM_NEPTUN_SIZE_PX: Record<string, number> = {
  uav: 26,
  recon: 24,
  missile: 30,
  ballistic: 34,
  kab: 28,
  mig31k: 30,
  unknown: 26,
};
const CESIUM_NEPTUN_TRAIL_MAX = 14;
const neptunBillboardUriCache = new Map<string, string>();

function neptunBillboardImage(colorCss: string, kind: string): string {
  const key = `${kind}:${colorCss}`;
  let image = neptunBillboardUriCache.get(key);
  if (!image) {
    const isMissile = kind === "missile" || kind === "ballistic" || kind === "kab";
    const svg = isMissile
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <path d="M16 3 L20 14 L16 12 L12 14 Z" fill="${colorCss}" stroke="#fff" stroke-width="1.1"/>
          <circle cx="16" cy="20" r="5" fill="${colorCss}" stroke="#fff" stroke-width="1.2"/>
          <circle cx="16" cy="20" r="9" fill="none" stroke="${colorCss}" stroke-width="1.1" opacity="0.4"/>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
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
  const n = sliced.length;
  sliced.forEach((p, i) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
    const t = n <= 1 ? 1 : (i + 1) / (n + 1);
    pts.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, heightM * (0.55 + 0.4 * t)));
  });
  const lat = threat.predictedLat ?? threat.lat;
  const lon = threat.predictedLon ?? threat.lon;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    pts.push(Cesium.Cartesian3.fromDegrees(lon, lat, heightM));
  }
  return pts;
}

/** NEPTUN UAV·미사일·폭탄 — Cesium 공중 빌보드 + 상승 궤적 + 지면 스템 */
function syncNeptunBillboardEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  items: NeptunLiveThreat[],
): void {
  const seen = new Set<string>();
  const scaleByDistance = new Cesium.NearFarScalar(1.2e5, 1.55, 5.0e6, 0.4);
  const occluder = createGlobeOccluder(Cesium, viewer);

  for (const threat of items) {
    const lat = threat.predictedLat ?? threat.lat;
    const lon = threat.predictedLon ?? threat.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const meta = getNeptunTypeMeta(threat.type);
    const heightM = CESIUM_NEPTUN_HEIGHT_M[threat.type] ?? CESIUM_NEPTUN_HEIGHT_M.unknown;
    const sizePx = CESIUM_NEPTUN_SIZE_PX[threat.type] ?? CESIUM_NEPTUN_SIZE_PX.unknown;
    const id = `neptun:${threat.id}`;
    const stemId = `neptun-stem:${threat.id}`;
    seen.add(id);
    seen.add(stemId);
    const position = Cesium.Cartesian3.fromDegrees(lon, lat, heightM);
    const ground = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    const visible = occluder.isPointVisible(position);
    const image = neptunBillboardImage(meta.color, threat.type);
    const name = threat.title || meta.label;
    const trailPts = neptunTrailPositions(Cesium, threat, heightM);
    const trailColor = Cesium.Color.fromCssColorString(meta.color).withAlpha(0.78);
    const stemColor = Cesium.Color.fromCssColorString(meta.color).withAlpha(0.38);

    const existing = viewer.entities.getById(id);
    if (existing) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = name;
      existing.show = visible;
      if (existing.billboard) {
        existing.billboard.image = new Cesium.ConstantProperty(image);
        existing.billboard.width = new Cesium.ConstantProperty(sizePx);
        existing.billboard.height = new Cesium.ConstantProperty(sizePx);
        existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(
          Number.POSITIVE_INFINITY,
        );
        existing.billboard.scaleByDistance = new Cesium.ConstantProperty(scaleByDistance);
      }
      if (trailPts.length >= 2) {
        if (existing.polyline) {
          existing.polyline.positions = new Cesium.ConstantProperty(trailPts);
          existing.polyline.material = new Cesium.ColorMaterialProperty(trailColor);
        } else {
          existing.polyline = new Cesium.PolylineGraphics({
            positions: trailPts,
            width: 2.4,
            material: trailColor,
            clampToGround: false,
            arcType: Cesium.ArcType.NONE,
          });
        }
      } else if (existing.polyline) {
        existing.polyline = undefined;
      }
    } else {
      viewer.entities.add({
        id,
        name,
        position,
        show: visible,
        billboard: new Cesium.BillboardGraphics({
          image,
          width: sizePx,
          height: sizePx,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance,
          color: Cesium.Color.WHITE,
        }),
        ...(trailPts.length >= 2
          ? {
              polyline: new Cesium.PolylineGraphics({
                positions: trailPts,
                width: 2.4,
                material: trailColor,
                clampToGround: false,
                arcType: Cesium.ArcType.NONE,
              }),
            }
          : {}),
      });
    }

    const stemExisting = viewer.entities.getById(stemId);
    const stemPositions = [ground, position];
    if (stemExisting) {
      stemExisting.show = visible;
      if (stemExisting.polyline) {
        stemExisting.polyline.positions = new Cesium.ConstantProperty(stemPositions);
        stemExisting.polyline.material = new Cesium.ColorMaterialProperty(stemColor);
      }
    } else {
      viewer.entities.add({
        id: stemId,
        show: visible,
        polyline: new Cesium.PolylineGraphics({
          positions: stemPositions,
          width: 1.2,
          material: stemColor,
          clampToGround: false,
          arcType: Cesium.ArcType.NONE,
        }),
      });
    }
  }

  const toRemove: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      (entity.id.startsWith("neptun:") || entity.id.startsWith("neptun-stem:")) &&
      !seen.has(entity.id)
    ) {
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
  preservePositionEntityId?: string | null,
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
      if (id !== preservePositionEntityId) {
        existing.position = new Cesium.ConstantPositionProperty(position);
      }
      existing.name = name;
      existing.show = id === preservePositionEntityId ? true : visible;
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
        // mil: 궤도에서도 실루엣이 읽히게 — 지구 뒤(오클루전)만 show로 숨김
        existing.billboard.disableDepthTestDistance = new Cesium.ConstantProperty(
          Number.POSITIVE_INFINITY,
        );
      } else {
        existing.billboard = new Cesium.BillboardGraphics({
          image,
          width: sizePx,
          height: sizePx,
          rotation,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
 * 북한·중국·러시아·이란 국경 — dark halo + coral core 이중선.
 * 지면 폭(m)으로 줌에 비례해 얇아지고, 가까이에서도 알람 테이프처럼 번지지 않게 캡.
 */
function attachAxisHubBorders(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  rings: LngLatRing[],
): () => void {
  if (!Cesium.GroundPolylinePrimitive.isSupported(viewer.scene)) {
    return () => {};
  }

  const coreColor = Cesium.Color.fromCssColorString(OBSERVE_AXIS_BORDER);
  const haloColor = Cesium.Color.fromCssColorString(OBSERVE_AXIS_BORDER_HALO);
  const coreIds: string[] = [];
  const haloIds: string[] = [];

  const ringFlats: number[][] = [];
  for (const ring of rings) {
    const flat: number[] = [];
    for (const pair of ring) {
      const lng = pair[0];
      const lat = pair[1];
      if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) {
        continue;
      }
      flat.push(lng, lat);
    }
    if (flat.length >= 8) ringFlats.push(flat);
  }
  if (!ringFlats.length) return () => {};

  const makeInstances = (prefix: string, idsOut: string[]) =>
    ringFlats.map((flat, index) => {
      const id = `${prefix}:${index}`;
      idsOut.push(id);
      return new Cesium.GeometryInstance({
        id,
        geometry: new Cesium.GroundPolylineGeometry({
          positions: Cesium.Cartesian3.fromDegreesArray(flat),
          width: 3,
          arcType: Cesium.ArcType.GEODESIC,
          granularity: 0,
        }),
      });
    });

  const haloPrimitive = new Cesium.GroundPolylinePrimitive({
    geometryInstances: makeInstances("hub-border-halo", haloIds),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType("Color", { color: haloColor }),
    }),
    classificationType: Cesium.ClassificationType.BOTH,
    allowPicking: false,
    asynchronous: true,
  });
  const corePrimitive = new Cesium.GroundPolylinePrimitive({
    geometryInstances: makeInstances("hub-border", coreIds),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType("Color", { color: coreColor }),
    }),
    classificationType: Cesium.ClassificationType.BOTH,
    allowPicking: false,
    asynchronous: true,
  });
  viewer.scene.groundPrimitives.add(haloPrimitive);
  viewer.scene.groundPrimitives.add(corePrimitive);

  const scratchCarto = new Cesium.Cartographic();
  let lastCorePx = -1;
  let lastHaloPx = -1;

  const writeWidths = (
    primitive: import("cesium").GroundPolylinePrimitive,
    ids: string[],
    px: number,
  ): boolean => {
    if (primitive.isDestroyed() || !primitive.ready) return false;
    let wrote = false;
    try {
      for (const id of ids) {
        const attrs = primitive.getGeometryInstanceAttributes(id);
        const slot = attrs?.width;
        if (!slot) continue;
        slot[0] = px;
        attrs.width = slot;
        wrote = true;
      }
    } catch {
      return false;
    }
    return wrote;
  };

  const removePreRender = viewer.scene.preRender.addEventListener(() => {
    if (viewer.isDestroyed()) return;
    const carto = Cesium.Cartographic.fromCartesian(
      viewer.camera.positionWC,
      viewer.scene.globe.ellipsoid,
      scratchCarto,
    );
    const frustum = viewer.camera.frustum as { fovy?: number };
    const view = {
      cameraHeightM: carto.height,
      canvasHeightPx: viewer.scene.canvas.clientHeight,
      fovyRad: frustum.fovy ?? Math.PI / 3,
    };
    const corePx = axisHubBorderWidthPx({ ...view, widthM: AXIS_HUB_BORDER_WIDTH_M });
    const haloPx = axisHubBorderWidthPx({
      ...view,
      widthM: AXIS_HUB_BORDER_HALO_WIDTH_M,
      maxPx: 12,
    });
    if (corePx !== lastCorePx && writeWidths(corePrimitive, coreIds, corePx)) {
      lastCorePx = corePx;
    }
    if (haloPx !== lastHaloPx && writeWidths(haloPrimitive, haloIds, haloPx)) {
      lastHaloPx = haloPx;
    }
  });

  const destroyPrimitive = (primitive: import("cesium").GroundPolylinePrimitive) => {
    if (primitive.isDestroyed()) return;
    if (!viewer.isDestroyed()) {
      viewer.scene.groundPrimitives.remove(primitive);
    } else {
      primitive.destroy();
    }
  };

  return () => {
    removePreRender();
    destroyPrimitive(haloPrimitive);
    destroyPrimitive(corePrimitive);
  };
}

export const CesiumSatelliteGlobe = forwardRef<CesiumGlobeHandle, CesiumSatelliteGlobeProps>(
  function CesiumSatelliteGlobe(
    {
      className = "",
      initial = observeStraitInitialCamera("hormuz"),
      aisVessels = [],
      disguisedVessels = [],
      milAircraft = [],
      civAircraft = [],
      showAis = false,
      showAisMilitary = true,
      showAisCommercial = true,
      showDisguisedVessels = false,
      showMilitaryActivity = true,
      showAirTraffic = false,
      neptunThreats = [],
      showNeptun = false,
      alertPins = [],
      cameraCeilingM = null,
      onSelectAlert,
      ukmtoIncidents = [],
      navareaFeatures = [],
      chokeRings = [],
      straitOverlaySegments = [],
      straitLabels = [],
      straitPorts = [],
      liveuaPins = [],
      focusedLiveuaId = null,
      deskFocus = null,
      liveuaStrikes = [],
      liveuaGround = [],
      onSelectLiveuaPin,
      controlGeoJson = null,
      firmsFires = [],
      showFirmsFires = false,
      missileLaunches = [],
      showMissileLaunches = false,
      neptunAlerts = null,
      showAirRaidZones = false,
      placeLabels = [],
      placeLabelLang = "ko",
      showPlaceLabels = true,
      conflictEvents = [],
      showConflictEvents = false,
      onSelectConflictEvent,
      onReady,
      handleRef,
      onSelectEntity,
      onUserBreakFollow,
    },
    ref,
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [stack, setStack] = useState<StackKind>("esri");
  /** Google 3D 타일셋이 로드됐을 때 세션 토글 (GPU 완화) */
  const [google3dOn, setGoogle3dOn] = useState(true);
  const [google3dQuality, setGoogle3dQuality] = useState<"lite" | "default">(
    () => readGoogle3dQualityPref(),
  );
  /** Pretty Stage Cinema — 인트로·유휴 스핀·림/구름 강화 (Lite 기본) */
  const [cinemaOn, setCinemaOn] = useState(() => readObserveCinemaPref());
  /** photoreal 타일 선명화 중 칩 */
  const [surfaceSettling, setSurfaceSettling] = useState(false);
  const [selectedConflict, setSelectedConflict] =
    useState<CesiumConflictEventPoint | null>(null);
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
  const googleTilesetRef = useRef<import("cesium").Cesium3DTileset | null>(null);
  const dayImageryLayerRef = useRef<import("cesium").ImageryLayer | null>(null);
  const osmBuildingsRef = useRef<{ show: boolean } | null>(null);
  const liveTrackFixRef = useRef<ObserveLiveTrackFix | null>(null);
  /** handoff fly 중·tracked 중 모두 true — 폴링이 fly를 재시작하지 않게 */
  const liveTrackFollowingRef = useRef(false);
  /** flyTo/handoff 중 — 유저 드래그 unlock 억제 */
  const programmaticCameraRef = useRef(false);
  const liveTrackFrameDisposeRef = useRef<(() => void) | null>(null);
  const liveTrackDrDisposeRef = useRef<(() => void) | null>(null);
  const liveTrackEntityIdRef = useRef<string | null>(null);
  const onUserBreakFollowRef = useRef(onUserBreakFollow);
  onUserBreakFollowRef.current = onUserBreakFollow;
  const clickHandlerRef = useRef<import("cesium").ScreenSpaceEventHandler | null>(null);
  const mountAtRef = useRef(Date.now());
  const contextLostRecreateRef = useRef(false);
  const softErrorTimerRef = useRef<number | null>(null);
  const surfaceControllerRef = useRef<ObserveSurfaceController | null>(null);
  const placeOverlayRef = useRef<ObservePlaceOverlayHandle | null>(null);
  /** 고도 look SSE — 의미 있는 변화만 armSettle */
  const lookSseAppliedRef = useRef<number | null>(null);
  const google3dQualityRef = useRef(google3dQuality);
  google3dQualityRef.current = google3dQuality;
  const google3dOnRef = useRef(google3dOn);
  google3dOnRef.current = google3dOn;
  const cinemaOnRef = useRef(cinemaOn);
  cinemaOnRef.current = cinemaOn;
  const idleSpinPointerActiveRef = useRef(false);
  const bootIntroDoneRef = useRef(false);

  // 클릭 핸들러가 매 폴링마다 재등록되지 않도록 최신 데이터를 ref로 보관
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onSelectEntityRef = useRef(onSelectEntity);
  onSelectEntityRef.current = onSelectEntity;
  const onSelectAlertRef = useRef(onSelectAlert);
  onSelectAlertRef.current = onSelectAlert;
  const onSelectLiveuaPinRef = useRef(onSelectLiveuaPin);
  onSelectLiveuaPinRef.current = onSelectLiveuaPin;
  const onSelectConflictEventRef = useRef(onSelectConflictEvent);
  onSelectConflictEventRef.current = onSelectConflictEvent;
  const alertPinsRef = useRef(alertPins);
  alertPinsRef.current = alertPins;
  const liveuaPinsRef = useRef(liveuaPins);
  liveuaPinsRef.current = liveuaPins;
  /** 신규 LiveUA 관측 펄스 — id → firstSeenMs */
  const liveuaFirstSeenRef = useRef<Map<string, number>>(new Map());
  const conflictEventsRef = useRef(conflictEvents);
  conflictEventsRef.current = conflictEvents;
  const aisVesselsRef = useRef(aisVessels);
  aisVesselsRef.current = aisVessels;
  const disguisedVesselsRef = useRef(disguisedVessels);
  disguisedVesselsRef.current = disguisedVessels;
  const milAircraftRef = useRef(milAircraft);
  milAircraftRef.current = milAircraft;
  const civAircraftRef = useRef(civAircraft);
  civAircraftRef.current = civAircraft;

  const innerHandleRef = useRef<CesiumGlobeHandle | null>(null);
  const straitReplayEntityIdsRef = useRef<Set<string>>(new Set());
  const straitReplaySceneRef = useRef<StraitReplayScene | null>(null);
  useImperativeHandle(
    innerHandleRef,
    (): CesiumGlobeHandle => ({
      flyTo: (
        lat: number,
        lng: number,
        altitude?: number,
        durationMs?: number,
        camera?: FlyCameraOpts,
      ) => {
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return;
        const heightM = altitudeToHeightM(altitude ?? 0.55);
        const resolved = resolveCinematicCamera(camera);
        // 고도 대비 pitch가 얕으면 시선이 수평선 위(우주)로 간다 → lookAt 포함 항상 클램프.
        const cesiumPitchDeg = clampCesiumPitchToGlobeDeg(
          heightM,
          resolved.pitch - 90,
        );
        const orientation = {
          heading: Cesium.Math.toRadians(resolved.bearing),
          pitch: Cesium.Math.toRadians(cesiumPitchDeg),
          roll: 0,
        };
        const destination = Cesium.Cartesian3.fromDegrees(lng, lat, heightM);
        // lookAt: lat/lng가 화면 중앙에 오도록 시선 반대쪽 카메라 위치를 Cesium이 계산.
        // (기본 모드는 lat/lng를 카메라 위치로 쓰므로 비스듬한 pitch에서 대상이 화면 밖으로 빠진다.)
        if (resolved.lookAt) {
          const target = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
          const sphere = new Cesium.BoundingSphere(target, 1);
          const offset = new Cesium.HeadingPitchRange(
            orientation.heading,
            orientation.pitch,
            lookAtRangeForHeight(heightM, cesiumPitchDeg),
          );
          if (durationMs === 0) {
            programmaticCameraRef.current = true;
            viewer.camera.flyToBoundingSphere(sphere, { offset, duration: 0 });
            programmaticCameraRef.current = false;
            return;
          }
          const lookCurrentHeight =
            viewer.camera.positionCartographic?.height ?? heightM;
          programmaticCameraRef.current = true;
          viewer.camera.flyToBoundingSphere(sphere, {
            offset,
            duration: resolveCinematicDurationMs(durationMs) / 1000,
            maximumHeight: Math.max(
              heightM * 2.4,
              heightM + 2_200_000,
              lookCurrentHeight + 50_000,
            ),
            easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            complete: () => {
              programmaticCameraRef.current = false;
            },
            cancel: () => {
              programmaticCameraRef.current = false;
            },
          });
          return;
        }
        // durationMs === 0은 즉시 스냅(인터럽트용). undefined는 시네마틱.
        if (durationMs === 0) {
          programmaticCameraRef.current = true;
          viewer.camera.setView({ destination, orientation });
          programmaticCameraRef.current = false;
          return;
        }
        const durationSec = resolveCinematicDurationMs(durationMs) / 1000;
        const currentHeight =
          viewer.camera.positionCartographic?.height ?? heightM;
        // 현재 고도보다 maximumHeight가 낮으면 비행 경로가 즉시 끊긴다.
        const maximumHeight = Math.max(
          heightM * 2.4,
          heightM + 2_200_000,
          currentHeight + 50_000,
        );
        programmaticCameraRef.current = true;
        viewer.camera.flyTo({
          destination,
          orientation,
          duration: durationSec,
          maximumHeight,
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
          complete: () => {
            programmaticCameraRef.current = false;
          },
          cancel: () => {
            programmaticCameraRef.current = false;
          },
        });
      },
      setClockHourUtc: (hourUtc: number) => {
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
        // PDB=false: postRender에서 동기 복사해야 버퍼가 비지 않음
        return new Promise<HTMLCanvasElement | null>((resolve) => {
          let done = false;
          const finish = (out: HTMLCanvasElement | null) => {
            if (done) return;
            done = true;
            resolve(out);
          };
          const remove = viewer.scene.postRender.addEventListener(() => {
            remove();
            try {
              const out = document.createElement("canvas");
              out.width = source.width;
              out.height = source.height;
              const ctx = out.getContext("2d");
              if (!ctx) {
                finish(null);
                return;
              }
              ctx.drawImage(source, 0, 0);
              finish(out);
            } catch {
              finish(null);
            }
          });
          viewer.scene.requestRender();
          window.setTimeout(() => {
            try {
              remove();
            } catch {
              /* ignore */
            }
            finish(null);
          }, 2_000);
        });
      },
      getCanvas: () => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return null;
        return viewer.scene.canvas;
      },
      bindPresenting: (onPresent) => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return () => undefined;
        holdObserveRender("record-clip");
        const remove = viewer.scene.postRender.addEventListener(() => {
          if (viewer.isDestroyed()) return;
          onPresent();
        });
        observeRequestRender();
        return () => {
          remove();
          releaseObserveRender("record-clip");
        };
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
      setStraitReplayScene: (scene) => {
        straitReplaySceneRef.current = scene;
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return;
        straitReplayEntityIdsRef.current = syncStraitReplayEntities(
          Cesium as never,
          viewer.entities as never,
          scene,
          straitReplayEntityIdsRef.current,
        );
        observeRequestRender();
      },
      setLiveTrackFollow: (spec) => {
        const viewer = viewerRef.current;
        const Cesium = cesiumModRef.current;
        if (!viewer || !Cesium || viewer.isDestroyed()) return;

        const clearTrack = () => {
          // handoff fly + tracked frame 일괄 취소
          liveTrackFrameDisposeRef.current?.();
          liveTrackFrameDisposeRef.current = null;
          liveTrackDrDisposeRef.current?.();
          liveTrackDrDisposeRef.current = null;
          if (!viewer.isDestroyed()) {
            try {
              viewer.camera.cancelFlight();
            } catch {
              /* ignore */
            }
            if (viewer.trackedEntity) {
              viewer.trackedEntity = undefined;
            }
          }
          // DR 해제 — 다음 sync가 ConstantPosition으로 복구
          const prevId = liveTrackEntityIdRef.current;
          if (prevId) {
            const ent = viewer.entities.getById(prevId);
            const fix = liveTrackFixRef.current;
            if (ent && fix && fix.entityId === prevId) {
              ent.position = new Cesium.ConstantPositionProperty(
                Cesium.Cartesian3.fromDegrees(fix.lng, fix.lat, fix.heightM),
              );
            }
          }
          liveTrackEntityIdRef.current = null;
          liveTrackFixRef.current = null;
          liveTrackFollowingRef.current = false;
          // clutter 통과 ADS-B 전부 glTF (원거리면 sync 쪽에서 빌보드 LOD)
          refreshObserveAircraftModels(Cesium, viewer, null);
          releaseObserveRender("tracked-entity");
          observeRequestRender();
        };

        if (!spec) {
          clearTrack();
          return;
        }

        const nextFix: ObserveLiveTrackFix = {
          entityId: spec.entityId,
          kind: spec.kind,
          lat: spec.lat,
          lng: spec.lng,
          heightM: spec.heightM,
          speedKn: spec.speedKn,
          courseDeg: spec.courseDeg,
          at: Date.now(),
        };

        const entityChanged =
          liveTrackEntityIdRef.current !== spec.entityId;
        liveTrackFixRef.current = nextFix;

        if (entityChanged) {
          liveTrackFrameDisposeRef.current?.();
          liveTrackFrameDisposeRef.current = null;
          liveTrackDrDisposeRef.current?.();
          liveTrackDrDisposeRef.current = null;
          liveTrackFollowingRef.current = false;
          if (viewer.trackedEntity) {
            viewer.trackedEntity = undefined;
          }
          try {
            viewer.camera.cancelFlight();
          } catch {
            /* ignore */
          }
          const prevId = liveTrackEntityIdRef.current;
          if (prevId && prevId !== spec.entityId) {
            const prev = viewer.entities.getById(prevId);
            if (prev) {
              prev.position = new Cesium.ConstantPositionProperty(
                Cesium.Cartesian3.fromDegrees(
                  nextFix.lng,
                  nextFix.lat,
                  nextFix.heightM,
                ),
              );
            }
          }
          liveTrackEntityIdRef.current = spec.entityId;
        }

        let entity = viewer.entities.getById(spec.entityId);
        if (!entity) {
          // 엔티티 sync 전 — 플레이스홀더
          entity = viewer.entities.add({
            id: spec.entityId,
            position: Cesium.Cartesian3.fromDegrees(
              spec.lng,
              spec.lat,
              spec.heightM,
            ),
            show: true,
          });
        }

        // display-position 캐시는 엔티티당 1회 부착. fix 갱신은 getFix 클로저로 반영.
        if (entityChanged || !liveTrackDrDisposeRef.current) {
          liveTrackDrDisposeRef.current?.();
          liveTrackDrDisposeRef.current = attachObserveTrackDeadReckon(
            Cesium,
            viewer,
            entity,
            () => liveTrackFixRef.current,
          );
        }

        if (spec.follow) {
          // 새 선택·follow 재개만 handoff. fly 중/추적 중 폴링은 재시작 금지.
          const needsHandoff =
            entityChanged || !liveTrackFollowingRef.current;
          if (needsHandoff) {
            liveTrackFrameDisposeRef.current?.();
            const viewFrom = observeTrackViewFrom(Cesium, spec.kind);
            liveTrackFollowingRef.current = true;
            holdObserveRender("tracked-entity");
            liveTrackFrameDisposeRef.current = startObserveEntityFollow(
              Cesium,
              viewer,
              entity,
              viewFrom,
              {
                beginProgrammatic: () => {
                  programmaticCameraRef.current = true;
                },
                endProgrammatic: () => {
                  programmaticCameraRef.current = false;
                },
              },
            );
          } else {
            holdObserveRender("tracked-entity");
          }
        } else {
          liveTrackFrameDisposeRef.current?.();
          liveTrackFrameDisposeRef.current = null;
          liveTrackFollowingRef.current = false;
          if (viewer.trackedEntity) {
            viewer.trackedEntity = undefined;
          }
          try {
            viewer.camera.cancelFlight();
          } catch {
            /* ignore */
          }
          releaseObserveRender("tracked-entity");
        }
        if (entityChanged) {
          const isAircraft =
            spec.kind === "aircraft" ||
            spec.entityId.startsWith("mil:") ||
            spec.entityId.startsWith("civ:");
          const headings = new Map<string, number | null>();
          if (isAircraft && spec.courseDeg != null) {
            headings.set(spec.entityId, spec.courseDeg);
          }
          refreshObserveAircraftModels(
            Cesium,
            viewer,
            isAircraft ? spec.entityId : null,
            undefined,
            headings.size ? headings : undefined,
          );
        }
        observeRequestRender();
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    if (handleRef) handleRef.current = innerHandleRef.current;
    return () => {
      if (handleRef && handleRef.current === innerHandleRef.current) {
        handleRef.current = null;
      }
    };
  }, [handleRef]);

  useImperativeHandle(ref, () => innerHandleRef.current as CesiumGlobeHandle, []);

  /** WASD / 화살표 이동, +/- 확대·축소 — MapLibre와 동일 (캔버스 포커스 불필요) */
  useCesiumKeyboardNav(viewerRef, status === "ready");
  /** Ctrl/Alt+드래그 기울기 — LiveUA「위치로 가기」후 Google Earth식 조작 */
  useCesiumModifierLook(viewerRef, status === "ready");
  useCesiumHorizonGuard(viewerRef, status === "ready", programmaticCameraRef);

  useEffect(() => {
    const container = containerRef.current;
    const creditContainer = creditRef.current;
    if (!container || !creditContainer) return;

    let cancelled = false;
    let viewer: import("cesium").Viewer | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let onContextLost: ((ev: Event) => void) | null = null;
    let detachDayNight: (() => void) | null = null;
    let detachFirmsPulse: (() => void) | null = null;
    let detachStrikePulse: (() => void) | null = null;
    let detachMissilePulse: (() => void) | null = null;
    let detachAirRaidPulse: (() => void) | null = null;
    let detachConflictPulse: (() => void) | null = null;
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
          // PDB=false — 캡처/녹화는 postRender·bindPresenting으로 동기 복사
          contextOptions: { webgl: { preserveDrawingBuffer: false } },
        });

        viewer.targetFrameRate = 60;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        // 산·계곡 기복이 위성 뷰에서도 읽히도록 수직 과장
        if (typeof viewer.scene.verticalExaggeration === "number") {
          viewer.scene.verticalExaggeration = TERRAIN_VERTICAL_EXAGGERATION;
        }
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#02040a");
        // 타일 로드 전 밑색·바다 갭. 파도 노멀은 applyObserveOceanLook.
        applyObserveOceanLook(Cesium, viewer);
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
          // 궤도 rim — 이후 카메라 고도 이펙트가 near/orbit 보간
          applyObserveLookToViewer(
            viewer,
            observeLookForHeightM(OBSERVE_LOOK_ORBIT_M),
          );
        }
        // fog/지면대기는 궤도 거리에서 위성 텍스처를 희뿌옇게 만듦 — 림 glow만 skyAtmosphere
        viewer.scene.fog.enabled = false;
        // 명암·터미네이터 없음. 시계만 attachRealtimeDayNight에서 맞춘다.
        // (워터마스크 파도는 waterMask 지형만으로도 읽힌다)
        viewer.scene.globe.enableLighting = false;

        installObserveRenderGovernor(viewer);
        // 펄스는 interval+requestRender. continuous hold는 tracked-entity·surface-fade만.

        // 위성 지구본을 명암 없이 밝게. Earth식 waterMask 액체 · GIBS 구름 OFF.
        // 스택: Google Photorealistic 3D(+Terrain) → Ion Imagery+OSM → Esri.
        let stackKind: StackKind = "esri";
        let dayImageryLayer: import("cesium").ImageryLayer | null = null;
        googleTilesetRef.current = null;
        dayImageryLayerRef.current = null;
        osmBuildingsRef.current = null;
        {
          viewer.scene.globe.show = true;
          viewer.imageryLayers.removeAll();

          try {
            if (ionToken) {
              try {
                viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
                  requestVertexNormals: true,
                  // 해저 imagery 위에 waterMask 액체층 (육지 갭은 photoreal imagery α=1로 가림)
                  requestWaterMask: true,
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
                      requestWaterMask: true,
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
          // terrain 확정 후 ocean normal 재적용 (provider 교체 시 안전)
          applyObserveOceanLook(Cesium, viewer);

          const runtime = getRuntimeConfig();
          const google3dWanted =
            Boolean(ionToken) && runtime.cesiumGoogle3dEnabled !== false;
          const sessionGoogle3dOn = readGoogle3dSessionPref();

          if (google3dWanted) {
            try {
              const qualityPref = readGoogle3dQualityPref();
              const tileset = await Cesium.createGooglePhotorealistic3DTileset(
                { onlyUsingWithGoogleGeocoder: true },
                {
                  maximumScreenSpaceError: google3dSseForQuality(qualityPref),
                  showCreditsOnScreen: true,
                },
              );
              tileset.show = sessionGoogle3dOn;
              viewer.scene.primitives.add(tileset);
              googleTilesetRef.current = tileset;
              stackKind = "google3d";
              setGoogle3dOn(sessionGoogle3dOn);
              setGoogle3dQuality(qualityPref);
            } catch (gErr) {
              console.warn(
                "[CesiumSatelliteGlobe] Google Photorealistic 3D skipped:",
                gErr,
              );
              googleTilesetRef.current = null;
            }
          }

          // 하층 위성 — Google 타일 로딩 전·바다/갭 보완. Google 메시가 위를 덮음.
          if (ionToken) {
            try {
              const ionImagery = await Cesium.createWorldImageryAsync({
                style: Cesium.IonWorldImageryStyle.AERIAL,
              });
              dayImageryLayer = viewer.imageryLayers.addImageryProvider(ionImagery);
              dayImageryLayer.alpha = 1.0;
              if (stackKind !== "google3d") stackKind = "ion";
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

          // Ion OSM Buildings — Google 타일셋이 없을 때만 (VRAM·z-fight)
          if (ionToken && stackKind !== "google3d") {
            try {
              const buildings = await Cesium.createOsmBuildingsAsync({
                showOutline: false,
                enableShowOutline: false,
              });
              buildings.maximumScreenSpaceError = 8;
              viewer.scene.primitives.add(buildings);
              osmBuildingsRef.current = buildings;
            } catch (bldErr) {
              console.warn(
                "[CesiumSatelliteGlobe] OSM Buildings skipped:",
                bldErr,
              );
            }
          }

          dayImageryLayerRef.current = dayImageryLayer;
          setStack(stackKind);
        }

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            initial.lng,
            initial.lat,
            initial.heightM ?? observeStraitInitialCamera("hormuz").heightM,
          ),
        });

        // 함선/항공기 엔티티 클릭 — God's eye view 상세 카드용.
        // prefix(ais:/disguised:/mil:/civ:)로 어느 배열에서 찾을지 판단한다.
        const resolvePickedEntityId = (
          picked: unknown,
        ): string | undefined => {
          const maritime = resolveMaritimeOverlayPickId(picked);
          if (maritime) return maritime;
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
          if (prefix === "liveua" || prefix === "liveua-strike" || prefix === "liveua-ground") {
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
          if (prefix === "conflict") {
            const ev = conflictEventsRef.current.find(
              (item) => item.markerId === key || item.clusterId === key,
            );
            return ev?.titleKo || ev?.titleEn || name;
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
          if (prefix === "liveua" || prefix === "liveua-strike" || prefix === "liveua-ground") {
            onSelectLiveuaPinRef.current?.(key);
            return;
          }
          if (prefix === "conflict") {
            const ev = conflictEventsRef.current.find(
              (item) => item.markerId === key || item.clusterId === key,
            );
            if (ev) {
              setSelectedConflict(ev);
              onSelectConflictEventRef.current?.(ev);
            }
            return;
          }
          if (prefix === "straitreplay") {
            straitReplaySceneRef.current?.onSelectEventId?.(key);
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
          // GIBS volumetric/shell 구름 — 제거 (하얀 껍질·네트워크 비용).
          try {
            detachFirmsPulse = attachFirmsFirePulse(Cesium, viewer);
            detachStrikePulse = attachLiveuaStrikePulse(Cesium, viewer);
            detachMissilePulse = attachMissileLaunchPulse(Cesium, viewer);
            detachAirRaidPulse = attachAirRaidZonePulse(Cesium, viewer);
            detachConflictPulse = attachConflictEventPulse(Cesium, viewer);
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
        detachFirmsPulse?.();
        detachStrikePulse?.();
      } catch {
        /* ignore */
      }
      detachFirmsPulse = null;
      detachStrikePulse = null;
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
        detachConflictPulse?.();
      } catch {
        /* ignore */
      }
      detachConflictPulse = null;
      liveTrackFrameDisposeRef.current?.();
      liveTrackFrameDisposeRef.current = null;
      liveTrackDrDisposeRef.current?.();
      liveTrackDrDisposeRef.current = null;
      liveTrackEntityIdRef.current = null;
      liveTrackFixRef.current = null;
      liveTrackFollowingRef.current = false;
      releaseObserveRender("tracked-entity");
      surfaceControllerRef.current?.dispose();
      surfaceControllerRef.current = null;
      if (viewer) {
        try {
          uninstallObserveRenderGovernor(viewer);
        } catch {
          /* ignore */
        }
      }
      bootIntroDoneRef.current = false;
      idleSpinPointerActiveRef.current = false;
      viewerRef.current = null;
      cesiumModRef.current = null;
      googleTilesetRef.current = null;
      dayImageryLayerRef.current = null;
      osmBuildingsRef.current = null;
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

  /** 세계 국경(중립) + 축 허브 강조 국경. 줌에 맞춰 굵기 연동. */
  useEffect(() => {
    if (status !== "ready") return;
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    let cancelled = false;
    let detachWorld: (() => void) | null = null;
    let detachHub: (() => void) | null = null;

    (async () => {
      try {
        const worldRings = await loadCountryBorderRings();
        if (cancelled || viewer.isDestroyed()) return;
        detachWorld = attachWorldAdminBorders(Cesium, viewer, worldRings);
      } catch (err) {
        console.warn("[CesiumSatelliteGlobe] world borders:", err);
      }
      try {
        const response = await fetchDataWithFallback("axis-hub-countries.json");
        if (!response.ok || cancelled || viewer.isDestroyed()) return;
        const rings = collectAxisHubBorderRings(
          (await response.json()) as FeatureCollection,
        );
        if (cancelled || viewer.isDestroyed() || rings.length === 0) return;
        detachHub = attachAxisHubBorders(Cesium, viewer, rings);
      } catch (err) {
        console.warn("[CesiumSatelliteGlobe] axis hub borders:", err);
      }
    })();

    return () => {
      cancelled = true;
      detachWorld?.();
      detachHub?.();
    };
  }, [status]);

  /** 카메라 회전 시 지구 뒤편 점·함선·항공기 숨김 — 폴링 주기에 묶이지 않음 */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    const remove = viewer.scene.preRender.addEventListener(() => {
      if (viewer.isDestroyed()) return;
      updateGlobeEntityOcclusion(Cesium, viewer);
    });
    return () => {
      remove();
    };
  }, [status]);

  /** 탭 숨김 시 Cesium 렌더 루프 정지 — 복귀 시 재개 */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (status !== "ready" || !viewer || viewer.isDestroyed()) return;
    const onVis = () => {
      if (viewer.isDestroyed()) return;
      const hidden = document.visibilityState === "hidden";
      viewer.useDefaultRenderLoop = !hidden;
      if (!hidden) {
        observeRequestRender();
      }
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (!viewer.isDestroyed()) {
        viewer.useDefaultRenderLoop = true;
      }
    };
  }, [status]);

  /**
   * 유저 드래그로 카메라 ownership 회수 → follow 해제.
   * 휠 줌만으로는 해제하지 않음. handoff/flyTo는 programmatic 플래그로 제외.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (status !== "ready" || !viewer || viewer.isDestroyed()) return;

    let pointerDown = false;
    let brokeThisGesture = false;

    const onPointerDown = (ev: PointerEvent) => {
      // 주 버튼·중·우 드래그 (틸트/팬). 휠 버튼 불필요.
      if (ev.button === 0 || ev.button === 1 || ev.button === 2) {
        pointerDown = true;
        idleSpinPointerActiveRef.current = true;
        brokeThisGesture = false;
      }
    };
    const onPointerUp = () => {
      pointerDown = false;
      idleSpinPointerActiveRef.current = false;
    };

    const tryBreakFollow = () => {
      if (!pointerDown || brokeThisGesture) return;
      if (programmaticCameraRef.current) return;
      if (!liveTrackFollowingRef.current) return;
      brokeThisGesture = true;
      onUserBreakFollowRef.current?.();
    };

    const canvas = viewer.canvas;
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    const removeMoveStart = viewer.camera.moveStart.addEventListener(() => {
      tryBreakFollow();
    });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      removeMoveStart();
    };
  }, [status]);

  /** Google 3D SSE 품질 프로필 + 현재 고도 bias */
  useEffect(() => {
    const viewer = viewerRef.current;
    const tileset = googleTilesetRef.current;
    if (status !== "ready" || !viewer || viewer.isDestroyed()) return;
    if (!tileset || tileset.isDestroyed()) return;
    const heightM = viewer.camera.positionCartographic?.height ?? OBSERVE_LOOK_ORBIT_M;
    const sse = google3dSseForLook(google3dQuality, heightM);
    tileset.maximumScreenSpaceError = sse;
    lookSseAppliedRef.current = sse;
    if (google3dOn) surfaceControllerRef.current?.armSettle();
    observeRequestRender();
  }, [status, google3dQuality, google3dOn]);

  /**
   * 카메라 고도 → atmosphere / Google SSE.
   * SSE가 변하면 photoreal geometric settle 칩 재시작.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (status !== "ready" || !viewer || viewer.isDestroyed()) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      if (viewer.isDestroyed()) return;
      const heightM =
        viewer.camera.positionCartographic?.height ?? OBSERVE_LOOK_ORBIT_M;
      const look = observeLookForHeightM(heightM, {
        cinema: cinemaOnRef.current,
      });
      applyObserveLookToViewer(viewer, look);

      const tileset = googleTilesetRef.current;
      if (
        google3dOnRef.current &&
        tileset &&
        !tileset.isDestroyed()
      ) {
        const sse = google3dSseForLook(google3dQualityRef.current, heightM);
        const prev = lookSseAppliedRef.current;
        if (prev == null || Math.abs(prev - sse) >= 0.35) {
          tileset.maximumScreenSpaceError = sse;
          lookSseAppliedRef.current = sse;
          if (prev != null) surfaceControllerRef.current?.armSettle();
        }
      }
      observeRequestRender();
    };
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    apply();
    const removeChanged = viewer.camera.changed.addEventListener(schedule);
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(apply);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      removeChanged();
      removeMoveEnd();
    };
  }, [status, bootNonce, cinemaOn]);

  /**
   * Pretty Stage — Cinema 부팅 인트로 + 유휴 슬로우 스핀.
   * Content(AIS/LiveUA/증시)와 분리. continuous hold 없음.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) {
      return;
    }

    if (!cinemaOn) {
      bootIntroDoneRef.current = false;
      // Lite 복귀 시 구름/림 즉시 갱신
      try {
        viewer.camera.changed.raiseEvent(viewer.camera);
      } catch {
        observeRequestRender();
      }
      return;
    }

    let cancelIntro: (() => void) | null = null;
    let detachSpin: (() => void) | null = null;
    let cancelled = false;

    const attachSpin = () => {
      if (cancelled || viewer.isDestroyed()) return;
      detachSpin?.();
      detachSpin = attachObserveIdleSpin(viewer, {
        shouldRun: () => {
          if (viewer.isDestroyed()) return false;
          const heightM =
            viewer.camera.positionCartographic?.height ?? 0;
          return observeIdleSpinShouldRun({
            cinemaOn: cinemaOnRef.current,
            tracked: liveTrackFollowingRef.current,
            pointerActive: idleSpinPointerActiveRef.current,
            visibilityVisible: document.visibilityState === "visible",
            heightM,
          });
        },
      });
    };

    if (!bootIntroDoneRef.current) {
      cancelIntro = startObserveBootIntro(Cesium, viewer, {
        beginProgrammatic: () => {
          programmaticCameraRef.current = true;
        },
        endProgrammatic: () => {
          programmaticCameraRef.current = false;
        },
        done: () => {
          bootIntroDoneRef.current = true;
          attachSpin();
        },
      });
    } else {
      attachSpin();
    }

    try {
      viewer.camera.changed.raiseEvent(viewer.camera);
    } catch {
      observeRequestRender();
    }

    return () => {
      cancelled = true;
      cancelIntro?.();
      detachSpin?.();
    };
  }, [status, cinemaOn, bootNonce]);

  /** 표면 FSM — photoreal↔satellite crossfade + tile settle */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (status !== "ready" || !viewer || viewer.isDestroyed()) return;
    surfaceControllerRef.current?.dispose();
    const ctrl = createObserveSurfaceController({
      viewer,
      getImageryLayer: () => dayImageryLayerRef.current,
      getOsmBuildings: () => osmBuildingsRef.current,
      getGoogleTileset: () => googleTilesetRef.current,
      terrainExaggeration: TERRAIN_VERTICAL_EXAGGERATION,
      onSettlingChange: setSurfaceSettling,
    });
    surfaceControllerRef.current = ctrl;
    const initialPhotoreal =
      stack === "google3d" && google3dOn && Boolean(googleTilesetRef.current);
    ctrl.switchTo(initialPhotoreal ? "photoreal" : "satellite", {
      immediate: true,
    });
    return () => {
      ctrl.dispose();
      if (surfaceControllerRef.current === ctrl) {
        surfaceControllerRef.current = null;
      }
    };
    // boot 직후 1회 + stack 확정. google3dOn 토글은 버튼에서 switchTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional boot bind
  }, [status, stack, bootNonce]);

  /** 속보 공간 — 휠 줌아웃이 창 밖으로 새지 않게 높이 상한을 둔다 */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (status !== "ready" || !viewer || viewer.isDestroyed()) return;
    const controller = viewer.scene.screenSpaceCameraController;
    controller.maximumZoomDistance =
      cameraCeilingM == null || !Number.isFinite(cameraCeilingM)
        ? Number.POSITIVE_INFINITY
        : cameraCeilingM;
    return () => {
      if (viewer.isDestroyed()) return;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance =
        Number.POSITIVE_INFINITY;
    };
  }, [status, cameraCeilingM]);

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
    const preserveId = liveTrackEntityIdRef.current;
    const tier = observeLodTierFromViewer(viewer);
    const carto = viewer.camera.positionCartographic;
    const centerLat = carto ? Cesium.Math.toDegrees(carto.latitude) : 0;
    const centerLng = carto ? Cesium.Math.toDegrees(carto.longitude) : 0;
    const aisBudget = liveAisDisplayMax(tier);
    const milBudget = liveMilDisplayMax(tier);
    const civBudget = liveAirTrafficDisplayMax(tier);

    const aisCapped = takeNearestByBudget(aisFiltered, aisBudget, centerLat, centerLng);
    const disguisedCapped = takeNearestByBudget(
      showDisguisedVessels ? disguisedVessels : [],
      Math.max(8, Math.floor(aisBudget * 0.35)),
      centerLat,
      centerLng,
    );
    const milCapped = takeNearestByBudget(
      showMilitaryActivity ? milAircraft : [],
      milBudget,
      centerLat,
      centerLng,
    );
    const civCapped = takeNearestByBudget(
      showAirTraffic ? civAircraft : [],
      civBudget,
      centerLat,
      centerLng,
    );

    const ensureTracked = <T,>(
      capped: T[],
      pool: T[],
      match: (item: T) => boolean,
    ): T[] => {
      if (!preserveId) return capped;
      if (capped.some(match)) return capped;
      const found = pool.find(match);
      return found ? [found, ...capped] : capped;
    };

    const aisFinal = ensureTracked(
      aisCapped,
      aisFiltered,
      (v) => `ais:${(v as AisVessel).mmsi}` === preserveId,
    );
    const milFinal = ensureTracked(
      milCapped,
      showMilitaryActivity ? milAircraft : [],
      (a) => `mil:${(a as MilitaryAircraft).hex || (a as MilitaryAircraft).id}` === preserveId,
    );
    const civFinal = ensureTracked(
      civCapped,
      showAirTraffic ? civAircraft : [],
      (a) => `civ:${(a as MilitaryAircraft).hex || (a as MilitaryAircraft).id}` === preserveId,
    );

    syncAisBillboardEntities(Cesium, viewer, "ais", aisFinal, preserveId);
    syncAisBillboardEntities(
      Cesium,
      viewer,
      "disguised",
      disguisedCapped,
      preserveId,
    );

    syncAircraftBillboardEntities(
      Cesium,
      viewer,
      "mil",
      milFinal,
      "military",
      preserveId,
    );
    syncAircraftBillboardEntities(
      Cesium,
      viewer,
      "civ",
      civFinal,
      "civil",
      preserveId,
    );

    // ADS-B 실제 고도 + glTF: 추적 클러스터 또는 저고도 카메라 근처
    const modelCandidates: ObserveModelCandidate[] = [];
    const modelHeadings = new Map<string, number | null>();
    for (const item of milFinal) {
      const id = `mil:${item.hex || item.id}`;
      const heading = aircraftHeadingDeg(item);
      modelCandidates.push({
        entityId: id,
        lat: item.lat,
        lng: item.lng,
        headingDeg: heading,
      });
      modelHeadings.set(id, heading);
    }
    for (const item of civFinal) {
      const id = `civ:${item.hex || item.id}`;
      const heading = aircraftHeadingDeg(item);
      modelCandidates.push({
        entityId: id,
        lat: item.lat,
        lng: item.lng,
        headingDeg: heading,
      });
      modelHeadings.set(id, heading);
    }
    refreshObserveAircraftModels(
      Cesium,
      viewer,
      preserveId,
      modelCandidates,
      modelHeadings,
    );

    syncNeptunBillboardEntities(Cesium, viewer, showNeptun ? neptunThreats : []);
    observeRequestRender();

    // PIR 빈칸(stat) → AIS/항적 슬롯 희미
    const slots = deskFocus ? deskSlotOpacity(deskFocus.pirMissing) : null;
    if (slots && slots.stat < 1) {
      for (const entity of viewer.entities.values) {
        if (typeof entity.id !== "string") continue;
        if (
          !entity.id.startsWith("ais:") &&
          !entity.id.startsWith("disguised:") &&
          !entity.id.startsWith("mil:") &&
          !entity.id.startsWith("civ:")
        ) {
          continue;
        }
        if (entity.billboard) {
          entity.billboard.color = new Cesium.ConstantProperty(
            Cesium.Color.WHITE.withAlpha(0.25 * slots.stat + 0.1),
          );
        }
      }
    }
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
    deskFocus,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    syncFirmsFireEntities(Cesium, viewer, showFirmsFires ? firmsFires : []);
    syncLiveuaStrikeEntities(Cesium, viewer, liveuaStrikes);
    syncLiveuaGroundEntities(Cesium, viewer, liveuaGround);
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
    // PIR 빈칸(sensor) → FIRMS 슬롯 희미
    const slots = deskFocus
      ? deskSlotOpacity(deskFocus.pirMissing)
      : null;
    if (slots && slots.sensor < 1) {
      for (const entity of viewer.entities.values) {
        if (typeof entity.id !== "string" || !entity.id.startsWith("firms:")) {
          continue;
        }
        if (entity.billboard) {
          entity.billboard.color = new Cesium.ConstantProperty(
            Cesium.Color.WHITE.withAlpha(0.22 * slots.sensor + 0.08),
          );
        }
      }
    }
  }, [
    status,
    showFirmsFires,
    firmsFires,
    liveuaStrikes,
    liveuaGround,
    showMissileLaunches,
    deskFocus,
    missileLaunches,
    showAirRaidZones,
    neptunAlerts,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    const lang = placeLabelLang === "en" ? "en" : "ko";
    syncPlaceLabelEntities(
      Cesium,
      viewer,
      showPlaceLabels ? filterPlaceLabelsForOverlay(placeLabels) : [],
      lang,
    );
  }, [status, showPlaceLabels, placeLabels, placeLabelLang]);

  /** Google Earth식 도로·POI·지명 타일 (해협 콜아웃 정리와 병행) */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    let cancelled = false;
    const lang = placeLabelLang === "en" ? "en" : "ko";

    void (async () => {
      try {
        placeOverlayRef.current?.dispose();
        placeOverlayRef.current = null;
        if (!showPlaceLabels) return;
        const handle = await attachObservePlaceNameOverlay(Cesium, viewer, {
          language: lang,
          enabled: true,
          googleTileset:
            google3dOn && googleTilesetRef.current && !googleTilesetRef.current.isDestroyed()
              ? googleTilesetRef.current
              : null,
        });
        if (cancelled) {
          handle.dispose();
          return;
        }
        placeOverlayRef.current = handle;
      } catch (err) {
        console.warn("[CesiumSatelliteGlobe] place name overlay:", err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        placeOverlayRef.current?.dispose();
      } catch {
        /* ignore */
      }
      placeOverlayRef.current = null;
    };
  }, [status, showPlaceLabels, placeLabelLang, google3dOn, bootNonce]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    syncConflictEventEntities(
      Cesium,
      viewer,
      showConflictEvents ? conflictEvents : [],
    );
    if (!showConflictEvents) setSelectedConflict(null);

    // DeskFocus 클러스터 — 해당 핀 강조, 나머지 디밍
    if (deskFocus?.clusterId && showConflictEvents) {
      const radiusKm = deskSpotlightRadiusKm(deskFocus.kind);
      for (const entity of viewer.entities.values) {
        if (
          typeof entity.id !== "string" ||
          !entity.id.startsWith("conflict:")
        ) {
          continue;
        }
        const isFocus = entity.id.includes(deskFocus.clusterId);
        const pt = entity.position?.getValue?.(
          viewer.clock.currentTime,
        ) as import("cesium").Cartesian3 | undefined;
        let inSpot = isFocus;
        if (pt && !isFocus) {
          const carto = Cesium.Cartographic.fromCartesian(pt);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const lng = Cesium.Math.toDegrees(carto.longitude);
          inSpot =
            haversineKm(deskFocus.lat, deskFocus.lng, lat, lng) <= radiusKm;
        }
        const alpha = isFocus ? 1 : inSpot ? 0.5 : DESK_NON_FOCUS_ALPHA;
        if (entity.point) {
          const base =
            entity.point.color?.getValue?.(viewer.clock.currentTime) ??
            Cesium.Color.ORANGE;
          entity.point.color = new Cesium.ConstantProperty(
            (base as import("cesium").Color).withAlpha(alpha),
          );
          if (isFocus) {
            entity.point.pixelSize = new Cesium.ConstantProperty(18);
          }
        }
        if (entity.billboard) {
          entity.billboard.color = new Cesium.ConstantProperty(
            Cesium.Color.WHITE.withAlpha(alpha),
          );
        }
      }
    }
  }, [status, showConflictEvents, conflictEvents, deskFocus]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const seen = new Set<string>();
    /** 지정학 빗금/링으로 대체하는 종류 — 점 핀은 중복·지구 투과만 키움 */
    const HATCH_KINDS = new Set<CesiumAlertKind>(["ukmto", "navarea", "portwatch"]);
    const slots = deskFocus ? deskSlotOpacity(deskFocus.pirMissing) : null;
    const radiusKm = deskFocus
      ? deskSpotlightRadiusKm(deskFocus.kind)
      : null;
    for (const pin of alertPins) {
      if (pin.kind === "dark-fleet") continue;
      if (HATCH_KINDS.has(pin.kind)) continue;
      const pointId = `alert:${pin.id}`;
      seen.add(pointId);
      const isFocus =
        deskFocus?.cesiumAlertId != null && pin.id === deskFocus.cesiumAlertId;
      let alpha = 1;
      if (deskFocus && radiusKm != null) {
        const d = haversineKm(deskFocus.lat, deskFocus.lng, pin.lat, pin.lng);
        alpha = isFocus ? 1 : d > radiusKm ? DESK_NON_FOCUS_ALPHA * 0.5 : DESK_NON_FOCUS_ALPHA;
      }
      if (slots) alpha *= slots.alert;
      const base = Cesium.Color.fromCssColorString(ALERT_PIN_COLOR[pin.kind]);
      const color = base.withAlpha(Math.max(0.08, alpha));
      const position = Cesium.Cartesian3.fromDegrees(pin.lng, pin.lat, 0);
      const pixelSize = isFocus
        ? 16
        : pin.kind === "route" || pin.kind === "ais-gate"
          ? 7
          : 11;
      const existing = viewer.entities.getById(pointId);
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = pin.title;
        existing.show = true;
        if (existing.point) {
          existing.point.color = new Cesium.ConstantProperty(color);
          existing.point.pixelSize = new Cesium.ConstantProperty(pixelSize);
        }
      } else {
        viewer.entities.add({
          id: pointId,
          name: pin.title,
          position,
          point: {
            pixelSize,
            color,
            outlineColor: Cesium.Color.BLACK.withAlpha(0.65),
            outlineWidth: 1,
            // 앞면만 Infinity — 뒤편은 updateGlobeEntityOcclusion 이 숨김
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
  }, [alertPins, status, deskFocus]);

  /** UKMTO·NAVAREA·PortWatch + 해협 게이트·정적 밀도 */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const segments = [
      ...buildMaritimeOverlaySegments({
        ukmtoIncidents,
        navareaFeatures,
        chokeRings,
      }),
      ...straitOverlaySegments,
    ];
    const detach = attachMaritimeOverlays(Cesium, viewer, segments);
    return () => {
      detach();
    };
  }, [status, ukmtoIncidents, navareaFeatures, chokeRings, straitOverlaySegments]);

  /** 해협 통항 배지·번들 콜아웃·항구 */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;
    syncStraitLabelEntities(Cesium, viewer, straitLabels);
    syncStraitPortPointEntities(Cesium, viewer, straitPorts);
  }, [status, straitLabels, straitPorts]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const seen = new Set<string>();
    const slots = deskFocus ? deskSlotOpacity(deskFocus.pirMissing) : null;
    const radiusKm = deskFocus
      ? deskSpotlightRadiusKm(deskFocus.kind)
      : null;
    // deskFocus가 없어도 최근 7일 핀은 궤도에서 읽히게
    const windowH = deskFocus?.windowHours ?? 168;
    const nowMs = Date.now();
    const firstSeen = liveuaFirstSeenRef.current;
    for (const pin of liveuaPins) {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
      const pointId = `liveua:${pin.id}`;
      seen.add(pointId);
      if (!firstSeen.has(pin.id)) firstSeen.set(pin.id, nowMs);
      const ageSinceFirst = nowMs - (firstSeen.get(pin.id) ?? nowMs);
      const isNew = ageSinceFirst < NEW_OBS_PULSE_MS;
      const focused = focusedLiveuaId != null && pin.id === focusedLiveuaId;
      let inSpot = true;
      if (deskFocus && radiusKm != null) {
        const d = haversineKm(deskFocus.lat, deskFocus.lng, pin.lat, pin.lng);
        inSpot = d <= radiusKm;
      }
      const timeA = timeWindowAlpha(pin.publishedAt, windowH, nowMs);
      // 전선 핀은 안건 스포트 밖에서도 최소 가시성 유지
      let alpha = focused
        ? 1
        : deskFocus
          ? inSpot
            ? 0.85
            : Math.max(0.45, DESK_NON_FOCUS_ALPHA)
          : 1;
      alpha *= Math.max(0.35, timeA);
      if (slots) alpha *= Math.max(0.55, slots.sensor);
      if (isNew) alpha = Math.min(1, alpha + 0.35);
      const baseCss = focused || isNew ? "#fde68a" : "#fbbf24";
      const color = Cesium.Color.fromCssColorString(baseCss).withAlpha(
        Math.max(0.35, alpha),
      );
      const pixelSize = focused ? 20 : isNew ? 16 : deskFocus && inSpot ? 14 : 13;
      const outlineWidth = focused || isNew ? 3 : 2;
      const position = Cesium.Cartesian3.fromDegrees(pin.lng, pin.lat, 0);
      const existing = viewer.entities.getById(pointId);
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = pin.title;
        existing.show = true;
        if (existing.point) {
          existing.point.pixelSize = new Cesium.ConstantProperty(pixelSize);
          existing.point.color = new Cesium.ConstantProperty(color);
          existing.point.outlineColor = new Cesium.ConstantProperty(
            Cesium.Color.BLACK.withAlpha(focused ? 0.9 : 0.75),
          );
          existing.point.outlineWidth = new Cesium.ConstantProperty(outlineWidth);
          existing.point.disableDepthTestDistance = new Cesium.ConstantProperty(
            Number.POSITIVE_INFINITY,
          );
        }
      } else {
        viewer.entities.add({
          id: pointId,
          name: pin.title,
          position,
          show: true,
          point: {
            pixelSize,
            color,
            outlineColor: Cesium.Color.BLACK.withAlpha(focused ? 0.9 : 0.75),
            outlineWidth,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }
    // 사라진 핀 firstSeen 정리
    for (const id of [...firstSeen.keys()]) {
      if (![...seen].some((s) => s === `liveua:${id}`)) firstSeen.delete(id);
    }

    const stale: import("cesium").Entity[] = [];
    for (const entity of viewer.entities.values) {
      const id = entity.id;
      if (typeof id !== "string" || !id.startsWith("liveua:")) continue;
      if (!seen.has(id)) stale.push(entity);
    }
    for (const entity of stale) viewer.entities.remove(entity);

    // 신규 펄스가 NEW_OBS_PULSE_MS 동안 줄어들도록 짧게 재적용
    const hasNew = [...firstSeen.values()].some(
      (t) => nowMs - t < NEW_OBS_PULSE_MS,
    );
    let interval: number | undefined;
    if (hasNew && typeof window !== "undefined") {
      interval = window.setInterval(() => {
        if (viewer.isDestroyed()) return;
        const tNow = Date.now();
        for (const pin of liveuaPins) {
          const seenAt = firstSeen.get(pin.id);
          if (seenAt == null) continue;
          const ent = viewer.entities.getById(`liveua:${pin.id}`);
          if (!ent?.point) continue;
          const fresh = tNow - seenAt < NEW_OBS_PULSE_MS;
          if (!fresh) {
            const timeA = timeWindowAlpha(
              pin.publishedAt,
              deskFocus?.windowHours ?? 168,
              tNow,
            );
            ent.point.pixelSize = new Cesium.ConstantProperty(13);
            ent.point.color = new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString("#fbbf24").withAlpha(
                Math.max(0.35, timeA),
              ),
            );
          }
        }
      }, 400);
    }
    return () => {
      if (interval != null) window.clearInterval(interval);
    };
  }, [liveuaPins, focusedLiveuaId, status, deskFocus]);

  /** DeskFocus 히어로 핀 + 교차 링 시퀀스 + 등급 펄스 */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const heroId = "desk-focus:hero";
    const spotId = "desk-focus:ring";
    const corrPrefix = "desk-focus:corr-";

    const removeAllDesk = () => {
      for (const id of [heroId, spotId]) {
        const e = viewer.entities.getById(id);
        if (e) viewer.entities.remove(e);
      }
      const stale: import("cesium").Entity[] = [];
      for (const entity of viewer.entities.values) {
        if (
          typeof entity.id === "string" &&
          entity.id.startsWith(corrPrefix)
        ) {
          stale.push(entity);
        }
      }
      for (const e of stale) viewer.entities.remove(e);
    };

    if (!deskFocus) {
      removeAllDesk();
      return;
    }

    const viz = deskGradeVisual(deskFocus.grade);
    const cooledCss = coolCssColor(viz.colorCss, deskFocus.disconfirmHitCount);
    const position = Cesium.Cartesian3.fromDegrees(
      deskFocus.lng,
      deskFocus.lat,
      0,
    );
    const color = Cesium.Color.fromCssColorString(cooledCss).withAlpha(
      deskFocus.disconfirmHitCount > 0 ? viz.alpha * 0.55 : viz.alpha,
    );
    const spotRadiusM = deskSpotlightRadiusKm(deskFocus.kind) * 1000;
    const channelCount = Math.max(
      1,
      deskFocus.modalitiesPresent.length || deskFocus.pirRequired.length,
    );
    const corrSpecs = buildCorroborationRings({
      independenceCount: deskFocus.independenceCount,
      modalities: deskFocus.modalitiesPresent,
      channelCount,
      disconfirmHitCount: deskFocus.disconfirmHitCount,
    });
    const promoteUntil = deskFocus.promoteFromHold
      ? deskFocus.sequenceStartedAt + 900
      : 0;

    // 스포트라이트 외곽 (항상) — 반증 시 식은 색
    {
      const ring = viewer.entities.getById(spotId);
      const spotColor = deskFocus.showHeroPin ? cooledCss : "#64748b";
      if (ring?.ellipse) {
        ring.position = new Cesium.ConstantPositionProperty(position);
        ring.ellipse.semiMajorAxis = new Cesium.ConstantProperty(spotRadiusM);
        ring.ellipse.semiMinorAxis = new Cesium.ConstantProperty(spotRadiusM);
        ring.show = true;
      } else {
        if (ring) viewer.entities.remove(ring);
        viewer.entities.add({
          id: spotId,
          position,
          ellipse: {
            semiMajorAxis: spotRadiusM,
            semiMinorAxis: spotRadiusM,
            height: 0,
            material: Cesium.Color.fromCssColorString(spotColor).withAlpha(
              deskFocus.showHeroPin ? 0.06 : 0.04,
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(spotColor).withAlpha(
              deskFocus.disconfirmHitCount > 0 ? 0.18 : 0.3,
            ),
            outlineWidth: deskFocus.disconfirmHitCount > 0 ? 1 : 2,
          },
        });
      }
    }

    // 교차 링 엔티티 준비 (처음엔 숨김 → 시퀀스로 show; 반증 시 접힘·식힘)
    for (const spec of corrSpecs) {
      const id = `${corrPrefix}${spec.index}`;
      const r = spotRadiusM * spec.radiusFactor;
      const ringCss = coolCssColor(spec.colorCss, deskFocus.disconfirmHitCount);
      const existing = viewer.entities.getById(id);
      if (existing?.ellipse) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.ellipse.semiMajorAxis = new Cesium.ConstantProperty(r);
        existing.ellipse.semiMinorAxis = new Cesium.ConstantProperty(r);
        existing.show = false;
      } else {
        if (existing) viewer.entities.remove(existing);
        viewer.entities.add({
          id,
          position,
          show: false,
          ellipse: {
            semiMajorAxis: r,
            semiMinorAxis: r,
            height: 0,
            material: Cesium.Color.fromCssColorString(ringCss).withAlpha(
              deskFocus.disconfirmHitCount > 0 ? 0.04 : 0.1,
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(ringCss).withAlpha(
              deskFocus.disconfirmHitCount > 0 ? 0.35 : 0.85,
            ),
            outlineWidth: deskFocus.disconfirmHitCount > 0 ? 1.5 : 3,
          },
        });
      }
    }
    // 남는 옛 교차 링 제거
    for (const entity of [...viewer.entities.values]) {
      if (
        typeof entity.id === "string" &&
        entity.id.startsWith(corrPrefix)
      ) {
        const idx = Number(entity.id.slice(corrPrefix.length));
        if (!Number.isFinite(idx) || idx >= corrSpecs.length) {
          viewer.entities.remove(entity);
        }
      }
    }

    if (deskFocus.showHeroPin) {
      const existing = viewer.entities.getById(heroId);
      if (existing?.point) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.name = deskFocus.title;
        existing.point.pixelSize = new Cesium.ConstantProperty(viz.pixelSize);
        existing.point.color = new Cesium.ConstantProperty(color);
        existing.point.outlineWidth = new Cesium.ConstantProperty(
          viz.outlineWidth,
        );
        existing.show = true;
      } else {
        const old = viewer.entities.getById(heroId);
        if (old) viewer.entities.remove(old);
        viewer.entities.add({
          id: heroId,
          name: deskFocus.title,
          position,
          point: {
            pixelSize: viz.pixelSize,
            color,
            outlineColor: Cesium.Color.BLACK.withAlpha(0.85),
            outlineWidth: viz.outlineWidth,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    } else {
      // hold — 희미한 점만 (히어로 승격 전)
      const holdPos = Cesium.Cartesian3.fromDegrees(
        deskFocus.lng,
        deskFocus.lat,
        0,
      );
      const existing = viewer.entities.getById(heroId);
      if (existing?.point) {
        existing.position = new Cesium.ConstantPositionProperty(holdPos);
        existing.show = true;
        existing.point.pixelSize = new Cesium.ConstantProperty(7);
        existing.point.color = new Cesium.ConstantProperty(
          Cesium.Color.fromCssColorString("#64748b").withAlpha(0.4),
        );
      } else {
        viewer.entities.add({
          id: heroId,
          name: deskFocus.title,
          position: holdPos,
          point: {
            pixelSize: 7,
            color: Cesium.Color.fromCssColorString("#64748b").withAlpha(0.4),
            outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }

    const startedAt = deskFocus.sequenceStartedAt;
    const tick = () => {
      if (viewer.isDestroyed()) return;
      const now = Date.now();
      const elapsedMs = now - startedAt;
      const lit = litRingCount(elapsedMs, corrSpecs);
      // 반증이면 링을 시퀀스 후 접어 숨김(식힘)
      const collapseAway =
        deskFocus.disconfirmHitCount > 0 && lit >= corrSpecs.length;
      for (const spec of corrSpecs) {
        const ent = viewer.entities.getById(`${corrPrefix}${spec.index}`);
        if (!ent) continue;
        if (collapseAway) {
          // 접힘: 반경을 줄이며 페이드
          const factor = Math.max(0.2, 1 - (elapsedMs - spec.appearAtMs) / 1200);
          const r = spotRadiusM * spec.radiusFactor * factor;
          if (ent.ellipse) {
            ent.ellipse.semiMajorAxis = new Cesium.ConstantProperty(r);
            ent.ellipse.semiMinorAxis = new Cesium.ConstantProperty(r);
          }
          ent.show = factor > 0.25;
        } else {
          ent.show = spec.index < lit;
        }
      }
      const hero = viewer.entities.getById(heroId);
      if (hero?.point) {
        // Hold→Active 승격: 고도 들어 올림
        const promoting = promoteUntil > 0 && now < promoteUntil;
        const promoteT = promoting
          ? 1 - (promoteUntil - now) / 900
          : deskFocus.promoteFromHold
            ? 1
            : 0;
        const heightM = promoting || deskFocus.promoteFromHold
          ? 800 + promoteT * 4200
          : 0;
        hero.position = new Cesium.ConstantPositionProperty(
          Cesium.Cartesian3.fromDegrees(
            deskFocus.lng,
            deskFocus.lat,
            heightM,
          ),
        );

        if (deskFocus.showHeroPin) {
          const ringsDone =
            corrSpecs.length === 0 || lit >= corrSpecs.length;
          const t = performance.now() / 1000;
          const pulse =
            deskFocus.disconfirmHitCount > 0
              ? 0.7
              : ringsDone && viz.pulse
                ? 0.88 + 0.22 * Math.sin(t * 3.6)
                : ringsDone
                  ? 1
                  : 0.75 + 0.08 * Math.sin(t * 2.2);
          const lift = promoting ? 1.15 + promoteT * 0.25 : 1;
          hero.point.pixelSize = new Cesium.ConstantProperty(
            viz.pixelSize * pulse * lift,
          );
          hero.point.color = new Cesium.ConstantProperty(color);
          hero.show = true;
        }
      }
    };
    tick();
    const remove = viewer.scene.preUpdate.addEventListener(tick);

    return () => {
      remove();
    };
  }, [status, deskFocus]);

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
              Cesium.Color.fromCssColorString(OBSERVE_CONTROL_FILL).withAlpha(
                OBSERVE_CONTROL_FILL_ALPHA,
              ),
            );
            entity.polygon.outline = new Cesium.ConstantProperty(true);
            entity.polygon.outlineColor = new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString(OBSERVE_CONTROL_OUTLINE).withAlpha(
                OBSERVE_CONTROL_OUTLINE_ALPHA,
              ),
            );
            entity.polygon.heightReference = new Cesium.ConstantProperty(
              Cesium.HeightReference.CLAMP_TO_GROUND,
            );
            // Google Photorealistic 메시 + terrain 모두에 앉힘
            entity.polygon.classificationType = new Cesium.ConstantProperty(
              Cesium.ClassificationType.BOTH,
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
          className="pointer-events-none absolute z-30 max-w-[min(18rem,70vw)] rounded-md border border-sky-200/25 bg-[#0b1628]/92 px-2.5 py-1.5 font-sans text-micro font-medium tracking-tight text-sky-50 shadow-lg backdrop-blur-sm"
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
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-teal-400/25 bg-[#041018]/82 px-2.5 py-1.5 backdrop-blur-sm">
          <p className="text-micro font-semibold uppercase tracking-wider text-teal-100/90">
            Observe · Sensor
          </p>
          <p className="mt-0.5 text-micro text-teal-100/55">
            {stack === "google3d"
              ? google3dOn
                ? "Google Photorealistic 3D · Terrain · Ocean · Borders · Labels"
                : "Ion / Esri imagery · Terrain · Ocean · Labels (3D off)"
              : stack === "ion"
                ? "Cesium Ion · World Imagery · Terrain · Ocean · OSM Buildings · Labels"
                : "Esri World Imagery · Ocean · Labels · CesiumJS"}
            {" · "}
            Ctrl/Alt+drag tilt
          </p>
          {stack === "google3d" ? (
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                className="pointer-events-auto rounded border border-teal-400/30 bg-teal-500/15 px-1.5 py-0.5 text-micro font-semibold text-teal-50/90 hover:bg-teal-500/25"
                aria-pressed={google3dOn}
                onClick={() => {
                  const next = !google3dOn;
                  setGoogle3dOn(next);
                  surfaceControllerRef.current?.switchTo(
                    next ? "photoreal" : "satellite",
                  );
                  try {
                    sessionStorage.setItem(
                      GOOGLE_3D_SESSION_KEY,
                      next ? "1" : "0",
                    );
                  } catch {
                    /* private mode */
                  }
                }}
              >
                {google3dOn ? "실사 3D 켜짐" : "실사 3D 꺼짐"}
              </button>
              {google3dOn ? (
                <button
                  type="button"
                  className="pointer-events-auto rounded border border-teal-400/20 bg-black/20 px-1.5 py-0.5 text-micro font-semibold text-teal-100/75 hover:bg-teal-500/15"
                  aria-pressed={google3dQuality === "default"}
                  onClick={() => {
                    const next =
                      google3dQuality === "lite" ? "default" : "lite";
                    setGoogle3dQuality(next);
                    // SSE effect + armSettle 가 선명화 칩을 담당
                    try {
                      sessionStorage.setItem(GOOGLE_3D_QUALITY_KEY, next);
                    } catch {
                      /* private mode */
                    }
                  }}
                >
                  {google3dQuality === "lite" ? "품질 Lite" : "품질 Default"}
                </button>
              ) : null}
              <button
                type="button"
                className="pointer-events-auto rounded border border-teal-400/20 bg-black/20 px-1.5 py-0.5 text-micro font-semibold text-teal-100/75 hover:bg-teal-500/15"
                aria-pressed={cinemaOn}
                onClick={() => {
                  const next = !cinemaOn;
                  setCinemaOn(next);
                  writeObserveCinemaPref(next);
                }}
              >
                {cinemaOn ? "Cinema 켜짐" : "Cinema"}
              </button>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                className="pointer-events-auto rounded border border-teal-400/20 bg-black/20 px-1.5 py-0.5 text-micro font-semibold text-teal-100/75 hover:bg-teal-500/15"
                aria-pressed={cinemaOn}
                onClick={() => {
                  const next = !cinemaOn;
                  setCinemaOn(next);
                  writeObserveCinemaPref(next);
                }}
              >
                {cinemaOn ? "Cinema 켜짐" : "Cinema"}
              </button>
            </div>
          )}
          {surfaceSettling ? (
            <p className="mt-1 text-micro text-teal-100/50">지형 선명화 중…</p>
          ) : null}
        </div>
      ) : null}

      {status === "ready" && selectedConflict ? (
        <div className="pointer-events-auto absolute right-3 top-3 z-20 w-[min(20rem,88vw)] rounded-md border border-teal-400/30 bg-[#041018]/92 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-micro uppercase tracking-wider text-teal-200/70">
                Conflict event
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-teal-50">
                {placeLabelLang === "en"
                  ? selectedConflict.titleEn || selectedConflict.titleKo
                  : selectedConflict.titleKo || selectedConflict.titleEn}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-micro text-teal-100/70 hover:bg-white/5"
              onClick={() => setSelectedConflict(null)}
              aria-label="Close"
            >
              닫기
            </button>
          </div>
          {selectedConflict.displayGrade ? (
            <div className="mt-1.5">
              <IntelGradeBadge
                grade={selectedConflict.displayGrade}
                lang={placeLabelLang === "en" ? "en" : "ko"}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
  },
);
