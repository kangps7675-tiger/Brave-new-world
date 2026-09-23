/**
 * 해상 웨이포인트 사이를 바다만 따라가게 — 육지 관통 구간은 1° 격자 A*로 우회한 뒤,
 * 직각 계단을 펴고 모서리를 둥글려 완만한 항로로 만든다.
 * @see scripts/lib/shippingOceanRoute.js
 */

import {
  LAND_MASK_HEIGHT,
  LAND_MASK_WIDTH,
  cellCenter,
  isLandCell,
  isLandLngLat,
  lngLatToCell,
} from "@/lib/landMask1deg";

export type OceanLatLng = { lat: number; lng: number };

const WIDTH = LAND_MASK_WIDTH;
const HEIGHT = LAND_MASK_HEIGHT;
const DENSE_STEP_DEG = 0.45;
const MAX_ASTAR_NODES = 18_000;

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function segmentDeg(a: OceanLatLng, b: OceanLatLng): number {
  const dLat = b.lat - a.lat;
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return Math.hypot(dLat, dLng);
}

function lerpPoint(a: OceanLatLng, b: OceanLatLng, t: number): OceanLatLng {
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: wrapLng(a.lng + dLng * t),
  };
}

export function segmentCrossesLand(
  a: OceanLatLng,
  b: OceanLatLng,
  samples = 8,
): boolean {
  for (let i = 1; i < samples; i += 1) {
    const p = lerpPoint(a, b, i / samples);
    if (isLandLngLat(p.lng, p.lat)) return true;
  }
  return false;
}

function densifyOceanSegment(
  a: OceanLatLng,
  b: OceanLatLng,
  stepDeg = DENSE_STEP_DEG,
): OceanLatLng[] | null {
  const deg = segmentDeg(a, b);
  if (deg < stepDeg) {
    if (segmentCrossesLand(a, b, 6)) return null;
    return [a, b];
  }
  const n = Math.min(64, Math.max(1, Math.ceil(deg / stepDeg)));
  const out: OceanLatLng[] = [a];
  for (let i = 1; i < n; i += 1) {
    const p = lerpPoint(a, b, i / n);
    if (isLandLngLat(p.lng, p.lat)) return null;
    const last = out[out.length - 1]!;
    if (segmentCrossesLand(last, p, 4)) return null;
    if (segmentDeg(last, p) > 0.02) out.push(p);
  }
  if (segmentCrossesLand(out[out.length - 1]!, b, 4)) return null;
  out.push(b);
  return out;
}

export function snapToOcean(lng: number, lat: number): OceanLatLng | null {
  if (!isLandLngLat(lng, lat)) return { lng, lat };
  const { x: cx, y: cy } = lngLatToCell(lng, lat);
  for (let r = 1; r <= 10; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = (cx + dx + WIDTH) % WIDTH;
        const y = cy + dy;
        if (y < 0 || y >= HEIGHT) continue;
        if (!isLandCell(x, y)) return cellCenter(x, y);
      }
    }
  }
  return null;
}

function neighbors(x: number, y: number) {
  // 8방향. 대각선이 셀 모서리의 육지를 깎으면 segmentCrossesLand가 거절한다.
  const out: Array<{ x: number; y: number; cost: number }> = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + WIDTH) % WIDTH;
      const ny = y + dy;
      if (ny < 0 || ny >= HEIGHT) continue;
      out.push({ x: nx, y: ny, cost: dx !== 0 && dy !== 0 ? Math.SQRT2 : 1 });
    }
  }
  return out;
}

function heur(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.min(Math.abs(ax - bx), WIDTH - Math.abs(ax - bx));
  const dy = Math.abs(ay - by);
  return Math.hypot(dx, dy);
}

function astarOcean(start: OceanLatLng, goal: OceanLatLng): OceanLatLng[] | null {
  const s = lngLatToCell(start.lng, start.lat);
  const g = lngLatToCell(goal.lng, goal.lat);
  if (isLandCell(s.x, s.y) || isLandCell(g.x, g.y)) return null;
  if (s.x === g.x && s.y === g.y) return [start, goal];

  const key = (x: number, y: number) => y * WIDTH + x;
  const open: Array<{ x: number; y: number; g: number; f: number }> = [
    { x: s.x, y: s.y, g: 0, f: heur(s.x, s.y, g.x, g.y) },
  ];
  const came = new Map<number, number | undefined>();
  const gScore = new Map<number, number>([[key(s.x, s.y), 0]]);
  const closed = new Set<number>();
  let expanded = 0;

  while (open.length > 0 && expanded < MAX_ASTAR_NODES) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i]!.f < open[bestIdx]!.f) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0]!;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    expanded += 1;

    if (cur.x === g.x && cur.y === g.y) {
      const cells: OceanLatLng[] = [];
      let k: number | undefined = ck;
      while (k != null) {
        const y = Math.floor(k / WIDTH);
        const x = k % WIDTH;
        cells.push(cellCenter(x, y));
        k = came.get(k);
      }
      cells.reverse();
      cells[0] = start;
      cells[cells.length - 1] = goal;
      return cells;
    }

    for (const n of neighbors(cur.x, cur.y)) {
      if (isLandCell(n.x, n.y)) continue;
      // 셀 중심 직선이 육지를 스치면 거부 (해안선 코너컷 방지)
      const from = cellCenter(cur.x, cur.y);
      const to = cellCenter(n.x, n.y);
      const diagonal = n.cost > 1;
      if (segmentCrossesLand(from, to, diagonal ? 8 : 4)) continue;
      const nk = key(n.x, n.y);
      if (closed.has(nk)) continue;
      const tentative = cur.g + n.cost;
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue;
      came.set(nk, ck);
      gScore.set(nk, tentative);
      open.push({
        x: n.x,
        y: n.y,
        g: tentative,
        f: tentative + heur(n.x, n.y, g.x, g.y),
      });
    }
  }
  return null;
}

function routeSegment(a: OceanLatLng, b: OceanLatLng): OceanLatLng[] | null {
  const sa = snapToOcean(a.lng, a.lat);
  const sb = snapToOcean(b.lng, b.lat);
  if (!sa || !sb) return null;
  if (!segmentCrossesLand(sa, sb, 12)) {
    return densifyOceanSegment(sa, sb) || [sa, sb];
  }
  const route = astarOcean(sa, sb);
  if (!route || route.length < 2) return null;
  const dense: OceanLatLng[] = [route[0]!];
  for (let i = 1; i < route.length; i += 1) {
    const dens = densifyOceanSegment(dense[dense.length - 1]!, route[i]!, 0.55);
    if (!dens) dense.push(route[i]!);
    else for (let j = 1; j < dens.length; j += 1) dense.push(dens[j]!);
  }
  return dense;
}

function scrubPiece(points: OceanLatLng[]): OceanLatLng[][] {
  if (points.length === 0) return [];
  const out: OceanLatLng[][] = [];
  let cur: OceanLatLng[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const a = cur[cur.length - 1]!;
    const b = points[i]!;
    if (segmentCrossesLand(a, b, 10) || isLandLngLat(b.lng, b.lat)) {
      if (cur.length >= 2) out.push(cur);
      cur = isLandLngLat(b.lng, b.lat) ? [] : [b];
      continue;
    }
    cur.push(b);
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

function samplesForSpan(a: OceanLatLng, b: OceanLatLng): number {
  return Math.min(36, Math.max(8, Math.ceil(segmentDeg(a, b) * 5)));
}

function segmentStaysWet(a: OceanLatLng, b: OceanLatLng): boolean {
  if (isLandLngLat(a.lng, a.lat) || isLandLngLat(b.lng, b.lat)) return false;
  return !segmentCrossesLand(a, b, samplesForSpan(a, b));
}

/** 물이 보이는 가장 먼 점까지 이어, 격자 계단을 긴 바다 구간으로 편다. */
function shortcutOcean(points: OceanLatLng[]): OceanLatLng[] {
  if (points.length <= 2) return points;
  const out: OceanLatLng[] = [points[0]!];
  let i = 0;
  while (i < points.length - 1) {
    let best = i + 1;
    const maxLook = Math.min(points.length - 1, i + 56);
    for (let j = i + 2; j <= maxLook; j += 1) {
      if (segmentStaysWet(points[i]!, points[j]!)) best = j;
    }
    out.push(points[best]!);
    i = best;
  }
  return out;
}

/**
 * 꼭짓점을 이웃 현 쪽으로 조금씩 당겨 모서리를 둥글린다.
 * 당긴 점이 육지거나 구간이 육지를 스치면 그 점은 그대로 둔다.
 */
function relaxOcean(points: OceanLatLng[], iterations = 4): OceanLatLng[] {
  let cur = points;
  for (let iter = 0; iter < iterations; iter += 1) {
    if (cur.length < 3) return cur;
    const next: OceanLatLng[] = [cur[0]!];
    for (let i = 1; i < cur.length - 1; i += 1) {
      const prev = cur[i - 1]!;
      const p = cur[i]!;
      const nxt = cur[i + 1]!;
      const mid = lerpPoint(prev, nxt, 0.5);
      const candidate = lerpPoint(p, mid, 0.42);
      if (
        segmentStaysWet(prev, candidate) &&
        segmentStaysWet(candidate, nxt)
      ) {
        next.push(candidate);
      } else {
        next.push(p);
      }
    }
    next.push(cur[cur.length - 1]!);
    cur = next;
  }
  return cur;
}

function densifyChain(points: OceanLatLng[], stepDeg = 0.55): OceanLatLng[] {
  if (points.length < 2) return points;
  const out: OceanLatLng[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const a = out[out.length - 1]!;
    const b = points[i]!;
    const deg = segmentDeg(a, b);
    const n = Math.min(48, Math.max(1, Math.ceil(deg / stepDeg)));
    for (let s = 1; s <= n; s += 1) {
      const p = s === n ? b : lerpPoint(a, b, s / n);
      const last = out[out.length - 1]!;
      if (segmentDeg(last, p) > 0.02) out.push(p);
    }
  }
  return out;
}

/**
 * 격자 A*의 직각 계단을, 바다만 따라가는 완만한 곡선으로 바꾼다.
 * 둥글림이 육지를 밟으면 편 직선 경로로 되돌린다.
 */
function smoothOceanChain(points: OceanLatLng[]): OceanLatLng[] {
  if (points.length < 3) return points;
  const pulled = shortcutOcean(points);
  const relaxed = relaxOcean(pulled, 4);
  const curved = densifyChain(shortcutOcean(relaxed), 0.62);
  if (curved.length >= 2 && !pathCrossesLand(curved, 8)) return curved;
  const straight = densifyChain(pulled, 0.62);
  if (straight.length >= 2 && !pathCrossesLand(straight, 8)) return straight;
  return points;
}

/**
 * 해상 웨이포인트 체인을 바다 전용 폴리라인으로 재구성.
 * 우회 실패 구간은 끊어서 여러 조각으로 반환(육지 관통은 하지 않음).
 */
export function oceanRoutePieces(points: OceanLatLng[]): OceanLatLng[][] {
  if (!points || points.length < 2) return [];

  const cleaned: OceanLatLng[] = [];
  for (const p of points) {
    const snapped = snapToOcean(p.lng, p.lat);
    if (!snapped) continue;
    const last = cleaned[cleaned.length - 1];
    if (last && segmentDeg(last, snapped) < 0.05) continue;
    cleaned.push(snapped);
  }
  if (cleaned.length < 2) return [];

  const pieces: OceanLatLng[][] = [];
  let current: OceanLatLng[] = [cleaned[0]!];

  for (let i = 1; i < cleaned.length; i += 1) {
    const a = current[current.length - 1]!;
    const b = cleaned[i]!;
    const routed = routeSegment(a, b);
    if (!routed || routed.length < 2) {
      for (const piece of scrubPiece(current)) {
        if (piece.length >= 2) pieces.push(piece);
      }
      current = [b];
      continue;
    }
    for (let j = 1; j < routed.length; j += 1) current.push(routed[j]!);
  }
  if (current.length >= 2) {
    for (const piece of scrubPiece(current)) {
      if (piece.length >= 2) pieces.push(piece);
    }
  }
  return pieces;
}

const oceanRouteCache = new Map<string, OceanLatLng[]>();

function oceanRouteCacheKey(points: OceanLatLng[]): string {
  let key = "";
  for (const p of points) {
    key += `${p.lat.toFixed(3)},${p.lng.toFixed(3)};`;
  }
  return key;
}

/** 가장 긴 연속 바다 조각을 하나 반환(회랑 렌더용). 없으면 원본 유지 폴백 없음 — []. */
export function routeOceanWaypoints(points: OceanLatLng[]): OceanLatLng[] {
  const cacheKey = oceanRouteCacheKey(points);
  const cached = oceanRouteCache.get(cacheKey);
  if (cached) return cached;

  const pieces = oceanRoutePieces(points);
  if (pieces.length === 0) {
    oceanRouteCache.set(cacheKey, []);
    return [];
  }
  let best = pieces[0]!;
  for (let i = 1; i < pieces.length; i += 1) {
    if (pieces[i]!.length > best.length) best = pieces[i]!;
  }
  // 여러 조각이 있으면 순서대로 이어 붙이되, 조각 사이 육지 점프는 넣지 않음
  let chosen = best;
  if (pieces.length > 1) {
    const joined: OceanLatLng[] = [];
    for (const piece of pieces) {
      if (joined.length === 0) {
        joined.push(...piece);
        continue;
      }
      const a = joined[joined.length - 1]!;
      const b = piece[0]!;
      const bridge = routeSegment(a, b);
      if (bridge && bridge.length >= 2) {
        for (let j = 1; j < bridge.length; j += 1) joined.push(bridge[j]!);
        for (let j = 1; j < piece.length; j += 1) joined.push(piece[j]!);
      } else if (piece.length > joined.length) {
        joined.length = 0;
        joined.push(...piece);
      }
    }
    if (joined.length >= 2) chosen = joined;
  }
  const smoothed = smoothOceanChain(chosen);
  if (oceanRouteCache.size > 240) oceanRouteCache.clear();
  oceanRouteCache.set(cacheKey, smoothed);
  return smoothed;
}

/** 직대권 샘플이 육지를 가로지르는지(해상 점선 진단용) */
export function pathCrossesLand(points: OceanLatLng[], samplesPerSeg = 8): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    if (segmentCrossesLand(points[i]!, points[i + 1]!, samplesPerSeg)) return true;
  }
  return false;
}
