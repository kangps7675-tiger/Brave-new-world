/**
 * 해협 통항 배지 + 번들 콜아웃.
 * DOM이 아니라 LabelGraphics — 지명(Wanted/Pretendard)과 같은 필체로 얇게.
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

/** 지명 라벨과 동일 스택 — Segoe/검은 배지 박스 제거 */
const STRAIT_LABEL_FONT =
  '600 12px "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const STRAIT_BADGE_FONT =
  '600 11px "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const STRAIT_PORT_FONT =
  '500 11px "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

/** low/hold는 접두 생략 — [LOW] 삼중 스택이 화면을 더럽혔다 */
function gradePrefix(grade: DisplayGrade): string {
  if (grade === "high") return "● ";
  if (grade === "std") return "· ";
  return "";
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function gridCell(lat: number, lng: number, deg = 0.06): string {
  return `${Math.round(lat / deg)}_${Math.round(lng / deg)}`;
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

/** 통항 배지 — 게이트당 1개 */
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
      font: STRAIT_BADGE_FONT,
      pixelOffsetY: -22,
      scale: 0.92,
    });
  }
  return out;
}

/**
 * 워치보드 번들 콜아웃 — 제목·격자 dedupe.
 * portwatch + ais-gate가 같은 「호르무즈 해협」을 여러 번 올리던 문제 차단.
 */
export function buildBundleCalloutLabels(input: {
  preset: ObserveStraitPreset;
  items: WatchboardItem[];
  lang: "ko" | "en";
  max?: number;
}): StraitLabelEntity[] {
  const max = input.max ?? 2;
  const out: StraitLabelEntity[] = [];
  const radiusKm = input.preset.staticRadiusDeg * 111;
  const seenTitles = new Set<string>();
  const seenCells = new Set<string>();

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
    .sort((a, b) => {
      const rank = (g: DisplayGrade) =>
        g === "high" ? 0 : g === "std" ? 1 : g === "low" ? 2 : 3;
      const dr = rank(a.item.grade) - rank(b.item.grade);
      return dr !== 0 ? dr : a.d - b.d;
    });

  for (const { item } of ranked) {
    if (out.length >= max) break;
    const title = (input.lang === "en" ? item.titleEn : item.titleKo).trim();
    if (!title) continue;
    const titleKey = normalizeTitle(title);
    const cell = gridCell(item.lat!, item.lng!);
    if (seenTitles.has(titleKey) || seenCells.has(cell)) continue;
    seenTitles.add(titleKey);
    seenCells.add(cell);

    const gap = input.lang === "en" ? item.gapNoteEn : item.gapNoteKo;
    // 갭/가격 힌트는 콜아웃을 두껍게 만듦 — 제목 한 줄만
    void gap;
    out.push({
      id: `strait-callout:${item.id}`,
      lat: item.lat!,
      lng: item.lng!,
      text: `${gradePrefix(item.grade)}${title}`,
      fillCss: OBSERVE_STRAIT_CALLOUT_FILL,
      outlineCss: OBSERVE_STRAIT_CALLOUT_OUTLINE,
      font: STRAIT_LABEL_FONT,
      pixelOffsetY: -16,
      scale: 0.9,
    });
  }
  return out;
}

/** 항구 라벨 — 이름·근접 중복 제거 */
export function buildPortLabels(
  ports: StraitPortMarker[],
  lang: "ko" | "en",
): StraitLabelEntity[] {
  const out: StraitLabelEntity[] = [];
  const seen = new Set<string>();
  for (const p of ports) {
    const nameKey = normalizeTitle(p.name);
    const cell = gridCell(p.lat, p.lng, 0.08);
    const key = `${nameKey}|${cell}`;
    if (seen.has(key) || seen.has(nameKey)) continue;
    seen.add(key);
    seen.add(nameKey);
    out.push({
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
      font: STRAIT_PORT_FONT,
      pixelOffsetY: -8,
      scale: 0.82,
    });
  }
  return out;
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
      existing.label.outlineWidth = new Cesium.ConstantProperty(2);
      existing.label.showBackground = new Cesium.ConstantProperty(false);
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
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, label.pixelOffsetY),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: label.scale,
        showBackground: false,
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
        pixelSize: port.kind === "lng-terminal" ? 8 : 6,
        color,
        outlineColor: Cesium.Color.BLACK.withAlpha(0.55),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (
      typeof entity.id === "string" &&
      entity.id.startsWith("strait-portpt:") &&
      !seen.has(entity.id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
