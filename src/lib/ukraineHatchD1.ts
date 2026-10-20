import { desc, eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { ukraineControlBuilds, ukraineControlPaths } from "@/db/schema";
import {
  d1RowsToTransportPaths,
  transportPathsToD1Rows,
  type UkraineHatchCachePayload,
  type UkraineHatchLod,
} from "@/lib/ukraineHatchPrecompute";

const UPSERT_CHUNK = 25;
/** D1 행 상한 — overview 위주, detail은 파일 캐시가 본진 */
const D1_PATH_CAP = 3500;

export async function readUkraineHatchFromD1(db: AppDb, lod: UkraineHatchLod) {
  const rows = await db
    .select()
    .from(ukraineControlPaths)
    .where(eq(ukraineControlPaths.lodTier, lod))
    .limit(D1_PATH_CAP);

  if (rows.length === 0) return null;

  const builds = await db
    .select()
    .from(ukraineControlBuilds)
    .where(eq(ukraineControlBuilds.lodTier, lod))
    .orderBy(desc(ukraineControlBuilds.id))
    .limit(1);

  const latest = builds[0];
  const paths = d1RowsToTransportPaths(rows);

  return {
    generatedAt: latest?.builtAt ?? new Date().toISOString(),
    controlDate: latest?.controlDate ?? rows[0]?.controlDate ?? "",
    lodTier: lod,
    pathCount: paths.length,
    paths,
    source: "d1" as const,
  };
}

export async function writeUkraineHatchToD1(
  db: AppDb,
  payload: UkraineHatchCachePayload,
) {
  const rows = transportPathsToD1Rows(payload).slice(0, D1_PATH_CAP);

  await db
    .delete(ukraineControlPaths)
    .where(eq(ukraineControlPaths.lodTier, payload.lodTier));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await db.insert(ukraineControlPaths).values(chunk);
  }

  await db.insert(ukraineControlBuilds).values({
    controlDate: payload.controlDate,
    lodTier: payload.lodTier,
    pathCount: rows.length,
    zoneCount: new Set(rows.map((r) => r.zoneId)).size,
    source: "ukraine-hatch-precompute",
    builtAt: payload.generatedAt,
    note: `file+d1 sync · capped ${rows.length}/${payload.pathCount}`,
  });

  return { written: rows.length, total: payload.pathCount };
}
