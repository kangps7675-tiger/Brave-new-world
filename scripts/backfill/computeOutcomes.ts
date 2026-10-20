/**
 * 사건별 traffic/FRED outcome 캐시 재계산.
 *
 *   npx tsx scripts/backfill/computeOutcomes.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  eventOutcome,
  fredDaily,
  straitEventHistory,
  straitTrafficDaily,
} from "@/db/schema";
import {
  computePriceOutcomes,
  computeTrafficOutcomes,
} from "@/lib/straitReplay/computeOutcomes";
import { FRED_SERIES_MAP } from "@/lib/straitReplay/fredSeriesMap";
import type { StraitId } from "@/lib/straitReplay/types";

async function main() {
  const db = await getDb();
  const events = await db.select().from(straitEventHistory);
  const trafficAll = await db.select().from(straitTrafficDaily);
  const traffic = trafficAll.map((r) => ({
    straitId: r.straitId as StraitId,
    date: r.date,
    vesselCount: r.vesselCount,
    tankerCount: r.tankerCount,
    capacityDwt: r.capacityDwt,
    sourceVintage: r.sourceVintage,
  }));

  const priceBySeries = new Map<string, Array<{ date: string; value: number }>>();
  for (const entry of FRED_SERIES_MAP) {
    const rows = await db
      .select()
      .from(fredDaily)
      .where(eq(fredDaily.seriesId, entry.fredSeriesId));
    priceBySeries.set(
      entry.metric,
      rows.map((r) => ({ date: r.date, value: r.value })),
    );
  }

  let n = 0;
  for (const e of events) {
    await db.delete(eventOutcome).where(eq(eventOutcome.eventId, e.id));
    const trafficOut = computeTrafficOutcomes({
      eventId: e.id,
      straitId: e.straitId,
      eventOn: e.occurredOn,
      baselineWindowDays: e.baselineWindowDays,
      traffic,
    });
    const priceOut = FRED_SERIES_MAP.flatMap((m) => {
      const series = priceBySeries.get(m.metric);
      if (!series?.length) return [];
      return computePriceOutcomes({
        eventId: e.id,
        eventOn: e.occurredOn,
        metric: m.metric,
        series,
      });
    });
    for (const o of [...trafficOut, ...priceOut]) {
      await db.insert(eventOutcome).values({
        eventId: o.eventId,
        metric: o.metric,
        horizon: o.horizon,
        baselineValue: o.baselineValue,
        observedValue: o.observedValue,
        deltaPct: o.deltaPct,
        sampleNote: o.sampleNote,
        computedAt: new Date().toISOString(),
      });
      n += 1;
    }
  }
  console.log(`[computeOutcomes] wrote ${n} outcome rows for ${events.length} events`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
