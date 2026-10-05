/**
 * 라이브유어맵 지상군 공격 — ISR 핀 (× 글리프).
 */

import {
  OBSERVE_PIN_FAR_M,
  OBSERVE_PIN_FAR_SCALE,
  OBSERVE_PIN_HEIGHT,
  OBSERVE_PIN_NEAR_M,
  OBSERVE_PIN_NEAR_SCALE,
  OBSERVE_PIN_WIDTH,
  observeSensorPinUri,
} from "@/lib/cesiumObservePins";

type CesiumNS = typeof import("cesium");

export type CesiumLiveuaGroundPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
};

const GROUND_PREFIX = "liveua-ground:";
const GROUND_URI = observeSensorPinUri({
  coreHex: "#a8a29e",
  kind: "ground",
  ringHex: "#d6d3d1",
});

/** 지상군 공격 마커만 올리고, 빠진 속보는 지운다. */
export function syncLiveuaGroundEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  points: CesiumLiveuaGroundPoint[],
): void {
  const seen = new Set<string>();
  const scaleByDistance = new Cesium.NearFarScalar(
    OBSERVE_PIN_NEAR_M,
    OBSERVE_PIN_NEAR_SCALE,
    OBSERVE_PIN_FAR_M,
    OBSERVE_PIN_FAR_SCALE,
  );
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
    const id = `${GROUND_PREFIX}${point.id}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(point.lng, point.lat, 0);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = point.title;
      existing.show = true;
      continue;
    }
    viewer.entities.add({
      id,
      name: point.title,
      position,
      billboard: {
        image: GROUND_URI,
        width: OBSERVE_PIN_WIDTH,
        height: OBSERVE_PIN_HEIGHT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 8_000,
        scale: 1,
        scaleByDistance,
        color: Cesium.Color.WHITE,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith(GROUND_PREFIX) &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
