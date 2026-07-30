import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { detectAiWarZonesDemo } from "@/lib/aiWarZoneDemo";
import { cachedFetchJson } from "@/lib/apiCache";
import { apiStubResponse } from "@/lib/apiStub";
import { conflictZoneToOutlineAndHatchPaths } from "@/lib/disputeHatch";
import type { ConflictZoneFeature } from "@/data/geoTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 120 * 1000;

function attachHatchPaths(zones: ConflictZoneFeature[]): ConflictZoneFeature[] {
  return zones.map((zone) => ({
    ...zone,
    hatchPaths: conflictZoneToOutlineAndHatchPaths(zone),
  }));
}

export async function GET(request: Request) {
  const stub = apiStubResponse("conflict-zones", request);
  if (stub) return stub;

  try {
    const { data, cached } = await cachedFetchJson("ai-war-zones-demo-v2-hatch", TTL_MS, async () =>
      attachHatchPaths((await detectAiWarZonesDemo()) as ConflictZoneFeature[]),
    );
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      mode: "ai-demo",
      enabled: true,
      count: data.length,
      zones: data,
      hatchPrecomputed: true,
      attribution: "AI war-zone demo (Natural Earth + GDELT war clustering, no external AI API)",
    });
  } catch (error) {
    return NextResponse.json(
      {
        zones: [],
        count: 0,
        mode: "ai-demo",
        error: publicErrorMessage(error, "ai-war-zones failed"),
      },
      { status: 500 },
    );
  }
}
