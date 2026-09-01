import {
  STRATEGIC_CORRIDORS,
  type CorridorLeg,
  type CorridorMode,
  type CorridorStatus,
  type CorridorWaypoint,
  type StrategicCorridor,
} from "@/data/strategicCorridors";
import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
import { getCorridorRank, getCorridorScalerank } from "@/lib/corridorRanks";
import { filterTransportPathsForViewport } from "@/lib/viewportPathFilter";
import type { CorridorLod } from "@/lib/corridorLod";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function toCart(lat: number, lng: number) {
  const phi = lat * DEG2RAD;
  const lambda = lng * DEG2RAD;
  const cosPhi = Math.cos(phi);
  return { x: cosPhi * Math.cos(lambda), y: cosPhi * Math.sin(lambda), z: Math.sin(phi) };
}

function fromCart(x: number, y: number, z: number) {
  const hyp = Math.hypot(x, y);
  return { lat: Math.atan2(z, hyp) * RAD2DEG, lng: Math.atan2(y, x) * RAD2DEG };
}

/**
 * 두 지점 사이 소구간 대권 보간.
 * 관계망 호(greatCircleArc)와 달리 alt를 구간 내내 고정값으로 둔다 —
 * 실측 인프라 경로는 지표에 계속 붙어 있어야 자연스럽고, 웨이포인트마다
 * 위로 솟았다 내려오는 "물결" 형태가 되면 실제 경로처럼 보이지 않기 때문.
 */
function arcSegment(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  segments: number,
  alt: number,
): TransportPathPoint[] {
  const a = toCart(lat1, lng1);
  const b = toCart(lat2, lng2);
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return [{ lat: lat1, lng: lng1, alt }];
  }
  const sinOmega = Math.sin(omega);
  const points: TransportPathPoint[] = [];
  for (let i = 0; i < segments; i += 1) {
    const t = i / segments;
    const s0 = Math.sin((1 - t) * omega) / sinOmega;
    const s1 = Math.sin(t * omega) / sinOmega;
    const x = s0 * a.x + s1 * b.x;
    const y = s0 * a.y + s1 * b.y;
    const z = s0 * a.z + s1 * b.z;
    const { lat, lng } = fromCart(x, y, z);
    points.push({ lat, lng, alt });
  }
  return points;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dPhi = (lat2 - lat1) * DEG2RAD;
  const dLambda = (lng2 - lng1) * DEG2RAD;
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function waypointsToPoints(waypoints: CorridorWaypoint[], alt: number): TransportPathPoint[] {
  if (waypoints.length === 0) return [];
  const out: TransportPathPoint[] = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const w1 = waypoints[i];
    const w2 = waypoints[i + 1];
    out.push(...arcSegment(w1.lat, w1.lng, w2.lat, w2.lng, 5, alt));
  }
  const last = waypoints[waypoints.length - 1];
  out.push({ lat: last.lat, lng: last.lng, alt });
  return out;
}

function waypointsLengthKm(waypoints: CorridorWaypoint[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    total += haversineKm(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng,
    );
  }
  return Math.round(total);
}

function waypointsBbox(waypoints: CorridorWaypoint[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const w of waypoints) {
    minLat = Math.min(minLat, w.lat);
    maxLat = Math.max(maxLat, w.lat);
    minLng = Math.min(minLng, w.lng);
    maxLng = Math.max(maxLng, w.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

function kindForCorridor(): TransportPath["kind"] {
  return "strategic-corridor";
}

function scalerankFor(corridor: StrategicCorridor): number {
  return getCorridorScalerank(
    corridor.id,
    corridor.category === "trade" ? 2 : 3,
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hPrime >= 0 && hPrime < 1) [r1, g1, b1] = [c, x, 0];
  else if (hPrime < 2) [r1, g1, b1] = [x, c, 0];
  else if (hPrime < 3) [r1, g1, b1] = [0, c, x];
  else if (hPrime < 4) [r1, g1, b1] = [0, x, c];
  else if (hPrime < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = lNorm - c / 2;
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

/**
 * 회랑/축 관계마다 고유한(관계 "성격"이 아니라 그 개체 자체를 가리키는) 색을 결정적으로
 * 만든다 — 같은 groupId는 항상 같은 색이 나오므로, 한 회랑이 여러 leg로 쪼개져 있어도
 * 전부 같은 색을 써서 "하나로 이어진 회랑"처럼 보인다. 채도·명도는 어두운 지구본 배경에서
 * 잘 보이도록 고정하고, hue만 id 해시로 360도 위에 흩뿌린다.
 */
export function colorForGroupId(id: string, alpha = 0.82): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const [r, g, b] = hslToRgb(hue, 72, 62);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ALT_BY_CATEGORY: Record<StrategicCorridor["category"], number> = {
  trade: 0.006,
  "sanctions-evasion": 0.014,
  "military-logistics": 0.018,
};

/** leg 하나에 지점명을 붙일 때 쓰는 한글 라벨 — 툴팁·호버용 */
export function legModeLabelKo(mode: CorridorMode): string {
  switch (mode) {
    case "sea":
      return "해상";
    case "road":
      return "도로";
    case "rail":
      return "철도";
    default:
      return "복합";
  }
}

/** 회랑 하나를 globe 렌더링용 TransportPath로 변환 */
export function corridorToTransportPath(corridor: StrategicCorridor): TransportPath | null {
  if (corridor.waypoints.length < 2) return null;
  const alt = ALT_BY_CATEGORY[corridor.category];
  const scalerank = scalerankFor(corridor);
  const rank = getCorridorRank(corridor.id);
  return {
    id: `corridor-${corridor.id}`,
    kind: kindForCorridor(),
    name: corridor.nameKo,
    scalerank,
    lengthKm: waypointsLengthKm(corridor.waypoints),
    accentColor: colorForGroupId(corridor.id),
    bbox: waypointsBbox(corridor.waypoints),
    points: waypointsToPoints(corridor.waypoints, alt),
    meta: {
      corridorId: corridor.id,
      groupId: corridor.id,
      geometrySource: "real-corridor",
      status: corridor.status,
      category: corridor.category,
      note: corridor.note ?? null,
      scalerank,
      gaugeBreak: rank?.gaugeBreak ? 1 : 0,
      euRailGateway: rank?.euRailGateway ? 1 : 0,
    },
  };
}

/**
 * 회랑이 `legs`(육로↔해상 다구간)를 갖고 있으면 구간별로 쪼갠 TransportPath[]를,
 * 없으면 기존 단일 경로를 배열에 담아 반환한다 — 호출부는 항상 배열만 다루면 된다.
 * 구간 경계 좌표가 서로 정확히 일치하므로 여러 feature라도 지도에서는 끊김 없이 이어져 보인다.
 */
export function corridorToTransportPaths(corridor: StrategicCorridor): TransportPath[] {
  if (!corridor.legs || corridor.legs.length === 0) {
    const single = corridorToTransportPath(corridor);
    return single ? [single] : [];
  }
  const alt = ALT_BY_CATEGORY[corridor.category];
  const kind = kindForCorridor();
  // groupId(corridor.id) 기준 색 — 모든 leg가 같은 색을 써야 하나로 이어진 회랑처럼 보인다.
  const accentColor = colorForGroupId(corridor.id);
  const scalerank = scalerankFor(corridor);
  const legs = corridor.legs;
  const out: TransportPath[] = [];
  legs.forEach((leg: CorridorLeg, i: number) => {
    if (leg.waypoints.length < 2) return;
    out.push({
      id: `corridor-${corridor.id}--leg${i}`,
      kind,
      name: `${corridor.nameKo} (${legModeLabelKo(leg.mode)} 구간)`,
      scalerank,
      lengthKm: waypointsLengthKm(leg.waypoints),
      accentColor,
      bbox: waypointsBbox(leg.waypoints),
      points: waypointsToPoints(leg.waypoints, alt),
      meta: {
        corridorId: corridor.id,
        corridorGroupId: corridor.id,
        groupId: corridor.id,
        geometrySource: "real-corridor",
        legIndex: i,
        legMode: leg.mode,
        totalLegs: legs.length,
        status: corridor.status,
        category: corridor.category,
        note: corridor.note ?? null,
        scalerank,
      },
    });
  });
  return out;
}

/** 전체 전략 회랑 TransportPath[] (LOD 미적용) */
export function allStrategicCorridorPaths(): TransportPath[] {
  return STRATEGIC_CORRIDORS.flatMap(corridorToTransportPaths);
}

/**
 * LOD 적용 — getCorridorLod + filterTransportPathsForViewport.
 * 같은 corridorId의 leg는 같이 살아남도록 groupId 단위로 상한을 센다.
 */
export function strategicCorridorPathsForLod(
  lod: CorridorLod,
  view: { lat: number; lng: number },
  options?: { categories?: StrategicCorridor["category"][] },
): TransportPath[] {
  const rawAll = allStrategicCorridorPaths();
  const all = options?.categories
    ? rawAll.filter((p) => options.categories!.includes(p.meta?.category as StrategicCorridor["category"]))
    : rawAll;
  if (all.length === 0) return [];
  // leg 단위로 필터하면 긴 회랑이 잘리므로, corridorId당 대표 path로 먼저 cull
  const byCorridor = new Map<string, TransportPath[]>();
  for (const path of all) {
    const id = String(path.meta?.corridorId ?? path.id);
    const list = byCorridor.get(id) ?? [];
    list.push(path);
    byCorridor.set(id, list);
  }
  const representatives: TransportPath[] = [];
  for (const [, legs] of byCorridor) {
    const first = legs[0];
    if (!first) continue;
    // bbox = all legs union
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    let lengthKm = 0;
    for (const leg of legs) {
      minLat = Math.min(minLat, leg.bbox.minLat);
      maxLat = Math.max(maxLat, leg.bbox.maxLat);
      minLng = Math.min(minLng, leg.bbox.minLng);
      maxLng = Math.max(maxLng, leg.bbox.maxLng);
      lengthKm += leg.lengthKm ?? 0;
    }
    representatives.push({
      ...first,
      id: `corridor-rep-${first.meta?.corridorId ?? first.id}`,
      lengthKm,
      bbox: { minLat, minLng, maxLat, maxLng },
    });
  }
  const kept = filterTransportPathsForViewport(representatives, {
    lat: view.lat,
    lng: view.lng,
    radiusDeg: lod.radiusDeg,
    maxCount: lod.maxCorridors,
    maxScalerank: lod.maxScalerank,
    arterialMaxRank: lod.arterialMaxRank,
  });
  const keepIds = new Set(
    kept.map((p) => String(p.meta?.corridorId ?? p.id.replace(/^corridor-rep-/, ""))),
  );
  return all.filter((p) => keepIds.has(String(p.meta?.corridorId ?? "")));
}

const CATEGORY_PRIORITY: Record<StrategicCorridor["category"], number> = {
  "military-logistics": 0,
  "sanctions-evasion": 1,
  trade: 2,
};

/** axis-link 국가쌍(A|B, 정렬키)에 대응하는 실측 회랑 웨이포인트가 있으면 반환 */
export function resolveCorridorWaypointsForPair(
  a: string,
  b: string,
): CorridorWaypoint[] | null {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const matches = STRATEGIC_CORRIDORS.filter((c) => c.axisPairKeys?.includes(key));
  if (matches.length === 0) return null;
  matches.sort((x, y) => CATEGORY_PRIORITY[x.category] - CATEGORY_PRIORITY[y.category]);
  return matches[0].waypoints;
}

/**
 * axis-link/arms 렌더러가 대권호 대신 쓸 실측 경로 포인트.
 * 없으면 null — 호출부에서 기존 greatCircleArc로 폴백한다.
 */
export function corridorPointsForPair(
  a: string,
  b: string,
  alt = 0.02,
): TransportPathPoint[] | null {
  const waypoints = resolveCorridorWaypointsForPair(a, b);
  if (!waypoints) return null;
  return waypointsToPoints(waypoints, alt);
}

/**
 * axis-link 국가쌍에 대응하는 실측 회랑이 `legs`(육로↔해상 다구간)로 등록돼 있으면
 * 그 구간 배열을 그대로 반환한다. `legs`가 없는 단일-모드 회랑이면 전체 waypoints를
 * 그 회랑의 mode 하나짜리 leg로 감싸서 반환 — 호출부는 항상 leg 배열만 다루면 된다.
 * 매칭된 회랑의 `status`(예: "under-construction")도 함께 반환해, 호출부가 그
 * 회랑에 속한 leg 전체에 상태를 실어 보낼 수 있게 한다.
 */
export function resolveCorridorLegsForPair(
  a: string,
  b: string,
): { status: CorridorStatus; legs: CorridorLeg[] } | null {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const matches = STRATEGIC_CORRIDORS.filter((c) => c.axisPairKeys?.includes(key));
  if (matches.length === 0) return null;
  matches.sort((x, y) => CATEGORY_PRIORITY[x.category] - CATEGORY_PRIORITY[y.category]);
  const best = matches[0];
  const legs =
    best.legs && best.legs.length > 0
      ? best.legs
      : [{ mode: best.mode, waypoints: best.waypoints }];
  return { status: best.status, legs };
}

export type CorridorLegPoints = {
  mode: CorridorMode;
  points: TransportPathPoint[];
  /** 이 leg의 실측 거리(km) — 여러 leg에 걸친 글린트 파동이 leg 길이 비례로 자연스럽게 넘어가도록 */
  lengthKm: number;
  /** 이 leg가 속한 회랑의 건설 상태 — "under-construction"이면 호출부가 글린트를 막는다 */
  status: CorridorStatus;
};

/**
 * axis-link/arms 렌더러가 대권호 대신 쓸, 구간(leg)별로 쪼갠 실측 경로.
 * 육로 구간은 실선, 해상 구간(카스피해 도하 등)은 호출부에서 dashLength를 줘서
 * 점선("페리로 갈아탄다")으로 그리도록 mode를 그대로 실어 보낸다.
 * 없으면 null — 호출부에서 기존 greatCircleArc로 폴백한다.
 */
export function corridorLegPointsForPair(
  a: string,
  b: string,
  alt = 0.02,
): CorridorLegPoints[] | null {
  const resolved = resolveCorridorLegsForPair(a, b);
  if (!resolved) return null;
  const { status, legs } = resolved;
  return legs.map((leg) => ({
    mode: leg.mode,
    points: waypointsToPoints(leg.waypoints, alt),
    lengthKm: waypointsLengthKm(leg.waypoints),
    status,
  }));
}
