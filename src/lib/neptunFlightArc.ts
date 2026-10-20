import type { NeptunThreatType } from "@/lib/neptun";
import type { TransportPathPoint } from "@/data/geoTypes";

type LatLng = { lat: number; lng: number };

export type NeptunPathElevationMode = "elevated" | "low" | "flat";

type FlightProfile = {
  maxAltKm: number;
  shape: "ballistic" | "cruise" | "low";
  subdivisions: number;
  maxPoints: number;
};

const EARTH_RADIUS_KM = 6371;
const ALT_VIS_SCALE = 2.1;

const FLIGHT_PROFILES: Record<NeptunThreatType, FlightProfile> = {
  ballistic: { maxAltKm: 95, shape: "ballistic", subdivisions: 8, maxPoints: 12 },
  mig31k: { maxAltKm: 75, shape: "ballistic", subdivisions: 8, maxPoints: 12 },
  missile: { maxAltKm: 9, shape: "cruise", subdivisions: 6, maxPoints: 10 },
  kab: { maxAltKm: 6, shape: "cruise", subdivisions: 6, maxPoints: 10 },
  uav: { maxAltKm: 1.4, shape: "low", subdivisions: 5, maxPoints: 8 },
  recon: { maxAltKm: 2.2, shape: "low", subdivisions: 5, maxPoints: 8 },
  unknown: { maxAltKm: 5, shape: "cruise", subdivisions: 6, maxPoints: 10 },
};

/** Arc geometry buffer pool — 동일 경로 재생성 방지 */
const arcBufferPool = new Map<string, TransportPathPoint[]>();
const MAX_POOL = 128;

export function releaseArcBufferPool(): void {
  arcBufferPool.clear();
}

export function arcBufferPoolSize(): number {
  return arcBufferPool.size;
}

function segmentDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getFlightProfile(type: string): FlightProfile {
  return FLIGHT_PROFILES[type as NeptunThreatType] ?? FLIGHT_PROFILES.unknown;
}

function altitudeKmAtFraction(profile: FlightProfile, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  if (profile.shape === "ballistic") {
    return profile.maxAltKm * Math.sin(Math.PI * clamped);
  }
  if (profile.shape === "cruise") {
    if (clamped < 0.12) return profile.maxAltKm * (clamped / 0.12);
    if (clamped > 0.88) return profile.maxAltKm * ((1 - clamped) / 0.12);
    return profile.maxAltKm;
  }
  return profile.maxAltKm * (0.55 + 0.45 * Math.sin(Math.PI * clamped));
}

function kmToGlobeAlt(km: number): number {
  return (km * ALT_VIS_SCALE) / EARTH_RADIUS_KM;
}

function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (maxPoints - 1));
    out.push(points[index]);
  }
  return out;
}

function densifyGroundPath(points: LatLng[], subdivisions: number, maxPoints: number): LatLng[] {
  if (points.length < 2) return points;
  const dense: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    for (let s = 0; s < subdivisions; s += 1) {
      const t = s / subdivisions;
      dense.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      });
    }
  }
  dense.push(points[points.length - 1]);
  return downsamplePoints(dense, maxPoints);
}

function cacheKey(
  groundPoints: LatLng[],
  threatType: string,
  mode: NeptunPathElevationMode,
  pointBudget?: number,
): string {
  const coords = groundPoints
    .map((p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`)
    .join(";");
  return `${mode}:${threatType}:${pointBudget ?? "auto"}:${coords}`;
}

/** 발사(첫 점) → 탄착/현재(마지막 점) 공중 궤적 */
export function buildElevatedNeptunPath(
  groundPoints: LatLng[],
  threatType: string,
  mode: NeptunPathElevationMode = "elevated",
  pointBudget?: number,
): TransportPathPoint[] {
  if (groundPoints.length === 0) return [];
  if (groundPoints.length === 1) {
    const only = groundPoints[0];
    return [{ lat: only.lat, lng: only.lng, alt: 0 }];
  }

  const key = cacheKey(groundPoints, threatType, mode, pointBudget);
  const cached = arcBufferPool.get(key);
  if (cached) return cached;

  const profile = getFlightProfile(threatType);
  const maxPoints = pointBudget ?? profile.maxPoints;
  const subdivCap = mode === "flat" ? 3 : mode === "low" ? 4 : profile.subdivisions;
  const perSegment = Math.max(2, Math.ceil(subdivCap / groundPoints.length));
  const dense = densifyGroundPath(groundPoints, perSegment, maxPoints);

  const cumDist: number[] = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cumDist.push(cumDist[i - 1] + segmentDistanceKm(dense[i - 1], dense[i]));
  }
  const totalDist = cumDist[cumDist.length - 1] || 1;

  const points = dense.map((point, index) => {
    if (mode === "flat") {
      return { lat: point.lat, lng: point.lng, alt: 0 };
    }
    const frac = cumDist[index] / totalDist;
    const altKm = altitudeKmAtFraction(profile, frac);
    const scale = mode === "low" ? 0.38 : 1;
    return {
      lat: point.lat,
      lng: point.lng,
      alt: kmToGlobeAlt(altKm * scale),
    };
  });

  arcBufferPool.set(key, points);
  if (arcBufferPool.size > MAX_POOL) {
    const oldest = arcBufferPool.keys().next().value;
    if (oldest) arcBufferPool.delete(oldest);
  }

  return points;
}
