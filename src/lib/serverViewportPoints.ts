import type { MilitaryBaseArea, StaticPoint } from "@/data/geoTypes";
import { expandStaticPoints } from "@/lib/compactData";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import type { GlobeLodTier } from "@/lib/globeLod";
import { getServerDataProfile } from "@/lib/serverEnv";
import {
  filterPointsByMilitaryBaseForces,
  parseMilitaryBaseForces,
  type MilitaryBaseForceId,
} from "@/lib/militaryBaseForces";
import {
  MILITARY_BASE_AREA_MAX_BY_TIER,
  RESOURCE_POINT_MAX_BY_TIER,
  STATIC_POINT_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { filterStaticPointsForView } from "@/lib/staticGlobe";
import { isCenterInView } from "@/lib/viewportCull";

export type ViewportPointLayer =
  | "airports"
  | "ports"
  | "military-bases"
  | "resources"
  | "cable-landings"
  | "nuclear-sites"
  | "missile-silos"
  | "strategic-missile-bases"
  | "missile-test-sites"
  | "internet-exchanges"
  | "refugee-camps"
  | "ucdp-events"
  | "lng-terminals"
  | "gem-coal-plants"
  | "gem-coal-mines"
  | "gem-coal-terminals"
  | "gem-nuclear"
  | "gem-solar"
  | "gem-wind"
  | "gem-hydro"
  | "gem-geothermal"
  | "gem-bioenergy"
  | "gem-oil-gas-plants"
  | "gem-oil-gas-extraction"
  | "gem-iron-ore"
  | "gem-cement"
  | "gem-steel"
  | "gem-chemicals";

const FILE_BY_LAYER: Record<ViewportPointLayer, string> = {
  airports: "airports.json",
  ports: "ports.json",
  "military-bases": "military-bases.json",
  resources: "resources.json",
  "cable-landings": "cable-landings.json",
  "nuclear-sites": "nuclear-sites.json",
  "missile-silos": "missile-silos.json",
  "strategic-missile-bases": "strategic-missile-bases.json",
  "missile-test-sites": "missile-test-sites.json",
  "internet-exchanges": "internet-exchanges.json",
  "refugee-camps": "refugee-camps.json",
  "ucdp-events": "ucdp-events.json",
  "lng-terminals": "lng-terminals.json",
  "gem-coal-plants": "gem-coal-plants.json",
  "gem-coal-mines": "gem-coal-mines.json",
  "gem-coal-terminals": "gem-coal-terminals.json",
  "gem-nuclear": "gem-nuclear.json",
  "gem-solar": "gem-solar.json",
  "gem-wind": "gem-wind.json",
  "gem-hydro": "gem-hydro.json",
  "gem-geothermal": "gem-geothermal.json",
  "gem-bioenergy": "gem-bioenergy.json",
  "gem-oil-gas-plants": "gem-oil-gas-plants.json",
  "gem-oil-gas-extraction": "gem-oil-gas-extraction.json",
  "gem-iron-ore": "gem-iron-ore.json",
  "gem-cement": "gem-cement.json",
  "gem-steel": "gem-steel.json",
  "gem-chemicals": "gem-chemicals.json",
};

const pointCache = new Map<string, StaticPoint[]>();
let baseAreaCache: MilitaryBaseArea[] | null = null;

export function isViewportPointLayer(value: string): value is ViewportPointLayer {
  return value in FILE_BY_LAYER;
}

export async function loadAllStaticPoints(
  layer: ViewportPointLayer,
): Promise<StaticPoint[]> {
  const profile = getServerDataProfile();
  const key = `${profile}:${layer}`;
  const hit = pointCache.get(key);
  if (hit) return hit;
  const raw = await loadCloudStaticJson<unknown[]>(FILE_BY_LAYER[layer]);
  if (!Array.isArray(raw) || raw.length === 0) {
    pointCache.set(key, []);
    return [];
  }
  const points = expandStaticPoints(raw as Parameters<typeof expandStaticPoints>[0]);
  pointCache.set(key, points);
  return points;
}

export async function queryViewportPoints(
  layer: ViewportPointLayer,
  options: {
    lat: number;
    lng: number;
    radiusDeg: number;
    tier: GlobeLodTier;
    max?: number;
    /** military-bases only — filter by force before the LOD cap */
    forces?: MilitaryBaseForceId[] | string;
  },
) {
  const all = await loadAllStaticPoints(layer);
  const view = { lat: options.lat, lng: options.lng, altitude: 1 };
  let source = all;
  if (layer === "military-bases") {
    const forces =
      typeof options.forces === "string"
        ? parseMilitaryBaseForces(options.forces)
        : options.forces;
    if (forces) source = filterPointsByMilitaryBaseForces(all, forces);
  }
  let filtered = filterStaticPointsForView(source, view, options.tier, options.radiusDeg);
  const defaultCap =
    layer === "resources"
      ? RESOURCE_POINT_MAX_BY_TIER[options.tier]
      : STATIC_POINT_MAX_BY_TIER[options.tier];
  const cap = options.max ?? defaultCap;
  if (cap > 0 && filtered.length > cap) filtered = filtered.slice(0, cap);
  return { points: filtered, total: source.length, returned: filtered.length };
}

export async function loadAllMilitaryBaseAreas(): Promise<MilitaryBaseArea[]> {
  if (baseAreaCache) return baseAreaCache;
  const raw = await loadCloudStaticJson<MilitaryBaseArea[]>("military-base-areas.json");
  baseAreaCache = Array.isArray(raw)
    ? raw.filter((item) => item?.geometry && item.center && typeof item.name === "string")
    : [];
  return baseAreaCache;
}

export async function queryViewportMilitaryBaseAreas(options: {
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: GlobeLodTier;
  max?: number;
}) {
  const all = await loadAllMilitaryBaseAreas();
  const maxCount = options.max ?? MILITARY_BASE_AREA_MAX_BY_TIER[options.tier];
  if (maxCount <= 0) return { areas: [] as MilitaryBaseArea[], total: all.length, returned: 0 };

  const effectiveRadius =
    options.tier === "global"
      ? 0
      : options.tier === "continent"
        ? Math.max(options.radiusDeg, 55)
        : options.radiusDeg;
  const view = { lat: options.lat, lng: options.lng };
  const areas: MilitaryBaseArea[] = [];
  for (const area of all) {
    if (effectiveRadius > 0 && !isCenterInView(area.center, view, effectiveRadius)) continue;
    areas.push(area);
    if (areas.length >= maxCount) break;
  }
  return { areas, total: all.length, returned: areas.length };
}
