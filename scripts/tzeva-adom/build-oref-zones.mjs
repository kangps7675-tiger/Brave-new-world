/**
 * Rebuild src/data/israel-oref-zones.json from eladnava/pikud-haoref-api cities.json.
 *
 * Usage:
 *   node scripts/tzeva-adom/build-oref-zones.mjs
 *   node scripts/tzeva-adom/build-oref-zones.mjs path/to/cities.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outPath = path.join(root, "src/data/israel-oref-zones.json");
const defaultCities = path.join(root, "tmp/oref-zones/eladnava-cities.json");
const citiesPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultCities;

if (!fs.existsSync(citiesPath)) {
  console.error(`Missing cities file: ${citiesPath}`);
  console.error("Download first:");
  console.error(
    "  curl.exe -sL https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json -o tmp/oref-zones/eladnava-cities.json",
  );
  process.exit(1);
}

const cities = JSON.parse(fs.readFileSync(citiesPath, "utf8"));
const existing = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, "utf8"))
  : [];

const byName = new Map();
for (const z of existing) {
  if (z?.name && Number.isFinite(z.lat) && Number.isFinite(z.lng)) {
    byName.set(z.name, { name: z.name, lat: z.lat, lng: z.lng });
  }
}

let added = 0;
let skipped = 0;
for (const c of cities) {
  const name = String(c.name || "").trim();
  if (!name || name === "בחר הכל" || c.value === "all") {
    skipped += 1;
    continue;
  }
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    skipped += 1;
    continue;
  }
  if (lat < 29.0 || lat > 34.0 || lng < 33.5 || lng > 36.5) {
    skipped += 1;
    continue;
  }
  if (!byName.has(name)) {
    byName.set(name, { name, lat, lng });
    added += 1;
  }
}

const out = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "he"));
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log({ existing: existing.length, added, skipped, total: out.length, outPath });
