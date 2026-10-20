/**
 * Natural Earth populated places → app-data.json places 정확 재생성
 * 소스: scripts/data/ne_10m_populated_places.geojson
 *
 *   DATA_PROFILE=full node scripts/rebuild-places.js
 *   DATA_PROFILE=lite node scripts/rebuild-places.js
 */

const fs = require("fs");
const path = require("path");
const { DATA_PROFILE, IS_LITE, OUT_DIR, PROFILE } = require("./build-profile");
const { compactPlace, roundCoord } = require("./compact-json");
const { isChunkManifest, CHUNK_FILES, writeAppDataChunks } = require("./app-data-chunks");

const GEOJSON_PATH = path.join(__dirname, "data", "ne_10m_populated_places.geojson");
const APP_DATA_PATH = path.join(OUT_DIR, "app-data.json");

function clean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return String(value);
  const normalized = value.replace(/\u0000/g, "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  return cleaned
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latin/ASCII 도시명 우선 — 깨진 한글/다중 인코딩 방지 */
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
    // 깨진 UTF-8(모지베이크) / 제어문자 스킵
    if (/[\u0080-\u009f]/.test(item)) continue;
    if (/Ã.|Â.|â.|ð.|ñ./.test(item) && !/^[A-Za-z0-9 .'\-()]+$/.test(item)) continue;
    // ASCII 표기 우선
    if (/^[A-Za-z0-9 .'\-()]+$/.test(item)) return item;
  }

  const ascii = candidates.find((item) => item && /^[A-Za-z0-9 .'\-()]+$/.test(item));
  if (ascii) return ascii;

  const any = candidates.find(Boolean);
  return any || "Unknown";
}

function pickPlaceNameKo(props) {
  const candidates = [
    normalizeText(props.NAME_KO),
    normalizeText(props.name_ko),
    normalizeText(props.nameko),
  ];
  for (const item of candidates) {
    if (!item) continue;
    // 한글이 실제로 포함된 경우만
    if (/[\uAC00-\uD7A3]/.test(item)) return item;
  }
  return null;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyType(props, featureClass, population) {
  if (
    props.ADM0CAP === 1 ||
    props.adm0cap === 1 ||
    props.MEGACITY === 1 ||
    props.megacity === 1 ||
    /capital/i.test(featureClass || "") ||
    (population || 0) >= 750_000
  ) {
    return "city";
  }
  if (
    /village|hamlet|small/i.test(featureClass || "") ||
    ((population || 0) > 0 && (population || 0) < 12_000)
  ) {
    return "village";
  }
  return "town";
}

function buildPlaces(geojson) {
  const places = [];

  for (const [index, feature] of (geojson.features || []).entries()) {
    const props = feature.properties || {};
    const coords = feature.geometry?.coordinates || [];

    const lng =
      numberOrNull(props.LONGITUDE ?? props.longitude) ?? numberOrNull(coords[0]);
    const lat =
      numberOrNull(props.LATITUDE ?? props.latitude) ?? numberOrNull(coords[1]);
    if (lat === null || lng === null) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;

    const name = pickPlaceNameEn(props);
    if (!name || name === "Unknown") continue;

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
    const type = classifyType(props, featureClass, population);

    if (scalerank > PROFILE.placeMaxScalerank) continue;

    places.push({
      id: `place-${index}-${name.slice(0, 40).replace(/\s+/g, "-")}`,
      name,
      nameKo,
      country,
      adm1,
      // 소수점 5자리(~1.1m)로 위치 정확도 유지
      lat: roundCoord(lat, 5),
      lng: roundCoord(lng, 5),
      type,
      population,
      scalerank,
      minZoom,
      featureClass,
    });
  }

  places.sort(
    (a, b) =>
      a.scalerank - b.scalerank ||
      (b.population || 0) - (a.population || 0) ||
      a.name.localeCompare(b.name),
  );

  return places;
}

function isCountryOrDisputeSearchPlace(place) {
  // compact: t=C(country) / t=d(dispute) 또는 legacy type
  return place.t === "C" || place.t === "d" || place.type === "country" || place.type === "dispute";
}

function main() {
  if (!fs.existsSync(GEOJSON_PATH)) {
    throw new Error(`GeoJSON 없음: ${GEOJSON_PATH}`);
  }
  if (!fs.existsSync(APP_DATA_PATH)) {
    throw new Error(`app-data.json 없음: ${APP_DATA_PATH}`);
  }

  console.log(`rebuild-places (profile=${DATA_PROFILE})`);
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  const places = buildPlaces(geojson);
  console.log(`   source places: ${places.length}`);

  const appData = JSON.parse(fs.readFileSync(APP_DATA_PATH, "utf8"));
  const placesPath = path.join(OUT_DIR, CHUNK_FILES.places);
  let retained = [];
  if (isChunkManifest(appData) && fs.existsSync(placesPath)) {
    retained = JSON.parse(fs.readFileSync(placesPath, "utf8")).filter(isCountryOrDisputeSearchPlace);
  } else {
    retained = (appData.places || []).filter(isCountryOrDisputeSearchPlace);
  }
  const nextPlaces = [...places.map(compactPlace), ...retained];
  const generatedAt = new Date().toISOString();
  const sources = {
    ...(appData.sources || {}),
    places: "natural-earth-vector/ne_10m_populated_places.geojson",
  };

  if (isChunkManifest(appData)) {
    const countriesPath = path.join(OUT_DIR, CHUNK_FILES.countries);
    const disputesPath = path.join(OUT_DIR, CHUNK_FILES.disputes);
    const countries = fs.existsSync(countriesPath)
      ? JSON.parse(fs.readFileSync(countriesPath, "utf8"))
      : [];
    const disputes = fs.existsSync(disputesPath)
      ? JSON.parse(fs.readFileSync(disputesPath, "utf8"))
      : [];
    writeAppDataChunks(OUT_DIR, {
      generatedAt,
      profile: appData.profile || DATA_PROFILE,
      sources,
      countries,
      disputes,
      places: nextPlaces,
    });
    console.log(`   wrote ${nextPlaces.length} places → ${placesPath}`);
  } else {
    appData.places = nextPlaces;
    appData.generatedAt = generatedAt;
    appData.sources = sources;
    fs.writeFileSync(APP_DATA_PATH, JSON.stringify(appData));
    console.log(`   wrote ${nextPlaces.length} places → ${APP_DATA_PATH}`);
  }

  const tokyo = places.find((p) => p.name === "Tokyo");
  const seoul = places.find((p) => p.name === "Seoul");
  console.log("   sample Tokyo:", tokyo ? `${tokyo.name} ${tokyo.lat},${tokyo.lng}` : "missing");
  console.log("   sample Seoul:", seoul ? `${seoul.name} ${seoul.lat},${seoul.lng}` : "missing");
}

main();
