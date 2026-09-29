/**
 * LiveUA 통제면 스냅샷 — deepstateOccupiedSnapshots 테이블에 cacheKey 분리 저장.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deepstateOccupiedSnapshots } from "@/db/schema";
import {
  attachOccupiedMeta,
  type OccupiedGeoJson,
} from "@/lib/deepstate/toOccupiedGeoJson";
import type { LiveuamapControlRegionId } from "@/lib/liveuamap/types";

const memory: Partial<Record<LiveuamapControlRegionId, OccupiedGeoJson>> = {};

export function liveuaControlCacheKey(regionId: LiveuamapControlRegionId): string {
  return `liveua-${regionId}`;
}

function parseOccupied(raw: string, fetchedAt: string, source: string): OccupiedGeoJson | null {
  try {
    const parsed = JSON.parse(raw) as OccupiedGeoJson;
    if (!Array.isArray(parsed?.features) || parsed.features.length === 0) return null;
    return attachOccupiedMeta(parsed, {
      source: parsed.meta?.source || source,
      deepstateId: null,
      fetchedAt: parsed.meta?.fetchedAt || fetchedAt,
      count: parsed.features.length,
      refreshDays: parsed.meta?.refreshDays ?? 1,
    });
  } catch {
    return null;
  }
}

export function getLiveuaControlMemory(
  regionId: LiveuamapControlRegionId,
): OccupiedGeoJson | null {
  return memory[regionId] ?? null;
}

export async function saveLiveuaControlSnapshot(
  regionId: LiveuamapControlRegionId,
  fc: OccupiedGeoJson,
): Promise<boolean> {
  if (!fc.features.length) return false;
  const payload = attachOccupiedMeta(fc, {
    source: "liveuamap",
    deepstateId: null,
    fetchedAt: fc.meta?.fetchedAt ?? new Date().toISOString(),
    count: fc.features.length,
    refreshDays: 1,
  });
  memory[regionId] = payload;

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const fetchedAt = payload.meta?.fetchedAt || now;
    const cacheKey = liveuaControlCacheKey(regionId);
    await db
      .insert(deepstateOccupiedSnapshots)
      .values({
        cacheKey,
        payloadJson: JSON.stringify(payload),
        featureCount: payload.features.length,
        fetchedAt,
        source: "liveuamap",
        deepstateId: null,
        ingestedAt: now,
      })
      .onConflictDoUpdate({
        target: deepstateOccupiedSnapshots.cacheKey,
        set: {
          payloadJson: JSON.stringify(payload),
          featureCount: payload.features.length,
          fetchedAt,
          source: "liveuamap",
          deepstateId: null,
          ingestedAt: now,
        },
      });
    return true;
  } catch {
    return true; // memory ok
  }
}

export async function loadLiveuaControlFromD1(
  regionId: LiveuamapControlRegionId,
): Promise<OccupiedGeoJson | null> {
  if (memory[regionId]?.features.length) return memory[regionId]!;
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(deepstateOccupiedSnapshots)
      .where(eq(deepstateOccupiedSnapshots.cacheKey, liveuaControlCacheKey(regionId)))
      .limit(1);
    const row = rows[0];
    if (!row?.payloadJson) return null;
    const parsed = parseOccupied(row.payloadJson, row.fetchedAt, "liveuamap");
    if (parsed) memory[regionId] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/** 우크라: LiveUA 우선, 없으면 caller가 DeepState 폴백 */
export async function readLiveuaUkraineOccupied(): Promise<OccupiedGeoJson | null> {
  return loadLiveuaControlFromD1("ukraine");
}
