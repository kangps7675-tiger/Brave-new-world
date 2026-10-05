/**
 * 라이브유어맵 확인 타격 — ISR 핀 (화염 코어 삼각형, 만화 폭발 아님).
 */

import { startObservePulseLoop } from "@/lib/cesiumObservePulse";
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

export type CesiumLiveuaStrikePoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  kind: "drone" | "missile";
};

const STRIKE_PREFIX = "liveua-strike:";

/** 확인된 타격만 지구 위에 올리고, 빠진 속보는 지운다. */
export function syncLiveuaStrikeEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  strikes: CesiumLiveuaStrikePoint[],
): void {
  const seen = new Set<string>();
  const scaleByDistance = new Cesium.NearFarScalar(
    OBSERVE_PIN_NEAR_M,
    OBSERVE_PIN_NEAR_SCALE,
    OBSERVE_PIN_FAR_M,
    OBSERVE_PIN_FAR_SCALE,
  );
  for (const strike of strikes) {
    if (!Number.isFinite(strike.lat) || !Number.isFinite(strike.lng)) continue;
    const id = `${STRIKE_PREFIX}${strike.id}`;
    seen.add(id);
    const core = strike.kind === "missile" ? "#f97316" : "#fb923c";
    const image = observeSensorPinUri({
      coreHex: core,
      kind: "strike",
      ringHex: "#fdba74",
    });
    const width = strike.kind === "missile" ? OBSERVE_PIN_WIDTH + 4 : OBSERVE_PIN_WIDTH;
    const height = strike.kind === "missile" ? OBSERVE_PIN_HEIGHT + 6 : OBSERVE_PIN_HEIGHT;
    const position = Cesium.Cartesian3.fromDegrees(strike.lng, strike.lat, 0);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = strike.title;
      existing.show = true;
      existing.billboard.image = new Cesium.ConstantProperty(image);
      existing.billboard.width = new Cesium.ConstantProperty(width);
      existing.billboard.height = new Cesium.ConstantProperty(height);
      continue;
    }
    viewer.entities.add({
      id,
      name: strike.title,
      position,
      billboard: {
        image,
        width,
        height,
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
      entity.id.startsWith(STRIKE_PREFIX) &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

export function attachLiveuaStrikePulse(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  void Cesium;
  return startObservePulseLoop(() => {
    if (viewer.isDestroyed()) return false;
    const t = performance.now() / 1000;
    const pulse = 0.9 + 0.1 * Math.sin(t * 2.4);
    let any = false;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith(STRIKE_PREFIX)) {
        continue;
      }
      const bb = entity.billboard;
      if (!bb) continue;
      any = true;
      bb.scale = new Cesium.ConstantProperty(pulse);
    }
    return any;
  });
}
