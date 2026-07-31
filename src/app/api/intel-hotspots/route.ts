import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import type { StaticPoint } from "@/data/geoTypes";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeoJsonFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: number[] };
  properties?: Record<string, unknown>;
};

function featureToPoint(feature: GeoJsonFeature, index: number): StaticPoint | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const props = feature.properties || {};
  const name =
    (typeof props.name === "string" && props.name) ||
    (typeof props.title === "string" && props.title) ||
    `Hotspot ${index}`;
  return {
    id: `intel-${String(props.id || index)}`,
    kind: "ucdp-event",
    name,
    lat,
    lng,
    tier: 2,
    meta: {
      source: "INTEL_HOTSPOTS_URL",
      category: typeof props.category === "string" ? props.category : null,
    },
  };
}

export async function GET(request: Request) {
  const stub = apiStubResponse("intel-hotspots", request);
  if (stub) return stub;

  const feedUrl = process.env.INTEL_HOTSPOTS_URL;
  if (!feedUrl) {
    return NextResponse.json({
      enabled: false,
      points: [],
      message: "INTEL_HOTSPOTS_URL is not configured",
    });
  }

  try {
    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { enabled: true, points: [], error: `upstream HTTP ${response.status}` },
        { status: 502 },
      );
    }
    const payload = (await response.json()) as {
      features?: GeoJsonFeature[];
      type?: string;
    };
    const points = (payload.features || [])
      .map((feature, index) => featureToPoint(feature, index))
      .filter((point): point is StaticPoint => Boolean(point));

    return NextResponse.json({
      enabled: true,
      receivedAt: new Date().toISOString(),
      count: points.length,
      points,
      attribution: "External provider",
    });
  } catch (error) {
    return NextResponse.json(
      {
        enabled: true,
        points: [],
        error: publicErrorMessage(error, "intel hotspots fetch failed"),
      },
      { status: 502 },
    );
  }
}
