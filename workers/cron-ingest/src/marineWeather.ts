/**
 * NOAA GFS-Wave(WAVEWATCH III) 해상 기상 → D1 `marine_weather` (해역 대표 지점별 0~72시간 예보).
 *
 *  - 소스: NOAA NODD AWS 버킷(퍼블릭 도메인). .idx 로 필요한 변수만 HTTP Range 로 받는다 (파일 전체 X).
 *  - 디코딩: src/lib/marineWeather/grib2.ts (순수 TS, 5.0/5.2/5.3 패킹). NODD 원본은 JPEG2000(5.40)이라
 *    기본은 NOMADS grib_filter(해역 상자·변수별 요청, 단순 패킹으로 재인코딩) — processWaveFileFiltered
 *  - 증분 처리: 한 틱(10분 크론)에 파일 `MARINE_WEATHER_MAX_FILES_PER_RUN`(기본 2)개만 → 한 사이클(13개 파일)이
 *    약 1시간에 걸쳐 채워진다. CPU·서브요청을 한 번에 몰지 않으려는 것.
 *  - 완료 여부는 `marine_weather_files` (사이클·예보시간별 상태)로 판단. 3번 실패한 파일은 건너뛴다.
 *  - 분석값(f000)은 오래 보관 — "피격 당시 바다 상태" 확인용. 예보(f006~)는 3일 지나면 지운다.
 *  - 실패해도 메인 인제스트는 안 깨지게 호출부에서 try/catch.
 */

import type { IngestEnv } from "./env";
import {
  FORECAST_HOURS,
  GFS_S3_BASE_DEFAULT,
  GFS_WAVE_GRID_DEFAULT,
  candidateCycles,
  cycleId,
} from "../../../src/lib/marineWeather/gfsWave";
import { processWaveFile, processWaveFileFiltered, type MarineWeatherRow } from "../../../src/lib/marineWeather/processWaveFile";

const MAX_ATTEMPTS = 3;

function vars(env: IngestEnv): Record<string, string | undefined> {
  return env as unknown as Record<string, string | undefined>;
}

async function upsertRows(db: D1Database, rows: MarineWeatherRow[]): Promise<void> {
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((r) =>
    db
      .prepare(
        `INSERT INTO marine_weather (
           cycle, fhour, valid_time, point_id, region, grid_lat, grid_lng, offset_cells,
           hs_m, period_s, dir_deg, wind_ms, wind_dir_deg, swell_m, wind_wave_m, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
         ON CONFLICT(cycle, fhour, point_id) DO UPDATE SET
           hs_m = excluded.hs_m, period_s = excluded.period_s, dir_deg = excluded.dir_deg,
           wind_ms = excluded.wind_ms, wind_dir_deg = excluded.wind_dir_deg, swell_m = excluded.swell_m,
           wind_wave_m = excluded.wind_wave_m, grid_lat = excluded.grid_lat, grid_lng = excluded.grid_lng,
           offset_cells = excluded.offset_cells, ingested_at = excluded.ingested_at`,
      )
      .bind(
        r.cycle,
        r.fhour,
        r.valid_time,
        r.point_id,
        r.region,
        r.grid_lat,
        r.grid_lng,
        r.offset_cells,
        r.hs_m,
        r.period_s,
        r.dir_deg,
        r.wind_ms,
        r.wind_dir_deg,
        r.swell_m,
        r.wind_wave_m,
        ingestedAt,
      ),
  );
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
}

async function markFile(
  db: D1Database,
  cycle: string,
  fhour: number,
  status: "ok" | "error",
  detail: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO marine_weather_files (cycle, fhour, status, attempts, detail, updated_at)
       VALUES (?1, ?2, ?3, 1, ?4, ?5)
       ON CONFLICT(cycle, fhour) DO UPDATE SET status = excluded.status,
         attempts = marine_weather_files.attempts + 1, detail = excluded.detail, updated_at = excluded.updated_at`,
    )
    .bind(cycle, fhour, status, detail.slice(0, 500), new Date().toISOString())
    .run();
}

/** 이 사이클에서 더 시도할 필요 없는 예보시간 (성공했거나 3번 실패) */
async function settledHours(db: D1Database, cycle: string): Promise<{ settled: Set<number>; any: boolean }> {
  const { results } = await db
    .prepare(`SELECT fhour, status, attempts FROM marine_weather_files WHERE cycle = ?1`)
    .bind(cycle)
    .all<{ fhour: number; status: string; attempts: number }>();
  const settled = new Set<number>();
  for (const r of results ?? []) if (r.status === "ok" || r.attempts >= MAX_ATTEMPTS) settled.add(r.fhour);
  return { settled, any: (results ?? []).length > 0 };
}

async function prune(db: D1Database, historyDays: number): Promise<void> {
  const fcCutoff = cycleId(new Date(Date.now() - 3 * 86_400_000));
  const histCutoff = cycleId(new Date(Date.now() - historyDays * 86_400_000));
  await db.batch([
    db.prepare(`DELETE FROM marine_weather WHERE fhour > 0 AND cycle < ?1`).bind(fcCutoff),
    db.prepare(`DELETE FROM marine_weather WHERE cycle < ?1`).bind(histCutoff),
    db.prepare(`DELETE FROM marine_weather_files WHERE cycle < ?1`).bind(fcCutoff),
  ]);
}

export async function fetchAndUpsertMarineWeather(env: IngestEnv): Promise<{
  cycle: string | null;
  files: number;
  rows: number;
  errors: string[];
  skipped: boolean;
}> {
  const v = vars(env);
  const flag = (v.MARINE_WEATHER_INGEST_ENABLED ?? "true").toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return { cycle: null, files: 0, rows: 0, errors: [], skipped: true };
  }
  const base = v.GFS_S3_BASE?.trim() || GFS_S3_BASE_DEFAULT;
  const grid = v.GFS_WAVE_GRID?.trim() || GFS_WAVE_GRID_DEFAULT;
  // 기본 소스는 NOMADS grib_filter(단순 패킹). "s3" 는 NODD 원본(JPEG2000 이라 현재 디코딩 불가).
  const source = (v.MARINE_WEATHER_SOURCE ?? "nomads").toLowerCase();
  let budget = Math.min(13, Math.max(1, Number(v.MARINE_WEATHER_MAX_FILES_PER_RUN) || (source === "s3" ? 2 : 1)));
  const historyDays = Math.max(7, Number(v.MARINE_WEATHER_HISTORY_DAYS) || 365);

  const errors: string[] = [];
  let files = 0;
  let rows = 0;
  let workedCycle: string | null = null;
  let found = false;

  // 위험 해역(risk)과 전 세계 확대 해역(global)은 파일을 따로 처리한다 — 한 번에 NOMADS 요청이 50개를 넘지 않게.
  // global 파트의 완료 기록은 marine_weather_files 에 사이클 id 뒤에 "g" 를 붙여 남긴다 (마이그레이션 불필요).
  const globalOn = !/^(false|0|off)$/i.test(v.MARINE_WEATHER_GLOBAL ?? "true");
  const parts: Array<{ part: "risk" | "global"; suffix: string }> = [{ part: "risk", suffix: "" }];
  if (globalOn && source !== "s3") parts.push({ part: "global", suffix: "g" });

  for (const cycle of candidateCycles(new Date())) {
    let anyPending = false;
    let published = false;
    let stop = false;
    for (const { part, suffix } of parts) {
      const fileCycle = cycle + suffix;
      const { settled, any } = await settledHours(env.DB, fileCycle);
      const pending = FORECAST_HOURS.filter((h) => !settled.has(h));
      if (pending.length > 0) anyPending = true;
      published = published || any;
      for (const fh of pending) {
        if (budget <= 0) break;
        const out =
          source === "s3"
            ? await processWaveFile(cycle, fh, { base, grid })
            : await processWaveFileFiltered(cycle, fh, { filterUrl: v.GFS_FILTER_URL?.trim() || undefined, grid, part });
        if (out.kind === "not-published") {
          stop = true; // 이 예보시간 파일이 아직 안 올라옴 — 다음 틱에 (뒤 파트도 마찬가지)
          break;
        }
        published = true;
        budget--;
        files++;
        workedCycle = cycle;
        if (out.kind === "ok") {
          await upsertRows(env.DB, out.rows);
          rows += out.rows.length;
          await markFile(env.DB, fileCycle, fh, "ok", `fields=${out.fields.join(",")}${out.errors.length ? ` errs=${out.errors.join(" | ")}` : ""}`);
          if (out.errors.length) errors.push(`${part} f${fh}: ${out.errors[0]}`);
        } else {
          await markFile(env.DB, fileCycle, fh, "error", out.error);
          errors.push(`${part} f${fh}: ${out.error}`);
        }
      }
      if (stop) break;
    }
    if (!anyPending) {
      found = true;
      break; // 가장 최신 사이클이 이미 다 찼다 (모든 파트)
    }
    // 이 사이클이 올라와 있으면 여기에 집중한다 (더 오래된 사이클을 채우지 않음)
    if (published) {
      found = true;
      break;
    }
  }
  // 18시간 치 사이클이 전부 404 면 경로·버킷 설정이 틀렸을 가능성이 크다 — 조용히 넘기지 않는다
  if (!found) errors.push("no GFS-Wave cycle found in last 18h (check GFS_S3_BASE / GFS_WAVE_GRID)");

  try {
    await prune(env.DB, historyDays);
  } catch (e) {
    errors.push(`prune: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { cycle: workedCycle, files, rows, errors: errors.slice(0, 6), skipped: false };
}
