/**
 * Copy CesiumJS Build/Cesium static assets → public/cesium/
 * for window.CESIUM_BASE_URL = "/cesium/" (or NEXT_PUBLIC_CESIUM_BASE_URL CDN).
 *
 * Runs from `postinstall` and `npm run cesium:copy`.
 * Missing cesium package → warn + exit 0 (CI without optional install stays green).
 *
 * Usage: node scripts/copy-cesium-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, "public", "cesium");
const FOLDERS = ["Workers", "ThirdParty", "Assets", "Widgets"];

function resolveCesiumBuild() {
  const candidates = [
    path.join(ROOT, "node_modules", "cesium", "Build", "Cesium"),
    path.join(ROOT, "..", "node_modules", "cesium", "Build", "Cesium"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "Cesium.js"))) return dir;
  }
  return null;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

const build = resolveCesiumBuild();
if (!build) {
  console.warn("[copy-cesium-assets] cesium Build/Cesium not found — skip (npm i cesium first)");
  process.exit(0);
}

fs.mkdirSync(DEST, { recursive: true });
for (const folder of FOLDERS) {
  const from = path.join(build, folder);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-cesium-assets] missing ${folder}`);
    continue;
  }
  const to = path.join(DEST, folder);
  fs.rmSync(to, { recursive: true, force: true });
  copyDir(from, to);
  console.log(`[copy-cesium-assets] ${folder} → public/cesium/${folder}`);
}

const marker = path.join(DEST, ".copied-from-cesium");
try {
  const pkgPath = path.join(ROOT, "node_modules", "cesium", "package.json");
  const ver = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, "utf8")).version
    : "unknown";
  fs.writeFileSync(
    marker,
    `cesium@${ver}\nsource=${path.relative(ROOT, build).replace(/\\/g, "/")}\n`,
    "utf8",
  );
} catch {
  /* ignore marker write */
}

console.log("[copy-cesium-assets] done");
