/**
 * 축 정렬 위성국(CRINK 제외) 국경 — geoecon-bloc(NE 110m)에서 추출.
 * axis-hub-countries.json(CHN/RUS/PRK/IRN, 10m)과 별개 — 연한 CRINK 빨강 오버레이 전용.
 *
 * Usage: node scripts/build-axis-satellite-countries.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public", "data", "lite", "geoecon-bloc-countries.json");
const OUT_LITE = path.join(ROOT, "public", "data", "lite", "axis-satellite-countries.json");
const OUT_FULL = path.join(ROOT, "public", "data", "full", "axis-satellite-countries.json");

/** AXIS_SATELLITE_ISOS — src/data/axisNetwork.ts 와 동기화 */
const SATELLITE_ISOS = [
  "BLR",
  "IRQ",
  "YEM",
  "LBN",
  "KAZ",
  "UZB",
  "TKM",
  "KGZ",
  "TJK",
  "CUB",
  "VEN",
  "MMR",
  "PAK",
];
const SAT_SET = new Set(SATELLITE_ISOS);

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing source:", SRC);
    process.exit(1);
  }

  const fc = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const byIso = new Map();
  for (const feature of fc.features || []) {
    const iso = feature?.properties?.iso;
    if (typeof iso !== "string" || !SAT_SET.has(iso)) continue;
    if (!feature.geometry) continue;
    byIso.set(iso, {
      type: "Feature",
      id: iso,
      properties: {
        iso,
        name: typeof feature.properties.name === "string" ? feature.properties.name : iso,
        role: "satellite",
      },
      geometry: feature.geometry,
    });
  }

  const missing = SATELLITE_ISOS.filter((iso) => !byIso.has(iso));
  if (missing.length) {
    console.error("Missing satellite countries in geoecon source:", missing.join(", "));
    process.exit(1);
  }

  const features = SATELLITE_ISOS.map((iso) => byIso.get(iso));
  const out = {
    type: "FeatureCollection",
    name: "axis-satellite-countries-ne110m",
    features,
  };
  const json = `${JSON.stringify(out)}\n`;

  for (const dir of [path.dirname(OUT_LITE), path.dirname(OUT_FULL)]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OUT_LITE, json);
  fs.writeFileSync(OUT_FULL, json);
  fs.writeFileSync(`${OUT_LITE}.gz`, zlib.gzipSync(Buffer.from(json)));
  fs.writeFileSync(`${OUT_FULL}.gz`, zlib.gzipSync(Buffer.from(json)));

  console.log(
    `Wrote ${features.length} satellites → lite/full axis-satellite-countries.json (${(json.length / 1024).toFixed(1)} KB)`,
  );
  console.log(features.map((f) => f.properties.iso).join(", "));
}

main();
