import { NextResponse } from "next/server";
import { fetchLatestGdeltEvents } from "@/lib/gdeltParse";
import { fetchGdeltThemeCached, type GdeltTheme } from "@/lib/gdeltTheme";
import { apiStubResponse } from "@/lib/apiStub";
import { readGdeltPointsFromD1, readGdeltFromIngestWorker } from "@/lib/d1LiveSnapshots";
import {
  GDELT_THEMES,
  gdeltQuerySchema,
  parseSearchParams,
} from "@/lib/apiQuerySchemas";
import { fetchOceanGeopoliticsGdelt } from "@/lib/gdeltOceanGeo";
import type { ConflictEvent, EventTier } from "@/data/geoTypes";
import { isOceanGeopoliticsTag } from "@/lib/oceanGeopoliticsTheaters";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const GDELT_CDN = publicCacheHeaders(CDN_CACHE.gdelt);

function tierFromQueryTag(tag: string | null): EventTier {
  const t = (tag || "").toLowerCase();
  if (t.includes("alliance") || t.includes("axis-network")) return "alliance";
  if (t.includes("land-war")) return "war";
  if (t.includes("protest")) return "protest";
  // 대양·해상·전장 tension → 외교·경쟁 태그
  return "diplomatic";
}

function mapPoint(point: {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  url: string | null;
  mentionCount: number | null;
  queryTag: string | null;
}): ConflictEvent {
  const title = point.name || point.queryTag || "GDELT";
  return {
    id: point.id,
    globalEventId: point.id,
    eventDate: null,
    country: null,
    lat: point.lat,
    lng: point.lng,
    category: "Strategic developments",
    severity: 2,
    goldsteinScale: -2,
    sourceUrl: point.url,
    title,
    createdAt: null,
    eventTier: isOceanGeopoliticsTag(point.queryTag || title)
      ? "diplomatic"
      : tierFromQueryTag(point.queryTag),
  };
}

function mergeUnique(base: ConflictEvent[], extra: ConflictEvent[]): ConflictEvent[] {
  const seen = new Set(base.map((e) => e.id));
  const out = [...base];
  for (const ev of extra) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    out.push(ev);
  }
  return out;
}

export async function GET(request: Request) {
  const stub = apiStubResponse("gdelt", request);
  if (stub) return stub;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseSearchParams(searchParams, gdeltQuerySchema);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: parsed.error,
          issues: parsed.issues,
          hint: "theme은 cyber|election만 허용. 전쟁·외교 등은 theme 없이 GET /api/gdelt → events[].eventTier",
          allowedThemes: GDELT_THEMES,
          events: [],
        },
        { status: 400 },
      );
    }
    const theme = (parsed.data.theme ?? null) as GdeltTheme | null;
    const preferLive = Boolean(parsed.data.live);

    if (theme === "cyber" || theme === "election") {
      if (!preferLive) {
        return NextResponse.json(
          {
            theme,
            cached: false,
            waiting: true,
            fetchedAt: new Date().toISOString(),
            events: [],
            attribution: "GDELT theme — use ?live=1 or future cron table",
          },
          { headers: NO_STORE_HEADERS },
        );
      }
      const { data, cached } = await fetchGdeltThemeCached(theme);
      return NextResponse.json(
        {
          theme,
          cached,
          fetchedAt: new Date().toISOString(),
          events: data,
          attribution: "GDELT Project",
        },
        { headers: GDELT_CDN },
      );
    }

    // Cron 스냅샷 + 대양(태평양·대서양·북극) Geo 보강
    if (!preferLive) {
      let events: ConflictEvent[] = [];
      let fetchedAt = new Date().toISOString();
      let source: "d1" | "ingest-worker" | "ocean-geo" = "d1";
      let cached = false;

      const fromD1 = await readGdeltPointsFromD1(1200);
      if (fromD1 && fromD1.count > 0) {
        events = fromD1.events.map(mapPoint);
        fetchedAt = fromD1.fetchedAt;
        cached = true;
        source = "d1";
      } else {
        const fromWorker = await readGdeltFromIngestWorker(1200);
        if (fromWorker && fromWorker.count > 0) {
          events = fromWorker.events.map(mapPoint);
          fetchedAt = fromWorker.fetchedAt;
          cached = true;
          source = "ingest-worker";
        }
      }

      try {
        const ocean = await fetchOceanGeopoliticsGdelt(72);
        if (ocean.length > 0) {
          events = mergeUnique(events, ocean);
          if (events.length === ocean.length) source = "ocean-geo";
        }
      } catch {
        /* ocean geo optional */
      }

      return NextResponse.json(
        {
          fetchedAt,
          cached,
          source,
          waiting: events.length === 0,
          events,
          attribution:
            "GDELT Project · land theaters + Pacific/Atlantic/Arctic competition",
        },
        { headers: events.length === 0 ? NO_STORE_HEADERS : GDELT_CDN },
      );
    }

    const sliceCount = parsed.data.slices;

    const payload = await fetchLatestGdeltEvents(
      sliceCount && sliceCount > 0 ? { sliceCount } : undefined,
    );
    try {
      const ocean = await fetchOceanGeopoliticsGdelt(48);
      return NextResponse.json(
        {
          ...payload,
          events: mergeUnique((payload.events as ConflictEvent[]) || [], ocean),
        },
        { headers: GDELT_CDN },
      );
    } catch {
      return NextResponse.json(payload, { headers: GDELT_CDN });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "GDELT 수신 실패",
        events: [],
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
