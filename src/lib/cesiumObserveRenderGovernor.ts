/**
 * Observe(Cesium)용 얇은 idle render governor.
 * GEV renderGovernor 패턴: hold가 있으면 continuous, 없으면 requestRenderMode.
 */

type ViewerLike = {
  scene?: {
    requestRenderMode?: boolean;
    maximumRenderTimeChange?: number;
    requestRender?: () => void;
  } | null;
};

let _viewer: ViewerLike | null = null;
let _installed = false;
const _holds = new Set<string>();

function applyMode(): void {
  if (!_installed || !_viewer?.scene) return;
  const continuous = _holds.size > 0;
  const scene = _viewer.scene;
  if (scene.requestRenderMode === !continuous) return;
  scene.requestRenderMode = !continuous;
  if (!continuous) {
    scene.requestRender?.();
  }
}

export function installObserveRenderGovernor(viewer: ViewerLike): void {
  if (!viewer?.scene) {
    throw new TypeError("installObserveRenderGovernor requires a Cesium viewer");
  }
  _viewer = viewer;
  _installed = true;
  viewer.scene.maximumRenderTimeChange = Number.POSITIVE_INFINITY;
  applyMode();
}

export function holdObserveRender(ownerId: string): void {
  if (!ownerId) return;
  _holds.add(ownerId);
  applyMode();
}

export function releaseObserveRender(ownerId: string): void {
  if (!ownerId) return;
  _holds.delete(ownerId);
  applyMode();
}

export function observeRequestRender(): void {
  if (!_installed || !_viewer?.scene) return;
  _viewer.scene.requestRender?.();
}

export function uninstallObserveRenderGovernor(viewer: ViewerLike): void {
  if (_viewer !== viewer) return;
  _viewer = null;
  _installed = false;
  _holds.clear();
}

/** 테스트용 */
export function _resetObserveRenderGovernorForTest(): void {
  _viewer = null;
  _installed = false;
  _holds.clear();
}
