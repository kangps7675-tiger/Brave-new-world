#!/usr/bin/env node
/**
 * Cross-source confidence layer (idea E). Several UNCTAD series measure overlapping
 * things independently:
 *   - ContPortThroughput (US.ContPortThroughput) vs SDG_PORFVOL (US.SDG_PORFVOL) — both
 *     country-level container port TEU.
 *   - SeaborneTrade CargoType=30 vs SDG_LULFRG — both country-level total loaded+
 *     discharged tonnage (already cross-checked inline in parse-bulk-tonnage.js).
 *
 * Two independent UNCTAD series agreeing is a real confidence signal; a large
 * disagreement is worth flagging rather than silently picking whichever source
 * happened to load first (which is what build-corridor-ranks.js's priority-chain
 * fallbacks currently do). This script produces that comparison as its own artifact
 * — build-corridor-ranks.js surfaces the summary in its output metadata.
 *
 * Depends on already having run:
 *   node scripts/unctad/parse-cont-port-throughput.js
 *   node scripts/unctad/parse-sdg-porfvol.js <path>
 *   node scripts/unctad/parse-bulk-tonnage.js <paths>  (carries its own seaborne/lulfrg cross-check)
 *
 * Output: scripts/data/confidence-layer.json / public/data/crink/confidence-layer.json
 * Usage: node scripts/unctad/build-confidence-layer.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const PATHS = {
  contPort: path.join(ROOT, "scripts", "data", "unctad-port-throughput.json"),
  sdgPorfvol: path.join(ROOT, "scripts", "data", "sdg-porfvol.json"),
  bulkTonnage: path.join(ROOT, "scripts", "data", "bulk-tonnage.json"),
};
const OUT_SCRIPTS = path.join(ROOT, "scripts", "data", "confidence-layer.json");
const OUT_PUBLIC = path.join(ROOT, "public", "data", "crink", "confidence-layer.json");

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
function agreementRatio(a, b) {
  if (!(a > 0) || !(b > 0)) return null;
  return Math.min(a, b) / Math.max(a, b);
}

function main() {
  const contPort = readJsonSafe(PATHS.contPort);
  const sdgPorfvol = readJsonSafe(PATHS.sdgPorfvol);
  const bulkTonnage = readJsonSafe(PATHS.bulkTonnage);

  const teuComparison = {};
  let teuAgreeSum = 0;
  let teuAgreeCount = 0;
  if (contPort?.countries && sdgPorfvol?.countries) {
    const allIso = new Set([...Object.keys(contPort.countries), ...Object.keys(sdgPorfvol.countries)]);
    for (const iso of allIso) {
      const a = contPort.countries[iso]?.teu ?? null;
      const b = sdgPorfvol.countries[iso]?.teu ?? null;
      const ratio = agreementRatio(a, b);
      teuComparison[iso] = { contPortThroughputTeu: a, sdgPorfvolTeu: b, agreementPct: ratio != null ? Math.round(ratio * 1000) / 10 : null };
      if (ratio != null) {
        teuAgreeSum += ratio;
        teuAgreeCount += 1;
      }
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    method: "min(a,b)/max(a,b) agreement ratio between two independent UNCTAD series measuring the same thing. Low ratio = sources disagree, worth investigating before trusting either alone.",
    teuCrossCheck: {
      description: "US.ContPortThroughput vs US.SDG_PORFVOL — both country-level container port TEU",
      pairsCompared: teuAgreeCount,
      avgAgreementPct: teuAgreeCount ? Math.round((teuAgreeSum / teuAgreeCount) * 1000) / 10 : null,
      countries: teuComparison,
    },
    tonnageCrossCheck: bulkTonnage?.crossCheck
      ? {
          description: "US.SeaborneTrade (CargoType=30) vs US.SDG_LULFRG — both country-level total loaded+discharged tonnage",
          ...bulkTonnage.crossCheck,
        }
      : null,
  };

  writeJson(OUT_SCRIPTS, payload);
  writeJson(OUT_PUBLIC, payload);
  console.log(
    `[confidence-layer] TEU cross-check: ${teuAgreeCount} countries, avg agreement=${payload.teuCrossCheck.avgAgreementPct}% | tonnage cross-check: ${payload.tonnageCrossCheck?.avgAgreementPct ?? "n/a"}%`,
  );
  console.log(`  wrote ${path.relative(ROOT, OUT_SCRIPTS)}`);
}
main();
