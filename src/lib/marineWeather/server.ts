/**
 * 해상 기상 — D1 읽기 쪽. cron 이 채운 `marine_weather` 만 읽는다(외부 호출 없음, 크레딧 0).
 * 테이블이 없거나 비어 있으면 조용히 빈 결과 — 화면은 "자료 없음"으로 읽는다.
 */

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { marineWeather } from "@/db/schema";
import { MARINE_POINTS, type MarineRegion } from "@/lib/marineWeather/zones";
import {
  INCIDENT_MAX_OFFSET_MIN,
  INCIDENT_MAX_POINT_KM,
  seaAtIncident,
  summarizeForecast,
  type ForecastSummary,
  type SeaAtIncident,
  type WxRow,
} from "@/lib/marineWeather/summary";

const SELECT = {
  pointId: marineWeather.pointId,
  validTime: marineWeather.validTime,
  gridLat: marineWeather.gridLat,
  gridLng: marineWeather.gridLng,
  hsM: marineWeather.hsM,
  periodS: marineWeather.periodS,
  windMs: marineWeather.windMs,
  windDirDeg: marineWeather.windDirDeg,
  swellM: marineWeather.swellM,
};

/** 사건 하나의 당시 바다 (분석값 f000). 없으면 null. */
export async function loadSeaAtIncident(
  db: AppDb,
  c: { lat: number; lng: number; occurredAt: string },
): Promise<SeaAtIncident | null> {
  const t = Date.parse(c.occurredAt);
  if (!Number.isFinite(t)) return null;
  const pad = INCIDENT_MAX_OFFSET_MIN * 60_000;
  // 지점 간 거리(≤200km ≈ 2°) 밖은 어차피 못 쓰니 상자로 먼저 거른다
  const deg = INCIDENT_MAX_POINT_KM / 111 + 0.5;
  try {
    const rows: WxRow[] = await db
      .select(SELECT)
      .from(marineWeather)
      .where(
        and(
          eq(marineWeather.fhour, 0),
          gte(marineWeather.validTime, new Date(t - pad).toISOString()),
          lte(marineWeather.validTime, new Date(t + pad).toISOString()),
          gte(marineWeather.gridLat, c.lat - deg),
          lte(marineWeather.gridLat, c.lat + deg),
        ),
      )
      .limit(200);
    return seaAtIncident(
      rows.filter((r) => Math.abs(r.gridLng - c.lng) <= deg * 1.6),
      { lat: c.lat, lng: c.lng, atIso: c.occurredAt },
    );
  } catch {
    return null;
  }
}

export type RegionForecast = {
  region: MarineRegion;
  cycle: string | null;
  summary: ForecastSummary;
  points: Array<{ id: string; nameKo: string; nameEn: string }>;
};

/** 해역의 가장 최근 사이클 예보 요약 */
export async function loadRegionForecast(db: AppDb, region: MarineRegion, nowMs = Date.now()): Promise<RegionForecast> {
  const points = MARINE_POINTS.filter((p) => p.region === region).map((p) => ({
    id: p.id,
    nameKo: p.nameKo,
    nameEn: p.nameEn,
  }));
  const empty: RegionForecast = { region, cycle: null, summary: summarizeForecast([], nowMs), points };
  try {
    const latest = await db
      .select({ cycle: marineWeather.cycle })
      .from(marineWeather)
      .where(eq(marineWeather.region, region))
      .orderBy(desc(marineWeather.cycle))
      .limit(1);
    const cycle = latest[0]?.cycle;
    if (!cycle) return empty;
    const rows: WxRow[] = await db
      .select(SELECT)
      .from(marineWeather)
      .where(and(eq(marineWeather.cycle, cycle), eq(marineWeather.region, region)))
      .orderBy(asc(marineWeather.pointId), asc(marineWeather.fhour));
    return { region, cycle, summary: summarizeForecast(rows, nowMs), points };
  } catch {
    return empty;
  }
}
