import { gunzipSync } from "zlib";
import {
  BELLINGCAT_ADSB_ATTRIBUTION,
  isBellingcatMilitaryHex,
} from "@/data/bellingcatMilitaryDb";
import type { MilitaryAircraft } from "@/data/geoTypes";

export { BELLINGCAT_ADSB_ATTRIBUTION };

/** ADS-B 트래킹 기체 (군용·민간 공통 스키마) */
export type TrackedAircraft = MilitaryAircraft;

export type AdsbRawAircraft = {
  hex?: string;
  flight?: string;
  r?: string;
  type?: string;
  t?: string;
  category?: string;
  lat?: number;
  lon?: number;
  rr_lat?: number;
  rr_lon?: number;
  gpsOkLat?: number;
  gpsOkLon?: number;
  lastPosition?: { lat?: number; lon?: number };
  alt_baro?: number | string | null;
  alt_geom?: number | null;
  gs?: number;
  ias?: number;
  tas?: number;
  mach?: number;
  track?: number;
  track_rate?: number;
  roll?: number;
  mag_heading?: number;
  true_heading?: number;
  baro_rate?: number;
  geom_rate?: number;
  squawk?: string;
  emergency?: string;
  dbFlags?: number | string;
  wd?: number;
  ws?: number;
  nav_altitude_mcp?: number;
  nav_heading?: number;
  nav_modes?: string[];
  seen?: number;
  seen_pos?: number;
  rssi?: number;
  acas_ra?: {
    advisory?: string;
    advisory_complement?: string;
  };
};

export function getAdsbApiKey(): string | null {
  const key = (
    process.env.ADSBEXCHANGE_API_KEY ||
    process.env.ADSB_API_KEY ||
    process.env.ADSBX_API_KEY ||
    ""
  ).trim();
  return key || null;
}

export function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseAlt(value: unknown) {
  if (typeof value === "string" && value.toLowerCase() === "ground") return 0;
  return numOrNull(value);
}

export function pickCoord(raw: AdsbRawAircraft): { lat: number; lng: number } | null {
  const candidates: Array<[unknown, unknown]> = [
    [raw.lat, raw.lon],
    [raw.lastPosition?.lat, raw.lastPosition?.lon],
    [raw.rr_lat, raw.rr_lon],
    [raw.gpsOkLat, raw.gpsOkLon],
  ];
  for (const [la, lo] of candidates) {
    const lat = Number(la);
    const lng = Number(lo);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

/** dbFlags bit0 = military */
export function isMilitaryDbFlags(raw: AdsbRawAircraft): boolean {
  if (raw.dbFlags == null || raw.dbFlags === "") return false;
  const flags = Number(raw.dbFlags);
  if (!Number.isFinite(flags)) return false;
  return (flags & 1) === 1;
}

export function extractAircraftList(payload: {
  ac?: AdsbRawAircraft[];
  aircraft?: AdsbRawAircraft[];
}): AdsbRawAircraft[] {
  if (Array.isArray(payload.aircraft)) return payload.aircraft;
  if (Array.isArray(payload.ac)) return payload.ac;
  return [];
}

export async function readAdsbJsonBody(response: Response): Promise<unknown> {
  const buf = Buffer.from(await response.arrayBuffer());
  const encoding = (response.headers.get("content-encoding") || "").toLowerCase();
  const looksGzip =
    encoding.includes("gzip") || (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b);
  const text = looksGzip ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
  return JSON.parse(text) as unknown;
}

export function normalizeAdsbAircraft(
  raw: AdsbRawAircraft,
  options?: { requireMilitary?: boolean; excludeMilitary?: boolean },
): TrackedAircraft | null {
  const hex = (raw.hex || "").toLowerCase();
  const flaggedMil = isMilitaryDbFlags(raw);
  const knownMil = isBellingcatMilitaryHex(hex);
  const military = flaggedMil || knownMil;

  // /mil 피드: dbFlags 없으면 통과. dbFlags=민항이어도 Bellingcat mil hex면 유지.
  if (options?.requireMilitary) {
    if (raw.dbFlags != null && raw.dbFlags !== "" && !military) return null;
  }
  if (options?.excludeMilitary && military) return null;

  const coord = pickCoord(raw);
  if (!hex || !coord) return null;

  const callsign = raw.flight?.trim() || null;
  const acas =
    raw.acas_ra?.advisory?.trim() ||
    raw.acas_ra?.advisory_complement?.trim() ||
    null;

  return {
    id: hex,
    hex,
    callsign,
    registration: raw.r?.trim() || null,
    lat: coord.lat,
    lng: coord.lng,
    altitude: parseAlt(raw.alt_baro),
    altitudeGeom: parseAlt(raw.alt_geom),
    groundSpeed: numOrNull(raw.gs),
    indicatedAirspeed: numOrNull(raw.ias),
    trueAirspeed: numOrNull(raw.tas),
    mach: numOrNull(raw.mach),
    track: numOrNull(raw.track),
    trackRate: numOrNull(raw.track_rate),
    roll: numOrNull(raw.roll),
    magHeading: numOrNull(raw.mag_heading),
    trueHeading: numOrNull(raw.true_heading),
    baroRate: numOrNull(raw.baro_rate),
    geomRate: numOrNull(raw.geom_rate),
    squawk: raw.squawk || null,
    emergency: raw.emergency && raw.emergency !== "none" ? raw.emergency : null,
    type: raw.t || raw.type || null,
    category: raw.category || null,
    dbFlags: numOrNull(raw.dbFlags),
    windDirection: numOrNull(raw.wd),
    windSpeed: numOrNull(raw.ws),
    navAltitudeMcp: numOrNull(raw.nav_altitude_mcp),
    navHeading: numOrNull(raw.nav_heading),
    navModes: Array.isArray(raw.nav_modes) ? raw.nav_modes.filter(Boolean) : null,
    seen: numOrNull(raw.seen),
    seenPos: numOrNull(raw.seen_pos),
    rssi: numOrNull(raw.rssi),
    acasAdvisory: acas,
    timestamp: new Date().toISOString(),
    bellingcatMilitary: knownMil || undefined,
  };
}

export function adsbAuthHeaders(apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "BraveNewWorld/1.0",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
    headers["api-auth"] = apiKey;
  }
  return headers;
}

/** 뷰포트 중심 기준 민간 항적 URL */
export function civilianTrafficUrl(lat: number, lng: number, distNm: number): {
  url: string;
  source: "adsbx" | "adsb.fi";
} {
  const dist = Math.min(1500, Math.max(25, Math.round(distNm)));
  const custom = process.env.ADSBEXCHANGE_TRAFFIC_URL?.trim();
  if (custom) {
    return {
      url: custom
        .replace("{lat}", String(lat))
        .replace("{lng}", String(lng))
        .replace("{lon}", String(lng))
        .replace("{dist}", String(dist)),
      source: "adsbx",
    };
  }
  if (getAdsbApiKey()) {
    return {
      url: `https://gateway.adsbexchange.com/api/aircraft/v2/lat/${lat}/lon/${lng}/dist/${dist}`,
      source: "adsbx",
    };
  }
  return {
    url: `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lng}/dist/${dist}`,
    source: "adsb.fi",
  };
}
