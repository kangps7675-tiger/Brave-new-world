/**
 * Pre-compress public/data JSON for Cloudflare / static hosting (optional .json.gz sidecars).
 * node scripts/compress-data-gzip.js [lite|full|all]
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");

const gzip = promisify(zlib.gzip);
const ROOT = path.join(__dirname, "..");
const arg = process.argv[2] || "all";

const TARGETS =
  arg === "lite"
    ? [path.join(ROOT, "public", "data", "lite")]
    : arg === "full"
      ? [path.join(ROOT, "public", "data", "full")]
      : [path.join(ROOT, "public", "data", "lite"), path.join(ROOT, "public", "data", "full")];

const PRIORITY = [
  "app-data.json",
  "gdelt-events.json",
  "countries.json",
  "disputes.json",
  "places.json",
  "roads.json",
  "railroads.json",
  "country-borders.json",
  "dispute-boundaries.json",
  "coastlines.json",
];

async function compressDir(dir) {
  if (!fs.existsSync(dir)) return;
  let count = 0;
  let saved = 0;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  files.sort((a, b) => {
    const ai = PRIORITY.indexOf(a);
    const bi = PRIORITY.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const file of files) {
    const src = path.join(dir, file);
    const raw = fs.readFileSync(src);
    const compressed = await gzip(raw, { level: 9 });
    const dest = `${src}.gz`;
    fs.writeFileSync(dest, compressed);
    count += 1;
    saved += raw.length - compressed.length;
  }

  console.log(
    `✓ ${path.relative(ROOT, dir)}: ${count} .json.gz (${(saved / 1024 / 1024).toFixed(2)} MB saved vs raw)`,
  );
}

async function main() {
  console.log("\n=== gzip data JSON ===\n");
  for (const dir of TARGETS) {
    await compressDir(dir);
  }
  console.log("\nDone. CDN may also compress on the fly; .gz sidecars for precompressed static deploy.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
