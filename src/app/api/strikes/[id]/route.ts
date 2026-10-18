import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { isApiStubMode } from "@/lib/apiStubMode";
import { getStrikeCase, matchStrikeCase } from "@/lib/strikeMatch/server";
import { warRiskRegionAt } from "@/lib/warRisk/regionGeo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/strikes/:id?radiusKm=60&hours=6
 * 사건 1건 상세 — 후보 10척 + (키 있으면) Datalastic 항적 보강.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url);
  const radiusKm = Math.min(150, Math.max(5, Number(url.searchParams.get("radiusKm")) || 60));
  const hours = Math.min(24, Math.max(1, Number(url.searchParams.get("hours")) || 6));

  if (isApiStubMode()) {
    const { STRIKES_STUB } = await import("@/lib/strikeMatch/stub");
    const hit = STRIKES_STUB.find((s) => s.incident.id === params.id) ?? STRIKES_STUB[0];
    return NextResponse.json({ strike: hit, stub: true });
  }

  try {
    const db = await getDb();
    const c = await getStrikeCase(db, params.id);
    if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
    const m = await matchStrikeCase(db, c, { radiusKm, hours, enrich: true });
    return NextResponse.json(
      { strike: { ...m, warRiskRegion: warRiskRegionAt(c.lat, c.lng) } },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "strike failed" }, { status: 500 });
  }
}
