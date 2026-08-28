import type { CountryFeature, TransportPath } from "@/data/geoTypes";
import { expandTransportPaths } from "@/lib/compactData";
import { sanitizeShippingLanePaths } from "@/lib/shippingLaneSanitize";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import type { GlobeLodTier } from "@/lib/globeLod";
import { getServerDataProfile } from "@/lib/serverEnv";
import {
  ECONOMY_GAS_PIPELINE_MAX_BY_TIER,
  ECONOMY_OIL_PIPELINE_MAX_BY_TIER,
  ECONOMY_SUBMARINE_CABLE_MAX_BY_TIER,
  ECONOMY_SUBSEA_PIPELINE_MAX_BY_TIER,
  GAS_PIPELINE_MAX_BY_TIER,
  OIL_PIPELINE_MAX_BY_TIER,
  SHIPPING_LANE_MAX_BY_TIER,
  SUBMARINE_CABLE_MAX_BY_TIER,
  SUBSEA_PIPELINE_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import type { ViewerMode } from "@/lib/viewPackages";
import { COUNTRY_POLYGON_MAX_BY_TIER, isCenterInView } from "@/lib/viewportCull";
import { filterTransportPathsForViewport } from "@/lib/viewportPathFilter";
import {
  isViewportPathLayer,
  type ViewportPathLayer,
} from "@/lib/viewportPathTypes";

export type { ViewportPathLayer };
export { isViewportPathLayer };
export { filterTransportPathsForViewport };
const FILE_BY_LAYER: Record<ViewportPathLayer, string> = {
  railroads: "railroads.json",
  "shipping-lanes": "shipping-lanes.json",
  "submarine-cables": "submarine-cables.json",
  "oil-pipelines": "oil-pipelines.json",
  "gas-pipelines": "gas-pipelines.json",
  "subsea-pipelines": "subsea-pipelines.json",
  "dispute-boundaries": "dispute-boundaries.json",
  "lsib-boundaries": "lsib-boundary.json",
};

const DEFAULT_MAX: Record<ViewportPathLayer, Record<GlobeLodTier, number>> = {
  railroads: {
    global: 480,
    continent: 900,
    regional: 1000,
    near: 2200,
    village: 3500,
  },
  "shipping-lanes": SHIPPING_LANE_MAX_BY_TIER,
  "submarine-cables": SUBMARINE_CABLE_MAX_BY_TIER,
  "oil-pipelines": OIL_PIPELINE_MAX_BY_TIER,
  "gas-pipelines": GAS_PIPELINE_MAX_BY_TIER,
  "subsea-pipelines": SUBSEA_PIPELINE_MAX_BY_TIER,
  "dispute-boundaries": {
    global: 40,
    continent: 80,
    regional: 140,
    near: 220,
    village: 320,
  },
  // LSIB(미 국무부) — 395개 경계 레코드가 530개 라인 세그먼트로 분해됨. 전역에서도 나라 윤곽이 보이게 상한을 넉넉히 둠.
  "lsib-boundaries": {
    global: 260,
    continent: 400,
    regional: 530,
    near: 530,
    village: 530,
  },
};

const ECONOMY_INFRA_MAX: Partial<
  Record<ViewportPathLayer, Record<GlobeLodTier, number>>
> = {
  "submarine-cables": ECONOMY_SUBMARINE_CABLE_MAX_BY_TIER,
  "oil-pipelines": ECONOMY_OIL_PIPELINE_MAX_BY_TIER,
  "gas-pipelines": ECONOMY_GAS_PIPELINE_MAX_BY_TIER,
  "subsea-pipelines": ECONOMY_SUBSEA_PIPELINE_MAX_BY_TIER,
};

function defaultMaxForLayer(
  layer: ViewportPathLayer,
  tier: GlobeLodTier,
  mode: ViewerMode = "conflict",
): number {
  if (mode === "economy" && ECONOMY_INFRA_MAX[layer]) {
    return ECONOMY_INFRA_MAX[layer]![tier] ?? 0;
  }
  return DEFAULT_MAX[layer][tier] ?? 200;
}

const pathCache = new Map<string, TransportPath[]>();
const countryCache = new Map<string, CountryFeature[]>();

export async function loadAllTransportPaths(
  layer: ViewportPathLayer,
): Promise<TransportPath[]> {
  const profile = getServerDataProfile();
  const key = `${profile}:${layer}`;
  const hit = pathCache.get(key);
  if (hit) return hit;

  const raw = await loadCloudStaticJson<unknown[]>(FILE_BY_LAYER[layer]);
  if (!Array.isArray(raw) || raw.length === 0) {
    pathCache.set(key, []);
    return [];
  }
  const paths = expandTransportPaths(
    raw as Parameters<typeof expandTransportPaths>[0],
  );
  const sanitized =
    layer === "shipping-lanes" ? sanitizeShippingLanePaths(paths) : paths;
  pathCache.set(key, sanitized);
  return sanitized;
}

export async function loadAllCountries(): Promise<CountryFeature[]> {
  const profile = getServerDataProfile();
  const key = `${profile}:countries`;
  const hit = countryCache.get(key);
  if (hit) return hit;

  const chunk = await loadCloudStaticJson<CountryFeature[]>("countries.json");
  let countries: CountryFeature[] = [];
  if (Array.isArray(chunk) && chunk.length > 0) {
    countries = chunk;
  } else {
    const app = await loadCloudStaticJson<{ countries?: CountryFeature[] }>("app-data.json");
    if (Array.isArray(app?.countries)) countries = app.countries;
  }
  countryCache.set(key, countries);
  return countries;
}

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export async function queryViewportPaths(
  layer: ViewportPathLayer,
  options: {
    lat: number;
    lng: number;
    radiusDeg: number;
    tier: GlobeLodTier;
    max?: number;
    maxScalerank?: number;
    arterialMaxRank?: number;
    viewerMode?: ViewerMode;
  },
) {
  const all = await loadAllTransportPaths(layer);
  const mode = options.viewerMode === "economy" ? "economy" : "conflict";
  const defaultMax = defaultMaxForLayer(layer, options.tier, mode);
  const maxCount = Math.min(options.max ?? defaultMax, defaultMax || options.max || 0);
  if (maxCount <= 0) {
    return { paths: [] as TransportPath[], total: all.length, returned: 0 };
  }

  const paths = filterTransportPathsForViewport(all, {
    lat: options.lat,
    lng: options.lng,
    radiusDeg: options.radiusDeg,
    maxCount,
    maxScalerank: options.maxScalerank,
    arterialMaxRank: options.arterialMaxRank,
  });

  return { paths, total: all.length, returned: paths.length };
}

export async function queryViewportCountries(options: {
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: GlobeLodTier;
  max?: number;
}) {
  const all = (await loadAllCountries()).filter((c) => Boolean(c.geometry));
  const defaultMax = COUNTRY_POLYGON_MAX_BY_TIER[options.tier];
  const maxCount = Math.min(options.max ?? defaultMax, defaultMax);
  const view = { lat: options.lat, lng: options.lng };

  const ranked = all
    .map((country) => {
      const dist = Math.sqrt(
        (country.center.lat - view.lat) ** 2 +
          longitudeDistance(country.center.lng, view.lng) ** 2,
      );
      return { country, dist };
    })
    .filter((item) =>
      options.radiusDeg <= 0
        ? true
        : isCenterInView(item.country.center, view, options.radiusDeg),
    )
    .sort(
      (a, b) =>
        (b.country.population ?? 0) - (a.country.population ?? 0) || a.dist - b.dist,
    )
    .slice(0, maxCount)
    .map((item) => item.country);

  return { countries: ranked, total: all.length, returned: ranked.length };
}
