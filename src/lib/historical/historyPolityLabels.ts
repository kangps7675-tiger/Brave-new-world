/**
 * 역사 모드 영토 라벨 — 폴리곤 centroid Point GeoJSON.
 * 면적 큰 순으로 자르고, 줌에 따라 minzoom 을 둔다.
 */

import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";

/** MapLibre HTML 라벨 상한 — DOM 폭주 방지 */
export const HISTORY_POLITY_LABEL_MAX_VISIBLE = 28;

const HANGUL_RE = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/;

export function historyLabelUsesHangul(label: string): boolean {
  return HANGUL_RE.test(label);
}

type LabelCandidate = {
  label: string;
  lng: number;
  lat: number;
  area: number;
  source: "korea" | "cliopatria";
};

function ringAreaAndCentroid(ring: Position[]): { area: number; lng: number; lat: number } | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = Number(ring[i]?.[0]);
    const y0 = Number(ring[i]?.[1]);
    const x1 = Number(ring[i + 1]?.[0]);
    const y1 = Number(ring[i + 1]?.[1]);
    if (![x0, y0, x1, y1].every(Number.isFinite)) continue;
    const cross = x0 * y1 - x1 * y0;
    area2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (area2 === 0) {
    const lng = Number(ring[0]?.[0]);
    const lat = Number(ring[0]?.[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { area: 0, lng, lat };
  }
  const area = Math.abs(area2) / 2;
  return { area, lng: cx / (3 * area2), lat: cy / (3 * area2) };
}

function geometryCentroid(geometry: Geometry): { lng: number; lat: number; area: number } | null {
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat, area: 0 };
  }
  if (geometry.type === "Polygon") {
    const ring = (geometry as Polygon).coordinates[0];
    return ring ? ringAreaAndCentroid(ring) : null;
  }
  if (geometry.type === "MultiPolygon") {
    let best: { lng: number; lat: number; area: number } | null = null;
    for (const poly of (geometry as MultiPolygon).coordinates) {
      const ring = poly[0];
      if (!ring) continue;
      const next = ringAreaAndCentroid(ring);
      if (!next) continue;
      if (!best || next.area > best.area) best = next;
    }
    return best;
  }
  return null;
}

function pickLabel(properties: Record<string, unknown> | null | undefined): string {
  if (!properties) return "";
  for (const key of ["label", "nameKo", "nameEn", "name"] as const) {
    const v = properties[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function collectFromFc(
  fc: FeatureCollection | null | undefined,
  source: "korea" | "cliopatria",
): LabelCandidate[] {
  if (!fc?.features?.length) return [];
  const out: LabelCandidate[] = [];
  for (const feature of fc.features) {
    if (!feature?.geometry) continue;
    const label = pickLabel(feature.properties as Record<string, unknown> | null);
    if (!label) continue;
    const c = geometryCentroid(feature.geometry);
    if (!c || !Number.isFinite(c.lng) || !Number.isFinite(c.lat)) continue;
    out.push({ label, lng: c.lng, lat: c.lat, area: c.area, source });
  }
  return out;
}

/** 면적이 클수록 낮은 줌에서도 보이게 */
function minzoomForArea(area: number, source: "korea" | "cliopatria"): number {
  if (source === "korea") {
    if (area >= 8) return 1.5;
    if (area >= 2) return 2.5;
    if (area >= 0.4) return 3.5;
    return 4.5;
  }
  if (area >= 40) return 0.5;
  if (area >= 10) return 1.5;
  if (area >= 2) return 2.8;
  if (area >= 0.5) return 3.8;
  return 5;
}

/**
 * Cliopatria + Korea fill → Point 라벨 FeatureCollection.
 * 동일 이름 중복은 면적 큰 쪽만 남기고, 전체는 면적 순으로 상한을 둔다.
 */
export function buildHistoryPolityLabelGeoJson(input: {
  cliopatria: FeatureCollection;
  korea: FeatureCollection;
}): FeatureCollection<Point> {
  const merged = [
    ...collectFromFc(input.cliopatria, "cliopatria"),
    ...collectFromFc(input.korea, "korea"),
  ];

  const bestByLabel = new Map<string, LabelCandidate>();
  for (const cand of merged) {
    const key = cand.label.toLowerCase();
    const prev = bestByLabel.get(key);
    if (!prev || cand.area > prev.area || (cand.source === "korea" && prev.source !== "korea")) {
      bestByLabel.set(key, cand);
    }
  }

  const ranked = [...bestByLabel.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source === "korea" ? -1 : 1;
    return b.area - a.area;
  });

  const features: Feature<Point>[] = ranked
    .slice(0, HISTORY_POLITY_LABEL_MAX_VISIBLE * 3)
    .map((cand, i) => ({
      type: "Feature" as const,
      id: `hist-label-${i}-${cand.label.slice(0, 24)}`,
      properties: {
        label: cand.label,
        minzoom: minzoomForArea(cand.area, cand.source),
        source: cand.source,
        area: cand.area,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [cand.lng, cand.lat],
      },
    }));

  return { type: "FeatureCollection", features };
}
