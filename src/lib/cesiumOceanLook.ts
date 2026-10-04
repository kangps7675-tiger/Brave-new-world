/**
 * Cesium 관측 — Google Earth식 바다.
 * 해저(위성/실사 imagery)가 비치고, waterMask 픽셀에만 얇은 액체(반사·노멀) 층을 얹는다.
 * 글로브 전체를 딥블루로 칠하지 않는다 — 그건 육지 갭에 파란/회색 폴리곤으로 번진다.
 */

type CesiumNS = typeof import("cesium");

/**
 * 타일 로드 전·잠깐 보이는 밑색만 (바다 페인트 아님).
 * 실제 해저는 imagery가 그리고, 물은 showWaterEffect가 얹는다.
 */
export const OBSERVE_OCEAN_BASE = "#0a0a0a";

/**
 * waterMask terrain이 준비된 뒤 호출.
 * showWaterEffect + oceanNormal → 마스크된 바다에만 “담긴 물” 느낌.
 */
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
    g.showWaterEffect = true;
  }
  try {
    const url = Cesium.buildModuleUrl("Assets/Textures/waterNormals.jpg");
    if (url) {
      g.oceanNormalMapUrl = url;
    }
  } catch (err) {
    console.warn("[cesiumOceanLook] oceanNormalMapUrl skipped:", err);
  }
}
