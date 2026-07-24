/**
 * 진행형 분쟁 GET — 정적 시드 + D1 living_timeline_entries 병합.
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { livingTimelineEntries } from "@/db/schema";
import {
  livingConflictById,
  type LivingConflictDoc,
  type LivingTimelineEntry,
  TAIWAN_STRAIT_CONFLICT_ID,
} from "@/data/livingConflicts/taiwanStrait";
import { catalogCaption } from "@/data/sourceCatalog";

export type LivingConflictApiPayload = {
  ok: true;
  conflict: Pick<LivingConflictDoc, "id" | "titleKo" | "titleEn" | "center" | "altitude">;
  sixW: LivingConflictDoc["sixW"];
  stages: LivingConflictDoc["stages"];
  livingEntries: LivingTimelineEntry[];
  updatedAt: string;
  attribution: string;
  source: "d1+seed" | "seed";
};

function parseUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === "string" && u.length > 0);
  } catch {
    return [];
  }
}

function mergeEntries(
  seed: LivingTimelineEntry[],
  fromDb: LivingTimelineEntry[],
): LivingTimelineEntry[] {
  const byKey = new Map<string, LivingTimelineEntry>();
  for (const e of seed) {
    byKey.set(`${e.entryDate}:${e.id}`, e);
  }
  for (const e of fromDb) {
    byKey.set(`${e.entryDate}:${e.id}`, e);
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.entryDate !== b.entryDate) return b.entryDate.localeCompare(a.entryDate);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

async function loadDbEntries(conflictId: string): Promise<LivingTimelineEntry[] | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(livingTimelineEntries)
      .where(eq(livingTimelineEntries.conflictId, conflictId))
      .orderBy(desc(livingTimelineEntries.entryDate), desc(livingTimelineEntries.createdAt))
      .limit(60);
    return rows.map((row) => ({
      id: row.id,
      conflictId: TAIWAN_STRAIT_CONFLICT_ID,
      entryDate: row.entryDate,
      headlineKo: row.headlineKo,
      headlineEn: row.headlineEn,
      sourceUrls: parseUrls(row.sourceUrlsJson),
      createdAt: row.createdAt,
    }));
  } catch {
    return null;
  }
}

export async function loadLivingConflict(
  id: string,
): Promise<LivingConflictApiPayload | null> {
  const doc = livingConflictById(id);
  if (!doc) return null;

  const dbEntries = await loadDbEntries(doc.id);
  const livingEntries = mergeEntries(doc.seedLivingEntries, dbEntries ?? []);
  const attribution =
    catalogCaption("living-conflict-taiwan") ||
    "GDELT · Telegram (optional) · auto summary — may be wrong";

  return {
    ok: true,
    conflict: {
      id: doc.id,
      titleKo: doc.titleKo,
      titleEn: doc.titleEn,
      center: doc.center,
      altitude: doc.altitude,
    },
    sixW: doc.sixW,
    stages: doc.stages,
    livingEntries,
    updatedAt: livingEntries[0]?.createdAt ?? new Date().toISOString(),
    attribution,
    source: dbEntries != null && dbEntries.length > 0 ? "d1+seed" : "seed",
  };
}

/** 수동 검수 덮어쓰기용 — 현재는 시드만; 추후 JSON override 확장 */
export async function loadLivingConflictWithOverrides(
  id: string,
): Promise<LivingConflictApiPayload | null> {
  return loadLivingConflict(id);
}
