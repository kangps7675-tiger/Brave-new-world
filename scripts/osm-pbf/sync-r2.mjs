/**
 * Sync Geofabrik OSM .pbf files to Cloudflare R2.
 *
 *   npm run osm:pbf:sync           # upload local PBFs missing/changed in R2
 *   npm run osm:pbf:sync -- --dry-run
 *   npm run osm:pbf:pull -- --only=belarus-260824.osm.pbf
 *
 * Canonical key: conflict-view-data / sources/osm-pbf/{filename}
 * New files dropped in Downloads (or data/sources/osm-pbf) are picked up
 * automatically on the next sync — no catalog edit required.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  R2_BUCKET,
  R2_PREFIX,
  discoverLocalPbfs,
  r2KeyForFilename,
  resolvePbfFile,
} from "./paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MANIFEST_PATH = path.join(__dirname, "r2-manifest.json");

function log(...args) {
  console.log("[osm-pbf:r2]", ...args);
}

function parseArgs(argv) {
  const out = { dryRun: false, pull: false, only: null, force: false };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--pull") out.pull = true;
    else if (a === "--force") out.force = true;
    else if (a.startsWith("--only=")) out.only = a.slice("--only=".length);
  }
  return out;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { bucket: R2_BUCKET, prefix: R2_PREFIX, objects: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return { bucket: R2_BUCKET, prefix: R2_PREFIX, objects: {} };
  }
}

function saveManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  manifest.bucket = R2_BUCKET;
  manifest.prefix = R2_PREFIX;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function wrangler(args, { inherit = true } = {}) {
  return spawnSync("npx", ["wrangler", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    stdio: inherit ? "inherit" : "pipe",
    timeout: 0,
  });
}

function putObject(key, filePath, bytes) {
  const gb = (bytes / 1e9).toFixed(2);
  log(`upload ${key}  (${gb} GB)`);
  const r = wrangler([
    "r2",
    "object",
    "put",
    `${R2_BUCKET}/${key}`,
    `--file=${filePath}`,
    "--content-type=application/octet-stream",
    "--remote",
  ]);
  if (r.status !== 0) {
    throw new Error(`wrangler put failed for ${key} (exit ${r.status})`);
  }
}

function getObject(key, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  log(`download ${key} → ${destPath}`);
  const r = wrangler([
    "r2",
    "object",
    "get",
    `${R2_BUCKET}/${key}`,
    `--file=${destPath}`,
    "--remote",
  ]);
  if (r.status !== 0) {
    throw new Error(`wrangler get failed for ${key} (exit ${r.status})`);
  }
}

function shouldUpload(entry, manifest, force) {
  if (force) return true;
  const prev = manifest.objects[entry.name];
  if (!prev) return true;
  return prev.bytes !== entry.bytes;
}

function uploadAll(args) {
  const manifest = loadManifest();
  let files = discoverLocalPbfs(ROOT);
  if (args.only) {
    const want = new Set(args.only.split(",").map((s) => path.basename(s.trim())));
    files = files.filter((f) => want.has(f.name));
  }
  if (files.length === 0) {
    log("no local .pbf files found in", "Downloads / data/sources/osm-pbf / OSM_PBF_DIR");
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  for (const entry of files) {
    const key = r2KeyForFilename(entry.name);
    if (!shouldUpload(entry, manifest, args.force)) {
      log("skip (already in R2, same size)", entry.name);
      skipped += 1;
      continue;
    }
    if (args.dryRun) {
      log("[dry-run]", key, "←", entry.file);
      continue;
    }
    putObject(key, entry.file, entry.bytes);
    manifest.objects[entry.name] = {
      key,
      bytes: entry.bytes,
      localDir: entry.dir,
      uploadedAt: new Date().toISOString(),
    };
    saveManifest(manifest);
    uploaded += 1;
  }
  log(`done  uploaded=${uploaded} skipped=${skipped}`);
}

function pull(args) {
  const destDir =
    process.env.OSM_PBF_DIR || path.join(ROOT, "data", "sources", "osm-pbf");
  const manifest = loadManifest();
  const names = args.only
    ? args.only.split(",").map((s) => path.basename(s.trim()))
    : Object.keys(manifest.objects);
  if (names.length === 0) {
    log("manifest empty — nothing to pull. Upload first.");
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of names) {
    const existing = resolvePbfFile(ROOT, name);
    if (existing && !args.force) {
      log("skip (already local)", existing);
      continue;
    }
    const key = manifest.objects[name]?.key || r2KeyForFilename(name);
    if (args.dryRun) {
      log("[dry-run] get", key);
      continue;
    }
    getObject(key, path.join(destDir, name));
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.pull) pull(args);
  else uploadAll(args);
}

main();
