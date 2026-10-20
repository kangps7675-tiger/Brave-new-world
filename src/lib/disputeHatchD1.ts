import { desc, eq } from "drizzle-orm";
import type { TransportPath } from "@/data/geoTypes";
import type { AppDb } from "@/db/client";
import {
  disputeHatchBuilds,
  disputeHatchPaths,
  type NewDisputeHatchPathRow,
} from "@/db/schema";
import type { DisputeHatchCachePayload, DisputeHatchLod } from "@/lib/disputeHatchPrecompute";
import { d1RowsToTransportPaths } from "@/lib/ukraineHatchPrecompute";

const UPSERT_CHUNK = 25;
const D1_PATH_CAP = 4000;

function transportPathsToDisputeD1Rows(
  payload: DisputeHatchCachePayload,
): NewDisputeHatchPathRow[] {
  const builtAt = payload.generatedAt;
  return payload.paths.map((path) => {
    const disputeId =
      payload.pathDisputeIds[path.id] ||
      path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/)?.[1] ||
      path.id;
    return {
      id: `${payload.lodTier}:${path.id}`,
      disputeId,
      kind: path.kind,
      name: path.name,
      accentColor: path.accentColor ?? null,
      lodTier: payload.lodTier,
      pointsJson: JSON.stringify(path.points),
      pointCount: path.points.length,
      minLat: path.bbox.minLat,
      minLng: path.bbox.minLng,
      maxLat: path.bbox.maxLat,
      maxLng: path.bbox.maxLng,
      builtAt,
    };
  });
}

export async function readDisputeHatchFromD1(db: AppDb, lod: DisputeHatchLod) {
  const rows = await db
    .select()
    .from(disputeHatchPaths)
    .where(eq(disputeHatchPaths.lodTier, lod))
    .limit(D1_PATH_CAP);

  if (rows.length === 0) return null;

  const builds = await db
    .select()
    .from(disputeHatchBuilds)
    .where(eq(disputeHatchBuilds.lodTier, lod))
    .orderBy(desc(disputeHatchBuilds.id))
    .limit(1);

  const latest = builds[0];
  const paths = d1RowsToTransportPaths(rows) as TransportPath[];

  let pathDisputeIds: Record<string, string> = {};
  if (latest?.pathDisputeIdsJson) {
    try {
      pathDisputeIds = JSON.parse(latest.pathDisputeIdsJson) as Record<string, string>;
    } catch {
      pathDisputeIds = {};
    }
  }
  if (Object.keys(pathDisputeIds).length === 0) {
    for (const row of rows) {
      const pathId = row.id.includes(":") ? row.id.slice(row.id.indexOf(":") + 1) : row.id;
      pathDisputeIds[pathId] = row.disputeId;
    }
  }

  return {
    generatedAt: latest?.builtAt ?? new Date().toISOString(),
    lodTier: lod,
    pathCount: paths.length,
    pathDisputeIds,
    paths,
    source: "d1" as const,
  } satisfies DisputeHatchCachePayload & { source: "d1" };
}

export async function writeDisputeHatchToD1(
  db: AppDb,
  payload: DisputeHatchCachePayload,
) {
  const rows = transportPathsToDisputeD1Rows(payload).slice(0, D1_PATH_CAP);

  await db.delete(disputeHatchPaths).where(eq(disputeHatchPaths.lodTier, payload.lodTier));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await db.insert(disputeHatchPaths).values(chunk);
  }

  const disputeIds = new Set(rows.map((r) => r.disputeId));
  await db.insert(disputeHatchBuilds).values({
    lodTier: payload.lodTier,
    pathCount: rows.length,
    disputeCount: disputeIds.size,
    pathDisputeIdsJson: JSON.stringify(payload.pathDisputeIds),
    source: "dispute-hatch-precompute",
    builtAt: payload.generatedAt,
    note: `cloud snapshot · capped ${rows.length}/${payload.pathCount}`,
  });

  return { written: rows.length, total: payload.pathCount };
}
