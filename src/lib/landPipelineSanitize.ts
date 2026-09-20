/**
 * GEM 육상 송유·가스관 — 해역을 가로지르는 긴 직선 구간을 끊는다.
 * (만·해협을 가로지르는 sparse chord가 적도처럼 보이던 문제)
 */

import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
import { isLandLngLat } from "@/lib/landMask1deg";

const DEG2RAD = Math.PI / 180;

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function haversineKm(a: TransportPathPoint, b: TransportPathPoint): number {
  const phi1 = a.lat * DEG2RAD;
  const phi2 = b.lat * DEG2RAD;
  const dPhi = (b.lat - a.lat) * DEG2RAD;
  const dLambda = (b.lng - a.lng) * DEG2RAD;
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 구간 샘플 중 바다가 절반 이상이면 true */
function segmentMostlyOcean(
  a: TransportPathPoint,
  b: TransportPathPoint,
  samples = 12,
): boolean {
  let ocean = 0;
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    const lat = a.lat + (b.lat - a.lat) * t;
    const dLng = ((b.lng - a.lng + 540) % 360) - 180;
    const lng = wrapLng(a.lng + dLng * t);
    if (!isLandLngLat(lng, lat)) ocean += 1;
  }
  return ocean / (samples - 1) >= 0.45;
}

/**
 * 긴 해양 가로지르기 구간에서 경로를 분할. 짧은 연안 점프(<80km)는 유지.
 */
export function sanitizeLandPipelinePath(path: TransportPath): TransportPath[] {
  const pts = path.points;
  if (pts.length < 2) return [path];

  const chunks: TransportPathPoint[][] = [];
  let current: TransportPathPoint[] = [pts[0]!];

  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1]!;
    const next = pts[i]!;
    const km = haversineKm(prev, next);
    const cut = km >= 80 && segmentMostlyOcean(prev, next);
    if (cut) {
      if (current.length >= 2) chunks.push(current);
      current = [next];
      continue;
    }
    current.push(next);
  }
  if (current.length >= 2) chunks.push(current);

  if (chunks.length === 0) return [];
  if (chunks.length === 1 && chunks[0]!.length === pts.length) return [path];

  return chunks.map((points, index) => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of points) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    return {
      ...path,
      id: chunks.length === 1 ? path.id : `${path.id}~${index}`,
      points,
      bbox: { minLat, minLng, maxLat, maxLng },
    };
  });
}

export function sanitizeLandPipelinePaths(paths: TransportPath[]): TransportPath[] {
  const out: TransportPath[] = [];
  for (const path of paths) {
    out.push(...sanitizeLandPipelinePath(path));
  }
  return out;
}
