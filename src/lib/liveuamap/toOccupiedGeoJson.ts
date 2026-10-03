/**
 * LiveUAMap mpts fields/kmls/geojson → OccupiedGeoJson.
 * 빈 배열이면 null (가짜 면 금지).
 */

import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import {
  attachOccupiedMeta,
  type OccupiedGeoJson,
} from "@/lib/deepstate/toOccupiedGeoJson";
import { featureInControlBounds } from "@/lib/liveuamap/controlBounds";
import type { LiveuamapControlRegionId } from "@/lib/liveuamap/types";
import { asNumber, asString } from "@/lib/liveuamap/parseHelpers";

function stripZ(coords: unknown): Position | Position[] | Position[][] | Position[][][] | null {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  if (typeof coords[0] === "number") {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  }
  const out: unknown[] = [];
  for (const part of coords) {
    const next = stripZ(part);
    if (next == null) return null;
    out.push(next);
  }
  return out as Position[];
}

function asGeometry(raw: unknown): Geometry | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as { type?: string; coordinates?: unknown };
  if (g.type !== "Polygon" && g.type !== "MultiPolygon") return null;
  const coords = stripZ(g.coordinates);
  if (!coords) return null;
  return { type: g.type, coordinates: coords } as Geometry;
}

function featureFromUnknown(raw: unknown, index: number, regionId: string): Feature | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.type === "Feature" && o.geometry) {
    const geometry = asGeometry(o.geometry);
    if (!geometry) return null;
    const props =
      o.properties && typeof o.properties === "object"
        ? (o.properties as Record<string, unknown>)
        : {};
    return {
      type: "Feature",
      properties: {
        ...props,
        region: regionId,
        name: asString(props.name) || asString(o.name) || `liveua-control-${index}`,
        source: "liveuamap",
      },
      geometry,
    };
  }

  const geometry = asGeometry(o.geometry) || asGeometry(o);
  if (geometry) {
    return {
      type: "Feature",
      properties: {
        region: regionId,
        name: asString(o.name) || asString(o.title) || `liveua-control-${index}`,
        fill: asString(o.fill) || asString(o.color) || undefined,
        source: "liveuamap",
      },
      geometry,
    };
  }

  // LiveUA field often: { id, points: [[lat,lng]|[lng,lat]], ... } or path string
  const points = o.points ?? o.coords ?? o.coordinates;
  if (Array.isArray(points) && points.length >= 3) {
    const ring: Position[] = [];
    for (const p of points) {
      if (Array.isArray(p) && p.length >= 2) {
        const a = Number(p[0]);
        const b = Number(p[1]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        // heuristic: |lat|<=90 and first looks like lat → [lng,lat]
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180 && Math.abs(a) < Math.abs(b)) {
          ring.push([b, a]);
        } else {
          ring.push([a, b]);
        }
      }
    }
    if (ring.length >= 3) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
      return {
        type: "Feature",
        properties: {
          region: regionId,
          name: asString(o.name) || `liveua-control-${index}`,
          source: "liveuamap",
          fieldId: asString(o.id) || (asNumber(o.id) != null ? String(asNumber(o.id)) : undefined),
        },
        geometry: { type: "Polygon", coordinates: [ring] },
      };
    }
  }

  return null;
}

function collectControlRaw(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;
  const out: unknown[] = [];
  for (const key of ["fields", "kmls", "areas", "control"]) {
    if (Array.isArray(o[key])) out.push(...(o[key] as unknown[]));
  }
  if (o.type === "FeatureCollection" && Array.isArray(o.features)) {
    out.push(...(o.features as unknown[]));
  }
  if (Array.isArray(o.features)) {
    // geojson=true sometimes nests
    for (const f of o.features as unknown[]) {
      if (f && typeof f === "object" && (f as { type?: string }).type === "Feature") {
        out.push(f);
      }
    }
  }
  return out;
}

export function liveuamapFieldsToOccupiedGeoJson(
  payload: unknown,
  regionId: LiveuamapControlRegionId,
): OccupiedGeoJson | null {
  const rawList = collectControlRaw(payload);
  const features: Feature[] = [];
  rawList.forEach((row, i) => {
    const f = featureFromUnknown(row, i, regionId);
    if (!f) return;
    // 공유 resid(예: IL/LB)에서 타 전장 폴리곤이 섞이지 않게 bbox 필터
    if (!featureInControlBounds(f, regionId)) return;
    features.push(f);
  });
  if (!features.length) return null;

  const fc: FeatureCollection = { type: "FeatureCollection", features };
  return attachOccupiedMeta(fc, {
    source: "liveuamap",
    fetchedAt: new Date().toISOString(),
    count: features.length,
    refreshDays: 1,
  });
}
