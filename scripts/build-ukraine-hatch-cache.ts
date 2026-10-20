/**
 * Build Ukraine hatch/outline path cache from private VIINA render JSON.
 *
 *   npm run viina:build
 *   npm run ukraine:hatch:build
 */
import {
  precomputeUkraineHatchPaths,
  type UkraineHatchLod,
} from "../src/lib/ukraineHatchPrecompute";
import { loadViinaRenderData } from "../src/lib/viinaServerData";
import { saveUkraineHatchCache } from "../src/lib/ukraineHatchServerData";
import { getDb, disposeDb } from "../src/db";
import { writeUkraineHatchToD1 } from "../src/lib/ukraineHatchD1";

async function main() {
  const lodArg = (process.argv[2] || "all").toLowerCase();
  const lods: UkraineHatchLod[] =
    lodArg === "overview" || lodArg === "detail"
      ? [lodArg]
      : ["overview", "detail"];

  const viina = loadViinaRenderData();
  if (!viina?.features?.length) {
    console.error("VIINA render cache missing. Run: npm run viina:build");
    process.exit(1);
  }

  for (const lod of lods) {
    const zones =
      lod === "overview" && viina.overviewFeatures?.length
        ? viina.overviewFeatures
        : viina.features;
    const ru = zones.filter((z) => z.controlStatus === "RU");
    const ua = zones.filter((z) => z.controlStatus === "UA");
    const contested = zones.filter((z) => z.controlStatus === "CONTESTED");
    const payload = precomputeUkraineHatchPaths(
      ru,
      ua,
      contested,
      lod,
      viina.controlDate || "",
    );
    const filePath = saveUkraineHatchCache(payload);
    console.log(`[hatch] ${lod}: ${payload.pathCount} paths → ${filePath}`);

    try {
      const db = await getDb();
      const result = await writeUkraineHatchToD1(db, payload);
      console.log(`[hatch] D1 ${lod}: wrote ${result.written}/${result.total}`);
      await disposeDb();
    } catch (error) {
      console.warn(
        `[hatch] D1 sync skipped (${lod}):`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
