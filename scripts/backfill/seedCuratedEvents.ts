/**
 * data/straitEvents/*.json → D1 strait_event_history upsert.
 * sourceUrls 없거나 bbox 밖이면 거부.
 *
 *   npx tsx scripts/backfill/seedCuratedEvents.ts
 */
import { getDb } from "@/db";
import { straitEventHistory } from "@/db/schema";
import { assertValidSeedEvents } from "@/lib/straitReplay/eventSchema";
import { loadAllSeedEvents } from "@/lib/straitReplay/loadSeed";

async function main() {
  const events = loadAllSeedEvents();
  // 재검증 (파일 손상 시 여기서 실패)
  for (const e of events) {
    assertValidSeedEvents({ events: [e] });
    if (!e.sourceUrls.length) {
      throw new Error(`reject ${e.id}: sourceUrls required`);
    }
  }

  const db = await getDb();
  const now = new Date().toISOString();
  for (const e of events) {
    await db
      .insert(straitEventHistory)
      .values({
        id: e.id,
        straitId: e.straitId,
        occurredOn: e.occurredOn,
        lat: e.lat,
        lng: e.lng,
        titleKo: e.titleKo,
        titleEn: e.titleEn,
        kind: e.kind,
        sourceUrls: JSON.stringify(e.sourceUrls),
        curatedBy: e.curatedBy,
        reviewed: e.reviewed ? 1 : 0,
        isSynthetic: e.isSynthetic ? 1 : 0,
        baselineWindowDays: e.baselineWindowDays,
        ingestedAt: now,
      })
      .onConflictDoUpdate({
        target: straitEventHistory.id,
        set: {
          straitId: e.straitId,
          occurredOn: e.occurredOn,
          lat: e.lat,
          lng: e.lng,
          titleKo: e.titleKo,
          titleEn: e.titleEn,
          kind: e.kind,
          sourceUrls: JSON.stringify(e.sourceUrls),
          curatedBy: e.curatedBy,
          reviewed: e.reviewed ? 1 : 0,
          isSynthetic: e.isSynthetic ? 1 : 0,
          baselineWindowDays: e.baselineWindowDays,
          ingestedAt: now,
        },
      });
  }
  console.log(`[seedCuratedEvents] upserted ${events.length} events`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
