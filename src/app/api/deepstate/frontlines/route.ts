import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEEPSTATE_LAST_URL,
  deepstateToOccupiedGeoJson,
  emptyOccupiedGeoJson,
} from "@/lib/deepstate/toOccupiedGeoJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SNAPSHOT_REL = path.join("public", "data", "ukraine-occupied-deepstate.json");

async function loadSnapshot() {
  try {
    const filePath = path.join(process.cwd(), SNAPSHOT_REL);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as { features?: unknown[] };
    if (Array.isArray(parsed?.features) && parsed.features.length > 0) {
      return parsed;
    }
  } catch {
    // missing snapshot — ok
  }
  return null;
}

/**
 * 임시: DeepState 점령 영토 GeoJSON.
 * osiris-ref `/api/frontlines`와 동일 원본, 응답은 BNW role/fill로 정규화.
 * LIVEUAMAP 영토 폴링 전 스냅샷·라이브 폴백.
 */
export async function GET() {
  try {
    const res = await fetch(DEEPSTATE_LAST_URL, {
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const data: unknown = await res.json();
      const occupied = deepstateToOccupiedGeoJson(data, "macro");
      if (occupied.features.length > 0) {
        return NextResponse.json(
          {
            occupied,
            source: "deepstate-live",
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
            },
          },
        );
      }
    }
  } catch (error) {
    console.error("DeepState frontlines fetch error:", error);
  }

  const snapshot = await loadSnapshot();
  if (snapshot) {
    return NextResponse.json(
      {
        occupied: snapshot,
        source: "deepstate-snapshot",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      },
    );
  }

  return NextResponse.json(
    {
      occupied: emptyOccupiedGeoJson(),
      source: "empty",
      error: "DeepState unavailable",
      timestamp: new Date().toISOString(),
    },
    { status: 502 },
  );
}
