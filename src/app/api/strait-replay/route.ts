import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  eventOutcome,
  fredDaily,
  straitEventHistory,
  straitTrafficDaily,
} from "@/db/schema";
import { buildReplayPayload, buildSeedFallbackReplay } from "@/lib/straitReplay/buildReplay";
import { FRED_SERIES_MAP } from "@/lib/straitReplay/fredSeriesMap";
import { STRAIT_IDS, type StraitEvent, type StraitId } from "@/lib/straitReplay/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStraitId(raw: string | null): StraitId | null {
  if (!raw) return null;
  return (STRAIT_IDS as readonly string[]).includes(raw)
    ? (raw as StraitId)
    : null;
}

function rowToEvent(row: typeof straitEventHistory.$inferSelect): StraitEvent {
  let sourceUrls: StraitEvent["sourceUrls"] = [];
  try {
    const parsed = JSON.parse(row.sourceUrls) as unknown;
    if (Array.isArray(parsed)) sourceUrls = parsed as StraitEvent["sourceUrls"];
  } catch {
    sourceUrls = [];
  }
  return {
    id: row.id,
    straitId: row.straitId as StraitId,
    occurredOn: row.occurredOn,
    lat: row.lat,
    lng: row.lng,
    titleKo: row.titleKo,
    titleEn: row.titleEn,
    kind: row.kind as StraitEvent["kind"],
    sourceUrls,
    curatedBy: row.curatedBy === "gdelt" ? "gdelt" : "human",
    reviewed: Boolean(row.reviewed),
    isSynthetic: Boolean(row.isSynthetic),
    baselineWindowDays: row.baselineWindowDays,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const straitId = parseStraitId(url.searchParams.get("straitId"));
  const eventId = url.searchParams.get("eventId");

  if (!straitId) {
    return NextResponse.json(
      {
        error: "straitId required (hormuz|red_sea_suez|malacca)",
        sampleSize: 0,
        isSynthetic: false,
        dataThrough: null,
      },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const eventRows = await db
      .select()
      .from(straitEventHistory)
      .where(
        and(
          eq(straitEventHistory.straitId, straitId),
          eq(straitEventHistory.reviewed, 1),
        ),
      )
      .orderBy(desc(straitEventHistory.occurredOn));

    if (eventRows.length === 0) {
      const fallback = buildSeedFallbackReplay(straitId, eventId);
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    }

    const events = eventRows.map(rowToEvent);
    const trafficRows = await db
      .select()
      .from(straitTrafficDaily)
      .where(eq(straitTrafficDaily.straitId, straitId));
    const traffic = trafficRows.map((r) => ({
      straitId: r.straitId as StraitId,
      date: r.date,
      vesselCount: r.vesselCount,
      tankerCount: r.tankerCount,
      capacityDwt: r.capacityDwt,
      sourceVintage: r.sourceVintage,
    }));

    const outcomeRows = await db.select().from(eventOutcome);
    const outcomes = outcomeRows.map((o) => ({
      eventId: o.eventId,
      metric: o.metric,
      horizon: o.horizon as "D+1" | "D+5" | "D+14",
      baselineValue: o.baselineValue,
      observedValue: o.observedValue,
      deltaPct: o.deltaPct,
      sampleNote: o.sampleNote,
    }));

    const priceByMetric: Record<
      string,
      Array<{ date: string; value: number }>
    > = {};
    for (const entry of FRED_SERIES_MAP) {
      const rows = await db
        .select()
        .from(fredDaily)
        .where(eq(fredDaily.seriesId, entry.fredSeriesId));
      priceByMetric[entry.metric] = rows.map((r) => ({
        date: r.date,
        value: r.value,
      }));
    }

    const payload = buildReplayPayload({
      straitId,
      eventId,
      events,
      traffic,
      outcomes,
      priceByMetric,
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch {
    const fallback = buildSeedFallbackReplay(straitId, eventId);
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  }
}
