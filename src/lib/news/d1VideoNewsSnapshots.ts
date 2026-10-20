import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { videoNewsSnapshots } from "@/db/schema";
import type { VideoNewsPayload } from "@/lib/news/videoTypes";

/** Cron 주기에 맞춰 텍스트 뉴스(10분)보다 여유 있게 */
export const VIDEO_NEWS_D1_TTL_MS = 20 * 60_000;

export type D1VideoNewsSnapshot = {
  payload: VideoNewsPayload;
  cacheKey: string;
  source: "d1";
  ageMs: number;
};

function isFresh(fetchedAt: string, maxAgeMs: number): boolean {
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}

function parsePayload(raw: string): VideoNewsPayload | null {
  try {
    const parsed = JSON.parse(raw) as VideoNewsPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readVideoNewsFromD1(
  cacheKey: string,
  maxAgeMs = VIDEO_NEWS_D1_TTL_MS,
): Promise<D1VideoNewsSnapshot | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(videoNewsSnapshots)
      .where(eq(videoNewsSnapshots.cacheKey, cacheKey))
      .limit(1);
    const row = rows[0];
    if (!row?.payloadJson) return null;
    if (!isFresh(row.fetchedAt, maxAgeMs)) return null;
    const payload = parsePayload(row.payloadJson);
    if (!payload) return null;
    return {
      source: "d1",
      cacheKey,
      payload: { ...payload, source: "d1" },
      ageMs: Math.max(0, Date.now() - Date.parse(row.fetchedAt)),
    };
  } catch {
    return null;
  }
}

export async function writeVideoNewsToD1(options: {
  cacheKey: string;
  topic: string;
  lang: string;
  packages?: string | null;
  payload: VideoNewsPayload;
}): Promise<boolean> {
  try {
    const db = await getDb();
    const { cacheKey, topic, lang, packages, payload } = options;
    const ingestedAt = new Date().toISOString();

    await db
      .insert(videoNewsSnapshots)
      .values({
        cacheKey,
        topic,
        lang,
        packages: packages ?? null,
        payloadJson: JSON.stringify(payload),
        itemCount: payload.items.length,
        fetchedAt: payload.fetchedAt,
        ingestedAt,
      })
      .onConflictDoUpdate({
        target: videoNewsSnapshots.cacheKey,
        set: {
          topic,
          lang,
          packages: packages ?? null,
          payloadJson: JSON.stringify(payload),
          itemCount: payload.items.length,
          fetchedAt: payload.fetchedAt,
          ingestedAt,
        },
      });
    return true;
  } catch {
    return false;
  }
}
