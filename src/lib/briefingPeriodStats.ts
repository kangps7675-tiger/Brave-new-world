import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { briefingPeriodStats } from "@/db/schema";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export type BriefingDetailPayload = {
  source?: string;
  days?: number;
  gdeltSamples?: Array<{ name: string; queryTag: string | null }>;
  telegramSamples?: Array<{ region: string; text: string }>;
  gdeltTagCounts?: Array<{ tag: string; c: number }>;
};

export type BriefingPeriodStats = {
  periodKey: string;
  tier: string;
  gdeltCount: number;
  firmsCount: number;
  telegramCount: number;
  newsItemCount: number;
  topGdeltTag: string | null;
  topTelegramRegion: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  updatedAt: string;
  detailJson: string | null;
  detail: BriefingDetailPayload | null;
};

type RawStatsRow = {
  period_key?: string;
  periodKey?: string;
  tier?: string;
  gdelt_count?: number;
  gdeltCount?: number;
  firms_count?: number;
  firmsCount?: number;
  telegram_count?: number;
  telegramCount?: number;
  news_item_count?: number;
  newsItemCount?: number;
  top_gdelt_tag?: string | null;
  topGdeltTag?: string | null;
  top_telegram_region?: string | null;
  topTelegramRegion?: string | null;
  window_start?: string | null;
  windowStart?: string | null;
  window_end?: string | null;
  windowEnd?: string | null;
  updated_at?: string;
  updatedAt?: string;
  detail_json?: string | null;
  detailJson?: string | null;
};

function parseDetail(raw: string | null | undefined): BriefingDetailPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BriefingDetailPayload;
  } catch {
    return null;
  }
}

function mapRow(row: RawStatsRow | null | undefined): BriefingPeriodStats | null {
  if (!row) return null;
  const periodKey = row.period_key ?? row.periodKey;
  const tier = row.tier;
  const updatedAt = row.updated_at ?? row.updatedAt;
  if (!periodKey || !tier || !updatedAt) return null;
  const detailJson = row.detail_json ?? row.detailJson ?? null;
  return {
    periodKey,
    tier,
    gdeltCount: Number(row.gdelt_count ?? row.gdeltCount ?? 0),
    firmsCount: Number(row.firms_count ?? row.firmsCount ?? 0),
    telegramCount: Number(row.telegram_count ?? row.telegramCount ?? 0),
    newsItemCount: Number(row.news_item_count ?? row.newsItemCount ?? 0),
    topGdeltTag: row.top_gdelt_tag ?? row.topGdeltTag ?? null,
    topTelegramRegion: row.top_telegram_region ?? row.topTelegramRegion ?? null,
    windowStart: row.window_start ?? row.windowStart ?? null,
    windowEnd: row.window_end ?? row.windowEnd ?? null,
    updatedAt,
    detailJson,
    detail: parseDetail(detailJson),
  };
}

function fromDrizzleRow(
  row: typeof briefingPeriodStats.$inferSelect,
): BriefingPeriodStats {
  return {
    periodKey: row.periodKey,
    tier: row.tier,
    gdeltCount: row.gdeltCount,
    firmsCount: row.firmsCount,
    telegramCount: row.telegramCount,
    newsItemCount: row.newsItemCount,
    topGdeltTag: row.topGdeltTag,
    topTelegramRegion: row.topTelegramRegion,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    updatedAt: row.updatedAt,
    detailJson: row.detailJson,
    detail: parseDetail(row.detailJson),
  };
}

/** Vercel 등에서 D1 바인딩 대신 cron 워커 /briefing-stats 로 읽는다. */
export async function readBriefingStatsFromIngestWorker(options: {
  key?: string;
  tier?: string;
}): Promise<BriefingPeriodStats | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  try {
    const qs = new URLSearchParams();
    if (options.key) qs.set("key", options.key);
    if (options.tier) qs.set("tier", options.tier);
    const res = await fetch(`${base}/briefing-stats?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { stats?: RawStatsRow | null };
    return mapRow(payload.stats ?? null);
  } catch {
    return null;
  }
}

/** 로컬/워커에 D1 바인딩이 있을 때 직접 조회 */
export async function readBriefingStatsFromD1(options: {
  key?: string;
  tier?: string;
}): Promise<BriefingPeriodStats | null> {
  try {
    const db = await getDb();
    if (options.key) {
      const rows = await db
        .select()
        .from(briefingPeriodStats)
        .where(eq(briefingPeriodStats.periodKey, options.key))
        .limit(1);
      return rows[0] ? fromDrizzleRow(rows[0]) : null;
    }

    if (options.tier === "daily" || options.tier === "weekly" || options.tier === "monthly") {
      const rows = await db
        .select()
        .from(briefingPeriodStats)
        .where(eq(briefingPeriodStats.tier, options.tier))
        .orderBy(desc(briefingPeriodStats.updatedAt))
        .limit(1);
      return rows[0] ? fromDrizzleRow(rows[0]) : null;
    }
    return null;
  } catch {
    return null;
  }
}
