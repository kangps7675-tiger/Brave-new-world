import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usCarrierSnapshots } from "@/db/schema";
import { US_CARRIERS_SEED, type UsCarrier } from "@/data/usCarriers";

export const US_CARRIER_SNAPSHOT_KEY = "latest";

export type UsCarrierSnapshotPayload = {
  carriers: UsCarrier[];
  updatedAt: string;
  source: string;
  updatedIds?: string[];
  reportUrl?: string | null;
  via?: string | null;
};

export async function loadUsCarrierSnapshot(): Promise<UsCarrierSnapshotPayload | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(usCarrierSnapshots)
      .where(eq(usCarrierSnapshots.cacheKey, US_CARRIER_SNAPSHOT_KEY))
      .limit(1);
    const row = rows[0];
    if (!row?.payloadJson) return null;
    const parsed = JSON.parse(row.payloadJson) as UsCarrierSnapshotPayload;
    if (!Array.isArray(parsed.carriers) || parsed.carriers.length === 0) return null;
    return {
      carriers: parsed.carriers,
      updatedAt: parsed.updatedAt || row.fetchedAt,
      source: parsed.source || "D1 snapshot",
      updatedIds: parsed.updatedIds,
      reportUrl: parsed.reportUrl,
      via: parsed.via,
    };
  } catch {
    return null;
  }
}

export async function saveUsCarrierSnapshot(
  payload: UsCarrierSnapshotPayload,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .insert(usCarrierSnapshots)
    .values({
      cacheKey: US_CARRIER_SNAPSHOT_KEY,
      payloadJson: JSON.stringify(payload),
      carrierCount: payload.carriers.length,
      updatedCount: payload.updatedIds?.length ?? 0,
      fetchedAt: payload.updatedAt || now,
      source: payload.source,
      reportUrl: payload.reportUrl ?? null,
      ingestedAt: now,
    })
    .onConflictDoUpdate({
      target: usCarrierSnapshots.cacheKey,
      set: {
        payloadJson: JSON.stringify(payload),
        carrierCount: payload.carriers.length,
        updatedCount: payload.updatedIds?.length ?? 0,
        fetchedAt: payload.updatedAt || now,
        source: payload.source,
        reportUrl: payload.reportUrl ?? null,
        ingestedAt: now,
      },
    });
}

export function seedCarrierPayload(): UsCarrierSnapshotPayload {
  return {
    carriers: US_CARRIERS_SEED.map((c) => ({ ...c })),
    updatedAt: "2026-07-10",
    source: "built-in seed",
  };
}
