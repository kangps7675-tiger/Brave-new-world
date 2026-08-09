import type { TransportPath } from "@/data/geoTypes";
import { isLandLngLat } from "@/lib/landMask1deg";

/**
 * 해상 항로 — 육지 관통 현을 끊고, 바다 구간은 촘촘히 densify.
 * 빌드 단계(ocean A*)가 1차 방어. 여기는 런타임 2차 가드.
 */

/** densify 간격 — 육지 샘플링과 densify에 사용 */
const DENSE_STEP_DEG = 0.45;

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function segmentDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = b.lat - a.lat;
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return Math.hypot(dLat, dLng);
}

function lerpPoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: wrapLng(a.lng + dLng * t),
  };
}

function segmentHitsLand(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  const deg = segmentDeg(a, b);
  const samples = Math.max(3, Math.min(24, Math.ceil(deg / 0.35)));
  for (let i = 1; i < samples; i += 1) {
    const p = lerpPoint(a, b, i / samples);
    if (isLandLngLat(p.lng, p.lat)) return true;
  }
  return false;
}

function densifyIfOcean(
  a: { lat: number; lng: number; alt?: number },
  b: { lat: number; lng: number; alt?: number },
): { lat: number; lng: number; alt?: number }[] | null {
  if (segmentHitsLand(a, b)) return null;
  const deg = segmentDeg(a, b);
  if (deg <= DENSE_STEP_DEG) return [a, b];
  // 긴 원해 구간도 육지만 아니면 densify 유지 (끊지 않음)
  const n = Math.min(64, Math.max(2, Math.ceil(deg / DENSE_STEP_DEG)));
  const out: { lat: number; lng: number; alt?: number }[] = [a];
  for (let i = 1; i < n; i += 1) {
    const p = lerpPoint(a, b, i / n);
    if (isLandLngLat(p.lng, p.lat)) return null;
    out.push(p);
  }
  out.push(b);
  return out;
}

function flushPiece(
  source: TransportPath,
  points: { lat: number; lng: number; alt?: number }[],
  pieceIndex: number,
  out: TransportPath[],
): void {
  if (points.length < 2) return;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  out.push({
    ...source,
    id: pieceIndex === 0 ? source.id : `${source.id}~${pieceIndex}`,
    points: points.map((p) => ({ ...p })),
    bbox: { minLat, minLng, maxLat, maxLng },
  });
}

/** 한 항로를 안전한 해상 조각들로 나눈다 */
export function sanitizeShippingLanePath(path: TransportPath): TransportPath[] {
  if (path.kind !== "shipping-lane" || path.points.length < 2) return [path];

  const out: TransportPath[] = [];
  let current: { lat: number; lng: number; alt?: number }[] = [];
  let piece = 0;

  const startPiece = (pt: { lat: number; lng: number; alt?: number }) => {
    if (isLandLngLat(pt.lng, pt.lat)) {
      current = [];
      return;
    }
    current = [pt];
  };

  startPiece(path.points[0]!);

  for (let i = 1; i < path.points.length; i += 1) {
    const next = path.points[i]!;
    if (current.length === 0) {
      startPiece(next);
      continue;
    }
    if (isLandLngLat(next.lng, next.lat)) {
      flushPiece(path, current, piece, out);
      piece += 1;
      current = [];
      continue;
    }
    const dens = densifyIfOcean(current[current.length - 1]!, next);
    if (!dens) {
      flushPiece(path, current, piece, out);
      piece += 1;
      startPiece(next);
      continue;
    }
    for (let j = 1; j < dens.length; j += 1) current.push(dens[j]!);
  }
  flushPiece(path, current, piece, out);
  return out;
}

export function sanitizeShippingLanePaths(paths: TransportPath[]): TransportPath[] {
  const out: TransportPath[] = [];
  for (const path of paths) {
    if (path.kind === "shipping-lane") {
      out.push(...sanitizeShippingLanePath(path));
    } else {
      out.push(path);
    }
  }
  return out;
}
