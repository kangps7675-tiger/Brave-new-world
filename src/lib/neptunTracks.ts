import {
  getNeptunTypeMeta,
  neptunDest,
  type NeptunArchivedThreat,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
import {
  buildElevatedNeptunPath,
  type NeptunPathElevationMode,
} from "@/lib/neptunFlightArc";

type LatLng = { lat: number; lng: number };

function toElevatedPoints(
  groundPoints: LatLng[],
  threatType: string,
  mode: NeptunPathElevationMode,
  pointBudget?: number,
): TransportPathPoint[] {
  return buildElevatedNeptunPath(groundPoints, threatType, mode, pointBudget);
}

function dedupeTrailPoints(points: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  let prevKey = "";
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
    const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
    if (key === prevKey) continue;
    prevKey = key;
    out.push(point);
  }
  return out;
}

function bboxFromPoints(points: LatLng[]): TransportPath["bbox"] {
  if (points.length === 0) {
    return { minLat: 0, minLng: 0, maxLat: 0, maxLng: 0 };
  }
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

function trailDistanceKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    total += 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  return total;
}

function simplifyGroundPath(points: LatLng[], maxVertices: number): LatLng[] {
  if (maxVertices <= 0 || points.length <= maxVertices) return points;
  if (maxVertices === 1) return [points[0]];
  const out: LatLng[] = [];
  for (let i = 0; i < maxVertices; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (maxVertices - 1));
    out.push(points[index]);
  }
  return dedupeTrailPoints(out);
}

/** API 궤적만 사용 — 예측 위치로 매 프레임 재빌드하지 않음 */
function buildStaticTrail(
  threat: NeptunLiveThreat | NeptunArchivedThreat,
  maxGroundVertices?: number,
): LatLng[] {
  const fromApi = (threat.trail ?? []).map((point) => ({ lat: point.lat, lng: point.lon }));
  let points = dedupeTrailPoints(fromApi);

  if (points.length === 0 && Number.isFinite(threat.lat) && Number.isFinite(threat.lon)) {
    points.push({ lat: threat.lat, lng: threat.lon });
  }

  if (maxGroundVertices != null && maxGroundVertices > 0) {
    points = simplifyGroundPath(points, maxGroundVertices);
  }

  return points;
}

function projectionMinutes(threat: NeptunLiveThreat): number {
  if (threat.type === "ballistic" || threat.type === "mig31k") return 8;
  if (threat.type === "missile" || threat.type === "kab") return 6;
  return 4;
}

function buildProjectionTrail(threat: NeptunLiveThreat): LatLng[] {
  const speed = threat.velocity?.speedKmh ?? 0;
  if (!threat.flying || speed <= 0) return [];

  const bearing = threat.velocity?.bearingDeg ?? threat.predictedHeading ?? threat.heading ?? 0;
  const km = speed * (projectionMinutes(threat) / 60);
  const start = { lat: threat.predictedLat, lng: threat.predictedLon };
  const segments = threat.type === "missile" || threat.type === "ballistic" ? 4 : 3;
  const points: LatLng[] = [start];

  for (let i = 1; i <= segments; i += 1) {
    const frac = i / segments;
    const next = neptunDest(start.lat, start.lng, bearing, km * frac);
    points.push({ lat: next.lat, lng: next.lon });
  }

  return points;
}

function toTransportPath(
  id: string,
  kind: "neptun-trail" | "neptun-projection" | "neptun-trail-archived",
  name: string,
  groundPoints: LatLng[],
  threatType: string,
  accentColor: string,
  mode: NeptunPathElevationMode,
  pointBudget?: number,
): TransportPath | null {
  if (groundPoints.length < 2) return null;
  const points = toElevatedPoints(groundPoints, threatType, mode, pointBudget);
  if (points.length < 2) return null;
  return {
    id,
    kind,
    name,
    scalerank: 0,
    lengthKm: Math.round(trailDistanceKm(groundPoints) * 10) / 10,
    bbox: bboxFromPoints(groundPoints),
    points,
    accentColor,
  };
}

function dimTrailColor(color: string): string {
  if (color.startsWith("#") && color.length === 7) return `${color}66`;
  return color;
}

export function buildNeptunTrailPaths(
  threats: NeptunLiveThreat[],
  mode: NeptunPathElevationMode,
  pointBudget?: number,
  maxGroundVertices?: number,
): TransportPath[] {
  const paths: TransportPath[] = [];

  for (const threat of threats) {
    const meta = getNeptunTypeMeta(threat.type);
    const trailPoints = buildStaticTrail(threat, maxGroundVertices);
    const trail = toTransportPath(
      `neptun-trail:${threat.id}`,
      "neptun-trail",
      meta.label,
      trailPoints,
      threat.type,
      meta.color,
      mode,
      pointBudget,
    );
    if (trail) paths.push(trail);
  }

  return paths;
}

export function buildNeptunProjectionPaths(
  threats: NeptunLiveThreat[],
  mode: NeptunPathElevationMode,
  pointBudget?: number,
): TransportPath[] {
  const paths: TransportPath[] = [];

  for (const threat of threats) {
    const meta = getNeptunTypeMeta(threat.type);
    const projectionPoints = buildProjectionTrail(threat);
    const projection = toTransportPath(
      `neptun-projection:${threat.id}`,
      "neptun-projection",
      `${meta.label} 예측`,
      projectionPoints,
      threat.type,
      meta.color,
      mode,
      pointBudget,
    );
    if (projection) paths.push(projection);
  }

  return paths;
}
export function buildArchivedNeptunTrackPaths(
  threats: NeptunArchivedThreat[],
  mode: NeptunPathElevationMode,
  pointBudget?: number,
  maxGroundVertices?: number,
): TransportPath[] {
  const paths: TransportPath[] = [];

  for (const threat of threats) {
    const meta = getNeptunTypeMeta(threat.type);
    const trailPoints = buildStaticTrail(threat, maxGroundVertices);
    const trail = toTransportPath(
      `neptun-trail-archived:${threat.id}`,
      "neptun-trail-archived",
      `${meta.label} (지나감)`,
      trailPoints,
      threat.type,
      dimTrailColor(meta.color),
      mode,
      pointBudget,
    );
    if (trail) paths.push(trail);
  }

  return paths;
}

export function neptunTrailSignature(threats: Array<NeptunLiveThreat | NeptunArchivedThreat>): string {
  return threats
    .map((threat) => {
      const trail = (threat.trail ?? [])
        .map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`)
        .join(">");
      return `${threat.id}:${threat.type}:${trail}`;
    })
    .join("|");
}

export function neptunProjectionSignature(threats: NeptunLiveThreat[]): string {
  return threats
    .map((threat) => {
      const lat = threat.predictedLat.toFixed(1);
      const lng = threat.predictedLon.toFixed(1);
      const bearing = Math.round(
        threat.velocity?.bearingDeg ?? threat.predictedHeading ?? threat.heading ?? 0,
      );
      return `${threat.id}:${lat},${lng}:${bearing}`;
    })
    .join("|");
}
