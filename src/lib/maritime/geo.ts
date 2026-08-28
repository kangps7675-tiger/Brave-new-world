const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dPhi = (lat2 - lat1) * DEG2RAD;
  const dLambda = (lng2 - lng1) * DEG2RAD;
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toCart(lat: number, lng: number) {
  const phi = lat * DEG2RAD;
  const lambda = lng * DEG2RAD;
  const cosPhi = Math.cos(phi);
  return { x: cosPhi * Math.cos(lambda), y: cosPhi * Math.sin(lambda), z: Math.sin(phi) };
}

function fromCart(x: number, y: number, z: number) {
  const hyp = Math.hypot(x, y);
  return { lat: Math.atan2(z, hyp) / DEG2RAD, lng: Math.atan2(y, x) / DEG2RAD };
}

/** Spherical interpolation between two surface points (great-circle). */
export function arcSegmentLatLng(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  segments: number,
): { lat: number; lng: number }[] {
  const a = toCart(lat1, lng1);
  const b = toCart(lat2, lng2);
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return [{ lat: lat1, lng: lng1 }];
  const sinOmega = Math.sin(omega);
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i < segments; i += 1) {
    const t = i / segments;
    const s0 = Math.sin((1 - t) * omega) / sinOmega;
    const s1 = Math.sin(t * omega) / sinOmega;
    const x = s0 * a.x + s1 * b.x;
    const y = s0 * a.y + s1 * b.y;
    const z = s0 * a.z + s1 * b.z;
    points.push(fromCart(x, y, z));
  }
  return points;
}

export function nodePathToLatLngs(
  nodes: Record<string, { lat: number; lng: number }>,
  nodePath: string[],
  segmentsPerLeg = 10,
): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  for (let i = 0; i < nodePath.length - 1; i += 1) {
    const a = nodes[nodePath[i]!];
    const b = nodes[nodePath[i + 1]!];
    if (!a || !b) continue;
    const seg = arcSegmentLatLng(a.lat, a.lng, b.lat, b.lng, segmentsPerLeg);
    if (i > 0 && seg.length) seg.shift();
    out.push(...seg);
  }
  const last = nodes[nodePath[nodePath.length - 1]!];
  if (last) out.push({ lat: last.lat, lng: last.lng });
  return out;
}
