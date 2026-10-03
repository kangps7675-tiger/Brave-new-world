/**
 * 관측(Cesium) — 지정학과 같은 UKMTO·NAVAREA 빗금 + PortWatch 초크 링.
 * 선분 굵기는 지면 폭(m)을 유지해 줌 인/아웃에 맞춰 화면 픽셀이 변한다
 * (축 허브 국경 `axisHubBorderWidthPx`와 동일 방식).
 */

import type { TransportPath } from "@/data/geoTypes";
import { axisHubBorderWidthPx } from "@/lib/axisHubCountryPolygons";
import {
  NAVAREA_HATCH,
  NAVAREA_OUTLINE,
  navareaFeaturesToPaths,
  type NavareaFeaturePoint,
} from "@/lib/navareaHatch";
import {
  ukmtoIncidentToHatchPaths,
  type UkmtoIncidentPoint,
} from "@/lib/ukmtoHatch";

export type CesiumChokeRingInput = {
  id: string;
  lat: number;
  lng: number;
  /** 위도 도(°) 반경 — MapLibre chokeGlowRingSeed.radiusScale 과 동일 */
  radiusScale: number;
  color?: string;
};

export type MaritimeOverlaySegment = {
  /** GeometryInstance id — 고유 */
  id: string;
  /** 클릭 시 alertPins id 와 맞출 픽 id (`alert:ukmto:…`) */
  pickId: string;
  color: string;
  /** 지면 폭(m) — 카메라가 멀면 화면에서 얇아짐 */
  widthM: number;
  points: { lat: number; lng: number }[];
};

const UKMTO_OUTLINE_WIDTH_M = 2_200;
const UKMTO_HATCH_WIDTH_M = 1_100;
const NAVAREA_OUTLINE_WIDTH_M = 2_000;
const NAVAREA_HATCH_WIDTH_M = 1_000;
const CHOKE_RING_WIDTH_M = 2_600;
const CHOKE_RING_DEFAULT = "rgba(245, 158, 11, 0.88)";
const CIRCLE_SEGMENTS = 48;

function pathToSegments(
  paths: TransportPath[],
  opts: {
    pickId: string;
    outlineWidthM: number;
    hatchWidthM: number;
    fallbackOutline: string;
    fallbackHatch: string;
    idPrefix: string;
  },
): MaritimeOverlaySegment[] {
  const out: MaritimeOverlaySegment[] = [];
  let hatchIdx = 0;
  for (const path of paths) {
    if (!path.points || path.points.length < 2) continue;
    const isHatch = path.kind === "conflict-hatch" || path.kind === "dispute-hatch";
    const color =
      (typeof path.accentColor === "string" && path.accentColor) ||
      (isHatch ? opts.fallbackHatch : opts.fallbackOutline);
    out.push({
      id: `${opts.idPrefix}:${path.id}`,
      pickId: opts.pickId,
      color,
      widthM: isHatch ? opts.hatchWidthM : opts.outlineWidthM,
      points: path.points,
    });
    if (isHatch) hatchIdx += 1;
    void hatchIdx;
  }
  return out;
}

function circleRingPoints(
  lat: number,
  lng: number,
  radiusDeg: number,
): { lat: number; lng: number }[] {
  const lngRadius = radiusDeg / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const theta = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    points.push({
      lat: lat + radiusDeg * Math.sin(theta),
      lng: lng + lngRadius * Math.cos(theta),
    });
  }
  return points;
}

/** 지정학 MapLibre 와 동일한 경로 생성 → Cesium 선분 목록 */
export function buildMaritimeOverlaySegments(input: {
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];
  chokeRings: CesiumChokeRingInput[];
  /** Intel 내장 GPU 대비 인스턴스 상한 (건수) */
  maxUkmto?: number;
  maxNavarea?: number;
}): MaritimeOverlaySegment[] {
  const segments: MaritimeOverlaySegment[] = [];
  const maxUkmto = input.maxUkmto ?? 12;
  const maxNavarea = input.maxNavarea ?? 12;

  const ukmto = input.ukmtoIncidents
    .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
    .slice(0, maxUkmto);
  for (const incident of ukmto) {
    const paths = ukmtoIncidentToHatchPaths(incident);
    segments.push(
      ...pathToSegments(paths, {
        pickId: `alert:ukmto:${incident.id}`,
        outlineWidthM: UKMTO_OUTLINE_WIDTH_M,
        hatchWidthM: UKMTO_HATCH_WIDTH_M,
        fallbackOutline: "rgba(20, 20, 20, 0.92)",
        fallbackHatch: "rgba(40, 40, 40, 0.55)",
        idPrefix: "maritime",
      }),
    );
  }

  const navarea = input.navareaFeatures.slice(0, maxNavarea);
  for (const feature of navarea) {
    const paths = navareaFeaturesToPaths([feature]);
    if (!paths.length) continue;
    segments.push(
      ...pathToSegments(paths, {
        pickId: `alert:navarea:${feature.id}`,
        outlineWidthM: NAVAREA_OUTLINE_WIDTH_M,
        hatchWidthM: NAVAREA_HATCH_WIDTH_M,
        fallbackOutline: NAVAREA_OUTLINE,
        fallbackHatch: NAVAREA_HATCH,
        idPrefix: "maritime",
      }),
    );
  }

  for (const ring of input.chokeRings) {
    if (!Number.isFinite(ring.lat) || !Number.isFinite(ring.lng)) continue;
    const radius = Math.max(0.08, ring.radiusScale || 0.35);
    segments.push({
      id: `maritime:choke-ring-${ring.id}`,
      pickId: `alert:portwatch:${ring.id}`,
      color: ring.color || CHOKE_RING_DEFAULT,
      widthM: CHOKE_RING_WIDTH_M,
      points: circleRingPoints(ring.lat, ring.lng, radius),
    });
  }

  return segments;
}

/**
 * GroundPolylinePrimitive 로 올리고, preRender 에서 줌에 맞춰 width 갱신.
 * 반환: detach.
 */
export function attachMaritimeOverlays(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  segments: MaritimeOverlaySegment[],
): () => void {
  if (!segments.length || !Cesium.GroundPolylinePrimitive.isSupported(viewer.scene)) {
    return () => {};
  }

  const widthMById = new Map<string, number>();
  const instances: import("cesium").GeometryInstance[] = [];

  for (const seg of segments) {
    const flat: number[] = [];
    for (const p of seg.points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      flat.push(p.lng, p.lat);
    }
    if (flat.length < 4) continue;
    widthMById.set(seg.id, seg.widthM);
    const color = Cesium.Color.fromCssColorString(seg.color);
    instances.push(
      new Cesium.GeometryInstance({
        id: seg.id,
        geometry: new Cesium.GroundPolylineGeometry({
          positions: Cesium.Cartesian3.fromDegreesArray(flat),
          width: 2,
          arcType: Cesium.ArcType.GEODESIC,
          granularity: 0,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      }),
    );
  }

  if (!instances.length) return () => {};

  // pickId 는 GeometryInstance.id 가 아니라 별도 맵 — id 는 고유해야 함
  const pickIdByGeomId = new Map<string, string>();
  for (const seg of segments) {
    pickIdByGeomId.set(seg.id, seg.pickId);
  }

  const primitive = new Cesium.GroundPolylinePrimitive({
    geometryInstances: instances,
    appearance: new Cesium.PolylineColorAppearance(),
    classificationType: Cesium.ClassificationType.BOTH,
    allowPicking: true,
    asynchronous: true,
  });
  viewer.scene.groundPrimitives.add(primitive);

  const scratchCarto = new Cesium.Cartographic();
  let lastKey = "";
  const removePreRender = viewer.scene.preRender.addEventListener(() => {
    if (viewer.isDestroyed() || primitive.isDestroyed() || !primitive.ready) return;
    const carto = Cesium.Cartographic.fromCartesian(
      viewer.camera.positionWC,
      viewer.scene.globe.ellipsoid,
      scratchCarto,
    );
    const frustum = viewer.camera.frustum as { fovy?: number };
    const canvasH = viewer.scene.canvas.clientHeight;
    const fovy = frustum.fovy ?? Math.PI / 3;
    const height = carto.height;
    // 카메라 고도·캔버스가 거의 같으면 스킵
    const key = `${Math.round(height / 2_000)}:${canvasH}`;
    if (key === lastKey) return;
    lastKey = key;
    try {
      for (const [id, widthM] of widthMById) {
        const px = axisHubBorderWidthPx({
          cameraHeightM: height,
          canvasHeightPx: canvasH,
          fovyRad: fovy,
          widthM,
        });
        const attrs = primitive.getGeometryInstanceAttributes(id);
        if (attrs) attrs.width = [px];
      }
    } catch {
      /* primitive 준비 전 */
    }
  });

  /** pick 결과 id → alert:… 로 해석 (클릭 핸들러용) */
  (primitive as unknown as { __maritimePickIds?: Map<string, string> }).__maritimePickIds =
    pickIdByGeomId;

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

/** Scene.pick 결과가 maritime overlay 이면 alert pickId 반환 */
export function resolveMaritimeOverlayPickId(picked: unknown): string | null {
  if (!picked || typeof picked !== "object") return null;
  const raw = picked as {
    id?: unknown;
    primitive?: { __maritimePickIds?: Map<string, string> };
  };
  const geomId =
    typeof raw.id === "string"
      ? raw.id
      : raw.id && typeof (raw.id as { id?: unknown }).id === "string"
        ? (raw.id as { id: string }).id
        : null;
  if (!geomId) return null;
  const map = raw.primitive?.__maritimePickIds;
  if (map?.has(geomId)) return map.get(geomId) ?? null;
  if (geomId.startsWith("alert:")) return geomId;
  return null;
}
