/**
 * Shelved SIPRI summary ↔ public stubs.
 *
 * Usage:
 *   node scripts/publish-axis-arms.js           # restore real DB to public/
 *   node scripts/publish-axis-arms.js --unpublish  # blank stubs (no SIPRI rows)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VENDOR = path.join(__dirname, "vendor", "sipri", "axis-arms.json");
const TARGETS = [
  path.join(ROOT, "public", "data", "lite", "axis-arms.json"),
  path.join(ROOT, "public", "data", "full", "axis-arms.json"),
];

/** Frontend-safe empty payload — no source/citation/SIPRI fields */
const BLANK = JSON.stringify({ pairs: [], deals: [] }) + "\n";

const unpublish = process.argv.includes("--unpublish");

if (unpublish) {
  for (const t of TARGETS) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, BLANK);
    console.log("blanked", path.relative(ROOT, t));
  }
  process.exit(0);
}

if (!fs.existsSync(VENDOR)) {
  console.error("Missing vendor file:", VENDOR);
  console.error("Run: node scripts/build-axis-arms.js [trade-register.csv]");
  process.exit(1);
}

const raw = fs.readFileSync(VENDOR);
for (const t of TARGETS) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, raw);
  console.log("published", path.relative(ROOT, t));
}
