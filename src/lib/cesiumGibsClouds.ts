/**
 * Cesium 관측 모드 — NASA GIBS 구름 현황(운량) 오버레이.
 * 강수·기온·바람 등 기상 상태는 제외. 구름만.
 *
 * @see https://nasa-gibs.github.io/gibs-api-docs/
 * @see https://wvs.earthdata.nasa.gov/ (Worldview Snapshots)
 */

/** 출처 표기 */
export const GIBS_CLOUDS_CREDIT = {
  label: "NASA GIBS clouds",
  url: "https://earthdata.nasa.gov/gibs",
} as const;

/** 구름 분율(운량) — 기상 레이더·기온 아님 */
export const GIBS_CLOUD_LAYER_ID = "MODIS_Terra_Cloud_Fraction_Day";

/** GIBS 타일이 보통 1일 지연이므로 UTC 기준 어제 */
export function gibsCloudDateUtc(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Web Mercator WMTS 템플릿 (Cesium UrlTemplate).
 * `{z}/{y}/{x}` — TileMatrix / TileRow / TileCol.
 */
export function gibsCloudWmtsUrlTemplate(time = gibsCloudDateUtc()): string {
  return (
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
    `${GIBS_CLOUD_LAYER_ID}/default/${time}/` +
    `GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`
  );
}

/**
 * 전 지구 equirectangular 스냅샷 — 회전하는 구름 껍질용.
 * Worldview Snapshots API (키 불필요).
 */
export function gibsCloudGlobeSnapshotUrl(
  time = gibsCloudDateUtc(),
  width = 2048,
  height = 1024,
): string {
  const params = new URLSearchParams({
    REQUEST: "GetMap",
    LAYERS: GIBS_CLOUD_LAYER_ID,
    CRS: "EPSG:4326",
    TIME: time,
    WRAP: "DAY",
    BBOX: "-180,-90,180,90",
    FORMAT: "image/png",
    WIDTH: String(width),
    HEIGHT: String(height),
    AUTOSCALE: "TRUE",
  });
  return `https://wvs.earthdata.nasa.gov/api/v1/snapshot?${params.toString()}`;
}

/** 구름 껍질이 한 바퀴 도는 데 걸리는 초 (시각적 드리프트) */
export const CLOUD_SHELL_REVOLUTION_SEC = 14 * 60;

/**
 * 지표면 위 구름 고도(m). 궤도에서 봐도 지구에 안 붙고 공중에 뜨게 —
 * 실제 운고(~10km)보다 과장.
 */
export const CLOUD_SHELL_ALTITUDES_M = [72_000, 128_000] as const;

type CesiumNS = typeof import("cesium");

/**
 * 관측 지구본에 NASA GIBS 구름을 붙인다.
 * - 지표면 위 고도에 뜬 반투명 껍질(전 지구 스냅샷)을 천천히 회전
 * - pick 비활성 · 포토리얼/Esri 공통 (지형 붙는 타일 오버레이 없음)
 */
export function attachGibsClouds(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  _opts?: { enableTileOverlay?: boolean },
): () => void {
  void _opts;
  let refreshTimer: number | null = null;
  const shellPrimitives: import("cesium").Primitive[] = [];
  let removePreRender: (() => void) | null = null;
  const t0 = performance.now();

  const rebuildShells = (imageUrl: string) => {
    for (const p of shellPrimitives) {
      try {
        viewer.scene.primitives.remove(p);
      } catch {
        /* ignore */
      }
    }
    shellPrimitives.length = 0;
    if (removePreRender) {
      removePreRender();
      removePreRender = null;
    }

    const baseR = Cesium.Ellipsoid.WGS84.maximumRadius;
    const vertexFormat =
      Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;

    CLOUD_SHELL_ALTITUDES_M.forEach((altM, index) => {
      const r = baseR + altM;
      const alpha = index === 0 ? 0.38 : 0.28;
      const appearance = new Cesium.MaterialAppearance({
        material: Cesium.Material.fromType("Image", {
          image: imageUrl,
          transparent: true,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha),
        }),
        translucent: true,
        closed: true,
        faceForward: false,
      });

      const primitive = viewer.scene.primitives.add(
        new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.EllipsoidGeometry({
              radii: new Cesium.Cartesian3(r, r, r),
              vertexFormat,
            }),
          }),
          appearance,
          asynchronous: true,
          allowPicking: false,
          modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
        }),
      );
      shellPrimitives.push(primitive);
    });

    const scratchRot = new Cesium.Matrix3();
    const scratchMat = new Cesium.Matrix4();
    removePreRender = viewer.scene.preRender.addEventListener(() => {
      const elapsed = (performance.now() - t0) / 1000;
      shellPrimitives.forEach((primitive, index) => {
        if (!primitive || primitive.isDestroyed()) return;
        // 바깥 껍질은 조금 더 느리게 — 입체감
        const period = CLOUD_SHELL_REVOLUTION_SEC * (1 + index * 0.22);
        const angle =
          ((elapsed % period) / period) * Math.PI * 2 * (index === 0 ? 1 : -1);
        Cesium.Matrix3.fromRotationZ(angle, scratchRot);
        Cesium.Matrix4.fromRotationTranslation(
          scratchRot,
          Cesium.Cartesian3.ZERO,
          scratchMat,
        );
        primitive.modelMatrix = Cesium.Matrix4.clone(scratchMat);
      });
    });
  };

  const refresh = () => {
    if (viewer.isDestroyed()) return;
    const time = gibsCloudDateUtc();
    rebuildShells(gibsCloudGlobeSnapshotUrl(time));
  };

  refresh();
  refreshTimer = window.setInterval(refresh, 60 * 60 * 1000);

  return () => {
    if (refreshTimer != null) window.clearInterval(refreshTimer);
    if (removePreRender) removePreRender();
    if (viewer.isDestroyed()) return;
    for (const p of shellPrimitives) {
      try {
        viewer.scene.primitives.remove(p);
      } catch {
        /* ignore */
      }
    }
    shellPrimitives.length = 0;
  };
}
