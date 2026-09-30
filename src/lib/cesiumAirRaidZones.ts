/**
 * Cesium 관측 — 우크라 NEPTUN 공습/경보 존 (oblast/raion → 펄스 원).
 */

import type { NeptunAlerts } from "@/lib/neptun";
import { geocodeUkraineAlertRegion } from "@/lib/ukraineAlertZones";

type CesiumNS = typeof import("cesium");

const MAX_ZONES = 48;

export function syncAirRaidZoneEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  alerts: NeptunAlerts | null | undefined,
): void {
  const regions = [
    ...(alerts?.oblasts ?? []),
    ...(alerts?.raions ?? []),
  ].slice(0, MAX_ZONES);

  const seen = new Set<string>();
  for (const region of regions) {
    const { lat, lng } = geocodeUkraineAlertRegion(
      region.name,
      region.oblast,
      region.key,
    );
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const id = `airraid:${region.key || `${region.name}-${region.oblast}`}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
    const existing = viewer.entities.getById(id);
    if (existing?.ellipse) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = region.name || region.oblast;
      continue;
    }
    viewer.entities.add({
      id,
      name: region.name || region.oblast || "Air raid",
      position,
      ellipse: {
        semiMajorAxis: 42_000,
        semiMinorAxis: 42_000,
        height: 800,
        material: Cesium.Color.fromCssColorString("#ef4444").withAlpha(0.28),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#fca5a5").withAlpha(0.75),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith("airraid:") &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

export function attachAirRaidZonePulse(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  const remove = viewer.scene.preUpdate.addEventListener(() => {
    if (viewer.isDestroyed()) return;
    const t = performance.now() / 1000;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith("airraid:")) {
        continue;
      }
      const el = entity.ellipse;
      if (!el) continue;
      const pulse = 0.22 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2.6));
      el.material = new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString("#ef4444").withAlpha(pulse),
      );
    }
  });
  return () => remove();
}
