/**
 * Observe ADS-B — 실제 고도에 띄운 glTF.
 * 기본: clutter 예산을 통과한 표시 항공기 전부 ModelGraphics (전 항공기 glTF).
 * near-cluster 모드는 추적/저고도 근처만 (레거시·테스트).
 */
import { observeRequestRender } from "@/lib/cesiumObserveRenderGovernor";

type CesiumNS = typeof import("cesium");

/** Cesium sample Cesium_Air — public/models에 복사 */
export const OBSERVE_AIRCRAFT_MODEL_URI = "/models/cesium-air.glb";
/** 추적 대상 외 근접 모델 상한 (near-cluster 모드) */
export const OBSERVE_NEAR_MODEL_MAX = 8;
/** 이 거리(m) 안만 near model 후보 (near-cluster 모드) */
export const OBSERVE_NEAR_MODEL_RADIUS_M = 80_000;
/**
 * 추적 없을 때 — 카메라 중심 근처 모델 수 (near-cluster 모드).
 */
export const OBSERVE_CAMERA_MODEL_MAX = 12;
export const OBSERVE_CAMERA_MODEL_RADIUS_M = 120_000;
/** 이 카메라 고도(m) 아래에서만 카메라-근처 3D (near-cluster 모드) */
export const OBSERVE_MODEL_CAMERA_MAX_HEIGHT_M = 650_000;

/** 원거리에서도 실루엣만 읽히게 — 다수 기체 GPU 부담 완화 */
export const OBSERVE_MODEL_MINIMUM_PIXEL = 28;
export const OBSERVE_MODEL_MAXIMUM_SCALE = 14_000;
/** 샘플 기체 스케일 — 공중에서 실루엣이 읽히게 */
export const OBSERVE_AIRCRAFT_MODEL_SCALE = 1.8;
/** 이 카메라 거리(m) 밖이면 모델 미표시(빌보드 복구) — VRAM 보호 */
export const OBSERVE_MODEL_MAX_CAMERA_DISTANCE_M = 2_800_000;

export type ObserveModelCandidate = {
  entityId: string;
  lat: number;
  lng: number;
  headingDeg: number | null;
};

export type SelectObserveModelMode = "all-displayed" | "near-cluster";

export type SelectObserveModelOpts = {
  /**
   * `all-displayed`(기본): clutter 통과 집합 전부 glTF.
   * `near-cluster`: 추적/저고도 근처만 (레거시).
   */
  mode?: SelectObserveModelMode;
  nearMax?: number;
  radiusM?: number;
  cameraCenter?: { lat: number; lng: number } | null;
  cameraHeightM?: number;
  cameraNearMax?: number;
  cameraRadiusM?: number;
  maxCameraHeightM?: number;
};

function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pickNearestIds(
  centerLat: number,
  centerLng: number,
  candidates: ObserveModelCandidate[],
  excludeId: string | null,
  nearMax: number,
  radiusM: number,
): string[] {
  const ranked = candidates
    .filter((c) => c.entityId !== excludeId)
    .map((c) => ({
      id: c.entityId,
      d: haversineM(centerLat, centerLng, c.lat, c.lng),
    }))
    .filter((c) => c.d <= radiusM)
    .sort((a, b) => a.d - b.d);
  return ranked.slice(0, nearMax).map((r) => r.id);
}

/**
 * glTF를 붙일 mil:/civ: id 집합.
 * 기본(all-displayed): candidates 전부 — 상한은 liveRenderGuard clutter.
 */
export function selectObserveModelEntityIds(
  trackedId: string | null,
  candidates: ObserveModelCandidate[],
  opts?: SelectObserveModelOpts,
): Set<string> {
  const mode = opts?.mode ?? "all-displayed";
  if (mode === "all-displayed") {
    return new Set(candidates.map((c) => c.entityId));
  }

  const out = new Set<string>();
  const nearMax = opts?.nearMax ?? OBSERVE_NEAR_MODEL_MAX;
  const radiusM = opts?.radiusM ?? OBSERVE_NEAR_MODEL_RADIUS_M;

  if (trackedId) {
    out.add(trackedId);
    const center = candidates.find((c) => c.entityId === trackedId);
    if (center) {
      for (const id of pickNearestIds(
        center.lat,
        center.lng,
        candidates,
        trackedId,
        nearMax,
        radiusM,
      )) {
        out.add(id);
      }
    }
    return out;
  }

  const cam = opts?.cameraCenter;
  const camH = opts?.cameraHeightM ?? Number.POSITIVE_INFINITY;
  const maxH = opts?.maxCameraHeightM ?? OBSERVE_MODEL_CAMERA_MAX_HEIGHT_M;
  if (!cam || !Number.isFinite(cam.lat) || !Number.isFinite(cam.lng)) {
    return out;
  }
  if (!(camH <= maxH)) return out;

  for (const id of pickNearestIds(
    cam.lat,
    cam.lng,
    candidates,
    null,
    opts?.cameraNearMax ?? OBSERVE_CAMERA_MODEL_MAX,
    opts?.cameraRadiusM ?? OBSERVE_CAMERA_MODEL_RADIUS_M,
  )) {
    out.add(id);
  }
  return out;
}

function applyOrientation(
  Cesium: CesiumNS,
  entity: import("cesium").Entity,
  position: import("cesium").Cartesian3,
  headingDeg: number | null,
): void {
  if (headingDeg == null || !Number.isFinite(headingDeg)) return;
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(headingDeg - 90),
    0,
    0,
  );
  entity.orientation = new Cesium.ConstantProperty(
    Cesium.Transforms.headingPitchRollQuaternion(position, hpr),
  );
}

function cameraDistanceM(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  position: import("cesium").Cartesian3,
): number {
  return Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
}

/**
 * mil:/civ: 엔티티에만 모델 부여. 집합 밖은 모델 제거·빌보드 복구.
 * 위치(고도)는 billboard sync가 ADS-B ft→m으로 이미 세팅.
 * 카메라에서 너무 멀면 모델 끄고 빌보드로 LOD.
 */
export function syncObserveAircraftModels(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  modelIds: Set<string>,
  headings: Map<string, number | null>,
  trackedId: string | null,
): void {
  const time = viewer.clock.currentTime;
  const maxDist = OBSERVE_MODEL_MAX_CAMERA_DISTANCE_M;

  for (const entity of viewer.entities.values) {
    if (typeof entity.id !== "string") continue;
    if (!entity.id.startsWith("mil:") && !entity.id.startsWith("civ:")) continue;

    const wantModel = modelIds.has(entity.id);
    const position = entity.position?.getValue(time);
    const dist =
      wantModel && position ? cameraDistanceM(Cesium, viewer, position) : Infinity;
    const inRange = Number.isFinite(dist) && dist <= maxDist;

    if (wantModel && inRange && position) {
      applyOrientation(Cesium, entity, position, headings.get(entity.id) ?? null);
      const emphasized = entity.id === trackedId;
      const scale = emphasized
        ? OBSERVE_AIRCRAFT_MODEL_SCALE * 1.15
        : OBSERVE_AIRCRAFT_MODEL_SCALE;
      const minPx = emphasized
        ? OBSERVE_MODEL_MINIMUM_PIXEL + 20
        : OBSERVE_MODEL_MINIMUM_PIXEL;

      if (entity.model) {
        entity.model.show = new Cesium.ConstantProperty(true);
        entity.model.uri = new Cesium.ConstantProperty(OBSERVE_AIRCRAFT_MODEL_URI);
        entity.model.scale = new Cesium.ConstantProperty(scale);
        entity.model.minimumPixelSize = new Cesium.ConstantProperty(minPx);
        entity.model.maximumScale = new Cesium.ConstantProperty(
          OBSERVE_MODEL_MAXIMUM_SCALE,
        );
        entity.model.silhouetteSize = new Cesium.ConstantProperty(
          emphasized ? 1.2 : 0,
        );
        if (emphasized) {
          entity.model.silhouetteColor = new Cesium.ConstantProperty(
            Cesium.Color.fromCssColorString("#39d0ff").withAlpha(0.55),
          );
        }
      } else {
        entity.model = new Cesium.ModelGraphics({
          show: true,
          uri: OBSERVE_AIRCRAFT_MODEL_URI,
          scale,
          minimumPixelSize: minPx,
          maximumScale: OBSERVE_MODEL_MAXIMUM_SCALE,
          runAnimations: false,
          heightReference: Cesium.HeightReference.NONE,
          silhouetteColor: emphasized
            ? Cesium.Color.fromCssColorString("#39d0ff").withAlpha(0.55)
            : Cesium.Color.TRANSPARENT,
          silhouetteSize: emphasized ? 1.2 : 0,
        });
      }
      if (entity.billboard) {
        entity.billboard.show = new Cesium.ConstantProperty(false);
      }
    } else if (entity.model) {
      entity.model = undefined;
      if (entity.billboard) {
        entity.billboard.show = new Cesium.ConstantProperty(true);
      }
    } else if (wantModel && !inRange && entity.billboard) {
      entity.billboard.show = new Cesium.ConstantProperty(true);
    }
  }
  observeRequestRender();
}

export function clearObserveAircraftModels(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): void {
  syncObserveAircraftModels(Cesium, viewer, new Set(), new Map(), null);
}
