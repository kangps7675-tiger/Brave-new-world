/**
 * Ingest aourednik/historical-basemaps into 역사 toggle + cross-check vs Cliopatria.
 *
 * - Filters Korea-related NAME/SUBJECTO/PARTOF (Claude KR pipeline owns Korea).
 * - Writes filtered GeoJSON + unified history manifest for dual-layer scrubber.
 * - Cross-validates overlapping years against Cliopatria snapshots; records known
 *   upstream issues and prefer-rules when basemaps diverge from better sources.
 *
 * Usage (from Next app root Confilct-view-dev/):
 *   node scripts/historical-polities/build-basemaps-crosscheck.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REPO_PARENT = path.resolve(ROOT, "..");

const BASEMAPS_ROOT = path.join(REPO_PARENT, "historical-basemaps-ref");
const CLIOPATRIA_DIR = path.join(ROOT, "public", "data", "historical", "cliopatria");
const OUT_DIR = path.join(ROOT, "public", "data", "historical", "basemaps");
const UNIFIED_DIR = path.join(ROOT, "public", "data", "historical");

const KOREA_EXCLUDE_RE =
  /\b(korea|korean|joseon|chos[oŏ]n|chosun|goryeo|koryo|goguryeo|koguryo|baekje|paekche|silla|balhae|parhae|bohai|buyeo|puyo|samhan|gojoseon|hanguk|daehan|unified\s*silla)\b/i;

/**
 * Known upstream issues → product rules (history toggle only).
 * Sources: GitHub issues on aourednik/historical-basemaps + author notes.
 */
const KNOWN_ISSUE_RULES = [
  {
    id: "turkey-1930-label",
    years: [1930],
    status: "upstream_fixed_verify",
    issue: "https://github.com/aourednik/historical-basemaps/issues/52",
    note: "1930 had Ottoman label error; author closed as fixed Sep 2026 — verify Republic of Turkey present.",
    onFail: "prefer_cliopatria_near_east",
  },
  {
    id: "turkey-1938-fragment",
    years: [1938],
    status: "verify",
    issue: "https://github.com/aourednik/historical-basemaps/issues/52",
    note: "Report claimed Sèvres-like fragmentation; verify single Turkey with BP>=2.",
    onFail: "prefer_cliopatria_near_east",
  },
  {
    id: "umayyad-abbasid-borders",
    years: [700, 800],
    status: "caution",
    issue: "https://github.com/aourednik/historical-basemaps/issues/47",
    note: "Umayyad/Abbasid border disputes reported — keep BORDERPRECISION blur; prefer Cliopatria for polity fills when both loaded.",
    prefer: "cliopatria_fill_basemap_outline",
  },
  {
    id: "polygon-winding-1600s",
    years: [1500, 1600, 1650, 1700, 1715, 1783, 1800],
    status: "upstream_fixed_historical",
    issue: "https://github.com/aourednik/historical-basemaps/issues/18",
    note: "Past d3 winding bugs (PR #21). Re-check render; if broken, skip basemap for that year.",
  },
  {
    id: "india-present-borders",
    years: [1994, 2000, 2010],
    status: "caution",
    issue: "https://github.com/aourednik/historical-basemaps/issues/14",
    note: "Modern India border disputes — show BP; do not treat as legal boundary.",
  },
  {
    id: "pre-westphalia-fuzzy",
    yearsBefore: 1648,
    status: "expected",
    note: "Basemaps README: national borders less meaningful pre-1648; use opacity/blur via BORDERPRECISION.",
  },
];

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(the|empire|kingdom|republic|of|and|dynasty|caliphate|sultanate|confederation|federation|states?|people'?s?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isKoreaRelated(props) {
  const blob = [props.NAME, props.name, props.SUBJECTO, props.PARTOF]
    .filter(Boolean)
    .join(" | ");
  return KOREA_EXCLUDE_RE.test(blob);
}

function loadIndex() {
  const idx = JSON.parse(
    fs.readFileSync(path.join(BASEMAPS_ROOT, "index.json"), "utf8")
  );
  return idx.years.filter((y) => y.year >= -3000 && y.year <= 2024);
}

function verifyTurkey1930(geo) {
  const names = geo.features.map((f) => f.properties.NAME || "");
  const hasOttoman = names.some((n) => /ottoman/i.test(n));
  const hasRepublic = names.some((n) => /republic of turkey|^turkey$/i.test(n));
  return {
    ok: hasRepublic && !hasOttoman,
    hasOttoman,
    hasRepublic,
    turkeyCount: names.filter((n) => /turkey/i.test(n)).length,
  };
}

function verifyTurkey1938(geo) {
  const turkeys = geo.features.filter((f) =>
    /turkey/i.test(f.properties.NAME || "")
  );
  const areas = turkeys.map((f) => {
    // rough: count coordinate rings as complexity proxy
    const g = f.geometry;
    if (!g) return 0;
    if (g.type === "Polygon") return 1;
    if (g.type === "MultiPolygon") return g.coordinates.length;
    return 0;
  });
  const multiParts = areas.reduce((a, b) => a + b, 0);
  // Fragmented occupation map would be many small pieces; unified Turkey ~1–few polys
  return {
    ok: turkeys.length >= 1 && multiParts <= 8,
    turkeyFeatures: turkeys.length,
    multiParts,
  };
}

function crossCheckYear(year, basemapNames, clioNames) {
  const bSet = new Set(basemapNames.map(normalizeName).filter(Boolean));
  const cSet = new Set(clioNames.map(normalizeName).filter(Boolean));
  let overlap = 0;
  for (const n of bSet) if (cSet.has(n)) overlap++;
  const onlyBasemap = [...bSet].filter((n) => !cSet.has(n)).slice(0, 40);
  const onlyClio = [...cSet].filter((n) => !bSet.has(n)).slice(0, 40);
  const denom = Math.max(1, Math.min(bSet.size, cSet.size));
  return {
    year,
    basemapUnique: bSet.size,
    cliopatriaUnique: cSet.size,
    nameOverlap: overlap,
    overlapRatio: Number((overlap / denom).toFixed(3)),
    sampleOnlyBasemap: onlyBasemap,
    sampleOnlyCliopatria: onlyClio,
  };
}

function loadCliopatriaNames(year) {
  // Prefer exact snapshot; else nearest available year in manifest
  const manPath = path.join(CLIOPATRIA_DIR, "manifest.json");
  if (!fs.existsSync(manPath)) return null;
  const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
  const years = man.years.map((y) => y.year).sort((a, b) => a - b);
  let y = year;
  if (!years.includes(year)) {
    y = years.reduce((best, cur) =>
      Math.abs(cur - year) < Math.abs(best - year) ? cur : best
    );
  }
  const snap = path.join(CLIOPATRIA_DIR, "snapshots", `year_${y}.geojson`);
  if (!fs.existsSync(snap)) return null;
  const g = JSON.parse(fs.readFileSync(snap, "utf8"));
  return {
    matchedYear: y,
    names: g.features.map((f) => f.properties.name).filter(Boolean),
  };
}

async function main() {
  if (!fs.existsSync(BASEMAPS_ROOT)) {
    console.error("Missing", BASEMAPS_ROOT, "— clone aourednik/historical-basemaps first");
    process.exit(1);
  }

  fs.mkdirSync(path.join(OUT_DIR, "geojson"), { recursive: true });

  const entries = loadIndex();
  const yearIndex = [];
  const crosschecks = [];
  const verifications = [];
  let skippedKoreaTotal = 0;

  for (const entry of entries) {
    const src = path.join(BASEMAPS_ROOT, "geojson", entry.filename);
    if (!fs.existsSync(src)) {
      console.warn("skip missing", entry.filename);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(src, "utf8"));
    const kept = [];
    let skippedKorea = 0;
    for (const f of raw.features || []) {
      const p = f.properties || {};
      if (isKoreaRelated(p)) {
        skippedKorea++;
        continue;
      }
      kept.push({
        type: "Feature",
        properties: {
          name: p.NAME ?? p.name ?? null,
          subjecto: p.SUBJECTO ?? null,
          partof: p.PARTOF ?? null,
          borderPrecision: p.BORDERPRECISION ?? null,
          source: "historical-basemaps",
          year: entry.year,
        },
        geometry: f.geometry,
      });
    }
    skippedKoreaTotal += skippedKorea;

    const outName = entry.filename.replace(/\.geojson$/i, "") + ".geojson";
    const fc = {
      type: "FeatureCollection",
      name: `basemaps_${entry.year}`,
      properties: {
        year: entry.year,
        source: "aourednik/historical-basemaps",
        license: "GPL-3.0",
        licenseUrl: "https://www.gnu.org/licenses/gpl-3.0.html",
        attribution:
          "Historical basemaps © contributors (GPL-3.0). Korea entities excluded.",
        upstream: "https://github.com/aourednik/historical-basemaps",
        excluded: "korea_related",
      },
      features: kept,
    };
    const outPath = path.join(OUT_DIR, "geojson", outName);
    fs.writeFileSync(outPath, JSON.stringify(fc));
    const mb = Number((fs.statSync(outPath).size / (1024 * 1024)).toFixed(2));

    yearIndex.push({
      year: entry.year,
      file: `geojson/${outName}`,
      featureCount: kept.length,
      skippedKorea,
      sizeMB: mb,
    });

    // Verifications for known issue years
    if (entry.year === 1930) {
      const v = verifyTurkey1930(raw);
      verifications.push({ year: 1930, check: "turkey_label", ...v });
      console.log("verify 1930 Turkey", v);
    }
    if (entry.year === 1938) {
      const v = verifyTurkey1938(raw);
      verifications.push({ year: 1938, check: "turkey_fragment", ...v });
      console.log("verify 1938 Turkey", v);
    }

    const clio = loadCliopatriaNames(entry.year);
    if (clio) {
      const basemapNames = kept
        .map((f) => f.properties.name || f.properties.subjecto)
        .filter(Boolean);
      const cc = crossCheckYear(entry.year, basemapNames, clio.names);
      cc.cliopatriaSnapshotYear = clio.matchedYear;
      crosschecks.push(cc);
      console.log(
        `cross ${entry.year}: basemap=${cc.basemapUnique} clio=${cc.cliopatriaUnique} overlap=${cc.overlapRatio}`
      );
    } else {
      console.log(`year ${entry.year}: wrote ${kept.length} feats (no Cliopatria snap)`);
    }
  }

  // Prefer rules from verification failures
  const preferRules = [];
  for (const v of verifications) {
    if (v.check === "turkey_label" && !v.ok) {
      preferRules.push({
        year: 1930,
        prefer: "cliopatria",
        reason: "Turkey still labeled Ottoman in basemaps",
      });
    }
    if (v.check === "turkey_fragment" && !v.ok) {
      preferRules.push({
        year: 1938,
        prefer: "cliopatria",
        reason: "Turkey appears over-fragmented vs unified republic borders",
      });
    }
  }
  // Low overlap modern years → caution prefer cliopatria for fills
  for (const cc of crosschecks) {
    if (cc.year >= 1880 && cc.overlapRatio < 0.05 && cc.cliopatriaUnique > 20) {
      preferRules.push({
        year: cc.year,
        prefer: "cliopatria_fill_basemap_context",
        reason: `Very low name overlap (${cc.overlapRatio}) — different naming schemes; use Cliopatria for polity fill, basemaps as cultural/colonial SUBJECTO context`,
      });
    }
  }

  const basemapManifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    sourceProject: "https://github.com/aourednik/historical-basemaps",
    license: "GPL-3.0",
    licenseNote:
      "GeoJSON redistributed under GPL-3.0. Keep LICENSE with these files. App code remains separate; do not amalgamate into proprietary closed distribution without GPL compliance.",
    korea: "excluded — separate Claude pipeline",
    mount: "history_toggle_only",
    stats: {
      years: yearIndex.length,
      skippedKoreaTotal,
    },
    years: yearIndex,
    knownIssueRules: KNOWN_ISSUE_RULES,
    verifications,
    preferRules,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(basemapManifest, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "crosscheck-vs-cliopatria.json"),
    JSON.stringify({ builtAt: basemapManifest.builtAt, crosschecks }, null, 2)
  );

  fs.copyFileSync(
    path.join(BASEMAPS_ROOT, "LICENSE"),
    path.join(OUT_DIR, "LICENSE-GPL-3.0.txt")
  );

  fs.writeFileSync(
    path.join(OUT_DIR, "CREDITS.md"),
    `# historical-basemaps (history toggle)

- Upstream: https://github.com/aourednik/historical-basemaps
- License: **GPL-3.0** (see LICENSE-GPL-3.0.txt)
- README warns: verify before academic use; borders disputed; pre-1648 fuzzy.

## Cross-check

Against Cliopatria (CC BY 4.0) snapshots — see \`crosscheck-vs-cliopatria.json\`.
Name overlap is often low (different naming/ontology); that is expected.
When \`preferRules\` say so, **Cliopatria draws polity fills**; basemaps supply colonial SUBJECTO / cultural PARTOF / BORDERPRECISION styling.

## Korea

Korea-related NAME/SUBJECTO/PARTOF rows removed from this build.
`
  );

  // Unified history-toggle manifest
  let clioMan = null;
  const clioManPath = path.join(CLIOPATRIA_DIR, "manifest.json");
  if (fs.existsSync(clioManPath)) {
    clioMan = JSON.parse(fs.readFileSync(clioManPath, "utf8"));
  }

  const unified = {
    version: 1,
    builtAt: new Date().toISOString(),
    mount: "history_toggle_only",
    layers: [
      {
        id: "cliopatria",
        role: "polity_fills",
        license: "CC BY 4.0",
        base: "/data/historical/cliopatria",
        manifest: "/data/historical/cliopatria/manifest.json",
      },
      {
        id: "historical-basemaps",
        role: "cultural_colonial_basemap",
        license: "GPL-3.0",
        base: "/data/historical/basemaps",
        manifest: "/data/historical/basemaps/manifest.json",
      },
    ],
    renderHint: {
      default: "cliopatria_fill_over_basemap_optional",
      useBasemapBorderPrecision: true,
      whenPreferCliopatria: preferRules.map((p) => p.year),
    },
    cliopatriaYears: clioMan?.years?.map((y) => y.year) ?? [],
    basemapYears: yearIndex.map((y) => y.year),
  };

  fs.writeFileSync(
    path.join(UNIFIED_DIR, "history-layers.json"),
    JSON.stringify(unified, null, 2)
  );

  console.log("\nbasemaps manifest →", path.join(OUT_DIR, "manifest.json"));
  console.log("unified →", path.join(UNIFIED_DIR, "history-layers.json"));
  console.log("preferRules", preferRules.length, preferRules.slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
