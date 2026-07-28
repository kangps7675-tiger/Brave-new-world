import { NextResponse } from "next/server";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  parseSearchParams,
  viewportPointsQuerySchema,
} from "@/lib/apiQuerySchemas";
import {
  isViewportPointLayer,
  queryViewportMilitaryBaseAreas,
  queryViewportPoints,
} from "@/lib/serverViewportPoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 공항·항구·기지 등 정적 포인트를 서버에서 뷰포트 필터 후 일부만 반환.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, viewportPointsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, points: [] },
      { status: 400 },
    );
  }

  const { layer, lat, lng, tier, radius: radiusDeg, max } = parsed.data;

  try {
    if (layer === "military-base-areas") {
      const result = await queryViewportMilitaryBaseAreas({
        lat,
        lng,
        radiusDeg,
        tier: tier as GlobeLodTier,
        max,
      });
      return NextResponse.json(
        {
          layer,
          tier,
          areaCount: result.returned,
          totalAreaCount: result.total,
          areas: result.areas,
          source: "server-viewport",
        },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    if (!isViewportPointLayer(layer)) {
      return NextResponse.json({ error: "invalid-layer", points: [] }, { status: 400 });
    }

    const result = await queryViewportPoints(layer, {
      lat,
      lng,
      radiusDeg,
      tier: tier as GlobeLodTier,
      max,
    });

    return NextResponse.json(
      {
        layer,
        tier,
        pointCount: result.returned,
        totalPointCount: result.total,
        points: result.points,
        source: "server-viewport",
      },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "viewport-points-failed",
        points: [],
      },
      { status: 502 },
    );
  }
}
