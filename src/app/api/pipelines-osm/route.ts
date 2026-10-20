import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextRequest, NextResponse } from "next/server";
import type { TransportPath } from "@/data/geoTypes";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const OSM_CDN = publicCacheHeaders(CDN_CACHE.pipelinesOsm);
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const FETCH_TIMEOUT_MS = 28_000;
const MEMORY_TTL_MS = 60 * 60 * 1000;
const MAX_PATHS = 80;
const MAX_PTS = 48;

type CacheEntry = { at: number; paths: TransportPath[] };
const memoryCache = new Map<string, CacheEntry>();

function clampBbox(south: number, west: number, north: number, east: number) {
  const s = Math.max(-85, Math.min(85, south));
  const n = Math.max(-85, Math.min(85, north));
  const w = ((west + 540) % 360) - 180;
  const e = ((east + 540) % 360) - 180;
  return {
    south: Math.min(s, n),
    north: Math.max(s, n),
    west: w,
    east: e,
  };
}

function round(n: number, p = 4) {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function simplifyCoords(coords: [number, number][]): { lat: number; lng: number }[] {
  if (coords.length <= MAX_PTS) {
    return coords.map(([lng, lat]) => ({ lat: round(lat), lng: round(lng) }));
  }
  const step = Math.ceil(coords.length / MAX_PTS);
  const sampled = coords.filter((_, i) => i % step === 0);
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled.map(([lng, lat]) => ({ lat: round(lat), lng: round(lng) }));
}

function bboxOf(points: { lat: number; lng: number }[]) {
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

function substanceKind(substance: string | undefined): "oil-pipeline" | "gas-pipeline" | null {
  const s = String(substance || "").toLowerCase();
  if (!s) return null;
  if (/(^|[|;,\s])(gas|ng|natural.?gas)([|;,\s]|$)/.test(s)) return "gas-pipeline";
  if (/(^|[|;,\s])(oil|petroleum|crude|ngl)([|;,\s]|$)/.test(s)) return "oil-pipeline";
  return null;
}

function isUnderwaterLocation(location: string | undefined): boolean {
  const loc = String(location || "").toLowerCase();
  return /underwater|under_water|offshore|seabed|sea|subsea/.test(loc);
}

type OsmElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

async function queryOverpass(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<OsmElement[]> {
  const { south, west, north, east } = bbox;
  const query = `
[out:json][timeout:25];
(
  way["man_made"="pipeline"]["substance"~"gas|oil|petroleum",i](${south},${west},${north},${east});
  relation["man_made"="pipeline"]["substance"~"gas|oil|petroleum",i](${south},${west},${north},${east});
  way["man_made"="pipeline"]["location"~"underwater|under_water|offshore|seabed|subsea",i](${south},${west},${north},${east});
  relation["man_made"="pipeline"]["location"~"underwater|under_water|offshore|seabed|subsea",i](${south},${west},${north},${east});
);
out geom;
`.trim();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json = (await res.json()) as { elements?: OsmElement[] };
    return Array.isArray(json.elements) ? json.elements : [];
  } finally {
    clearTimeout(timer);
  }
}

function elementsToPaths(elements: OsmElement[]): TransportPath[] {
  const paths: TransportPath[] = [];
  const seen = new Set<number>();
  for (const el of elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    if (seen.has(el.id)) continue;
    seen.add(el.id);

    const underwater = isUnderwaterLocation(el.tags?.location);
    const substance = substanceKind(el.tags?.substance);
    let kind: TransportPath["kind"] | null = null;
    if (underwater) kind = "subsea-pipeline";
    else if (substance) kind = substance;
    if (!kind) continue;

    const coords = el.geometry.map((g) => [g.lon, g.lat] as [number, number]);
    const points = simplifyCoords(coords);
    if (points.length < 2) continue;
    const name =
      el.tags?.name ||
      el.tags?.["name:en"] ||
      el.tags?.ref ||
      `OSM pipeline ${el.id}`;
    paths.push({
      id: `osm-pipe-${el.id}`,
      kind,
      name,
      scalerank: underwater ? 1 : 2,
      lengthKm: null,
      bbox: bboxOf(points),
      points: points.map((p) => ({ ...p, alt: underwater ? 0.01 : 0.011 })),
      meta: {
        source: "osm",
        substance: el.tags?.substance || null,
        location: el.tags?.location || null,
      },
    });
    if (paths.length >= MAX_PATHS) break;
  }
  return paths;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const south = Number(sp.get("south"));
    const west = Number(sp.get("west"));
    const north = Number(sp.get("north"));
    const east = Number(sp.get("east"));
    if (![south, west, north, east].every(Number.isFinite)) {
      return NextResponse.json(
        { error: "south,west,north,east required", paths: [] },
        { status: 400, headers: OSM_CDN },
      );
    }

    const bbox = clampBbox(south, west, north, east);
    // 과도한 전역 박스 거부
    if (bbox.north - bbox.south > 25 || Math.abs(bbox.east - bbox.west) > 35) {
      return NextResponse.json(
        { error: "bbox too large", paths: [], attribution: "© OpenStreetMap contributors" },
        { status: 400, headers: OSM_CDN },
      );
    }

    const key = [
      round(bbox.south, 2),
      round(bbox.west, 2),
      round(bbox.north, 2),
      round(bbox.east, 2),
    ].join(":");
    const now = Date.now();
    const hit = memoryCache.get(key);
    if (hit && now - hit.at < MEMORY_TTL_MS) {
      return NextResponse.json(
        {
          paths: hit.paths,
          count: hit.paths.length,
          cached: true,
          attribution: "© OpenStreetMap contributors (ODbL)",
        },
        { headers: OSM_CDN },
      );
    }

    const elements = await queryOverpass(bbox);
    const paths = elementsToPaths(elements);
    memoryCache.set(key, { at: now, paths });

    return NextResponse.json(
      {
        paths,
        count: paths.length,
        cached: false,
        attribution: "© OpenStreetMap contributors (ODbL)",
      },
      { headers: OSM_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(error, "Overpass failed"),
        paths: [],
      },
      { status: 502, headers: OSM_CDN },
    );
  }
}
