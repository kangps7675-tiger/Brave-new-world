// 해안선 JSON만 생성: node scripts/build-coastlines.js
const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");
const { writeJsonArrayFile, compactTransportPath, roundCoord } = require("./compact-json");

const { OUT_DIR, IS_LITE, PROFILE } = require("./build-profile");
const PROJECT_ROOT = path.join(__dirname, "..");
const DEFAULT_CULTURAL_DIR = "C:/Users/kangp/Downloads/10m_cultural/10m_cultural";
const DEFAULT_PHYSICAL_DIR = "C:/Users/kangp/Downloads/10m_physical";
const CULTURAL_DIR =
  process.env.NATURAL_EARTH_CULTURAL_DIR ||
  DEFAULT_CULTURAL_DIR;
const PHYSICAL_DIR =
  process.env.NATURAL_EARTH_PHYSICAL_DIR ||
  DEFAULT_PHYSICAL_DIR;
const COASTLINE_SHP = path.join(PHYSICAL_DIR, "ne_10m_coastline.shp");
const OUT_FILE = path.join(OUT_DIR, "coastlines.json");

const COASTLINE_LINE_MAX_POINTS = PROFILE.coastlineLineMaxPoints;
const COASTLINE_COORD_PRECISION = PROFILE.coastlineCoordPrecision;

function roundCoordValue(value, precision = 2) {
  return roundCoord(value, precision);
}

function simplifyLine(coords, maxPoints, precision = 2) {
  if (!Array.isArray(coords) || coords.length <= maxPoints) {
    return coords.map(([lng, lat]) => [
      roundCoordValue(lng, precision),
      roundCoordValue(lat, precision),
    ]);
  }
  const step = Math.ceil(coords.length / maxPoints);
  const sampled = coords.filter((_, index) => index % step === 0);
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled.map(([lng, lat]) => [
    roundCoordValue(lng, precision),
    roundCoordValue(lat, precision),
  ]);
}

function lineGeometryToPaths(geometry) {
  if (!geometry) return [];
  const toPoints = (line) => line.map(([lng, lat]) => ({ lat, lng }));
  if (geometry.type === "LineString") {
    return [toPoints(simplifyLine(geometry.coordinates, COASTLINE_LINE_MAX_POINTS, COASTLINE_COORD_PRECISION))];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) =>
      toPoints(simplifyLine(line, COASTLINE_LINE_MAX_POINTS, COASTLINE_COORD_PRECISION)),
    );
  }
  return [];
}

function pointsBbox(points) {
  const bbox = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  for (const point of points) {
    bbox.minLat = Math.min(bbox.minLat, point.lat);
    bbox.minLng = Math.min(bbox.minLng, point.lng);
    bbox.maxLat = Math.max(bbox.maxLat, point.lat);
    bbox.maxLng = Math.max(bbox.maxLng, point.lng);
  }
  return bbox;
}

async function fromShapefile() {
  const source = await shapefile.open(COASTLINE_SHP);
  const paths = [];
  let index = 0;

  while (true) {
    const result = await source.read();
    if (result.done) break;
    for (const [pathIndex, points] of lineGeometryToPaths(result.value.geometry).entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `coastline-${index}-${pathIndex}`,
        kind: "coastline",
        name: null,
        scalerank: 0,
        lengthKm: null,
        bbox: pointsBbox(points),
        points,
      });
    }
    index += 1;
  }

  return paths;
}

async function fromGeoJsonUrl() {
  const res = await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson",
  );
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
  const geojson = await res.json();
  const paths = [];

  for (const [index, feature] of (geojson.features || []).entries()) {
    for (const [pathIndex, points] of lineGeometryToPaths(feature.geometry).entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `coastline-${index}-${pathIndex}`,
        kind: "coastline",
        name: null,
        scalerank: 0,
        lengthKm: null,
        bbox: pointsBbox(points),
        points,
      });
    }
  }

  return paths;
}

async function main() {
  const paths = IS_LITE
    ? await fromGeoJsonUrl()
    : fs.existsSync(COASTLINE_SHP)
      ? await fromShapefile()
      : await fromGeoJsonUrl();

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeJsonArrayFile(
    OUT_FILE,
    paths.map((path) => compactTransportPath(path, { precision: COASTLINE_COORD_PRECISION })),
  );
  console.log(`해안선 ${paths.length}개 → ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
