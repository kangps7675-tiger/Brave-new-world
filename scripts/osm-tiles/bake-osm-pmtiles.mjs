/**
 * Bake Geofabrik OSM .pbf → OpenMapTiles .pmtiles via Planetiler.
 *
 * Usage:
 *   node scripts/osm-tiles/bake-osm-pmtiles.mjs
 *   node scripts/osm-tiles/bake-osm-pmtiles.mjs --only=antarctica
 *   node scripts/osm-tiles/bake-osm-pmtiles.mjs --input-dir=C:/Users/kangp/Downloads
 *   node scripts/osm-tiles/bake-osm-pmtiles.mjs --pbf=C:/path/to/file.osm.pbf --id=custom
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolvePbfFile } from "../osm-pbf/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "regions.json"), "utf8"),
);

function log(...args) {
  console.log("[osm-tiles:bake]", ...args);
}

function parseArgs(argv) {
  const out = {
    only: null,
    inputDir: CONFIG.defaultInputDir,
    pbf: null,
    id: null,
    skipDownload: false,
    force: false,
  };
  for (const a of argv) {
    if (a.startsWith("--only=")) out.only = a.slice("--only=".length);
    else if (a.startsWith("--input-dir=")) out.inputDir = a.slice("--input-dir=".length);
    else if (a.startsWith("--pbf=")) out.pbf = a.slice("--pbf=".length);
    else if (a.startsWith("--id=")) out.id = a.slice("--id=".length);
    else if (a === "--skip-download") out.skipDownload = true;
    else if (a === "--force") out.force = true;
  }
  return out;
}

function resolveRegions(args) {
  if (args.pbf) {
    const id =
      args.id ||
      path.basename(args.pbf, ".osm.pbf").replace(/-\d+$/, "") ||
      "custom";
    return [
      {
        id,
        label: id,
        pbfPath: path.resolve(args.pbf),
        heapGb: 4,
        center: [0, 0],
        zoom: 2,
        bounds: [-180, -85, 180, 85],
      },
    ];
  }

  let regions = CONFIG.regions.map((r) => ({
    ...r,
    pbfPath: resolvePbfFile(ROOT, r.pbf) || path.join(args.inputDir, r.pbf),
  }));
  if (args.only) {
    const ids = new Set(args.only.split(",").map((s) => s.trim()).filter(Boolean));
    regions = regions.filter((r) => ids.has(r.id));
    if (regions.length === 0) {
      throw new Error(`No regions matched --only=${args.only}`);
    }
  }
  return regions;
}

function writeManifest(outputDir, baked) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    schema: "openmaptiles",
    tileUrlTemplate: "/tiles/osm/{id}.pmtiles",
    protocol: "pmtiles",
    regions: baked,
  };
  const dest = path.join(outputDir, "manifest.json");
  fs.writeFileSync(dest, JSON.stringify(manifest, null, 2));
  log("manifest", dest);

  const styleSrc = path.join(__dirname, "styles", "openmaptiles-dark.json");
  if (fs.existsSync(styleSrc)) {
    fs.copyFileSync(styleSrc, path.join(outputDir, "openmaptiles-dark.json"));
  }
}

function bakeOne({ java, jar }, region, { workDir, outputDir, skipDownload, force }) {
  const outPmtiles = path.join(outputDir, `${region.id}.pmtiles`);
  if (fs.existsSync(outPmtiles) && !force) {
    const mb = (fs.statSync(outPmtiles).size / 1e6).toFixed(1);
    log("skip (exists)", region.id, `${mb} MB — use --force to rebuild`);
    return {
      id: region.id,
      label: region.label,
      file: `${region.id}.pmtiles`,
      url: `/tiles/osm/${region.id}.pmtiles`,
      bytes: fs.statSync(outPmtiles).size,
      center: region.center,
      zoom: region.zoom,
      bounds: region.bounds,
      skipped: true,
    };
  }

  if (!fs.existsSync(region.pbfPath)) {
    throw new Error(`Missing PBF for ${region.id}: ${region.pbfPath}`);
  }

  const regionWork = path.join(workDir, region.id);
  fs.mkdirSync(regionWork, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const heap = Math.max(1, Number(region.heapGb) || 2);
  const args = [
    `-Xmx${heap}g`,
    "-jar",
    jar,
    `--osm-path=${region.pbfPath}`,
    `--output=${outPmtiles}`,
    `--tmpdir=${regionWork}`,
  ];
  if (!skipDownload) args.push("--download");

  log("planetiler", region.id, `heap=${heap}g`);
  log(" ", region.pbfPath, "→", outPmtiles);

  const result = spawnSync(java, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env },
    timeout: 0,
  });
  if (result.status !== 0) {
    throw new Error(`Planetiler failed for ${region.id} (exit ${result.status})`);
  }
  if (!fs.existsSync(outPmtiles)) {
    throw new Error(`Planetiler finished but output missing: ${outPmtiles}`);
  }

  return {
    id: region.id,
    label: region.label,
    file: `${region.id}.pmtiles`,
    url: `/tiles/osm/${region.id}.pmtiles`,
    bytes: fs.statSync(outPmtiles).size,
    center: region.center,
    zoom: region.zoom,
    bounds: region.bounds,
    skipped: false,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.join(ROOT, CONFIG.outputDir);
  const workDir = path.join(ROOT, CONFIG.workDir);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const toolchain = await ensurePlanetilerToolchain();
  const regions = resolveRegions(args);

  log("regions:", regions.map((r) => r.id).join(", "));
  const baked = [];
  for (const region of regions) {
    baked.push(
      bakeOne(toolchain, region, {
        workDir,
        outputDir,
        skipDownload: args.skipDownload,
        force: args.force,
      }),
    );
  }

  const existingPath = path.join(outputDir, "manifest.json");
  let previous = [];
  if (fs.existsSync(existingPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(existingPath, "utf8")).regions || [];
    } catch {
      previous = [];
    }
  }
  const byId = new Map(previous.map((r) => [r.id, r]));
  for (const r of baked) byId.set(r.id, r);
  for (const [id, r] of byId) {
    const f = path.join(outputDir, `${id}.pmtiles`);
    if (fs.existsSync(f)) {
      byId.set(id, { ...r, bytes: fs.statSync(f).size, url: `/tiles/osm/${id}.pmtiles` });
    }
  }

  writeManifest(outputDir, [...byId.values()]);
  log("done. Preview: /internal/osm-tiles");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
