/**
 * 해상 항로 — 업스트림 Shipping Lanes 좌표를 그대로 유지한다.
 * (이전: 육지 A*·densify가 vertex를 새로 만들어 원본과 어긋남)
 *
 * 출처: Benden, P. (2022). Global Shipping Lanes. Zenodo.
 * CC BY 4.0 — https://doi.org/10.5281/zenodo.6361763
 * https://github.com/newzealandpaul/Shipping-Lanes
 */

import type { TransportPath } from "@/data/geoTypes";

/** @deprecated 원본 좌표 보존 — no-op. 호출부는 호환용으로 유지. */
export function sanitizeShippingLanePath(path: TransportPath): TransportPath[] {
  return [path];
}

export function sanitizeShippingLanePaths(paths: TransportPath[]): TransportPath[] {
  return paths;
}
