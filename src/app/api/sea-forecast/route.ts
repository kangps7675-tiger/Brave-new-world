import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { isApiStubMode } from "@/lib/apiStubMode";
import { loadRegionForecast } from "@/lib/marineWeather/server";
import { MARINE_REGIONS } from "@/lib/marineWeather/zones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sea-forecast?region=red-sea
 * 해역 대표 지점들의 "지금 / +24h / +48h / +72h" 해상 상태 (NOAA GFS-Wave, cron 이 D1 에 적재한 값).
 * 외부 호출·유료 크레딧 없음. 자료가 없으면 points 가 비고 cycle 이 null — 화면은 "자료 없음"으로 읽는다.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("region");
  const region = MARINE_REGIONS.find((r) => r === raw);
  if (!region) return NextResponse.json({ error: "region 이 필요합니다" }, { status: 400 });

  if (isApiStubMode()) {
    return NextResponse.json({ region, cycle: null, current: {}, currentError: null, summary: { offsetsH: [], points: [], peak: null }, points: [], stub: true });
  }

  try {
    const db = await getDb();
    const now = Date.now();
    const f = await loadRegionForecast(db, region, now);
    return NextResponse.json(
      { ...f, now: new Date(now).toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch {
    return NextResponse.json(
      { region, cycle: null, current: {}, currentError: null, summary: { offsetsH: [], points: [], peak: null }, points: [], now: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
