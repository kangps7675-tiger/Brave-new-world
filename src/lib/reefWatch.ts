/**
 * ReefWatch — South China Sea feature-centric monitoring bridge.
 * Upstream: https://github.com/NinhGhoster/ReefWatch (MIT)
 *
 * Poll policy (AGENTS.md / quick_check.py):
 * - one OpenSky request over combined Spratly+Paracel bbox
 * - attribute aircraft to nearest feature within ±0.15° (~16.7 km)
 * - prioritize Tier-1 airstrip / construction features over bulk noise
 */

import rawFeatures from "@/data/reefWatchTargetFeatures.raw.json";

export const REEF_WATCH_ATTRIBUTION = {
  name: "ReefWatch",
  url: "https://github.com/NinhGhoster/ReefWatch",
  license: "MIT",
  trafficSource: "OpenSky Network",
  trafficSourceUrl: "https://opensky-network.org/",
} as const;

/** Combined Spratly + Paracel scan (ReefWatch quick_check) */
export const SCS_BBOX = {
  lamin: 7.0,
  lomin: 109.0,
  lamax: 17.0,
  lomax: 116.0,
} as const;

/** Per-feature attribution radius (° ≈ 16.7 km) */
export const FEATURE_BBOX_DEG = 0.15;
export const FEATURE_ATTR_KM = 16.7;

/** Product Direction Tier 1 */
const TIER1_KEYS = new Set([
  "woody_island",
  "fiery_cross_reef",
  "subi_reef",
  "mischief_reef",
  "thitu_island",
]);

export type ReefWatchGroup = "spratly_islands" | "paracel_islands" | string;

export type ReefWatchRawFeature = {
  key: string;
  name: string;
  lat: number;
  lon: number;
  group: string;
  country: string;
  has_airport?: boolean;
  has_helipad?: boolean;
};

export type ReefWatchFeature = {
  id: string;
  key: string;
  name: string;
  lat: number;
  lng: number;
  group: ReefWatchGroup;
  claimant: string;
  priority: 1 | 2 | 3;
  hasAirport: boolean;
  hasHelipad: boolean;
  tags: string[];
};

export type ReefWatchTrafficObservation = {
  id: string;
  featureId: string;
  featureKey: string;
  featureName: string;
  domain: "aircraft";
  source: "opensky";
  capturedAt: string;
  identity: {
    icao24: string | null;
    callsign: string | null;
    originCountry: string | null;
  };
  position: {
    lat: number;
    lng: number;
    altitudeM: number | null;
    speedMps: number | null;
    heading: number | null;
    onGround: boolean | null;
  };
  distanceKm: number;
  reviewStatus: "raw";
};

export type ReefWatchFeatureStatus = ReefWatchFeature & {
  recentTraffic24h: number;
  nearestTrafficKm: number | null;
};

export type ReefWatchPayload = {
  features: ReefWatchFeature[];
  featureStatus: ReefWatchFeatureStatus[];
  traffic: ReefWatchTrafficObservation[];
  overview: {
    featureCount: number;
    tier1Count: number;
    trafficCount: number;
    featuresWithTraffic: number;
    bbox: typeof SCS_BBOX;
    attributionRadiusKm: number;
  };
  sourceHealth: {
    opensky: {
      status: "ready" | "rate_limited" | "error" | "stub" | "empty";
      latestObservationAt: string | null;
      observationCount: number;
      querySeconds: number | null;
      message?: string;
    };
  };
  fetchedAt: string;
  attribution: typeof REEF_WATCH_ATTRIBUTION;
  errors?: string[];
};

function asRawList(value: unknown): ReefWatchRawFeature[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is ReefWatchRawFeature =>
      !!row &&
      typeof row === "object" &&
      typeof (row as ReefWatchRawFeature).key === "string" &&
      typeof (row as ReefWatchRawFeature).lat === "number" &&
      typeof (row as ReefWatchRawFeature).lon === "number",
  );
}

export function featurePriority(raw: ReefWatchRawFeature): 1 | 2 | 3 {
  if (TIER1_KEYS.has(raw.key)) return 1;
  if (raw.has_airport) return 1;
  if (raw.has_helipad) return 2;
  return 3;
}

export function featureTags(raw: ReefWatchRawFeature): string[] {
  const tags: string[] = [];
  if (raw.has_airport) tags.push("airstrip");
  if (raw.has_helipad) tags.push("helipad");
  if (TIER1_KEYS.has(raw.key)) tags.push("tier1");
  if (raw.group.includes("spratly")) tags.push("spratly");
  if (raw.group.includes("paracel")) tags.push("paracel");
  return tags;
}

export function normalizeReefWatchFeatures(
  raw: unknown = rawFeatures,
): ReefWatchFeature[] {
  return asRawList(raw)
    .map((row) => ({
      id: `feature:${row.key}`,
      key: row.key,
      name: row.name,
      lat: row.lat,
      lng: row.lon,
      group: row.group,
      claimant: row.country,
      priority: featurePriority(row),
      hasAirport: Boolean(row.has_airport),
      hasHelipad: Boolean(row.has_helipad),
      tags: featureTags(row),
    }))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestFeature(
  lat: number,
  lon: number,
  features: ReefWatchFeature[],
): { feature: ReefWatchFeature; distanceKm: number } | null {
  let best: ReefWatchFeature | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const feature of features) {
    const d = haversineKm(lat, lon, feature.lat, feature.lng);
    if (d < bestDist) {
      bestDist = d;
      best = feature;
    }
  }
  if (!best) return null;
  return { feature: best, distanceKm: bestDist };
}

/** OpenSky states/all row indices (documented API) */
type OpenSkyState = unknown[];

export function parseOpenSkyStates(
  states: unknown,
  features: ReefWatchFeature[],
  opts?: { time?: number; maxAttrKm?: number },
): ReefWatchTrafficObservation[] {
  if (!Array.isArray(states)) return [];
  const maxKm = opts?.maxAttrKm ?? FEATURE_ATTR_KM;
  const capturedAt = new Date(
    Number.isFinite(opts?.time) ? (opts!.time as number) * 1000 : Date.now(),
  ).toISOString();
  const out: ReefWatchTrafficObservation[] = [];

  for (const row of states) {
    if (!Array.isArray(row)) continue;
    const state = row as OpenSkyState;
    const lon = typeof state[5] === "number" ? state[5] : null;
    const lat = typeof state[6] === "number" ? state[6] : null;
    if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    const nearest = findNearestFeature(lat, lon, features);
    if (!nearest || nearest.distanceKm > maxKm) continue;

    const icao24 =
      typeof state[0] === "string" && state[0].trim() ? state[0].trim().toLowerCase() : null;
    const callsign =
      typeof state[1] === "string" && state[1].trim() ? state[1].trim() : null;
    const originCountry =
      typeof state[2] === "string" && state[2].trim() ? state[2].trim() : null;
    const baro = typeof state[7] === "number" ? state[7] : null;
    const onGround = typeof state[8] === "boolean" ? state[8] : null;
    const velocity = typeof state[9] === "number" ? state[9] : null;
    const heading = typeof state[10] === "number" ? state[10] : null;
    const geo = typeof state[13] === "number" ? state[13] : null;
    const altitudeM = geo ?? baro;

    const idSeed = icao24 || callsign || `${lat.toFixed(3)},${lon.toFixed(3)}`;
    out.push({
      id: `obs:aircraft:${idSeed}:${capturedAt}`,
      featureId: nearest.feature.id,
      featureKey: nearest.feature.key,
      featureName: nearest.feature.name,
      domain: "aircraft",
      source: "opensky",
      capturedAt,
      identity: { icao24, callsign, originCountry },
      position: {
        lat,
        lng: lon,
        altitudeM,
        speedMps: velocity,
        heading,
        onGround,
      },
      distanceKm: Math.round(nearest.distanceKm * 10) / 10,
      reviewStatus: "raw",
    });
  }

  out.sort((a, b) => a.distanceKm - b.distanceKm || a.featureName.localeCompare(b.featureName));
  return out;
}

export function buildFeatureStatus(
  features: ReefWatchFeature[],
  traffic: ReefWatchTrafficObservation[],
): ReefWatchFeatureStatus[] {
  const byFeature = new Map<string, { count: number; nearest: number }>();
  for (const obs of traffic) {
    const prev = byFeature.get(obs.featureId);
    if (!prev) {
      byFeature.set(obs.featureId, { count: 1, nearest: obs.distanceKm });
    } else {
      prev.count += 1;
      prev.nearest = Math.min(prev.nearest, obs.distanceKm);
    }
  }
  return features.map((feature) => {
    const stats = byFeature.get(feature.id);
    return {
      ...feature,
      recentTraffic24h: stats?.count ?? 0,
      nearestTrafficKm: stats ? stats.nearest : null,
    };
  });
}

export function buildReefWatchPayload(args: {
  traffic: ReefWatchTrafficObservation[];
  openskyStatus: ReefWatchPayload["sourceHealth"]["opensky"];
  errors?: string[];
  features?: ReefWatchFeature[];
}): ReefWatchPayload {
  const features = args.features ?? normalizeReefWatchFeatures();
  const featureStatus = buildFeatureStatus(features, args.traffic);
  const withTraffic = featureStatus.filter((f) => f.recentTraffic24h > 0).length;
  return {
    features,
    featureStatus,
    traffic: args.traffic,
    overview: {
      featureCount: features.length,
      tier1Count: features.filter((f) => f.priority === 1).length,
      trafficCount: args.traffic.length,
      featuresWithTraffic: withTraffic,
      bbox: SCS_BBOX,
      attributionRadiusKm: FEATURE_ATTR_KM,
    },
    sourceHealth: { opensky: args.openskyStatus },
    fetchedAt: new Date().toISOString(),
    attribution: REEF_WATCH_ATTRIBUTION,
    ...(args.errors?.length ? { errors: args.errors } : {}),
  };
}

export function demoReefWatchPayload(): ReefWatchPayload {
  const features = normalizeReefWatchFeatures();
  const woody = features.find((f) => f.key === "woody_island") ?? features[0]!;
  const fiery = features.find((f) => f.key === "fiery_cross_reef") ?? features[1]!;
  const now = new Date().toISOString();
  const traffic: ReefWatchTrafficObservation[] = [
    {
      id: `obs:aircraft:demo1:${now}`,
      featureId: woody.id,
      featureKey: woody.key,
      featureName: woody.name,
      domain: "aircraft",
      source: "opensky",
      capturedAt: now,
      identity: { icao24: "demo001", callsign: "DEMO01", originCountry: "China" },
      position: {
        lat: woody.lat + 0.02,
        lng: woody.lng - 0.01,
        altitudeM: 3200,
        speedMps: 120,
        heading: 210,
        onGround: false,
      },
      distanceKm: 2.4,
      reviewStatus: "raw",
    },
    {
      id: `obs:aircraft:demo2:${now}`,
      featureId: fiery.id,
      featureKey: fiery.key,
      featureName: fiery.name,
      domain: "aircraft",
      source: "opensky",
      capturedAt: now,
      identity: { icao24: "demo002", callsign: "DEMO02", originCountry: "China" },
      position: {
        lat: fiery.lat + 0.01,
        lng: fiery.lng + 0.015,
        altitudeM: 1800,
        speedMps: 95,
        heading: 80,
        onGround: false,
      },
      distanceKm: 1.8,
      reviewStatus: "raw",
    },
  ];
  return buildReefWatchPayload({
    traffic,
    openskyStatus: {
      status: "stub",
      latestObservationAt: now,
      observationCount: traffic.length,
      querySeconds: 0,
      message: "API stub demo traffic",
    },
  });
}
