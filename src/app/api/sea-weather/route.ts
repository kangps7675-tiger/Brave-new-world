import { NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { MARINE_REGIONS, type MarineRegion } from "@/lib/marineWeather/zones";
import { fetchSeaWeather, seaWeatherPoint, type SeaWeatherNow } from "@/lib/seaWeather/datalastic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 해역 하나당 20분에 한 번만 Datalastic 을 부른다 (크레딧 보호). 인스턴스별 메모리 + CDN 캐시 이중. */
const TTL_MS = 20 * 60_000;
const cache = new Map<MarineRegion, { at: number; now: SeaWeatherNow }>();

/**
 * GET /api/sea-weather?region=red-sea
 * 해역 대표 지점의 현재 해상·기상 (Datalastic). 키는 서버에서만 쓴다.
 * 응답: { enabled, region, point, now, fetchedAt } — 키 없음·스텁 모드·실패는 enabled:false/now:null 로
 * 내려서 화면이 "자료 없음"으로 읽게 한다 (가짜 숫자 금지).
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("region");
  const region = MARINE_REGIONS.find((r) => r === raw);
  if (!region) return NextResponse.json({ error: "region 이 필요합니다" }, { status: 400 });
  const point = seaWeatherPoint(region)!;

  if (isApiStubMode()) {
    return NextResponse.json({ enabled: false, stub: true, region, point, now: null });
  }

  const hit = cache.get(region);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(
      { enabled: true, region, point, now: hit.now, fetchedAt: new Date(hit.at).toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600" } },
    );
  }

  const r = await fetchSeaWeather(point.lat, point.lng);
  if (r.ok) {
    cache.set(region, { at: Date.now(), now: r.now });
    return NextResponse.json(
      { enabled: true, region, point, now: r.now, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600" } },
    );
  }
  // 실패 시 마지막 성공값이 있으면 오래됐다고 표시해 내려준다
  if (hit) {
    return NextResponse.json(
      { enabled: true, stale: true, region, point, now: hit.now, fetchedAt: new Date(hit.at).toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
  return NextResponse.json(
    { enabled: r.reason !== "no-key", reason: r.reason, ...("status" in r && r.status ? { status: r.status } : {}), region, point, now: null },
    { headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}
