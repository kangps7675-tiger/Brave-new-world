import { NextResponse } from "next/server";
import {
  aggregateActiveFronts,
  ACLED_HOME_URL,
  HAPI_ACTIVE_WAR_LOCATION_CODES,
  HAPI_ATTRIBUTION,
  HAPI_CASUALTY_CAVEAT,
  HAPI_CASUALTY_SEED,
  HAPI_CONFLICT_EVENTS_URL,
  HAPI_HDX_DATASET_URL,
  hapiLookbackWindow,
  hapiLookbackWindowForLocation,
  resolveHapiAppIdentifier,
  type HapiConflictCasualtiesPayload,
  type HapiConflictEventRow,
} from "@/lib/hapiConflictCasualties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 10_000;

async function fetchLocationRows(
  locationCode: string,
  start: string,
  end: string,
  appId: string,
): Promise<HapiConflictEventRow[]> {
  const rows: HapiConflictEventRow[] = [];
  let offset = 0;
  for (let page = 0; page < 4; page += 1) {
    const url = new URL(HAPI_CONFLICT_EVENTS_URL);
    url.searchParams.set("location_code", locationCode);
    url.searchParams.set("event_type", "political_violence");
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("output_format", "json");
    url.searchParams.set("app_identifier", appId);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "BraveNewWorld/1.0 (casualty fronts; mailto:kangps7675@gmail.com)",
      },
      signal: AbortSignal.timeout(90_000),
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`HAPI ${locationCode} HTTP ${res.status}`);
    }
    const body = (await res.json()) as { data?: HapiConflictEventRow[] };
    const batch = body.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }
  return rows;
}

/**
 * HDX HAPI conflict-events → 열린 전선별 ACLED 집계.
 * 전면전은 개전일부터 누적, 중국·대만은 최근 창.
 */
export async function GET() {
  const appId = resolveHapiAppIdentifier();
  const windowsByLocation: Record<string, { start: string; end: string }> = {};
  for (const code of HAPI_ACTIVE_WAR_LOCATION_CODES) {
    windowsByLocation[code] = hapiLookbackWindowForLocation(code);
  }
  const windowStarts = Object.values(windowsByLocation).map((w) => w.start);
  const windowEnds = Object.values(windowsByLocation).map((w) => w.end);
  const start = windowStarts.sort()[0] ?? hapiLookbackWindow().start;
  const end = windowEnds.sort().at(-1) ?? hapiLookbackWindow().end;

  try {
    const batches = await Promise.all(
      HAPI_ACTIVE_WAR_LOCATION_CODES.map((code) => {
        const window = windowsByLocation[code];
        return fetchLocationRows(code, window.start, window.end, appId).catch((err) => {
          console.warn("[hapi-conflict-casualties]", code, err);
          return [] as HapiConflictEventRow[];
        });
      }),
    );
    const rows = batches.flat();
    const fronts = aggregateActiveFronts(rows);
    const resolvedFronts = fronts.length > 0 ? fronts : HAPI_CASUALTY_SEED.fronts;

    const payload: HapiConflictCasualtiesPayload = {
      fronts: resolvedFronts,
      fetchedAt: new Date().toISOString(),
      windowStart: start,
      windowEnd: end,
      windowsByLocation,
      source: HAPI_ATTRIBUTION,
      cite: [
        "Armed Conflict Location & Event Data Project (ACLED)",
        ACLED_HOME_URL,
        "HDX HAPI · OCHA",
        HAPI_CONFLICT_EVENTS_URL,
        HAPI_HDX_DATASET_URL,
      ],
      caveat:
        fronts.length > 0
          ? HAPI_CASUALTY_CAVEAT
          : `${HAPI_CASUALTY_CAVEAT} · live empty, serving seed`,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[hapi-conflict-casualties]", err);
    return NextResponse.json(
      {
        ...HAPI_CASUALTY_SEED,
        fetchedAt: new Date().toISOString(),
        windowStart: start,
        windowEnd: end,
        windowsByLocation,
        caveat: `${HAPI_CASUALTY_CAVEAT} · live fetch failed`,
      } satisfies HapiConflictCasualtiesPayload,
      { status: 200, headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  }
}
