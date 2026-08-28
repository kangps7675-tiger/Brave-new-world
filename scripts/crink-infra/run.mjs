/**
 * CRINK OSM infra pipeline — extract all regions, clip Asia, merge GeoJSON.
 *
 *   node scripts/crink-infra/run.mjs
 *   node scripts/crink-infra/run.mjs --only=cuba,venezuela
 *   node scripts/crink-infra/run.mjs --skip-extract --merge-only
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolvePbfFile } from "../osm-pbf/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf8"),
);

const PYTHON = process.env.PYTHON || "py -3.12";

function log(...args) {
  console.log("[crink-infra]", ...args);
}

function parseArgs(argv) {
  const out = { only: null, skipExtract: false, mergeOnly: false };
  for (const a of argv) {
    if (a.startsWith("--only=")) out.only = a.slice("--only=".length);
    else if (a === "--skip-extract") out.skipExtract = true;
    else if (a === "--merge-only") out.mergeOnly = true;
  }
  return out;
}

function py(script, extraArgs = []) {
  const cmd = `${PYTHON} ${path.join(__dirname, script)} ${extraArgs.join(" ")}`.trim();
  log("exec", cmd);
  const r = spawnSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Prevent two russia/asia extracts from racing on an 8GB machine. */
function assertNoConcurrentExtract() {
  if (process.platform !== "win32") return;
  try {
    const check = spawnSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'python|py.exe' -and $_.CommandLine -match 'extract\\.py' } | Measure-Object | Select-Object -ExpandProperty Count"`,
      { shell: true, encoding: "utf8" },
    );
    const n = Number((check.stdout || "").trim());
    if (Number.isFinite(n) && n > 0) {
      console.error(
        "[crink-infra] Another extract.py is already running. Kill it first — concurrent russia/asia extracts OOM on ≤8GB RAM.",
      );
      process.exit(2);
    }
  } catch {
    /* best-effort */
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(path.join(ROOT, CONFIG.workDir), { recursive: true });
  fs.mkdirSync(path.join(ROOT, CONFIG.outputDir), { recursive: true });

  let regions = CONFIG.regions;
  if (args.only) {
    const ids = new Set(args.only.split(",").map((s) => s.trim()));
    regions = regions.filter((r) => ids.has(r.id));
  }

  if (!args.mergeOnly && !args.skipExtract) {
    assertNoConcurrentExtract();
    for (const region of regions) {
      const pbf = resolvePbfFile(ROOT, region.pbf);
      if (!pbf) {
        console.error(
          `Missing PBF: ${region.pbf}\n  looked in data/sources/osm-pbf, Downloads, OSM_PBF_DIR\n  upload: npm run osm:pbf:sync   pull: npm run osm:pbf:pull -- --only=${region.pbf}`,
        );
        process.exit(1);
      }
      py("extract.py", [`--pbf=${pbf}`, `--region=${region.id}`]);
    }
    if (regions.some((r) => r.id === "asia" && r.clip)) {
      py("clip_asia.py");
    }
  }

  py("merge_geojson.py");
  try {
    py("match_corridors.py");
  } catch {
    log("corridor match skipped (no features yet)");
  }
  log("done → public/data/crink/");
}

main();
