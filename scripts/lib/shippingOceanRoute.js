/**
 * 해운로를 바다만 따라가게 — 육지 관통 구간은 1° 격자의 A* 우회.
 * 실패하면 해당 현은 끊어 밀도만 남긴다.
 */

const {
  WIDTH,
  HEIGHT,
  lngLatToCell,
  cellCenter,
} = require("./landMaskGrid");

const DENSE_STEP_DEG = 0.4;
const MAX_ASTAR_NODES = 12_000;

function wrapLng(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function segmentDeg(a, b) {
  const dLat = b.lat - a.lat;
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return Math.hypot(dLat, dLng);
}

function lerpPoint(a, b, t) {
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: wrapLng(a.lng + dLng * t),
  };
}

function densifyOceanSegment(a, b, mask, stepDeg = DENSE_STEP_DEG) {
  const deg = segmentDeg(a, b);
  if (deg < stepDeg) {
    if (segmentCrossesLand(a, b, mask, 6)) return null;
    return [a, b];
  }
  const n = Math.min(64, Math.max(1, Math.ceil(deg / stepDeg)));
  const out = [a];
  for (let i = 1; i < n; i += 1) {
    const p = lerpPoint(a, b, i / n);
    if (mask.isLandLngLat(p.lng, p.lat)) return null; // 관통
    // 직전 점과의 짧은 다리도 육지 샘플
    const last = out[out.length - 1];
    if (segmentCrossesLand(last, p, mask, 4)) return null;
    if (segmentDeg(last, p) > 0.02) out.push(p);
  }
  if (segmentCrossesLand(out[out.length - 1], b, mask, 4)) return null;
  out.push(b);
  return out;
}

function segmentCrossesLand(a, b, mask, samples = 8) {
  for (let i = 1; i < samples; i += 1) {
    const p = lerpPoint(a, b, i / samples);
    if (mask.isLandLngLat(p.lng, p.lat)) return true;
  }
  return false;
}

function snapToOcean(lng, lat, mask) {
  if (!mask.isLandLngLat(lng, lat)) return { lng, lat };
  const { x: cx, y: cy } = lngLatToCell(lng, lat);
  for (let r = 1; r <= 8; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = (cx + dx + WIDTH) % WIDTH;
        const y = cy + dy;
        if (y < 0 || y >= HEIGHT) continue;
        if (!mask.isLandCell(x, y)) return cellCenter(x, y);
      }
    }
  }
  return null;
}

function neighbors(x, y) {
  const out = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + WIDTH) % WIDTH;
      const ny = y + dy;
      if (ny < 0 || ny >= HEIGHT) continue;
      out.push({ x: nx, y: ny, cost: dx !== 0 && dy !== 0 ? 1.414 : 1 });
    }
  }
  return out;
}

function heur(ax, ay, bx, by) {
  const dx = Math.min(Math.abs(ax - bx), WIDTH - Math.abs(ax - bx));
  const dy = Math.abs(ay - by);
  return Math.hypot(dx, dy);
}

/**
 * 두 바다 셀 사이 A*. 실패 시 null.
 */
function astarOcean(start, goal, mask) {
  const s = lngLatToCell(start.lng, start.lat);
  const g = lngLatToCell(goal.lng, goal.lat);
  if (mask.isLandCell(s.x, s.y) || mask.isLandCell(g.x, g.y)) return null;
  if (s.x === g.x && s.y === g.y) return [start, goal];

  const key = (x, y) => y * WIDTH + x;
  const open = [{ x: s.x, y: s.y, g: 0, f: heur(s.x, s.y, g.x, g.y) }];
  const came = new Map();
  const gScore = new Map([[key(s.x, s.y), 0]]);
  const closed = new Set();
  let expanded = 0;

  while (open.length > 0 && expanded < MAX_ASTAR_NODES) {
    // 선형 best-f 선택 (항로 수가 많아 binary heap 없이도 충분)
    let bestIdx = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    expanded += 1;

    if (cur.x === g.x && cur.y === g.y) {
      const cells = [];
      let k = ck;
      while (k != null) {
        const y = Math.floor(k / WIDTH);
        const x = k % WIDTH;
        cells.push(cellCenter(x, y));
        k = came.get(k);
      }
      cells.reverse();
      // 시작·끝은 원좌표 유지
      cells[0] = start;
      cells[cells.length - 1] = goal;
      return cells;
    }

    for (const n of neighbors(cur.x, cur.y)) {
      if (mask.isLandCell(n.x, n.y)) continue;
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

function densifyPath(points, mask, stepDeg = DENSE_STEP_DEG) {
  if (points.length < 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const a = out[out.length - 1];
    const b = points[i];
    const dens = densifyOceanSegment(a, b, mask, stepDeg);
    if (!dens) {
      // densify 중 육지 → A* 우회 시도
      const routed = routeSegment(a, b, mask);
      if (routed && routed.length >= 2) {
        for (let j = 1; j < routed.length; j += 1) out.push(routed[j]);
      }
      // 실패 시 끊김: b를 새 조각 시작으로 두지 않고 skip until ocean
      continue;
    }
    for (let j = 1; j < dens.length; j += 1) out.push(dens[j]);
  }
  return out;
}

function routeSegment(a, b, mask) {
  const sa = snapToOcean(a.lng, a.lat, mask);
  const sb = snapToOcean(b.lng, b.lat, mask);
  if (!sa || !sb) return null;
  if (!segmentCrossesLand(sa, sb, mask, 12)) {
    return densifyOceanSegment(sa, sb, mask) || [sa, sb];
  }
  const route = astarOcean(sa, sb, mask);
  if (!route || route.length < 2) return null;
  // A* 셀 중심선을 densify
  const dense = [route[0]];
  for (let i = 1; i < route.length; i += 1) {
    const dens = densifyOceanSegment(dense[dense.length - 1], route[i], mask, 0.55);
    if (!dens) {
      dense.push(route[i]);
    } else {
      for (let j = 1; j < dens.length; j += 1) dense.push(dens[j]);
    }
  }
  return dense;
}

/**
 * 항로 전체: 육지점 스냅 → 구간별 바다 densify/우회 → 끊긴 조각 배열
 */
function oceanRoutePath(points, mask) {
  if (!points || points.length < 2) return [];

  const cleaned = [];
  for (const p of points) {
    const snapped = snapToOcean(p.lng, p.lat, mask);
    if (!snapped) continue;
    const last = cleaned[cleaned.length - 1];
    if (last && segmentDeg(last, snapped) < 0.05) continue;
    cleaned.push(snapped);
  }
  if (cleaned.length < 2) return [];

  const pieces = [];
  let current = [cleaned[0]];

  for (let i = 1; i < cleaned.length; i += 1) {
    const a = current[current.length - 1];
    const b = cleaned[i];
    const routed = routeSegment(a, b, mask);
    if (!routed || routed.length < 2) {
      for (const piece of scrubPieceToArray(current, mask)) {
        if (piece.length >= 2) pieces.push(piece);
      }
      current = [b];
      continue;
    }
    for (let j = 1; j < routed.length; j += 1) {
      current.push(routed[j]);
    }
  }
  if (current.length >= 2) {
    for (const piece of scrubPieceToArray(current, mask)) {
      if (piece.length >= 2) pieces.push(piece);
    }
  }
  return pieces;
}

/** densify 후에도 남은 미세 육지 현을 한 번 더 끊는다 */
function scrubPieceToArray(points, mask) {
  const out = [];
  let cur = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const a = cur[cur.length - 1];
    const b = points[i];
    if (segmentCrossesLand(a, b, mask, 10) || mask.isLandLngLat(b.lng, b.lat)) {
      if (cur.length >= 2) out.push(cur);
      cur = mask.isLandLngLat(b.lng, b.lat) ? [] : [b];
      continue;
    }
    cur.push(b);
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

module.exports = {
  densifyOceanSegment,
  segmentCrossesLand,
  snapToOcean,
  astarOcean,
  oceanRoutePath,
  densifyPath,
  DENSE_STEP_DEG,
};
