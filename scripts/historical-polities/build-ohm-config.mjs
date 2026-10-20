/**
 * Write OHM (OpenHistoricalMap) entry into history-layers.json.
 * Uses hosted vector tiles — no planet PBF download.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const UNIFIED = path.join(ROOT, "public", "data", "historical", "history-layers.json");
const OHM_MANIFEST = path.join(ROOT, "public", "data", "historical", "ohm", "manifest.json");

const ohmLayer = {
  id: "ohm",
  role: "historic_osm_detail",
  license: "ODbL (OpenHistoricalMap / OSM-style contribution)",
  base: "https://vtiles.openhistoricalmap.org/maps/ohm",
  styleUrl: "https://www.openhistoricalmap.org/map-styles/main/main.json",
  tiles: "https://vtiles.openhistoricalmap.org/maps/ohm/{z}/{x}/{y}.pbf",
  dateFilter: "@openhistoricalmap/maplibre-gl-dates",
  mount: "history_toggle_only",
  planetS3: "https://s3.amazonaws.com/planet.openhistoricalmap.org/",
  planetNote:
    "Planet PBFs often Glacier/Deep Archive — use live vtiles, do not mirror into git.",
};

fs.mkdirSync(path.dirname(OHM_MANIFEST), { recursive: true });
fs.writeFileSync(
  OHM_MANIFEST,
  JSON.stringify(
    {
      version: 1,
      builtAt: new Date().toISOString(),
      ...ohmLayer,
      reuseWiki: "https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse",
      plugin: "https://github.com/OpenHistoricalMap/maplibre-gl-dates",
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(ROOT, "public", "data", "historical", "ohm", "CREDITS.md"),
  `# OpenHistoricalMap

- Site: https://www.openhistoricalmap.org/
- Vector tiles: \`https://vtiles.openhistoricalmap.org/maps/ohm/{z}/{x}/{y}.pbf\`
- Style: https://www.openhistoricalmap.org/map-styles/main/main.json
- Date filter: [@openhistoricalmap/maplibre-gl-dates](https://github.com/OpenHistoricalMap/maplibre-gl-dates) (CC0)
- Reuse: https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse
- Planet dumps (optional offline): https://s3.amazonaws.com/planet.openhistoricalmap.org/ — often cold storage; **not** used in this build.

Data is contributed under OHM/OSM licensing (typically ODbL for the database). Always attribute OpenHistoricalMap.
`
);

if (fs.existsSync(UNIFIED)) {
  const u = JSON.parse(fs.readFileSync(UNIFIED, "utf8"));
  u.layers = (u.layers || []).filter((l) => l.id !== "ohm");
  u.layers.push({
    id: ohmLayer.id,
    role: ohmLayer.role,
    license: ohmLayer.license,
    base: ohmLayer.base,
    styleUrl: ohmLayer.styleUrl,
    tiles: ohmLayer.tiles,
    dateFilter: ohmLayer.dateFilter,
    manifest: "/data/historical/ohm/manifest.json",
  });
  u.renderHint = {
    ...(u.renderHint || {}),
    default: "cliopatria_fill_basemap_optional_ohm_detail",
    ohm: "load style or vector source only on 역사; call filterByDate(year) on scrub",
  };
  u.builtAt = new Date().toISOString();
  fs.writeFileSync(UNIFIED, JSON.stringify(u, null, 2));
  console.log("updated", UNIFIED);
}

console.log("wrote", OHM_MANIFEST);
