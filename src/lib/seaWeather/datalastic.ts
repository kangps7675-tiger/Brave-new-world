/**
 * 해역 날씨 — Datalastic Weather API (GET /api/v0/weather?lat=&lon=).
 *
 * 2026-10-21 실제 응답으로 확인한 구조 (홍해 12.6, 43.3):
 *   { data: { location, weather: { latitude, longitude, current: { time, wave_height, wind_speed_10m, ... } } },
 *     meta: { success } }
 * 단위는 문서에 없다. Open-Meteo 규약(풍속·해류 km/h, 시정 m, 파고 m, 기압 hPa)으로 읽는다 —
 * 풍속 18.3 에 파고 0.5 m 라는 응답이 m/s 로는 성립하지 않아서 km/h 로 판단했다.
 * `wind_gusts_10m` 이 평균풍속보다 작게 오는 경우가 있어(16.1 < 18.3) 화면에 쓰지 않는다.
 * `ocean_current_velocity` 는 단위가 불확실해 쓰지 않는다.
 */

import { MARINE_POINTS, type MarineRegion } from "@/lib/marineWeather/zones";

const BASE = "https://api.datalastic.com/api/v0";

export type SeaWeatherNow = {
  /** 관측·예보 기준 시각 (UTC, ISO) */
  at: string | null;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  swellHeightM: number | null;
  windKmh: number | null;
  windDirDeg: number | null;
  visibilityKm: number | null;
  pressureHpa: number | null;
  seaTempC: number | null;
  cloudPct: number | null;
  /** 응답 격자 중심 (요청 좌표와 다를 수 있다) */
  gridLat: number | null;
  gridLng: number | null;
};

function num(o: Record<string, unknown>, key: string): number | null {
  const v = o[key];
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** 응답 JSON → 현재 상태. 형태가 다르면 null (거짓 숫자를 만들지 않는다). */
export function parseSeaWeather(json: unknown): SeaWeatherNow | null {
  const root = json as { data?: { weather?: Record<string, unknown> }; meta?: { success?: boolean } } | null;
  if (!root || root.meta?.success === false) return null;
  const w = root.data?.weather;
  if (!w || typeof w !== "object") return null;
  const cur = (w as { current?: unknown }).current;
  if (!cur || typeof cur !== "object") return null;
  const c = cur as Record<string, unknown>;

  const out: SeaWeatherNow = {
    at: typeof c.time === "string" ? toUtcIso(c.time) : null,
    waveHeightM: num(c, "wave_height"),
    wavePeriodS: num(c, "wave_period"),
    swellHeightM: num(c, "swell_wave_height"),
    windKmh: num(c, "wind_speed_10m"),
    windDirDeg: num(c, "wind_direction_10m"),
    visibilityKm: ((m) => (m === null ? null : m / 1000))(num(c, "visibility")),
    pressureHpa: num(c, "pressure_msl"),
    seaTempC: num(c, "sea_surface_temperature"),
    cloudPct: num(c, "cloud_cover"),
    gridLat: num(w as Record<string, unknown>, "latitude"),
    gridLng: num(w as Record<string, unknown>, "longitude"),
  };
  // 핵심 값이 하나도 없으면 "자료 없음"
  return out.waveHeightM === null && out.windKmh === null ? null : out;
}

/** "2026-10-21T10:45" (timezone GMT, 접미사 없음) → UTC ISO */
function toUtcIso(s: string): string | null {
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** 해역별 대표 지점 — 격자가 바다로 잡히는 열린 수역 (marineWeather/zones.ts 의 첫 지점) */
export function seaWeatherPoint(region: MarineRegion): { lat: number; lng: number; nameKo: string; nameEn: string } | null {
  const p = MARINE_POINTS.find((x) => x.region === region);
  return p ? { lat: p.lat, lng: p.lng, nameKo: p.nameKo, nameEn: p.nameEn } : null;
}

export type FetchResult =
  | { ok: true; now: SeaWeatherNow }
  | { ok: false; reason: "no-key" | "http" | "shape" | "network"; status?: number };

export async function fetchSeaWeather(
  lat: number,
  lng: number,
  opts: { apiKey?: string | null; fetchImpl?: typeof fetch } = {},
): Promise<FetchResult> {
  const apiKey = (opts.apiKey ?? process.env.DATALASTIC_API_KEY ?? "").trim();
  if (!apiKey) return { ok: false, reason: "no-key" };
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f(`${BASE}/weather?api-key=${encodeURIComponent(apiKey)}&lat=${lat}&lon=${lng}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reason: "http", status: res.status };
    const now = parseSeaWeather(await res.json());
    return now ? { ok: true, now } : { ok: false, reason: "shape" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** km/h → 노트 */
export const kmhToKnots = (kmh: number): number => kmh / 1.852;
