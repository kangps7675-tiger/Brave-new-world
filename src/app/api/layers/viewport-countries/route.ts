import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import type { GlobeLodTier } from "@/lib/globeLod";
import { queryViewportCountries } from "@/lib/serverViewportLayers";

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
 * 국가 폴리곤 전체를 받지 않고 뷰포트·LOD에 맞는 일부만 반환.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required", countries: [] }, { status: 400 });
  }

  const tierRaw = (searchParams.get("tier") || "regional") as GlobeLodTier;
  const tier = TIERS.has(tierRaw) ? tierRaw : "regional";
  const radiusDeg = Math.min(
    90,
    Math.max(0, Number(searchParams.get("radius") || 28)),
  );
  const max = searchParams.get("max") ? Number(searchParams.get("max")) : undefined;

  try {
    const result = await queryViewportCountries({
      lat,
      lng,
      radiusDeg,
      tier,
      max: Number.isFinite(max) ? max : undefined,
    });

    return NextResponse.json(
      {
        tier,
        countryCount: result.returned,
        totalCountryCount: result.total,
        countries: result.countries,
        source: "server-viewport",
      },
      {
        headers: {
          "Cache-Control": "private, max-age=45",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(error, "viewport-countries-failed"),
        countries: [],
      },
      { status: 502 },
    );
  }
}
