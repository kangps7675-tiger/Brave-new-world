/**
 * Cesium 관측 — 지구본은 명암·터미네이터 없이 주간 위성 텍스처를 밝게 유지.
 * 시계는 관측대 스크러버용으로만 두고, 지면 조명은 켜지 않는다.
 * 지면 대기(ground atmosphere)는 쓰지 않음 — 원거리에서 지구본이 희뿌옇게 씻김.
 */

type CesiumNS = typeof import("cesium");

/**
 * 실시간 시계만 맞춘다. 지구 표면은 태양 그림자 없이 밝게 둔다.
 * 주간 위성 레이어는 호출부에서 이미 추가된 상태를 가정한다.
 */
export function attachRealtimeDayNight(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  dayLayer: import("cesium").ImageryLayer | null,
): () => void {
  const globe = viewer.scene.globe;
  globe.enableLighting = false;
  globe.dynamicAtmosphereLighting = false;
  globe.dynamicAtmosphereLightingFromSun = false;
  // 지면 대기는 궤도 거리에서 위성 텍스처를 희뿌옇게 덮음 → 끔. 하늘쪽 림만 유지.
  if (typeof globe.showGroundAtmosphere === "boolean") {
    globe.showGroundAtmosphere = false;
  }

  viewer.clock.currentTime = Cesium.JulianDate.now();
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

  if (dayLayer) {
    dayLayer.dayAlpha = 1;
    dayLayer.nightAlpha = 1;
    dayLayer.brightness = 1.45;
    dayLayer.contrast = 0.9;
    dayLayer.gamma = 0.82;
  }

  const syncTimer = window.setInterval(() => {
    if (viewer.isDestroyed()) return;
    viewer.clock.currentTime = Cesium.JulianDate.now();
  }, 60_000);

  return () => {
    window.clearInterval(syncTimer);
    if (viewer.isDestroyed()) return;
    globe.enableLighting = false;
    if (dayLayer && !viewer.isDestroyed()) {
      dayLayer.dayAlpha = 1;
      dayLayer.nightAlpha = 1;
    }
  };
}
