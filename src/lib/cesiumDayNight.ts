/**
 * Cesium 관측 — 실제 시각 기준 낮/밤(터미네이터 그림자만).
 * 야경(도시광) 텍스처 없음 — 위성 지구본 + 태양 조명으로 밤쪽이 살짝 어두워짐.
 */

type CesiumNS = typeof import("cesium");

/**
 * 태양 조명 + 실시간 시계. 주간 위성 레이어는 호출부에서 이미 추가된 상태를 가정한다.
 */
export function attachRealtimeDayNight(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  dayLayer: import("cesium").ImageryLayer | null,
): () => void {
  const globe = viewer.scene.globe;
  globe.enableLighting = true;
  globe.dynamicAtmosphereLighting = true;
  globe.dynamicAtmosphereLightingFromSun = true;
  if (typeof globe.showGroundAtmosphere === "boolean") {
    globe.showGroundAtmosphere = true;
  }

  viewer.clock.currentTime = Cesium.JulianDate.now();
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

  // 밤쪽도 위성 텍스처는 남기되, 조명으로 그림자처럼만 어두워지게
  if (dayLayer) {
    dayLayer.dayAlpha = 1.0;
    dayLayer.nightAlpha = 0.55;
  }

  const syncTimer = window.setInterval(() => {
    if (viewer.isDestroyed()) return;
    viewer.clock.currentTime = Cesium.JulianDate.now();
  }, 60_000);

  return () => {
    window.clearInterval(syncTimer);
    if (viewer.isDestroyed()) return;
    globe.enableLighting = false;
    if (dayLayer) {
      dayLayer.dayAlpha = 1.0;
      dayLayer.nightAlpha = 1.0;
    }
  };
}
