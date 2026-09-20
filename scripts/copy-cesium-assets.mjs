#!/usr/bin/env node
/**
 * Cesium Workers / Assets / ThirdParty / Widgets → public/cesium
 * (MapLibre worker 복사와 동일한 패턴 — webpack import.meta URL 회피)
 */
import {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  statSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const srcRoot = join(projectRoot, "node_modules", "cesium", "Build", "Cesium");
const destRoot = join(projectRoot, "public", "cesium");
const STAMP = join(destRoot, ".copy-stamp");

const DIRS = ["Workers", "Assets", "ThirdParty", "Widgets"];

if (!existsSync(join(srcRoot, "Cesium.js"))) {
  console.warn(
    "[copy-cesium-assets] cesium 미설치 — npm install cesium 후 다시 실행하세요.",
  );
  process.exit(0);
}

function packageMtime() {
  try {
    return String(statSync(join(projectRoot, "node_modules", "cesium", "package.json")).mtimeMs);
  } catch {
    return "0";
  }
}

const stamp = packageMtime();
if (existsSync(STAMP) && readFileSync(STAMP, "utf8").trim() === stamp) {
  console.log("[copy-cesium-assets] public/cesium 최신 — 건너뜀");
  process.exit(0);
}

if (existsSync(destRoot)) {
  rmSync(destRoot, { recursive: true, force: true });
}
mkdirSync(destRoot, { recursive: true });

for (const name of DIRS) {
  const from = join(srcRoot, name);
  const to = join(destRoot, name);
  if (!existsSync(from)) {
    console.warn(`[copy-cesium-assets] 없음: ${from}`);
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[copy-cesium-assets] ${name} → public/cesium/${name}`);
}

writeFileSync(STAMP, stamp, "utf8");
console.log("[copy-cesium-assets] 완료");
