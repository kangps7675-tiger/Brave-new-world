/**
 * Shelved SIPRI summary ↔ public stubs.
 *
 * Usage:
 *   node scripts/publish-axis-arms.js           # restore real DB to src/data/sipri/
 *   node scripts/publish-axis-arms.js --unpublish  # blank stubs (no SIPRI rows)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VENDOR = path.join(__dirname, "vendor", "sipri", "axis-arms.json");
const TARGETS = [
  // 공개 폴더가 아니라 서버 번들 쪽 — SIPRI 조건(유저가 원본을 내려받지 못해야 함)
  path.join(ROOT, "src", "data", "sipri", "axis-arms.json"),
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

