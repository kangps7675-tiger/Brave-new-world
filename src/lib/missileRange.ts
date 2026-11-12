import { MISSILE_RANGES, type MissileRangeSpec } from "@/data/missileRanges";

/**
 * 속보 글에서 읽힌 미사일 기종의 사거리 원(측지원)을 만든다.
 * 발사·시험발사 글에서만 쓴다: 지도의 중심이 "발사 지점"이어야 원이 뜻을 가지기 때문이다.
 * (러시아가 드니프로를 쳤다는 글의 위치는 표적이라 사거리 원을 그리면 틀린 그림이 된다.)
 */

const LAUNCH = /\b(launch(?:ed|es|ing)?|test[- ]?fir(?:e|ed|es|ing)|fired|fires|lift(?:ed)? off)\b|발사/i;
const EARTH_KM = 6371.0088;
const RAD = Math.PI / 180;

export type MissileRangeHit = { spec: MissileRangeSpec };

/** 발사 글이고 기종이 읽히면 그 기종. 여러 기종이 나오면 글에서 가장 먼저 나온 것 하나. */
export function missileRangeForText(text: string): MissileRangeHit | null {
  if (!text || !LAUNCH.test(text)) return null;
  let best: { spec: MissileRangeSpec; at: number } | null = null;
  for (const spec of MISSILE_RANGES) {
    const m = spec.pattern.exec(text);
    if (m && (best == null || m.index < best.at)) best = { spec, at: m.index };
  }
  return best ? { spec: best.spec } : null;
}

function destination(latDeg: number, lngDeg: number, bearingRad: number, km: number): [number, number] {
  const d = km / EARTH_KM;
  const lat1 = latDeg * RAD;
  const lng1 = lngDeg * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad));
  const lng2 = lng1 + Math.atan2(Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [lng2 / RAD, lat2 / RAD];
}

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function boundaryPoints(lat: number, lng: number, km: number, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i += 1) pts.push(destination(lat, lng, (i / steps) * Math.PI * 2, km));
  return pts;
}

/** 경도를 이어서 펴 날짜변경선에서 끊기지 않게 한다(180을 넘는 값이 나올 수 있다) */
function unwrap(pts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let offset = 0;
  let prev = pts[0][0];
  for (const [x, y] of pts) {
    let cur = x + offset;
    while (cur - prev > 180) { offset -= 360; cur -= 360; }
    while (cur - prev < -180) { offset += 360; cur += 360; }
    out.push([cur, y]);
    prev = cur;
  }
  return out;
}

export type RangeShape = {
  /** 점선으로 그릴 경계(선). 날짜변경선·극을 고려한 좌표 */
  boundary: [number, number][];
  /** 안쪽을 칠할 폴리곤의 링들(첫째가 바깥, 나머지는 구멍). 안전하게 만들 수 없으면 null — 그 경우 선만 그린다. */
  fill: [number, number][][] | null;
};

/**
 * 중심에서 km만큼 떨어진 점들의 도형. 극을 품는지에 따라 세 가지다.
 *  - 극을 안 품음: 경도를 이어 편 닫힌 링.
 *  - 극 하나를 품음(예: 북위 39도에서 8,000km): 경계를 경도순으로 늘어놓고 극으로 닫는다.
 *  - 두 극을 모두 품음(15,000km급 ICBM): 지구 전체에서 반대편(대척점) 작은 원을 뺀 모양. 그 구멍이 날짜변경선을 넘으면 칠하지 않고 선만 그린다.
 */
export function rangeShape(lat: number, lng: number, km: number, steps = 120): RangeShape {
  const toNorth = (90 - lat) * RAD * EARTH_KM;
  const toSouth = (90 + lat) * RAD * EARTH_KM;
  const poles = (km > toNorth ? 1 : 0) + (km > toSouth ? 1 : 0);
  const pts = boundaryPoints(lat, lng, km, steps);

  if (poles === 0) {
    const ring = unwrap(pts);
    ring.push([...ring[0]] as [number, number]);
    return { boundary: ring, fill: [ring] };
  }
  if (poles === 1) {
    const poleLat = km > toNorth ? 90 : -90;
    const sorted = pts.map(([x, y]) => [wrapLng(x), y] as [number, number]).sort((a, b) => a[0] - b[0]);
    const line: [number, number][] = [[-180, sorted[0][1]], ...sorted, [180, sorted[sorted.length - 1][1]]];
    const fill: [number, number][] = [[-180, poleLat], ...line, [180, poleLat], [-180, poleLat]];
    return { boundary: line, fill: [fill] };
  }
  // 두 극을 모두 품음: 대척점 쪽 작은 원이 구멍
  const hole = rangeShape(-lat, wrapLng(lng + 180), Math.PI * EARTH_KM - km, steps);
  const inRange = hole.boundary.every(([x]) => x >= -180 && x <= 180);
  const world: [number, number][] = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
  return { boundary: hole.boundary, fill: inRange && hole.fill && hole.fill.length === 1 ? [world, hole.fill[0]] : null };
}

export type MissileRangeFeatureCollection = {
  type: "FeatureCollection";
  features: Array<
    | { type: "Feature"; properties: { id: string; name: string; km: number; part: "fill" }; geometry: { type: "Polygon"; coordinates: [number, number][][] } }
    | { type: "Feature"; properties: { id: string; name: string; km: number; part: "line" }; geometry: { type: "LineString"; coordinates: [number, number][] } }
  >;
};

/** 지도에 올릴 GeoJSON: 칠할 폴리곤(가능할 때)과 점선용 경계선. 최대 사거리로 그린다. */
export function missileRangeGeoJson(lat: number, lng: number, spec: MissileRangeSpec): MissileRangeFeatureCollection {
  const km = spec.rangeKm[1];
  const shape = rangeShape(lat, lng, km);
  const props = { id: spec.id, name: spec.name, km };
  const features: MissileRangeFeatureCollection["features"] = [];
  if (shape.fill) features.push({ type: "Feature", properties: { ...props, part: "fill" }, geometry: { type: "Polygon", coordinates: shape.fill } });
  features.push({ type: "Feature", properties: { ...props, part: "line" }, geometry: { type: "LineString", coordinates: shape.boundary } });
  return { type: "FeatureCollection", features };
}

export function formatRangeKm(spec: MissileRangeSpec): string {
  const [lo, hi] = spec.rangeKm;
  const f = (n: number) => n.toLocaleString("en-US");
  return lo === hi ? `약 ${f(hi)}km` : `${f(lo)}~${f(hi)}km`;
}
