import type { TransportPath, UkraineControlZone } from "@/data/geoTypes";
import type { RegionBBox } from "@/data/navRegions";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  geometryHatchPathsOnly,
  type DisputeHatchStyle,
} from "@/lib/disputeHatch";

type Point = { lat: number; lng: number };

function pointDistanceDeg(a: Point, b: Point) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDiff = Math.abs(a.lng - b.lng);
  const lngDist = Math.min(lngDiff, 360 - lngDiff);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function filterFrontZones(zones: UkraineControlZone[], view: Point, maxCount: number) {
  return zones
    .slice()
    .sort((a, b) => pointDistanceDeg(a.center, view) - pointDistanceDeg(b.center, view))
    .slice(0, maxCount);
}

function findNearestZone(
  origin: Point,
  zones: UkraineControlZone[],
): UkraineControlZone | null {
  let best: UkraineControlZone | null = null;
  let bestDist = Infinity;
  for (const zone of zones) {
    const dist = pointDistanceDeg(origin, zone.center);
    if (dist < bestDist) {
      bestDist = dist;
      best = zone;
    }
  }
  return best;
}

/** RU 점령 — 얇은 실선 테두리 + 빗금 */
const RU_OCCUPIED = {
  outlineKind: "ukraine-ru-occupied" as const,
  hatchKind: "ukraine-ru-occupied-hatch" as const,
  outlineColor: "rgba(185, 28, 28, 0.72)",
  hatchColor: "rgba(220, 38, 38, 0.42)",
  pattern: "slash" as const,
};

/** UA 점령 — 얇은 실선 테두리 + 빗금 (전선 벨트만) */
const UA_OCCUPIED = {
  outlineKind: "ukraine-ua-occupied" as const,
  hatchKind: "ukraine-ua-occupied-hatch" as const,
  outlineColor: "rgba(56, 189, 248, 0.7)",
  hatchColor: "rgba(56, 189, 248, 0.38)",
  pattern: "backslash" as const,
};

/** RU 진격·주장 — 주황 점선 테두리 + 빗금 */
const RU_CLAIM = {
  outlineKind: "ukraine-ru-claim" as const,
  hatchKind: "ukraine-ru-claim-hatch" as const,
  outlineColor: "rgba(251, 146, 60, 0.88)",
  hatchColor: "rgba(251, 146, 60, 0.48)",
  pattern: "slash" as const,
};

/** UA 주장 — 하늘색 점선 테두리 + 빗금 */
const UA_CLAIM = {
  outlineKind: "ukraine-ua-claim" as const,
  hatchKind: "ukraine-ua-claim-hatch" as const,
  outlineColor: "rgba(56, 189, 248, 0.9)",
  hatchColor: "rgba(125, 211, 252, 0.45)",
  pattern: "horizontal" as const,
};

type ZoneHatchStyle = {
  outlineKind: TransportPath["kind"];
  hatchKind: TransportPath["kind"];
  outlineColor: string;
  hatchColor: string;
  pattern: DisputeHatchStyle;
};

/** LOD별 그리드 — 셀 메시가 아니라 합쳐진 덩어리 외곽용 */
function gridCellDegForTier(lodTier: GlobeLodTier): number {
  if (lodTier === "global") return 0.42;
  if (lodTier === "continent") return 0.32;
  if (lodTier === "regional") return 0.16;
  if (lodTier === "near") return 0.1;
  return 0.075;
}

function zoneSamplePoint(zone: UkraineControlZone): Point {
  return zone.center;
}

function cellKey(ix: number, iy: number) {
  return `${ix},${iy}`;
}

function parseCellKey(key: string): { ix: number; iy: number } {
  const [a, b] = key.split(",");
  return { ix: Number(a), iy: Number(b) };
}

/**
 * 레거시 의사-dissolve: zone.center 격자 + 외곽 edge + 빗금.
 * 실제 geometry union은 `@/lib/ukraineDissolve` (macro/micro GeoJSON 경로).
 * → fill 폴리곤 / 셀 메시 없음. 범례식 테두리+빗금.
 */
function zonesToDissolvedHatchPaths(
  zones: UkraineControlZone[],
  style: ZoneHatchStyle,
  cellDeg: number,
  idPrefix: string,
): TransportPath[] {
  if (zones.length === 0 || cellDeg <= 0) return [];

  const occupied = new Set<string>();
  for (const zone of zones) {
    const p = zoneSamplePoint(zone);
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const ix = Math.floor(p.lng / cellDeg);
    const iy = Math.floor(p.lat / cellDeg);
    occupied.add(cellKey(ix, iy));
  }
  if (occupied.size === 0) return [];

  // connected components (4-neighbor)
  const components: string[][] = [];
  const seen = new Set<string>();
  for (const start of occupied) {
    if (seen.has(start)) continue;
    const stack = [start];
    const comp: string[] = [];
    seen.add(start);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      const { ix, iy } = parseCellKey(cur);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = cellKey(ix + dx, iy + dy);
        if (!occupied.has(n) || seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    components.push(comp);
  }

  const out: TransportPath[] = [];
  let outlineIdx = 0;
  let hatchIdx = 0;

  for (const [compIndex, comp] of components.entries()) {
    const compSet = new Set(comp);

    // exterior edges
    type Edge = { a: Point; b: Point };
    const edges: Edge[] = [];

    for (const key of comp) {
      const { ix, iy } = parseCellKey(key);
      const west = ix * cellDeg;
      const east = (ix + 1) * cellDeg;
      const south = iy * cellDeg;
      const north = (iy + 1) * cellDeg;

      const neighbors: Array<{ ox: number; oy: number; a: Point; b: Point }> = [
        { ox: ix, oy: iy - 1, a: { lat: south, lng: west }, b: { lat: south, lng: east } },
        { ox: ix, oy: iy + 1, a: { lat: north, lng: east }, b: { lat: north, lng: west } },
        { ox: ix - 1, oy: iy, a: { lat: north, lng: west }, b: { lat: south, lng: west } },
        { ox: ix + 1, oy: iy, a: { lat: south, lng: east }, b: { lat: north, lng: east } },
      ];
      for (const n of neighbors) {
        if (!compSet.has(cellKey(n.ox, n.oy))) {
          edges.push({ a: n.a, b: n.b });
        }
      }

      // 셀 단위 빗금 — 면 fill 없이 영역만 빗금
      const cellBox = { minLat: south, maxLat: north, minLng: west, maxLng: east };
      const cellHatches = geometryHatchPathsOnly(
        `${style.hatchKind}-${idPrefix}-c${compIndex}-${hatchIdx}`,
        null,
        cellBox,
        style.pattern,
        style.hatchKind,
        style.hatchColor,
      );
      const hatchBatch = cellHatches.slice(0, 3);
      if (hatchBatch.length === 0) {
        // 작은 셀: hatchLines 간격보다 작을 때 대각 1선 폴백
        const slash =
          style.pattern === "backslash"
            ? [
                { lat: south, lng: west, alt: 0 },
                { lat: north, lng: east, alt: 0 },
              ]
            : style.pattern === "horizontal"
              ? [
                  { lat: (south + north) / 2, lng: west, alt: 0 },
                  { lat: (south + north) / 2, lng: east, alt: 0 },
                ]
              : [
                  { lat: south, lng: east, alt: 0 },
                  { lat: north, lng: west, alt: 0 },
                ];
        out.push({
          id: `${style.hatchKind}-${idPrefix}-c${compIndex}-${hatchIdx}`,
          kind: style.hatchKind,
          name: null,
          scalerank: 1,
          lengthKm: null,
          accentColor: style.hatchColor,
          bbox: cellBox,
          points: slash,
        });
        hatchIdx += 1;
      } else {
        for (const h of hatchBatch) {
          h.accentColor = style.hatchColor;
          out.push(h);
          hatchIdx += 1;
        }
      }
    }

    // 외곽 엣지를 체인으로 이어 긴 테두리 path 생성
    const chains = stitchEdges(edges);
    for (const chain of chains) {
      if (chain.length < 2) continue;
      const lats = chain.map((p) => p.lat);
      const lngs = chain.map((p) => p.lng);
      out.push({
        id: `${style.outlineKind}-${idPrefix}-${outlineIdx}`,
        kind: style.outlineKind,
        name: null,
        scalerank: 1,
        lengthKm: null,
        accentColor: style.outlineColor,
        bbox: {
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
          minLng: Math.min(...lngs),
          maxLng: Math.max(...lngs),
        },
        points: chain.map((p) => ({ ...p, alt: 0 })),
      });
      outlineIdx += 1;
    }
  }

  return out;
}

function pointsEqual(a: Point, b: Point, eps = 1e-9) {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;
}

/** 외곽 변을 가능한 한 긴 polyline으로 연결 */
function stitchEdges(edges: { a: Point; b: Point }[]): Point[][] {
  if (edges.length === 0) return [];
  const unused = edges.map((e) => ({ ...e }));
  const chains: Point[][] = [];

  while (unused.length) {
    const first = unused.pop()!;
    const chain = [first.a, first.b];
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = unused.length - 1; i >= 0; i--) {
        const e = unused[i]!;
        const head = chain[0]!;
        const tail = chain[chain.length - 1]!;
        if (pointsEqual(e.a, tail)) {
          chain.push(e.b);
          unused.splice(i, 1);
          extended = true;
          break;
        }
        if (pointsEqual(e.b, tail)) {
          chain.push(e.a);
          unused.splice(i, 1);
          extended = true;
          break;
        }
        if (pointsEqual(e.b, head)) {
          chain.unshift(e.a);
          unused.splice(i, 1);
          extended = true;
          break;
        }
        if (pointsEqual(e.a, head)) {
          chain.unshift(e.b);
          unused.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    chains.push(chain);
  }
  return chains;
}

/** 전선 인근 UA만 — 전국 UA 점령을 파란 빗금으로 덮지 않음 */
function uaZonesNearFront(
  uaZones: UkraineControlZone[],
  contested: UkraineControlZone[],
  ruZones: UkraineControlZone[],
): UkraineControlZone[] {
  const eastern = uaZones.filter((z) => z.center.lng >= 30.5 && z.center.lat <= 50.8);
  const anchors = contested.length > 0 ? contested : ruZones;
  if (anchors.length === 0) return eastern;
  return eastern.filter((z) =>
    anchors.some((a) => pointDistanceDeg(z.center, a.center) <= 2.4),
  );
}

export type UkraineFrontRender = {
  paths: TransportPath[];
};

/**
 * 점령/주장 = 합쳐진 외곽 테두리 + 빗금 (fill 폴리곤·셀 메시 없음).
 * 멀리서·상세 모두 동일 스타일, 그리드만 LOD로 조절.
 */
export function buildUkraineFrontRender(
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
  view: Point,
  options: { maxZones?: number; maxArrows?: number; lodTier?: GlobeLodTier } = {},
): UkraineFrontRender {
  const maxZones = options.maxZones ?? 2400;
  const lodTier = options.lodTier ?? "regional";
  const cellDeg = gridCellDegForTier(lodTier);

  const occRu = filterFrontZones(ruZones, view, Math.floor(maxZones * 0.45));
  const contested = filterFrontZones(contestedZones, view, Math.floor(maxZones * 0.3));
  const occUa = filterFrontZones(
    uaZonesNearFront(uaZones, contested, ruZones),
    view,
    Math.floor(maxZones * 0.25),
  );

  const ruClaimZones: UkraineControlZone[] = [];
  const uaClaimZones: UkraineControlZone[] = [];
  for (const zone of contested) {
    const nearestRu = findNearestZone(zone.center, ruZones);
    const nearestUa = findNearestZone(zone.center, uaZones);
    const dRu = nearestRu ? pointDistanceDeg(zone.center, nearestRu.center) : Infinity;
    const dUa = nearestUa ? pointDistanceDeg(zone.center, nearestUa.center) : Infinity;
    if (dUa <= dRu) uaClaimZones.push(zone);
    else ruClaimZones.push(zone);
  }

  const paths: TransportPath[] = [
    ...zonesToDissolvedHatchPaths(occRu, RU_OCCUPIED, cellDeg, "ru-occ"),
    ...zonesToDissolvedHatchPaths(occUa, UA_OCCUPIED, cellDeg, "ua-occ"),
    ...zonesToDissolvedHatchPaths(ruClaimZones, RU_CLAIM, cellDeg * 0.85, "ru-claim"),
    ...zonesToDissolvedHatchPaths(uaClaimZones, UA_CLAIM, cellDeg * 0.85, "ua-claim"),
  ];

  return { paths };
}

const DEFAULT_FRONT_BBOX: RegionBBox = {
  minLat: 45.8,
  maxLat: 51.0,
  minLng: 30.2,
  maxLng: 39.8,
};

export function computeUkraineFrontFitBbox(
  zones: UkraineControlZone[],
  extraPoints: { lat: number; lng: number }[] = [],
): RegionBBox {
  const points: { lat: number; lng: number }[] = [...extraPoints];

  for (const zone of zones) {
    if (zone.controlStatus === "CONTESTED") {
      points.push(zone.center);
      continue;
    }
    if (zone.controlStatus === "RU") {
      points.push(zone.center);
      continue;
    }
    if (zone.center.lng >= 30.5 && zone.center.lat <= 50.5) {
      points.push(zone.center);
    }
  }

  if (points.length < 4) return DEFAULT_FRONT_BBOX;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const raw: RegionBBox = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };

  const latPad = Math.max(0.45, (raw.maxLat - raw.minLat) * 0.12);
  const lngPad = Math.max(0.55, (raw.maxLng - raw.minLng) * 0.1);

  return {
    minLat: Math.max(44.5, raw.minLat - latPad),
    maxLat: Math.min(52.5, raw.maxLat + latPad),
    minLng: Math.max(28.5, raw.minLng - lngPad),
    maxLng: Math.min(41.0, raw.maxLng + lngPad),
  };
}
