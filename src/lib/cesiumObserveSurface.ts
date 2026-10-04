/**
 * Observe 표면 스택 FSM — photoreal ↔ satellite.
 * generation으로 레이스 무시, imagery alpha crossfade, tile progress settle.
 */
import {
  holdObserveRender,
  observeRequestRender,
  releaseObserveRender,
} from "@/lib/cesiumObserveRenderGovernor";

export type ObserveSurfaceKind = "photoreal" | "satellite";

export const OBSERVE_SURFACE_FADE_MS = 280;
export const OBSERVE_SETTLE_IDLE_MS = 700;
export const OBSERVE_SETTLE_TIMEOUT_MS = 8_000;

type ImageryLayerLike = {
  alpha: number;
  show: boolean;
};

type TilesetLike = {
  show: boolean;
  isDestroyed: () => boolean;
  /** Cesium3DTileset — 큐가 비고 로드 완료일 때 true */
  tilesLoaded?: boolean;
  tileLoadProgressEvent?: {
    addEventListener: (listener: (queued: number) => void) => () => void;
  };
};

type ViewerLike = {
  isDestroyed: () => boolean;
  scene: {
    verticalExaggeration?: number;
    globe: { show: boolean };
    requestRender?: () => void;
  };
};

export type ObserveSurfaceController = {
  switchTo: (
    kind: ObserveSurfaceKind,
    opts?: { immediate?: boolean },
  ) => void;
  /** 품질 SSE 변경 등 — settle 칩만 재시작 */
  armSettle: () => void;
  dispose: () => void;
  generation: () => number;
};

export type CreateObserveSurfaceControllerOpts = {
  viewer: ViewerLike;
  getImageryLayer: () => ImageryLayerLike | null;
  getOsmBuildings: () => { show: boolean } | null;
  getGoogleTileset: () => TilesetLike | null;
  terrainExaggeration: number;
  onSettlingChange: (settling: boolean) => void;
  nowMs?: () => number;
  /** 테스트용 — rAF 대신 동기 스텝 */
  scheduleFade?: (step: (t01: number) => void, durationMs: number) => () => void;
};

function defaultScheduleFade(
  step: (t01: number) => void,
  durationMs: number,
): () => void {
  const t0 = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t01 = Math.min(1, (now - t0) / Math.max(1, durationMs));
    step(t01);
    if (t01 < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** photoreal에서도 살짝 남겨 타일 갭이 빈 글로브/옛 바다색으로 안 보이게 */
export const OBSERVE_PHOTOREAL_IMAGERY_FLOOR = 0.22;

/** photoreal ON → imagery alpha floor, OFF → 1 */
export function imageryAlphaForSurface(
  kind: ObserveSurfaceKind,
  fadeT01: number,
): number {
  const t = easeInOutCubic(Math.min(1, Math.max(0, fadeT01)));
  const floor = OBSERVE_PHOTOREAL_IMAGERY_FLOOR;
  return kind === "photoreal" ? 1 - t * (1 - floor) : floor + t * (1 - floor);
}

export function createObserveSurfaceController(
  opts: CreateObserveSurfaceControllerOpts,
): ObserveSurfaceController {
  let gen = 0;
  let cancelFade: (() => void) | null = null;
    let settleTimer: number | null = null;
  let settleTimeout: number | null = null;
  let settleWatchRemove: (() => void) | null = null;
  let disposed = false;
  const nowMs = opts.nowMs ?? (() => Date.now());
  const scheduleFade = opts.scheduleFade ?? defaultScheduleFade;

  const clearSettleWatch = () => {
    settleWatchRemove?.();
    settleWatchRemove = null;
    if (settleTimer != null) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }
    if (settleTimeout != null) {
      window.clearTimeout(settleTimeout);
      settleTimeout = null;
    }
  };

  const setSettling = (v: boolean) => {
    if (disposed) return;
    opts.onSettlingChange(v);
  };

  const armSettle = () => {
    clearSettleWatch();
    const myGen = gen;
    const tileset = opts.getGoogleTileset();
    if (!tileset || tileset.isDestroyed() || !tileset.show) {
      setSettling(false);
      return;
    }
    setSettling(true);
    let lastQueued = -1;
    let idleSince: number | null = null;

    const finish = () => {
      if (disposed || myGen !== gen) return;
      clearSettleWatch();
      setSettling(false);
      observeRequestRender();
    };

    const tilesReady = () => {
      // tilesLoaded가 있으면 geometric LOD settle 신호로 사용
      if (typeof tileset.tilesLoaded === "boolean") return tileset.tilesLoaded;
      return lastQueued === 0;
    };

    const onProgress = (queued: number) => {
      if (disposed || myGen !== gen) return;
      lastQueued = queued;
      if (queued === 0 && tilesReady()) {
        if (idleSince == null) idleSince = nowMs();
        else if (nowMs() - idleSince >= OBSERVE_SETTLE_IDLE_MS) finish();
      } else {
        idleSince = null;
      }
    };

    if (tileset.tileLoadProgressEvent?.addEventListener) {
      settleWatchRemove = tileset.tileLoadProgressEvent.addEventListener(onProgress);
    }
    // 타임아웃 안전망 + idle/tilesLoaded 폴링
    const poll = () => {
      if (disposed || myGen !== gen) return;
      if (lastQueued === 0 && tilesReady()) {
        if (idleSince == null) idleSince = nowMs();
        if (nowMs() - (idleSince ?? nowMs()) >= OBSERVE_SETTLE_IDLE_MS) {
          finish();
          return;
        }
      } else if (lastQueued === 0 && typeof tileset.tilesLoaded !== "boolean") {
        idleSince = idleSince ?? nowMs();
      } else if (lastQueued > 0) {
        idleSince = null;
      }
      settleTimer = window.setTimeout(poll, 200);
    };
    settleTimer = window.setTimeout(poll, 200);
    settleTimeout = window.setTimeout(() => {
      if (myGen === gen) finish();
    }, OBSERVE_SETTLE_TIMEOUT_MS);
  };

  const applyExaggeration = (kind: ObserveSurfaceKind) => {
    const viewer = opts.viewer;
    if (viewer.isDestroyed()) return;
    if (typeof viewer.scene.verticalExaggeration === "number") {
      viewer.scene.verticalExaggeration =
        kind === "photoreal" ? 1.0 : opts.terrainExaggeration;
    }
    viewer.scene.globe.show = true;
  };

  const switchTo = (kind: ObserveSurfaceKind, switchOpts?: { immediate?: boolean }) => {
    if (disposed || opts.viewer.isDestroyed()) return;
    const myGen = ++gen;
    cancelFade?.();
    cancelFade = null;
    clearSettleWatch();
    releaseObserveRender("surface-fade");

    const imagery = opts.getImageryLayer();
    const buildings = opts.getOsmBuildings();
    const tileset = opts.getGoogleTileset();
    const immediate = Boolean(switchOpts?.immediate);

    const finalize = () => {
      if (disposed || myGen !== gen) return;
      if (imagery) {
        imagery.alpha =
          kind === "photoreal" ? OBSERVE_PHOTOREAL_IMAGERY_FLOOR : 1;
        imagery.show = true;
      }
      if (buildings) buildings.show = kind !== "photoreal";
      if (tileset && !tileset.isDestroyed()) tileset.show = kind === "photoreal";
      applyExaggeration(kind);
      releaseObserveRender("surface-fade");
      observeRequestRender();
      if (kind === "photoreal") armSettle();
      else setSettling(false);
    };

    if (immediate) {
      finalize();
      return;
    }

    // 타일셋 show는 fade 시작 시점에 맞춤 (빈 지구 방지)
    if (tileset && !tileset.isDestroyed()) {
      tileset.show = kind === "photoreal" ? true : tileset.show;
    }
    applyExaggeration(kind);
    holdObserveRender("surface-fade");
    setSettling(kind === "photoreal");

    const fromAlpha = imagery?.alpha ?? (kind === "photoreal" ? 1 : 0);
    const toAlpha = kind === "photoreal" ? 0 : 1;
    cancelFade = scheduleFade((t01) => {
      if (disposed || myGen !== gen) return;
      if (imagery) {
        const e = easeInOutCubic(t01);
        imagery.alpha = fromAlpha + (toAlpha - fromAlpha) * e;
        imagery.show = true;
      }
      if (buildings) {
        buildings.show = kind !== "photoreal" ? t01 > 0.5 : t01 < 0.5;
      }
      observeRequestRender();
      if (t01 >= 1) {
        if (tileset && !tileset.isDestroyed()) {
          tileset.show = kind === "photoreal";
        }
        finalize();
      }
    }, OBSERVE_SURFACE_FADE_MS);
  };

  return {
    switchTo,
    armSettle,
    dispose: () => {
      disposed = true;
      gen += 1;
      cancelFade?.();
      cancelFade = null;
      clearSettleWatch();
      releaseObserveRender("surface-fade");
      setSettling(false);
    },
    generation: () => gen,
  };
}
