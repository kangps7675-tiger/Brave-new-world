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
 * UKR·PSE·ISR·LBN(사망) + CHN·TWN(사건·회색지대).
 */
export async function GET() {
  const appId = resolveHapiAppIdentifier();
  const { start, end } = hapiLookbackWindow();

  try {
    const batches = await Promise.all(
      HAPI_ACTIVE_WAR_LOCATION_CODES.map((code) =>
        fetchLocationRows(code, start, end, appId).catch((err) => {
          console.warn("[hapi-conflict-casualties]", code, err);
          return [] as HapiConflictEventRow[];
        }),
      ),
    );
    const rows = batches.flat();
    const fronts = aggregateActiveFronts(rows);
    // 전 지역 수집 실패·필터로 비면 시드로 응답해 클라이언트가 숫자를 유지
    const resolvedFronts = fronts.length > 0 ? fronts : HAPI_CASUALTY_SEED.fronts;

    const payload: HapiConflictCasualtiesPayload = {
      fronts: resolvedFronts,
      fetchedAt: new Date().toISOString(),
      windowStart: start,
      windowEnd: end,
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
        caveat: `${HAPI_CASUALTY_CAVEAT} · live fetch failed`,
      } satisfies HapiConflictCasualtiesPayload,
      { status: 200, headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  }
}
