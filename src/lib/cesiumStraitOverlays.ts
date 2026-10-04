/**
 * 해협 씬 정적 밀도 + 통항 게이트 — MapLibre 레이어판이 아니라
 * 활성 해협 viewport 안의 항로·케이블·파이프만 GroundPolyline으로 깐다.
 */

import type { StaticPoint, TransportPath } from "@/data/geoTypes";
import type { MaritimeOverlaySegment } from "@/lib/cesiumMaritimeOverlays";
import {
  gateLinePoints,
  type ObserveStraitPreset,
} from "@/lib/cesiumStraitScene";
import {
  OBSERVE_CHOKE_RING,
  OBSERVE_STRAIT_CABLE,
  OBSERVE_STRAIT_CABLE_WIDTH_M,
  OBSERVE_STRAIT_GATE,
  OBSERVE_STRAIT_GATE_WIDTH_M,
  OBSERVE_STRAIT_PIPELINE,
  OBSERVE_STRAIT_PIPELINE_WIDTH_M,
  OBSERVE_STRAIT_SHIPPING,
  OBSERVE_STRAIT_SHIPPING_WIDTH_M,
} from "@/lib/observeSensorStyle";

const STATIC_PATH_CAP = {
  "shipping-lane": 28,
  "submarine-cable": 18,
  "oil-pipeline": 14,
  "gas-pipeline": 14,
  "subsea-pipeline": 12,
} as const;

function pathKindColor(kind: TransportPath["kind"]): {
  color: string;
  widthM: number;
} | null {
  switch (kind) {
    case "shipping-lane":
      return { color: OBSERVE_STRAIT_SHIPPING, widthM: OBSERVE_STRAIT_SHIPPING_WIDTH_M };
    case "submarine-cable":
      return { color: OBSERVE_STRAIT_CABLE, widthM: OBSERVE_STRAIT_CABLE_WIDTH_M };
    case "oil-pipeline":
    case "gas-pipeline":
    case "subsea-pipeline":
      return { color: OBSERVE_STRAIT_PIPELINE, widthM: OBSERVE_STRAIT_PIPELINE_WIDTH_M };
    default:
      return null;
  }
}

function capForKind(kind: TransportPath["kind"]): number {
  if (kind in STATIC_PATH_CAP) {
    return STATIC_PATH_CAP[kind as keyof typeof STATIC_PATH_CAP];
  }
  return 10;
}

/**
 * 통항 게이트 선만.
 * 혼잡 bbox 링(GroundPolyline 폭 ~1km)은 클로즈업에서 반투명 회색 면처럼 보여 제거.
 * 혼잡 수치는 통항 배지 텍스트로만 읽힌다.
 */
export function buildStraitGateSegments(
  preset: ObserveStraitPreset,
  _congestionColorByChokeId?: Record<string, string | undefined>,
): MaritimeOverlaySegment[] {
  void _congestionColorByChokeId;
  const out: MaritimeOverlaySegment[] = [];
  for (const zoneId of preset.gateZoneIds) {
    const gate = gateLinePoints(zoneId);
    if (gate && gate.length >= 2) {
      out.push({
        id: `strait-gate:${zoneId}`,
        pickId: `alert:ais-gate:${zoneId}`,
        color: OBSERVE_STRAIT_GATE,
        widthM: OBSERVE_STRAIT_GATE_WIDTH_M,
        points: gate,
      });
    }
  }
  return out;
}

/** viewport-cull 된 정적 항로·케이블·파이프 → 세그먼트 */
export function buildStraitStaticPathSegments(
  paths: TransportPath[],
): MaritimeOverlaySegment[] {
  const counts: Record<string, number> = {};
  const out: MaritimeOverlaySegment[] = [];
  for (const path of paths) {
    const style = pathKindColor(path.kind);
    if (!style) continue;
    if (!path.points || path.points.length < 2) continue;
    const n = counts[path.kind] ?? 0;
    if (n >= capForKind(path.kind)) continue;
    counts[path.kind] = n + 1;
    const color =
      typeof path.accentColor === "string" && path.accentColor
        ? path.accentColor
        : style.color;
    out.push({
      id: `strait-static:${path.kind}:${path.id}`,
      pickId: `strait-static:${path.id}`,
      color,
      widthM: style.widthM,
      points: path.points.map((p) => ({ lat: p.lat, lng: p.lng })),
    });
  }
  return out;
}

export type StraitPortMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "port" | "lng-terminal";
};

/** 항구·LNG — 포인트 마커용 (라벨은 callouts에서) */
export function pickStraitPortMarkers(
  points: StaticPoint[],
  max = 18,
): StraitPortMarker[] {
  const out: StraitPortMarker[] = [];
  for (const p of points) {
    if (p.kind !== "port" && p.kind !== "lng-terminal") continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    out.push({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      kind: p.kind,
    });
    if (out.length >= max) break;
  }
  return out;
}

/** 초크 링 기본색 폴백 */
export function straitFallbackRingColor(): string {
  return OBSERVE_CHOKE_RING;
}
