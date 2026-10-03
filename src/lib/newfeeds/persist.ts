/**
 * NewFeeds 스냅샷 D1 저장 — news_stream_snapshots 테이블 재사용.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { newsStreamSnapshots } from "@/db/schema";

export async function saveNewfeedsSnapshot(
  cacheKey: string,
  payload: unknown,
  itemCount: number,
): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const payloadJson = JSON.stringify(payload);
    await db
      .insert(newsStreamSnapshots)
      .values({
        cacheKey,
        packages: "newfeeds-iran",
        lang: "en",
        payloadJson,
        itemCount,
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: itemCount,
        fetchedAt: now,
        ingestedAt: now,
      })
      .onConflictDoUpdate({
        target: newsStreamSnapshots.cacheKey,
        set: {
          payloadJson,
          itemCount,
          tier3Count: itemCount,
          fetchedAt: now,
          ingestedAt: now,
          packages: "newfeeds-iran",
        },
      });
    return true;
  } catch {
    return false;
  }
}

export async function loadNewfeedsSnapshot<T>(
  cacheKey: string,
): Promise<{ payload: T; fetchedAt: string } | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(newsStreamSnapshots)
      .where(eq(newsStreamSnapshots.cacheKey, cacheKey))
      .limit(1);
    const row = rows[0];
    if (!row?.payloadJson) return null;
    return {
      payload: JSON.parse(row.payloadJson) as T,
      fetchedAt: row.fetchedAt,
    };
  } catch {
    return null;
  }
}
