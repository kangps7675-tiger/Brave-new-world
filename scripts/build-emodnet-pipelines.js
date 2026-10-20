/**
 * Subsea pipelines: EMODnet (Europe) + GEM offshore (worldwide) → compact JSON
 * DATA_PROFILE=lite|full node scripts/build-emodnet-pipelines.js
 * Invoked from build-static-extras.js
 */

const fs = require("fs");
const path = require("path");
const { OUT_DIR, IS_LITE } = require("./build-profile");
const {
  writeJsonArrayFile,
  compactTransportPath,
  roundCoord,
} = require("./compact-json");
const {
  lineGeometryToPoints,
  pointsBbox,
  capArrayGeographic,
} = require("./static-path-utils");
const { extractGemOffshorePipelines } = require("./build-gem-layers");

const WFS_URL =
  "https://ows.emodnet-humanactivities.eu/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=emodnet:pipelines&outputFormat=application/json";

const FETCH_TIMEOUT_MS = 90_000;

async function fetchGeoJson() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(WFS_URL, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`EMODnet WFS HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function featureName(props, index) {
  return (
    props.name ||
    props.Name ||
    props.pipeline ||
    props.PIPELINE ||
    props.operator ||
    props.Operator ||
    `EMODnet pipeline ${index + 1}`
  );
}

function convertEmodnet(geo) {
  if (!geo?.features) return [];
  const maxPts = IS_LITE ? 20 : 40;
  const precision = IS_LITE ? 2 : 3;
  const paths = [];

  for (const [index, feature] of geo.features.entries()) {
    const props = feature.properties || {};
    const segments = lineGeometryToPoints(
      feature.geometry,
      maxPts,
      roundCoord,
      precision,
    );
    for (const [pathIndex, points] of segments.entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `emodnet-pipe-${props.OBJECT_ID || props.id || index}-${pathIndex}`,
        kind: "subsea-pipeline",
        name: featureName(props, index),
        scalerank: 1,
        lengthKm: null,
        bbox: pointsBbox(points, roundCoord),
        points,
        meta: {
          source: "emodnet",
          status: props.status || props.Status || null,
          medium: props.medium || props.Medium || props.substance || null,
          country: props.country || props.Country || null,
        },
        _length: points.length,
      });
    }
  }

  paths.sort((a, b) => b._length - a._length);
  return paths.map(({ _length, ...rest }) => rest);
}

function pathMid(path) {
  const pts = path.points;
  if (!pts?.length) return { lat: NaN, lng: NaN };
  const mid = pts[Math.floor(pts.length / 2)];
  return { lat: mid.lat, lng: mid.lng };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "subsea-pipelines.json");
  const precision = IS_LITE ? 2 : 3;

  let emodnet = [];
  try {
    console.log("   EMODnet: fetching pipelines WFS…");
    const geo = await fetchGeoJson();
    emodnet = convertEmodnet(geo);
    console.log(`   emodnet subsea: ${emodnet.length}`);
  } catch (error) {
    console.warn(`   EMODnet pipelines failed: ${error.message}`);
  }

  let gemOffshore = [];
  try {
    gemOffshore = extractGemOffshorePipelines();
    console.log(`   gem offshore→subsea: ${gemOffshore.length}`);
  } catch (error) {
    console.warn(`   GEM offshore extract failed: ${error.message}`);
  }

  const mergedPreview = gemOffshore.length + emodnet.length;
  if (mergedPreview === 0) {
    if (!fs.existsSync(outPath)) {
      writeJsonArrayFile(outPath, []);
      console.warn("   wrote empty subsea-pipelines.json");
    } else {
      console.warn("   keeping existing subsea-pipelines.json");
    }
    return;
  }

  // GEM(전 세계) 우선 확보 후 EMODnet(유럽)으로 보강 — 유럽 피처가 전역 캡을 잠식하지 않게
  gemOffshore.sort(
    (a, b) =>
      (a.scalerank ?? 9) - (b.scalerank ?? 9) ||
      (b.points?.length || 0) - (a.points?.length || 0),
  );
  emodnet.sort((a, b) => (b.points?.length || 0) - (a.points?.length || 0));

  const gemCapped = capArrayGeographic(gemOffshore, 280, 900, pathMid);
  const emodnetCapped = capArrayGeographic(emodnet, 120, 500, pathMid);
  const capped = [...gemCapped, ...emodnetCapped];
  writeJsonArrayFile(
    outPath,
    capped.map((p) => compactTransportPath(p, { precision })),
  );
  console.log(
    `   subsea-pipelines: ${capped.length} (gem ${gemCapped.length}/${gemOffshore.length} + emodnet ${emodnetCapped.length}/${emodnet.length})`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
} else {
  module.exports = { main };
}
