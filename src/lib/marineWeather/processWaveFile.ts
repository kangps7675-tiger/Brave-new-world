/**
 * GFS-Wave 파일 하나(사이클·예보시간) → 해역 지점별 값. Worker·테스트 공용 (fetch 주입 가능).
 * 적재(D1)는 workers/cron-ingest/src/marineWeather.ts 가 맡는다.
 */

import { decodeGrib2Message, sampleNearest } from "./grib2";
import { WAVE_FIELDS, byteRangeFor, parseIdx, validTimeIso, waveFileUrl, type WaveFieldKey } from "./gfsWave";
import { MARINE_POINTS } from "./zones";

const UA = "BraveNewWorld-Ingest/1.0 (+contact: kangps7675@gmail.com; NOAA GFS-Wave point sampler)";

export type MarineWeatherRow = {
  cycle: string;
  fhour: number;
  valid_time: string;
  point_id: string;
  region: string;
  grid_lat: number;
  grid_lng: number;
  offset_cells: number;
} & Record<WaveFieldKey, number | null>;

export type FileOutcome =
  | { kind: "not-published" }
  | { kind: "ok"; rows: MarineWeatherRow[]; fields: string[]; errors: string[] }
  | { kind: "error"; error: string };

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** 파일 하나(사이클·예보시간) → 지점별 행. 순수 fetch 만 쓰므로 테스트에서 fetch 를 갈아끼울 수 있다. */
export async function processWaveFile(
  cycle: string,
  fhour: number,
  opts: { base: string; grid: string; fetchImpl?: typeof fetch },
): Promise<FileOutcome> {
  const f = opts.fetchImpl ?? fetch;
  const url = waveFileUrl(opts.base, cycle, fhour, opts.grid);
  const idxRes = await f(`${url}.idx`, { headers: { "User-Agent": UA } });
  if (idxRes.status === 404 || idxRes.status === 403) return { kind: "not-published" };
  if (!idxRes.ok) return { kind: "error", error: `idx HTTP ${idxRes.status}` };
  const entries = parseIdx(await idxRes.text());
  if (entries.length === 0) return { kind: "error", error: "empty idx" };

  const values = new Map<string, Partial<Record<WaveFieldKey, number | null>>>();
  const gridPos = new Map<string, { lat: number; lng: number; offset: number }>();
  const fields: string[] = [];
  const errors: string[] = [];

  for (const field of WAVE_FIELDS) {
    const range = byteRangeFor(entries, field.varName, field.level);
    if (!range) {
      errors.push(`${field.varName} not in idx`);
      continue;
    }
    try {
      const res = await f(url, {
        headers: { "User-Agent": UA, Range: `bytes=${range.start}-${range.end ?? ""}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const decoded = decodeGrib2Message(new Uint8Array(await res.arrayBuffer()));
      fields.push(field.key);
      for (const p of MARINE_POINTS) {
        const s = sampleNearest(decoded, p.lat, p.lng, 2);
        const cur = values.get(p.id) ?? {};
        cur[field.key] = s ? round(s.value, 2) : null;
        values.set(p.id, cur);
        if (s && !gridPos.has(p.id)) gridPos.set(p.id, { lat: s.lat, lng: s.lng, offset: s.offsetCells });
      }
    } catch (e) {
      errors.push(`${field.varName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (fields.length === 0) return { kind: "error", error: errors.slice(0, 3).join(" | ") || "no fields" };

  const validTime = validTimeIso(cycle, fhour);
  const rows: MarineWeatherRow[] = [];
  for (const p of MARINE_POINTS) {
    const g = gridPos.get(p.id);
    if (!g) continue; // 반경 안에 바다 격자가 없음 (좌표 점검 필요) — 행을 만들지 않는다
    const v = values.get(p.id) ?? {};
    rows.push({
      cycle,
      fhour,
      valid_time: validTime,
      point_id: p.id,
      region: p.region,
      grid_lat: g.lat,
      grid_lng: g.lng,
      offset_cells: g.offset,
      hs_m: v.hs_m ?? null,
      period_s: v.period_s ?? null,
      dir_deg: v.dir_deg ?? null,
      wind_ms: v.wind_ms ?? null,
      wind_dir_deg: v.wind_dir_deg ?? null,
      swell_m: v.swell_m ?? null,
      wind_wave_m: v.wind_wave_m ?? null,
    });
  }
  return { kind: "ok", rows, fields, errors };
}

