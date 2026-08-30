/**
 * NATO/AUKUS/CRINK/CSTO 국가 경계 — Natural Earth 110m에서 추출.
 * axis-hub-countries.json(CHN/RUS/PRK/IRN, 10m)과 별개 — 새 진영 오버레이 전용.
 *
 * Usage: node build-allied-bloc-countries.js ne110_countries.geojson
 */
const fs = require("fs");

const SRC = process.argv[2] || "ne110_countries.geojson";

// NATO — 32개 회원국 (2024, 스웨덴 가입 포함). 출처: nato.int member countries.
const NATO_ISOS = [
  "ALB", "BEL", "BGR", "CAN", "HRV", "CZE", "DNK", "EST", "FIN", "FRA",
  "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LTU", "LUX", "MNE", "NLD",
  "MKD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "TUR",
  "GBR", "USA",
];
// AUKUS — 3개 서명국 (2021 조약). 출처: aukusalliance.org / gov.uk.
const AUKUS_ISOS = ["USA", "GBR", "AUS"];
// CRINK — 중·러·이란·북한 (서방 국방 당국·언론이 쓰는 통칭, 조약 아님).
const CRINK_ISOS = ["CHN", "RUS", "PRK", "IRN"];
// CSTO — 러시아 주도 집단안보조약기구, CRINK 비중복 회원. 출처: odkb-csto.org.
const CSTO_ISOS = ["BLR", "ARM", "KAZ", "KGZ", "TJK"];

const ALL_ISOS = new Set([...NATO_ISOS, ...AUKUS_ISOS, ...CRINK_ISOS, ...CSTO_ISOS]);

function round(n) {
  const f = 10 ** 3; // 110m 해상도 — 3자리로 충분
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
    if (typeof v === "string" && ALL_ISOS.has(v.trim())) return v.trim();
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

function main() {
  const fc = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const byIso = new Map();
  for (const feature of fc.features || []) {
    const iso = pickIso(feature.properties || {});
    if (!iso) continue;
    const geometry = normalizeGeometry(feature.geometry);
    if (!geometry) continue;
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

  const missing = [...ALL_ISOS].filter((iso) => !byIso.has(iso));
  if (missing.length) {
    console.error("MISSING:", missing.join(", "));
    process.exit(1);
  }

  function bloc(iso) {
    // 우선순위: CRINK > CSTO(CRINK연계) > AUKUS > NATO — 다중 소속 시 더 특정적인 분류가 이김
    if (CRINK_ISOS.includes(iso)) return "crink";
    if (CSTO_ISOS.includes(iso)) return "crink-aligned";
    if (AUKUS_ISOS.includes(iso)) return "aukus";
    if (NATO_ISOS.includes(iso)) return "nato";
    return "unknown";
  }

  const order = [...NATO_ISOS, ...AUKUS_ISOS, ...CRINK_ISOS, ...CSTO_ISOS];
  const seen = new Set();
  const features = [];
  for (const iso of order) {
    if (seen.has(iso)) continue;
    seen.add(iso);
    const f = byIso.get(iso);
    f.properties.bloc = bloc(iso);
    features.push(f);
  }

  const out = { type: "FeatureCollection", name: "allied-bloc-countries-ne110m", features };
  const json = `${JSON.stringify(out)}\n`;
  fs.writeFileSync("/tmp/allied-bloc-countries.json", json);
  console.log("features:", features.length, "bytes:", json.length);
  for (const f of features) {
    console.log(f.properties.iso, f.properties.bloc, f.geometry.type, "pts", countPts(f.geometry));
  }
}

main();
