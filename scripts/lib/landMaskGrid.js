/**
 * 1° 육지 마스크 — Natural Earth 110m land 래스터화.
 * 해운로 빌드(바다 A*)와 클라 sanitize가 같은 해상도를 쓴다.
 */

const WIDTH = 360;
const HEIGHT = 180;

/** 운하·좁은 해협 — 마스크가 육지로 칠해도 바다로 강제 */
const OCEAN_CORRIDORS = [
  // Suez
  { minLng: 32.2, maxLng: 33.0, minLat: 29.5, maxLat: 31.6 },
  // Panama
  { minLng: -80.1, maxLng: -79.4, minLat: 8.7, maxLat: 9.5 },
  // Malacca (조금 넉넉)
  { minLng: 99.5, maxLng: 104.5, minLat: 1.0, maxLat: 6.5 },
  // Bosporus / Dardanelles
  { minLng: 26.0, maxLng: 29.3, minLat: 39.9, maxLat: 41.3 },
  // Gibraltar
  { minLng: -5.8, maxLng: -5.2, minLat: 35.8, maxLat: 36.2 },
  // Bab el-Mandeb
  { minLng: 42.5, maxLng: 44.0, minLat: 11.5, maxLat: 13.5 },
  // Hormuz
  { minLng: 55.5, maxLng: 57.0, minLat: 25.5, maxLat: 27.0 },
  // Dover
  { minLng: 1.0, maxLng: 2.2, minLat: 50.7, maxLat: 51.3 },
  // Kiel
  { minLng: 9.4, maxLng: 11.0, minLat: 53.8, maxLat: 54.6 },
  // Taiwan Strait corridor (본섬과 구분)
  { minLng: 118.5, maxLng: 120.2, minLat: 22.5, maxLat: 25.5 },
  // Tsushima
  { minLng: 128.5, maxLng: 130.0, minLat: 33.5, maxLat: 35.0 },
];

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng, lat, coordinates) {
  if (!coordinates?.length) return false;
  if (!pointInRing(lng, lat, coordinates[0])) return false;
  for (let h = 1; h < coordinates.length; h += 1) {
    if (pointInRing(lng, lat, coordinates[h])) return false;
  }
  return true;
}

function featureBbox(geometry) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  const walk = (coords) => {
    if (!Array.isArray(coords) || coords.length === 0) return;
    if (typeof coords[0] === "number") {
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
      return;
    }
    for (const c of coords) walk(c);
  };
  walk(geometry.coordinates);
  return { minLng, maxLng, minLat, maxLat };
}

function inCorridor(lng, lat) {
  return OCEAN_CORRIDORS.some(
    (b) =>
      lng >= b.minLng &&
      lng <= b.maxLng &&
      lat >= b.minLat &&
      lat <= b.maxLat,
  );
}

function lngLatToCell(lng, lat) {
  const x = Math.floor((((lng + 180) % 360) + 360) % 360);
  const y = Math.floor(90 - lat);
  return {
    x: Math.max(0, Math.min(WIDTH - 1, x)),
    y: Math.max(0, Math.min(HEIGHT - 1, y)),
  };
}

function cellCenter(x, y) {
  return { lng: x + 0.5 - 180, lat: 90 - (y + 0.5) };
}

function packBits(boolGrid) {
  const bytes = new Uint8Array(Math.ceil((WIDTH * HEIGHT) / 8));
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
    if (boolGrid[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  return Buffer.from(bytes).toString("base64");
}

function unpackBits(base64) {
  const bytes = Buffer.from(base64, "base64");
  const bits = new Uint8Array(WIDTH * HEIGHT);
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
    bits[i] = bytes[i >> 3] & (1 << (i & 7)) ? 1 : 0;
  }
  return bits;
}

/**
 * GeoJSON FeatureCollection(land polygons) → packed bitmask
 */
function rasterizeLandGeoJson(geojson) {
  const land = new Uint8Array(WIDTH * HEIGHT);
  const polys = [];
  for (const f of geojson.features || []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") {
      polys.push({ bbox: featureBbox(g), coordinates: g.coordinates });
    } else if (g.type === "MultiPolygon") {
      for (const coords of g.coordinates || []) {
        const fake = { type: "Polygon", coordinates: coords };
        polys.push({ bbox: featureBbox(fake), coordinates: coords });
      }
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const { lng, lat } = cellCenter(x, y);
      if (inCorridor(lng, lat)) continue;
      let hit = false;
      for (const poly of polys) {
        const { bbox, coordinates } = poly;
        if (
          lng < bbox.minLng - 0.6 ||
          lng > bbox.maxLng + 0.6 ||
          lat < bbox.minLat - 0.6 ||
          lat > bbox.maxLat + 0.6
        ) {
          continue;
        }
        if (pointInPolygon(lng, lat, coordinates)) {
          hit = true;
          break;
        }
      }
      if (hit) land[y * WIDTH + x] = 1;
    }
  }

  return {
    width: WIDTH,
    height: HEIGHT,
    bits: packBits(land),
    land,
  };
}

function createMaskApi(landBits) {
  const isLandCell = (x, y) => landBits[y * WIDTH + x] === 1;
  const isLandLngLat = (lng, lat) => {
    if (inCorridor(lng, lat)) return false;
    const { x, y } = lngLatToCell(lng, lat);
    return isLandCell(x, y);
  };
  return {
    width: WIDTH,
    height: HEIGHT,
    isLandCell,
    isLandLngLat,
    lngLatToCell,
    cellCenter,
  };
}

function loadMaskFromPacked(packed) {
  const land = unpackBits(packed.bits);
  return createMaskApi(land);
}

module.exports = {
  WIDTH,
  HEIGHT,
  OCEAN_CORRIDORS,
  rasterizeLandGeoJson,
  loadMaskFromPacked,
  createMaskApi,
  lngLatToCell,
  cellCenter,
  packBits,
  unpackBits,
  inCorridor,
};
