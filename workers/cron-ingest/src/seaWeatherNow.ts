/**
 * 해역 대표 지점별 현재 해상·기상 (Datalastic /weather) → D1 `sea_weather_now`.
 * 5분 크론(runFastAlerts) 안에서 호출되고, 지점별 6시간 간격(실패 시 1시간)으로 스스로 스로틀한다.
 * 순수 스케줄은 src/lib/seaWeather/schedule.ts.
 *
 * 비용 가드: datalastic_usage(0037)·sea_weather_now(0040)가 없거나 D1 이 실패하면 호출하지 않는다 (fail-closed).
 * 사건 스냅샷용 예약분(EVENT_RESERVE_CREDITS)은 건드리지 않는다. 키가 없으면 아무것도 안 한다.
 * 한 지점이 실패하면 이번 틱은 거기서 멈춘다(키·한도 문제면 나머지도 실패하므로).
 */

import { DEFAULT_MONTHLY_CREDITS, monthKey } from "../../../src/lib/datalasticAis";
import { RISK_MARINE_POINTS as MARINE_POINTS } from "../../../src/lib/marineWeather/zones";
import { fetchSeaWeather, toCandidateWeather } from "../../../src/lib/seaWeather/datalastic";
import { SEA_WX_CREDITS, canSpendOnSeaWeather, dueSeaWeatherPoints } from "../../../src/lib/seaWeather/schedule";
import { EVENT_RESERVE_CREDITS } from "../../../src/lib/strikeSnapshot";
import type { IngestEnv } from "./env";
import { addUsage, readPositiveInt } from "./strikeSnapshot";

export type SeaWeatherNowResult = { fetched: number; failed: number; credits: number; errors: string[] };

export async function runSeaWeatherNow(env: IngestEnv): Promise<SeaWeatherNowResult> {
  const out: SeaWeatherNowResult = { fetched: 0, failed: 0, credits: 0, errors: [] };
  const key = (env.DATALASTIC_API_KEY ?? "").trim();
  if (!key) return out;
  const flag = String((env as unknown as Record<string, string | undefined>).SEA_WEATHER_NOW_ENABLED ?? "true").toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return out;

  const budget = readPositiveInt(env.DATALASTIC_MONTHLY_CREDITS, DEFAULT_MONTHLY_CREDITS);
  const now = new Date();
  const nowMs = now.getTime();
  const month = monthKey(now);

  let used = 0;
  let due: string[] = [];
  try {
    const u = await env.DB.prepare("SELECT credits FROM datalastic_usage WHERE month = ?").bind(month).first<{ credits: number }>();
    used = u?.credits ?? 0;
    const { results } = await env.DB
      .prepare("SELECT point_id AS pointId, checked_at AS checkedAt, error FROM sea_weather_now")
      .all<{ pointId: string; checkedAt: string; error: string | null }>();
    due = dueSeaWeatherPoints(MARINE_POINTS.map((p) => p.id), results ?? [], nowMs);
  } catch (error) {
    out.errors.push(`sea-weather: 테이블 읽기 실패 — 호출 안 함 (migration 0037/0040?) ${error instanceof Error ? error.message : ""}`.trim());
    return out;
  }

  for (const id of due) {
    const p = MARINE_POINTS.find((x) => x.id === id);
    if (!p) continue;
    if (!canSpendOnSeaWeather(used, budget, EVENT_RESERVE_CREDITS)) {
      out.errors.push(`sea-weather: 월 예산 중 사건 예약분을 남기고 쓸 수 있는 크레딧 소진(${used}/${budget})`);
      break;
    }
    const stamp = new Date().toISOString();
    const r = await fetchSeaWeather(p.lat, p.lng, { apiKey: key });
    try {
      if (!r.ok) {
        const reason = `${r.reason}${r.status ? ` ${r.status}` : ""}`;
        await env.DB
          .prepare(
            `INSERT INTO sea_weather_now (point_id, region, checked_at, error) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(point_id) DO UPDATE SET checked_at = excluded.checked_at, error = excluded.error`,
          )
          .bind(p.id, p.region, stamp, reason)
          .run();
        out.failed += 1;
        out.errors.push(`sea-weather ${p.id}: ${reason}`);
        break;
      }
      const w = toCandidateWeather(r.now);
      // 응답이 있었으니 크레딧은 쓴 것으로 센다 (실제 청구 단위는 실측 후 조정)
      out.credits += SEA_WX_CREDITS;
      used += SEA_WX_CREDITS;
      await addUsage(env, month, SEA_WX_CREDITS, stamp);
      await env.DB
        .prepare(
          `INSERT INTO sea_weather_now (point_id, region, checked_at, error, fetched_at, at, wave_height_m, wave_period_s,
             swell_height_m, wind_kn, wind_dir_deg, visibility_km, pressure_hpa, sea_temp_c)
           VALUES (?1, ?2, ?3, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
           ON CONFLICT(point_id) DO UPDATE SET checked_at = excluded.checked_at, error = NULL, fetched_at = excluded.fetched_at,
             at = excluded.at, wave_height_m = excluded.wave_height_m, wave_period_s = excluded.wave_period_s,
             swell_height_m = excluded.swell_height_m, wind_kn = excluded.wind_kn, wind_dir_deg = excluded.wind_dir_deg,
             visibility_km = excluded.visibility_km, pressure_hpa = excluded.pressure_hpa, sea_temp_c = excluded.sea_temp_c`,
        )
        .bind(
          p.id,
          p.region,
          stamp,
          w.at,
          w.waveHeightM,
          w.wavePeriodS,
          w.swellHeightM,
          w.windKn,
          w.windDirDeg,
          w.visibilityKm,
          r.now.pressureHpa,
          r.now.seaTempC,
        )
        .run();
      out.fetched += 1;
    } catch (error) {
      out.errors.push(`sea-weather ${p.id}: ${error instanceof Error ? error.message : "write failed"}`);
      break;
    }
  }
  out.errors = out.errors.slice(0, 3);
  return out;
}
