import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  airRaidHistoryQuerySchema,
  parseSearchParams,
} from "@/lib/apiQuerySchemas";
import {
  resolveAirRaidHistoryWindow,
  searchAirRaidHistory,
  type AirRaidHistorySearchInput,
} from "@/lib/airRaidHistorySearch";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 사건 파일용 공습 이력 검색 — 시각 창 + 반경.
 *
 * GET /api/air-raid-history?lat=&lng=&at=&windowHours=1&radiusKm=30&source=all
 * 또는 from=&to=
 *
 * D1 `neptun_threat_samples` / `air_raid_alert_intervals` (migration 0029) 필요.
 * 테이블 없으면 빈 결과로 안전하게 폴백.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseSearchParams(url.searchParams, airRaidHistoryQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const q = parsed.data;
  const window = resolveAirRaidHistoryWindow({
    at: q.at,
    windowHours: q.windowHours,
    from: q.from,
    to: q.to,
  });
  if ("error" in window) {
    return NextResponse.json(
      { error: window.error },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const sources: AirRaidHistorySearchInput["sources"] =
    q.source === "all"
      ? ["neptun", "tzeva-adom"]
      : q.source === "neptun"
        ? ["neptun"]
        : ["tzeva-adom"];

  const input: AirRaidHistorySearchInput = {
    lat: q.lat,
    lng: q.lng,
    fromIso: window.fromIso,
    toIso: window.toIso,
    radiusKm: q.radiusKm,
    sources,
    maxThreats: q.maxThreats,
    maxAlerts: q.maxAlerts,
  };

  if (isApiStubMode()) {
    return NextResponse.json(
      {
        ...emptyPayload(input),
        stub: true,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  try {
    const db = await getDb();
    const result = await searchAirRaidHistory(db, input);
    return NextResponse.json(
      { ...result, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "air-raid-history failed";
    return NextResponse.json(
      {
        ...emptyPayload(input),
        error: message,
        fetchedAt: new Date().toISOString(),
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }
}

function emptyPayload(input: AirRaidHistorySearchInput) {
  return {
    query: input,
    threats: [],
    alerts: [],
    summary: {
      threatCount: 0,
      alertCount: 0,
      evidenceGradeAlertCount: 0,
      byFacet: {
        time: { strong: 0, medium: 0, weak: 0 },
        means: { strong: 0, medium: 0, weak: 0 },
        place: { strong: 0, medium: 0, weak: 0 },
      },
      absenceNote:
        "이 시각·반경에서 경보·위협 기록이 없음. 근거 부재는 반박이 아니라 「확인 못함」 후보(관측 누락 가능).",
    },
    commercialUseNote:
      "NEPTUN·Tzeva Adom 모두 상업 이용 시 제공자 문의 필요. 허락 전 결과물에는 「참고(내부)」로만 표시.",
  };
}
