import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { navareaFeatures } from "@/db/schema";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 200;

/**
 * NAVAREA in-force 해상 경고 (JHOD / NGA TXT → cron 스냅샷 교체분).
 * D1 읽기 전용 — 서버가 상류 TXT를 매 요청마다 찌르지 않음.
 * 테이블 미마이그레이션 시 빈 FeatureCollection으로 폴백.
 *
 * Query: ?region=XI (optional)
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("navarea", request);
  if (stub) return stub;

  try {
    const db = await getDb();
    const region = new URL(request.url).searchParams.get("region")?.trim().toUpperCase() || null;

    const rows = region
      ? await db
          .select()
          .from(navareaFeatures)
          .where(eq(navareaFeatures.region, region))
          .orderBy(desc(navareaFeatures.warningDate))
          .limit(LIMIT)
      : await db
          .select()
          .from(navareaFeatures)
          .orderBy(desc(navareaFeatures.warningDate))
          .limit(LIMIT);

    const features = rows.map((row) => {
      let geometry: GeoJSON.Geometry;
      try {
        geometry = JSON.parse(row.geojson) as GeoJSON.Geometry;
      } catch {
        geometry = { type: "Point", coordinates: [row.lng ?? 0, row.lat ?? 0] };
      }
      return {
        type: "Feature" as const,
        geometry,
        properties: {
          id: row.id,
          region: row.region,
          source: row.source,
          date: row.warningDate,
          areaHint: row.areaHint ?? "",
          description: row.description,
          geometryType: row.geometryType,
          radiusNm: row.radiusNm,
          lat: row.lat,
          lng: row.lng,
        },
      };
    });

    return NextResponse.json(
      {
        type: "FeatureCollection",
        features,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json(
      {
        type: "FeatureCollection",
        features: [],
        fetchedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
