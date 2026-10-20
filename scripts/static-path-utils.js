// 정적 path/점 빌드 공통 유틸
const { IS_LITE } = require("./build-profile");

function simplifyLine(coords, maxPoints, roundCoord, precision = 2, maxJumpDeg = null) {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const rounded = coords.map(([lng, lat]) => [
    roundCoord(lng, precision),
    roundCoord(lat, precision),
  ]);
  if (rounded.length <= maxPoints && maxJumpDeg == null) return rounded;

  // 균등 샘플 후, 육지 관통을 만드는 긴 현이 있으면 중간점을 되살린다
  let sampled = rounded;
  if (rounded.length > maxPoints) {
    const step = Math.ceil(rounded.length / maxPoints);
    sampled = rounded.filter((_, index) => index % step === 0);
    const last = rounded[rounded.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);
  }

  if (maxJumpDeg == null || !(maxJumpDeg > 0)) {
    return sampled.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
  }

  const out = [sampled[0]];
  for (let i = 1; i < sampled.length; i += 1) {
    const prev = out[out.length - 1];
    const next = sampled[i];
    const dLng = ((next[0] - prev[0] + 540) % 360) - 180;
    const jump = Math.hypot(next[1] - prev[1], dLng);
    if (jump > maxJumpDeg) {
      // 원본에서 prev→next 사이 점들을 더 넣어 현을 완화
      const iPrev = rounded.findIndex(
        (c) => c[0] === prev[0] && c[1] === prev[1],
      );
      const iNext = rounded.findIndex(
        (c) => c[0] === next[0] && c[1] === next[1],
      );
      if (iPrev >= 0 && iNext > iPrev + 1) {
        const span = iNext - iPrev;
        const inserts = Math.min(6, Math.ceil(jump / maxJumpDeg));
        for (let k = 1; k <= inserts; k += 1) {
          const idx = iPrev + Math.round((span * k) / (inserts + 1));
          const mid = rounded[idx];
          if (mid && (mid[0] !== out[out.length - 1][0] || mid[1] !== out[out.length - 1][1])) {
            out.push(mid);
          }
        }
      }
    }
    out.push(next);
  }
  return out.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
}

/**
 * 얇은 버퍼 폴리곤(해저케이블 코리도) → 중심선 근사.
 * 장축 끝점을 잡아 링의 양 변을 평균한다.
 */
function polygonRingToCenterline(ring, maxWorkingPoints = 800) {
  if (!Array.isArray(ring) || ring.length < 4) return [];
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  let pts = closed ? ring.slice(0, -1) : ring.slice();
  if (pts.length < 3) return [];

  if (pts.length > maxWorkingPoints) {
    const step = Math.ceil(pts.length / maxWorkingPoints);
    const sampled = pts.filter((_, index) => index % step === 0);
    if (sampled[sampled.length - 1] !== pts[pts.length - 1]) sampled.push(pts[pts.length - 1]);
    pts = sampled;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const horizontal = maxX - minX >= maxY - minY;
  let a = 0;
  let b = 0;
  for (let i = 1; i < pts.length; i++) {
    if (horizontal) {
      if (pts[i][0] < pts[a][0]) a = i;
      if (pts[i][0] > pts[b][0]) b = i;
    } else {
      if (pts[i][1] < pts[a][1]) a = i;
      if (pts[i][1] > pts[b][1]) b = i;
    }
  }
  if (a === b) return pts;

  const walk = (from, to, dir) => {
    const out = [];
    let i = from;
    for (let guard = 0; guard <= pts.length; guard++) {
      out.push(pts[i]);
      if (i === to) break;
      i = (i + dir + pts.length) % pts.length;
    }
    return out;
  };

  const path1 = walk(a, b, 1);
  const path2 = walk(a, b, -1);
  if (path1.length < 2 || path2.length < 2) return pts;

  const n = Math.max(path1.length, path2.length);
  const sample = (path, t) => {
    const idx = t * (path.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(path.length - 1, i0 + 1);
    const f = idx - i0;
    return [path[i0][0] * (1 - f) + path[i1][0] * f, path[i0][1] * (1 - f) + path[i1][1] * f];
  };

  const center = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const p1 = sample(path1, t);
    const p2 = sample(path2, t);
    center.push([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]);
  }
  return center;
}

function lineGeometryToPoints(geometry, maxPoints, roundCoord, precision = 2, maxJumpDeg = null) {
  if (!geometry) return [];
  const toPoints = (line) =>
    line.map(([lng, lat]) => ({ lat: roundCoord(lat, precision), lng: roundCoord(lng, precision) }));

  if (geometry.type === "LineString") {
    return [
      toPoints(simplifyLine(geometry.coordinates, maxPoints, roundCoord, precision, maxJumpDeg)),
    ];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) =>
      toPoints(simplifyLine(line, maxPoints, roundCoord, precision, maxJumpDeg)),
    );
  }
  if (geometry.type === "Polygon") {
    const center = polygonRingToCenterline(geometry.coordinates?.[0] || []);
    if (center.length < 2) return [];
    return [toPoints(simplifyLine(center, maxPoints, roundCoord, precision, maxJumpDeg))];
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || [])
      .map((poly) => {
        const center = polygonRingToCenterline(poly?.[0] || []);
        if (center.length < 2) return null;
        return toPoints(simplifyLine(center, maxPoints, roundCoord, precision, maxJumpDeg));
      })
      .filter(Boolean);
  }
  if (geometry.type === "GeometryCollection") {
    const segments = [];
    for (const part of geometry.geometries || []) {
      segments.push(...lineGeometryToPoints(part, maxPoints, roundCoord, precision, maxJumpDeg));
    }
    return segments;
  }
  return [];
}

function pointsBbox(points, roundCoord) {
  const bbox = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  for (const point of points) {
    bbox.minLat = Math.min(bbox.minLat, point.lat);
    bbox.minLng = Math.min(bbox.minLng, point.lng);
    bbox.maxLat = Math.max(bbox.maxLat, point.lat);
    bbox.maxLng = Math.max(bbox.maxLng, point.lng);
  }
  return {
    minLat: roundCoord(bbox.minLat),
    minLng: roundCoord(bbox.minLng),
    maxLat: roundCoord(bbox.maxLat),
    maxLng: roundCoord(bbox.maxLng),
  };
}

function capArray(items, liteMax, fullMax) {
  const limit = IS_LITE ? liteMax : fullMax;
  return items.length <= limit ? items : items.slice(0, limit);
}

/** 경도·위도 → 대략적 권역 (lite 샘플이 미주만 채워지지 않게) */
function geoRegionBucket(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "other";
  if (lng < -30) return "amer";
  if (lng < 40 && lat > 35) return "eu";
  if (lng >= 25 && lng < 65 && lat < 42) return "me";
  if (lng < 55 && lat < 35) return "afr";
  if (lng < 100) return "casia";
  if (lng < 140 && lat >= 15) return "easia";
  if (lng < 155) return "seasia";
  if (lat < -10) return "oce";
  return "other";
}

/**
 * 권역 라운드로빈으로 전 세계 분산 캡.
 * getLatLng가 있으면 lite/full 모두 지리 분산 (없으면 앞에서 자름).
 */
function capArrayGeographic(items, liteMax, fullMax, getLatLng) {
  const limit = IS_LITE ? liteMax : fullMax;
  if (items.length <= limit) return items;
  if (typeof getLatLng !== "function") {
    return items.slice(0, limit);
  }

  const buckets = new Map();
  for (const item of items) {
    const { lat, lng } = getLatLng(item) || {};
    const key = geoRegionBucket(lat, lng);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  const keys = [...buckets.keys()].sort(
    (a, b) => (buckets.get(b)?.length || 0) - (buckets.get(a)?.length || 0),
  );
  const cursors = Object.fromEntries(keys.map((k) => [k, 0]));
  const picked = [];
  while (picked.length < limit) {
    let progressed = false;
    for (const key of keys) {
      const list = buckets.get(key);
      const i = cursors[key];
      if (!list || i >= list.length) continue;
      picked.push(list[i]);
      cursors[key] = i + 1;
      progressed = true;
      if (picked.length >= limit) break;
    }
    if (!progressed) break;
  }
  return picked;
}

module.exports = {
  simplifyLine,
  polygonRingToCenterline,
  lineGeometryToPoints,
  pointsBbox,
  capArray,
  geoRegionBucket,
  capArrayGeographic,
};
