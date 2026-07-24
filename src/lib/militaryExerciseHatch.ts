import type { GeoJsonGeometry, TransportPath } from "@/data/geoTypes";
import { geometryToAccentOutlineAndHatch } from "@/lib/disputeHatch";
import type { MilitaryExercise } from "@/lib/militaryExercises";

/** 훈련 구역 — 청록 (NAVAREA 보라·UKMTO 흑백과 구분) */
export const EXERCISE_OUTLINE = "rgba(34, 211, 238, 0.92)";
export const EXERCISE_HATCH = "rgba(34, 211, 238, 0.48)";

function pointToCircleRing(lng: number, lat: number, radiusNm = 12): number[][] {
  const latR = radiusNm / 60;
  const lngR = latR / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const segs = 24;
  const ring: number[][] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    ring.push([lng + lngR * Math.cos(t), lat + latR * Math.sin(t)]);
  }
  return ring;
}

function makeLinePath(id: string, name: string, coords: number[][]): TransportPath | null {
  const points = coords
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (points.length < 2) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    id,
    name,
    kind: "dispute-zone",
    scalerank: 1,
    lengthKm: null,
    accentColor: EXERCISE_OUTLINE,
    bbox: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

function hatchOpts() {
  return {
    outlineKind: "dispute-zone" as const,
    hatchKind: "conflict-hatch" as const,
    outlineColor: EXERCISE_OUTLINE,
    hatchColor: EXERCISE_HATCH,
    pattern: "slash" as const,
    preferDetailSegments: true,
  };
}

function exerciseToPaths(ex: MilitaryExercise): TransportPath[] {
  const label = ex.title || ex.id;
  const geo = ex.geojson;
  const id = `exercise-${ex.id}`;

  if (geo?.type === "Polygon" || geo?.type === "MultiPolygon") {
    return geometryToAccentOutlineAndHatch(id, label, geo as GeoJsonGeometry, hatchOpts());
  }
  if (geo?.type === "LineString") {
    const path = makeLinePath(`dispute-zone-${id}-0`, label, geo.coordinates as number[][]);
    return path ? [path] : [];
  }
  if (geo?.type === "Point") {
    const [lng, lat] = geo.coordinates;
    if (typeof lng !== "number" || typeof lat !== "number") return [];
    const ring = pointToCircleRing(lng, lat, 12);
    return geometryToAccentOutlineAndHatch(
      id,
      label,
      { type: "Polygon", coordinates: [ring] } as GeoJsonGeometry,
      { ...hatchOpts(), pattern: "backslash", preferDetailSegments: false },
    );
  }
  if (ex.lat != null && ex.lng != null) {
    const ring = pointToCircleRing(ex.lng, ex.lat, 12);
    return geometryToAccentOutlineAndHatch(
      id,
      label,
      { type: "Polygon", coordinates: [ring] } as GeoJsonGeometry,
      { ...hatchOpts(), pattern: "backslash", preferDetailSegments: false },
    );
  }
  return [];
}

export function militaryExercisesToPaths(exercises: MilitaryExercise[]): TransportPath[] {
  const out: TransportPath[] = [];
  for (const ex of exercises) {
    if (!ex.active) continue;
    out.push(...exerciseToPaths(ex));
  }
  return out;
}

export function findMilitaryExercise(
  exercises: MilitaryExercise[],
  path: TransportPath | null | undefined,
): MilitaryExercise | null {
  if (!path?.id) return null;
  if (!path.id.includes("exercise-")) return null;
  return (
    exercises.find(
      (e) =>
        path.id === `exercise-${e.id}` ||
        path.id.startsWith(`exercise-${e.id}-`) ||
        path.id.includes(`exercise-${e.id}`),
    ) ?? null
  );
}

export function exerciseFlyTarget(ex: MilitaryExercise): {
  lat: number;
  lng: number;
  altitude: number;
} | null {
  if (ex.lat != null && ex.lng != null) {
    return { lat: ex.lat, lng: ex.lng, altitude: 0.85 };
  }
  const geo = ex.geojson;
  if (geo?.type === "Point") {
    const [lng, lat] = geo.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng, altitude: 0.85 };
    }
  }
  return null;
}
