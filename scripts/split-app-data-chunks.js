// Split monolithic app-data.json → manifest + chunk files (no Natural Earth rebuild)
// node scripts/split-app-data-chunks.js [lite|full|all]

const path = require("path");
const { splitMonolithicAppData } = require("./app-data-chunks");

const ROOT = path.join(__dirname, "..");
const arg = process.argv[2] || "all";

const DIRS =
  arg === "lite"
    ? [path.join(ROOT, "public", "data", "lite")]
    : arg === "full"
      ? [path.join(ROOT, "public", "data", "full")]
      : [
          path.join(ROOT, "public", "data", "lite"),
          path.join(ROOT, "public", "data", "full"),
          path.join(ROOT, "public", "data"),
        ];

console.log("\n=== split app-data chunks ===\n");
for (const dir of DIRS) {
  splitMonolithicAppData(dir);
}
console.log("\nDone.\n");
