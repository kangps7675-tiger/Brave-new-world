import { NextResponse } from "next/server";
import type { GlobeLodTier } from "@/lib/globeLod";
import { isViewportPathLayer } from "@/lib/viewportPathTypes";
import { queryViewportPaths } from "@/lib/serverViewportLayers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIERS = new Set<GlobeLodTier>([
  "global",
  "continent",
  "regional",
  "near",
  "village",
]);

/**
 * 대형 transport JSON을 서버에서 expand+뷰포트 필터 후 일부만 반환.
 * 클라가 railroads.json 등 수 MB를 통째로 받지 않게 한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layerRaw = searchParams.get("layer") || "railroads";
  if (!isViewportPathLayer(layerRaw)) {
    return NextResponse.json({ error: "invalid-layer", paths: [] }, { status: 400 });
  }

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required", paths: [] }, { status: 400 });
  }

  const tierRaw = (searchParams.get("tier") || "regional") as GlobeLodTier;
  const tier = TIERS.has(tierRaw) ? tierRaw : "regional";
  const radiusDeg = Math.min(
    80,
    Math.max(0, Number(searchParams.get("radius") || 16)),
  );
  const max = searchParams.get("max") ? Number(searchParams.get("max")) : undefined;
  const maxScalerank = searchParams.get("maxScalerank")
    ? Number(searchParams.get("maxScalerank"))
    : undefined;
  const arterialMaxRank = searchParams.get("arterialMaxRank")
    ? Number(searchParams.get("arterialMaxRank"))
    : undefined;
  const viewerMode =
    searchParams.get("viewerMode") === "economy" ? "economy" : "conflict";

  try {
    const result = await queryViewportPaths(layerRaw, {
      lat,
      lng,
      radiusDeg,
      tier,
      max: Number.isFinite(max) ? max : undefined,
      maxScalerank: Number.isFinite(maxScalerank) ? maxScalerank : undefined,
      arterialMaxRank: Number.isFinite(arterialMaxRank) ? arterialMaxRank : undefined,
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
