import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import {
  parseSearchParams,
  shipMovementsQuerySchema,
} from "@/lib/apiQuerySchemas";
import { logApiRoute } from "@/lib/apiRouteLog";
import { apiStubResponse } from "@/lib/apiStub";
import {
  listApprovedMapObservations,
  listApprovedTimelineObservations,
  toPublicObservation,
} from "@/lib/shipMovements/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 공개 주간 함선 이동기.
 * ?view=map — 승인+mapEligible+좌표만
 * ?view=timeline (기본) — 승인된 사실(위치 미상 포함)
 */
export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.shipMovements);
  if (limited) return limited;

  const stub = apiStubResponse("ship-movements", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const parsed = parseSearchParams(url.searchParams, shipMovementsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, observations: [], weeks: [] },
      { status: 400 },
    );
  }

  const { lang, week, view, navy } = parsed.data;

  try {
    const db = await getDb();
    const rows =
      view === "map"
        ? await listApprovedMapObservations(db, { week, limit: 160 })
        : await listApprovedTimelineObservations(db, { week, limit: 220 });

    let observations = rows.map((row) => toPublicObservation(row, lang));
    if (navy) {
      observations = observations.filter(
        (o) => (o.navyCode || "").toUpperCase() === navy.toUpperCase(),
      );
    }

    const weeks = [
      ...new Set(observations.map((o) => o.weekStart).filter(Boolean)),
    ] as string[];

    return NextResponse.json(
      {
        observations,
        weeks,
        view,
        lang,
        fetchedAt: new Date().toISOString(),
        disclaimer:
          lang === "en"
            ? "Public observation record — not live AIS positions."
            : "공개 관측 기록입니다. 실시간 AIS 위치가 아닙니다.",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = publicErrorMessage(error, "ship-movements failed");
    logApiRoute("/api/ship-movements", "error", "query_failed", { message });
    return NextResponse.json(
      {
        observations: [],
        weeks: [],
        view,
        lang,
        fetchedAt: new Date().toISOString(),
        error: message,
        disclaimer:
          lang === "en"
            ? "Public observation record — not live AIS positions."
            : "공개 관측 기록입니다. 실시간 AIS 위치가 아닙니다.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
