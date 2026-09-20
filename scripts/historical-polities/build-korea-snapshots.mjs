/**
 * Build Korea historical overlay snapshots from korean_history_geo.geojson
 * (Claude / authored KR pipeline). Aligns years with Cliopatria scrubber.
 *
 * Usage:
 *   node scripts/historical-polities/build-korea-snapshots.mjs
 *   node scripts/historical-polities/build-korea-snapshots.mjs --source=C:/Users/.../korean_history_geo.geojson
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

/** Same scrubber years as Cliopatria + Balhae peak denser samples. */
const SNAPSHOT_YEARS = [
  -3000, -2000, -1000, -500, -200, 0, 200, 400, 600, 800,
  825, 850, 900, // Balhae peak — bh-ext-830-final (Liaodong + Primorye)
  1000, 1200, 1400,
  1500, 1600, 1700, 1750, 1800, 1850, 1900, 1914, 1919, 1939, 1945, 1950,
  1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024,
];

/** Paleolithic / backdrop sentinels — keep in full source, skip timeline fills. */
const YEAR_FLOOR = -12000;

const FILL_LAYERS = new Set([
  "polity",
  "polity_prehistory",
  "hypothesis",
]);

const DEFAULT_SOURCE_CANDIDATES = [
  path.resolve(ROOT, "public/data/historical/korea/korean_history_geo.geojson"),
  path.resolve("C:/Users/kangp/Downloads/korean_history_geo.geojson"),
];

function parseArgs(argv) {
  const out = { source: null, outDir: null };
  for (const a of argv) {
    if (a.startsWith("--source=")) out.source = path.resolve(a.slice(9));
    if (a.startsWith("--out=")) out.outDir = path.resolve(a.slice(6));
  }
  if (!out.source) {
    out.source =
      DEFAULT_SOURCE_CANDIDATES.find((p) => fs.existsSync(p)) ||
      DEFAULT_SOURCE_CANDIDATES[0];
  }
  if (!out.outDir) {
    out.outDir = path.join(ROOT, "public", "data", "historical", "korea");
  }
  return out;
}

function activeInYear(props, year) {
  const from = Number(props.start_year);
  const to = Number(props.end_year);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
  if (from < YEAR_FLOOR) return false;
  return from <= year && year <= to;
}

function slimFeature(f) {
  const p = f.properties || {};
  return {
    type: "Feature",
    properties: {
      id: p.id ?? null,
      layer: p.layer ?? null,
      nameEn: p.name_en ?? null,
      nameKo: p.name_ko ?? null,
      category: p.category ?? null,
      role: p.role ?? null,
      startYear: p.start_year ?? null,
      endYear: p.end_year ?? null,
      confidence: p.confidence ?? null,
      license: p.license ?? null,
      wikipedia: p.wikipedia ?? null,
      wikidata: p.wikidata ?? null,
      sources: Array.isArray(p.sources) ? p.sources : p.sources ? [p.sources] : [],
      uiDefault: p.ui_default === true,
      label: Array.isArray(p.label) ? p.label : null,
      note: p.note ?? null,
      source: "korea",
    },
    geometry: f.geometry,
  };
}

function writeCredits(outDir) {
  fs.writeFileSync(
    path.join(outDir, "CREDITS.md"),
    `# Korea historical overlay

- Source file: \`korean_history_geo.geojson\` (authored KR / Claude pipeline)
- Mount: **역사 토글 only**, over worldwide Cliopatria fills (KR was excluded from global builds)
- Mixed licenses per feature \`license\` field:
  - CC-BY-4.0 (Cliopatria clips / adapted) — attribute Seshat Cliopatria
  - GPL-3.0 (historical-basemaps fragments) — keep GPL obligations if redistributing those polygons
  - Public domain (Natural Earth backdrop fragments)
  - \`original (authored)\` — project-authored; cite on-map sources when present

Always show dual credits with worldwide layers when both are painted.
`
  );
}

function updateHistoryLayers(outDir, yearEntries) {
  const unified = path.join(ROOT, "public", "data", "historical", "history-layers.json");
  if (!fs.existsSync(unified)) return;
  const u = JSON.parse(fs.readFileSync(unified, "utf8"));
  u.layers = (u.layers || []).filter((l) => l.id !== "korea");
  u.layers.push({
    id: "korea",
    role: "korea_overlay",
    license: "mixed (per-feature; see korea/CREDITS.md)",
    base: "/data/historical/korea",
    manifest: "/data/historical/korea/manifest.json",
  });
  u.renderHint = {
    ...(u.renderHint || {}),
    default: "cliopatria_fill_korea_overlay_basemap_optional_ohm_detail",
    korea:
      "paint on 역사 only; prefer uiDefault / layer=polity fills; hypothesis dashed; sites/battles optional",
  };
  u.koreaYears = yearEntries.map((y) => y.year);
  u.builtAt = new Date().toISOString();
  fs.writeFileSync(unified, JSON.stringify(u, null, 2));
  console.log("updated", unified);
}

function main() {
  const { source, outDir } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(source)) {
    console.error("Source not found:", source);
    process.exit(1);
  }

  console.log("reading", source);
  const raw = JSON.parse(fs.readFileSync(source, "utf8"));
  if (raw.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
    console.error("Expected FeatureCollection");
    process.exit(1);
  }

  fs.mkdirSync(path.join(outDir, "snapshots"), { recursive: true });

  // Keep canonical source next to snapshots (copy if building from Downloads)
  const destSource = path.join(outDir, "korean_history_geo.geojson");
  if (path.resolve(source) !== path.resolve(destSource)) {
    fs.copyFileSync(source, destSource);
    console.log("copied source →", destSource);
  }

  const features = raw.features;
  const licenseCounts = {};
  const layerCounts = {};
  for (const f of features) {
    const lic = f.properties?.license || "(none)";
    const layer = f.properties?.layer || "(none)";
    licenseCounts[lic] = (licenseCounts[lic] || 0) + 1;
    layerCounts[layer] = (layerCounts[layer] || 0) + 1;
  }

  const yearEntries = [];
  for (const year of SNAPSHOT_YEARS) {
    const active = features.filter((f) => activeInYear(f.properties || {}, year));
    const fills = active.filter((f) => FILL_LAYERS.has(f.properties?.layer));
    const uiFills = fills.filter((f) => f.properties?.ui_default !== false);

    // Snapshot = all active features (client filters by layer / uiDefault)
    const slimmed = active.map(slimFeature);
    const fc = {
      type: "FeatureCollection",
      properties: {
        year,
        source: "korea",
        fillHint: "layer in polity|polity_prehistory|hypothesis; prefer uiDefault",
      },
      features: slimmed,
    };
    const file = `snapshots/year_${year}.geojson`;
    const abs = path.join(outDir, file);
    fs.writeFileSync(abs, JSON.stringify(fc));
    const sizeMB = Number((fs.statSync(abs).size / (1024 * 1024)).toFixed(2));
    yearEntries.push({
      year,
      file,
      featureCount: slimmed.length,
      fillCount: fills.length,
      uiFillCount: uiFills.length,
      sizeMB,
    });
    console.log(
      `year ${year}: ${slimmed.length} feats (fills ${fills.length}, ui ${uiFills.length}) ${sizeMB}MB`
    );
  }

  const manifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    sourceFile: "korean_history_geo.geojson",
    role: "korea_overlay",
    mount: "history_toggle_only",
    license: "mixed (per-feature; see CREDITS.md)",
    korea: "included — worldwide Cliopatria/basemaps exclude KR; this layer owns peninsula",
    stack: {
      worldwide: "cliopatria + historical-basemaps + ohm",
      peninsula: "korea",
    },
    stats: {
      sourceFeatures: features.length,
      layerCounts,
      licenseCounts,
      yearFloor: YEAR_FLOOR,
    },
    years: yearEntries,
  };

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  writeCredits(outDir);
  updateHistoryLayers(outDir, yearEntries);
  console.log("wrote", path.join(outDir, "manifest.json"));
}

main();
