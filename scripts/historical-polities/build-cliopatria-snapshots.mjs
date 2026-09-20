/**
 * Build worldwide historical polity snapshots from Cliopatria (Seshat).
 * Excludes Korea-related polities (handled separately).
 * Enrichment hooks: Wikidata IDs already on features; OHM planet is documented as optional later.
 *
 * Usage:
 *   node scripts/historical-polities/build-cliopatria-snapshots.mjs
 *   node scripts/historical-polities/build-cliopatria-snapshots.mjs --source=../cliopatria-ref/unzipped/cliopatria_polities_only.geojson
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const DEFAULT_SOURCE = path.resolve(
  ROOT,
  "../cliopatria-ref/unzipped/cliopatria_polities_only.geojson"
);

/** Snapshot years for timeline scrubber (BCE negative). */
const SNAPSHOT_YEARS = [
  -3000, -2000, -1000, -500, -200, 0, 200, 400, 600, 800, 1000, 1200, 1400,
  1500, 1600, 1700, 1750, 1800, 1850, 1900, 1914, 1919, 1939, 1945, 1950,
  1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024,
];

/**
 * Korea / Korean peninsula polity name patterns — excluded (Claude pipeline owns KR).
 * Match against Name, Wikipedia, MemberOf, Components (case-insensitive).
 */
const KOREA_EXCLUDE_RE =
  /\b(korea|korean|joseon|chos[oŏ]n|chosun|goryeo|koryo|goguryeo|koguryo|baekje|paekche|silla|balhae|parhae|bohai|buyeo|puyo|samhan|gojoseon|old\s*joseon|hanguk|joseon\s*dynasty|korean\s*empire|daehan|unified\s*silla)\b/i;

function parseArgs(argv) {
  const out = { source: DEFAULT_SOURCE, outDir: null, years: SNAPSHOT_YEARS };
  for (const a of argv) {
    if (a.startsWith("--source=")) out.source = path.resolve(a.slice(9));
    if (a.startsWith("--out=")) out.outDir = path.resolve(a.slice(6));
  }
  if (!out.outDir) {
    out.outDir = path.join(ROOT, "public", "data", "historical", "cliopatria");
  }
  return out;
}

function isKoreaRelated(props) {
  const blob = [
    props.Name,
    props.Wikipedia,
    props.MemberOf,
    props.Components,
  ]
    .filter(Boolean)
    .join(" | ");
  return KOREA_EXCLUDE_RE.test(blob);
}

function stripGeomHeavy(feature) {
  // Keep full geometry — needed for map. Properties slimmed for client.
  const p = feature.properties || {};
  return {
    type: "Feature",
    properties: {
      name: p.Name,
      fromYear: p.FromYear,
      toYear: p.ToYear,
      type: p.Type,
      areaKm2: p.Area,
      wikipedia: p.Wikipedia || null,
      wikidata: p.Wikidata || null,
      seshatId: p.SeshatID || null,
      source: "cliopatria",
    },
    geometry: feature.geometry,
  };
}

function activeInYear(props, year) {
  const from = Number(props.FromYear);
  const to = Number(props.ToYear);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
  return from <= year && year <= to;
}

async function streamFeatures(sourcePath, onFeature) {
  const rl = readline.createInterface({
    input: fs.createReadStream(sourcePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let inFeatures = false;
  let featureCount = 0;
  let skippedKorea = 0;
  let skippedNonPolity = 0;
  let parsedOk = 0;

  for await (const line of rl) {
    if (!inFeatures) {
      if (line.includes('"features"')) inFeatures = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed.includes('"type": "Feature"') && !trimmed.includes('"type":"Feature"')) {
      continue;
    }
    let json = trimmed;
    if (json.endsWith(",")) json = json.slice(0, -1);
    try {
      const f = JSON.parse(json);
      featureCount++;
      const props = f.properties || {};
      if (props.Type && props.Type !== "POLITY") {
        skippedNonPolity++;
        continue;
      }
      if (isKoreaRelated(props)) {
        skippedKorea++;
        continue;
      }
      parsedOk++;
      await onFeature(f);
    } catch {
      // multiline geometry rare — ignore broken line
    }
  }

  if (parsedOk === 0) {
    console.warn("[cliopatria] line-fastpath empty — full JSON.parse (needs RAM)");
    const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    for (const f of raw.features || []) {
      featureCount++;
      const props = f.properties || {};
      if (props.Type && props.Type !== "POLITY") {
        skippedNonPolity++;
        continue;
      }
      if (isKoreaRelated(props)) {
        skippedKorea++;
        continue;
      }
      parsedOk++;
      await onFeature(f);
    }
  }

  return { featureCount, skippedKorea, skippedNonPolity, parsedOk };
}

async function main() {
  const { source, outDir, years } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(source)) {
    console.error("Source missing:", source);
    console.error("Unzip cliopatria.geojson.zip first (see scripts/historical-polities/README.md)");
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const snapDir = path.join(outDir, "snapshots");
  fs.mkdirSync(snapDir, { recursive: true });

  /** @type {Map<number, object[]>} */
  const buckets = new Map(years.map((y) => [y, []]));
  const polityNames = new Set();
  let kept = 0;

  const { featureCount, skippedKorea, skippedNonPolity, parsedOk } =
    await streamFeatures(source, async (f) => {
      kept++;
      const p = f.properties || {};
      if (p.Name) polityNames.add(p.Name);
      const slim = stripGeomHeavy(f);
      for (const y of years) {
        if (activeInYear(p, y)) buckets.get(y).push(slim);
      }
    });

  const manifestYears = [];
  for (const y of years) {
    const features = buckets.get(y) || [];
    const fc = {
      type: "FeatureCollection",
      name: `cliopatria_snapshot_${y}`,
      properties: {
        year: y,
        source: "Cliopatria (Seshat Global History Databank)",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        attribution:
          "Cliopatria / Seshat Global History Databank (CC BY 4.0). Korea polities excluded.",
        excluded: "korea_related",
        wikidataNote:
          "Feature properties.wikidata → https://www.wikidata.org/wiki/<id>",
        ohmNote:
          "OpenHistoricalMap planet dumps at s3://planet.openhistoricalmap.org — optional detail layer, not used in this snapshot build.",
      },
      features,
    };
    const file = `year_${y}.geojson`;
    const fp = path.join(snapDir, file);
    fs.writeFileSync(fp, JSON.stringify(fc));
    const mb = (fs.statSync(fp).size / (1024 * 1024)).toFixed(2);
    manifestYears.push({
      year: y,
      file: `snapshots/${file}`,
      featureCount: features.length,
      sizeMB: Number(mb),
    });
    console.log(`wrote ${file} features=${features.length} ${mb}MB`);
  }

  const manifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    sourceFile: path.basename(source),
    sourceProject: "https://github.com/Seshat-Global-History-Databank/cliopatria",
    license: "CC BY 4.0",
    korea: "excluded — separate Claude pipeline",
    stack: {
      primary: "cliopatria",
      metadata: "wikidata ids on features",
      optionalDetail: "openhistoricalmap S3 planet (not baked here)",
    },
    stats: {
      sourceFeatureRows: featureCount,
      skippedNonPolityRows: skippedNonPolity,
      skippedKoreaRows: skippedKorea,
      parsedPolityRows: parsedOk,
      keptRows: kept,
      uniquePolityNames: polityNames.size,
    },
    years: manifestYears,
  };

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, "CREDITS.md"),
    `# Historical polity layer credits

## Cliopatria (primary)

- Dataset: [Seshat Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Coverage: worldwide polities ~3400 BCE–2024 CE
- This build **excludes Korea-related polities** (separate pipeline).

Maps reflect one scholarly reconstruction; border uncertainty is normal. See Cliopatria README.

## Wikidata (metadata)

- Feature \`wikidata\` ids link to [Wikidata](https://www.wikidata.org/) (CC0 for structured data).
- Compose: \`https://www.wikidata.org/wiki/<Wikidata>\`

## OpenHistoricalMap (optional, not in snapshots)

- Planet / replication: https://s3.amazonaws.com/planet.openhistoricalmap.org/
- Use later for road/place detail at year *t*; polity fills come from Cliopatria.
`
  );

  console.log("\nmanifest →", path.join(outDir, "manifest.json"));
  console.log(manifest.stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
