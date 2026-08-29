/**
 * NATO 동부 접경 지오펜스 — 보호국 PIP + UAV/recon 명확 월경 판정.
 *
 * 보호국: PL, LT, LV, EE, HU, RO, MD, FI
 * 우크라·벨라루스·러시아 내부 궤적은 보호국 진입이 아니면 발화하지 않음.
 */

import type { NeptunConfidence, NeptunLiveThreat, NeptunThreat } from "@/lib/neptun";
import { isInNatoPerimeterWatchBox } from "@/lib/neptun";

export const NATO_PERIMETER_PROTECTED_ISO3 = [
  "POL",
  "LTU",
  "LVA",
  "EST",
  "HUN",
  "ROU",
  "MDA",
  "FIN",
] as const;

export type NatoPerimeterIso3 = (typeof NATO_PERIMETER_PROTECTED_ISO3)[number];

export const NATO_PERIMETER_ISO3_SET = new Set<string>(NATO_PERIMETER_PROTECTED_ISO3);

export const NATO_PERIMETER_COUNTRY_META: Record<
  NatoPerimeterIso3,
  { iso2: string; nameKo: string; nameEn: string }
> = {
  POL: { iso2: "PL", nameKo: "폴란드", nameEn: "Poland" },
  LTU: { iso2: "LT", nameKo: "리투아니아", nameEn: "Lithuania" },
  LVA: { iso2: "LV", nameKo: "라트비아", nameEn: "Latvia" },
  EST: { iso2: "EE", nameKo: "에스토니아", nameEn: "Estonia" },
  HUN: { iso2: "HU", nameKo: "헝가리", nameEn: "Hungary" },
  ROU: { iso2: "RO", nameKo: "루마니아", nameEn: "Romania" },
  MDA: { iso2: "MD", nameKo: "몰도바", nameEn: "Moldova" },
  FIN: { iso2: "FI", nameKo: "핀란드", nameEn: "Finland" },
};

export type PerimeterRing = number[][]; // [lng, lat][]

export type PerimeterCountryPoly = {
  isoA3: NatoPerimeterIso3;
  name: string;
  rings: PerimeterRing[];
};

export type NatoPerimeterCrossEvent = {
  threatId: string;
  threatType: "uav" | "recon";
  isoA3: NatoPerimeterIso3;
  iso2: string;
  countryNameKo: string;
  countryNameEn: string;
  lat: number;
  lon: number;
  crossedAt: string;
  confidenceLevel: NeptunConfidence;
  sourceCount: number;
};

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

/** ray-casting — ring은 [lng, lat], 닫힌 링 가정 */
export function pointInRing(lng: number, lat: number, ring: PerimeterRing): boolean {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function collectRings(geometry: GeoJsonGeometry | null | undefined): PerimeterRing[] {
  if (!geometry?.coordinates) return [];
  const rings: PerimeterRing[] = [];
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    for (const ring of coords) {
      if (Array.isArray(ring) && ring.length >= 3) rings.push(ring as PerimeterRing);
    }
  } else if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as number[][][][];
    for (const poly of polys) {
      for (const ring of poly) {
        if (Array.isArray(ring) && ring.length >= 3) rings.push(ring as PerimeterRing);
      }
    }
  }
  return rings;
}

export function parsePerimeterCountriesGeoJson(raw: unknown): PerimeterCountryPoly[] {
  const features = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { features?: unknown }).features)
      ? (raw as { features: unknown[] }).features
      : [];

  const out: PerimeterCountryPoly[] = [];
  for (const feat of features) {
    if (!feat || typeof feat !== "object") continue;
    const props =
      (feat as { properties?: Record<string, unknown> }).properties ??
      (feat as Record<string, unknown>);
    const isoRaw = String(props.isoA3 ?? props.ISO_A3 ?? "").toUpperCase();
    if (!NATO_PERIMETER_ISO3_SET.has(isoRaw)) continue;
    const isoA3 = isoRaw as NatoPerimeterIso3;
    const geometry =
      ((feat as { geometry?: GeoJsonGeometry }).geometry as GeoJsonGeometry | undefined) ??
      undefined;
    const rings = collectRings(geometry);
    if (rings.length === 0) continue;
    out.push({
      isoA3,
      name: String(props.name ?? NATO_PERIMETER_COUNTRY_META[isoA3].nameEn),
      rings,
    });
  }
  return out;
}

export function findProtectedCountryAt(
  lng: number,
  lat: number,
  countries: PerimeterCountryPoly[],
): NatoPerimeterIso3 | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  for (const c of countries) {
    for (const ring of c.rings) {
      if (pointInRing(lng, lat, ring)) return c.isoA3;
    }
  }
  return null;
}

export function isClearPerimeterConfidence(
  confidenceLevel: NeptunConfidence,
  sourceCount: number,
): boolean {
  return confidenceLevel === "high" || sourceCount >= 2;
}

export function isPerimeterDroneType(
  type: string,
): type is "uav" | "recon" {
  return type === "uav" || type === "recon";
}

function samplePoints(threat: NeptunThreat | NeptunLiveThreat): Array<{ lat: number; lon: number }> {
  const pts: Array<{ lat: number; lon: number }> = [];
  const trail = threat.trail;
  if (Array.isArray(trail)) {
    for (const p of trail) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
        pts.push({ lat: p.lat, lon: p.lon });
      }
    }
  }
  const live = threat as NeptunLiveThreat;
  const lat = Number.isFinite(live.predictedLat) ? live.predictedLat : threat.lat;
  const lon = Number.isFinite(live.predictedLon) ? live.predictedLon : threat.lon;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const last = pts[pts.length - 1];
    if (!last || last.lat !== lat || last.lon !== lon) {
      pts.push({ lat, lon });
    }
  }
  return pts;
}

/**
 * outside(보호국 밖) → inside(보호국) 전환이 있으면 월경 이벤트.
 * 핀란드 등 ops box 밖 좌표도 감시 박스 안이면 허용.
 */
export function detectNatoPerimeterCross(
  threat: NeptunThreat | NeptunLiveThreat,
  countries: PerimeterCountryPoly[],
  prevInsideIso: NatoPerimeterIso3 | null | undefined,
): NatoPerimeterCrossEvent | null {
  if (!isPerimeterDroneType(threat.type)) return null;
  if (!isClearPerimeterConfidence(threat.confidenceLevel, threat.sourceCount)) {
    return null;
  }

  const pts = samplePoints(threat);
  if (pts.length === 0) return null;

  const last = pts[pts.length - 1]!;
  if (!isInNatoPerimeterWatchBox(last.lat, last.lon) && !isInNatoPerimeterWatchBox(threat.lat, threat.lon)) {
    // 감시 박스 완전 밖이면 스킵 (단, 마지막 점이 보호국이면 허용)
    const insideEarly = findProtectedCountryAt(last.lon, last.lat, countries);
    if (!insideEarly) return null;
  }

  let prevIso: NatoPerimeterIso3 | null =
    prevInsideIso === undefined ? null : prevInsideIso;
  if (prevInsideIso === undefined && pts.length >= 2) {
    const prior = pts[pts.length - 2]!;
    prevIso = findProtectedCountryAt(prior.lon, prior.lat, countries);
  }

  const nowIso = findProtectedCountryAt(last.lon, last.lat, countries);
  if (!nowIso) return null;
  if (prevIso === nowIso) return null;
  if (prevIso != null) return null; // 보호국→보호국은 신규 월경 아님 (이미 안)

  const meta = NATO_PERIMETER_COUNTRY_META[nowIso];
  return {
    threatId: threat.id,
    threatType: threat.type,
    isoA3: nowIso,
    iso2: meta.iso2,
    countryNameKo: meta.nameKo,
    countryNameEn: meta.nameEn,
    lat: last.lat,
    lon: last.lon,
    crossedAt: new Date().toISOString(),
    confidenceLevel: threat.confidenceLevel,
    sourceCount: threat.sourceCount,
  };
}

/** 테스트·훅용 — 이전/현재 좌표만으로 월경 판정 */
export function detectCrossFromPositions(
  prev: { lat: number; lon: number } | null,
  next: { lat: number; lon: number },
  countries: PerimeterCountryPoly[],
  opts: {
    type: string;
    confidenceLevel: NeptunConfidence;
    sourceCount: number;
    threatId?: string;
  },
): NatoPerimeterCrossEvent | null {
  if (!isPerimeterDroneType(opts.type)) return null;
  if (!isClearPerimeterConfidence(opts.confidenceLevel, opts.sourceCount)) {
    return null;
  }
  const prevIso = prev ? findProtectedCountryAt(prev.lon, prev.lat, countries) : null;
  const nowIso = findProtectedCountryAt(next.lon, next.lat, countries);
  if (!nowIso || prevIso != null) return null;
  const meta = NATO_PERIMETER_COUNTRY_META[nowIso];
  return {
    threatId: opts.threatId ?? "test",
    threatType: opts.type,
    isoA3: nowIso,
    iso2: meta.iso2,
    countryNameKo: meta.nameKo,
    countryNameEn: meta.nameEn,
    lat: next.lat,
    lon: next.lon,
    crossedAt: new Date().toISOString(),
    confidenceLevel: opts.confidenceLevel,
    sourceCount: opts.sourceCount,
  };
}

export const NATO_PERIMETER_GEOJSON_URL =
  "/data/lite/nato-eastern-perimeter-countries.json";
