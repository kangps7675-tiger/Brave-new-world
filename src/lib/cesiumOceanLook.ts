/**
 * Cesium 관측 — 바다(waterMask) 효과 OFF.
 * 위성/실사 imagery만으로 수역을 읽고, 글로브 딥블루 페인트·액체층은 쓰지 않는다.
 */

type CesiumNS = typeof import("cesium");

/**
 * 타일 로드 전 순간 밑색만 (바다 페인트 아님).
 * 갭은 photoreal 아래 위성 imagery(α=1)로 가린다.
 */
export const OBSERVE_OCEAN_BASE = "#0a0a0a";

/** 글로브 밑색만 맞추고, waterMask 반사 바다는 끈다. */
export function applyObserveOceanLook(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): void {
  const globe = viewer.scene.globe;
  globe.baseColor = Cesium.Color.fromCssColorString(OBSERVE_OCEAN_BASE);

  const g = globe as {
    showWaterEffect?: boolean;
    oceanNormalMapUrl?: string;
  };
  if (typeof g.showWaterEffect === "boolean") {
    g.showWaterEffect = false;
  }
  try {
    g.oceanNormalMapUrl = "";
  } catch {
    /* some Cesium builds reject empty url */
  }
}
