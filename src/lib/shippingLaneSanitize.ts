import type { TransportPath } from "@/data/geoTypes";

/**
 * 해상 항로 — 과도한 단순화로 생긴 긴 현(chord)이 육지를 가로지르는 걸 막는다.
 * 항로는 “지정 항로”가 아니라 통행 경향이므로, 의심 구간은 끊어서 밀도 느낌만 남긴다.
 */

/** 이보다 긴 구간(°)은 육지 관통 후보 — 끊는다 */
const MAX_SEGMENT_DEG = 1.85;

/**
 * 주요 육지 박스 — 중점이 여기 있으면 해상 현으로 보지 않는다.
 * (해협·연안 항로는 박스 밖/가장자리를 지나가도록 여유를 둔다)
 */
const LAND_BOXES: ReadonlyArray<{
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}> = [
  // 대만 본섬 내륙 (해협·동해안 항로와 겹치지 않게 안쪽만)
  { minLng: 120.55, maxLng: 121.7, minLat: 22.4, maxLat: 24.9 },
  // 하이난 내륙
  { minLng: 109.0, maxLng: 110.6, minLat: 18.5, maxLat: 19.8 },
  // 큐슈 내륙
  { minLng: 130.2, maxLng: 131.5, minLat: 31.6, maxLat: 33.3 },
  // 시코쿠 내륙
  { minLng: 132.8, maxLng: 134.0, minLat: 33.5, maxLat: 34.2 },
  // 혼슈 내륙
  { minLng: 136.2, maxLng: 140.2, minLat: 34.8, maxLat: 36.8 },
  // 한반도 내륙
  { minLng: 126.8, maxLng: 128.8, minLat: 35.2, maxLat: 37.8 },
  // 산둥 내륙
  { minLng: 117.0, maxLng: 120.5, minLat: 35.2, maxLat: 37.4 },
  // 푸젠·저장 내륙 (해협 쪽은 제외)
  { minLng: 117.2, maxLng: 119.0, minLat: 25.2, maxLat: 29.8 },
  // 루손 내륙
  { minLng: 120.7, maxLng: 121.8, minLat: 16.0, maxLat: 18.0 },
];

function segmentDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = b.lat - a.lat;
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return Math.hypot(dLat, dLng);
}

function pointInLand(lat: number, lng: number): boolean {
  return LAND_BOXES.some(
    (box) =>
      lng >= box.minLng &&
      lng <= box.maxLng &&
      lat >= box.minLat &&
      lat <= box.maxLat,
  );
}

function midpointInLand(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  const lat = (a.lat + b.lat) / 2;
  const lng = a.lng + ((((b.lng - a.lng + 540) % 360) - 180) / 2);
  return pointInLand(lat, lng);
}

function shouldBreakSegment(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  const deg = segmentDeg(a, b);
  if (deg > MAX_SEGMENT_DEG) return true;
  if (deg > 0.35 && midpointInLand(a, b)) return true;
  return false;
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
    if (pointInLand(pt.lat, pt.lng)) {
      current = [];
      return;
    }
    current = [pt];
  };

  startPiece(path.points[0]!);

  for (let i = 1; i < path.points.length; i += 1) {
    const prev = path.points[i - 1]!;
    const next = path.points[i]!;
    if (current.length === 0) {
      startPiece(next);
      continue;
    }
    if (shouldBreakSegment(prev, next) || pointInLand(next.lat, next.lng)) {
      flushPiece(path, current, piece, out);
      piece += 1;
      startPiece(next);
      continue;
    }
    current.push(next);
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
