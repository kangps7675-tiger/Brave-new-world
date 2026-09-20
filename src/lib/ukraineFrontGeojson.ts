/**
 * 우크라이나 전선 → MapLibre GeoJSON (macro / micro LOD).
 *
 * 절대 규칙:
 * - 모든 GeoJSON 좌표는 [경도 lng, 위도 lat]
 * - Polygon 링은 닫힌 루프 (첫점 === 끝점)
 * - 방어선은 LineString만
 * - 전투지역은 Point(+ circle 레이어) 또는 닫힌 ring
 * - 우크라 전장 박스 밖 좌표는 버림
 */

import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { UkraineControlZone } from "@/data/geoTypes";
import { UKRAINE_SITUATION_PATHS } from "@/data/ukraineSituationSeed";
import {
  dissolveZonesByStatus,
  explodeToPolygons,
} from "@/lib/ukraineDissolve";

/** 우크라이나 전장 허용 박스 (아프리카·대양 표류 차단) */
export const UA_FRONT_THEATER = {
  minLng: 22,
  maxLng: 42,
  minLat: 44,
  maxLat: 53,
} as const;

/** 동부 전선 검증 앵커 (돈바스·자포리자 인근) */
export const UA_EAST_FRONT_ANCHOR = {
  minLng: 35,
  maxLng: 39,
  minLat: 47,
  maxLat: 50,
} as const;

export type UkraineFrontLayerRole =
  | "ru-occupied"
  | "ua-claimed"
  | "ru-claimed"
  | "ua-occupied"
  | "defense-line"
  | "advance"
  | "combat-ring";

export type UkraineFrontProps = {
  role: UkraineFrontLayerRole;
  tier: "macro" | "micro";
  name?: string;
  fill?: string;
  stroke?: string;
  fillOpacity?: number;
};

type LngLat = [number, number];

function isFiniteLngLat(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function isInUkraineFrontTheater(lng: number, lat: number): boolean {
  return (
    lng >= UA_FRONT_THEATER.minLng &&
    lng <= UA_FRONT_THEATER.maxLng &&
    lat >= UA_FRONT_THEATER.minLat &&
    lat <= UA_FRONT_THEATER.maxLat
  );
}

/** [lng, lat]만 허용. [lat, lng]로 보이면(위도가 경도 범위) 거부 */
function asLngLat(pair: unknown): LngLat | null {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const a = Number(pair[0]);
  const b = Number(pair[1]);
  if (!isFiniteLngLat(a, b)) return null;
  // GeoJSON 규약: 첫 값이 경도. 우크라에서 lng≈22–42, lat≈44–53
  // 실수로 [lat,lng]를 넣으면 a≈47, b≈37 → a가 위도 범위 → 거부하지 않고
  // 전장 박스로 최종 필터. 다만 a가 위도처럼 크고 b가 경도처럼 작으면 스왑 의심.
  if (a >= 44 && a <= 53 && b >= 22 && b <= 42 && !(a >= 22 && a <= 42)) {
    // 명백한 [lat, lng] 스왑 → 교정
    return isInUkraineFrontTheater(b, a) ? [b, a] : null;
  }
  if (!isInUkraineFrontTheater(a, b)) return null;
  return [a, b];
}

function closeRing(ring: LngLat[]): LngLat[] | null {
  if (ring.length < 3) return null;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]] as LngLat];
  }
  return ring;
}

/** 셀 그리드 dissolve → 닫힌 Polygon (좌표 [lng,lat]) — union 실패 폴백 */
function dissolveZonesToPolygons(
  zones: UkraineControlZone[],
  cellDeg: number,
  maxComponents: number,
): Polygon[] {
  if (!zones.length || cellDeg <= 0) return [];

  const occupied = new Set<string>();
  for (const zone of zones) {
    const { lat, lng } = zone.center;
    if (!isInUkraineFrontTheater(lng, lat)) continue;
    const ix = Math.floor(lng / cellDeg);
    const iy = Math.floor(lat / cellDeg);
    occupied.add(`${ix},${iy}`);
  }
  if (!occupied.size) return [];

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
      const [ixs, iys] = cur.split(",");
      const ix = Number(ixs);
      const iy = Number(iys);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = `${ix + dx},${iy + dy}`;
        if (!occupied.has(n) || seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    components.push(comp);
  }

  components.sort((a, b) => b.length - a.length);
  const polys: Polygon[] = [];

  for (const comp of components.slice(0, maxComponents)) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const key of comp) {
      const [ixs, iys] = key.split(",");
      const ix = Number(ixs);
      const iy = Number(iys);
      const west = ix * cellDeg;
      const east = (ix + 1) * cellDeg;
      const south = iy * cellDeg;
      const north = (iy + 1) * cellDeg;
      minLng = Math.min(minLng, west);
      maxLng = Math.max(maxLng, east);
      minLat = Math.min(minLat, south);
      maxLat = Math.max(maxLat, north);
    }
    // 대형 덩어리: 컴포넌트 bbox를 닫힌 Polygon으로 (거시 LOD용)
    if (
      !isInUkraineFrontTheater(minLng, minLat) &&
      !isInUkraineFrontTheater(maxLng, maxLat)
    ) {
      continue;
    }
    const ring = closeRing([
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
    ]);
    if (!ring) continue;
    // bbox 중심이 전장 안인지 확인
    const cLng = (minLng + maxLng) / 2;
    const cLat = (minLat + maxLat) / 2;
    if (!isInUkraineFrontTheater(cLng, cLat)) continue;
    polys.push({ type: "Polygon", coordinates: [ring] });
  }

  return polys;
}

function emptyFc(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function feature<G extends Polygon | LineString | Point>(
  geometry: G,
  props: UkraineFrontProps,
  id: string,
): Feature<G, UkraineFrontProps> {
  return {
    type: "Feature",
    id,
    properties: props,
    geometry,
  };
}

/**
 * 거시 (Zoom < 6): status별 polygon-clipping union 점령 fill.
 * 격자 bbox 의사-dissolve는 union 실패 시에만 폴백. 빗금 없음.
 */
export function buildUkraineMacroGeoJson(
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
): FeatureCollection {
  const features: Feature[] = [];

  const uaFront = uaZones.filter(
    (z) =>
      z.center.lng >= 30.5 &&
      z.center.lat <= 50.8 &&
      isInUkraineFrontTheater(z.center.lng, z.center.lat),
  );

  const dissolved = dissolveZonesByStatus(
    [...ruZones, ...contestedZones, ...uaFront],
    { maxRingPoints: 18, maxPolygonsPerStatus: 900, chunkSize: 36 },
  );

  const ruParts = explodeToPolygons(dissolved.RU);
  const claimParts = explodeToPolygons(dissolved.CONTESTED);
  const uaParts = explodeToPolygons(dissolved.UA);

  const useUnion = ruParts.length > 0 || claimParts.length > 0 || uaParts.length > 0;

  if (useUnion) {
    ruParts.forEach((geometry, i) => {
      features.push(
        feature(
          geometry,
          {
            role: "ru-occupied",
            tier: "macro",
            name: "RU occupied (union)",
            fill: "#b91c1c",
            stroke: "#fca5a5",
            fillOpacity: 0.38,
          },
          `macro-ru-union-${i}`,
        ),
      );
    });
    claimParts.forEach((geometry, i) => {
      features.push(
        feature(
          geometry,
          {
            role: "ru-claimed",
            tier: "macro",
            name: "Contested (union)",
            fill: "#ea580c",
            stroke: "#fdba74",
            fillOpacity: 0.28,
          },
          `macro-claim-union-${i}`,
        ),
      );
    });
    uaParts.forEach((geometry, i) => {
      features.push(
        feature(
          geometry,
          {
            role: "ua-occupied",
            tier: "macro",
            name: "UA front belt (union)",
            fill: "#0284c7",
            stroke: "#7dd3fc",
            fillOpacity: 0.22,
          },
          `macro-ua-union-${i}`,
        ),
      );
    });
    return { type: "FeatureCollection", features };
  }

  // 폴백: 기존 격자 bbox dissolve
  const cellDeg = 0.55;
  const ruPolys = dissolveZonesToPolygons(ruZones, cellDeg, 18);
  ruPolys.forEach((geometry, i) => {
    features.push(
      feature(
        geometry,
        {
          role: "ru-occupied",
          tier: "macro",
          name: "RU occupied (grid-fallback)",
          fill: "#b91c1c",
          stroke: "#fca5a5",
          fillOpacity: 0.38,
        },
        `macro-ru-${i}`,
      ),
    );
  });
  dissolveZonesToPolygons(contestedZones, cellDeg * 0.9, 12).forEach((geometry, i) => {
    features.push(
      feature(
        geometry,
        {
          role: "ru-claimed",
          tier: "macro",
          name: "Contested (grid-fallback)",
          fill: "#ea580c",
          stroke: "#fdba74",
          fillOpacity: 0.28,
        },
        `macro-claim-${i}`,
      ),
    );
  });
  dissolveZonesToPolygons(uaFront, cellDeg, 10).forEach((geometry, i) => {
    features.push(
      feature(
        geometry,
        {
          role: "ua-occupied",
          tier: "macro",
          name: "UA front belt (grid-fallback)",
          fill: "#0284c7",
          stroke: "#7dd3fc",
          fillOpacity: 0.22,
        },
        `macro-ua-${i}`,
      ),
    );
  });

  return { type: "FeatureCollection", features };
}

/** 원형 ring을 닫힌 LineString으로 (circle 레이어 보조 / 외곽선) */
function circleRing(lng: number, lat: number, radiusKm: number, steps = 48): LineString | null {
  if (!isInUkraineFrontTheater(lng, lat)) return null;
  const coords: LngLat[] = [];
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos(latRad)));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const pLng = lng + dLng * Math.cos(a);
    const pLat = lat + dLat * Math.sin(a);
    if (!isFiniteLngLat(pLng, pLat)) continue;
    coords.push([pLng, pLat]);
  }
  const closed = closeRing(coords);
  if (!closed || closed.length < 4) return null;
  return { type: "LineString", coordinates: closed };
}

/**
 * 미시 (Zoom ≥ 6): status별 union 면 + 방어 LineString + 전투 circle.
 * 개별 Voronoi 조각을 그대로 그리지 않음.
 */
export function buildUkraineMicroGeoJson(
  ruZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
): FeatureCollection {
  const features: Feature[] = [];

  const eastFirst = (z: UkraineControlZone) => {
    const inEast =
      z.center.lng >= UA_EAST_FRONT_ANCHOR.minLng &&
      z.center.lng <= UA_EAST_FRONT_ANCHOR.maxLng &&
      z.center.lat >= UA_EAST_FRONT_ANCHOR.minLat &&
      z.center.lat <= UA_EAST_FRONT_ANCHOR.maxLat;
    return inEast ? 0 : 1;
  };

  const ruPool = ruZones
    .filter((z) => isInUkraineFrontTheater(z.center.lng, z.center.lat))
    .sort((a, b) => eastFirst(a) - eastFirst(b))
    .slice(0, 700);
  const claimPool = contestedZones
    .filter((z) => isInUkraineFrontTheater(z.center.lng, z.center.lat))
    .sort((a, b) => eastFirst(a) - eastFirst(b))
    .slice(0, 500);

  const dissolved = dissolveZonesByStatus([...ruPool, ...claimPool], {
    maxRingPoints: 36,
    maxPolygonsPerStatus: 700,
    chunkSize: 32,
  });

  explodeToPolygons(dissolved.RU).forEach((geometry, i) => {
    features.push(
      feature(
        geometry,
        {
          role: "ru-occupied",
          tier: "micro",
          name: "RU occupied (union)",
          fill: "#dc2626",
          stroke: "#fecaca",
          fillOpacity: 0.42,
        },
        `micro-ru-union-${i}`,
      ),
    );
  });

  explodeToPolygons(dissolved.CONTESTED).forEach((geometry, i) => {
    features.push(
      feature(
        geometry,
        {
          role: "ru-claimed",
          tier: "micro",
          name: "Contested (union)",
          fill: "#f97316",
          stroke: "#fed7aa",
          fillOpacity: 0.4,
        },
        `micro-claim-union-${i}`,
      ),
    );
  });

  // 방어선 · 진격축 — LineString only ([lng,lat])
  for (const axis of UKRAINE_SITUATION_PATHS) {
    const coords: LngLat[] = [];
    for (const p of axis.points) {
      if (!isInUkraineFrontTheater(p.lng, p.lat)) continue;
      coords.push([p.lng, p.lat]);
    }
    if (coords.length < 2) continue;
    const isDefense = axis.kind === "ru-axis";
    features.push(
      feature(
        { type: "LineString", coordinates: coords },
        {
          role: isDefense ? "defense-line" : "advance",
          tier: "micro",
          name: axis.name,
          stroke: isDefense ? "#f87171" : axis.kind.startsWith("ua") ? "#38bdf8" : "#fb923c",
        },
        `micro-axis-${axis.id}`,
      ),
    );
  }

  // Significant Fighting — circle 레이어용 Point + ring 외곽
  const combatCenters: Array<{ id: string; lng: number; lat: number; name: string }> = [
    { id: "pokrovsk", lng: 37.18, lat: 48.28, name: "Pokrovsk fighting" },
    { id: "chasiw-yar", lng: 37.84, lat: 48.59, name: "Chasiv Yar fighting" },
    { id: "kupiansk", lng: 37.62, lat: 49.72, name: "Kupiansk fighting" },
    { id: "robotyne", lng: 35.86, lat: 47.12, name: "Robotyne fighting" },
    { id: "bakhmut-flank", lng: 38.0, lat: 48.59, name: "Bakhmut flank" },
  ];

  for (const c of combatCenters) {
    if (!isInUkraineFrontTheater(c.lng, c.lat)) continue;
    features.push(
      feature(
        { type: "Point", coordinates: [c.lng, c.lat] },
        {
          role: "combat-ring",
          tier: "micro",
          name: c.name,
          fill: "#22c55e",
          stroke: "#86efac",
          fillOpacity: 0.35,
        },
        `micro-combat-pt-${c.id}`,
      ),
    );
    const ring = circleRing(c.lng, c.lat, 5, 40);
    if (ring) {
      features.push(
        feature(
          ring,
          {
            role: "combat-ring",
            tier: "micro",
            name: `${c.name} (5km)`,
            stroke: "#4ade80",
          },
          `micro-combat-ring-${c.id}`,
        ),
      );
    }
  }

  return { type: "FeatureCollection", features };
}

/** VIINA 없을 때 쓸 정적 시드 (전부 우크라 동부 앵커 내) */
export function buildUkraineMacroSeedGeoJson(): FeatureCollection {
  const blobs: Array<{ id: string; ring: LngLat[]; role: UkraineFrontLayerRole; fill: string }> = [
    {
      id: "seed-donbas",
      role: "ru-occupied",
      fill: "#b91c1c",
      ring: [
        [36.2, 47.2],
        [38.6, 47.2],
        [38.6, 49.1],
        [36.2, 49.1],
        [36.2, 47.2],
      ],
    },
    {
      id: "seed-zaporizhzhia",
      role: "ru-occupied",
      fill: "#b91c1c",
      ring: [
        [34.6, 46.4],
        [36.8, 46.4],
        [36.8, 47.6],
        [34.6, 47.6],
        [34.6, 46.4],
      ],
    },
    {
      id: "seed-kherson",
      role: "ru-claimed",
      fill: "#ea580c",
      ring: [
        [32.8, 46.2],
        [34.9, 46.2],
        [34.9, 47.1],
        [32.8, 47.1],
        [32.8, 46.2],
      ],
    },
  ];

  const features: Feature[] = [];
  for (const blob of blobs) {
    const ring = closeRing(blob.ring.map((p) => asLngLat(p)!).filter(Boolean) as LngLat[]);
    if (!ring) continue;
    features.push(
      feature(
        { type: "Polygon", coordinates: [ring] },
        {
          role: blob.role,
          tier: "macro",
          fill: blob.fill,
          stroke: "#fecaca",
          fillOpacity: 0.36,
        },
        blob.id,
      ),
    );
  }
  return { type: "FeatureCollection", features };
}

export function buildUkraineMicroSeedGeoJson(): FeatureCollection {
  return buildUkraineMicroGeoJson([], []);
}

export function emptyUkraineFrontGeoJson(): FeatureCollection {
  return emptyFc();
}
