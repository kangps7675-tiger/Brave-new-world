/**
 * Cesium 관측 — 바다(워터마스크 + 파도 노멀).
 * Ion World Terrain waterMask가 있을 때만 파도 효과가 살아난다.
 * 전면 명암(터미네이터)은 켜지 않는다 — 위성 텍스처 밝기 유지.
 */

type CesiumNS = typeof import("cesium");

/** 타일 로드 전·바다 갭에 보이는 밑색 (딥 오션) */
export const OBSERVE_OCEAN_BASE = "#0a3a52";

/**
 * 지형 waterMask + ocean normal map을 켠다.
 * requestWaterMask:true 로 만든 TerrainProvider가 선행돼야 한다.
 */
export function applyObserveOceanLook(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): void {
  const globe = viewer.scene.globe;
  globe.baseColor = Cesium.Color.fromCssColorString(OBSERVE_OCEAN_BASE);
  try {
    const url = Cesium.buildModuleUrl("Assets/Textures/waterNormals.jpg");
    if (url) {
      globe.oceanNormalMapUrl = url;
    }
  } catch (err) {
    console.warn("[cesiumOceanLook] oceanNormalMapUrl skipped:", err);
  }
}
