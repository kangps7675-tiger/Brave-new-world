/**
 * 벙커 감성지수 — STABLE vs HEAD TO BUNKER 이진 투표.
 * 날짜(UTC)·deviceId당 1표 upsert. 공포탐욕지수의 지정학 버전.
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bunkerSentimentVotes } from "@/db/schema";
import { utcRankDate } from "@/lib/dailyRanks";

export type BunkerPick = "stable" | "bunker";

export type BunkerSentimentSnapshot = {
  date: string;
  total: number;
  stable: number;
  bunker: number;
  /** 벙커 표 비율 0–100 */
  panicPct: number | null;
  myPick: BunkerPick | null;
};

export async function readBunkerSentiment(options: {
  date?: string;
  deviceId?: string;
}): Promise<BunkerSentimentSnapshot> {
  const date = options.date || utcRankDate();
  const empty: BunkerSentimentSnapshot = {
    date,
    total: 0,
    stable: 0,
    bunker: 0,
    panicPct: null,
    myPick: null,
  };

  try {
    const db = await getDb();
    const rows = await db
      .select({
        pick: bunkerSentimentVotes.pick,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(bunkerSentimentVotes)
      .where(eq(bunkerSentimentVotes.voteDate, date))
      .groupBy(bunkerSentimentVotes.pick);

    let stable = 0;
    let bunker = 0;
    for (const row of rows) {
      if (row.pick === "stable") stable = Number(row.n) || 0;
      if (row.pick === "bunker") bunker = Number(row.n) || 0;
    }
    const total = stable + bunker;
    const panicPct = total > 0 ? Math.round((1000 * bunker) / total) / 10 : null;

    let myPick: BunkerPick | null = null;
    if (options.deviceId) {
      const mine = await db
        .select({ pick: bunkerSentimentVotes.pick })
        .from(bunkerSentimentVotes)
        .where(
          and(
            eq(bunkerSentimentVotes.voteDate, date),
            eq(bunkerSentimentVotes.deviceId, options.deviceId),
          ),
        )
        .limit(1);
      const p = mine[0]?.pick;
      if (p === "stable" || p === "bunker") myPick = p;
    }

    return { date, total, stable, bunker, panicPct, myPick };
  } catch {
    return empty;
  }
}

export async function upsertBunkerSentiment(options: {
  date?: string;
  deviceId: string;
  pick: BunkerPick;
}): Promise<BunkerSentimentSnapshot> {
  const date = options.date || utcRankDate();
  const now = new Date().toISOString();
  try {
    const db = await getDb();
    await db
      .insert(bunkerSentimentVotes)
      .values({
        voteDate: date,
        deviceId: options.deviceId,
        pick: options.pick,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [bunkerSentimentVotes.voteDate, bunkerSentimentVotes.deviceId],
        set: { pick: options.pick, createdAt: now },
      });
  } catch {
    /* fall through to read */
  }
  return readBunkerSentiment({ date, deviceId: options.deviceId });
}
