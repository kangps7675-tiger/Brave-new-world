/**
 * Safecast radiation readings near priority nuclear sites.
 * Upstream: api.safecast.org (open data, no key).
 */

export const SAFECAST_ATTRIBUTION = "Radiation: Safecast (api.safecast.org)";

/** Priority nuclear / research sites — subset of our nuclear-sites atlas */
export const SAFECAST_PRIORITY_SITES = [
  { id: "zaporizhzhia", name: "Zaporizhzhia", lat: 47.51, lng: 34.59 },
  { id: "fukushima", name: "Fukushima Daiichi", lat: 37.42, lng: 141.03 },
  { id: "yongbyon", name: "Yongbyon", lat: 39.8, lng: 125.75 },
  { id: "dimona", name: "Dimona", lat: 31.0, lng: 35.14 },
  { id: "chernobyl", name: "Chernobyl", lat: 51.39, lng: 30.1 },
  { id: "kori", name: "Kori/Shin Kori", lat: 35.32, lng: 129.28 },
  { id: "sellafield", name: "Sellafield", lat: 54.42, lng: -3.5 },
] as const;

export type SafecastLevel = "normal" | "elevated" | "high" | "extreme" | "unknown";

export type SafecastSiteReading = {
  siteId: string;
  siteName: string;
  lat: number;
  lng: number;
  /** µSv/h (converted when source is CPM) */
  usvPerH: number | null;
  rawValue: number | null;
  unit: string | null;
  capturedAt: string | null;
  level: SafecastLevel;
  distanceKm: number | null;
};

export type SafecastSnapshot = {
  fetchedAt: string;
  readings: SafecastSiteReading[];
  attribution: string;
};

type SafecastMeasurement = {
  value?: number;
  unit?: string;
  latitude?: number;
  longitude?: number;
  captured_at?: string;
  converted_values?: Array<{ unit?: string; value?: number }>;
};

/** Rough CPM → µSv/h for common Safecast tubes (lnd-7317 ≈ /334). */
export function cpmToUsv(cpm: number): number {
  return cpm / 334;
}

export function toUsvPerH(value: number, unit: string | null | undefined): number | null {
  if (!Number.isFinite(value)) return null;
  const u = (unit || "").toLowerCase();
  if (u.includes("usv") || u.includes("µsv") || u.includes("μsv")) return value;
  if (u.includes("cpm") || u.includes("count")) return cpmToUsv(value);
  // Unknown unit — treat as µSv/h if small, else CPM-ish
  if (value < 50) return value;
  return cpmToUsv(value);
}

export function usvLevel(usv: number | null): SafecastLevel {
  if (usv == null) return "unknown";
  if (usv >= 10) return "extreme";
  if (usv >= 1) return "high";
  if (usv >= 0.3) return "elevated";
  return "normal";
}

export function safecastLevelColor(level: SafecastLevel): string {
  switch (level) {
    case "extreme":
      return "#f43f5e";
    case "high":
      return "#fb923c";
    case "elevated":
      return "#facc15";
    case "normal":
      return "#34d399";
    default:
      return "#64748b";
  }
}

export function safecastLevelLabel(level: SafecastLevel, ko: boolean): string {
  if (ko) {
    switch (level) {
      case "extreme":
        return "극심";
      case "high":
        return "높음";
      case "elevated":
        return "상승";
      case "normal":
        return "정상";
      default:
        return "미확인";
    }
  }
  switch (level) {
    case "extreme":
      return "Extreme";
    case "high":
      return "High";
    case "elevated":
      return "Elevated";
    case "normal":
      return "Normal";
    default:
      return "Unknown";
  }
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pickNearestMeasurement(
  site: { lat: number; lng: number },
  rows: SafecastMeasurement[],
): { row: SafecastMeasurement; distanceKm: number } | null {
  let best: { row: SafecastMeasurement; distanceKm: number } | null = null;
  for (const row of rows) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const distanceKm = haversineKm(site.lat, site.lng, lat, lng);
    if (!best || distanceKm < best.distanceKm) best = { row, distanceKm };
  }
  return best;
}

export function readingFromMeasurement(
  site: (typeof SAFECAST_PRIORITY_SITES)[number],
  hit: { row: SafecastMeasurement; distanceKm: number } | null,
): SafecastSiteReading {
  if (!hit) {
    return {
      siteId: site.id,
      siteName: site.name,
      lat: site.lat,
      lng: site.lng,
      usvPerH: null,
      rawValue: null,
      unit: null,
      capturedAt: null,
      level: "unknown",
      distanceKm: null,
    };
  }
  const { row, distanceKm } = hit;
  const converted = row.converted_values?.find((c) =>
    String(c.unit || "").toLowerCase().includes("usv"),
  );
  const rawValue = typeof row.value === "number" ? row.value : null;
  const usvPerH =
    typeof converted?.value === "number"
      ? converted.value
      : rawValue != null
        ? toUsvPerH(rawValue, row.unit)
        : null;
  return {
    siteId: site.id,
    siteName: site.name,
    lat: site.lat,
    lng: site.lng,
    usvPerH: usvPerH != null ? Math.round(usvPerH * 1000) / 1000 : null,
    rawValue,
    unit: row.unit ?? null,
    capturedAt: row.captured_at ?? null,
    level: usvLevel(usvPerH),
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}

export function parseSafecastMeasurements(json: unknown): SafecastMeasurement[] {
  if (!Array.isArray(json)) return [];
  return json as SafecastMeasurement[];
}
