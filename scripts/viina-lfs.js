/**
 * Pull Git LFS objects for vendor/VIINA (control zip, tessellation geojson).
 *
 * Usage:
 *   node scripts/viina-lfs.js
 */

const { execFileSync } = require("child_process");
const path = require("path");

const VIINA_DIR = path.join(__dirname, "..", "vendor", "VIINA");

function main() {
  console.log(`→ git lfs pull (${VIINA_DIR})`);
  execFileSync("git", ["lfs", "pull"], {
    cwd: VIINA_DIR,
    stdio: "inherit",
  });
  console.log("✓ VIINA LFS pull complete");
}

try {
  main();
} catch (error) {
  console.error("viina-lfs failed:", error.message || error);
  process.exit(1);
}
