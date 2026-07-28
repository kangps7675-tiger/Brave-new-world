import { NextResponse } from "next/server";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  parseSearchParams,
  viewportPathsQuerySchema,
} from "@/lib/apiQuerySchemas";
import { isViewportPathLayer } from "@/lib/viewportPathTypes";
import { queryViewportPaths } from "@/lib/serverViewportLayers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 대형 transport JSON을 서버에서 expand+뷰포트 필터 후 일부만 반환.
 * 클라가 railroads.json 등 수 MB를 통째로 받지 않게 한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, viewportPathsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, paths: [] },
      { status: 400 },
    );
  }

  const {
    layer: layerRaw,
    lat,
    lng,
    tier,
    radius: radiusDeg,
    max,
    maxScalerank,
    arterialMaxRank,
    viewerMode,
  } = parsed.data;

  if (!isViewportPathLayer(layerRaw)) {
    return NextResponse.json({ error: "invalid-layer", paths: [] }, { status: 400 });
  }

  try {
    const result = await queryViewportPaths(layerRaw, {
      lat,
      lng,
      radiusDeg,
      tier: tier as GlobeLodTier,
      max,
      maxScalerank,
      arterialMaxRank,
      viewerMode,
    });

    return NextResponse.json(
      {
        layer: layerRaw,
        tier,
        pathCount: result.returned,
        totalPathCount: result.total,
        paths: result.paths,
        source: "server-viewport",
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "viewport-paths-failed",
        paths: [],
      },
      { status: 502 },
    );
  }
}
