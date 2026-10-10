/**
 * 관측(Cesium) 「위치로 내려가기」— 미터 단위 수직 하강.
 * `flyTo`(지구 반지름 배수, 하한 0.02≈127km)와 별개. 단계:
 * 1) 고궤도 수평 이동으로 목표 직상공 → 2) 같은 위경도에서 높이만 줄임(타일 게이트 경유).
 * 도착 시선은 수직 그대로 — 기울기는 유저가 Ctrl+드래그·Alt+방향키로 직접 한다.
 */

import {
  holdObserveRender,
  releaseObserveRender,
} from "@/lib/cesiumObserveRenderGovernor";

/** 지면 위 최종 여유 높이 */
export const DESCEND_CLEARANCE_M = 600;
/** 1단계 수평 이동 고도 범위 */
export const DESCEND_TRANSIT_MIN_M = 400_000;
export const DESCEND_TRANSIT_MAX_M = 1_500_000;
/** Google 3D 타일이 받아지도록 잠깐 머무는 고도(지면 기준) */
export const DESCEND_TILE_GATE_M = 20_000;
export const DESCEND_TILE_DWELL_MIN_MS = 500;
export const DESCEND_TILE_DWELL_MAX_MS = 1_000;
/** 정확히 −90°는 heading 계산이 흔들린다 */
export const DESCEND_NADIR_PITCH_DEG = -89;

export type DescendPlan = {
  /** null이면 이미 직상공 — 수평 이동 생략 */
  transitHeightM: number | null;
  /** null이면 이미 게이트 아래 — 바로 최종 하강 */
  gateHeightM: number | null;
  finalHeightM: number;
};

export function planObserveDescend(input: {
  currentHeightM: number;
  /** 현재 카메라 지점 ↔ 목표의 지표 거리 */
  surfaceDistanceM: number;
  groundM: number;
  clearanceM?: number;
}): DescendPlan {
  const current = Number.isFinite(input.currentHeightM)
    ? Math.max(0, input.currentHeightM)
    : DESCEND_TRANSIT_MAX_M;
  const ground = Number.isFinite(input.groundM) ? input.groundM : 0;
  const clearance = Math.max(50, input.clearanceM ?? DESCEND_CLEARANCE_M);
  const finalHeightM = ground + clearance;

  const overheadTol = Math.max(2_000, current * 0.05);
  const alreadyOverhead =
    input.surfaceDistanceM <= overheadTol && current <= DESCEND_TRANSIT_MAX_M;
  const transitHeightM = alreadyOverhead
    ? null
    : Math.min(DESCEND_TRANSIT_MAX_M, Math.max(DESCEND_TRANSIT_MIN_M, current));

  const startH = transitHeightM ?? current;
  const gate = ground + DESCEND_TILE_GATE_M;
  const gateHeightM = startH > gate * 1.2 ? gate : null;

  return { transitHeightM, gateHeightM, finalHeightM };
}

export type ObserveDescendOpts = {
  clearanceM?: number;
  /** Google 실사 타일이 켜져 있으면 게이트에서 3D 높이를 다시 잰다 */
  photoreal?: boolean;
  /** 지형 렌더 과장 배율 (photoreal이면 1) */
  terrainExaggeration?: number;
  beginProgrammatic?: () => void;
  endProgrammatic?: () => void;
  done?: (completed: boolean) => void;
};

type Cesium = typeof import("cesium");
type Viewer = import("cesium").Viewer;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, wait(ms).then(() => undefined)]);
}

async function sampleTerrainGroundM(
  Cesium: Cesium,
  viewer: Viewer,
  lng: number,
  lat: number,
  exaggeration: number,
): Promise<number> {
  try {
    const carto = Cesium.Cartographic.fromDegrees(lng, lat);
    const out = await withTimeout(
      Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [carto]),
      1_500,
    );
    const h = out?.[0]?.height;
    if (typeof h === "number" && Number.isFinite(h)) {
      return Math.max(0, h) * exaggeration;
    }
  } catch {
    /* ellipsoid terrain 등 — 해수면 */
  }
  return 0;
}

async function samplePhotorealGroundM(
  Cesium: Cesium,
  viewer: Viewer,
  lng: number,
  lat: number,
  timeoutMs: number,
): Promise<number | null> {
  const scene = viewer.scene;
  if (!scene.sampleHeightSupported) return null;
  try {
    const carto = Cesium.Cartographic.fromDegrees(lng, lat);
    const out = await withTimeout(scene.sampleHeightMostDetailed([carto]), timeoutMs);
    const h = out?.[0]?.height;
    return typeof h === "number" && Number.isFinite(h) ? h : null;
  } catch {
    return null;
  }
}

function loadedGlobeGroundM(
  Cesium: Cesium,
  viewer: Viewer,
  lng: number,
  lat: number,
): number | null {
  try {
    const h = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lng, lat));
    return typeof h === "number" && Number.isFinite(h) ? h : null;
  } catch {
    return null;
  }
}

/**
 * 수직 하강 시작. 반환 함수는 동기적으로 카메라 소유권을 놓는다
 * (endProgrammatic 즉시 호출 — 뒤이어 시작하는 비행의 programmatic 플래그를 덮지 않게).
 */
export function startObserveDescend(
  Cesium: Cesium,
  viewer: Viewer,
  target: { lat: number; lng: number },
  opts?: ObserveDescendOpts,
): () => void {
  const { lat, lng } = target;
  let finished = false;
  let cancelled = false;

  const finish = (completed: boolean) => {
    if (finished) return;
    finished = true;
    detachInput();
    releaseObserveRender("descend");
    opts?.endProgrammatic?.();
    opts?.done?.(completed);
  };

  const cancel = () => {
    if (finished) return;
    cancelled = true;
    finish(false);
    try {
      if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
    } catch {
      /* ignore */
    }
  };

  // 유저가 드래그·휠로 잡으면 다음 단계를 이어 붙이지 않는다
  const canvas = viewer.canvas;
  const onUserInput = () => cancel();
  canvas.addEventListener("pointerdown", onUserInput);
  canvas.addEventListener("wheel", onUserInput, { passive: true });
  function detachInput() {
    canvas.removeEventListener("pointerdown", onUserInput);
    canvas.removeEventListener("wheel", onUserInput);
  }

  const nadir = () => ({
    heading: 0,
    pitch: Cesium.Math.toRadians(DESCEND_NADIR_PITCH_DEG),
    roll: 0,
  });
  const currentHeight = () =>
    viewer.camera.positionCartographic?.height ?? DESCEND_TRANSIT_MAX_M;

  const fly = (heightM: number, durationSec: number, maximumHeight: number) =>
    new Promise<boolean>((resolve) => {
      if (cancelled || viewer.isDestroyed()) {
        resolve(false);
        return;
      }
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, heightM),
        orientation: nadir(),
        duration: durationSec,
        maximumHeight,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
        complete: () => resolve(true),
        cancel: () => resolve(false),
      });
    });

  holdObserveRender("descend");
  opts?.beginProgrammatic?.();

  void (async () => {
    const exaggeration = opts?.photoreal ? 1 : (opts?.terrainExaggeration ?? 1);
    const groundPromise = sampleTerrainGroundM(Cesium, viewer, lng, lat, exaggeration);

    const startCarto = viewer.camera.positionCartographic;
    const startH = currentHeight();
    let surfaceDistanceM = Number.POSITIVE_INFINITY;
    if (startCarto) {
      const geodesic = new Cesium.EllipsoidGeodesic(
        new Cesium.Cartographic(startCarto.longitude, startCarto.latitude),
        Cesium.Cartographic.fromDegrees(lng, lat),
      );
      surfaceDistanceM = geodesic.surfaceDistance;
    }
    // 지면 높이는 1단계와 병렬로 — 수평 이동 계획에는 필요 없다
    const pre = planObserveDescend({
      currentHeightM: startH,
      surfaceDistanceM,
      groundM: 0,
      clearanceM: opts?.clearanceM,
    });

    if (pre.transitHeightM != null) {
      const transitSec = 1.2 + Math.min(1.4, surfaceDistanceM / 5_000_000);
      const ok = await fly(
        pre.transitHeightM,
        transitSec,
        Math.max(startH, pre.transitHeightM),
      );
      if (!ok) return finish(false);
    }

    const groundM = await groundPromise;
    if (cancelled) return;
    const plan = planObserveDescend({
      currentHeightM: currentHeight(),
      surfaceDistanceM: 0,
      groundM,
      clearanceM: opts?.clearanceM,
    });

    let finalGround = groundM;
    if (plan.gateHeightM != null) {
      const ok = await fly(plan.gateHeightM, 1.9, currentHeight());
      if (!ok) return finish(false);
    }

    // 게이트에서 실사 타일 로드 대기 + 실제 렌더 표면 높이로 보정
    if (opts?.photoreal) {
      const t0 = Date.now();
      const h3d = await samplePhotorealGroundM(
        Cesium,
        viewer,
        lng,
        lat,
        DESCEND_TILE_DWELL_MAX_MS,
      );
      if (cancelled) return;
      const left = DESCEND_TILE_DWELL_MIN_MS - (Date.now() - t0);
      if (left > 0) await wait(left);
      if (cancelled) return;
      if (h3d != null) finalGround = Math.max(finalGround, h3d);
    }
    const globeH = loadedGlobeGroundM(Cesium, viewer, lng, lat);
    if (globeH != null) finalGround = Math.max(finalGround, globeH);

    const clearance = Math.max(50, opts?.clearanceM ?? DESCEND_CLEARANCE_M);
    const finalH = finalGround + clearance;
    const ok = await fly(finalH, 1.7, Math.max(currentHeight(), finalH));
    finish(ok);
  })().catch(() => finish(false));

  return cancel;
}
