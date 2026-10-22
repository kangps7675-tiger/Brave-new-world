/**
 * ADS-B Exchange(RapidAPI) 보강 수집 — 해운 위험 해역 3곳(호르무즈·바브엘만데브·홍해 북부)을 20분마다 반경 250NM 로 조회해
 * 무료 허브(adsb.lol 1000NM, 구역당 상한)가 얇게 자르는 곳을 촘촘히 채운다. 순수 로직·상수는 src/lib/adsbxRapid.ts.
 *
 * 비용 가드: 월 호출 수를 D1(adsbx_rapid_state, migration 0041)에 세어 상한(기본 6,500, ADSBX_RAPID_MONTHLY_CAP)을 넘기지 않는다.
 * 테이블이 없거나 D1 이 실패하면 호출하지 않는다(fail-closed). RapidAPI 키가 아니면 아무것도 안 한다.
 * 429/401/403 이면 그 틱은 즉시 중단. 실패해도 메인 파이프라인은 안 깨진다(호출부 try/catch).
 */

import {
  DENSIFY_DEFAULT_MONTHLY_CAP,
  DENSIFY_MAX_AIRCRAFT_PER_POINT,
  dueDensifyPoints,
  monthKeyUtc,
  rapidHeaders,
  rapidLatLonUrl,
} from "../../../src/lib/adsbxRapid";
import { normalizeRapidPayload } from "./adsb";
import { getRapidAdsbKey } from "./db";
import type { AdsbAircraftRow, IngestEnv } from "./env";

export type DensifyResult = { aircraft: AdsbAircraftRow[]; calls: number; errors: string[]; skipped?: string };

function readCap(env: IngestEnv): number {
  const raw = Number((env as unknown as Record<string, string | undefined>).ADSBX_RAPID_MONTHLY_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DENSIFY_DEFAULT_MONTHLY_CAP;
}

export async function runAdsbxDensify(env: IngestEnv): Promise<DensifyResult> {
  const out: DensifyResult = { aircraft: [], calls: 0, errors: [] };
  const key = getRapidAdsbKey(env);
  if (!key) {
    out.skipped = "no-rapid-key";
    return out;
  }
  const now = new Date();
  const month = monthKeyUtc(now);
  const cap = readCap(env);

  let calls = 0;
  const lastAt: Record<string, string> = {};
  try {
    const { results } = await env.DB.prepare("SELECT key, n, at FROM adsbx_rapid_state").all<{ key: string; n: number; at: string | null }>();
    for (const r of results ?? []) {
      if (r.key === `calls:${month}`) calls = r.n;
      else if (r.key.startsWith("last:") && r.at) lastAt[r.key.slice(5)] = r.at;
    }
  } catch (error) {
    out.errors.push(`adsbx-rapid: 상태 테이블 읽기 실패 — 호출 안 함 (migration 0041?) ${error instanceof Error ? error.message : ""}`.trim());
    return out;
  }

  const due = dueDensifyPoints(lastAt, calls, cap, now);
  if (due.length === 0) {
    out.skipped = calls >= cap ? "monthly-cap" : "none-due";
    return out;
  }

  for (const p of due) {
    const stamp = new Date().toISOString();
    let stop = false;
    try {
      const res = await fetch(rapidLatLonUrl(p.lat, p.lng), { headers: rapidHeaders(key) });
      out.calls += 1;
      calls += 1;
      if (res.ok) {
        const rows = normalizeRapidPayload(await res.json(), `rapid:${p.id}`, DENSIFY_MAX_AIRCRAFT_PER_POINT);
        out.aircraft.push(...rows);
      } else {
        out.errors.push(`adsbx-rapid ${p.id}: HTTP ${res.status}`);
        if (res.status === 429 || res.status === 401 || res.status === 403) stop = true;
      }
    } catch (error) {
      out.errors.push(`adsbx-rapid ${p.id}: ${error instanceof Error ? error.message : "fetch failed"}`);
    }
    // 성공이든 실패든 호출은 셌다(보수적) — 실패한 지점도 20분 뒤에야 다시 시도한다
    try {
      await env.DB.batch([
        env.DB
          .prepare(`INSERT INTO adsbx_rapid_state (key, n, at) VALUES (?1, 1, ?2)
                    ON CONFLICT(key) DO UPDATE SET n = n + 1, at = excluded.at`)
          .bind(`calls:${month}`, stamp),
        env.DB
          .prepare(`INSERT INTO adsbx_rapid_state (key, n, at) VALUES (?1, 0, ?2)
                    ON CONFLICT(key) DO UPDATE SET at = excluded.at`)
          .bind(`last:${p.id}`, stamp),
      ]);
    } catch (error) {
      out.errors.push(`adsbx-rapid: 카운터 쓰기 실패 — 이번 틱 중단 ${error instanceof Error ? error.message : ""}`.trim());
      break;
    }
    if (stop) break;
  }
  out.errors = out.errors.slice(0, 3);
  return out;
}
