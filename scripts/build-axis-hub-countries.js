/**
 * 축 허브(CHN/RUS/PRK/IRN) 고정밀 국경 — Natural Earth 10m에서 추출.
 * countries.json(소수 2자리·링 샘플링)과 분리.
 *
 * Usage: node scripts/build-axis-hub-countries.js [ne_10m_admin_0_countries.geojson]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_SRC = path.join(ROOT, "tmp-ne10m-countries.geojson");
const OUT_LITE = path.join(ROOT, "public", "data", "lite", "axis-hub-countries.json");
const OUT_FULL = path.join(ROOT, "public", "data", "full", "axis-hub-countries.json");

const HUB_ISOS = new Set(["CHN", "RUS", "PRK", "IRN"]);
const COORD_DECIMALS = 5;

function round(n) {
  const f = 10 ** COORD_DECIMALS;
  return Math.round(Number(n) * f) / f;
}

function roundPos([lng, lat]) {
  return [round(lng), round(lat)];
}

function closeRing(ring) {
  if (ring.length < 3) return null;
  const out = ring.map(roundPos);
  const a = out[0];
  const b = out[out.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  return out.length >= 4 ? out : null;
}

function ringLngSpan(ring) {
  let min = Infinity;
  let max = -Infinity;
  for (const [lng] of ring) {
    if (lng < min) min = lng;
    if (lng > max) max = lng;
  }
  return { min, max, span: max - min };
}

/**
 * 연속 좌표의 경도 점프(±180 횡단)를 unwrap한 뒤,
 * span>180이면 180°에서 잘라 두 링으로 나눈다.
 */
function splitAntimeridianRing(ring) {
  const closed = closeRing(ring);
  if (!closed) return [];

  const unwrapped = [[closed[0][0], closed[0][1]]];
  for (let i = 1; i < closed.length; i += 1) {
    let lng = closed[i][0];
    const prev = unwrapped[i - 1][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    unwrapped.push([lng, closed[i][1]]);
  }

  let umin = Infinity;
  let umax = -Infinity;
  for (const [lng] of unwrapped) {
    umin = Math.min(umin, lng);
    umax = Math.max(umax, lng);
  }

  if (umax - umin <= 180) {
    const normalized = closeRing(
      unwrapped.map(([lng, lat]) => {
        let x = lng;
        while (x > 180) x -= 360;
        while (x < -180) x += 360;
        return [x, lat];
      }),
    );
    return normalized ? [normalized] : [];
  }

  // Cut at 180 in unwrapped space, produce west (-180..180 east of cut) and east pieces
  const pieces = [];
  let current = [];
  const flush = () => {
    if (current.length >= 2) {
      const norm = closeRing(
        current.map(([lng, lat]) => {
          let x = lng;
          while (x > 180) x -= 360;
          while (x < -180) x += 360;
          return [x, lat];
        }),
      );
      if (norm) pieces.push(norm);
    }
    current = [];
  };

  for (let i = 0; i < unwrapped.length - 1; i += 1) {
    const [x0, y0] = unwrapped[i];
    const [x1, y1] = unwrapped[i + 1];
    if (!current.length) current.push([x0, y0]);

    // crossings of odd multiples of 180
    const crosses180 =
      (x0 < 180 && x1 > 180) ||
      (x0 > 180 && x1 < 180) ||
      (x0 < -180 && x1 > -180) ||
      (x0 > -180 && x1 < -180);

    if (!crosses180) {
      current.push([x1, y1]);
      continue;
    }

    const target = x1 > x0 ? (x0 < 180 && x1 > 180 ? 180 : -180) : x0 > 180 && x1 < 180 ? 180 : -180;
    const t = (target - x0) / (x1 - x0);
    const yx = y0 + t * (y1 - y0);
    current.push([target, yx]);
    flush();
    current.push([target === 180 ? -180 : 180, yx]);
    current.push([x1, y1]);
  }
  flush();
  return pieces;
}

function processPolygonRings(coords) {
  const outers = splitAntimeridianRing(coords[0] || []);
  const holes = [];
  for (const hole of coords.slice(1) || []) {
    holes.push(...splitAntimeridianRing(hole));
  }
  // Attach holes only to first outer (holes rarely span dateline for these hubs)
  return outers.map((outer, i) => (i === 0 && holes.length ? [outer, ...holes] : [outer]));
}

function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    const parts = processPolygonRings(geometry.coordinates);
    if (!parts.length) return null;
    if (parts.length === 1) return { type: "Polygon", coordinates: parts[0] };
    return { type: "MultiPolygon", coordinates: parts };
  }
  if (geometry.type === "MultiPolygon") {
    const parts = [];
    for (const poly of geometry.coordinates) {
      parts.push(...processPolygonRings(poly));
    }
    if (!parts.length) return null;
    if (parts.length === 1) return { type: "Polygon", coordinates: parts[0] };
    return { type: "MultiPolygon", coordinates: parts };
  }
  return null;
}

function pickIso(props) {
  for (const key of ["ISO_A3", "ADM0_A3", "ISO_A3_EH", "BRK_A3"]) {
    const v = props[key];
    if (typeof v === "string" && HUB_ISOS.has(v.trim())) return v.trim();
  }
  return null;
}

function countPts(geometry) {
  let n = 0;
  const walk = (c) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") {
      n += 1;
      return;
    }
    c.forEach(walk);
  };
  walk(geometry.coordinates);
  return n;
}

function assertNoWideRings(geometry, iso) {
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      const { span, min, max } = ringLngSpan(ring);
      if (span > 180) {
        throw new Error(`${iso} ring still spans ${span} (${min}..${max})`);
      }
    }
  }
}

function main() {
  const src = process.argv[2] || DEFAULT_SRC;
  if (!fs.existsSync(src)) {
    console.error("Missing source:", src);
    process.exit(1);
  }

  console.log("Reading", src);
  const fc = JSON.parse(fs.readFileSync(src, "utf8"));
  const byIso = new Map();

  for (const feature of fc.features || []) {
    const iso = pickIso(feature.properties || {});
    if (!iso) continue;
    const geometry = normalizeGeometry(feature.geometry);
    if (!geometry) continue;
    assertNoWideRings(geometry, iso);
    const name = feature.properties.NAME || feature.properties.ADMIN || iso;
    const prev = byIso.get(iso);
    if (prev && countPts(prev.geometry) >= countPts(geometry)) continue;
    byIso.set(iso, {
      type: "Feature",
      id: iso,
      properties: { iso, name },
      geometry,
    });
  }

  for (const iso of HUB_ISOS) {
    if (!byIso.has(iso)) {
      console.error("Missing hub country:", iso);
      process.exit(1);
    }
  }

  const features = ["CHN", "RUS", "PRK", "IRN"].map((iso) => byIso.get(iso));
  const out = {
    type: "FeatureCollection",
    name: "axis-hub-countries-ne10m",
    features,
  };

  for (const f of features) {
    console.log(f.properties.iso, f.geometry.type, "pts", countPts(f.geometry));
  }

  const json = `${JSON.stringify(out)}\n`;
  fs.mkdirSync(path.dirname(OUT_LITE), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_FULL), { recursive: true });
  fs.writeFileSync(OUT_LITE, json);
  fs.writeFileSync(OUT_FULL, json);
  console.log(`Wrote ${OUT_LITE} (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Wrote ${OUT_FULL}`);
}

main();
