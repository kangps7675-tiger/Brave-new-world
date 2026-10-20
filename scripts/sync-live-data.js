// Live / scheduled sync pipeline: static extras → regional tensions.
// Optional: GDELT events.
//
// Usage:
//   node scripts/sync-live-data.js
//   node scripts/sync-live-data.js --quick          # tensions only (no gdelt)
//   node scripts/sync-live-data.js --with-gdelt
//   SYNC_FORCE=1 node scripts/sync-live-data.js

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const STATUS_PATH = path.join(ROOT, "public", "data", "sync-status.json");
const LOCK_PATH = path.join(ROOT, "public", "data", ".sync.lock");

const args = new Set(process.argv.slice(2));
const QUICK = args.has("--quick");
const WITH_GDELT = args.has("--with-gdelt") || args.has("--full");
const WITH_VIINA = args.has("--with-viina") || args.has("--full");
const FORCE = args.has("--force") || process.env.SYNC_FORCE === "1";

/** Default: consider snapshot stale after 6 hours */
const STALE_MS = Number(process.env.SYNC_STALE_MS || 6 * 60 * 60 * 1000);

function readStatus() {
  try {
    if (!fs.existsSync(STATUS_PATH)) return null;
    return JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeStatus(patch) {
  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  const prev = readStatus() || {};
  const next = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(next, null, 2));
  return next;
}

function runNode(scriptRel, env = {}) {
  const scriptPath = path.join(__dirname, scriptRel);
  console.log(`\n→ node scripts/${scriptRel}`);
  execFileSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
    timeout: 15 * 60 * 1000,
  });
}

function acquireLock() {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  if (fs.existsSync(LOCK_PATH)) {
    const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
    // API route may have just planted the lock before spawning this process.
    if (age < 20 * 60 * 1000) {
      const existing = fs.readFileSync(LOCK_PATH, "utf8").trim();
      if (existing && existing !== String(process.pid) && age > 30_000) {
        throw new Error(`sync already running (lock age ${Math.round(age / 1000)}s)`);
      }
    } else {
      fs.unlinkSync(LOCK_PATH);
    }
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
  } catch {
    // ignore
  }
}

function isFresh(status) {
  if (FORCE) return false;
  if (!status?.lastSuccessAt) return false;
  const age = Date.now() - new Date(status.lastSuccessAt).getTime();
  return Number.isFinite(age) && age < STALE_MS;
}

async function main() {
  const startedAt = new Date().toISOString();
  const prev = readStatus();
  if (isFresh(prev)) {
    const ageMin = Math.round((Date.now() - new Date(prev.lastSuccessAt).getTime()) / 60000);
    console.log(`sync skipped — fresh (${ageMin}m ago). Use --force to run.`);
    writeStatus({ lastSkipAt: startedAt, skipReason: "fresh" });
    return { skipped: true, status: readStatus() };
  }

  acquireLock();
  writeStatus({
    running: true,
    lastStartAt: startedAt,
    mode: QUICK ? "quick" : WITH_GDELT ? "extended" : "default",
    sources: {
      tensions: "scripts/data/*-tensions-seed.json (curated)",
      gdelt: WITH_GDELT ? "enabled" : "skipped",
      viina: WITH_VIINA ? "enabled" : "skipped",
    },
  });

  const steps = [];
  try {
    runNode("build-static-extras.js", { DATA_PROFILE: "full" });
    steps.push({ name: "static:build", ok: true });

    runNode("merge-regional-tensions.js");
    steps.push({ name: "tensions:regional", ok: true });

    if (WITH_GDELT) {
      try {
        runNode("gdelt-fetch.js");
        steps.push({ name: "gdelt:fetch", ok: true });
      } catch (error) {
        steps.push({ name: "gdelt:fetch", ok: false, error: error.message });
        console.warn("gdelt:fetch failed (non-fatal):", error.message);
      }
    }

    if (WITH_VIINA) {
      try {
        runNode("viina-lfs.js");
        runNode("build-viina-ukraine.js", { DATA_PROFILE: "lite" });
        steps.push({ name: "viina:build", ok: true });
      } catch (error) {
        steps.push({ name: "viina:build", ok: false, error: error.message });
        console.warn("viina:build failed (non-fatal):", error.message);
      }
    }

    const finishedAt = new Date().toISOString();
    const status = writeStatus({
      running: false,
      lastSuccessAt: finishedAt,
      lastError: null,
      lastDurationMs: Date.now() - new Date(startedAt).getTime(),
      steps,
      nextRecommendedAt: new Date(Date.now() + STALE_MS).toISOString(),
    });
    console.log("\n✓ sync-live-data complete", finishedAt);
    return { skipped: false, status };
  } catch (error) {
    writeStatus({
      running: false,
      lastError: error.message || String(error),
      lastFailAt: new Date().toISOString(),
      steps,
    });
    throw error;
  } finally {
    releaseLock();
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      if (result.skipped) process.exit(0);
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
}

module.exports = { main, readStatus, STALE_MS, STATUS_PATH };
