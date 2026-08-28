/**
 * CRINK OSM infra GeoJSON → map paths / polygon fills.
 * Data: public/data/crink/crink-{category}.geojson (npm run crink:infra:extract)
 */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
import { isCenterInView, type ViewPoint } from "@/lib/viewportCull";

export type CrinkInfraCategory =
  | "aeroway"
  | "harbour"
  | "border"
  | "dam"
  | "power"
  | "checkpoint"
  | "rail"
  | "road";

export const CRINK_INFRA_CATEGORY_LABEL: Record<
  CrinkInfraCategory,
  { ko: string; en: string }
> = {
  aeroway: { ko: "활주로·공항 (OSM)", en: "Airfields / runways (OSM)" },
  harbour: { ko: "항만 경계 (OSM)", en: "Harbour polygons (OSM)" },
  border: { ko: "국경 검문소 (OSM)", en: "Border crossings (OSM)" },
  dam: { ko: "댐·저수지 (OSM)", en: "Dams (OSM)" },
  power: { ko: "변전소·발전소 (OSM)", en: "Substations & plants (OSM)" },
  checkpoint: { ko: "군사 검문소 (OSM)", en: "Military checkpoints (OSM)" },
  rail: { ko: "주요 교역로 철도 (OSM)", en: "Major corridor rail (OSM)" },
  road: { ko: "주요 교역로 도로 (OSM)", en: "Major corridor roads (OSM)" },
};

export const CRINK_INFRA_STROKE: Record<CrinkInfraCategory, string> = {
  aeroway: "rgba(120, 180, 255, 0.85)",
  harbour: "rgba(80, 200, 220, 0.8)",
  border: "rgba(255, 210, 80, 0.95)",
  dam: "rgba(100, 160, 255, 0.85)",
  power: "rgba(255, 180, 60, 0.75)",
  checkpoint: "rgba(255, 100, 120, 0.9)",
  rail: "rgba(230, 190, 90, 0.88)",
  road: "rgba(210, 210, 210, 0.78)",
};

export const CRINK_INFRA_FILL: Record<CrinkInfraCategory, string> = {
  aeroway: "rgba(80, 140, 220, 0.22)",
  harbour: "rgba(60, 180, 200, 0.2)",
  border: "rgba(255, 210, 80, 0.35)",
  dam: "rgba(80, 130, 220, 0.28)",
  power: "rgba(255, 180, 60, 0.08)",
  checkpoint: "rgba(255, 80, 100, 0.35)",
  rail: "rgba(230, 190, 90, 0.12)",
  road: "rgba(210, 210, 210, 0.08)",
};

export type CrinkInfraFeatureProps = {
  crinkCategory?: CrinkInfraCategory;
  name?: string;
  osmId?: number;
  osmType?: string;
  region?: string;
};

export async function fetchCrinkInfraCollection(
  category: CrinkInfraCategory,
): Promise<FeatureCollection | null> {
  try {
    const res = await fetch(`/data/crink/crink-${category}.geojson`, {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    return (await res.json()) as FeatureCollection;
  } catch {
    return null;
  }
}

function lineToPathPoints(coords: number[][], alt = 0.004): TransportPathPoint[] {
  return coords.map(([lng, lat]) => ({ lat, lng, alt }));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lng2 - lng1) * p))) / 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pathLengthKm(points: TransportPathPoint[]): number | null {
  if (points.length < 2) return null;
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += haversineKm(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng,
    );
  }
  return Math.round(total);
}

function bboxFromPoints(points: TransportPathPoint[]): TransportPath["bbox"] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

function geomAnchor(geom: Geometry): ViewPoint | null {
  if (geom.type === "Point") {
    const [lng, lat] = geom.coordinates as number[];
    return { lat, lng };
  }
  if (geom.type === "LineString") {
    const coords = geom.coordinates as number[][];
    const mid = coords[Math.floor(coords.length / 2)];
    if (!mid) return null;
    return { lat: mid[1], lng: mid[0] };
  }
  if (geom.type === "Polygon") {
    const ring = (geom.coordinates as number[][][])[0];
    if (!ring?.length) return null;
    const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return { lat, lng };
  }
  return null;
}

/** Line / polygon rings → transport paths for MapLibre paths layer */
export function crinkInfraToPaths(
  fc: FeatureCollection | null,
  category: CrinkInfraCategory,
  opts?: {
    view?: ViewPoint;
    radiusDeg?: number;
    maxCount?: number;
  },
): TransportPath[] {
  if (!fc?.features?.length) return [];
  const accentColor = CRINK_INFRA_STROKE[category];
  const alt =
    category === "power"
      ? 0.003
      : category === "border"
        ? 0.006
        : category === "road"
          ? 0.005
          : category === "rail"
            ? 0.0035
            : 0.004;
  const paths: TransportPath[] = [];
  const view = opts?.view;
  const radiusDeg = opts?.radiusDeg ?? 0;
  const maxCount = opts?.maxCount ?? Infinity;
  for (const raw of fc.features) {
    if (paths.length >= maxCount) break;
    const f = raw as Feature<Geometry, CrinkInfraFeatureProps>;
    const geom = f.geometry;
    if (!geom) continue;
    if (view && radiusDeg > 0) {
      const anchor = geomAnchor(geom);
      if (!anchor || !isCenterInView(anchor, view, radiusDeg)) continue;
    }
    const name = f.properties?.name ?? CRINK_INFRA_CATEGORY_LABEL[category].ko;
    const id = `crink-${category}-${f.properties?.osmType ?? "x"}-${f.properties?.osmId ?? paths.length}`;
    let points: TransportPathPoint[] = [];
    if (geom.type === "LineString") {
      points = lineToPathPoints(geom.coordinates as number[][], alt);
    } else if (geom.type === "Polygon") {
      const ring = (geom.coordinates as number[][][])[0];
      if (ring?.length >= 2) points = lineToPathPoints(ring, alt);
    } else if (geom.type === "Point") {
      const [lng, lat] = geom.coordinates as number[];
      points = [{ lat, lng, alt: 0.006 }];
    }
    if (points.length === 0) continue;
    paths.push({
      id,
      kind: "crink-infra",
      name,
      scalerank: category === "power" ? 3 : category === "rail" || category === "road" ? 1 : 2,
      lengthKm: pathLengthKm(points),
      accentColor,
      bbox: bboxFromPoints(points),
      points,
      meta: {
        crinkCategory: category,
        osmId: f.properties?.osmId ?? null,
        region: f.properties?.region ?? null,
      },
    });
  }
  return paths;
}

/** Polygon / point features for fill layer */
export function crinkInfraToPolygonGeoJson(
  fc: FeatureCollection | null,
  category: CrinkInfraCategory,
): FeatureCollection {
  if (!fc?.features?.length) {
    return { type: "FeatureCollection", features: [] };
  }
  const fill = CRINK_INFRA_FILL[category];
  const stroke = CRINK_INFRA_STROKE[category];
  const features: Feature[] = [];
  for (const raw of fc.features) {
    const f = raw as Feature<Geometry, CrinkInfraFeatureProps>;
    const geom = f.geometry;
    if (!geom) continue;
    if (geom.type === "Point") {
      const [lng, lat] = geom.coordinates as number[];
      features.push({
        type: "Feature",
        properties: {
          fill,
          stroke,
          fillOpacity: 0.55,
          name: f.properties?.name,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lng - 0.05, lat - 0.03],
              [lng + 0.05, lat - 0.03],
              [lng + 0.05, lat + 0.03],
              [lng - 0.05, lat + 0.03],
              [lng - 0.05, lat - 0.03],
            ],
          ],
        },
      });
    } else if (geom.type === "Polygon") {
      features.push({
        type: "Feature",
        properties: { fill, stroke, fillOpacity: 0.35, name: f.properties?.name },
        geometry: geom,
      });
    }
  }
  return { type: "FeatureCollection", features };
}
