import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Reuse the project's Natural Earth geometry; no third-party tile requests or keys.
const input = new URL("../public/data/lite/countries.json", import.meta.url);
const output = new URL("../public/data/missile-context.geojson", import.meta.url);
const countries = JSON.parse(readFileSync(input, "utf8"));
const ids = new Set(["PRK", "KOR", "JPN", "CHN", "RUS", "TWN", "MNG"]);
const features = countries.filter(country => ids.has(country.id)).map(country => ({
  type: "Feature", properties: { id: country.id, name: country.name }, geometry: country.geometry,
}));
if (features.length !== ids.size) throw new Error("Missing missile context countries");
writeFileSync(output, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`Wrote ${features.length} countries to ${fileURLToPath(output)}`);
