/**
 * Upload CesiumJS Build/Cesium static assets to Cloudflare R2.
 *
 * Source (first match):
 *   - node_modules/cesium/Build/Cesium
 *   - ../node_modules/cesium/Build/Cesium  (parent install)
 *
 * Destination keys:
 *   static/cesium/<version>/**           (individual assets for CESIUM_BASE_URL)
 *   static/cesium/cesium-<version>.zip   (full archive)
 *   optional: static/cesium/latest/**    (--with-latest)
 *
 * Usage:
 *   node scripts/r2-upload-cesium.js
 *   node scripts/r2-upload-cesium.js --dry-run
 *   node scripts/r2-upload-cesium.js --concurrency=16
 *   node scripts/r2-upload-cesium.js --with-latest
 *   node scripts/r2-upload-cesium.js --zip-only
 *   node scripts/r2-upload-cesium.js --no-zip
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUCKET = process.env.R2_DATA_BUCKET || "conflict-view-data";
const PREFIX = process.env.R2_CESIUM_PREFIX || "static/cesium";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const withLatest = args.includes("--with-latest");
const zipOnly = args.includes("--zip-only");
const noZip = args.includes("--no-zip");
const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
const concurrency = Math.max(
  1,
  Number(concurrencyArg?.replace("--concurrency=", "") || process.env.R2_UPLOAD_CONCURRENCY || 16) ||
    16,
);

function resolveWranglerEntry() {
  const local = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
  if (fs.existsSync(local)) return { cmd: process.execPath, argsPrefix: [local] };
  return { cmd: "npx", argsPrefix: ["wrangler"], shell: true };
}

const WRANGLER = resolveWranglerEntry();

function resolveCesiumRoot() {
  const candidates = [
    path.join(ROOT, "node_modules", "cesium", "Build", "Cesium"),
    path.join(ROOT, "..", "node_modules", "cesium", "Build", "Cesium"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "Cesium.js"))) return dir;
  }
  return null;
}

function readCesiumVersion(cesiumBuildDir) {
  const pkgPaths = [
    path.join(cesiumBuildDir, "..", "..", "package.json"),
    path.join(cesiumBuildDir, "..", "package.json"),
  ];
  for (const pkgPath of pkgPaths) {
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.name === "cesium" && pkg.version) return pkg.version;
      if (pkg.version) return pkg.version;
    } catch {
      /* ignore */
    }
  }
  return "unknown";
}

function contentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return "application/javascript; charset=utf-8";
  }
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".wasm")) return "application/wasm";
  if (lower.endsWith(".gltf")) return "model/gltf+json";
  if (lower.endsWith(".glb")) return "model/gltf-binary";
  if (lower.endsWith(".ktx2")) return "image/ktx2";
  if (lower.endsWith(".bin")) return "application/octet-stream";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".glsl") || lower.endsWith(".vert") || lower.endsWith(".frag")) {
    return "text/plain; charset=utf-8";
  }
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".map")) return "application/json";
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

function putObject(key, filePath) {
  const ct = contentType(filePath);
  if (dryRun) {
    console.log(`[dry-run] ${key} ← ${path.relative(ROOT, filePath)}`);
    return Promise.resolve(true);
  }
  const cmdArgs = [
    ...WRANGLER.argsPrefix,
    "r2",
    "object",
    "put",
    `${BUCKET}/${key}`,
    `--file=${filePath}`,
    `--content-type=${ct}`,
    "--remote",
  ];
  return new Promise((resolve) => {
    const child = spawn(WRANGLER.cmd, cmdArgs, {
      cwd: ROOT,
      shell: Boolean(WRANGLER.shell),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      console.error(`FAIL ${key}: ${err.message}`);
      resolve(false);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`FAIL ${key}`);
        if (stdout.trim()) console.error(stdout.trim());
        if (stderr.trim()) console.error(stderr.trim());
        resolve(false);
        return;
      }
      console.log(`OK  ${key}`);
      resolve(true);
    });
  });
}

async function runPool(jobs) {
  let ok = 0;
  let fail = 0;
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, jobs.length || 1) }, async () => {
    while (idx < jobs.length) {
      const job = jobs[idx];
      idx += 1;
      const success = await putObject(job.key, job.file);
      if (success) ok += 1;
      else fail += 1;
    }
  });
  await Promise.all(workers);
  return { ok, fail };
}

async function createZipArchive(cesiumRoot, version) {
  const admZipPath = path.join(ROOT, "node_modules", "adm-zip");
  if (!fs.existsSync(admZipPath)) {
    throw new Error("adm-zip not found; cannot build Cesium zip archive");
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const AdmZip = require("adm-zip");
  const zip = new AdmZip();
  zip.addLocalFolder(cesiumRoot, `Cesium-${version}`);
  const outDir = path.join(os.tmpdir(), "conflict-view-cesium-upload");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `cesium-${version}.zip`);
  zip.writeZip(outPath);
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
  console.log(`zip ready ${outPath} (${sizeMb} MB)`);
  return outPath;
}

async function main() {
  const cesiumRoot = resolveCesiumRoot();
  if (!cesiumRoot) {
    console.error(
      "Cesium Build/Cesium not found. Run: npm install cesium (in app or parent folder)",
    );
    process.exit(1);
  }
  const version = readCesiumVersion(cesiumRoot);
  const versionPrefix = `${PREFIX}/${version}`;
  const jobs = [];

  if (!zipOnly) {
    const files = walkFiles(cesiumRoot);
    if (files.length === 0) {
      console.error(`No files under ${cesiumRoot}`);
      process.exit(1);
    }
    for (const file of files) {
      const rel = path.relative(cesiumRoot, file).split(path.sep).join("/");
      jobs.push({ key: `${versionPrefix}/${rel}`, file });
      if (withLatest) {
        jobs.push({ key: `${PREFIX}/latest/${rel}`, file });
      }
    }
  }

  let zipPath = null;
  if (!noZip) {
    zipPath = await createZipArchive(cesiumRoot, version);
    jobs.push({ key: `${PREFIX}/cesium-${version}.zip`, file: zipPath });
  }

  console.log(
    `R2 Cesium upload → bucket=${BUCKET} version=${version} objects=${jobs.length} concurrency=${concurrency} dryRun=${dryRun} wrangler=${WRANGLER.argsPrefix.join(" ")}`,
  );
  console.log(`source=${cesiumRoot}`);
  if (!zipOnly) console.log(`cdn base (versioned): ${versionPrefix}/`);
  if (withLatest) console.log(`cdn base (latest): ${PREFIX}/latest/`);
  if (zipPath) console.log(`archive key: ${PREFIX}/cesium-${version}.zip`);

  const { ok, fail } = await runPool(jobs);
  console.log(`Done. ok=${ok} fail=${fail}`);
  if (zipPath && fs.existsSync(zipPath)) {
    try {
      fs.unlinkSync(zipPath);
    } catch {
      /* ignore */
    }
  }
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
