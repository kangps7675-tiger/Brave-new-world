import {
  AXIS_NODES,
  AXIS_RELATION_COLORS,
  edgesForHub,
  type AxisEdge,
  type AxisHubId,
} from "@/data/axisNetwork";
import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function toCart(lat: number, lng: number) {
  const φ = lat * DEG2RAD;
  const λ = lng * DEG2RAD;
  const cosφ = Math.cos(φ);
  return {
    x: cosφ * Math.cos(λ),
    y: cosφ * Math.sin(λ),
    z: Math.sin(φ),
  };
}

function fromCart(x: number, y: number, z: number) {
  const hyp = Math.hypot(x, y);
  return {
    lat: Math.atan2(z, hyp) * RAD2DEG,
    lng: Math.atan2(y, x) * RAD2DEG,
  };
}

/** 대권 호 샘플 (고도를 살짝 올려 글로브에서 구분) */
export function greatCircleArc(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  segments = 28,
  peakAlt = 0.12,
): TransportPathPoint[] {
  const a = toCart(lat1, lng1);
  const b = toCart(lat2, lng2);
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return [
      { lat: lat1, lng: lng1, alt: 0 },
      { lat: lat2, lng: lng2, alt: 0 },
    ];
  }
  const sinOmega = Math.sin(omega);
  const points: TransportPathPoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const s0 = Math.sin((1 - t) * omega) / sinOmega;
    const s1 = Math.sin(t * omega) / sinOmega;
    const x = s0 * a.x + s1 * b.x;
    const y = s0 * a.y + s1 * b.y;
    const z = s0 * a.z + s1 * b.z;
    const { lat, lng } = fromCart(x, y, z);
    const alt = peakAlt * Math.sin(Math.PI * t);
    points.push({ lat, lng, alt });
  }
  return points;
}

function edgeLengthKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const Δφ = (lat2 - lat1) * DEG2RAD;
  const Δλ = (lng2 - lng1) * DEG2RAD;
  const h =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function axisEdgeToPath(edge: AxisEdge, lang: "ko" | "en" = "ko"): TransportPath | null {
  const na = AXIS_NODES[edge.a];
  const nb = AXIS_NODES[edge.b];
  if (!na || !nb) return null;
  const name = lang === "en" ? edge.labelEn : edge.labelKo;
  const points = greatCircleArc(na.lat, na.lng, nb.lat, nb.lng);
  return {
    id: edge.id,
    kind: "axis-link",
    name,
    scalerank: 1,
    lengthKm: edgeLengthKm(na.lat, na.lng, nb.lat, nb.lng),
    accentColor: AXIS_RELATION_COLORS[edge.kind],
    bbox: {
      minLat: Math.min(na.lat, nb.lat),
      minLng: Math.min(na.lng, nb.lng),
      maxLat: Math.max(na.lat, nb.lat),
      maxLng: Math.max(na.lng, nb.lng),
    },
    points,
    meta: {
      mode: "network",
      relationKind: edge.kind,
      from: edge.a,
      to: edge.b,
      fromName: lang === "en" ? na.nameEn : na.nameKo,
      toName: lang === "en" ? nb.nameEn : nb.nameKo,
    },
  };
}

export function axisNetworkToPaths(
  hub: AxisHubId | "all" = "all",
  lang: "ko" | "en" = "ko",
): TransportPath[] {
  const out: TransportPath[] = [];
  for (const edge of edgesForHub(hub)) {
    const path = axisEdgeToPath(edge, lang);
    if (path) out.push(path);
  }
  return out;
}
