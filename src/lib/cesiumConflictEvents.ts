/**
 * 관측(Cesium) conflict-events 핀 — ISR 센서 HUD billboard + displayGrade 링.
 */

import type { ConflictEventHtmlMarker } from "@/lib/conflictEvents/buildLayer";
import {
  OBSERVE_CONFLICT_PIN_MAX,
  observeGradeStyle,
} from "@/lib/observeSensorStyle";
import { startObservePulseLoop } from "@/lib/cesiumObservePulse";
import {
  OBSERVE_PIN_FAR_M,
  OBSERVE_PIN_FAR_SCALE,
  OBSERVE_PIN_HEIGHT,
  OBSERVE_PIN_NEAR_M,
  OBSERVE_PIN_NEAR_SCALE,
  OBSERVE_PIN_WIDTH,
  observePinCoreHex,
  observeSensorPinUri,
} from "@/lib/cesiumObservePins";

type CesiumNS = typeof import("cesium");

export type CesiumConflictEventPoint = Pick<
  ConflictEventHtmlMarker,
  | "markerId"
  | "clusterId"
  | "lat"
  | "lng"
  | "category"
  | "accent"
  | "displayGrade"
  | "titleKo"
  | "titleEn"
  | "intensity"
>;

/** conflict: 접두사 엔티티 diff. 상한 OBSERVE_CONFLICT_PIN_MAX. */
export function syncConflictEventEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  events: CesiumConflictEventPoint[],
): void {
  const capped = events
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
    .slice(0, OBSERVE_CONFLICT_PIN_MAX);
  const seen = new Set<string>();
  const scaleByDistance = new Cesium.NearFarScalar(
    OBSERVE_PIN_NEAR_M,
    OBSERVE_PIN_NEAR_SCALE,
    OBSERVE_PIN_FAR_M,
    OBSERVE_PIN_FAR_SCALE,
  );

  for (const event of capped) {
    const id = `conflict:${event.markerId}`;
    seen.add(id);
    const grade = observeGradeStyle(event.displayGrade);
    const image = observeSensorPinUri({
      coreHex: observePinCoreHex(event.accent),
      kind: "conflict",
      ringHex: grade.stroke,
      ringWidth: 1.4 * grade.scale,
      focused: grade.pulse,
    });
    const pxW = Math.round(OBSERVE_PIN_WIDTH * grade.scale);
    const pxH = Math.round(OBSERVE_PIN_HEIGHT * grade.scale);
    const position = Cesium.Cartesian3.fromDegrees(event.lng, event.lat, 0);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.billboard.image = new Cesium.ConstantProperty(image);
      existing.billboard.width = new Cesium.ConstantProperty(pxW);
      existing.billboard.height = new Cesium.ConstantProperty(pxH);
      existing.billboard.color = new Cesium.ConstantProperty(
        Cesium.Color.WHITE.withAlpha(grade.alpha),
      );
      continue;
    }
    viewer.entities.add({
      id,
      name: event.titleKo || event.titleEn || event.clusterId,
      position,
      billboard: {
        image,
        width: pxW,
        height: pxH,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 8_000,
        color: Cesium.Color.WHITE.withAlpha(grade.alpha),
        scale: 1,
        scaleByDistance,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith("conflict:") &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

/** high 등급 약한 펄스 */
export function attachConflictEventPulse(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  return startObservePulseLoop(() => {
    if (viewer.isDestroyed()) return false;
    const t = performance.now() / 1000;
    const pulse = 0.92 + 0.08 * Math.sin(t * 2.8);
    let any = false;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith("conflict:")) continue;
      if (!entity.billboard) continue;
      // focused/high 핀만 살짝 호흡
      const image = entity.billboard.image?.getValue?.(viewer.clock.currentTime);
      if (typeof image !== "string" || !image.includes("34d399")) continue;
      any = true;
      entity.billboard.scale = new Cesium.ConstantProperty(pulse);
    }
    return any;
  });
}
