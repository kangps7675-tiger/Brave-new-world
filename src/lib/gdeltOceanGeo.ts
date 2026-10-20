/**
 * GDELT Geo API — 태평양·대서양·북극 지정학 경쟁·외교 포인트 (Next 서버용).
 */

import type { ConflictEvent } from "@/data/geoTypes";
import { buildGdeltPointTitle } from "@/lib/gdeltNewsAlert";

const GEO_API = "https://api.gdeltproject.org/api/v2/geo/geo";

const OCEAN_QUERIES: { tag: string; query: string }[] = [
  {
    tag: "pacific",
    query:
      '(pacific OR "indo-pacific" OR "south china sea" OR "east china sea" OR "taiwan strait" OR FONOP OR AUKUS OR QUAD OR "freedom of navigation" OR "philippine sea" OR guam OR "naval exercise")',
  },
  {
    tag: "atlantic",
    query:
      '(atlantic OR NATO OR "north atlantic" OR "giuk gap" OR "baltic sea" OR "black sea" OR "naval exercise" OR "carrier strike" OR "undersea cable" OR "arctic atlantic")',
  },
  {
    tag: "arctic",
    query:
      '(arctic OR "northern sea route" OR "northwest passage" OR "high north" OR Svalbard OR "arctic council" OR "polar silk" OR "icebreaker" OR "arctic military")',
  },
];

type GeoJsonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: { name?: string; count?: number; url?: string };
};

type GeoJsonFc = { features?: GeoJsonFeature[] };

function stableId(tag: string, lat: number, lng: number, name: string | null, url: string | null) {
  const key = `${tag}|${lat.toFixed(3)}|${lng.toFixed(3)}|${name || ""}|${url || ""}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `gdelt-ocean-${tag}-${(hash >>> 0).toString(16)}`;
}

function toEvent(
  tag: string,
  lat: number,
  lng: number,
  name: string | null,
  url: string | null,
): ConflictEvent {
  return {
    id: stableId(tag, lat, lng, name, url),
    globalEventId: stableId(tag, lat, lng, name, url),
    eventDate: new Date().toISOString().slice(0, 10),
    country: null,
    lat,
    lng,
    category: "Strategic developments",
    severity: 2,
    goldsteinScale: -2,
    sourceUrl: url,
    title: buildGdeltPointTitle({ name, url, queryTag: tag }),
    createdAt: new Date().toISOString(),
    eventTier: "diplomatic",
  };
}

async function fetchOne(tag: string, query: string, maxpoints: number): Promise<ConflictEvent[]> {
  const url = new URL(GEO_API);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("maxpoints", String(maxpoints));
  url.searchParams.set("timespan", "7d");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as GeoJsonFc;
  const out: ConflictEvent[] = [];
  for (const feature of body.features ?? []) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = feature.properties?.name?.trim() || null;
    const link = feature.properties?.url?.trim() || null;
    out.push(toEvent(tag, lat, lng, name, link));
  }
  return out;
}

/** 대양 3전장 GDELT Geo — 실패해도 빈 배열 */
export async function fetchOceanGeopoliticsGdelt(maxTotal = 72): Promise<ConflictEvent[]> {
  const per = Math.max(12, Math.floor(maxTotal / OCEAN_QUERIES.length));
  const batches: ConflictEvent[][] = [];
  for (const q of OCEAN_QUERIES) {
    try {
      batches.push(await fetchOne(q.tag, q.query, per));
    } catch {
      batches.push([]);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  const seen = new Set<string>();
  const merged: ConflictEvent[] = [];
  for (const batch of batches) {
    for (const ev of batch) {
      const key = `${ev.lat.toFixed(2)}|${ev.lng.toFixed(2)}|${ev.sourceUrl || ev.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(ev);
      if (merged.length >= maxTotal) return merged;
    }
  }
  return merged;
}
