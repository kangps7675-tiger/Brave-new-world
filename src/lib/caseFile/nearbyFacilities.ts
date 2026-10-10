/**
 * 사건 지점 주변 시설 — OpenStreetMap (Overpass API).
 * "기사에 나온 정유시설·변전소·비행장이 실제로 그 근처에 있는가"를 확인하는 용도.
 * OSM은 현재 지도라 사건 당시 상태(파괴·신설)는 반영하지 못한다.
 */

import { haversineKm } from "@/lib/conflictEvents/geo";
import { radiusToBbox } from "@/lib/airRaidHistorySearch";
import { sealServerFrozenPayload, type ServerFrozenPayload } from "@/lib/caseFile/serverFreeze";
import type { CaseIncident } from "@/lib/caseFile/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const FETCH_TIMEOUT_MS = 25_000;
const CACHE_MS = 60 * 60_000;
export const FACILITY_DEFAULT_RADIUS_KM = 5;
const MAX_FACILITIES = 25;

export type FacilityCategory =
  | "military"
  | "energy"
  | "fuel"
  | "airfield"
  | "port"
  | "rail"
  | "industrial";

export type NearbyFacility = {
  osmId: string;
  category: FacilityCategory;
  name: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  tags: Record<string, string>;
};

type OsmElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const cache = new Map<string, { at: number; elements: OsmElement[] }>();

export function classifyFacility(tags: Record<string, string>): FacilityCategory | null {
  if (tags.military || tags.landuse === "military") return "military";
  if (tags.industrial === "refinery" || tags.industrial === "oil" || tags.man_made === "storage_tank" || tags.industrial === "fuel_depot") {
    return "fuel";
  }
  if (tags.power === "plant" || tags.power === "substation" || tags.power === "generator") return "energy";
  if (tags.aeroway === "aerodrome" || tags.aeroway === "airstrip" || tags.aeroway === "heliport") return "airfield";
  if (tags.harbour || tags.industrial === "port" || tags.landuse === "port") return "port";
  if (tags.railway === "station" || tags.railway === "yard") return "rail";
  if (tags.landuse === "industrial" && tags.name) return "industrial";
  return null;
}

/** 이 태그 키는 결과에 남김 (재현·설명용) */
const KEEP_TAGS = ["name", "name:en", "military", "landuse", "industrial", "power", "plant:source", "aeroway", "harbour", "railway", "man_made", "operator", "content", "substance"];

function overpassQuery(b: { south: number; west: number; north: number; east: number }): string {
  const bb = `${b.south},${b.west},${b.north},${b.east}`;
  return `[out:json][timeout:20];
(
  nwr["military"](${bb});
  nwr["landuse"="military"](${bb});
  nwr["power"~"^(plant|substation)$"](${bb});
  nwr["industrial"~"^(refinery|oil|fuel_depot|port)$"](${bb});
  nwr["man_made"="storage_tank"]["content"~"oil|fuel|petrol|diesel",i](${bb});
  nwr["aeroway"~"^(aerodrome|airstrip|heliport)$"](${bb});
  nwr["harbour"](${bb});
  nwr["landuse"="port"](${bb});
  nwr["railway"~"^(station|yard)$"](${bb});
  nwr["landuse"="industrial"]["name"](${bb});
);
out center tags 400;`;
}

async function fetchOverpass(query: string, cacheKey: string): Promise<OsmElement[]> {
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.elements;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "BraveNewWorld-CaseFile/1.0",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json = (await res.json()) as { elements?: OsmElement[] };
    const elements = Array.isArray(json.elements) ? json.elements : [];
    cache.set(cacheKey, { at: Date.now(), elements });
    return elements;
  } finally {
    clearTimeout(timer);
  }
}

export function toNearbyFacilities(
  elements: OsmElement[],
  origin: { lat: number; lng: number },
  radiusKm: number,
): NearbyFacility[] {
  const out: NearbyFacility[] = [];
  const seen = new Set<string>();
  for (const el of elements) {
    const tags = el.tags ?? {};
    const category = classifyFacility(tags);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!category || lat == null || lng == null) continue;
    const distanceKm = haversineKm(origin, { lat, lng });
    if (distanceKm > radiusKm) continue;
    const osmId = `${el.type}/${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const kept: Record<string, string> = {};
    for (const k of KEEP_TAGS) if (tags[k]) kept[k] = tags[k]!;
    out.push({
      osmId,
      category,
      name: tags["name:en"] || tags.name || null,
      lat,
      lng,
      distanceKm: Math.round(distanceKm * 100) / 100,
      tags: kept,
    });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, MAX_FACILITIES);
}

const CATEGORY_KO: Record<FacilityCategory, string> = {
  military: "군사시설",
  energy: "발전·변전",
  fuel: "유류·정유",
  airfield: "비행장",
  port: "항만",
  rail: "철도역·조차장",
  industrial: "산업단지",
};

export async function freezeFacilityEvidence(
  incident: CaseIncident,
  opts: { radiusKm?: number; category?: FacilityCategory },
): Promise<{ payload: ServerFrozenPayload; facilities: NearbyFacility[]; shows: string; limits: string } | { error: string }> {
  const place = incident.place;
  if (!place) return { error: "사건 위치를 먼저 설정하세요." };
  const radiusKm =
    typeof opts.radiusKm === "number" && opts.radiusKm > 0 && opts.radiusKm <= 30
      ? opts.radiusKm
      : FACILITY_DEFAULT_RADIUS_KM;
  const bbox = radiusToBbox(place.lat, place.lng, radiusKm);
  const cacheKey = `${place.lat.toFixed(3)}|${place.lng.toFixed(3)}|${radiusKm}`;
  const elements = await fetchOverpass(overpassQuery(bbox), cacheKey);
  let facilities = toNearbyFacilities(elements, { lat: place.lat, lng: place.lng }, radiusKm);
  if (opts.category) facilities = facilities.filter((f) => f.category === opts.category);

  const pick = facilities[0] ?? null;
  const results = pick ? { pick, facilities } : { facilities };
  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "facility",
    queriedAt: new Date().toISOString(),
    query: {
      lat: place.lat,
      lng: place.lng,
      radiusKm,
      category: opts.category ?? null,
      provider: "osm-overpass",
    },
    resultHash: "",
    resultCount: facilities.length,
    results,
    pickId: pick?.osmId,
  });

  const counts = new Map<FacilityCategory, number>();
  for (const f of facilities) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  const shows = pick
    ? `반경 ${radiusKm}km 시설 ${facilities.length}곳 — 최근접 ${CATEGORY_KO[pick.category]}${pick.name ? ` 「${pick.name}」` : ""} ${pick.distanceKm}km (${[...counts].map(([c, n]) => `${CATEGORY_KO[c]} ${n}`).join(", ")})`
    : `반경 ${radiusKm}km 안 지도에 등록된 주요 시설 없음`;
  const limits =
    "OpenStreetMap 현재 지도 기준 — 사건 당시 존재·파괴 여부는 확인하지 않음 · 군사시설은 등록 누락이 많음 · © OpenStreetMap contributors (ODbL)";

  return { payload, facilities, shows, limits };
}
