/**
 * God's Eye View 스타일 — AIS/항공기 텔레메트리·추적·트레일 헬퍼.
 * 데이터 소스는 BNW(/api/ais, /api/adsb-*)를 유지하고, 표시 형식만 GEV에 맞춘다.
 */
import type { AisVessel, MilitaryAircraft, TransportPath } from "@/data/geoTypes";
import { aisDisplayTypeLabel } from "@/lib/aisVesselClass";

export const GEV_AWARENESS_RADIUS_M = 250_000;
export const GEV_TRAIL_MAX_POINTS = 400;
export const GEV_TRAIL_MIN_MOVE_M = 25;
/** 항공기 추적 트레일 (GEV cyan) */
export const GEV_AIR_TRAIL_COLOR = "rgba(0, 212, 255, 0.85)";
/** 선박 추적 트레일 (GEV teal) */
export const GEV_AIS_TRAIL_COLOR = "rgba(57, 255, 213, 0.85)";
/** 군용기 카드 accent */
export const GEV_MIL_ACCENT = "#ffd166";
export const GEV_CIV_ACCENT = "#39d0ff";

export type GevTrackKind = "ais" | "aircraft";

export type GevTrailPoint = { lat: number; lng: number; t: number };

export type GevHudLines = {
  kind: GevTrackKind;
  accent: string;
  lines: [string, string, string];
  stale: boolean;
};

export type GevContactRow = {
  id: string;
  kind: "ais" | "military" | "civil";
  label: string;
  detail: string;
  lat: number;
  lng: number;
  rangeKm: number;
  bearingDeg: number;
};

function trimHud(value: string | null | undefined, max: number): string {
  const text = String(value || "--").trim() || "--";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function finite(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function initialBearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = Math.PI / 180;
  const φ1 = aLat * toRad;
  const φ2 = bLat * toRad;
  const Δλ = (bLng - aLng) * toRad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** GEV: destination-point along course (WGS84 근사) */
export function deadReckonLatLng(
  lat: number,
  lng: number,
  speedKnots: number | null,
  courseDeg: number | null,
  dtSec: number,
): { lat: number; lng: number } {
  const sog = finite(speedKnots);
  const course = finite(courseDeg);
  if (sog == null || sog <= 0 || course == null || dtSec <= 0) {
    return { lat, lng };
  }
  const distM = sog * 0.514444 * dtSec;
  const R = 6_371_000;
  const δ = distM / R;
  const θ = (course * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * sinδ * cosφ1, cosδ - sinφ1 * sinφ2);
  return {
    lat: (φ2 * 180) / Math.PI,
    lng: ((((λ2 * 180) / Math.PI) + 540) % 360) - 180,
  };
}

/** GEV aircraft HUD: `CS · FL###|ft · ### kts [· STALE]` */
export function formatAircraftHud(
  ac: MilitaryAircraft,
  options?: { traffic?: "military" | "civil"; stale?: boolean },
): GevHudLines {
  const cs = trimHud(ac.callsign || ac.registration || ac.hex.toUpperCase(), 16);
  const altFt = finite(ac.altitude);
  const fl =
    altFt == null
      ? "--"
      : altFt >= 18_000
        ? `FL${Math.round(altFt / 100)}`
        : `${Math.round(altFt)} ft`;
  const kts = finite(ac.groundSpeed);
  const spd = kts == null ? "-- kts" : `${Math.round(kts)} kts`;
  const stale = Boolean(options?.stale);
  const line1 = [cs, fl, spd, stale ? "STALE" : null].filter(Boolean).join(" · ");
  const typeBit = [ac.type, ac.category].filter(Boolean).join(" · ") || "ADS-B";
  const line2 =
    options?.traffic === "civil"
      ? `CIV  ${typeBit}`
      : `MIL  ${typeBit}${ac.bellingcatMilitary ? " · Bellingcat" : ""}`;
  const hdg = finite(ac.track) ?? finite(ac.trueHeading);
  const line3 = [
    `ICAO ${ac.hex.toUpperCase()}`,
    hdg != null ? `TRK ${Math.round(hdg)}°` : null,
    ac.squawk ? `SQ ${ac.squawk}` : null,
  ]
    .filter(Boolean)
    .join("  ");
  return {
    kind: "aircraft",
    accent: options?.traffic === "civil" ? GEV_CIV_ACCENT : GEV_MIL_ACCENT,
    lines: [line1, line2, line3],
    stale,
  };
}

/** GEV AIS HUD: name / type SPD HDG / MMSI · time */
export function formatAisHud(
  vessel: AisVessel,
  options?: { lang?: "ko" | "en"; stale?: boolean },
): GevHudLines {
  const lang = options?.lang ?? "ko";
  const name = trimHud(vessel.shipName || `MMSI ${vessel.mmsi}`, 32);
  const type =
    aisDisplayTypeLabel(vessel, lang) ||
    vessel.shipTypeLabel ||
    (vessel.shipType != null ? String(vessel.shipType) : "VESSEL");
  const sog = finite(vessel.speedOverGround);
  const hdg = finite(vessel.trueHeading) ?? finite(vessel.courseOverGround);
  const line2 = [
    trimHud(type, 24),
    `SPD: ${sog == null ? "--" : sog.toFixed(1)}`,
    `HDG: ${hdg == null ? "--" : `${Math.round(hdg)}°`}`,
  ].join("  ");
  const stale = Boolean(options?.stale);
  const timeBit = vessel.timestamp
    ? vessel.timestamp.slice(11, 19) || vessel.timestamp.slice(0, 19)
    : "--";
  const line3 = [`MMSI: ${vessel.mmsi}`, timeBit, stale ? "· STALE" : null]
    .filter(Boolean)
    .join("  ");
  return {
    kind: "ais",
    accent: GEV_AIS_TRAIL_COLOR,
    lines: [`AIS: ${name}`, line2, line3],
    stale,
  };
}

export function appendTrailPoint(
  trail: GevTrailPoint[],
  lat: number,
  lng: number,
  now = Date.now(),
  minMoveM = GEV_TRAIL_MIN_MOVE_M,
  maxPoints = GEV_TRAIL_MAX_POINTS,
): GevTrailPoint[] {
  const last = trail[trail.length - 1];
  if (last && haversineM(last.lat, last.lng, lat, lng) < minMoveM) {
    return trail;
  }
  const next = [...trail, { lat, lng, t: now }];
  return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
}

export function trailToTransportPath(
  trail: GevTrailPoint[],
  options: { id: string; name: string; accentColor: string },
): TransportPath | null {
  if (trail.length < 2) return null;
  let minLat = trail[0]!.lat;
  let maxLat = trail[0]!.lat;
  let minLng = trail[0]!.lng;
  let maxLng = trail[0]!.lng;
  const points = trail.map((p) => {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    return { lat: p.lat, lng: p.lng, alt: 0.0004 };
  });
  return {
    id: options.id,
    kind: "gev-track-trail",
    name: options.name,
    scalerank: 1,
    lengthKm: null,
    accentColor: options.accentColor,
    bbox: { minLat, minLng, maxLat, maxLng },
    points,
    meta: { source: "gev-live-track" },
  };
}

export function findNearbyContacts(options: {
  centerLat: number;
  centerLng: number;
  excludeId: string;
  ais: AisVessel[];
  military: MilitaryAircraft[];
  civil: MilitaryAircraft[];
  radiusM?: number;
  limit?: number;
}): GevContactRow[] {
  const radius = options.radiusM ?? GEV_AWARENESS_RADIUS_M;
  const limit = options.limit ?? 24;
  const rows: GevContactRow[] = [];

  for (const v of options.ais) {
    if (v.id === options.excludeId || v.mmsi === options.excludeId) continue;
    const rangeM = haversineM(options.centerLat, options.centerLng, v.lat, v.lng);
    if (rangeM > radius) continue;
    const sog = finite(v.speedOverGround);
    rows.push({
      id: `ais:${v.mmsi}`,
      kind: "ais",
      label: v.shipName || `MMSI ${v.mmsi}`,
      detail: [
        aisDisplayTypeLabel(v, "en") || v.shipTypeLabel || "VESSEL",
        sog != null ? `${sog.toFixed(0)} kn` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      lat: v.lat,
      lng: v.lng,
      rangeKm: rangeM / 1000,
      bearingDeg: initialBearingDeg(options.centerLat, options.centerLng, v.lat, v.lng),
    });
  }

  const pushAc = (ac: MilitaryAircraft, kind: "military" | "civil") => {
    if (ac.id === options.excludeId || ac.hex === options.excludeId) return;
    const rangeM = haversineM(options.centerLat, options.centerLng, ac.lat, ac.lng);
    if (rangeM > radius) return;
    const kts = finite(ac.groundSpeed);
    const alt = finite(ac.altitude);
    rows.push({
      id: `${kind}:${ac.hex}`,
      kind,
      label: ac.callsign || ac.hex.toUpperCase(),
      detail: [
        kind === "civil" ? "CIV" : "MIL",
        ac.type || null,
        alt != null ? `${Math.round(alt)} ft` : null,
        kts != null ? `${Math.round(kts)} kn` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      lat: ac.lat,
      lng: ac.lng,
      rangeKm: rangeM / 1000,
      bearingDeg: initialBearingDeg(options.centerLat, options.centerLng, ac.lat, ac.lng),
    });
  };

  for (const ac of options.military) pushAc(ac, "military");
  for (const ac of options.civil) pushAc(ac, "civil");

  rows.sort((a, b) => a.rangeKm - b.rangeKm);
  return rows.slice(0, limit);
}

export function syncAisSelection(
  current: AisVessel,
  vessels: AisVessel[],
): { item: AisVessel; stale: boolean } {
  const found = vessels.find((v) => v.mmsi === current.mmsi || v.id === current.id);
  return found ? { item: found, stale: false } : { item: current, stale: true };
}

export function syncAircraftSelection(
  current: MilitaryAircraft,
  military: MilitaryAircraft[],
  civil: MilitaryAircraft[],
): { item: MilitaryAircraft; traffic: "military" | "civil"; stale: boolean } {
  const mil = military.find((a) => a.hex === current.hex || a.id === current.id);
  if (mil) return { item: mil, traffic: "military", stale: false };
  const civ = civil.find((a) => a.hex === current.hex || a.id === current.id);
  if (civ) return { item: civ, traffic: "civil", stale: false };
  return { item: current, traffic: "military", stale: true };
}
