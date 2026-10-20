/**
 * Cesium 관측 — NASA GIBS 연기/에어로졸(OMPS Aerosol Index) 반투명 면.
 * FIRMS 점과 함께 연기 플룸을 보완. 키 불필요.
 */

export const GIBS_SMOKE_CREDIT = {
  label: "NASA GIBS aerosol",
  url: "https://earthdata.nasa.gov/gibs",
} as const;

/** OMPS 에어로졸 지수 — 연기·먼지 플룸 */
export const GIBS_AEROSOL_LAYER_ID = "OMPS_Aerosol_Index";

export function gibsAerosolDateUtc(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function gibsAerosolWmtsUrlTemplate(time = gibsAerosolDateUtc()): string {
  return (
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
    `${GIBS_AEROSOL_LAYER_ID}/default/${time}/` +
    `GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`
  );
}

type CesiumNS = typeof import("cesium");

/**
 * 지표면 연기/에어로졸 타일. 구름 껍질과 별도 — 낮/밤 알파와 충돌하지 않게 약하게.
 */
export function attachGibsAerosolSmoke(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  let layer: import("cesium").ImageryLayer | null = null;
  try {
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: gibsAerosolWmtsUrlTemplate(),
      maximumLevel: 6,
      credit: new Cesium.Credit("NASA GIBS · OMPS Aerosol Index"),
    });
    layer = viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = 0.42;
    layer.brightness = 1.05;
    // 밤에도 희미하게 (연기 추적)
    layer.dayAlpha = 0.45;
    layer.nightAlpha = 0.28;
  } catch (err) {
    console.warn("[attachGibsAerosolSmoke] failed:", err);
  }

  const refreshTimer = window.setInterval(() => {
    if (viewer.isDestroyed() || !layer) return;
    try {
      const provider = new Cesium.UrlTemplateImageryProvider({
        url: gibsAerosolWmtsUrlTemplate(),
        maximumLevel: 6,
        credit: new Cesium.Credit("NASA GIBS · OMPS Aerosol Index"),
      });
      const next = viewer.imageryLayers.addImageryProvider(provider);
      next.alpha = layer.alpha;
      next.dayAlpha = layer.dayAlpha;
      next.nightAlpha = layer.nightAlpha;
      viewer.imageryLayers.remove(layer, false);
      layer = next;
    } catch {
      /* keep previous */
    }
  }, 6 * 60 * 60_000);

  return () => {
    window.clearInterval(refreshTimer);
    if (viewer.isDestroyed()) return;
    if (layer) {
      try {
        viewer.imageryLayers.remove(layer, false);
      } catch {
        /* ignore */
      }
    }
  };
}
