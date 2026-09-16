/**
 * 국가 ISO3 → 중심점(lat/lng) 경량 조회.
 *
 * countries.json(2MB, 폴리곤 포함) 전체를 클라이언트로 보내지 않기 위한
 * 파생 엔드포인트 — 서버에서 이미 로드된 CountryFeature[].center 만 추려서 돌려준다.
 *
 * 첫 소비자: gtaTradePaths.ts (GTA 무역조치의 implementer→affected 호 렌더링).
 * GTA 레코드에는 좌표가 없고 관할국 코드(ISO3)만 있어, 이 조회가 없으면
 * 호를 그릴 수 없다. 정적 지리 데이터라 캐시를 길게 둔다.
 */
import { NextResponse } from "next/server";
import { loadAllCountries } from "@/lib/serverViewportLayers";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CountryCentroidEntry = { iso3: string; lat: number; lng: number };

export async function GET() {
  try {
    const countries = await loadAllCountries();
    const seen = new Set<string>();
    const centroids: CountryCentroidEntry[] = [];

    for (const country of countries) {
      const iso3 = country.isoA3;
      if (!iso3 || seen.has(iso3)) continue;
      const lat = country.center?.lat;
      const lng = country.center?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      seen.add(iso3);
      centroids.push({ iso3, lat: lat as number, lng: lng as number });
    }

    return NextResponse.json(
      { count: centroids.length, centroids },
      { headers: publicCacheHeaders(CDN_CACHE.staticLayer) },
    );
  } catch {
    return NextResponse.json(
      { count: 0, centroids: [] as CountryCentroidEntry[] },
      { headers: publicCacheHeaders(CDN_CACHE.staticLayer) },
    );
  }
}
