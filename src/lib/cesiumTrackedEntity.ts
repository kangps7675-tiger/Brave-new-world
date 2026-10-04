/**
 * Observe 모드 live track — Cesium trackedEntity + 1회 ENU 프레임.
 * display-position 캐시: 한 프레임의 DR 샘플을 카메라·빌보드가 공유 (GEV gevDisplayPosition).
 */
import { deadReckonLatLng } from "@/lib/gevLiveTrack";

type CesiumNS = typeof import("cesium");

const MAX_FRAME_ATTEMPTS = 120;
const MIN_TRACKED_RANGE_M = 150;
/** 이미 follow 포즈 근처면 fly 생략하고 즉시 track */
export const HANDOFF_SKIP_DISTANCE_M = 2_800;
/** fly 최소/최대 시간 — 멀수록 길게, 텔레포트 느낌 제거 */
export const HANDOFF_DURATION_MIN_S = 0.55;
export const HANDOFF_DURATION_MAX_S = 1.05;
/** duration 보간에 쓰는 거리 상한(m) */
export const HANDOFF_DURATION_REF_M = 2_500_000;

export type ObserveLiveTrackSpec = {
  entityId: string;
  kind: "ais" | "aircraft";
  follow: boolean;
  lat: number;
  lng: number;
  /** 카메라/엔티티 높이(m) */
  heightM: number;
  speedKn: number | null;
  courseDeg: number | null;
};

export type ObserveLiveTrackFix = {
  entityId: string;
  kind: "ais" | "aircraft";
  lat: number;
  lng: number;
  heightM: number;
  speedKn: number | null;
  courseDeg: number | null;
  at: number;
};

export type DisplaySample = {
  fixKey: string;
  frame: number;
  cartesian: import("cesium").Cartesian3;
};

type ObserveTrackEntity = import("cesium").Entity & {
  /**
   * 이번 프레임에 확정된 표시 좌표.
   * 카메라 framing은 position.getValue를 다시 부르지 말고 여기를 읽는다.
   */
  observeDisplayPosition?: (
    result?: import("cesium").Cartesian3,
  ) => import("cesium").Cartesian3 | undefined;
};

const TRACK_DISPOSE = new WeakMap<object, () => void>();

export function fixKeyOf(fix: ObserveLiveTrackFix): string {
  return [
    fix.entityId,
    fix.at,
    fix.lat,
    fix.lng,
    fix.heightM,
    fix.speedKn ?? "",
    fix.courseDeg ?? "",
  ].join("|");
}

function sceneFrameNumber(viewer: import("cesium").Viewer): number {
  const n = (
    viewer.scene as {
      frameState?: { frameNumber?: number };
    }
  ).frameState?.frameNumber;
  return typeof n === "number" && Number.isFinite(n) ? n : -1;
}

/** ENU viewFrom — 항공기/선박별 측면·후방 오프셋(m) */
export function observeTrackViewFrom(
  Cesium: CesiumNS,
  kind: "ais" | "aircraft",
): import("cesium").Cartesian3 {
  // +X east, +Y north, +Z up — 후측방·약간 위에서 내려다봄
  if (kind === "aircraft") {
    return new Cesium.Cartesian3(-2_800, -6_400, 3_200);
  }
  return new Cesium.Cartesian3(-1_600, -3_800, 2_200);
}

export function deadReckonTrackPosition(
  Cesium: CesiumNS,
  fix: ObserveLiveTrackFix,
  nowMs: number = Date.now(),
): import("cesium").Cartesian3 {
  const dt = Math.min(90, Math.max(0, (nowMs - fix.at) / 1000));
  const pos = deadReckonLatLng(
    fix.lat,
    fix.lng,
    fix.speedKn,
    fix.courseDeg,
    dt,
  );
  return Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, fix.heightM);
}

/**
 * 동일 fix·frame이면 캐시된 Cartesian을 재사용 — DR 재진행 금지.
 * 카메라·빌보드·라벨이 같은 샘플을 쓰게 하는 핵심.
 */
export function ensureDisplaySample(
  Cesium: CesiumNS,
  fix: ObserveLiveTrackFix,
  frame: number,
  cache: { current: DisplaySample | null },
  nowMs: number,
  result?: import("cesium").Cartesian3,
): import("cesium").Cartesian3 {
  const key = fixKeyOf(fix);
  if (
    cache.current &&
    cache.current.fixKey === key &&
    cache.current.frame === frame
  ) {
    // 캐시 Cartesian은 다음 프레임에 in-place 갱신되므로 항상 clone
    return Cesium.Cartesian3.clone(
      cache.current.cartesian,
      result ?? new Cesium.Cartesian3(),
    );
  }
  const cartesian = deadReckonTrackPosition(Cesium, fix, nowMs);
  if (!cache.current) {
    cache.current = {
      fixKey: key,
      frame,
      cartesian: Cesium.Cartesian3.clone(cartesian, new Cesium.Cartesian3()),
    };
  } else {
    cache.current.fixKey = key;
    cache.current.frame = frame;
    Cesium.Cartesian3.clone(cartesian, cache.current.cartesian);
  }
  return Cesium.Cartesian3.clone(
    cache.current.cartesian,
    result ?? new Cesium.Cartesian3(),
  );
}

/**
 * 빌보드 visualizer가 쓴(또는 쓸) 표시 좌표를 카메라가 재사용.
 * CallbackProperty를 다시 호출하면 DR이 한 틱 더 진행되어 아이콘 대비 카메라가 흔들린다.
 */
export function trackedDisplayPositionForCamera(
  Cesium: CesiumNS,
  entity: import("cesium").Entity,
  time: import("cesium").JulianDate,
  result: import("cesium").Cartesian3,
): import("cesium").Cartesian3 | undefined {
  const trackEntity = entity as ObserveTrackEntity;
  const displayed = trackEntity.observeDisplayPosition?.(result);
  if (displayed) return displayed;
  return entity.position?.getValue(time, result);
}

/**
 * 추적 시작 시 한 번 lookAtTransform 한 뒤 EntityView에 맡긴다.
 * 반환 disposer는 trackedEntity 해제·줌 inertia 복구.
 */
export function applyObserveTrackedCameraFrame(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  entity: import("cesium").Entity,
  viewFrom: import("cesium").Cartesian3,
): () => void {
  let attempts = 0;
  let framed = false;
  let stopped = false;
  const trackedTransform = new Cesium.Matrix4();
  const trackedPosition = new Cesium.Cartesian3();
  const previousCameraPosition = new Cesium.Cartesian3();
  const cameraOffset = new Cesium.Cartesian3();

  const controller = viewer.scene.screenSpaceCameraController;
  const originalInertiaZoom = controller.inertiaZoom;
  const originalMinimumZoomDistance = controller.minimumZoomDistance;
  controller.inertiaZoom = 0;
  controller.minimumZoomDistance = Math.max(
    originalMinimumZoomDistance,
    MIN_TRACKED_RANGE_M,
  );

  let remove: (() => void) | null = null;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    remove?.();
    if (!viewer.isDestroyed()) {
      controller.inertiaZoom = originalInertiaZoom;
      controller.minimumZoomDistance = originalMinimumZoomDistance;
    }
  };

  // preUpdate: 빌보드 draw state 확정 전에 framing — 전/후 진동 방지 (GEV와 동일)
  remove = viewer.scene.preUpdate.addEventListener(() => {
    if (viewer.isDestroyed() || viewer.trackedEntity !== entity) {
      stop();
      return;
    }
    if (!framed) {
      attempts += 1;
      // display 캐시 우선 — CallbackProperty 재호출로 DR이 한 틱 더 나가지 않게
      const position = trackedDisplayPositionForCamera(
        Cesium,
        entity,
        viewer.clock.currentTime,
        trackedPosition,
      );
      if (!position) {
        if (attempts >= MAX_FRAME_ATTEMPTS) stop();
        return;
      }
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(
        position,
        Cesium.Ellipsoid.WGS84,
        trackedTransform,
      );
      viewer.camera.lookAtTransform(transform, viewFrom);
      Cesium.Cartesian3.clone(viewer.camera.position, previousCameraPosition);
      framed = true;
      return;
    }

    // EntityView 단독 추적 — 최소 거리만 보정
    const forwardDistance = -Cesium.Cartesian3.dot(
      viewer.camera.position,
      viewer.camera.direction,
    );
    const rangeSquared = Cesium.Cartesian3.magnitudeSquared(
      viewer.camera.position,
    );
    const crossedOrigin =
      Cesium.Cartesian3.dot(viewer.camera.position, previousCameraPosition) <=
      0;
    if (
      crossedOrigin ||
      forwardDistance < MIN_TRACKED_RANGE_M ||
      rangeSquared < MIN_TRACKED_RANGE_M * MIN_TRACKED_RANGE_M
    ) {
      Cesium.Cartesian3.multiplyByScalar(
        viewer.camera.direction,
        -MIN_TRACKED_RANGE_M,
        cameraOffset,
      );
      viewer.camera.lookAtTransform(viewer.camera.transform, cameraOffset);
    }
    Cesium.Cartesian3.clone(viewer.camera.position, previousCameraPosition);
  });

  return stop;
}

/** follow ENU 오프셋 → 월드 카메라 위치 */
export function followCameraWorldPosition(
  Cesium: CesiumNS,
  entityPosition: import("cesium").Cartesian3,
  viewFrom: import("cesium").Cartesian3,
  result?: import("cesium").Cartesian3,
): import("cesium").Cartesian3 {
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(entityPosition);
  return Cesium.Matrix4.multiplyByPoint(
    transform,
    viewFrom,
    result ?? new Cesium.Cartesian3(),
  );
}

/** 거리에 따른 handoff fly 시간(초) */
export function handoffFlyDurationSec(distanceM: number): number {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return HANDOFF_DURATION_MIN_S;
  const t = Math.min(1, distanceM / HANDOFF_DURATION_REF_M);
  return (
    HANDOFF_DURATION_MIN_S +
    (HANDOFF_DURATION_MAX_S - HANDOFF_DURATION_MIN_S) * t
  );
}

export function shouldHandoffFly(distanceM: number): boolean {
  return Number.isFinite(distanceM) && distanceM > HANDOFF_SKIP_DISTANCE_M;
}

export type ObserveFollowOptions = {
  /** handoff flyTo 구간 — 유저 드래그 unlock과 구분 */
  beginProgrammatic?: () => void;
  endProgrammatic?: () => void;
};

/**
 * 선택 핸드오프: 멀면 cinematic fly → 완료 시 trackedEntity.
 * EntityView와 flyTo가 싸우지 않도록 track은 complete 이후에만 건다.
 */
export function startObserveEntityFollow(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  entity: import("cesium").Entity,
  viewFrom: import("cesium").Cartesian3,
  options?: ObserveFollowOptions,
): () => void {
  let disposed = false;
  let frameDispose: (() => void) | null = null;
  let flightActive = false;
  const beginProgrammatic = options?.beginProgrammatic;
  const endProgrammatic = options?.endProgrammatic;
  const entityPos = new Cesium.Cartesian3();
  const camDest = new Cesium.Cartesian3();
  const direction = new Cesium.Cartesian3();
  const up = new Cesium.Cartesian3();
  const right = new Cesium.Cartesian3();

  const finishTrack = () => {
    if (disposed || viewer.isDestroyed()) return;
    entity.viewFrom = new Cesium.ConstantProperty(viewFrom);
    viewer.trackedEntity = entity;
    frameDispose?.();
    frameDispose = applyObserveTrackedCameraFrame(
      Cesium,
      viewer,
      entity,
      viewFrom,
    );
  };

  const cancelFlight = () => {
    if (!flightActive || viewer.isDestroyed()) return;
    flightActive = false;
    try {
      viewer.camera.cancelFlight();
    } catch {
      /* ignore */
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    const wasFlying = flightActive;
    cancelFlight();
    if (wasFlying) endProgrammatic?.();
    frameDispose?.();
    frameDispose = null;
    if (!viewer.isDestroyed() && viewer.trackedEntity === entity) {
      viewer.trackedEntity = undefined;
    }
  };

  const position = trackedDisplayPositionForCamera(
    Cesium,
    entity,
    viewer.clock.currentTime,
    entityPos,
  );
  if (!position) {
    // 위치 없으면 즉시 track 시도 (frame이 자리 잡힐 때까지 retry)
    finishTrack();
    return dispose;
  }

  followCameraWorldPosition(Cesium, position, viewFrom, camDest);
  const distanceM = Cesium.Cartesian3.distance(
    viewer.camera.positionWC,
    camDest,
  );

  if (!shouldHandoffFly(distanceM)) {
    finishTrack();
    return dispose;
  }

  // 카메라 → 타깃 방향 (follow 포즈에서 엔티티를 바라봄)
  Cesium.Cartesian3.subtract(position, camDest, direction);
  if (Cesium.Cartesian3.magnitudeSquared(direction) < Cesium.Math.EPSILON12) {
    finishTrack();
    return dispose;
  }
  Cesium.Cartesian3.normalize(direction, direction);
  Cesium.Cartesian3.normalize(camDest, up);
  Cesium.Cartesian3.cross(direction, up, right);
  if (Cesium.Cartesian3.magnitudeSquared(right) < Cesium.Math.EPSILON12) {
    finishTrack();
    return dispose;
  }
  Cesium.Cartesian3.normalize(right, right);
  Cesium.Cartesian3.cross(right, direction, up);
  Cesium.Cartesian3.normalize(up, up);

  // fly 중에는 trackedEntity를 비워 EntityView와 충돌 방지
  if (viewer.trackedEntity === entity) {
    viewer.trackedEntity = undefined;
  }
  frameDispose?.();
  frameDispose = null;

  flightActive = true;
  beginProgrammatic?.();
  const duration = handoffFlyDurationSec(distanceM);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.clone(camDest),
    orientation: {
      direction: Cesium.Cartesian3.clone(direction),
      up: Cesium.Cartesian3.clone(up),
    },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    maximumHeight: Math.max(
      viewer.camera.positionCartographic?.height ?? 0,
      Cesium.Cartographic.fromCartesian(camDest).height,
    ) + 400_000,
    complete: () => {
      flightActive = false;
      endProgrammatic?.();
      if (disposed || viewer.isDestroyed()) return;
      finishTrack();
    },
    cancel: () => {
      flightActive = false;
      endProgrammatic?.();
    },
  });

  return dispose;
}

/**
 * DR CallbackProperty + 프레임당 1샘플 display 캐시.
 * 같은 frameNumber에서 position.getValue를 여러 번 호출해도 DR이 재진행되지 않는다.
 */
export function attachObserveTrackDeadReckon(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  entity: import("cesium").Entity,
  getFix: () => ObserveLiveTrackFix | null,
): () => void {
  TRACK_DISPOSE.get(entity)?.();

  const cache: { current: DisplaySample | null } = { current: null };
  let fallbackFrame = 0;
  const scratch = new Cesium.Cartesian3();

  // frameState가 아직 안 오른 초기 프레임용 — postRender에서만 증가
  const removePostRender = viewer.scene.postRender.addEventListener(() => {
    fallbackFrame += 1;
  });

  const currentFrame = (): number => {
    const n = sceneFrameNumber(viewer);
    return n >= 0 ? n : fallbackFrame;
  };

  const sample = (
    fix: ObserveLiveTrackFix,
    result?: import("cesium").Cartesian3,
  ) =>
    ensureDisplaySample(
      Cesium,
      fix,
      currentFrame(),
      cache,
      Date.now(),
      result,
    );

  const trackEntity = entity as ObserveTrackEntity;
  trackEntity.observeDisplayPosition = (result) => {
    const fix = getFix();
    if (!fix || fix.entityId !== String(entity.id)) return undefined;
    // ensureDisplaySample이 프레임 캐시 hit 시 DR 없이 clone — 카메라=빌보드 동일 샘플
    return sample(fix, result ?? scratch);
  };

  entity.position = new Cesium.CallbackProperty((time, result) => {
    void time;
    const fix = getFix();
    if (!fix || fix.entityId !== String(entity.id)) {
      return result ?? undefined;
    }
    return sample(fix, result);
  }, false) as unknown as import("cesium").PositionProperty;

  const dispose = () => {
    removePostRender();
    if (trackEntity.observeDisplayPosition) {
      delete trackEntity.observeDisplayPosition;
    }
    cache.current = null;
    if (TRACK_DISPOSE.get(entity) === dispose) {
      TRACK_DISPOSE.delete(entity);
    }
  };
  TRACK_DISPOSE.set(entity, dispose);
  return dispose;
}
