// Download SIGINT news-layers GeoJSON into scripts/vendor/sigint-news-layers/
// node scripts/fetch-sigint-layers.js

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "vendor", "sigint-news-layers");
const BASE =
  "https://raw.githubusercontent.com/Skytuhua/SIGINT/main/public/data/news-layers";

const FILES = [
  "nuclear-sites.geojson",
  "military-bases.geojson",
  "internet-exchanges.geojson",
  "refugee-camps.geojson",
  "ucdp-events.geojson",
  "critical-minerals.geojson",
  "trade-routes.geojson",
  "sanctions-entities.geojson",
  "sanctions-entities.json",
  "arms-embargo-zones.geojson",
  "ai-data-centers.geojson",
  "economic-centers.geojson",
  "conflict-zones.geojson",
  // fetched for later sprint; not converted in phase A priority
  "pipelines.geojson",
  "volcanoes.geojson",
  "spaceports.geojson",
  "maritime-chokepoints.geojson",
  "armed-conflict.geojson",
  "water-stress-zones.geojson",
  "strategic-waterways.geojson",
  "trade-route-nodes.geojson",
];

async function download(name) {
  const url = `${BASE}/${name}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(path.join(OUT_DIR, name), text);
  console.log(`   ${name}: ${text.length.toLocaleString()} bytes`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("fetch-sigint-layers →", OUT_DIR);
  for (const file of FILES) {
    try {
      await download(file);
    } catch (error) {
      console.warn(`   skip ${file}:`, error.message);
    }
  }
  fs.writeFileSync(
    path.join(OUT_DIR, "ATTRIBUTION.md"),
    [
      "# SIGINT news-layers snapshot",
      "",
      "Source: https://github.com/Skytuhua/SIGINT",
      "License: MIT",
      `Fetched: ${new Date().toISOString()}`,
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
