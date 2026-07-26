import { NextResponse } from "next/server";
import { getDb } from "@/db";
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
  const stub = apiStubResponse("ship-movements", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ko";
  const week = url.searchParams.get("week");
  const view = url.searchParams.get("view") === "map" ? "map" : "timeline";
  const navy = url.searchParams.get("navy");

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
  } catch {
    return NextResponse.json(
      {
        observations: [],
        weeks: [],
        view,
        lang,
        fetchedAt: new Date().toISOString(),
        disclaimer:
          lang === "en"
            ? "Public observation record — not live AIS positions."
            : "공개 관측 기록입니다. 실시간 AIS 위치가 아닙니다.",
      },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
