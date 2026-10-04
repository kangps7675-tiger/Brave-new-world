/**
 * 해협 통항 배지 + 번들 콜아웃 (등급·빈 채널).
 * DOM 카드가 아니라 LabelGraphics — 지구본 위에 붙인다.
 */

import type { ChokeTransitStress } from "@/lib/portWatch";
import type { WatchboardItem } from "@/lib/intelContract/buildObserveWatchboard";
import type { DisplayGrade } from "@/lib/intelContract/types";
import {
  chokeIdForGateZone,
  gateBadgeAnchor,
  type ObserveStraitPreset,
} from "@/lib/cesiumStraitScene";
import type { StraitPortMarker } from "@/lib/cesiumStraitOverlays";
import {
  OBSERVE_GRADE_RING,
  OBSERVE_STRAIT_BADGE_FILL,
  OBSERVE_STRAIT_BADGE_OUTLINE,
  OBSERVE_STRAIT_CALLOUT_FILL,
  OBSERVE_STRAIT_CALLOUT_OUTLINE,
  OBSERVE_STRAIT_LNG,
  OBSERVE_STRAIT_PORT,
} from "@/lib/observeSensorStyle";

export type StraitLabelEntity = {
  id: string;
  lat: number;
  lng: number;
  text: string;
  fillCss: string;
  outlineCss: string;
  font: string;
  pixelOffsetY: number;
  scale: number;
};

function gradeMark(grade: DisplayGrade): string {
  return OBSERVE_GRADE_RING[grade]?.stroke ? `[${grade.toUpperCase()}]` : "[LOW]";
}

export function formatTransitBadgeText(
  stress: ChokeTransitStress | undefined,
  lang: "ko" | "en",
): string {
  if (!stress || (!stress.recentAvg && !stress.baselineAvg)) {
    return lang === "en" ? "Transit — / baseline —" : "통항 — / 기준선 —";
  }
  const today = Math.round(stress.recentAvg);
  const base = Math.round(stress.baselineAvg);
  if (lang === "en") {
    return `Today ${today} / baseline ${base}`;
  }
  return `오늘 통항 ${today} / 기준선 ${base}`;
}

/** 통항 배지 — 게이트 중심 */
export function buildTransitBadgeLabels(input: {
  preset: ObserveStraitPreset;
  transits: Record<string, ChokeTransitStress>;
  lang: "ko" | "en";
}): StraitLabelEntity[] {
  const out: StraitLabelEntity[] = [];
  for (const zoneId of input.preset.gateZoneIds) {
    const anchor = gateBadgeAnchor(zoneId);
    if (!anchor) continue;
    const chokeId = chokeIdForGateZone(zoneId);
    const stress = chokeId ? input.transits[chokeId] : undefined;
    out.push({
      id: `strait-badge:${zoneId}`,
      lat: anchor.lat,
      lng: anchor.lng,
      text: formatTransitBadgeText(stress, input.lang),
      fillCss: OBSERVE_STRAIT_BADGE_FILL,
      outlineCss: OBSERVE_STRAIT_BADGE_OUTLINE,
      font: '700 13px "Segoe UI", system-ui, sans-serif',
      pixelOffsetY: -28,
      scale: 0.95,
    });
  }
  return out;
}

/** 워치보드 번들 콜아웃 — 활성 해협 근처만 */
export function buildBundleCalloutLabels(input: {
  preset: ObserveStraitPreset;
  items: WatchboardItem[];
  lang: "ko" | "en";
  max?: number;
}): StraitLabelEntity[] {
  const max = input.max ?? 5;
  const out: StraitLabelEntity[] = [];
  const radiusKm = input.preset.staticRadiusDeg * 111;

  const ranked = [...input.items]
    .filter((item) => item.grade !== "drop")
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map((item) => {
      const d = haversineKm(
        input.preset.lat,
        input.preset.lng,
        item.lat!,
        item.lng!,
      );
      return { item, d };
    })
    .filter((row) => row.d <= radiusKm * 1.35)
    .sort((a, b) => a.d - b.d);

  for (const { item } of ranked) {
    if (out.length >= max) break;
    const title = input.lang === "en" ? item.titleEn : item.titleKo;
    const gap = input.lang === "en" ? item.gapNoteEn : item.gapNoteKo;
    const grade = gradeMark(item.grade);
    const gapLine = gap ? `\n${gap}` : "";
    // 가격 반응은 부제에 asset hint가 있을 때만 (자막에 이미 들어온 경우)
    const priceHint =
      item.subtitleKo?.includes("Brent") ||
      item.subtitleEn?.toLowerCase().includes("brent") ||
      item.subtitleKo?.includes("운임") ||
      item.subtitleEn?.toLowerCase().includes("freight")
        ? input.lang === "en"
          ? "\nPrice reaction"
          : "\n가격 반응"
        : "";
    out.push({
      id: `strait-callout:${item.id}`,
      lat: item.lat!,
      lng: item.lng!,
      text: `${grade} ${title}${priceHint}${gapLine}`,
      fillCss: OBSERVE_STRAIT_CALLOUT_FILL,
      outlineCss: OBSERVE_STRAIT_CALLOUT_OUTLINE,
      font: '600 12px "Segoe UI", system-ui, sans-serif',
      pixelOffsetY: -18,
      scale: 0.88,
    });
  }
  return out;
}

export function buildPortLabels(
  ports: StraitPortMarker[],
  lang: "ko" | "en",
): StraitLabelEntity[] {
  return ports.map((p) => ({
    id: `strait-port:${p.id}`,
    lat: p.lat,
    lng: p.lng,
    text:
      p.kind === "lng-terminal"
        ? lang === "en"
          ? `LNG · ${p.name}`
          : `LNG · ${p.name}`
        : p.name,
    fillCss: p.kind === "lng-terminal" ? OBSERVE_STRAIT_LNG : OBSERVE_STRAIT_PORT,
    outlineCss: OBSERVE_STRAIT_BADGE_OUTLINE,
    font: '500 11px "Segoe UI", system-ui, sans-serif',
    pixelOffsetY: -10,
    scale: 0.78,
  }));
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** LabelGraphics diff sync — strait-badge: / strait-callout: / strait-port: */
export function syncStraitLabelEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  labels: StraitLabelEntity[],
): void {
  const seen = new Set<string>();
  for (const label of labels) {
    if (!Number.isFinite(label.lat) || !Number.isFinite(label.lng)) continue;
    seen.add(label.id);
    const position = Cesium.Cartesian3.fromDegrees(label.lng, label.lat, 0);
    const fill = Cesium.Color.fromCssColorString(label.fillCss);
    const outline = Cesium.Color.fromCssColorString(label.outlineCss);
    const existing = viewer.entities.getById(label.id);
    if (existing?.label) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.label.text = new Cesium.ConstantProperty(label.text);
      existing.label.fillColor = new Cesium.ConstantProperty(fill);
      existing.label.outlineColor = new Cesium.ConstantProperty(outline);
      existing.label.font = new Cesium.ConstantProperty(label.font);
      existing.label.pixelOffset = new Cesium.ConstantProperty(
        new Cesium.Cartesian2(0, label.pixelOffsetY),
      );
      existing.label.scale = new Cesium.ConstantProperty(label.scale);
      existing.show = true;
      continue;
    }
    viewer.entities.add({
      id: label.id,
      name: label.text,
      position,
      label: {
        text: label.text,
        font: label.font,
        fillColor: fill,
        outlineColor: outline,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, label.pixelOffsetY),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: label.scale,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString("rgba(2, 12, 18, 0.72)"),
        backgroundPadding: new Cesium.Cartesian2(7, 5),
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    const id = entity.id;
    if (typeof id !== "string") continue;
    if (
      !id.startsWith("strait-badge:") &&
      !id.startsWith("strait-callout:") &&
      !id.startsWith("strait-port:")
    ) {
      continue;
    }
    if (!seen.has(id)) stale.push(entity);
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

/** 항구 점 핀 */
export function syncStraitPortPointEntities(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  ports: StraitPortMarker[],
): void {
  const seen = new Set<string>();
  for (const port of ports) {
    const id = `strait-portpt:${port.id}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(port.lng, port.lat, 0);
    const color = Cesium.Color.fromCssColorString(
      port.kind === "lng-terminal" ? OBSERVE_STRAIT_LNG : OBSERVE_STRAIT_PORT,
    );
    const existing = viewer.entities.getById(id);
    if (existing?.point) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.point.color = new Cesium.ConstantProperty(color);
      existing.show = true;
      continue;
    }
    viewer.entities.add({
      id,
      name: port.name,
      position,
      point: {
        pixelSize: port.kind === "lng-terminal" ? 9 : 7,
        color,
        outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    const id = entity.id;
    if (typeof id !== "string" || !id.startsWith("strait-portpt:")) continue;
    if (!seen.has(id)) stale.push(entity);
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
