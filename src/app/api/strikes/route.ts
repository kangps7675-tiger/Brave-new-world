import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { isApiStubMode } from "@/lib/apiStubMode";
import { listStrikeCases, matchStrikeCase } from "@/lib/strikeMatch/server";
import { warRiskRegionAt } from "@/lib/warRisk/regionGeo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/strikes?days=60&limit=15
 * 최근 상선 피격 경보(UKMTO) × 우리 AIS 이력 → 사건별 "맞은 배" 후보.
 * 목록에서는 유료 보강(Datalastic)을 하지 않는다 — 상세(/api/strikes/[id])에서만.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 60));
  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit")) || 15));

  if (isApiStubMode()) {
    const { STRIKES_STUB } = await import("@/lib/strikeMatch/stub");
    return NextResponse.json({ strikes: STRIKES_STUB, stub: true, fetchedAt: new Date().toISOString() });
  }

  try {
    const db = await getDb();
    const cases = await listStrikeCases(db, { days, limit });
    const strikes = [];
    for (const c of cases) {
      const m = await matchStrikeCase(db, c, { enrich: false });
      strikes.push({ ...m, candidates: m.candidates.slice(0, 3), warRiskRegion: warRiskRegionAt(c.lat, c.lng) });
    }
    return NextResponse.json(
      { strikes, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (e) {
    return NextResponse.json(
      { strikes: [], error: e instanceof Error ? e.message : "strikes failed", fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
