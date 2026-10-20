/**
 * Spherical 3D coords (Three.js / react-globe.gl convention) + Catmull-Rom smoothing.
 * Points sit at R + ε so routes render slightly above the globe surface.
 */
const DEG2RAD = Math.PI / 180;

/** Normalized globe radius — MapLibre uses lat/lng; ε is relative altitude bump. */
export const GLOBE_RADIUS = 1;
export const SURFACE_EPSILON = 0.012;

export type Vec3 = { x: number; y: number; z: number };

/** φ = (90−lat)·π/180, θ = (lng+180)·π/180 — matches Three.js globe convention. */
export function latLngToVec3(
  lat: number,
  lng: number,
  radius = GLOBE_RADIUS + SURFACE_EPSILON,
): Vec3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function vec3ToLatLng(x: number, y: number, z: number): { lat: number; lng: number } {
  const r = Math.hypot(x, y, z) || 1;
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, y / r))) / DEG2RAD;
  let lng = Math.atan2(z, -x) / DEG2RAD - 180;
  if (lng > 180) lng -= 360;
  if (lng <= -180) lng += 360;
  return { lat, lng };
}

function reprojectToSphere(v: Vec3, radius = GLOBE_RADIUS + SURFACE_EPSILON): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  const s = radius / len;
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/** Centripetal Catmull-Rom segment between p1 and p2 (t ∈ [0,1]). */
function catmullRom3D(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z:
      0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

/**
 * Smooth a maritime waypoint chain with 3D Catmull-Rom (tension ≈ 0.5),
 * re-projecting each sample back onto the sphere at R + ε.
 */
export function smoothMaritimePath(
  waypoints: { lat: number; lng: number }[],
  samplesPerSegment = 12,
): { lat: number; lng: number }[] {
  if (waypoints.length < 2) return [...waypoints];
  if (waypoints.length === 2) {
    const a = waypoints[0]!;
    const b = waypoints[1]!;
    const out: { lat: number; lng: number }[] = [];
    for (let i = 0; i <= samplesPerSegment; i += 1) {
      const t = i / samplesPerSegment;
      const va = latLngToVec3(a.lat, a.lng);
      const vb = latLngToVec3(b.lat, b.lng);
      const dot = Math.max(-1, Math.min(1, va.x * vb.x + va.y * vb.y + va.z * vb.z));
      const omega = Math.acos(dot);
      if (omega < 1e-6) {
        out.push({ lat: a.lat, lng: a.lng });
        continue;
      }
      const sinOmega = Math.sin(omega);
      const s0 = Math.sin((1 - t) * omega) / sinOmega;
      const s1 = Math.sin(t * omega) / sinOmega;
      const x = s0 * va.x + s1 * vb.x;
      const y = s0 * va.y + s1 * vb.y;
      const z = s0 * va.z + s1 * vb.z;
      out.push(vec3ToLatLng(x, y, z));
    }
    return out;
  }

  const pts3d = waypoints.map((w) => latLngToVec3(w.lat, w.lng));
  const extended = [pts3d[0]!, pts3d[0]!, ...pts3d, pts3d[pts3d.length - 1]!, pts3d[pts3d.length - 1]!];
  const out: { lat: number; lng: number }[] = [];

  for (let i = 1; i < pts3d.length; i += 1) {
    const p0 = extended[i - 1]!;
    const p1 = extended[i]!;
    const p2 = extended[i + 1]!;
    const p3 = extended[i + 2]!;
    const start = i === 1 ? 0 : 1;
    for (let s = start; s < samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const raw = catmullRom3D(p0, p1, p2, p3, t);
      const onSphere = reprojectToSphere(raw);
      out.push(vec3ToLatLng(onSphere.x, onSphere.y, onSphere.z));
    }
  }
  const last = reprojectToSphere(pts3d[pts3d.length - 1]!);
  out.push(vec3ToLatLng(last.x, last.y, last.z));
  return out;
}

export function maritimePathFromNodePath(
  nodes: Record<string, { lat: number; lng: number } | undefined>,
  nodePath: string[],
  samplesPerSegment = 12,
): { lat: number; lng: number }[] {
  const waypoints = nodePath
    .map((id) => nodes[id])
    .filter((n): n is { lat: number; lng: number } => Boolean(n))
    .map((n) => ({ lat: n.lat, lng: n.lng }));
  return smoothMaritimePath(waypoints, samplesPerSegment);
}
