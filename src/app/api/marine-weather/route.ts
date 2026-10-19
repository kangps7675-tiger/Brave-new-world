import { and, asc, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { marineWeather, type MarineWeatherDbRow } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { beaufort, seaStateKo } from "@/lib/marineWeather/gfsWave";
import { MARINE_POINTS, MARINE_REGIONS, type MarineRegion } from "@/lib/marineWeather/zones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATTRIBUTION = "NOAA NCEP GFS-Wave (WAVEWATCH III) · public domain";
const DISCLAIMER =
  "전구 모델(격자 약 28km) 예보입니다. 연안·해협 안쪽은 실제와 다를 수 있고 항해용 공식 예보를 대체하지 않습니다.";

function decorate(r: MarineWeatherDbRow) {
  const p = MARINE_POINTS.find((x) => x.id === r.pointId);
  return {
    pointId: r.pointId,
    nameKo: p?.nameKo ?? r.pointId,
    nameEn: p?.nameEn ?? r.pointId,
    region: r.region,
    cycle: r.cycle,
    fhour: r.fhour,
    validTime: r.validTime,
    gridLat: r.gridLat,
    gridLng: r.gridLng,
    offsetCells: r.offsetCells,
    hsM: r.hsM,
    periodS: r.periodS,
    dirDeg: r.dirDeg,
    windMs: r.windMs,
    windDirDeg: r.windDirDeg,
    swellM: r.swellM,
    windWaveM: r.windWaveM,
    seaStateKo: seaStateKo(r.hsM),
    beaufort: beaufort(r.windMs),
  };
}

/**
 * GET /api/marine-weather?region=red-sea&historyDays=2
 *  - forecast: 가장 최근 사이클의 0~72시간 예보 (지점별)
 *  - history: 최근 historyDays 일의 분석값(f000) — "피격 당시 바다 상태" 확인용
 * cron 적재분(D1)을 읽기만 한다. 테이블 미마이그레이션 시 빈 배열.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const regionRaw = url.searchParams.get("region");
  const region = MARINE_REGIONS.includes(regionRaw as MarineRegion) ? (regionRaw as MarineRegion) : null;
  const historyDays = Math.min(30, Math.max(0, Number(url.searchParams.get("historyDays") ?? 2) || 0));
  const meta = { attribution: ATTRIBUTION, disclaimer: DISCLAIMER, region };

  if (isApiStubMode()) {
    return NextResponse.json({ ...meta, cycle: null, forecast: [], history: [], stub: true });
  }

  try {
    const db = await getDb();
    const regionFilter = region ? eq(marineWeather.region, region) : undefined;

    const latest = await db
      .select({ cycle: marineWeather.cycle })
      .from(marineWeather)
      .where(regionFilter)
      .orderBy(desc(marineWeather.cycle))
      .limit(1);
    const cycle = latest[0]?.cycle ?? null;

    const forecast = cycle
      ? await db
          .select()
          .from(marineWeather)
          .where(regionFilter ? and(eq(marineWeather.cycle, cycle), regionFilter) : eq(marineWeather.cycle, cycle))
          .orderBy(asc(marineWeather.pointId), asc(marineWeather.fhour))
      : [];

    let history: MarineWeatherDbRow[] = [];
    if (historyDays > 0) {
      const since = new Date(Date.now() - historyDays * 86_400_000).toISOString();
      const conds = [eq(marineWeather.fhour, 0), gte(marineWeather.validTime, since)];
      if (region) conds.push(eq(marineWeather.region, region));
      history = await db
        .select()
        .from(marineWeather)
        .where(and(...conds))
        .orderBy(asc(marineWeather.pointId), asc(marineWeather.validTime))
        .limit(2000);
    }

    return NextResponse.json(
      {
        ...meta,
        cycle,
        forecast: forecast.map(decorate),
        history: history.map(decorate),
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch {
    return NextResponse.json(
      { ...meta, cycle: null, forecast: [], history: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
