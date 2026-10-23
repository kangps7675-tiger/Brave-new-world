import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { aisVessels } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { pickIncidentMmsis } from "@/lib/incidentVessels";
import { listStrikeCases, matchStrikeCase } from "@/lib/strikeMatch/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/incident-vessels?days=14
 * 최근 사건에 걸린 선박(확인·유력=1, 후보=2)의 마지막 AIS 위치. 지도에서 일반 선박과 구분해 띄우는 용도.
 * 위치는 우리 D1 최신 스냅샷이다 — 사건 당시 위치가 아니라 "지금(마지막 수신) 위치".
 */
export async function GET(request: Request) {
  const days = Math.min(60, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 14));
  if (isApiStubMode()) return NextResponse.json({ vessels: [], stub: true });
  try {
    const db = await getDb();
    const cases = await listStrikeCases(db, { days, limit: 20 });
    const matches = [];
    for (const c of cases) {
      const m = await matchStrikeCase(db, c, { enrich: false });
      matches.push({ ...m, caseTypeName: c.typeName, caseId: c.id });
    }
    const levels = pickIncidentMmsis(matches);
    if (levels.size === 0) return NextResponse.json({ vessels: [], fetchedAt: new Date().toISOString() });
    const rows = await db.select().from(aisVessels).where(inArray(aisVessels.mmsi, [...levels.keys()]));
    const caseOf = new Map<string, { id: string; typeName: string }>();
    for (const m of matches) {
      for (const c of [m.top, ...m.candidates]) {
        if (c?.mmsi && !caseOf.has(c.mmsi)) caseOf.set(c.mmsi, { id: m.caseId, typeName: m.caseTypeName });
      }
    }
    const vessels = rows.map((r) => ({
      id: r.id,
      mmsi: r.mmsi,
      shipName: r.shipName,
      lat: r.lat,
      lng: r.lng,
      speedOverGround: r.sog,
      courseOverGround: r.cog,
      trueHeading: r.trueHeading,
      shipType: r.shipType,
      shipTypeLabel: r.shipTypeLabel,
      category: r.category,
      timestamp: r.timestamp,
      incident: levels.get(r.mmsi) ?? 2,
      incidentCaseId: caseOf.get(r.mmsi)?.id ?? null,
      incidentType: caseOf.get(r.mmsi)?.typeName ?? null,
    }));
    return NextResponse.json(
      { vessels, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (e) {
    return NextResponse.json({ vessels: [], error: e instanceof Error ? e.message : "failed" }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
