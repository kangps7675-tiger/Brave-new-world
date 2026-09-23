import type { MilitaryAircraft } from "@/data/geoTypes";

export const OPENSKY_STATES_URL = "https://opensky-network.org/api/states/all";
export const OPENSKY_BBOX_SPAN_DEG = 5;

export type OpenSkyBbox = { lamin: number; lomin: number; lamax: number; lomax: number };

export function hasOpenSkyCredentials(): boolean {
  return Boolean(process.env.OPENSKY_CLIENT_ID?.trim() && process.env.OPENSKY_CLIENT_SECRET?.trim());
}

/** Keep each request at 25 square degrees, OpenSky's one-credit tier. */
export function openSkyBboxAround(lat: number, lng: number): OpenSkyBbox {
  const half = OPENSKY_BBOX_SPAN_DEG / 2;
  const grid = half;
  const snappedLat = Math.round(lat / grid) * grid;
  const snappedLng = Math.round(lng / grid) * grid;
  const centerLat = Math.min(90 - half, Math.max(-90 + half, snappedLat));
  const centerLng = Math.min(180 - half, Math.max(-180 + half, snappedLng));
  return { lamin: centerLat - half, lomin: centerLng - half, lamax: centerLat + half, lomax: centerLng + half };
}

export function openSkyStatesUrl(bbox: OpenSkyBbox): string {
  const params = new URLSearchParams({
    lamin: String(bbox.lamin), lomin: String(bbox.lomin),
    lamax: String(bbox.lamax), lomax: String(bbox.lomax), extended: "1",
  });
  return `${OPENSKY_STATES_URL}?${params.toString()}`;
}

function numberAt(row: unknown[], index: number): number | null {
  const value = row[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function feet(value: number | null): number | null {
  return value == null ? null : Math.round(value * 3.28084);
}

function knots(value: number | null): number | null {
  return value == null ? null : Math.round(value * 1.94384 * 10) / 10;
}

function feetPerMinute(value: number | null): number | null {
  return value == null ? null : Math.round(value * 196.8504);
}

function categoryLabel(value: number | null): string | null {
  if (value == null || value <= 1) return null;
  const labels: Record<number, string> = {
    2: "light", 3: "small", 4: "large", 5: "high-vortex", 6: "heavy",
    7: "high-performance", 8: "rotorcraft", 9: "glider", 10: "lighter-than-air",
    11: "parachutist", 12: "ultralight", 14: "uav", 15: "space",
    16: "surface-emergency", 17: "surface-service",
  };
  return labels[value] ?? `category-${value}`;
}

export function parseOpenSkyTraffic(
  states: unknown,
  options: { time?: number; max?: number } = {},
): MilitaryAircraft[] {
  if (!Array.isArray(states)) return [];
  const observedAt = options.time ?? Math.floor(Date.now() / 1000);
  const max = options.max ?? 280;
  const aircraft: MilitaryAircraft[] = [];

  for (const value of states) {
    if (!Array.isArray(value)) continue;
    const hex = typeof value[0] === "string" ? value[0].trim().toLowerCase() : "";
    const lng = numberAt(value, 5);
    const lat = numberAt(value, 6);
    if (!hex || lat == null || lng == null) continue;
    const lastPosition = numberAt(value, 3);
    const lastContact = numberAt(value, 4);
    const callsign = typeof value[1] === "string" ? value[1].trim() || null : null;
    const squawk = typeof value[14] === "string" ? value[14] : null;
    const onGround = value[8] === true;

    aircraft.push({
      id: hex, hex, callsign, registration: null, lat, lng,
      altitude: onGround ? 0 : feet(numberAt(value, 7)),
      altitudeGeom: onGround ? 0 : feet(numberAt(value, 13)),
      groundSpeed: knots(numberAt(value, 9)),
      indicatedAirspeed: null, trueAirspeed: null, mach: null,
      track: numberAt(value, 10), trackRate: null, roll: null,
      magHeading: null, trueHeading: null,
      baroRate: feetPerMinute(numberAt(value, 11)), geomRate: null, squawk,
      emergency: squawk === "7500" || squawk === "7600" || squawk === "7700" ? squawk : null,
      type: null, category: categoryLabel(numberAt(value, 17)), dbFlags: null,
      windDirection: null, windSpeed: null, navAltitudeMcp: null, navHeading: null,
      navModes: null,
      seen: lastContact == null ? null : Math.max(0, observedAt - lastContact),
      seenPos: lastPosition == null ? null : Math.max(0, observedAt - lastPosition),
      rssi: null, acasAdvisory: null,
      timestamp: new Date(observedAt * 1000).toISOString(),
    });
    if (aircraft.length >= max) break;
  }
  return aircraft;
}
