/**
 * DeepState Map → 점령 영토 GeoJSON (임시).
 * 참조: osiris-ref `/api/frontlines` → https://deepstatemap.live/api/history/last
 *
 * LIVEUAMAP 영토 폴링 전까지 **3일 스냅샷 좌표만** 사용. 빗금·박스 없음.
 * 유저 GET마다 DeepState를 치지 않는다.
 */


import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import {
  isInUkraineFrontTheater,
  type UkraineFrontProps,
} from "@/lib/ukraineFrontGeojson";

export const DEEPSTATE_LAST_URL = "https://deepstatemap.live/api/history/last";
export const DEEPSTATE_REFRESH_DAYS = 3;
export const DEEPSTATE_REFRESH_MS = DEEPSTATE_REFRESH_DAYS * 24 * 60 * 60 * 1000;
export const DEEPSTATE_SNAPSHOT_KEY = "ukraine";
export const DEEPSTATE_PUBLIC_SNAPSHOT = "ukraine-occupied-deepstate.json";

export type DeepstateOccupiedKind = "occupied" | "annexed" | "unknown";

export type OccupiedSnapshotMeta = {
  source: string;
  deepstateId?: number | null;
  fetchedAt: string;
  count: number;
  refreshDays: number;
};

export type OccupiedGeoJson = FeatureCollection & {
  meta?: OccupiedSnapshotMeta;
};

export function occupiedSnapshotFetchedAt(fc: OccupiedGeoJson | null | undefined): string | undefined {
  const raw = fc?.meta?.fetchedAt;
  return typeof raw === "string" && raw.trim() ? raw : undefined;
}

export function isOccupiedSnapshotFresh(
  fetchedAt: string | undefined,
  now = Date.now(),
): boolean {
  if (!fetchedAt) return false;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return false;
  return now - t < DEEPSTATE_REFRESH_MS;
}

export function attachOccupiedMeta(
  fc: FeatureCollection,
  meta: Partial<OccupiedSnapshotMeta> & { source: string },
): OccupiedGeoJson {
  return {
    ...fc,
    meta: {
      source: meta.source,
      deepstateId: meta.deepstateId ?? null,
      fetchedAt: meta.fetchedAt ?? new Date().toISOString(),
      count: meta.count ?? fc.features.length,
      refreshDays: meta.refreshDays ?? DEEPSTATE_REFRESH_DAYS,
    },
  };
}

type DeepstateFeature = {
  type?: string;
  properties?: { name?: string; fill?: string; stroke?: string; "fill-opacity"?: number };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
};

type DeepstateHistoryPayload = {
  id?: number;
  map?: { type?: string; features?: DeepstateFeature[] };
  features?: DeepstateFeature[];
};

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

function ringMostlyInTheater(ring: Position[]): boolean {
  let n = 0;
  let ok = 0;
  for (const c of ring) {
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    n += 1;
    if (isInUkraineFrontTheater(lng, lat)) ok += 1;
  }
  return n > 0 && ok / n >= 0.4;
}

function geometryInUkraineTheater(geometry: Polygon | MultiPolygon): boolean {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    return Array.isArray(ring) && ringMostlyInTheater(ring as Position[]);
  }
  return geometry.coordinates.some((poly) => {
    const ring = poly[0];
    return Array.isArray(ring) && ringMostlyInTheater(ring as Position[]);
  });
}

/** DeepState name 필드 → 상태 분류 (해방·비우크라 점령지 제외) */
export function classifyDeepstateName(name: string | undefined): DeepstateOccupiedKind | null {
  const n = String(name ?? "");
  if (/geoJSON\.status\.dismissed|Liberated/i.test(n)) return null;
  if (/geoJSON\.territories\.(crimea|ordlo|tuzla)/i.test(n)) return "annexed";
  if (/geoJSON\.status\.occupied/i.test(n)) return "occupied";
  if (/geoJSON\.status\.unknown/i.test(n)) return "unknown";
  // Abkhazia / Karelia 등 우크라 외 서술 영토는 스킵
  if (/geoJSON\.territories\./i.test(n)) return null;
  return null;
}

function englishLabel(name: string | undefined): string {
  const parts = String(name ?? "").split("///");
  const mid = parts[1]?.trim();
  if (mid) return mid.replace(/\s+/g, " ");
  return "Occupied";
}

function styleForKind(kind: DeepstateOccupiedKind): Pick<
  UkraineFrontProps,
  "role" | "fill" | "stroke" | "fillOpacity"
> {
  if (kind === "annexed") {
    return {
      role: "ru-occupied",
      fill: "#880e4f",
      stroke: "#f48fb1",
      fillOpacity: 0.34,
    };
  }
  if (kind === "unknown") {
    return {
      role: "ru-claimed",
      fill: "#bcaaa4",
      stroke: "#d7ccc8",
      fillOpacity: 0.28,
    };
  }
  // DeepState occupied 기본색
  return {
    role: "ru-occupied",
    fill: "#a52714",
    stroke: "#ef9a9a",
    fillOpacity: 0.32,
  };
}

function asPolygonGeometry(
  raw: DeepstateFeature["geometry"],
): Polygon | MultiPolygon | null {
  if (!raw?.type || !raw.coordinates) return null;
  if (raw.type !== "Polygon" && raw.type !== "MultiPolygon") return null;
  const coordinates = stripZ(raw.coordinates);
  if (!coordinates) return null;
  if (raw.type === "Polygon") {
    return { type: "Polygon", coordinates: coordinates as Position[][] };
  }
  return { type: "MultiPolygon", coordinates: coordinates as Position[][][] };
}

/**
 * DeepState history/last 페이로드 → BNW 우크라 전선 FeatureCollection (점령 fill만).
 */
export function deepstateToOccupiedGeoJson(
  payload: unknown,
  tier: "macro" | "micro" = "macro",
): OccupiedGeoJson {
  const data = payload as DeepstateHistoryPayload;
  const rawFeatures = data?.map?.features ?? data?.features ?? [];
  const features: Feature<Polygon | MultiPolygon, UkraineFrontProps & { source?: string }>[] =
    [];

  rawFeatures.forEach((f, i) => {
    const kind = classifyDeepstateName(f.properties?.name);
    if (!kind) return;
    const geometry = asPolygonGeometry(f.geometry);
    if (!geometry || !geometryInUkraineTheater(geometry)) return;

    const style = styleForKind(kind);
    features.push({
      type: "Feature",
      id: `deepstate-${tier}-${i}`,
      properties: {
        ...style,
        tier,
        name: englishLabel(f.properties?.name),
        source: "deepstate-temp",
      },
      geometry,
    });
  });

  return attachOccupiedMeta(
    { type: "FeatureCollection", features },
    {
      source: "deepstate-temp",
      deepstateId: typeof data?.id === "number" ? data.id : null,
      count: features.length,
    },
  );
}

export function emptyOccupiedGeoJson(): OccupiedGeoJson {
  return attachOccupiedMeta(
    { type: "FeatureCollection", features: [] },
    { source: "empty", count: 0 },
  );
}
