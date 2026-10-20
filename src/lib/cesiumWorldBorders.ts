/**
 * 관측(Cesium) 전 세계 admin-0 윤곽 — public/data/{lite,full}/country-borders.json 경로 배열.
 * 축 허브 빨강 국경은 CesiumSatelliteGlobe.attachAxisHubBorders가 별도로 올린다.
 */

import { axisHubBorderWidthPx } from "@/lib/axisHubCountryPolygons";
import { fetchDataWithFallback } from "@/lib/dataProfile";
import {
  OBSERVE_WORLD_BORDER,
  OBSERVE_WORLD_BORDER_WIDTH_M,
} from "@/lib/observeSensorStyle";

type CompactBorderPath = {
  i?: string;
  k?: string;
  p?: Array<[number, number] | number[]>;
};

function isCompactBorderPath(raw: unknown): raw is CompactBorderPath {
  if (!raw || typeof raw !== "object") return false;
  const p = (raw as CompactBorderPath).p;
  return Array.isArray(p) && p.length >= 2;
}

/** lite 프로필 기준 ~333 세그먼트. 과도한 세그먼트는 잘라 GPU를 지킨다. */
const MAX_BORDER_SEGMENTS = 420;

export async function loadCountryBorderRings(): Promise<
  Array<{ id: string; flatLngLat: number[] }>
> {
  const response = await fetchDataWithFallback("country-borders.json");
  if (!response.ok) {
    throw new Error(`country-borders.json HTTP ${response.status}`);
  }
  const raw = (await response.json()) as unknown;
  const rows = Array.isArray(raw) ? raw : [];
  const out: Array<{ id: string; flatLngLat: number[] }> = [];
  for (const row of rows) {
    if (!isCompactBorderPath(row)) continue;
    const flat: number[] = [];
    for (const pair of row.p ?? []) {
      const lng = pair[0];
      const lat = pair[1];
      if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) {
        continue;
      }
      flat.push(lng, lat);
    }
    if (flat.length < 4) continue;
    out.push({
      id: typeof row.i === "string" ? row.i : `border:${out.length}`,
      flatLngLat: flat,
    });
    if (out.length >= MAX_BORDER_SEGMENTS) break;
  }
  return out;
}

/**
 * GroundPolylinePrimitive로 세계 국경을 올린다. detach 반환.
 */
export function attachWorldAdminBorders(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  rings: Array<{ id: string; flatLngLat: number[] }>,
): () => void {
  if (!rings.length || !Cesium.GroundPolylinePrimitive.isSupported(viewer.scene)) {
    return () => {};
  }

  const color = Cesium.Color.fromCssColorString(OBSERVE_WORLD_BORDER);
  const ids: string[] = [];
  const instances = rings
    .map((ring) => {
      if (ring.flatLngLat.length < 4) return null;
      const id = `world-border:${ring.id}`;
      ids.push(id);
      return new Cesium.GeometryInstance({
        id,
        geometry: new Cesium.GroundPolylineGeometry({
          positions: Cesium.Cartesian3.fromDegreesArray(ring.flatLngLat),
          width: 1.5,
          arcType: Cesium.ArcType.GEODESIC,
          granularity: 0,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      });
    })
    .filter((instance): instance is import("cesium").GeometryInstance => instance != null);

  if (!instances.length) return () => {};

  const primitive = new Cesium.GroundPolylinePrimitive({
    geometryInstances: instances,
    appearance: new Cesium.PolylineColorAppearance(),
    classificationType: Cesium.ClassificationType.BOTH,
    allowPicking: false,
    asynchronous: true,
  });
  viewer.scene.groundPrimitives.add(primitive);

  const scratchCarto = new Cesium.Cartographic();
  let lastPx = -1;
  const removePreRender = viewer.scene.preRender.addEventListener(() => {
    if (viewer.isDestroyed() || primitive.isDestroyed() || !primitive.ready) return;
    const carto = Cesium.Cartographic.fromCartesian(
      viewer.camera.positionWC,
      viewer.scene.globe.ellipsoid,
      scratchCarto,
    );
    const frustum = viewer.camera.frustum as { fovy?: number };
    const px = axisHubBorderWidthPx({
      cameraHeightM: carto.height,
      canvasHeightPx: viewer.scene.canvas.clientHeight,
      fovyRad: frustum.fovy ?? Math.PI / 3,
      widthM: OBSERVE_WORLD_BORDER_WIDTH_M,
    });
    if (px === lastPx) return;
    let wrote = false;
    try {
      for (const id of ids) {
        const attrs = primitive.getGeometryInstanceAttributes(id);
        const slot = attrs?.width;
        if (!slot) continue;
        slot[0] = px;
        attrs.width = slot;
        wrote = true;
      }
    } catch {
      return;
    }
    if (wrote) lastPx = px;
  });

  return () => {
    removePreRender();
    if (!primitive.isDestroyed()) {
      if (!viewer.isDestroyed()) {
        viewer.scene.groundPrimitives.remove(primitive);
      } else {
        primitive.destroy();
      }
    }
  };
}
