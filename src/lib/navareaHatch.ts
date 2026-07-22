import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJsonGeometry, TransportPath } from "@/data/geoTypes";
import { geometryToAccentOutlineAndHatch } from "@/lib/disputeHatch";

/**
 * NAVAREA in-force → 보라색 폴리곤/선 (UKMTO 흑백 원 빗금과 구분).
 * 자홍(동맹 갈등) 슬롯을 비우고 violet을 항행경보 전용으로 씀.
 */

export const NAVAREA_OUTLINE = "rgba(168, 85, 247, 0.94)";
export const NAVAREA_HATCH = "rgba(168, 85, 247, 0.52)";

export type NavareaFeaturePoint = {
  id: string;
  region: string;
  source: string;
  date: string;
  areaHint: string;
  description: string;
  geometryType: string;
  radiusNm: number | null;
  lat: number | null;
  lng: number | null;
  geometry: Geometry;
};

function makeLinePath(
  id: string,
  name: string,
  coords: number[][],
): TransportPath | null {
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
    accentColor: NAVAREA_OUTLINE,
    bbox: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

/** Point (+ optional radiusNm) → 작은 원 근사 폴리곤으로 표시 */
function pointToCircleRing(
  lng: number,
  lat: number,
  radiusNm: number | null,
): number[][] {
  const nm = radiusNm != null && radiusNm > 0 ? radiusNm : 8;
  const latR = nm / 60;
  const lngR = latR / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const segs = 24;
  const ring: number[][] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    ring.push([lng + lngR * Math.cos(t), lat + latR * Math.sin(t)]);
  }
  return ring;
}

function featureToPaths(feature: NavareaFeaturePoint): TransportPath[] {
  const label =
    feature.areaHint ||
    `NAVAREA ${feature.region} · ${feature.id}` ||
    feature.id;
  const geo = feature.geometry;

  if (geo.type === "Polygon" || geo.type === "MultiPolygon") {
    return geometryToAccentOutlineAndHatch(
      `navarea-${feature.id}`,
      label,
      geo as GeoJsonGeometry,
      {
        outlineKind: "dispute-zone",
        hatchKind: "conflict-hatch",
        outlineColor: NAVAREA_OUTLINE,
        hatchColor: NAVAREA_HATCH,
        pattern: "slash",
        preferDetailSegments: true,
      },
    );
  }

  if (geo.type === "LineString") {
    const path = makeLinePath(
      `dispute-zone-navarea-${feature.id}-0`,
      label,
      geo.coordinates as number[][],
    );
    return path ? [path] : [];
  }

  if (geo.type === "Point") {
    const [lng, lat] = geo.coordinates;
    if (typeof lng !== "number" || typeof lat !== "number") return [];
    const ring = pointToCircleRing(lng, lat, feature.radiusNm);
    return geometryToAccentOutlineAndHatch(
      `navarea-${feature.id}`,
      label,
      { type: "Polygon", coordinates: [ring] } as GeoJsonGeometry,
      {
        outlineKind: "dispute-zone",
        hatchKind: "conflict-hatch",
        outlineColor: NAVAREA_OUTLINE,
        hatchColor: NAVAREA_HATCH,
        pattern: "backslash",
        preferDetailSegments: false,
      },
    );
  }

  return [];
}

export function navareaFeaturesToPaths(
  features: NavareaFeaturePoint[],
): TransportPath[] {
  const out: TransportPath[] = [];
  for (const f of features) {
    out.push(...featureToPaths(f));
  }
  return out;
}

export function isNavareaPath(path: { id: string }): boolean {
  return (
    path.id.includes("navarea-") ||
    path.id.startsWith("dispute-zone-navarea-") ||
    path.id.startsWith("conflict-hatch-navarea-")
  );
}

/** path.id → feature id */
export function navareaIdFromPath(path: { id: string }): string | null {
  const m = path.id.match(/navarea-(.+?)(?:-\d+)?$/);
  if (!m?.[1]) return null;
  // conflict-hatch-navarea-XI-26-0330-0 → XI-26-0330
  const raw = m[1];
  const trimmed = raw.replace(/-\d+$/, "");
  return trimmed || raw;
}

export function findNavareaFeature(
  features: NavareaFeaturePoint[],
  path: { id: string },
): NavareaFeaturePoint | null {
  const id = navareaIdFromPath(path);
  if (!id) return null;
  return (
    features.find((f) => f.id === id) ??
    features.find((f) => path.id.includes(f.id)) ??
    null
  );
}

export function parseNavareaApiPayload(payload: unknown): NavareaFeaturePoint[] {
  const fc = payload as FeatureCollection | null;
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return [];
  }
  const out: NavareaFeaturePoint[] = [];
  for (const f of fc.features as Feature[]) {
    if (!f?.geometry || !f.properties) continue;
    const p = f.properties as Record<string, unknown>;
    const id = String(p.id ?? "");
    if (!id) continue;
    out.push({
      id,
      region: String(p.region ?? ""),
      source: String(p.source ?? ""),
      date: String(p.date ?? ""),
      areaHint: String(p.areaHint ?? ""),
      description: String(p.description ?? ""),
      geometryType: String(p.geometryType ?? f.geometry.type),
      radiusNm: typeof p.radiusNm === "number" ? p.radiusNm : null,
      lat: typeof p.lat === "number" ? p.lat : null,
      lng: typeof p.lng === "number" ? p.lng : null,
      geometry: f.geometry,
    });
  }
  return out;
}
