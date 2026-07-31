import type { AdsbAircraftRow, IngestEnv } from "./env";
import { getAdsbApiKey } from "./db";
import milHexPayload from "./data/bellingcat-mil-hexes.json";

const BELLINGCAT_MIL_HEX = new Set(
  (milHexPayload.hexes as string[]).map((h) => h.toLowerCase()),
);

const ADSB_FI_MIL_URL = "https://opendata.adsb.fi/api/v2/mil";
const ADSB_LOL_MIL_URL = "https://api.adsb.lol/v2/mil";
const ADSB_LIVE_MIL_URL = "https://api.airplanes.live/v2/mil";
const ADSBX_MIL_URL = "https://gateway.adsbexchange.com/api/aircraft/v2/mil";

const CIV_HUBS = [
  { id: "europe", lat: 50.5, lng: 8.5, distNm: 280 },
  { id: "mideast", lat: 29.5, lng: 48.0, distNm: 250 },
  { id: "east-asia", lat: 35.5, lng: 129.0, distNm: 280 },
  { id: "us-east", lat: 39.0, lng: -77.0, distNm: 280 },
  { id: "us-west", lat: 34.0, lng: -118.2, distNm: 250 },
  { id: "sg-malacca", lat: 1.3, lng: 103.8, distNm: 220 },
] as const;

type RawAc = {
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
  lastPosition?: { lat?: number; lon?: number };
  alt_baro?: number | string | null;
  alt_geom?: number | null;
  gs?: number;
  track?: number;
  squawk?: string;
  emergency?: string;
  dbFlags?: number | string;
};

function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseAlt(value: unknown): number | null {
  if (typeof value === "string" && value.toLowerCase() === "ground") return 0;
  return numOrNull(value);
}

function pickCoord(raw: RawAc): { lat: number; lng: number } | null {
  const candidates: Array<[unknown, unknown]> = [
    [raw.lat, raw.lon],
    [raw.lastPosition?.lat, raw.lastPosition?.lon],
    [raw.rr_lat, raw.rr_lon],
  ];
  for (const [la, lo] of candidates) {
    const lat = Number(la);
    const lng = Number(lo);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function isMilitary(raw: RawAc): boolean {
  if (raw.dbFlags != null && raw.dbFlags !== "") {
    const flags = Number(raw.dbFlags);
    if (Number.isFinite(flags) && (flags & 1) === 1) return true;
  }
  const hex = (raw.hex || "").toLowerCase();
  return Boolean(hex && BELLINGCAT_MIL_HEX.has(hex));
}

function authHeaders(apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "BraveNewWorld/1.0",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
    headers["api-auth"] = apiKey;
  }
  return headers;
}

async function readJsonMaybeGzip(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    const encoding = (response.headers.get("content-encoding") || "").toLowerCase();
    if (encoding.includes("gzip") && response.body) {
      const ds = new DecompressionStream("gzip");
      const text = await new Response(response.body.pipeThrough(ds)).text();
      return JSON.parse(text) as unknown;
    }
    const text = await response.text();
    return JSON.parse(text) as unknown;
  }
}

function extractList(payload: { ac?: RawAc[]; aircraft?: RawAc[] }): RawAc[] {
  if (Array.isArray(payload.aircraft)) return payload.aircraft;
  if (Array.isArray(payload.ac)) return payload.ac;
  return [];
}

function normalizeAircraft(
  raw: RawAc,
  mode: "mil" | "civ",
): AdsbAircraftRow | null {
  const military = isMilitary(raw);
  if (mode === "mil") {
    if (raw.dbFlags != null && raw.dbFlags !== "" && !military) return null;
  } else if (military) {
    return null;
  }

  const hex = (raw.hex || "").toLowerCase();
  const coord = pickCoord(raw);
  if (!hex || !coord) return null;

  const aircraft = {
    id: `${mode}:${hex}`,
    hex,
    mode,
    callsign: raw.flight?.trim() || null,
    registration: raw.r?.trim() || null,
    lat: coord.lat,
    lng: coord.lng,
    altitude: parseAlt(raw.alt_baro),
    altitude_geom: parseAlt(raw.alt_geom),
    ground_speed: numOrNull(raw.gs),
    track: numOrNull(raw.track),
    type: raw.t || raw.type || null,
    category: raw.category || null,
    db_flags: numOrNull(raw.dbFlags),
    squawk: raw.squawk || null,
    emergency: raw.emergency && raw.emergency !== "none" ? raw.emergency : null,
    payload_json: JSON.stringify({
      id: hex,
      hex,
      callsign: raw.flight?.trim() || null,
      registration: raw.r?.trim() || null,
      lat: coord.lat,
      lng: coord.lng,
      altitude: parseAlt(raw.alt_baro),
      altitudeGeom: parseAlt(raw.alt_geom),
      groundSpeed: numOrNull(raw.gs),
      track: numOrNull(raw.track),
      type: raw.t || raw.type || null,
      category: raw.category || null,
      dbFlags: numOrNull(raw.dbFlags),
      squawk: raw.squawk || null,
      emergency: raw.emergency && raw.emergency !== "none" ? raw.emergency : null,
      timestamp: new Date().toISOString(),
    }),
    hub: null as string | null,
  };
  return aircraft;
}

/**
 * 상업 이용 가능한 ADS-B 소스만 남길지 판단.
 *
 * ⚠️ adsb.fi 약관: "for personal, **non-commercial** use only. You may not
 *    license, sell, rent, or lease any part of the data or the service."
 *    airplanes.live 는 독점 라이선스라 상업 조건이 확인되지 않았다.
 *
 * 유료 티어를 켜면 둘 다 폴백에서 빼고,
 * adsb.lol(ODbL — 상업 이용 가능) 과 ADSBexchange(상업 티어) 만 쓴다.
 */
function commercialOnly(env?: { COMMERCIAL_TIER_ENABLED?: string }): boolean {
  return env?.COMMERCIAL_TIER_ENABLED === "true";
}

function milUrlCandidates(
  apiKey: string | null,
  env?: { COMMERCIAL_TIER_ENABLED?: string },
): string[] {
  // 상업 모드에서는 ADSBexchange(유료 라이선스)를 최우선으로 둔다
  if (commercialOnly(env)) {
    const urls: string[] = [];
    if (apiKey) urls.push(ADSBX_MIL_URL);
    urls.push(ADSB_LOL_MIL_URL); // ODbL — 상업 가능
    return urls;
  }
  // Cloudflare Worker IP는 adsb.fi 403 — adsb.lol / airplanes.live 우선
  const urls = [ADSB_LOL_MIL_URL, ADSB_LIVE_MIL_URL, ADSB_FI_MIL_URL];
  if (apiKey) urls.push(ADSBX_MIL_URL);
  return urls;
}

function civUrlCandidates(
  apiKey: string | null,
  lat: number,
  lng: number,
  distNm: number,
  env?: { COMMERCIAL_TIER_ENABLED?: string },
): string[] {
  const dist = Math.min(1500, Math.max(25, Math.round(distNm)));
  const adsbLol = `https://api.adsb.lol/v2/lat/${lat}/lon/${lng}/dist/${dist}`;
  const adsbx = `https://gateway.adsbexchange.com/api/aircraft/v2/lat/${lat}/lon/${lng}/dist/${dist}`;

  if (commercialOnly(env)) {
    const urls: string[] = [];
    if (apiKey) urls.push(adsbx);
    urls.push(adsbLol);
    return urls;
  }

  const urls = [
    adsbLol,
    `https://api.airplanes.live/v2/lat/${lat}/lon/${lng}/dist/${dist}`,
    `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lng}/dist/${dist}`,
  ];
  if (apiKey) urls.push(adsbx);
  return urls;
}

async function fetchAdsbJson(
  url: string,
  apiKey: string | null,
): Promise<{ ok: boolean; status: number; payload?: unknown }> {
  const res = await fetch(url, { headers: authHeaders(apiKey) });
  if (!res.ok) return { ok: false, status: res.status };
  try {
    const payload = await readJsonMaybeGzip(res);
    return { ok: true, status: res.status, payload };
  } catch {
    return { ok: false, status: res.status };
  }
}

export async function fetchAdsbAircraft(
  env: IngestEnv,
  options?: { milMax?: number; civPerHub?: number; maxHubs?: number },
): Promise<{ aircraft: AdsbAircraftRow[]; errors: string[] }> {
  const apiKey = getAdsbApiKey(env);
  const milMax = Math.min(800, Math.max(50, options?.milMax ?? 400));
  const civPerHub = Math.min(120, Math.max(20, options?.civPerHub ?? 80));
  const hubLimit = Math.min(CIV_HUBS.length, Math.max(1, options?.maxHubs ?? 4));
  const errors: string[] = [];
  const byId = new Map<string, AdsbAircraftRow>();

  // Military — Worker IP 호환 소스 우선 (유료 티어면 상업 가능 소스만)
  const milUrls = milUrlCandidates(apiKey, env);
  for (let i = 0; i < milUrls.length; i += 1) {
    const url = milUrls[i]!;
    const isLast = i === milUrls.length - 1;
    try {
      const useKey = url === ADSBX_MIL_URL ? apiKey : null;
      const result = await fetchAdsbJson(url, useKey);
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) continue;
        errors.push(`mil: HTTP ${result.status}`);
        if (isLast) break;
        continue;
      }
      const payload = result.payload as { ac?: RawAc[]; aircraft?: RawAc[] };
      let n = 0;
      for (const raw of extractList(payload)) {
        const row = normalizeAircraft(raw, "mil");
        if (!row) continue;
        byId.set(row.id, row);
        n += 1;
        if (n >= milMax) break;
      }
      if (n > 0 || isLast) break;
    } catch (error) {
      errors.push(`mil: ${error instanceof Error ? error.message : "fetch failed"}`);
      if (isLast) break;
    }
  }

  // Civilian hubs (cron 서브요청 절약)
  for (const hub of CIV_HUBS.slice(0, hubLimit)) {
    const urls = civUrlCandidates(apiKey, hub.lat, hub.lng, hub.distNm, env);
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i]!;
      const isLast = i === urls.length - 1;
      try {
        const useKey = apiKey && url.includes("adsbexchange") ? apiKey : null;
        const result = await fetchAdsbJson(url, useKey);
        if (!result.ok) {
          if (result.status === 401 || result.status === 403) continue;
          errors.push(`${hub.id}: HTTP ${result.status}`);
          if (isLast) break;
          continue;
        }
        const payload = result.payload as { ac?: RawAc[]; aircraft?: RawAc[] };
        let n = 0;
        for (const raw of extractList(payload)) {
          const row = normalizeAircraft(raw, "civ");
          if (!row) continue;
          byId.set(row.id, { ...row, hub: hub.id });
          n += 1;
          if (n >= civPerHub) break;
        }
        if (n > 0 || isLast) break;
      } catch (error) {
        errors.push(`${hub.id}: ${error instanceof Error ? error.message : "fetch failed"}`);
        if (isLast) break;
      }
    }
  }

  return { aircraft: Array.from(byId.values()), errors };
}
