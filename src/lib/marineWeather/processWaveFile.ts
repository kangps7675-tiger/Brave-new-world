/**
 * GFS-Wave 파일 하나(사이클·예보시간) → 해역 지점별 값. Worker·테스트 공용 (fetch 주입 가능).
 * 적재(D1)는 workers/cron-ingest/src/marineWeather.ts 가 맡는다.
 */

import { decodeGrib2Message, sampleNearest } from "./grib2";
import {
  NOMADS_FILTER_URL,
  WAVE_FIELDS,
  byteRangeFor,
  nomadsFilterUrl,
  parseIdx,
  validTimeIso,
  waveFileUrl,
  type WaveFieldKey,
} from "./gfsWave";
import { MARINE_POINTS, MARINE_REGIONS } from "./zones";

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

/**
 * NOMADS grib_filter 경로 — 해역(region) 상자 × 변수 하나씩 요청한다 (요청당 ~1KB, 단순 패킹 5.0).
 * 실제 NODD 원본(.grib2)은 JPEG2000(5.40) 이라 디코더가 못 읽지만, grib_filter 는 단순 패킹으로 다시 써서 준다.
 * (OPeNDAP 은 2025 폐지됨.) 사이클 파일이 아직 없으면 not-published.
 */
export async function processWaveFileFiltered(
  cycle: string,
  fhour: number,
  opts: { filterUrl?: string; grid?: string; fetchImpl?: typeof fetch },
): Promise<FileOutcome> {
  const f = opts.fetchImpl ?? fetch;
  const base = opts.filterUrl ?? NOMADS_FILTER_URL;
  const values = new Map<string, Partial<Record<WaveFieldKey, number | null>>>();
  const gridPos = new Map<string, { lat: number; lng: number; offset: number }>();
  const fields = new Set<string>();
  const errors: string[] = [];
  let missing = 0;
  let total = 0;

  const jobs: Array<{ region: (typeof MARINE_REGIONS)[number]; field: (typeof WAVE_FIELDS)[number] }> = [];
  for (const region of MARINE_REGIONS) for (const field of WAVE_FIELDS) jobs.push({ region, field });

  const queue = [...jobs];
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      total++;
      const pts = MARINE_POINTS.filter((p) => p.region === job.region);
      try {
        const res = await f(nomadsFilterUrl(base, cycle, fhour, job.field, pts, opts.grid), {
          headers: { "User-Agent": UA },
        });
        if (res.status === 404) {
          missing++;
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.length < 4 || buf[0] !== 0x47 || buf[1] !== 0x52 || buf[2] !== 0x49 || buf[3] !== 0x42) {
          missing++; // "Data file is not present" 같은 HTML 오류 본문
          continue;
        }
        const decoded = decodeGrib2Message(buf);
        fields.add(job.field.key);
        for (const p of pts) {
          const s = sampleNearest(decoded, p.lat, p.lng, 2);
          const cur = values.get(p.id) ?? {};
          cur[job.field.key] = s ? round(s.value, 2) : null;
          values.set(p.id, cur);
          if (s && !gridPos.has(p.id)) gridPos.set(p.id, { lat: s.lat, lng: s.lng, offset: s.offsetCells });
        }
      } catch (e) {
        errors.push(`${job.region}/${job.field.varName}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));

  if (missing === total) return { kind: "not-published" };
  if (fields.size === 0) return { kind: "error", error: errors.slice(0, 3).join(" | ") || "no fields" };
  return { kind: "ok", rows: buildRows(cycle, fhour, values, gridPos), fields: [...fields], errors };
}

function buildRows(
  cycle: string,
  fhour: number,
  values: Map<string, Partial<Record<WaveFieldKey, number | null>>>,
  gridPos: Map<string, { lat: number; lng: number; offset: number }>,
): MarineWeatherRow[] {
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
  return rows;
}


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

  const rows = buildRows(cycle, fhour, values, gridPos);
  return { kind: "ok", rows, fields, errors };
}

