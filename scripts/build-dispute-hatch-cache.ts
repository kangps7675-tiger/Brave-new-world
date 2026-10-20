/**
 * Build dispute / Middle East (Iran-Israel) front hatch cache → file + D1.
 *
 *   npm run dispute:hatch:build
 *   (disputes.json must exist — npm run tensions:regional if needed)
 */
import {
  precomputeDisputeHatchPaths,
  type DisputeHatchLod,
} from "../src/lib/disputeHatchPrecompute";
import { writeDisputeHatchToD1 } from "../src/lib/disputeHatchD1";
import { saveDisputeHatchCache } from "../src/lib/disputeHatchServerData";
import { loadServerDisputes } from "../src/lib/serverDisputes";
import { getDb, disposeDb } from "../src/db";

async function main() {
  const lodArg = (process.argv[2] || "all").toLowerCase();
  const lods: DisputeHatchLod[] =
    lodArg === "overview" || lodArg === "detail"
      ? [lodArg]
      : ["overview", "detail"];

  const disputes = await loadServerDisputes();
  if (!disputes.length) {
    console.error("disputes.json missing/empty. Run: npm run tensions:regional");
    process.exit(1);
  }

  for (const lod of lods) {
    const payload = precomputeDisputeHatchPaths(disputes, lod);
    const filePath = saveDisputeHatchCache(payload);
    console.log(`[dispute-hatch] ${lod}: ${payload.pathCount} paths → ${filePath}`);

    try {
      const db = await getDb();
      const result = await writeDisputeHatchToD1(db, payload);
      console.log(`[dispute-hatch] D1 ${lod}: wrote ${result.written}/${result.total}`);
      await disposeDb();
    } catch (error) {
      console.warn(
        `[dispute-hatch] D1 sync skipped (${lod}):`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
