import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deepstateOccupiedSnapshots } from "@/db/schema";
import {
  DEEPSTATE_SNAPSHOT_KEY,
  attachOccupiedMeta,
  type OccupiedGeoJson,
} from "@/lib/deepstate/toOccupiedGeoJson";

function parseOccupied(raw: string, fetchedAt: string, source: string): OccupiedGeoJson | null {
  try {
    const parsed = JSON.parse(raw) as OccupiedGeoJson;
    if (!Array.isArray(parsed?.features) || parsed.features.length === 0) return null;
    return attachOccupiedMeta(parsed, {
      source: parsed.meta?.source || source,
      deepstateId: parsed.meta?.deepstateId ?? null,
      fetchedAt: parsed.meta?.fetchedAt || fetchedAt,
      count: parsed.features.length,
    });
  } catch {
    return null;
  }
}

export async function loadDeepstateOccupiedFromD1(): Promise<OccupiedGeoJson | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(deepstateOccupiedSnapshots)
      .where(eq(deepstateOccupiedSnapshots.cacheKey, DEEPSTATE_SNAPSHOT_KEY))
      .limit(1);
    const row = rows[0];
    if (!row?.payloadJson) return null;
    return parseOccupied(row.payloadJson, row.fetchedAt, row.source || "deepstate-d1");
  } catch {
    return null;
  }
}

export async function saveDeepstateOccupiedToD1(fc: OccupiedGeoJson): Promise<boolean> {
  if (!fc.features.length) return false;
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const fetchedAt = fc.meta?.fetchedAt || now;
    const payload = attachOccupiedMeta(fc, {
      source: fc.meta?.source || "deepstate-d1",
      deepstateId: fc.meta?.deepstateId ?? null,
      fetchedAt,
      count: fc.features.length,
    });
    await db
      .insert(deepstateOccupiedSnapshots)
      .values({
        cacheKey: DEEPSTATE_SNAPSHOT_KEY,
        payloadJson: JSON.stringify(payload),
        featureCount: payload.features.length,
        fetchedAt,
        source: payload.meta?.source ?? "deepstate-d1",
        deepstateId: payload.meta?.deepstateId ?? null,
        ingestedAt: now,
      })
      .onConflictDoUpdate({
        target: deepstateOccupiedSnapshots.cacheKey,
        set: {
          payloadJson: JSON.stringify(payload),
          featureCount: payload.features.length,
          fetchedAt,
          source: payload.meta?.source ?? "deepstate-d1",
          deepstateId: payload.meta?.deepstateId ?? null,
          ingestedAt: now,
        },
      });
    return true;
  } catch {
    return false;
  }
}
