/**
 * Datalastic vessel_inradius 로 AISstream 공백 해역(홍해·바브엘만데브)을 채운다.
 * 순수 로직(구역·파싱·예산 계산)은 src/lib/datalasticAis.ts.
 *
 * 비용 가드 (선박 1척 = 1크레딧):
 *  - datalastic_usage(월 집계)·datalastic_zone_poll(구역별 마지막 폴링) 테이블이 있어야만 호출한다 (migration 0037).
 *    테이블이 없거나 D1 이 실패하면 예산을 셀 수 없으므로 호출하지 않는다.
 *  - 남은 월 예산이 MIN_REMAINING_CREDITS 미만이면 호출하지 않는다.
 *  - 구역마다 DATALASTIC_POLL_HOURS(기본 6) 간격.
 * 키가 없으면 아무것도 하지 않는다.
 */

import {
  DATALASTIC_ZONES,
  DEFAULT_MONTHLY_CREDITS,
  DEFAULT_POLL_HOURS,
  canSpend,
  categoryFromType,
  monthKey,
  parseInradius,
  zonesDue,
} from "../../../src/lib/datalasticAis";
import type { AisVesselRow, IngestEnv } from "./env";
import { recordStaticIdentity } from "./vesselIdentity";

const BASE = "https://api.datalastic.com/api/v0";

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function fetchDatalasticZones(
  env: IngestEnv,
): Promise<{ vessels: AisVesselRow[]; errors: string[]; creditsSpent: number }> {
  const key = (env.DATALASTIC_API_KEY ?? "").trim();
  if (!key) return { vessels: [], errors: [], creditsSpent: 0 };

  const errors: string[] = [];
  const budget = readPositiveInt(env.DATALASTIC_MONTHLY_CREDITS, DEFAULT_MONTHLY_CREDITS);
  const pollHours = readPositiveInt(env.DATALASTIC_POLL_HOURS, DEFAULT_POLL_HOURS);
  const now = new Date();
  const month = monthKey(now);

  let used = 0;
  const lastPolled: Record<string, string> = {};
  try {
    const u = await env.DB.prepare("SELECT credits FROM datalastic_usage WHERE month = ?").bind(month).first<{ credits: number }>();
    used = u?.credits ?? 0;
    const polls = await env.DB.prepare("SELECT zone_id, polled_at FROM datalastic_zone_poll").all<{ zone_id: string; polled_at: string }>();
    for (const r of polls.results ?? []) lastPolled[r.zone_id] = r.polled_at;
  } catch (error) {
    return {
      vessels: [],
      errors: [`datalastic: 예산 테이블 읽기 실패 — 호출 안 함 (migration 0037?) ${error instanceof Error ? error.message : ""}`.trim()],
      creditsSpent: 0,
    };
  }

  const due = zonesDue(DATALASTIC_ZONES, lastPolled, now.getTime(), pollHours);
  const rows = new Map<string, AisVesselRow>();
  let creditsSpent = 0;

  for (const zone of due) {
    if (!canSpend(used + creditsSpent, budget)) {
      errors.push(`datalastic: 월 크레딧 예산 소진(${used + creditsSpent}/${budget}) — ${zone.id} 이후 호출 중단`);
      break;
    }
    try {
      const url = new URL(`${BASE}/vessel_inradius`);
      url.searchParams.set("api-key", key);
      url.searchParams.set("lat", String(zone.lat));
      url.searchParams.set("lon", String(zone.lon));
      url.searchParams.set("radius", String(zone.radiusNm));
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) {
        errors.push(`datalastic ${zone.id}: HTTP ${res.status}`);
        continue;
      }
      const parsed = parseInradius(await res.json());
      if (!parsed.ok) {
        errors.push(`datalastic ${zone.id}: success=false`);
        continue;
      }
      const spent = Math.min(500, parsed.total);
      creditsSpent += spent;
      for (const v of parsed.vessels) {
        const category = categoryFromType(v.type);
        rows.set(v.mmsi, {
          id: v.mmsi,
          mmsi: v.mmsi,
          ship_name: v.name,
          lat: v.lat,
          lng: v.lng,
          sog: v.sog,
          cog: v.cog,
          true_heading: v.heading,
          ship_type: null,
          ship_type_label: v.typeSpecific ?? v.type,
          category,
          provider: "datalastic",
          timestamp: v.at,
          draught: null,
          destination: v.destination,
          length_m: null,
          beam_m: null,
        });
        if (v.imo) recordStaticIdentity(v.mmsi, { ImoNumber: v.imo, Name: v.name });
      }
      const stamp = now.toISOString();
      await env.DB.batch([
        env.DB
          .prepare(
            `INSERT INTO datalastic_usage (month, credits, calls, updated_at) VALUES (?, ?, 1, ?)
             ON CONFLICT(month) DO UPDATE SET credits = credits + excluded.credits, calls = calls + 1, updated_at = excluded.updated_at`,
          )
          .bind(month, spent, stamp),
        env.DB
          .prepare(
            `INSERT INTO datalastic_zone_poll (zone_id, polled_at, vessel_count) VALUES (?, ?, ?)
             ON CONFLICT(zone_id) DO UPDATE SET polled_at = excluded.polled_at, vessel_count = excluded.vessel_count`,
          )
          .bind(zone.id, stamp, parsed.vessels.length),
      ]);
    } catch (error) {
      errors.push(`datalastic ${zone.id}: ${error instanceof Error ? error.message : "fetch failed"}`);
    }
  }

  return { vessels: [...rows.values()], errors: errors.slice(0, 4), creditsSpent };
}
