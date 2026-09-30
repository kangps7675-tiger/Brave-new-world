/**
 * Cesium 관측 — 실제 시각 기준 낮/밤(터미네이터 그림자만).
 * 야경(도시광) 텍스처 없음. 밤쪽은 위성 텍스처를 거의 끄고 조명만으로 어둡게.
 * 지면 대기(ground atmosphere)는 쓰지 않음 — 원거리에서 지구본이 희뿌옇게 씻김.
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
  // 지면 대기는 궤도 거리에서 위성 텍스처를 희뿌옇게 덮음 → 끔. 하늘쪽 림만 유지.
  if (typeof globe.showGroundAtmosphere === "boolean") {
    globe.showGroundAtmosphere = false;
  }

  viewer.clock.currentTime = Cesium.JulianDate.now();
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

  // 밤쪽에 낮 위성(도시·사막 하이라이트)이 비치면 야경처럼 읽힘 → 거의 꺼서 그림자만.
  if (dayLayer) {
    dayLayer.dayAlpha = 1.0;
    dayLayer.nightAlpha = 0.08;
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
