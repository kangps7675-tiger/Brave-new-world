/**
 * 관측(Cesium) 지명 라벨 — MapLibre HTML 라벨 대신 LabelGraphics.
 * LOD는 상위 filterObservePlaceLabels로 자른 뒤 넘긴다.
 */

import type { SearchPlace } from "@/data/geoTypes";
import {
  getObservePlaceLabelTier,
  observePlaceLabelFontPx,
  observePlaceLabelScale,
  type ObservePlaceLabelTier,
} from "@/lib/cesiumObservePlaceLod";
import { OBSERVE_PLACE_LABEL_OUTLINE } from "@/lib/observeSensorStyle";

type CesiumNS = typeof import("cesium");

export type CesiumPlaceLabel = Pick<
  SearchPlace,
  "id" | "name" | "nameKo" | "lat" | "lng" | "type" | "population" | "scalerank"
>;

function labelText(place: CesiumPlaceLabel, lang: "ko" | "en"): string {
  if (lang === "ko" && place.nameKo?.trim()) return place.nameKo.trim();
  return place.name?.trim() || place.id;
}

function fillForTier(Cesium: CesiumNS, tier: ObservePlaceLabelTier) {
  if (tier === "country") {
    return Cesium.Color.fromCssColorString("#f8fafc");
  }
  if (tier === "megacity") {
    return Cesium.Color.fromCssColorString("#fef08a");
  }
  if (tier === "city") {
    return Cesium.Color.fromCssColorString("#f8fafc");
  }
  if (tier === "town") {
    return Cesium.Color.fromCssColorString("#e2e8f0");
  }
  return Cesium.Color.fromCssColorString("#cbd5e1");
}

/** place: 접두사 엔티티 diff 동기화 */
export function syncPlaceLabelEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  places: CesiumPlaceLabel[],
  lang: "ko" | "en",
): void {
  const outline = Cesium.Color.fromCssColorString(OBSERVE_PLACE_LABEL_OUTLINE);
  const seen = new Set<string>();

  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue;
    const tier = getObservePlaceLabelTier(place);
    if (!tier) continue;
    const id = `place:${place.id}`;
    seen.add(id);
    const text = labelText(place, lang);
    const position = Cesium.Cartesian3.fromDegrees(place.lng, place.lat, 0);
    const fontPx = observePlaceLabelFontPx(tier);
    const scale = observePlaceLabelScale(tier);
    const fill = fillForTier(Cesium, tier);
    // Wanted / Pretendard — UI와 같은 깔끔한 필체 (Segoe 하드코딩 제거)
    const font =
      tier === "country"
        ? `700 ${fontPx}px "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
        : `600 ${fontPx}px "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    const existing = viewer.entities.getById(id);
    if (existing?.label) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.label.text = new Cesium.ConstantProperty(text);
      existing.label.font = new Cesium.ConstantProperty(font);
      existing.label.fillColor = new Cesium.ConstantProperty(fill);
      existing.label.scale = new Cesium.ConstantProperty(scale);
      continue;
    }
    viewer.entities.add({
      id,
      name: text,
      position,
      label: {
        text,
        font,
        fillColor: fill,
        outlineColor: outline,
        outlineWidth: tier === "country" ? 4 : 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -6),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale,
        showBackground: false,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith("place:") &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
