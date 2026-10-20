// Natural Earth 로컬 shapefile + GDELT 로컬 출력 파일을 브라우저에서 바로 읽는
// public/data/app-data.json 으로 변환한다.
//
// 실행 순서:
//   npm run gdelt:fetch
//   npm run data:build
//
// 필요하면 NATURAL_EARTH_CULTURAL_DIR 환경변수로 10m_cultural 폴더 위치를 바꿀 수 있다.

const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");
const {
  writeJsonArrayFile,
  writeJsonObjectFile,
  compactTransportPath,
  compactPlace,
  roundCoord: compactRound,
} = require("./compact-json");
const { writeAppDataChunks } = require("./app-data-chunks");

const { DATA_PROFILE, IS_LITE, OUT_DIR, PROFILE } = require("./build-profile");
const PROJECT_ROOT = path.join(__dirname, "..");
const DEFAULT_CULTURAL_DIR = "C:/Users/kangp/Downloads/10m_cultural/10m_cultural";
const DEFAULT_PHYSICAL_DIR = "C:/Users/kangp/Downloads/10m_physical";
const CULTURAL_DIR = process.env.NATURAL_EARTH_CULTURAL_DIR || DEFAULT_CULTURAL_DIR;
const PHYSICAL_DIR = process.env.NATURAL_EARTH_PHYSICAL_DIR || DEFAULT_PHYSICAL_DIR;

const FILES = {
  countries: path.join(CULTURAL_DIR, "ne_10m_admin_0_countries.shp"),
  places: path.join(CULTURAL_DIR, "ne_10m_populated_places.shp"),
  disputes: path.join(CULTURAL_DIR, "ne_10m_admin_0_disputed_areas.shp"),
  disputesMinorIslands: path.join(
    CULTURAL_DIR,
    "ne_10m_admin_0_disputed_areas_scale_rank_minor_islands.shp",
  ),
  disputeBoundaries: path.join(
    CULTURAL_DIR,
    "ne_10m_admin_0_boundary_lines_disputed_areas.shp",
  ),
  countryBorders: path.join(CULTURAL_DIR, "ne_10m_admin_0_boundary_lines_land.shp"),
  roads: path.join(CULTURAL_DIR, "ne_10m_roads.shp"),
  railroads: path.join(CULTURAL_DIR, "ne_10m_railroads.shp"),
  coastlines: path.join(PHYSICAL_DIR, "ne_10m_coastline.shp"),
};

const GDELT_EVENTS_FILE = path.join(PROJECT_ROOT, "scripts", "output", "events.json");
const PROCESSED_DIR = path.join(PROJECT_ROOT, "scripts", "processed");
const SIMPLIFIED_FILES = {
  roads: path.join(PROCESSED_DIR, "roads-simplified.geojson"),
  railroads: path.join(PROCESSED_DIR, "railroads-simplified.geojson"),
};
const OUT_FILE = path.join(OUT_DIR, "app-data.json");
const OUT_GDELT_EVENTS_FILE = path.join(OUT_DIR, "gdelt-events.json");
const OUT_ROADS_FILE = path.join(OUT_DIR, "roads.json");
const OUT_RAILROADS_FILE = path.join(OUT_DIR, "railroads.json");
const OUT_COASTLINES_FILE = path.join(OUT_DIR, "coastlines.json");
const OUT_DISPUTE_BOUNDARIES_FILE = path.join(OUT_DIR, "dispute-boundaries.json");
const OUT_COUNTRY_BORDERS_FILE = path.join(OUT_DIR, "country-borders.json");

const COASTLINE_LINE_MAX_POINTS = PROFILE.coastlineLineMaxPoints;
const COASTLINE_COORD_PRECISION = PROFILE.coastlineCoordPrecision;
const COUNTRY_BORDER_LINE_MAX_POINTS = PROFILE.countryBorderLineMaxPoints;
const COUNTRY_BORDER_COORD_PRECISION = PROFILE.countryBorderCoordPrecision;

const EVENT_CATEGORIES = new Set([
  "Battles",
  "Violence against civilians",
  "Protests",
  "Riots",
  "Strategic developments",
]);

function clean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const normalized = value.replace(/\u0000/g, "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  const cleaned = clean(value);
  if (!cleaned || typeof cleaned !== "string") return null;

  return cleaned
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[|/\\,_\-]{4,}/g, " ")
    .trim();
}

function isInvalidLabel(value) {
  if (!value) return true;
  if (value.length > 64) return true;
  if (/^(null|undefined|unknown|n\/a|na|none)$/i.test(value)) return true;
  if (/(.)\1{5,}/.test(value)) return true;
  if (/[^\p{L}\p{N}\s.'()\-]/u.test(value)) {
    const symbolCount = (value.match(/[^\p{L}\p{N}\s.'()\-]/gu) || []).length;
    if (symbolCount >= Math.max(3, Math.floor(value.length / 3))) return true;
  }
  return false;
}

function pickPlaceNameEn(props) {
  const candidates = [
    normalizeText(props.NAMEASCII),
    normalizeText(props.nameascii),
    normalizeText(props.NAME_EN),
    normalizeText(props.name_en),
    normalizeText(props.NAME),
    normalizeText(props.name),
  ];

  for (const item of candidates) {
    if (!item) continue;
    if (/[\u0080-\u009f]/.test(item)) continue;
    if (/^[A-Za-z0-9 .'\-()]+$/.test(item)) return item;
  }

  return candidates.find(Boolean) || "Unknown";
}

function pickPlaceNameKo(props) {
  const candidates = [
    normalizeText(props.NAME_KO),
    normalizeText(props.name_ko),
    normalizeText(props.nameko),
  ];
  const picked = candidates.find((item) => item && /[\uAC00-\uD7A3]/.test(item));
  return picked || null;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCoord(value, precision = 2) {
  return compactRound(value, precision);
}

function simplifyLine(coords, maxPoints, precision = 2) {
  if (!Array.isArray(coords) || coords.length <= maxPoints) {
    return coords.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
  }

  const step = Math.ceil(coords.length / maxPoints);
  const sampled = coords.filter((_, index) => index % step === 0);
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);

  return sampled.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
}

function closeRing(ring) {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function optimizeGeometry(geometry, options = {}) {
  const polygonRingMaxPoints = options.polygonRingMaxPoints || 340;
  const lineMaxPoints = options.lineMaxPoints || 120;
  const lineCoordPrecision = options.lineCoordPrecision ?? 2;

  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return {
      type: geometry.type,
      coordinates: geometry.coordinates.map((ring) =>
        closeRing(simplifyLine(ring, polygonRingMaxPoints)),
      ),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: geometry.type,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => closeRing(simplifyLine(ring, polygonRingMaxPoints))),
      ),
    };
  }

  if (geometry.type === "LineString") {
    return {
      type: geometry.type,
      coordinates: simplifyLine(geometry.coordinates, lineMaxPoints, lineCoordPrecision),
    };
  }

  if (geometry.type === "MultiLineString") {
    return {
      type: geometry.type,
      coordinates: geometry.coordinates.map((line) =>
        simplifyLine(line, lineMaxPoints, lineCoordPrecision),
      ),
    };
  }

  return geometry;
}

function walkCoordinatePairs(value, callback) {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    callback(value[0], value[1]);
    return;
  }

  value.forEach((child) => walkCoordinatePairs(child, callback));
}

function geometryBbox(geometry) {
  const bbox = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };

  walkCoordinatePairs(geometry.coordinates, (lng, lat) => {
    bbox.minLng = Math.min(bbox.minLng, lng);
    bbox.minLat = Math.min(bbox.minLat, lat);
    bbox.maxLng = Math.max(bbox.maxLng, lng);
    bbox.maxLat = Math.max(bbox.maxLat, lat);
  });

  if (!Number.isFinite(bbox.minLng)) return null;
  return bbox;
}

function bboxCenter(bbox) {
  return {
    lat: roundCoord((bbox.minLat + bbox.maxLat) / 2),
    lng: roundCoord((bbox.minLng + bbox.maxLng) / 2),
  };
}

function pointInExpandedBbox(event, bbox, margin = 1) {
  return (
    event.lng >= bbox.minLng - margin &&
    event.lng <= bbox.maxLng + margin &&
    event.lat >= bbox.minLat - margin &&
    event.lat <= bbox.maxLat + margin
  );
}

/** Natural Earth LABEL_X/Y가 다른 국가(예: 쿠릴→러시아) 좌표를 가리키는 경우 거부 */
function pickDisputeCenter(labelLat, labelLng, fallbackCenter, bbox) {
  if (
    labelLat == null ||
    labelLng == null ||
    !Number.isFinite(labelLat) ||
    !Number.isFinite(labelLng)
  ) {
    return fallbackCenter;
  }

  const label = { lat: labelLat, lng: labelLng };
  // 지오메트리 bbox에서 크게 벗어나면(대략 5°+) LABEL 오표기로 보고 centroid 사용
  const marginDeg = 5;
  if (bbox && !pointInExpandedBbox(label, bbox, marginDeg)) {
    return fallbackCenter;
  }

  return {
    lat: roundCoord(labelLat, 3),
    lng: roundCoord(labelLng, 3),
  };
}

async function readFeatures(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Natural Earth 파일을 찾을 수 없음: ${filePath}`);
  }

  const source = await shapefile.open(filePath);
  const features = [];

  while (true) {
    const result = await source.read();
    if (result.done) break;
    features.push(result.value);
  }

  return features;
}

function readGeoJsonFeatures(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const geojson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (geojson.type === "FeatureCollection") return geojson.features;
  if (geojson.type === "Feature") return [geojson];

  throw new Error(`지원하지 않는 GeoJSON 형식: ${filePath}`);
}

function normalizeEvent(raw) {
  const category = EVENT_CATEGORIES.has(raw.category)
    ? raw.category
    : "Strategic developments";

  const lat = numberOrNull(raw.lat);
  const lng = numberOrNull(raw.lng ?? raw.lon);
  if (lat === null || lng === null) return null;

  return {
    id: String(raw.global_event_id || raw.id),
    globalEventId: String(raw.global_event_id || raw.id),
    eventDate: clean(raw.event_date),
    country: clean(raw.country),
    lat,
    lng,
    category,
    severity: Math.max(1, Math.min(5, Number(raw.severity || 1))),
    goldsteinScale: numberOrNull(raw.goldstein_scale),
    sourceUrl: clean(raw.source_url),
    title: clean(raw.title),
    createdAt: clean(raw.created_at),
    actor1Country: clean(raw.actor1_country),
    actor2Country: clean(raw.actor2_country),
    eventTier:
      clean(raw.event_tier) === "intraBloc" || clean(raw.event_tier) === "riot"
        ? "alliance"
        : clean(raw.event_tier) || undefined,
    tensionScore: numberOrNull(raw.tension_score) ?? undefined,
  };
}

function loadGdeltEvents() {
  if (!fs.existsSync(GDELT_EVENTS_FILE)) {
    console.warn("GDELT 출력 파일이 없습니다. 먼저 npm run gdelt:fetch 를 실행하세요.");
    return [];
  }

  const rawEvents = JSON.parse(fs.readFileSync(GDELT_EVENTS_FILE, "utf-8"));
  let events = rawEvents.map(normalizeEvent).filter(Boolean);
  if (PROFILE.gdeltEventCap != null && events.length > PROFILE.gdeltEventCap) {
    events = events.slice(0, PROFILE.gdeltEventCap);
  }
  return events;
}

function disputeCategories(props, source = "main") {
  const name =
    source === "minor"
      ? clean(props.sr_br_name) || clean(props.sr_brk_a3) || ""
      : clean(props.BRK_NAME) || clean(props.NAME_LONG) || "";
  const note =
    source === "minor"
      ? clean(props.sr_subunit) || ""
      : `${clean(props.NOTE_BRK) || ""} ${clean(props.NOTE_ADM0) || ""}`;
  const categories = new Set(["①"]);

  if (/line of control|loc|ceasefire|boundary/i.test(`${name} ${note}`)) {
    categories.add("②");
  }

  if (/kashmir/i.test(`${name} ${note}`)) {
    categories.add("②");
  }

  return Array.from(categories);
}

function tensionFromCount(count) {
  if (count > 20) return "high";
  if (count >= 5) return "medium";
  return "low";
}

function lineGeometryToPaths(geometry) {
  if (!geometry) return [];

  const toPoints = (line) =>
    line.map(([lng, lat]) => ({
      lat,
      lng,
    }));

  if (geometry.type === "LineString") return [toPoints(geometry.coordinates)];
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map(toPoints);
  }

  return [];
}

function pointsBbox(points) {
  const bbox = {
    minLat: Infinity,
    minLng: Infinity,
    maxLat: -Infinity,
    maxLng: -Infinity,
  };

  for (const point of points) {
    bbox.minLat = Math.min(bbox.minLat, point.lat);
    bbox.minLng = Math.min(bbox.minLng, point.lng);
    bbox.maxLat = Math.max(bbox.maxLat, point.lat);
    bbox.maxLng = Math.max(bbox.maxLng, point.lng);
  }

  return {
    minLat: roundCoord(bbox.minLat),
    minLng: roundCoord(bbox.minLng),
    maxLat: roundCoord(bbox.maxLat),
    maxLng: roundCoord(bbox.maxLng),
  };
}

async function buildCountries() {
  const features = await readFeatures(FILES.countries);

  return features
    .map((feature, index) => {
      const props = feature.properties;
      const geometry = optimizeGeometry(feature.geometry, {
        polygonRingMaxPoints: IS_LITE ? 96 : 260,
      });
      const bbox = geometryBbox(geometry);
      const fallbackCenter = bbox ? bboxCenter(bbox) : { lat: 0, lng: 0 };
      const lat = numberOrNull(clean(props.LABEL_Y)) ?? fallbackCenter.lat;
      const lng = numberOrNull(clean(props.LABEL_X)) ?? fallbackCenter.lng;

      return {
        id: clean(props.ADM0_A3) || clean(props.ISO_A3) || `country-${index}`,
        kind: "country",
        name: clean(props.NAME) || clean(props.ADMIN) || "Unknown",
        nameLong: clean(props.NAME_LONG) || clean(props.ADMIN) || "Unknown",
        isoA3: clean(props.ISO_A3),
        continent: clean(props.CONTINENT),
        population: numberOrNull(props.POP_EST),
        center: {
          lat: roundCoord(lat),
          lng: roundCoord(lng),
        },
        geometry,
      };
    })
    .filter((country) => country.geometry);
}

async function buildPlaces() {
  const features = await readFeatures(FILES.places);

  return features
    .map((feature, index) => {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates || [];
      const lng = numberOrNull(props.LONGITUDE ?? props.longitude) ?? numberOrNull(coords[0]);
      const lat =
        numberOrNull(clean(props.LATITUDE ?? props.latitude)) ?? numberOrNull(coords[1]);

      if (lat === null || lng === null) return null;

      const name = pickPlaceNameEn(props);
      const nameKo = pickPlaceNameKo(props);
      const country =
        clean(props.ADM0NAME) ||
        clean(props.SOV0NAME) ||
        clean(props.adm0name) ||
        clean(props.sov0name) ||
        "Unknown";
      const population = numberOrNull(props.POP_MAX ?? props.pop_max);
      const scalerank = numberOrNull(props.SCALERANK ?? props.scalerank) ?? 10;
      const minZoom = numberOrNull(props.MIN_ZOOM ?? props.min_zoom);
      const adm1 = clean(props.ADM1NAME ?? props.adm1name);
      const featureClass = clean(props.FEATURECLA ?? props.featurecla) || "Populated place";

      let type = "town";
      if (
        props.ADM0CAP === 1 ||
        props.adm0cap === 1 ||
        props.MEGACITY === 1 ||
        props.megacity === 1 ||
        /capital/i.test(featureClass) ||
        (population || 0) >= 750_000
      ) {
        type = "city";
      } else if (
        /village|hamlet|small/i.test(featureClass) ||
        ((population || 0) > 0 && (population || 0) < 12_000)
      ) {
        type = "village";
      }

      return {
        id: `place-${index}-${name.slice(0, 40).replace(/\s+/g, "-")}`,
        name,
        nameKo,
        country,
        adm1,
        lat: roundCoord(lat, 5),
        lng: roundCoord(lng, 5),
        type,
        population,
        scalerank,
        minZoom,
        featureClass,
      };
    })
    .filter(Boolean)
    .filter((place) => place.scalerank <= PROFILE.placeMaxScalerank)
    .sort(
      (a, b) =>
        a.scalerank - b.scalerank ||
        (b.population || 0) - (a.population || 0) ||
        a.name.localeCompare(b.name),
    );
}

function disputeMetaFromProps(props, source) {
  if (source === "minor") {
    const name =
      clean(props.sr_br_name) ||
      clean(props.sr_brk_a3) ||
      clean(props.sr_subunit) ||
      "Disputed area";
    return {
      name,
      nameLong: name,
      admin: clean(props.sr_adm0_a3) || clean(props.sr_gu_a3),
      sovereignty: clean(props.sr_sov_a3),
      type: clean(props.featurecla),
      note: clean(props.sr_subunit),
      neId: clean(props.sr_brk_a3) || clean(props.sr_ne_id),
      scalerank: numberOrNull(props.scalerank) ?? 10,
      labelLat: null,
      labelLng: null,
    };
  }

  const name =
    clean(props.BRK_NAME) ||
    clean(props.NAME_LONG) ||
    clean(props.NAME) ||
    "Disputed area";

  return {
    name,
    nameLong: clean(props.NAME_LONG) || name,
    admin: clean(props.ADMIN),
    sovereignty: clean(props.SOVEREIGNT),
    type: clean(props.TYPE),
    note: clean(props.NOTE_BRK) || clean(props.NOTE_ADM0),
    neId: clean(props.NE_ID),
    scalerank: numberOrNull(props.SCALERANK ?? props.scalerank) ?? 10,
    labelLat: numberOrNull(clean(props.LABEL_Y)),
    labelLng: numberOrNull(clean(props.LABEL_X)),
  };
}

function disputeFromFeature(feature, index, source, events) {
  const props = feature.properties || {};
  const meta = disputeMetaFromProps(props, source);
  const geometry = optimizeGeometry(feature.geometry, {
    polygonRingMaxPoints:
      source === "minor" ? (IS_LITE ? 64 : 180) : IS_LITE ? 96 : 260,
  });
  if (!geometry) return null;

  const bbox = geometryBbox(geometry);
  const fallbackCenter = bbox ? bboxCenter(bbox) : { lat: 0, lng: 0 };
  const center = pickDisputeCenter(meta.labelLat, meta.labelLng, fallbackCenter, bbox);
  const matchedEventCount = bbox
    ? events.filter((event) => pointInExpandedBbox(event, bbox)).length
    : 0;

  const idSuffix = meta.neId || index;

  return {
    id: `dispute-${source}-${idSuffix}-${index}`,
    kind: "dispute",
    name: meta.name,
    nameLong: meta.nameLong,
    admin: meta.admin,
    sovereignty: meta.sovereignty,
    type: meta.type,
    note: meta.note,
    source,
    scalerank: meta.scalerank,
    center,
    categories: disputeCategories(props, source),
    tension: tensionFromCount(matchedEventCount),
    matchedEventCount,
    geometry,
  };
}

async function buildDisputes(events) {
  const sources = [
    { file: FILES.disputes, source: "main" },
    { file: FILES.disputesMinorIslands, source: "minor" },
  ];
  const disputes = [];

  for (const { file, source } of sources) {
    if (!fs.existsSync(file)) {
      console.warn(`   분쟁 shapefile 없음: ${file}`);
      continue;
    }

    const features = await readFeatures(file);
    for (const [index, feature] of features.entries()) {
      const dispute = disputeFromFeature(feature, index, source, events);
      if (dispute) disputes.push(dispute);
    }
  }

  return disputes;
}

async function buildDisputeBoundaries() {
  if (!fs.existsSync(FILES.disputeBoundaries)) return [];

  const features = await readFeatures(FILES.disputeBoundaries);
  const paths = [];

  for (const [index, feature] of features.entries()) {
    const props = feature.properties || {};
    const geometry = optimizeGeometry(feature.geometry, {
      lineMaxPoints: PROFILE.disputeBoundaryLineMaxPoints,
    });
    for (const [pathIndex, points] of lineGeometryToPaths(geometry).entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `dispute-boundary-${index}-${pathIndex}`,
        kind: "dispute-boundary",
        name: clean(props.NAME) || clean(props.FEATURECLA) || null,
        scalerank: 0,
        lengthKm: null,
        bbox: pointsBbox(points),
        points,
      });
    }
  }

  return paths;
}

async function buildCountryBorders() {
  if (!IS_LITE && fs.existsSync(FILES.countryBorders)) {
    const features = await readFeatures(FILES.countryBorders);
    const paths = [];

    for (const [index, feature] of features.entries()) {
      const props = feature.properties || {};
      const geometry = optimizeGeometry(feature.geometry, {
        lineMaxPoints: COUNTRY_BORDER_LINE_MAX_POINTS,
        lineCoordPrecision: COUNTRY_BORDER_COORD_PRECISION,
      });
      for (const [pathIndex, points] of lineGeometryToPaths(geometry).entries()) {
        if (points.length < 2) continue;
        paths.push({
          id: `country-border-${index}-${pathIndex}`,
          kind: "country-border",
          name: clean(props.NAME) || clean(props.FEATURECLA) || null,
          scalerank: numberOrNull(props.scalerank) ?? 0,
          lengthKm: null,
          bbox: pointsBbox(points),
          points,
        });
      }
    }

    return paths;
  }

  console.log(
    IS_LITE
      ? "   lite 프로필 → 110m 국경선 GeoJSON"
      : "   ne_10m_admin_0_boundary_lines_land.shp 없음 → 110m GeoJSON 다운로드",
  );
  const res = await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson",
  );
  if (!res.ok) throw new Error(`국경선 GeoJSON 다운로드 실패: ${res.status}`);

  const geojson = await res.json();
  const paths = [];

  for (const [index, feature] of (geojson.features || []).entries()) {
    const props = feature.properties || {};
    const geometry = optimizeGeometry(feature.geometry, {
      lineMaxPoints: COUNTRY_BORDER_LINE_MAX_POINTS,
      lineCoordPrecision: COUNTRY_BORDER_COORD_PRECISION,
    });
    for (const [pathIndex, points] of lineGeometryToPaths(geometry).entries()) {
      if (points.length < 2) continue;
      paths.push({
        id: `country-border-${index}-${pathIndex}`,
        kind: "country-border",
        name: clean(props.NAME) || clean(props.FEATURECLA) || null,
        scalerank: numberOrNull(props.scalerank) ?? 0,
        lengthKm: null,
        bbox: pointsBbox(points),
        points,
      });
    }
  }

  return paths;
}

async function buildCoastlines() {
  if (!IS_LITE && fs.existsSync(FILES.coastlines)) {
    const features = await readFeatures(FILES.coastlines);
    const paths = [];

    for (const [index, feature] of features.entries()) {
      const geometry = optimizeGeometry(feature.geometry, {
        lineMaxPoints: COASTLINE_LINE_MAX_POINTS,
        lineCoordPrecision: COASTLINE_COORD_PRECISION,
      });
      for (const [pathIndex, points] of lineGeometryToPaths(geometry).entries()) {
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

  console.log(
    IS_LITE
      ? "   lite 프로필 → 110m 해안선 GeoJSON"
      : "   ne_10m_coastline.shp 없음 → 110m GeoJSON 다운로드",
  );
  const res = await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson",
  );
  if (!res.ok) throw new Error(`해안선 GeoJSON 다운로드 실패: ${res.status}`);

  const geojson = await res.json();
  const paths = [];

  for (const [index, feature] of (geojson.features || []).entries()) {
    const geometry = optimizeGeometry(feature.geometry, {
      lineMaxPoints: COASTLINE_LINE_MAX_POINTS,
      lineCoordPrecision: COASTLINE_COORD_PRECISION,
    });
    for (const [pathIndex, points] of lineGeometryToPaths(geometry).entries()) {
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

async function buildTransport(filePath, kind, simplifiedFilePath) {
  const simplifiedFeatures = readGeoJsonFeatures(simplifiedFilePath);
  const features = simplifiedFeatures || (await readFeatures(filePath));
  const sourceLabel = simplifiedFeatures ? "mapshaper simplified GeoJSON" : "Natural Earth shapefile";
  console.log(`   ${kind}: ${sourceLabel}`);
  const candidates = [];

  for (const [index, feature] of features.entries()) {
    const props = feature.properties;
    const scalerank = numberOrNull(props.scalerank) ?? 99;
    const length = numberOrNull(props.length_km) ?? 0;

    const lineMax =
      kind === "road" ? PROFILE.transportLineMaxPoints : PROFILE.transportLineMaxPoints + 40;

    const geometry = optimizeGeometry(feature.geometry, {
      lineMaxPoints: lineMax,
    });
    const paths = lineGeometryToPaths(geometry).filter((points) => points.length >= 2);

    for (const [pathIndex, points] of paths.entries()) {
      candidates.push({
        id: `${kind}-${index}-${pathIndex}`,
        kind,
        name: clean(props.name) || clean(props.label) || clean(props.featurecla),
        scalerank,
        lengthKm: length || null,
        bbox: pointsBbox(points),
        points,
      });
    }
  }

  const maxRank = kind === "road" ? PROFILE.roadMaxScalerank : PROFILE.railMaxScalerank;

  return candidates
    .filter((item) => item.scalerank <= maxRank)
    .sort((a, b) => a.scalerank - b.scalerank || (b.lengthKm || 0) - (a.lengthKm || 0));
}

function buildSearchPlaces(places, countries, disputes) {
  const countryPlaces = countries.map((country) => ({
    id: `country-${country.id}`,
    name: country.name,
    country: country.continent || "Country",
    lat: country.center.lat,
    lng: country.center.lng,
    type: "country",
    population: country.population,
  }));

  const disputePlaces = disputes.map((dispute) => ({
    id: `search-${dispute.id}`,
    name: dispute.name,
    country: [dispute.admin, dispute.sovereignty].filter(Boolean).join(" / ") || "Disputed area",
    lat: dispute.center.lat,
    lng: dispute.center.lng,
    type: "dispute",
    population: null,
  }));

  return [...places, ...countryPlaces, ...disputePlaces];
}

async function main() {
  console.log(`DATA_PROFILE=${DATA_PROFILE}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("1. GDELT 로컬 이벤트 읽는 중...");
  const events = loadGdeltEvents();
  console.log(`   ${events.length}개 이벤트`);

  console.log("2. Natural Earth 국가 경계 변환 중...");
  const countries = await buildCountries();
  console.log(`   ${countries.length}개 국가/영역`);

  console.log("3. Natural Earth 도시 변환 중...");
  const places = await buildPlaces();
  console.log(`   ${places.length}개 지명`);

  console.log("4. Natural Earth 분쟁지역 변환 중...");
  let disputes = await buildDisputes(events);
  const tensionSeedPaths = [
    path.join(__dirname, "data", "east-asia-tensions-seed.json"),
    path.join(__dirname, "data", "regional-tensions-seed.json"),
  ];
  {
    const ids = new Set(disputes.map((d) => d.id));
    let added = 0;
    for (const seedPath of tensionSeedPaths) {
      if (!fs.existsSync(seedPath)) continue;
      const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
      for (const item of seed) {
        if (ids.has(item.id)) {
          const idx = disputes.findIndex((d) => d.id === item.id);
          if (idx >= 0) disputes[idx] = { ...disputes[idx], ...item };
          continue;
        }
        disputes.push(item);
        ids.add(item.id);
        added += 1;
      }
    }
    // Raise tension on known flashpoints across regions
    const overrides = [
      [/taiwan/i, "high"],
      [/korean demilitarized|dmz/i, "high"],
      [/pinnacle|senkaku|diaoyu/i, "high"],
      [/dokdo|takeshima/i, "medium"],
      [/spratly/i, "high"],
      [/paracel/i, "medium"],
      [/scarborough/i, "high"],
      [/kuril/i, "medium"],
      [/kashmir|jammu|line of control|aksai chin/i, "high"],
      [/gaza|golan|abkhazia|south ossetia|transnistria|crimea|donetsk|luhansk/i, "high"],
    ];
    disputes = disputes.map((d) => {
      const name = `${d.name || ""} ${d.nameLong || ""}`;
      for (const [re, tension] of overrides) {
        if (re.test(name)) return { ...d, tension };
      }
      return d;
    });
    if (added) console.log(`   +지역 긴장/전투 시드 ${added}곳`);
  }
  const mainCount = disputes.filter((item) => item.source === "main").length;
  const minorCount = disputes.filter((item) => item.source === "minor").length;
  console.log(`   ${disputes.length}개 분쟁지역 (주요 ${mainCount} · 소형·섬 ${minorCount})`);

  console.log("4b. Natural Earth 분쟁 경계선 변환 중...");
  const disputeBoundaries = await buildDisputeBoundaries();
  console.log(`   분쟁 경계선 ${disputeBoundaries.length}개`);

  console.log("4c. Natural Earth 육상 국경선 변환 중...");
  const countryBorders = await buildCountryBorders();
  console.log(`   육상 국경선 ${countryBorders.length}개`);

  console.log("5. Natural Earth 도로/철도 변환 중...");
  const roads = await buildTransport(FILES.roads, "road", SIMPLIFIED_FILES.roads);
  const railroads = await buildTransport(
    FILES.railroads,
    "rail",
    SIMPLIFIED_FILES.railroads,
  );
  console.log(`   도로 ${roads.length}개, 철도 ${railroads.length}개`);

  console.log("6. Natural Earth 해안선 변환 중...");
  const coastlines = await buildCoastlines();
  console.log(`   해안선 ${coastlines.length}개`);

  const searchPlaces = buildSearchPlaces(places, countries, disputes).map(compactPlace);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeAppDataChunks(OUT_DIR, {
    generatedAt: new Date().toISOString(),
    profile: DATA_PROFILE,
    sources: {
      naturalEarth: CULTURAL_DIR,
      gdelt: GDELT_EVENTS_FILE,
    },
    countries,
    disputes,
    places: searchPlaces,
  });
  writeJsonObjectFile(OUT_GDELT_EVENTS_FILE, {
    fetchedAt: new Date().toISOString(),
    events,
    attribution: "GDELT Project",
  });
  writeJsonArrayFile(OUT_ROADS_FILE, roads.map((path) => compactTransportPath(path)));
  writeJsonArrayFile(OUT_RAILROADS_FILE, railroads.map((path) => compactTransportPath(path)));
  writeJsonArrayFile(
    OUT_COASTLINES_FILE,
    coastlines.map((path) => compactTransportPath(path, { precision: COASTLINE_COORD_PRECISION })),
  );
  writeJsonArrayFile(
    OUT_DISPUTE_BOUNDARIES_FILE,
    disputeBoundaries.map((path) => compactTransportPath(path)),
  );
  writeJsonArrayFile(
    OUT_COUNTRY_BORDERS_FILE,
    countryBorders.map((path) =>
      compactTransportPath(path, { precision: COUNTRY_BORDER_COORD_PRECISION }),
    ),
  );

  const { CHUNK_FILES } = require("./app-data-chunks");
  const manifestMb = fs.statSync(OUT_FILE).size / 1024 / 1024;
  const countriesMb = fs.statSync(path.join(OUT_DIR, CHUNK_FILES.countries)).size / 1024 / 1024;
  const disputesMb = fs.statSync(path.join(OUT_DIR, CHUNK_FILES.disputes)).size / 1024 / 1024;
  const placesMb = fs.statSync(path.join(OUT_DIR, CHUNK_FILES.places)).size / 1024 / 1024;
  const roadsSizeMb = fs.statSync(OUT_ROADS_FILE).size / 1024 / 1024;
  const railroadsSizeMb = fs.statSync(OUT_RAILROADS_FILE).size / 1024 / 1024;
  const coastlinesSizeMb = fs.statSync(OUT_COASTLINES_FILE).size / 1024 / 1024;
  const disputeBoundariesSizeMb = fs.statSync(OUT_DISPUTE_BOUNDARIES_FILE).size / 1024 / 1024;
  const countryBordersSizeMb = fs.statSync(OUT_COUNTRY_BORDERS_FILE).size / 1024 / 1024;
  console.log(
    `7. 완료: manifest ${OUT_FILE} (${manifestMb.toFixed(2)} MB) · countries ${countriesMb.toFixed(2)} · disputes ${disputesMb.toFixed(2)} · places ${placesMb.toFixed(2)} MB`,
  );
  console.log(`   도로: ${OUT_ROADS_FILE} (${roadsSizeMb.toFixed(2)} MB)`);
  console.log(`   철도: ${OUT_RAILROADS_FILE} (${railroadsSizeMb.toFixed(2)} MB)`);
  console.log(`   해안선: ${OUT_COASTLINES_FILE} (${coastlinesSizeMb.toFixed(2)} MB)`);
  console.log(
    `   분쟁 경계선: ${OUT_DISPUTE_BOUNDARIES_FILE} (${disputeBoundariesSizeMb.toFixed(2)} MB)`,
  );
  console.log(
    `   육상 국경선: ${OUT_COUNTRY_BORDERS_FILE} (${countryBordersSizeMb.toFixed(2)} MB)`,
  );
}

main().catch((error) => {
  console.error("에러 발생:", error.message);
  process.exit(1);
});
