/**
 * 관측(Cesium) conflict-events 핀 — DOM 네온 배지 대신 billboard + displayGrade 링.
 */

import type { ConflictEventHtmlMarker } from "@/lib/conflictEvents/buildLayer";
import {
  OBSERVE_CATEGORY_HEX,
  OBSERVE_CONFLICT_PIN_MAX,
  observeGradeStyle,
} from "@/lib/observeSensorStyle";
import { startObservePulseLoop } from "@/lib/cesiumObservePulse";

type CesiumNS = typeof import("cesium");

const URI_CACHE = new Map<string, string>();

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function pinSvg(accentHex: string, ringHex: string, ringWidth: number): string {
  const rw = Math.max(1.5, ringWidth);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="15" fill="none" stroke="${ringHex}" stroke-width="${rw}" opacity="0.95"/>
  <circle cx="20" cy="20" r="15.8" fill="none" stroke="rgba(0,0,0,0.75)" stroke-width="2.2"/>
  <circle cx="20" cy="20" r="6.5" fill="${accentHex}" stroke="rgba(2,6,23,0.9)" stroke-width="1.5"/>
</svg>`;
}

function billboardUri(accent: string, gradeKey: string, ringHex: string, scale: number): string {
  const cacheKey = `${accent}|${gradeKey}|${scale.toFixed(2)}`;
  let uri = URI_CACHE.get(cacheKey);
  if (!uri) {
    const accentHex = OBSERVE_CATEGORY_HEX[accent] ?? OBSERVE_CATEGORY_HEX.white;
    uri = svgDataUri(pinSvg(accentHex, ringHex, 2.2 * scale));
    URI_CACHE.set(cacheKey, uri);
  }
  return uri;
}

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

  for (const event of capped) {
    const id = `conflict:${event.markerId}`;
    seen.add(id);
    const grade = observeGradeStyle(event.displayGrade);
    const image = billboardUri(
      event.accent,
      event.displayGrade ?? "low",
      grade.stroke,
      grade.scale,
    );
    const px = Math.round(28 * grade.scale);
    const heightM = 350 + Math.min(1_800, (event.intensity ?? 0.4) * 2_200);
    const position = Cesium.Cartesian3.fromDegrees(event.lng, event.lat, heightM);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.billboard.image = new Cesium.ConstantProperty(image);
      existing.billboard.width = new Cesium.ConstantProperty(px);
      existing.billboard.height = new Cesium.ConstantProperty(px);
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
        width: px,
        height: px,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        color: Cesium.Color.WHITE.withAlpha(grade.alpha),
        scale: 1,
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
    const pulse = 0.88 + 0.12 * Math.sin(t * 3.2);
    let any = false;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith("conflict:")) continue;
      if (!entity.billboard) continue;
      const image = entity.billboard.image?.getValue?.(viewer.clock.currentTime);
      if (typeof image !== "string" || !image.includes("%2334d399")) continue;
      any = true;
      entity.billboard.scale = new Cesium.ConstantProperty(pulse);
    }
    return any;
  });
}
