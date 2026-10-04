/**
 * Cesium 관측 — 글로브 밑색.
 * Ion waterMask + reflective ocean은 육지/호수·타일 갭에 파란 면으로 번져
 * 「육지 위 푸른 폴리곤」처럼 보이므로 끈다. 바다는 위성/실사 텍스처로만 읽힌다.
 */

type CesiumNS = typeof import("cesium");

/**
 * 타일 로드 전·갭에 보이는 밑색 (중립 암회색).
 * 딥오션(#0a3a52)은 Google 3D/영상 구멍마다 육지에 파란 패치로 비쳤다.
 */
export const OBSERVE_OCEAN_BASE = "#1c1917";

/**
 * 글로브 밑색만 맞추고, waterMask 반사 바다(파란 채움)는 끈다.
 */
export function applyObserveOceanLook(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): void {
  const globe = viewer.scene.globe;
  globe.baseColor = Cesium.Color.fromCssColorString(OBSERVE_OCEAN_BASE);
  // Cesium 기본 showWaterEffect=true + waterNormals → 육지에도 파란 ocean pass
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
