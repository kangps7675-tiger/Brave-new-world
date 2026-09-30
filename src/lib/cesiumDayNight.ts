/**
 * Cesium 관측 — 실제 시각 기준 낮/밤 + 야경(도시광).
 * 낮: Esri 위성 · 밤: NASA Black Marble / VIIRS city lights
 * (야경 텍스처는 연간 합성본, 명암 경계(터미네이터)는 현재 시각에 동기)
 *
 * 멀리서: 어두운 밤 + 야경. 줌인: Esri 위성 디테일 복원 + 야경은 은은한 오버레이.
 *
 * @see ImageryLayer.dayAlpha / nightAlpha (enableLighting 필요)
 * @see https://earthdata.nasa.gov/gibs
 */

export const NIGHT_LIGHTS_CREDIT = {
  label: "NASA Black Marble",
  url: "https://earthdata.nasa.gov/topics/earth-at-night",
} as const;

/** GIBS VIIRS 도시광 (Web Mercator) — 정적 합성, 키 불필요 */
export const GIBS_NIGHT_LIGHTS_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
  "VIIRS_CityLights_2012/default/default/" +
  "GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";

/** 이 고도 이상: 순수 야경 모드 */
const FAR_HEIGHT_M = 4_500_000;
/** 이 고도 이하: 밤에도 Esri 위성 전부 노출 */
const NEAR_HEIGHT_M = 550_000;

type CesiumNS = typeof import("cesium");

function zoomBlend(heightM: number): number {
  if (heightM >= FAR_HEIGHT_M) return 0;
  if (heightM <= NEAR_HEIGHT_M) return 1;
  return (FAR_HEIGHT_M - heightM) / (FAR_HEIGHT_M - NEAR_HEIGHT_M);
}

/**
 * 태양 조명 + 실시간 시계 + 밤쪽 야경.
 * 주간 위성 레이어는 호출부에서 이미 추가된 상태를 가정한다.
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

  // 실제 시각에 맞춘 태양 위치
  viewer.clock.currentTime = Cesium.JulianDate.now();
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

  if (dayLayer) {
    dayLayer.dayAlpha = 1.0;
    dayLayer.nightAlpha = 0.14;
  }

  let nightLayer: import("cesium").ImageryLayer | null = null;
  try {
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: GIBS_NIGHT_LIGHTS_URL,
      maximumLevel: 8,
      credit: new Cesium.Credit("NASA GIBS · VIIRS City Lights / Black Marble"),
    });
    nightLayer = viewer.imageryLayers.addImageryProvider(provider);
    nightLayer.dayAlpha = 0.0;
    nightLayer.nightAlpha = 1.0;
    nightLayer.brightness = 1.35;
    nightLayer.contrast = 1.15;
  } catch (err) {
    console.warn("[attachRealtimeDayNight] night lights failed:", err);
  }

  const carto = new Cesium.Cartographic();
  let lastBlend = -1;

  const applyZoomBlend = () => {
    if (viewer.isDestroyed()) return;
    const heightM = Cesium.Cartographic.fromCartesian(
      viewer.camera.positionWC,
      Cesium.Ellipsoid.WGS84,
      carto,
    ).height;
    const blend = zoomBlend(heightM);
    // 매 프레임 미세 변동 무시
    if (Math.abs(blend - lastBlend) < 0.01) return;
    lastBlend = blend;

    // blend 0(멀리) → 어두운 밤 / blend 1(가까이) → Esri 전부
    if (dayLayer) {
      dayLayer.nightAlpha = 0.14 + blend * (1.0 - 0.14);
    }
    if (nightLayer) {
      // 줌인해도 도시광 글로우는 남기되, 위성 디테일을 가리지 않게 약화
      nightLayer.nightAlpha = 1.0 - blend * 0.55;
      nightLayer.brightness = 1.35 - blend * 0.35;
    }
  };

  applyZoomBlend();
  const removePreRender = viewer.scene.preRender.addEventListener(applyZoomBlend);

  const syncTimer = window.setInterval(() => {
    if (viewer.isDestroyed()) return;
    viewer.clock.currentTime = Cesium.JulianDate.now();
  }, 60_000);

  return () => {
    window.clearInterval(syncTimer);
    removePreRender();
    if (viewer.isDestroyed()) return;
    globe.enableLighting = false;
    if (dayLayer) {
      dayLayer.dayAlpha = 1.0;
      dayLayer.nightAlpha = 1.0;
    }
    if (nightLayer) {
      try {
        viewer.imageryLayers.remove(nightLayer, false);
      } catch {
        /* ignore */
      }
    }
  };
}
