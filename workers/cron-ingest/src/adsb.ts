import type { AdsbAircraftRow, IngestEnv } from "./env";
import { getAdsbApiKey } from "./db";
import milHexPayload from "./data/bellingcat-mil-hexes.json";

const BELLINGCAT_MIL_HEX = new Set(
  (milHexPayload.hexes as string[]).map((h) => h.toLowerCase()),
);

// adsb.fi("personal" 전용) · airplanes.live(독점 라이선스 미확인) 는 제거됨.
// 사유는 milUrlCandidates 주석 참조 — 되돌리지 말 것.
const ADSB_LOL_MIL_URL = "https://api.adsb.lol/v2/mil";
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
 * ADS-B 폴백 소스 정책 — **무료·유료 구분 없이 동일하다.**
 *
 * ⚠️ 예전에는 `COMMERCIAL_TIER_ENABLED` 로 갈라서, 무료 모드에서만
 *    adsb.fi 와 airplanes.live 를 폴백에 넣었다. 그 설계는 틀렸다:
 *
 *    · adsb.fi — "for **personal**, non-commercial use only."
 *      두 요건을 **모두** 충족해야 한다. 공개 웹서비스는 무료여도
 *      "personal" 이 아니므로, 무료 모드에서도 쓸 수 없다.
 *
 *    · airplanes.live — 독점 라이선스. 상업 조건이 확인되지 않았다.
 *      `sourceCatalog` 의 원칙("모르면 unknown, 확인 전까지 차단")을
 *      그대로 적용하면 무료 모드에서도 배제하는 게 맞다.
 *
 *    실무적으로도 Cloudflare Worker IP 는 adsb.fi 가 403 을 준다.
 *
 * 남는 것: adsb.lol(ODbL — 출처 표기만) · ADSBexchange(상업 티어 키).
 *
 * @see docs/copyright-audit-2026-08-01.md — Y-2
 */
function milUrlCandidates(apiKey: string | null): string[] {
  // 키가 있으면 상업 라이선스가 확실한 ADSBexchange 를 최우선
  const urls: string[] = [];
  if (apiKey) urls.push(ADSBX_MIL_URL);
  urls.push(ADSB_LOL_MIL_URL); // ODbL
  return urls;
}

function civUrlCandidates(
  apiKey: string | null,
  lat: number,
  lng: number,
  distNm: number,
): string[] {
  const dist = Math.min(1500, Math.max(25, Math.round(distNm)));
  const adsbLol = `https://api.adsb.lol/v2/lat/${lat}/lon/${lng}/dist/${dist}`;
  const adsbx = `https://gateway.adsbexchange.com/api/aircraft/v2/lat/${lat}/lon/${lng}/dist/${dist}`;

  const urls: string[] = [];
  if (apiKey) urls.push(adsbx);
  urls.push(adsbLol); // ODbL
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

  // Military — 라이선스가 확인된 소스만 (ADSBexchange 키 → adsb.lol ODbL)
  const milUrls = milUrlCandidates(apiKey);
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
    const urls = civUrlCandidates(apiKey, hub.lat, hub.lng, hub.distNm);
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
