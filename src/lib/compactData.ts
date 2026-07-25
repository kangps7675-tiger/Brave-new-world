import type { SearchPlace, StaticPoint, TransportPath } from "@/data/geoTypes";

const PLACE_TYPE: Record<string, SearchPlace["type"]> = {
  c: "city",
  t: "town",
  v: "village",
  C: "country",
  d: "dispute",
};

type CompactTransport = {
  i: string;
  k?: TransportPath["kind"];
  s?: number;
  n?: string | null;
  b: [number, number, number, number];
  p: [number, number][];
  m?: Record<string, string | number | null>;
};

type CompactPlace = {
  id: string;
  n: string;
  k?: string;
  c: string;
  la: number;
  ln: number;
  t: string;
  p?: number;
  s?: number;
  z?: number;
  a?: string;
};

function isLegacyTransport(raw: unknown): raw is TransportPath {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "points" in raw &&
    Array.isArray((raw as TransportPath).points)
  );
}

export function expandTransportPath(raw: CompactTransport | TransportPath): TransportPath {
  if (isLegacyTransport(raw)) return raw;

  const [minLat, minLng, maxLat, maxLng] = raw.b;
  return {
    id: raw.i,
    kind: raw.k || "coastline",
    name: raw.n ?? null,
    scalerank: raw.s ?? 0,
    lengthKm: null,
    bbox: { minLat, minLng, maxLat, maxLng },
    points: raw.p.map(([lng, lat]) => ({ lng, lat })),
    ...(raw.m && Object.keys(raw.m).length > 0 ? { meta: raw.m } : {}),
  };
}

export function expandTransportPaths(raw: Array<CompactTransport | TransportPath>): TransportPath[] {
  return raw.map(expandTransportPath);
}

function isLegacyPlace(raw: unknown): raw is SearchPlace {
  return typeof raw === "object" && raw !== null && "country" in raw;
}

export function expandPlace(raw: CompactPlace | SearchPlace): SearchPlace {
  if (isLegacyPlace(raw)) return raw;

  return {
    id: raw.id,
    name: raw.n,
    nameKo: raw.k ?? null,
    country: raw.c,
    lat: raw.la,
    lng: raw.ln,
    type: PLACE_TYPE[raw.t] || "town",
    population: raw.p ?? null,
    scalerank: raw.s,
    minZoom: raw.z ?? null,
    adm1: raw.a ?? null,
  };
}

export function expandPlaces(raw: Array<CompactPlace | SearchPlace>): SearchPlace[] {
  return raw.map(expandPlace);
}

type CompactStaticPoint = {
  i: string;
  k: StaticPoint["kind"];
  n: string;
  la: number;
  ln: number;
  s?: number;
  m?: Record<string, string | number | null>;
};

function isLegacyStaticPoint(raw: unknown): raw is StaticPoint {
  return typeof raw === "object" && raw !== null && "lat" in raw && "lng" in raw;
}

export function expandStaticPoint(raw: CompactStaticPoint | StaticPoint): StaticPoint {
  if (isLegacyStaticPoint(raw)) return raw;
  return {
    id: raw.i,
    kind: raw.k,
    name: raw.n,
    lat: raw.la,
    lng: raw.ln,
    tier: raw.s,
    meta: raw.m,
  };
}

export function expandStaticPoints(raw: Array<CompactStaticPoint | StaticPoint>): StaticPoint[] {
  return raw.map(expandStaticPoint);
}
