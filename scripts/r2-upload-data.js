/**
 * Upload public/data/{lite,full} (+ optional textures/audio) to Cloudflare R2.
 *
 * Prerequisites (one-time):
 *   1. Cloudflare Dashboard → R2 → Enable R2
 *   2. npx wrangler r2 bucket create conflict-view-data
 *
 * Usage:
 *   node scripts/r2-upload-data.js
 *   node scripts/r2-upload-data.js --dry-run
 *   node scripts/r2-upload-data.js --profiles lite
 *   node scripts/r2-upload-data.js --with-textures
 *   node scripts/r2-upload-data.js --with-audio
 *   node scripts/r2-upload-data.js --audio-only
 *   node scripts/r2-upload-data.js --crink-only
 *   node scripts/r2-upload-data.js --with-crink
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUCKET = process.env.R2_DATA_BUCKET || "conflict-view-data";
const PREFIX = process.env.R2_DATA_PREFIX || "data";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const withTextures = args.includes("--with-textures");
const audioOnly = args.includes("--audio-only");
const crinkOnly = args.includes("--crink-only");
const withCrink = args.includes("--with-crink") || crinkOnly;
const withAudio = args.includes("--with-audio") || audioOnly;
const profilesArg = args.find((a) => a.startsWith("--profiles="));
const profiles = profilesArg
  ? profilesArg.replace("--profiles=", "").split(",").map((s) => s.trim())
  : ["lite", "full"];

function contentType(filePath) {
  if (filePath.endsWith(".json.gz")) return "application/gzip";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function toKey(absPath, localRoot, keyPrefix) {
  const rel = path.relative(localRoot, absPath).split(path.sep).join("/");
  return `${keyPrefix}/${rel}`;
}

function putObject(key, filePath) {
  const ct = contentType(filePath);
  const cmdArgs = [
    "wrangler",
    "r2",
    "object",
    "put",
    `${BUCKET}/${key}`,
    `--file=${filePath}`,
    `--content-type=${ct}`,
    "--remote",
  ];
  if (dryRun) {
    console.log(`[dry-run] ${key} ← ${path.relative(ROOT, filePath)}`);
    return true;
  }
  const result = spawnSync("npx", cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    return false;
  }
  console.log(`OK  ${key}`);
  return true;
}

function collectDataJobs() {
  const jobs = [];
  for (const profile of profiles) {
    const localRoot = path.join(ROOT, "public", "data", profile);
    const files = walkFiles(localRoot).filter(
      (f) => f.endsWith(".json") || f.endsWith(".json.gz"),
    );
    for (const file of files) {
      jobs.push({
        key: toKey(file, path.join(ROOT, "public", "data"), PREFIX),
        file,
      });
    }
  }

  const dataRoot = path.join(ROOT, "public", "data");
  if (fs.existsSync(dataRoot)) {
    for (const entry of fs.readdirSync(dataRoot, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!(entry.name.endsWith(".json") || entry.name.endsWith(".json.gz"))) continue;
      const file = path.join(dataRoot, entry.name);
      jobs.push({ key: `${PREFIX}/${entry.name}`, file });
    }
  }

  if (withTextures) {
    const texRoot = path.join(ROOT, "public", "textures");
    for (const file of walkFiles(texRoot)) {
      jobs.push({
        key: toKey(file, path.join(ROOT, "public"), "static"),
        file,
      });
    }
  }
  return jobs;
}

/** Git-tracked public/data/crink/*.json → R2 keys data/crink/*.json */
function collectCrinkJobs() {
  const dataRoot = path.join(ROOT, "public", "data");
  const listed = spawnSync(
    "git",
    ["ls-files", "public/data/crink"],
    { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" },
  );
  if (listed.status !== 0) {
    console.error(listed.stderr || "git ls-files failed");
    return [];
  }
  const jobs = [];
  for (const relPosix of listed.stdout.trim().split("\n").filter(Boolean)) {
    if (!(relPosix.endsWith(".json") || relPosix.endsWith(".json.gz"))) continue;
    const file = path.join(ROOT, relPosix.replace(/\//g, path.sep));
    if (!fs.existsSync(file)) continue;
    jobs.push({
      key: toKey(file, dataRoot, PREFIX),
      file,
    });
  }
  return jobs;
}

function writeCrinkManifest(jobs) {
  const manifestPath = path.join(ROOT, "scripts", "data", "r2-crink-manifest.json");
  const objects = {};
  for (const job of jobs) {
    const name = path.basename(job.file);
    const stat = fs.statSync(job.file);
    objects[name] = {
      key: job.key,
      bytes: stat.size,
      uploadedAt: new Date().toISOString(),
    };
  }
  const payload = {
    bucket: BUCKET,
    prefix: `${PREFIX}/crink`,
    updatedAt: new Date().toISOString(),
    objects,
  };
  if (!dryRun) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`manifest → ${path.relative(ROOT, manifestPath)} (${Object.keys(objects).length} objects)`);
  }
}

function collectAudioJobs() {
  const audioRoot = path.join(ROOT, "public", "audio");
  const jobs = [];
  for (const file of walkFiles(audioRoot)) {
    const lower = file.toLowerCase();
    if (!(lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg"))) {
      continue;
    }
    jobs.push({ key: `audio/${path.basename(file)}`, file });
  }
  return jobs;
}

function main() {
  const jobs = [];
  if (crinkOnly) {
    jobs.push(...collectCrinkJobs());
  } else {
    if (!audioOnly) jobs.push(...collectDataJobs());
    if (withCrink) jobs.push(...collectCrinkJobs());
  }
  if (withAudio) jobs.push(...collectAudioJobs());

  console.log(
    `R2 upload → bucket=${BUCKET} objects=${jobs.length} dryRun=${dryRun} crink=${withCrink} audio=${withAudio}`,
  );
  let ok = 0;
  let fail = 0;
  for (const job of jobs) {
    if (putObject(job.key, job.file)) ok += 1;
    else fail += 1;
  }
  if (withCrink && jobs.length > 0) {
    writeCrinkManifest(jobs.filter((j) => j.key.includes("/crink/")));
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
  if (fail > 0) process.exit(1);
}

main();
