/**
 * Cesium 관측 — NASA FIRMS 화염·연기 빌보드 + 펄스.
 * MapLibre firmsFireIcons SVG 재사용.
 */

import type { FirmsFire } from "@/data/geoTypes";
import {
  FIRMS_FIRE_SVGS,
  type FirmsFireIconCause,
} from "@/lib/firmsFireIcons";

type CesiumNS = typeof import("cesium");

export type CesiumFirmsFirePoint = Pick<FirmsFire, "id" | "lat" | "lng" | "frp"> & {
  soundKind?: FirmsFireIconCause | string | null;
};

const URI_CACHE = new Map<string, string>();

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function causeOf(fire: CesiumFirmsFirePoint): FirmsFireIconCause {
  if (fire.soundKind === "combat" || fire.soundKind === "exercise") {
    return fire.soundKind;
  }
  return "none";
}

function billboardUri(cause: FirmsFireIconCause): string {
  let uri = URI_CACHE.get(cause);
  if (!uri) {
    uri = svgDataUri(FIRMS_FIRE_SVGS[cause]);
    URI_CACHE.set(cause, uri);
  }
  return uri;
}

function sizePx(frp: number | null | undefined): number {
  const f = typeof frp === "number" && Number.isFinite(frp) ? frp : 8;
  return Math.min(52, Math.max(22, 18 + Math.sqrt(Math.max(0, f)) * 2.2));
}

/** FIRMS 엔티티 diff 동기화 */
export function syncFirmsFireEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  fires: CesiumFirmsFirePoint[],
): void {
  const seen = new Set<string>();
  for (const fire of fires) {
    if (!Number.isFinite(fire.lat) || !Number.isFinite(fire.lng)) continue;
    const id = `firms:${fire.id}`;
    seen.add(id);
    const cause = causeOf(fire);
    const image = billboardUri(cause);
    const px = sizePx(fire.frp);
    const heightM = 400 + Math.min(2_400, (fire.frp ?? 10) * 12);
    const position = Cesium.Cartesian3.fromDegrees(fire.lng, fire.lat, heightM);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.billboard.image = new Cesium.ConstantProperty(image);
      existing.billboard.width = new Cesium.ConstantProperty(px);
      existing.billboard.height = new Cesium.ConstantProperty(px * 1.25);
      continue;
    }
    viewer.entities.add({
      id,
      name: `FIRMS ${fire.id}`,
      position,
      billboard: {
        image,
        width: px,
        height: px * 1.25,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 1,
        color: Cesium.Color.WHITE,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith("firms:") &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

/** 화염·연기 숨쉬기 — scale + color alpha 펄스 */
export function attachFirmsFirePulse(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  const remove = viewer.scene.preUpdate.addEventListener(() => {
    if (viewer.isDestroyed()) return;
    const t = performance.now() / 1000;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith("firms:")) continue;
      const bb = entity.billboard;
      if (!bb) continue;
      const phase = (entity.id.charCodeAt(entity.id.length - 1) % 5) * 1.15;
      const pulse = 0.9 + 0.14 * Math.sin(t * 3.4 + phase);
      const alpha = 0.82 + 0.16 * Math.sin(t * 2.1 + phase * 0.6);
      bb.scale = new Cesium.ConstantProperty(pulse);
      bb.color = new Cesium.ConstantProperty(
        Cesium.Color.WHITE.withAlpha(alpha),
      );
    }
  });
  return () => remove();
}
