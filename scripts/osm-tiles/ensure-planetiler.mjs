/**
 * Ensure portable Temurin JDK + Planetiler JAR under vendor/.
 * Windows-first (no Docker/WSL required).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "regions.json"), "utf8"),
);

const VENDOR = path.join(ROOT, CONFIG.vendorDir || "vendor");
const JDK_DIR = path.join(VENDOR, "jdk");
const PLANETILER_DIR = path.join(VENDOR, "planetiler");
const PLANETILER_JAR = path.join(PLANETILER_DIR, "planetiler.jar");

function log(...args) {
  console.log("[osm-tiles:ensure]", ...args);
}

async function download(url, dest, { redirects = 0 } = {}) {
  if (redirects > 12) throw new Error(`Too many redirects for ${url}`);
  log("download", url);
  const res = await fetch(url, { redirect: "manual" });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get("location");
    if (!loc) throw new Error(`Redirect without location: ${url}`);
    return download(new URL(loc, url).href, dest, { redirects: redirects + 1 });
  }
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.partial`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  fs.renameSync(tmp, dest);
  log("saved", dest, `(${(fs.statSync(dest).size / 1e6).toFixed(1)} MB)`);
}

function findJavaExe() {
  const win = path.join(JDK_DIR, "bin", "java.exe");
  const nix = path.join(JDK_DIR, "bin", "java");
  if (fs.existsSync(win)) return win;
  if (fs.existsSync(nix)) return nix;
  if (fs.existsSync(JDK_DIR)) {
    for (const name of fs.readdirSync(JDK_DIR)) {
      const candWin = path.join(JDK_DIR, name, "bin", "java.exe");
      const candNix = path.join(JDK_DIR, name, "bin", "java");
      if (fs.existsSync(candWin)) return candWin;
      if (fs.existsSync(candNix)) return candNix;
    }
  }
  return null;
}

async function ensureJdk() {
  const existing = findJavaExe();
  if (existing) {
    log("JDK OK", existing);
    return existing;
  }

  fs.mkdirSync(JDK_DIR, { recursive: true });
  const major = CONFIG.jdkMajor || 21;
  const api =
    `https://api.adoptium.net/v3/assets/latest/${major}/hotspot` +
    `?architecture=x64&image_type=jdk&os=windows&vendor=eclipse`;

  log("resolving Temurin JDK via Adoptium API…");
  const res = await fetch(api);
  if (!res.ok) throw new Error(`Adoptium API HTTP ${res.status}`);
  const assets = await res.json();
  const pkg = assets?.[0]?.binary?.package;
  const zipUrl = pkg?.link;
  if (!zipUrl) throw new Error("Adoptium API returned no Windows JDK package");

  const zipPath = path.join(VENDOR, `temurin-${major}-jdk-windows-x64.zip`);
  if (!fs.existsSync(zipPath)) {
    await download(zipUrl, zipPath);
  } else {
    log("reuse zip", zipPath);
  }

  log("extracting JDK (PowerShell Expand-Archive)…");
  const extractTo = path.join(VENDOR, `jdk-extract-${Date.now()}`);
  fs.mkdirSync(extractTo, { recursive: true });
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractTo.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" },
  );

  const kids = fs.readdirSync(extractTo);
  const top = kids.length === 1 ? path.join(extractTo, kids[0]) : extractTo;
  if (fs.existsSync(JDK_DIR)) fs.rmSync(JDK_DIR, { recursive: true, force: true });
  fs.renameSync(top, JDK_DIR);
  fs.rmSync(extractTo, { recursive: true, force: true });

  const java = findJavaExe();
  if (!java) throw new Error("JDK extracted but java.exe not found");
  log("JDK ready", java);
  try {
    execFileSync(java, ["-version"], { stdio: "inherit" });
  } catch {
    /* version prints to stderr */
  }
  return java;
}

async function ensurePlanetilerJar() {
  if (fs.existsSync(PLANETILER_JAR) && fs.statSync(PLANETILER_JAR).size > 1e6) {
    log("Planetiler OK", PLANETILER_JAR);
    return PLANETILER_JAR;
  }
  fs.mkdirSync(PLANETILER_DIR, { recursive: true });
  const url =
    CONFIG.planetilerJarUrl ||
    "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar";
  await download(url, PLANETILER_JAR);
  return PLANETILER_JAR;
}

export async function ensurePlanetilerToolchain() {
  const java = await ensureJdk();
  const jar = await ensurePlanetilerJar();
  return { java, jar, vendor: VENDOR };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  ensurePlanetilerToolchain()
    .then((t) => {
      log("done", t);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
