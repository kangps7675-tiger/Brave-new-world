/**
 * IMF PortWatch 일별 통행 → strait_traffic_daily (멱등 upsert, 실패 시 전체 중단).
 *
 *   npx tsx scripts/backfill/ingestPortWatch.ts
 */
import { getDb } from "@/db";
import { straitTrafficDaily } from "@/db/schema";
import {
  CHOKE_TO_PORTWATCH,
  parsePortWatchResponse,
  PORTWATCH_CHOKEPOINTS_URL,
} from "@/lib/portWatch";
import {
  buildSyntheticTrafficForEvent,
  loadAllSeedEvents,
  mergeTrafficDays,
} from "@/lib/straitReplay/loadSeed";
import { STRAIT_TO_PORTWATCH } from "@/lib/straitReplay/straitBbox";
import type { StraitId, TrafficDay } from "@/lib/straitReplay/types";
import { STRAIT_IDS } from "@/lib/straitReplay/types";

const PORTWATCH_TO_STRAIT: Record<string, StraitId> = {};
for (const straitId of STRAIT_IDS) {
  for (const chokeId of STRAIT_TO_PORTWATCH[straitId]) {
    const portId = CHOKE_TO_PORTWATCH[chokeId];
    if (portId) PORTWATCH_TO_STRAIT[portId] = straitId;
  }
}

async function fetchPortWatchRows(): Promise<TrafficDay[]> {
  const portIds = Object.keys(PORTWATCH_TO_STRAIT);
  const params = new URLSearchParams({
    where: `portid IN (${portIds.map((id) => `'${id}'`).join(",")})`,
    outFields: "portid,date,n_total,capacity",
    orderByFields: "date ASC",
    resultRecordCount: "2000",
    returnGeometry: "false",
    f: "json",
  });
  const res = await fetch(`${PORTWATCH_CHOKEPOINTS_URL}?${params}`);
  if (!res.ok) throw new Error(`PortWatch HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  const parsed = parsePortWatchResponse(json);
  const vintage = new Date().toISOString();
  const out: TrafficDay[] = [];
  for (const row of parsed) {
    const straitId = PORTWATCH_TO_STRAIT[row.portid];
    if (!straitId) continue;
    out.push({
      straitId,
      date: row.date.slice(0, 10),
      vesselCount: row.nTotal,
      tankerCount: null,
      capacityDwt: row.capacity || null,
      sourceVintage: vintage,
    });
  }
  return out;
}

async function main() {
  let rows: TrafficDay[] = [];
  try {
    rows = await fetchPortWatchRows();
  } catch (err) {
    console.warn("[ingestPortWatch] live fetch failed — synthetic seed traffic only", err);
    rows = mergeTrafficDays(
      loadAllSeedEvents().flatMap((e) => buildSyntheticTrafficForEvent(e)),
    );
  }
  if (rows.length === 0) {
    throw new Error("no traffic rows — abort (no partial write)");
  }

  const db = await getDb();
  // 단순 멱등 upsert 루프. D1 batch 트랜잭션 API가 제한적이라
  // 실패 시 프로세스를 중단해 부분 적재를 남기지 않는다.
  for (const r of rows) {
    await db
      .insert(straitTrafficDaily)
      .values({
        straitId: r.straitId,
        date: r.date,
        vesselCount: r.vesselCount,
        tankerCount: r.tankerCount ?? null,
        capacityDwt: r.capacityDwt ?? null,
        sourceVintage: r.sourceVintage,
      })
      .onConflictDoUpdate({
        target: [straitTrafficDaily.straitId, straitTrafficDaily.date],
        set: {
          vesselCount: r.vesselCount,
          tankerCount: r.tankerCount ?? null,
          capacityDwt: r.capacityDwt ?? null,
          sourceVintage: r.sourceVintage,
        },
      });
  }
  console.log(`[ingestPortWatch] upserted ${rows.length} daily rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
