/**
 * 해상 항로 시각 — [Shipping-Lanes](https://github.com/newzealandpaul/Shipping-Lanes)
 * (Benden 2022, CC BY 4.0 · CIA Map of the World's Oceans 기반).
 *
 * 지정 항로가 아니라 통행 경향: 반투명 실선이 겹치면 밀도로 읽힌다.
 * 초크(병목) 근처만 같은 실선이 붉은 톤으로 물든다 — 별도 “핫 코리도어”가 아님.
 */

import type { TransportPath } from "@/data/geoTypes";
import { CHOKEPOINTS } from "@/data/chokepoints";

/** 바다 위 기본 항로 — 반투명 시안 실선 */
export const SHIPPING_LANE_CYAN = "rgba(72, 214, 242, 0.30)";
export const SHIPPING_LANE_CYAN_LIGHT = "rgba(14, 116, 144, 0.38)";

/**
 * 병목(초크) 구간 — 같은 반투명 실선, 시안이 붉게 물든 톤.
 * (불투명 빨강 하이라이트가 아니라 cyan→rose 틴트)
 */
export const SHIPPING_LANE_CHOKE = "rgba(255, 110, 130, 0.34)";
export const SHIPPING_LANE_CHOKE_LIGHT = "rgba(190, 50, 80, 0.40)";

/** @deprecated 이름만 유지 — SHIPPING_LANE_CHOKE 사용 */
export const SHIPPING_LANE_HOT = SHIPPING_LANE_CHOKE;
/** @deprecated */
export const SHIPPING_LANE_HOT_LIGHT = SHIPPING_LANE_CHOKE_LIGHT;

/** 초크 중심에서 이 각도(°) 안이면 병목 틴트 */
export const SHIPPING_CHOKE_RADIUS_DEG = 2.85;

function degDist(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = aLat - bLat;
  const dLng = ((aLng - bLng + 540) % 360) - 180;
  return Math.hypot(dLat, dLng);
}

/**
 * 경로가 초크포인트 병목 구간에 걸치는지.
 * bbox로 빠르게 거르고, 샘플 점으로 확정한다.
 */
export function shippingLaneNearChokepoint(
  path: TransportPath,
  radiusDeg: number = SHIPPING_CHOKE_RADIUS_DEG,
): boolean {
  if (path.kind !== "shipping-lane" || path.points.length < 2) return false;
  const { minLat, maxLat, minLng, maxLng } = path.bbox;
  const pad = radiusDeg;

  for (const choke of CHOKEPOINTS) {
    if (
      choke.lat < minLat - pad ||
      choke.lat > maxLat + pad ||
      choke.lng < minLng - pad ||
      choke.lng > maxLng + pad
    ) {
      continue;
    }
    const samples = [
      path.points[0]!,
      path.points[Math.floor(path.points.length / 2)]!,
      path.points[path.points.length - 1]!,
    ];
    for (const p of samples) {
      if (degDist(p.lat, p.lng, choke.lat, choke.lng) <= radiusDeg) {
        return true;
      }
    }
    if (path.points.length >= 6) {
      for (let i = 1; i < path.points.length - 1; i += Math.ceil(path.points.length / 5)) {
        const p = path.points[i]!;
        if (degDist(p.lat, p.lng, choke.lat, choke.lng) <= radiusDeg) {
          return true;
        }
      }
    }
  }
  return false;
}

export function shippingLaneColor(
  path: TransportPath,
  tone: "dark" | "light" = "dark",
): string {
  const atChoke = shippingLaneNearChokepoint(path);
  if (tone === "light") {
    return atChoke ? SHIPPING_LANE_CHOKE_LIGHT : SHIPPING_LANE_CYAN_LIGHT;
  }
  return atChoke ? SHIPPING_LANE_CHOKE : SHIPPING_LANE_CYAN;
}

/**
 * Major(1) > Middle(2) > Minor(3) — Shipping-Lanes Type → scalerank.
 * 병목 여부와 무관하게 같은 실선 굵기 체계.
 */
export function shippingLaneStroke(path: TransportPath): number {
  const rank = path.scalerank ?? 2;
  if (rank <= 1) return 0.85;
  if (rank === 2) return 0.62;
  return 0.48;
}

/** GeoJSON Type → scalerank */
export function shippingLaneTypeToScalerank(type: unknown): number {
  const t = String(type ?? "").toLowerCase();
  if (t === "major") return 1;
  if (t === "middle" || t === "medium") return 2;
  if (t === "minor") return 3;
  return 2;
}
